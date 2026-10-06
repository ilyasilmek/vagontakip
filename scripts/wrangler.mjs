import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { constants } from 'node:os';

const root = process.cwd();
const config = path.join(root, '.local/xdg-config');
const cache = path.join(root, '.local/xdg-cache');
const logs = path.join(root, '.local/wrangler-logs');
await Promise.all([config, cache, logs].map(folder => mkdir(folder, { recursive: true })));
const args = process.argv.slice(2);
const cli = path.join(root, 'node_modules/wrangler/bin/wrangler.js');
const child = spawn(process.execPath, [cli, ...args], {
  stdio: 'inherit',
  // Wrangler's CLI shim starts another Node process, which starts workerd.
  // Keep this tree in its own group so stopping the wrapper stops every child.
  detached: process.platform !== 'win32',
  env: { ...process.env, XDG_CONFIG_HOME: config, XDG_CACHE_HOME: cache,
    WRANGLER_LOG_PATH: logs, WRANGLER_SEND_METRICS: 'false' },
});
let stoppingSignal;
let forceStop;
function stopTree(signal) {
  if (!child.pid) return;
  try {
    if (process.platform === 'win32') child.kill(signal);
    else process.kill(-child.pid, signal);
  } catch (error) { if (error.code !== 'ESRCH') throw error; }
}
function stop(signal) {
  if (stoppingSignal) { stopTree('SIGKILL'); return; }
  stoppingSignal = signal;
  // Let Wrangler run its own awaited shutdown before forcing its descendants.
  // Broadcasting immediately can terminate workerd before Wrangler reaps it.
  child.kill(signal);
  forceStop = setTimeout(() => stopTree('SIGKILL'), 5_000);
  forceStop.unref();
}
const onInterrupt = () => stop('SIGINT');
const onTerminate = () => stop('SIGTERM');
process.on('SIGINT', onInterrupt);
process.on('SIGTERM', onTerminate);
function cleanUp() {
  clearTimeout(forceStop);
  process.off('SIGINT', onInterrupt);
  process.off('SIGTERM', onTerminate);
}
child.on('error', () => { cleanUp(); process.exitCode = 1; });
child.on('exit', (code, signal) => {
  cleanUp();
  // The shim may exit before its descendants. Stop the remaining group rather
  // than leaving an orphaned development server running on the same port.
  stopTree('SIGKILL');
  const endedBy = stoppingSignal ?? signal;
  process.exitCode = endedBy ? 128 + constants.signals[endedBy] : code ?? 1;
});
