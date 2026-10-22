/**
 * End-to-end headless browser test: signs in through the real login form,
 * lands on the dashboard and counts every request the app makes. This is the
 * flow a user actually performs, so it catches reload loops, request storms
 * and broken redirects.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const BASE = process.argv[2] || 'http://localhost:3002';
const EMAIL = process.argv[3] || 'james@acmecorp.com';
const PASSWORD = process.argv[4] || 'Demo@acme123';
const PORT = 9225;

const profile = mkdtempSync(path.join(tmpdir(), 'cdp4-'));
const chrome = spawn(
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--user-data-dir=${profile}`, `--remote-debugging-port=${PORT}`, 'about:blank'],
  { stdio: 'ignore' }
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const p = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (p) return p;
    } catch {}
    await sleep(250);
  }
  throw new Error('no devtools');
}

const target = await getTarget();
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const requests = [];
let phase = 'load';

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const msgId = ++id;
  pending.set(msgId, { resolve, reject });
  ws.send(JSON.stringify({ id: msgId, method, params }));
});

await new Promise((res, rej) => {
  ws.addEventListener('open', res, { once: true });
  ws.addEventListener('error', rej, { once: true });
});

ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(m.error.message)) : resolve(m.result);
    return;
  }
  if (m.method === 'Network.requestWillBeSent') {
    requests.push({ url: m.params.request.url, type: m.params.type, phase });
  }
  if (m.method === 'Network.responseReceived') {
    const r = m.params.response;
    if (r.status >= 400) {
      console.log(`  [${r.status}] ${r.url}`);
    }
  }
  if (m.method === 'Network.loadingFailed') {
    console.log(`  [failed] ${m.params.requestId}`);
  }
  if (m.method === 'Runtime.consoleAPICalled') {
    const text = (m.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ');
    if (m.params.type === 'error' || m.params.type === 'warning') {
      console.log(`  [console.${m.params.type}] ${text.slice(0, 700)}`);
    }
  }
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    console.log(`  [exception] ${(d.exception?.description || d.text || '').slice(0, 700)}`);
  }
  if (m.method === 'Log.entryAdded') {
    const en = m.params.entry;
    if (en.level === 'error' || en.level === 'warning') {
      console.log(`  [log.${en.level}] ${(en.text || '').slice(0, 700)}`);
    }
  }
});

await send('Network.enable');
await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `
    window.__earlyErrors = [];
    window.addEventListener('error', function (e) {
      window.__earlyErrors.push('error: ' + (e.message || '') + ' @ ' + (e.filename || '') + ':' + (e.lineno || ''));
    });
    window.addEventListener('unhandledrejection', function (e) {
      window.__earlyErrors.push('unhandledrejection: ' + (e.reason && (e.reason.message || e.reason.stack) || e.reason));
    });
    var origError = console.error;
    console.error = function () {
      window.__earlyErrors.push('console.error: ' + Array.prototype.map.call(arguments, function (a) {
        return (a && (a.stack || a.message)) || String(a);
      }).join(' ').slice(0, 600));
      return origError.apply(console, arguments);
    };
  `,
});

// ── 1. load the login page ────────────────────────────────────────────────
await send('Page.navigate', { url: `${BASE}/login` });
await sleep(6000);

const evalJs = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
  return r.result?.value;
};

// ── 2. sign in through the form ───────────────────────────────────────────
phase = 'login';
console.log('\n  --- signing in ---');
// Type the credentials like a real user: focus the field and insert text
// with real key events so react-hook-form sees genuine change events.
async function typeInto(selector, value) {
  const box = await evalJs(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    el.focus();
    const r = el.getBoundingClientRect();
    return JSON.stringify({ x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) });
  })()`);
  if (!box) { console.log(`  !! ${selector} not found`); return; }
  const b = JSON.parse(box);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 });
  await send('Input.insertText', { text: value });
  await sleep(200);
}

await typeInto('input[type="email"]', EMAIL);
await typeInto('input[type="password"]', PASSWORD);

const btnBox = await evalJs(`(() => {
  const form = document.querySelector('form');
  const btn = form.querySelector('button[type="submit"]');
  const r = btn.getBoundingClientRect();
  return JSON.stringify({ x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2),
    email: document.querySelector('input[type="email"]').value,
    passwordLen: document.querySelector('input[type="password"]').value.length });
})()`);
console.log('  form state before submit: ' + btnBox);
const bb = JSON.parse(btnBox);
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: bb.x, y: bb.y, button: 'left', clickCount: 1 });
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: bb.x, y: bb.y, button: 'left', clickCount: 1 });
console.log('  clicked Sign in at', bb.x + ',' + bb.y);

// poll the URL so a push-and-bounce is visible
const urlTrail = await evalJs(`(async () => {
  const trail = [];
  for (let i = 0; i < 24; i++) {
    trail.push(location.pathname + location.search);
    await new Promise(r => setTimeout(r, 400));
  }
  return JSON.stringify([...new Set(trail)]);
})()`, true);
console.log('  url trail: ' + urlTrail);
await sleep(1500);
const after = await evalJs(`JSON.stringify({
  url: location.href,
  email: (document.querySelector('input[type="email"]')||{}).value,
  errors: Array.from(document.querySelectorAll('.text-red-600, [role="alert"]')).map(e => e.textContent).join(' | '),
  bodyHasError: (document.body.innerText||'').includes('invalid')
})`);
console.log('  1.5s after click: ' + after);

await sleep(8000);

// ── 3. observe what happens afterwards ────────────────────────────────────
phase = 'after-login';
const submitLog = await evalJs(`JSON.stringify({
  submitLog: window.__submitLog || [],
  earlyErrors: (window.__earlyErrors || []).slice(0, 8)
})`);
console.log('  submit log: ' + submitLog);
const state = await evalJs(`JSON.stringify({
  url: location.href,
  buttonDisabled: (document.querySelector('button[type="submit"]') || {}).disabled,
  buttonText: (document.querySelector('button[type="submit"]') || {}).textContent,
  errors: Array.from(document.querySelectorAll('.text-red-600')).map(e => e.textContent).join(' | '),
  alerts: Array.from(document.querySelectorAll('[role="alert"], .text-destructive')).map(e => e.textContent).join(' | '),
  text: (document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 160),
  hasToken: !!sessionStorage.getItem('nexos-auth')
})`);
console.log('  final state: ' + state);

const nav = requests.filter((r) => r.type === 'Document');
const api = requests.filter((r) => r.url.includes(':4000'));
console.log(`\n  TOTAL requests       : ${requests.length}`);
console.log(`  document navigations : ${nav.length}`);
console.log(`  API calls            : ${api.length}`);

const byPhase = {};
for (const r of requests) byPhase[r.phase] = (byPhase[r.phase] || 0) + 1;
console.log('  by phase:', JSON.stringify(byPhase));

const navCounts = new Map();
for (const r of nav) {
  const k = r.url.replace(/^https?:\/\//, '');
  navCounts.set(k, (navCounts.get(k) || 0) + 1);
}
console.log('  navigations:');
navCounts.forEach((v, k) => console.log(`    ${String(v).padStart(4)}  ${k}`));

const apiCounts = new Map();
for (const r of api) {
  const k = r.url.replace(/^https?:\/\/[^/]+\/api\/v1/, '');
  apiCounts.set(k, (apiCounts.get(k) || 0) + 1);
}
console.log('  API endpoints:');
apiCounts.forEach((v, k) => console.log(`    ${String(v).padStart(4)}  ${k}`));

const loop = [...navCounts.entries()].filter(([, v]) => v > 3);
console.log(`\n  ${loop.length === 0 ? 'NO LOOP DETECTED' : 'LOOP: ' + JSON.stringify(loop)}`);

ws.close();
chrome.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(0);
