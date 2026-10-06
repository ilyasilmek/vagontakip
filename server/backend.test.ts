import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Wagon } from '../shared/types';
import { createPasswordHash, decryptDatabase, encryptDatabase, fromBase64, signSession, toBase64, verifySession, type PasswordHash } from './crypto';
import { DatabaseEngine, emptyDatabase, type DatabaseEnvironment, type StorageAdapter } from './database';
import { ApiError } from './errors';
import { GitHubConflict, GitHubStore } from './github';
import { VagonDatabase, type Env } from './index';
import type { DatabaseDocument } from './models';

const ADMIN_PASSWORD = 'test-admin-password-123';
const USER_PASSWORD = 'test-user-password-123';
const SECRET = 'unit-test-session-key-with-at-least-32-characters';
const DB_KEY = toBase64(new Uint8Array(32).fill(37));
let passwordHash: PasswordHash;

class MemoryStorage implements StorageAdapter {
  values = new Map<string, unknown>();
  async get<T>(key: string): Promise<T | undefined> { return structuredClone(this.values.get(key)) as T | undefined; }
  async put<T>(key: string, value: T): Promise<void> { this.values.set(key, structuredClone(value)); }
}

function makeEnv(overrides: Partial<Env> = {}): Env {
  return { STORAGE_MODE: 'local', ADMIN_USERNAME: 'admin', ADMIN_PASSWORD, SESSION_SECRET: SECRET, ...overrides } as Env;
}

function makeObject(env = makeEnv(), storage = new MemoryStorage()) {
  return new VagonDatabase({ storage } as unknown as DurableObjectState, env);
}

async function call(object: VagonDatabase, path: string, method = 'GET', value?: unknown, session?: string, origin = 'https://vagon.example') {
  const headers = new Headers();
  if (method !== 'GET') headers.set('Origin', origin);
  if (value !== undefined) headers.set('Content-Type', 'application/json');
  if (session) headers.set('Cookie', session);
  return object.fetch(new Request(`https://vagon.example${path}`, { method, headers, ...(value !== undefined ? { body: JSON.stringify(value) } : {}) }));
}

async function login(object: VagonDatabase, username = 'admin', password = ADMIN_PASSWORD): Promise<string> {
  const response = await call(object, '/api/login', 'POST', { username, password });
  expect(response.status).toBe(200);
  return response.headers.get('Set-Cookie')!.split(';')[0];
}

const wagonFields = { number: '33407812345', entryDate: '2026-10-06', channelDate: '', completedDate: '', status: 'Bekliyor', notes: '' };

function testDocument(): DatabaseDocument {
  const now = '2026-10-06T00:00:00.000Z';
  const db = emptyDatabase();
  db.version = 5;
  db.users.push({ id: 'admin-1', username: 'admin', displayName: 'Yönetici', role: 'admin', active: true, createdAt: now, updatedAt: now, password: passwordHash, authVersion: 1 });
  db.wagons.push({ ...wagonFields, status: 'Bekliyor', id: 'wagon-1', revision: 1, createdAt: now, updatedAt: now, updatedBy: 'admin-1' });
  return db;
}

beforeAll(async () => { passwordHash = await createPasswordHash(ADMIN_PASSWORD); });

