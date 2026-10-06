import { randomBytes } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';

await mkdir('.local', { recursive: true });
try {
  await access('.dev.vars');
  console.log('Local configuration already exists; preserved it.');
  process.exit(0);
} catch { /* Create this task's own local development bindings. */ }

let seed = { wagons: [], parts: [], inventory: [] };
try { seed = JSON.parse(await readFile('.local/seed.json', 'utf8')); } catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const password = 'local-' + randomBytes(24).toString('base64url');
const lines = {
  STORAGE_MODE: 'local',
  ADMIN_USERNAME: 'admin',
  ADMIN_PASSWORD: password,
  SESSION_SECRET: randomBytes(48).toString('base64url'),
  DB_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
  LOCAL_SEED_BASE64: Buffer.from(JSON.stringify(seed), 'utf8').toString('base64'),
  ALLOWED_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173',
};
await writeFile('.dev.vars', Object.entries(lines).map(([name, value]) => `${name}=${JSON.stringify(value)}`).join('\n') + '\n', { mode: 0o600 });
await writeFile('.local/test-credentials.json', JSON.stringify({ username: 'admin', password }) + '\n', { mode: 0o600 });
console.log('Created ignored local development bindings and login credentials. Production bindings are separate.');
