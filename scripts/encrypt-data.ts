import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { encryptDatabase, decryptDatabase } from '../server/crypto';
import { assertDatabase, type DatabaseDocument } from '../server/models';

const input = process.argv[2] ?? '.local/seed.json';
const output = process.argv[3] ?? 'data/database.enc.json';
const secretsPath = '.local/production-secrets.json';
await mkdir('.local', { recursive: true });
let secrets: { DB_ENCRYPTION_KEY: string; SESSION_SECRET: string };
try {
  secrets = JSON.parse(await readFile(secretsPath, 'utf8'));
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  secrets = { DB_ENCRYPTION_KEY: randomBytes(32).toString('base64'), SESSION_SECRET: randomBytes(48).toString('base64url') };
  await writeFile(secretsPath, JSON.stringify(secrets, null, 2) + '\n', { mode: 0o600 });
}
try {
  await access(output);
  throw new Error('Output exists; refusing to overwrite the shared production database.');
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}
const database: DatabaseDocument = JSON.parse(await readFile(input, 'utf8'));
assertDatabase(database);
const envelope = await encryptDatabase(database, secrets.DB_ENCRYPTION_KEY);
const verified = await decryptDatabase<DatabaseDocument>(envelope, secrets.DB_ENCRYPTION_KEY);
assertDatabase(verified);
if (JSON.stringify(verified) !== JSON.stringify(database)) throw new Error('Encrypted snapshot round-trip failed.');
await writeFile(output, JSON.stringify(envelope, null, 2) + '\n');
console.log(`Encrypted ${database.wagons.length} wagons, ${database.parts.length} parts and ${database.inventory.length} inventory records. Keep the ignored production secret file secure.`);