describe('authenticated shared records', () => {
  it('persists wagon types, accepts legacy records and rejects unknown types', async () => {
    const object = makeObject();
    const session = await login(object);
    const response = await call(object, '/api/wagons', 'POST', { ...wagonFields, wagonType: 'Hbbills' }, session);
    expect(response.status).toBe(201);
    const saved = await response.json() as { record: Wagon };
    expect(saved.record.wagonType).toBe('Hbbills');
    expect((await call(object, '/api/wagons', 'POST', { ...wagonFields, number: 'legacy' }, session)).status).toBe(201);
    expect((await call(object, '/api/wagons', 'POST', { ...wagonFields, number: 'bad', wagonType: 'Unknown' }, session)).status).toBe(400);
    const result = await (await call(object, '/api/data', 'GET', undefined, session)).json() as { wagons: Wagon[] };
    expect(result.wagons.find(wagon => wagon.id === saved.record.id)?.wagonType).toBe('Hbbills');
  });

  it('supports a nine-character administrator password without storing plaintext', async () => {
    const object = makeObject(makeEnv({ ADMIN_PASSWORD: 'Example9!' }));
    await login(object, 'admin', 'Example9!');
  });
  it('rejects anonymous data reads and returns only safe user fields', async () => {
    const object = makeObject();
    expect((await call(object, '/api/data')).status).toBe(401);
    expect(await (await call(object, '/api/session')).json()).toEqual({ user: null });
    const response = await call(object, '/api/login', 'POST', { username: 'admin', password: ADMIN_PASSWORD });
    expect(response.status).toBe(200);
    expect(response.headers.get('Set-Cookie')).toContain('HttpOnly; SameSite=Strict');
    expect(response.headers.get('Set-Cookie')).toContain('Secure');
    const { user } = await response.json() as { user: Record<string, unknown> };
    expect(user.username).toBe('admin');
    expect(user).not.toHaveProperty('password');
    expect(user).not.toHaveProperty('authVersion');
  });

  it('shares create/edit operations, rejects stale revisions, and restricts deletion to admins', async () => {
    const object = makeObject();
    const admin = await login(object);
    const addedUser = await call(object, '/api/admin/users', 'POST', { username: 'teknisyen', displayName: 'Teknisyen', password: USER_PASSWORD, role: 'user' }, admin);
    expect(addedUser.status).toBe(201);
    const user = await login(object, 'teknisyen', USER_PASSWORD);
    const created = await call(object, '/api/wagons', 'POST', wagonFields, user);
    expect(created.status).toBe(201);
    const { record } = await created.json() as { record: Wagon };
    const edited = await call(object, `/api/wagons/${record.id}`, 'PATCH', { revision: 1, notes: 'Ortak kayıt' }, user);
    expect(edited.status).toBe(200);
    const adminData = await (await call(object, '/api/data', 'GET', undefined, admin)).json() as { wagons: Wagon[] };
    expect(adminData.wagons[0].notes).toBe('Ortak kayıt');
    expect((await call(object, `/api/wagons/${record.id}`, 'PATCH', { revision: 1, notes: 'Eski veri' }, admin)).status).toBe(409);
    expect((await call(object, `/api/wagons/${record.id}`, 'DELETE', { revision: 2 }, user)).status).toBe(403);
    expect((await call(object, `/api/wagons/${record.id}`, 'DELETE', { revision: 2 }, admin)).status).toBe(200);
    const { events } = await (await call(object, '/api/admin/audit', 'GET', undefined, admin)).json() as { events: { action: string }[] };
    expect(events.some(e => e.action === 'Kayıt silindi')).toBe(true);
    expect((await call(object, '/api/admin/audit', 'GET', undefined, user)).status).toBe(403);
  });

  it('serializes concurrent edits so exactly one writer can use a revision', async () => {
    const object = makeObject();
    const admin = await login(object);
    const { record } = await (await call(object, '/api/wagons', 'POST', wagonFields, admin)).json() as { record: Wagon };
    const responses = await Promise.all([
      call(object, `/api/wagons/${record.id}`, 'PATCH', { revision: 1, notes: 'A' }, admin),
      call(object, `/api/wagons/${record.id}`, 'PATCH', { revision: 1, notes: 'B' }, admin),
    ]);
    expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
  });

  it('blocks cross-origin writes, metadata injection, invalid dates and unknown input fields', async () => {
    const object = makeObject();
    const admin = await login(object);
    expect((await call(object, '/api/wagons', 'POST', wagonFields, admin, 'https://attacker.example')).status).toBe(403);
    expect((await call(object, '/api/wagons', 'POST', { ...wagonFields, updatedBy: 'forged' }, admin)).status).toBe(400);
    expect((await call(object, '/api/wagons', 'POST', { ...wagonFields, entryDate: '2026-02-30' }, admin)).status).toBe(400);
    expect((await call(object, '/api/inventory', 'POST', { type: 'Piston', brand: '', quantity: -1, serialNumber: '' }, admin)).status).toBe(400);
  });

  it('validates wagon workflow changes while preserving unrelated edits to legacy records', async () => {
    const legacy = testDocument();
    legacy.wagons[0].entryDate = '';
    legacy.wagons[0].status = 'Tamamlandı';
    const object = makeObject(makeEnv({ LOCAL_SEED_JSON: JSON.stringify(legacy) }));
    const admin = await login(object);
    expect((await call(object, '/api/wagons', 'POST', { ...wagonFields, entryDate: '' }, admin)).status).toBe(400);
    expect((await call(object, '/api/wagons', 'POST', { ...wagonFields, channelDate: '2026-10-05' }, admin)).status).toBe(400);
    expect((await call(object, '/api/wagons', 'POST', { ...wagonFields, status: 'Tamamlandı' }, admin)).status).toBe(400);
    expect((await call(object, '/api/wagons', 'POST', { ...wagonFields, completedDate: '2026-10-07' }, admin)).status).toBe(400);
    expect((await call(object, '/api/wagons/wagon-1', 'PATCH', { revision: 1, notes: 'Preserve historical workflow' }, admin)).status).toBe(200);
    expect((await call(object, '/api/wagons/wagon-1', 'PATCH', { revision: 2, status: 'Bekliyor' }, admin)).status).toBe(400);
    expect((await call(object, '/api/wagons/wagon-1', 'PATCH', { revision: 2, entryDate: '2026-10-06', completedDate: '2026-10-07', status: 'Tamamlandı' }, admin)).status).toBe(200);
  });

  it('loads base64 development seeds with Turkish Unicode, embedded quotes and newlines', async () => {
    const seed = testDocument();
    seed.wagons[0].notes = 'İstanbul atölyesi: "çalışıyor"\nİkinci satır: şığöü';
    const encoded = toBase64(new TextEncoder().encode(JSON.stringify(seed)));
    const object = makeObject(makeEnv({ LOCAL_SEED_BASE64: encoded }));
    const admin = await login(object);
    const loaded = await (await call(object, '/api/data', 'GET', undefined, admin)).json() as { wagons: Wagon[] };
    expect(loaded.wagons[0].notes).toBe(seed.wagons[0].notes);
    expect(loaded.wagons[0].id).toBe(seed.wagons[0].id);
  });

  it('fails clearly for malformed or oversized base64 seed bindings', async () => {
    const object = makeObject(makeEnv({ LOCAL_SEED_BASE64: '%%%not-base64%%%' }));
    const invalid = await call(object, '/api/login', 'POST', { username: 'admin', password: ADMIN_PASSWORD });
    expect(invalid.status).toBe(503);
    expect(await invalid.json()).toMatchObject({ code: 'INVALID_LOCAL_SEED' });
    const invalidUtf8 = makeObject(makeEnv({ LOCAL_SEED_BASE64: toBase64(new Uint8Array([0xff, 0xff])) }));
    expect(await (await call(invalidUtf8, '/api/login', 'POST', { username: 'admin', password: ADMIN_PASSWORD })).json()).toMatchObject({ code: 'INVALID_LOCAL_SEED' });
    const invalidShape = makeObject(makeEnv({ LOCAL_SEED_BASE64: toBase64(new TextEncoder().encode('{"wagons":[{}]}')) }));
    expect(await (await call(invalidShape, '/api/login', 'POST', { username: 'admin', password: ADMIN_PASSWORD })).json()).toMatchObject({ code: 'INVALID_LOCAL_SEED' });
    const huge = makeObject(makeEnv({ LOCAL_SEED_BASE64: 'A'.repeat(2_000_005) }));
    const oversized = await call(huge, '/api/login', 'POST', { username: 'admin', password: ADMIN_PASSWORD });
    expect(oversized.status).toBe(413);
    expect(await oversized.json()).toMatchObject({ code: 'INVALID_LOCAL_SEED' });
  });

  it('does not lock users out when configuration fails before checking credentials', async () => {
    const storage = new MemoryStorage();
    const object = makeObject(makeEnv({ LOCAL_SEED_BASE64: '%%%not-base64%%%' }), storage);
    for (let attempt = 0; attempt < 12; attempt++) {
      const response = await call(object, '/api/login', 'POST', { username: 'admin', password: ADMIN_PASSWORD });
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ code: 'INVALID_LOCAL_SEED' });
    }
    expect(await storage.get('loginLimits')).toEqual({});
  });

  it('keeps the new password session and rejects old sessions and logged-out cookie replay', async () => {
    const object = makeObject();
    const admin = await login(object);
    const invalid = await call(object, '/api/password', 'POST', { currentPassword: 'incorrect', password: 'new-password-for-admin-123' }, admin);
    expect(invalid.status).toBe(400);
    const changed = await call(object, '/api/password', 'POST', { currentPassword: ADMIN_PASSWORD, password: 'new-password-for-admin-123' }, admin);
    expect(changed.status).toBe(200);
    const fresh = changed.headers.get('Set-Cookie')!.split(';')[0];
    expect((await call(object, '/api/data', 'GET', undefined, admin)).status).toBe(401);
    expect((await call(object, '/api/data', 'GET', undefined, fresh)).status).toBe(200);
    expect((await call(object, '/api/logout', 'POST', undefined, fresh)).status).toBe(200);
    expect((await call(object, '/api/data', 'GET', undefined, fresh)).status).toBe(401);
  });

  it('protects the last active administrator and revokes a disabled user session', async () => {
    const object = makeObject();
    const admin = await login(object);
    const { users } = await (await call(object, '/api/admin/users', 'GET', undefined, admin)).json() as { users: { id: string }[] };
    expect((await call(object, `/api/admin/users/${users[0].id}`, 'PATCH', { active: false }, admin)).status).toBe(409);
    expect((await call(object, `/api/admin/users/${users[0].id}`, 'DELETE', {}, admin)).status).toBe(409);
    const { user } = await (await call(object, '/api/admin/users', 'POST', { username: 'staff', displayName: 'Staff', password: USER_PASSWORD, role: 'user' }, admin)).json() as { user: { id: string } };
    const staff = await login(object, 'staff', USER_PASSWORD);
    expect((await call(object, `/api/admin/users/${user.id}`, 'PATCH', { active: false }, admin)).status).toBe(200);
    expect((await call(object, '/api/data', 'GET', undefined, staff)).status).toBe(401);
  });

  it('persists login rate limits across DO restarts and returns uniform credential failures', async () => {
    const storage = new MemoryStorage();
    let object = makeObject(makeEnv(), storage);
    for (let i = 0; i < 10; i++) {
      const response = await call(object, '/api/login', 'POST', { username: 'nonexistent', password: 'wrong-password' });
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Kullanıcı adı veya şifre yanlış.', code: 'INVALID_CREDENTIALS' });
    }
    object = makeObject(makeEnv(), storage);
    expect((await call(object, '/api/login', 'POST', { username: 'nonexistent', password: 'wrong-password' })).status).toBe(429);
  });

  it('does not consume brute-force limits for successful logins from a shared office IP', async () => {
    const object = makeObject();
    for (let i = 0; i < 25; i++) await login(object);
    expect((await call(object, '/api/login', 'POST', { username: 'admin', password: 'incorrect-password' })).status).toBe(401);
  });
});

