/**
 * Headless-Chrome probe for the signed-in experience: seeds a valid session
 * into sessionStorage, then loads a page and counts the requests it makes.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const API = 'http://localhost:4000/api/v1';
const URL_TO_TEST = process.argv[2] || 'http://localhost:3002/dashboard';
const EMAIL = process.argv[3] || 'james@acmecorp.com';
const PASSWORD = process.argv[4] || 'Demo@acme123';
const PORT = 9224;

const login = await (await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
})).json();

if (!login?.data?.tokens?.accessToken) {
  console.error('login failed:', JSON.stringify(login).slice(0, 300));
  process.exit(1);
}
const { accessToken, user, tenant } = login.data;

const profile = mkdtempSync(path.join(tmpdir(), 'cdp3-'));
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

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const msgId = ++id;
  pending.set(msgId, { resolve, reject });
  ws.send(JSON.stringify({ id: msgId, method, params }));
});

await new Promise((res, rej) => {
  ws.addEventListener('open', res, { once: true });
  ws.addEventListener('error', rej, { once: true });
});

ws.addEventListener('message', async (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(m.error.message)) : resolve(m.result);
    return;
  }
  if (m.method === 'Network.requestWillBeSent') {
    requests.push({ url: m.params.request.url, type: m.params.type, id: m.params.requestId });
    if (m.params.request.url.includes(':4000') && m.params.request.url.includes('/auth/me')) {
      const h = m.params.request.headers || {};
      console.log(`  -> ${m.params.request.method} ${m.params.request.url.replace(/^https?:\/\/[^/]+/, '')}`);
      console.log(`     Authorization: ${h.Authorization || h.authorization || '(NONE)'}`);
      console.log(`     headers: ${Object.keys(h).join(', ')}`);
    }
  }
  if (m.method === 'Network.responseReceived') {
    const r = m.params.response;
    if (r.status >= 400 && r.url.includes(':4000')) {
      const body = await send('Network.getResponseBody', { requestId: m.params.requestId }).catch(() => null);
      console.log(`  !! ${r.status} ${r.url.replace(/^https?:\/\/[^/]+/, '')} :: ${body?.body?.slice(0, 200)}`);
    }
  }
});

await send('Network.enable');
await send('Page.enable');
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `
    try {
      sessionStorage.setItem('nexos-auth', JSON.stringify({
        state: {
          user: ${JSON.stringify(user)},
          tenant: ${JSON.stringify(tenant)},
          accessToken: ${JSON.stringify(accessToken)},
          isAuthenticated: true
        },
        version: 0
      }));
    } catch (e) {}
  `,
});

await send('Page.navigate', { url: URL_TO_TEST });
await sleep(9000);

try {
  const evalRes = await send('Runtime.evaluate', {
    expression: `JSON.stringify({ url: location.href, session: !!sessionStorage.getItem('nexos-auth'), text: (document.body.innerText||'').replace(/\\s+/g,' ').slice(0,200) })`,
    returnByValue: true,
  });
  console.log('  final page state:', evalRes.result?.value);
} catch {}

const nav = requests.filter((r) => r.type === 'Document');
const api = requests.filter((r) => r.url.includes(':4000'));
console.log(`\n  URL: ${URL_TO_TEST}   (signed in as ${user.email})`);
console.log(`  TOTAL requests       : ${requests.length}`);
console.log(`  document navigations : ${nav.length}`);
console.log(`  API calls            : ${api.length}`);
const navCounts = new Map();
for (const r of nav) {
  const k = r.url.replace(/^https?:\/\//, '');
  navCounts.set(k, (navCounts.get(k) || 0) + 1);
}
console.log('  navigation targets:');
if (!navCounts.size) console.log('    (none)');
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
