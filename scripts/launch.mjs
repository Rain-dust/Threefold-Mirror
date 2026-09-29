import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 4317);
const url = `http://127.0.0.1:${port}`;
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid PORT');
async function ready() {
  try { const r = await fetch(url + '/api/state', { signal: AbortSignal.timeout(1000) }); const data = await r.json(); return r.ok && !!data.config && typeof data.connected === 'boolean'; } catch { return false; }
}
function openBrowser() {
  const [cmd, args] = process.platform === 'win32' ? ['cmd.exe', ['/c', 'start', '', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  const child = spawn(cmd, args, { windowsHide: true, stdio: 'ignore' });
  child.on('error', () => console.log('Open ' + url + ' in your browser.'));
}
if (await ready()) { openBrowser(); console.log(`Threefold Mirror is already running: ${url}`); }
else {
  const child = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts', '--production'], { cwd: root, stdio: 'inherit', windowsHide: true });
  child.on('error', e => { console.error(e.message); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code || 0; });
  process.on('SIGINT', () => child.kill());
  process.on('SIGTERM', () => child.kill());
  for (let i = 0; i < 40; i++) {
    if (await ready()) { openBrowser(); break; }
    if (child.exitCode !== null) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
}
