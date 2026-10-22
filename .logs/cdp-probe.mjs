/**
 * Drives headless Chrome over the DevTools Protocol and counts the network
 * requests a single page load makes. Used to verify that a refresh no longer
 * triggers an endless loop of navigation requests.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const URL_TO_TEST = process.argv[2] || 'http://localhost:3002/login';
const WATCH_MS = Number(process.argv[3] || 10000);
const PORT = 9222;

const profile = mkdtempSync(path.join(tmpdir(), 'cdp-'));
const chrome = spawn(
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${PORT}`,
    'about:blank',
  ],
  { stdio: 'ignore' }
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch {}
    await sleep(250);
  }
  throw new Error('Chrome DevTools endpoint never came up');
}

async function main() {
  const target = await getTarget();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const requests = [];

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const msgId = ++id;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });

  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      return;
    }
    if (msg.method === 'Network.requestWillBeSent') {
      requests.push({ url: msg.params.request.url, type: msg.params.type, at: Date.now() });
    }
  });

  await send('Network.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: URL_TO_TEST });

  const started = Date.now();
  await sleep(WATCH_MS);
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  const nav = requests.filter((r) => r.type === 'Document');
  const api = requests.filter((r) => r.url.includes(':4000'));
  const assets = requests.filter((r) => r.type !== 'Document' && !r.url.includes(':4000'));

  console.log(`\n  URL: ${URL_TO_TEST}`);
  console.log(`  watched for ${elapsed}s`);
  console.log(`  TOTAL requests      : ${requests.length}`);
  console.log(`  document navigations : ${nav.length}`);
  console.log(`  API calls            : ${api.length}`);
  console.log(`  static assets        : ${assets.length}`);

  const counts = new Map();
  for (const r of requests) {
    const key = r.url.replace(/^https?:\/\//, '').split('?')[0];
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  console.log('\n  top requested paths:');
  [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([k, v]) => {
    console.log(`    ${String(v).padStart(4)}  ${k}`);
  });

  const navCounts = new Map();
  for (const r of nav) {
    const key = r.url.replace(/^https?:\/\//, '');
    navCounts.set(key, (navCounts.get(key) || 0) + 1);
  }
  console.log('\n  navigation targets:');
  if (navCounts.size === 0) console.log('    (none)');
  navCounts.forEach((v, k) => console.log(`    ${String(v).padStart(4)}  ${k}`));

  const loop = [...navCounts.entries()].filter(([, v]) => v > 3);
  console.log(`\n  ${loop.length === 0 ? 'NO LOOP DETECTED' : 'LOOP DETECTED: ' + JSON.stringify(loop)}`);

  ws.close();
  chrome.kill();
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
  process.exit(0);
}

main().catch((err) => {
  console.error('probe failed:', err.message);
  chrome.kill();
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
  process.exit(1);
});
