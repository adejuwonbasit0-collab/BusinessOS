/**
 * Verifies the admin -> workspace impersonation hand-off in a real browser:
 * opens the URL the admin console produces and checks that the web app signs
 * the user into the impersonated workspace.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const API = 'http://localhost:4000/api/v1';
const PORT = 9226;

const login = await (await fetch(`${API}/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@nexos.app', password: 'Admin@nexos123' }),
})).json();
const adminToken = login.data.tokens.accessToken;

const tenants = await (await fetch(`${API}/admin/tenants`, { headers: { Authorization: `Bearer ${adminToken}` } })).json();
const target = tenants.data.tenants.find((t) => t.subdomain === 'acmecorp');

const imp = await (await fetch(`${API}/admin/tenants/${target.id}/impersonate`, {
  method: 'POST', headers: { Authorization: `Bearer ${adminToken}` },
})).json();

const url = `http://localhost:3002/dashboard?impersonation_token=${encodeURIComponent(imp.data.token)}`;
console.log(`  impersonating ${imp.data.tenant.name}`);
console.log(`  opening ${url.slice(0, 90)}...`);

const profile = mkdtempSync(path.join(tmpdir(), 'cdp5-'));
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--user-data-dir=${profile}`, `--remote-debugging-port=${PORT}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const p = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (p) return p;
    } catch {}
    await sleep(250);
  }
  throw new Error('no devtools');
}

const t = await getTarget();
const ws = new WebSocket(t.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const reqs = [];
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const msgId = ++id; pending.set(msgId, { resolve, reject });
  ws.send(JSON.stringify({ id: msgId, method, params }));
});
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); return; }
  if (m.method === 'Network.requestWillBeSent') reqs.push({ url: m.params.request.url, type: m.params.type });
});
await send('Network.enable'); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

await send('Page.navigate', { url });
await sleep(14000);

const r = await send('Runtime.evaluate', {
  expression: `JSON.stringify({
    url: location.href,
    hasToken: !!sessionStorage.getItem('nexos-auth'),
    tokenLeakedInUrl: location.search.includes('impersonation_token'),
    workspaceName: (document.querySelector('header p') || {}).textContent,
    user: (sessionStorage.getItem('nexos-auth') || '').slice(0, 160),
    text: (document.body.innerText||'').replace(/\\s+/g,' ').slice(0, 160)
  })`, returnByValue: true,
});
console.log('  result: ' + r.result?.value);

const nav = reqs.filter((x) => x.type === 'Document');
const navCounts = new Map();
for (const x of nav) { const k = x.url.replace(/^https?:\/\//, ''); navCounts.set(k, (navCounts.get(k) || 0) + 1); }
console.log('  navigations:');
navCounts.forEach((v, k) => console.log(`    ${String(v).padStart(4)}  ${k.slice(0, 90)}`));
const loop = [...navCounts.entries()].filter(([, v]) => v > 3);
console.log(`\n  ${loop.length === 0 ? 'NO LOOP DETECTED' : 'LOOP: ' + JSON.stringify(loop)}`);

ws.close(); chrome.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(0);
