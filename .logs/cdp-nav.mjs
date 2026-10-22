/**
 * Headless-Chrome probe that records the JavaScript stack trace behind every
 * client-side navigation (history.pushState / replaceState) so the source of
 * a redirect loop can be identified.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const URL_TO_TEST = process.argv[2] || 'http://localhost:3002/login';
const WATCH_MS = Number(process.argv[3] || 10000);
const PORT = 9223;

const profile = mkdtempSync(path.join(tmpdir(), 'cdp2-'));
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
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch {}
    await sleep(250);
  }
  throw new Error('no devtools');
}

async function main() {
  const target = await getTarget();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();

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
    if (m.method === 'Runtime.consoleAPICalled') {
      const text = (m.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ');
      if (text.startsWith('NAV')) console.log('  ' + text);
    }
  });

  await send('Runtime.enable');
  await send('Page.enable');

  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      (function () {
        function record(kind, url) {
          var stack = new Error().stack || '';
          console.log('NAV ' + kind + ' ' + url + ' :: ' + stack.split('\\n').slice(1, 5).join(' | '));
        }
        var push = history.pushState.bind(history);
        var replace = history.replaceState.bind(history);
        history.pushState = function (s, t, u) { record('push', u); return push(s, t, u); };
        history.replaceState = function (s, t, u) { record('replace', u); return replace(s, t, u); };
        window.addEventListener('beforeunload', function () { record('unload', location.href); });
      })();
    `,
  });

  await send('Page.navigate', { url: URL_TO_TEST });
  await sleep(WATCH_MS);

  ws.close();
  chrome.kill();
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
  process.exit(0);
}

main().catch((e) => { console.error(e.message); chrome.kill(); process.exit(1); });