describe('encrypted GitHub canonical storage', () => {
  function fakeGitHub(initial = testDocument()) {
    let database = structuredClone(initial);
    let sha = 'sha-1';
    let writes = 0;
    let rejectWrite = false;
    let conflict = false;
    let removed = false;
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        if (rejectWrite) return new Response('upstream error with secret detail', { status: 503 });
        const put = JSON.parse(init.body as string) as { sha: string; content: string };
        if (conflict) {
          conflict = false;
          database.wagons[0].notes = 'External edit';
          database.wagons[0].revision++;
          database.version++;
          sha = 'sha-external';
          return new Response('', { status: 409 });
        }
        if (put.sha !== sha) return new Response('', { status: 409 });
        database = await decryptDatabase(JSON.parse(new TextDecoder().decode(fromBase64(put.content))), DB_KEY);
        sha = `sha-${++writes + 1}`;
        return Response.json({ content: { sha } });
      }
      if (removed) return new Response('', { status: 404 });
      const encrypted = await encryptDatabase(database, DB_KEY);
      return Response.json({ encoding: 'base64', sha, content: toBase64(new TextEncoder().encode(JSON.stringify(encrypted))) });
    }) as unknown as typeof fetch;
    return { fetcher, current: () => structuredClone(database), failWrites: () => { rejectWrite = true; }, conflictOnce: () => { conflict = true; }, remove: () => { removed = true; } };
  }

  function remoteEnv(): DatabaseEnvironment {
    return { SESSION_SECRET: SECRET, DB_ENCRYPTION_KEY: DB_KEY, GITHUB_TOKEN: 'test-repository-token', GITHUB_REPOSITORY: 'owner/repo' };
  }

  it('calls fetch with the global receiver required by the Workers runtime', async () => {
    const encrypted = await encryptDatabase(testDocument(), DB_KEY);
    const fetcher = async function(this: unknown): Promise<Response> {
      if (this !== globalThis) throw new TypeError('Illegal invocation');
      return Response.json({ encoding: 'base64', sha: 'sha-global', content: toBase64(new TextEncoder().encode(JSON.stringify(encrypted))) });
    };
    const result = await new GitHubStore<DatabaseDocument>(remoteEnv(), fetcher as typeof fetch).read();
    expect(result?.sha).toBe('sha-global');
    expect(result?.database.wagons).toEqual(testDocument().wagons);
  });

  it.each([
    { GITHUB_TOKEN: undefined, DB_ENCRYPTION_KEY: DB_KEY, missing: ['GITHUB_TOKEN'] },
    { GITHUB_TOKEN: 'test-repository-token', DB_ENCRYPTION_KEY: ' ', missing: ['DB_ENCRYPTION_KEY'] },
    { GITHUB_TOKEN: '', DB_ENCRYPTION_KEY: undefined, missing: ['GITHUB_TOKEN', 'DB_ENCRYPTION_KEY'] },
  ])('identifies missing runtime secrets before contacting GitHub ($missing)', async ({ missing, ...env }) => {
    const fetcher = vi.fn();
    const store = new GitHubStore({ ...remoteEnv(), ...env }, fetcher as unknown as typeof fetch);
    try {
      await store.read();
      throw new Error('Expected missing configuration to fail');
    } catch (error) {
      expect(error).toMatchObject({ code: 'CONFIGURATION_REQUIRED', status: 503 });
      expect((error as Error).message).toContain(missing.join(', '));
      expect((error as Error).message).not.toContain('test-repository-token');
    }
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('writes authenticated ciphertext and never commits a failed write to the local cache', async () => {
    const github = fakeGitHub();
    const storage = new MemoryStorage();
    const engine = new DatabaseEngine(storage, remoteEnv(), github.fetcher);
    await engine.load();
    await engine.mutate(db => { db.wagons[0].notes = 'Saved shared note'; });
    expect(github.current().wagons[0].notes).toBe('Saved shared note');
    const put = (github.fetcher as ReturnType<typeof vi.fn>).mock.calls.find(call => (call[1] as RequestInit | undefined)?.method === 'PUT');
    expect(put).toBeDefined();
    const decoded = new TextDecoder().decode(fromBase64(JSON.parse(put![1].body).content));
    expect(decoded).not.toContain('Saved shared note');
    expect(decoded).not.toContain('test-repository-token');
    expect(decoded).not.toContain(passwordHash.hash);
    github.failWrites();
    await expect(engine.mutate(db => { db.wagons[0].notes = 'Never acknowledged'; })).rejects.toMatchObject({ code: 'GITHUB_WRITE_FAILED' });
    expect((await engine.load()).wagons[0].notes).toBe('Saved shared note');
    const cache = await storage.get<{ database: DatabaseDocument }>('snapshot');
    expect(cache!.database.wagons[0].notes).toBe('Saved shared note');
  });

  it('retries SHA conflicts using fresh data and preserves unrelated external changes', async () => {
    const github = fakeGitHub();
    const engine = new DatabaseEngine(new MemoryStorage(), remoteEnv(), github.fetcher);
    github.conflictOnce();
    await engine.mutate(db => { db.inventory.push({ id: 'inventory-new', type: 'Piston', brand: '', quantity: 1, serialNumber: '', revision: 1, createdAt: '2026-10-06T00:00:00.000Z', updatedAt: '2026-10-06T00:00:00.000Z', updatedBy: 'admin-1' }); });
    expect(github.current().wagons[0].notes).toBe('External edit');
    expect(github.current().inventory).toHaveLength(1);
  });

  it('bootstraps the first administrator without discarding imported operational records', async () => {
    const initial = testDocument();
    initial.users = [];
    const github = fakeGitHub(initial);
    const engine = new DatabaseEngine(new MemoryStorage(), { ...remoteEnv(), ADMIN_PASSWORD, ADMIN_USERNAME: 'admin' }, github.fetcher);
    const loaded = await engine.load();
    expect(loaded.users).toHaveLength(1);
    expect(loaded.users[0].role).toBe('admin');
    expect(github.current().users[0].password.iterations).toBe(100_000);
    expect(github.current().wagons).toEqual(initial.wagons);
  });

  it('acknowledges a committed remote write even when the disposable cache fails', async () => {
    const github = fakeGitHub();
    const storage = new MemoryStorage();
    const engine = new DatabaseEngine(storage, remoteEnv(), github.fetcher);
    await engine.load();
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(storage, 'put').mockRejectedValue(new Error('Cache unavailable'));
    const committed = await engine.mutate(db => { db.wagons[0].notes = 'Durable remote save'; return true; });
    expect(committed.result).toBe(true);
    expect(github.current().wagons[0].notes).toBe('Durable remote save');
    expect((await engine.load()).wagons[0].notes).toBe('Durable remote save');
    github.remove();
    const restarted = new DatabaseEngine(storage, { ...remoteEnv(), ADMIN_PASSWORD }, github.fetcher);
    await expect(restarted.load()).rejects.toMatchObject({ code: 'DATABASE_REMOVED' });
    errorLog.mockRestore();
  });

  it('never creates an empty canonical database when both remote file and cache are missing', async () => {
    const github = fakeGitHub();
    github.remove();
    const engine = new DatabaseEngine(new MemoryStorage(), { ...remoteEnv(), ADMIN_PASSWORD }, github.fetcher);
    await expect(engine.load()).rejects.toMatchObject({ code: 'DATABASE_NOT_INITIALIZED' });
    expect((github.fetcher as ReturnType<typeof vi.fn>).mock.calls.some(call => (call[1] as RequestInit | undefined)?.method === 'PUT')).toBe(false);
  });

  it('reads databases above 1 MiB using object metadata and a SHA-pinned blob', async () => {
    const envelope = await encryptDatabase(testDocument(), DB_KEY);
    const fetcher = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (String(url).includes('/contents/')) {
        expect(headers.get('Accept')).toBe('application/vnd.github.object+json');
        return Response.json({ sha: 'large-blob-sha', encoding: 'none', content: '', size: 1_100_000 });
      }
      expect(String(url)).toBe('https://api.github.com/repos/owner/repo/git/blobs/large-blob-sha');
      expect(headers.get('Accept')).toBe('application/vnd.github+json');
      return Response.json({ encoding: 'base64', content: toBase64(new TextEncoder().encode(JSON.stringify(envelope))) });
    }) as unknown as typeof fetch;
    const result = await new GitHubStore<DatabaseDocument>(remoteEnv(), fetcher).read();
    expect(result?.database.wagons[0].number).toBe(wagonFields.number);
    expect(result?.sha).toBe('large-blob-sha');
  });

  it('rechecks revisions after remote conflict instead of overwriting another writer', async () => {
    const github = fakeGitHub();
    const engine = new DatabaseEngine(new MemoryStorage(), remoteEnv(), github.fetcher);
    github.conflictOnce();
    await expect(engine.mutate(db => {
      if (db.wagons[0].revision !== 1) throw new ApiError(409, 'REVISION_CONFLICT', 'Changed');
      db.wagons[0].notes = 'Would overwrite';
      db.wagons[0].revision++;
    })).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    expect(github.current().wagons[0].notes).toBe('External edit');
  });

  it('fails closed when canonical storage disappears instead of bootstrapping over it', async () => {
    const github = fakeGitHub();
    const storage = new MemoryStorage();
    const engine = new DatabaseEngine(storage, remoteEnv(), github.fetcher);
    await engine.load();
    github.remove();
    await expect(engine.load(true)).rejects.toMatchObject({ code: 'DATABASE_REMOVED' });
    const restarted = new DatabaseEngine(storage, { ...remoteEnv(), ADMIN_PASSWORD }, github.fetcher);
    await expect(restarted.load()).rejects.toMatchObject({ code: 'DATABASE_REMOVED' });
  });

  it('rejects wrong encryption keys and tampered session signatures', async () => {
    const encrypted = await encryptDatabase(testDocument(), DB_KEY);
    await expect(decryptDatabase(encrypted, toBase64(new Uint8Array(32).fill(12)))).rejects.toMatchObject({ code: 'DATABASE_DECRYPTION_FAILED' });
    const signed = await signSession({ userId: 'admin-1', authVersion: 1, expiresAt: Date.now() + 60_000, nonce: 'test-nonce' }, SECRET);
    expect(await verifySession(signed, SECRET)).toMatchObject({ userId: 'admin-1' });
    expect(await verifySession(`x${signed}`, SECRET)).toBeNull();
    expect(await verifySession(signed, SECRET, Date.now() + 120_000)).toBeNull();
  });

  it('reports optimistic GitHub conflict and network errors without exposing upstream data', async () => {
    const conflictStore = new GitHubStore(remoteEnv(), vi.fn(async () => new Response('', { status: 409 })) as unknown as typeof fetch);
    await expect(conflictStore.write(testDocument(), 'sha-before', 'Save')).rejects.toBeInstanceOf(GitHubConflict);
    const unavailable = new GitHubStore(remoteEnv(), vi.fn(async () => { throw new Error('secret in upstream error'); }) as unknown as typeof fetch);
    await expect(unavailable.read()).rejects.toMatchObject({ code: 'GITHUB_UNAVAILABLE' });
  });
});
