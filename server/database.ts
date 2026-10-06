import { createPasswordHash, fromBase64, type SessionClaims } from './crypto';
import { ApiError } from './errors';
import { GitHubConflict, GitHubStore, type GitHubConfig } from './github';
import { assertDatabase, parseInput, passwordSchema, safeUser, usernameSchema, type DatabaseDocument, type StoredUser } from './models';
import type { AuditEvent } from '../shared/types';

export interface DatabaseEnvironment extends GitHubConfig {
  STORAGE_MODE?: string;
  LOCAL_SEED_JSON?: string;
  LOCAL_SEED_BASE64?: string;
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
  SESSION_SECRET: string;
  ALLOWED_ORIGINS?: string;
}

export interface StorageAdapter {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
}

interface Snapshot { database: DatabaseDocument; sha: string | null; syncedAt: number }

export function emptyDatabase(): DatabaseDocument {
  return { formatVersion: 1, version: 0, updatedAt: new Date().toISOString(), wagons: [], parts: [], inventory: [], users: [], audit: [] };
}

export function audit(database: DatabaseDocument, actor: StoredUser, action: string, entity: AuditEvent['entity'], entityId?: string): void {
  database.audit.push({ id: crypto.randomUUID(), at: new Date().toISOString(), actorId: actor.id, actorName: actor.displayName, action, entity, ...(entityId ? { entityId } : {}) });
  // The encrypted Git history retains older events; bound the active snapshot.
  if (database.audit.length > 5000) database.audit = database.audit.slice(-5000);
}

export function assertActor(database: DatabaseDocument, claims: SessionClaims, admin = false): StoredUser {
  const user = database.users.find(u => u.id === claims.userId && u.active && u.authVersion === claims.authVersion);
  if (!user || claims.expiresAt <= Date.now()) throw new ApiError(401, 'UNAUTHENTICATED', 'Oturumunuz sona erdi. Tekrar giriş yapın.');
  if (admin && user.role !== 'admin') throw new ApiError(403, 'FORBIDDEN', 'Bu işlem için yönetici yetkisi gerekiyor.');
  return user;
}

export class DatabaseEngine {
  private snapshot: Snapshot | undefined;
  private canonicalPreviouslyExisted = false;
  private readonly remote: GitHubStore<DatabaseDocument> | null;
  private readonly local: boolean;

  constructor(private readonly storage: StorageAdapter, private readonly env: DatabaseEnvironment, fetcher: typeof fetch = fetch) {
    this.local = env.STORAGE_MODE === 'local';
    this.remote = this.local ? null : new GitHubStore<DatabaseDocument>(env, fetcher);
  }

  private async bootstrap(database: DatabaseDocument): Promise<boolean> {
    if (database.users.length) return false;
    if (!this.env.ADMIN_PASSWORD) throw new ApiError(503, 'CONFIGURATION_REQUIRED', 'İlk yönetici hesabı için ADMIN_PASSWORD güvenli ortam ayarlarında tanımlanmalı.');
    const username = parseInput(usernameSchema, this.env.ADMIN_USERNAME ?? 'admin');
    const password = parseInput(passwordSchema, this.env.ADMIN_PASSWORD);
    const now = new Date().toISOString();
    const admin: StoredUser = { id: crypto.randomUUID(), username, displayName: 'Yönetici', role: 'admin', active: true, createdAt: now, updatedAt: now, password: await createPasswordHash(password), authVersion: 1 };
    database.users.push(admin);
    audit(database, admin, 'Yönetici hesabı oluşturuldu', 'user', admin.id);
    database.version++;
    database.updatedAt = now;
    return true;
  }

  private seed(): DatabaseDocument {
    const database = emptyDatabase();
    if (!this.env.LOCAL_SEED_BASE64 && !this.env.LOCAL_SEED_JSON) return database;
    let seed: Partial<DatabaseDocument>;
    // Base64 avoids dotenv's differing treatment of JSON quotes/newlines.
    // Bound the decoded seed below SQLite DO's 2 MiB value limit.
    const maxBytes = 1_500_000;
    try {
      let text: string;
      if (this.env.LOCAL_SEED_BASE64) {
        if (this.env.LOCAL_SEED_BASE64.length > 2_000_004) throw new ApiError(413, 'INVALID_LOCAL_SEED', 'Yerel başlangıç verisi çok büyük.');
        const bytes = fromBase64(this.env.LOCAL_SEED_BASE64);
        if (bytes.byteLength > maxBytes) throw new ApiError(413, 'INVALID_LOCAL_SEED', 'Yerel başlangıç verisi çok büyük.');
        text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      } else {
        text = this.env.LOCAL_SEED_JSON!;
        if (new TextEncoder().encode(text).byteLength > maxBytes) throw new ApiError(413, 'INVALID_LOCAL_SEED', 'Yerel başlangıç verisi çok büyük.');
      }
      seed = JSON.parse(text) as Partial<DatabaseDocument>;
      if (!seed || typeof seed !== 'object' || Array.isArray(seed)) throw new Error('Invalid seed');
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(503, 'INVALID_LOCAL_SEED', 'Yerel başlangıç verisi geçersiz.');
    }
    // Only operational data is accepted from development seed bindings.
    const seeded = { ...database, wagons: seed.wagons ?? [], parts: seed.parts ?? [], inventory: seed.inventory ?? [] };
    try { assertDatabase(seeded); }
    catch { throw new ApiError(503, 'INVALID_LOCAL_SEED', 'Yerel başlangıç verisinin yapısı geçersiz.'); }
    return seeded;
  }

  private async save(snapshot: Snapshot): Promise<void> {
    // Remote commit is already durable. Keep the in-memory authoritative view
    // even if a subsequent cache write fails; the next start rereads GitHub.
    try { await this.storage.put('snapshot', snapshot); }
    catch (error) {
      if (this.local) throw error;
      console.error('VagonTakip cache write failed after canonical persistence');
    }
    this.snapshot = snapshot;
    if (snapshot.sha) this.canonicalPreviouslyExisted = true;
  }

  async load(force = false): Promise<DatabaseDocument> {
    if (!this.snapshot) {
      if (this.local) {
        const stored = await this.storage.get<Snapshot>('snapshot');
        const database = stored?.database ?? this.seed();
        assertDatabase(database);
        await this.bootstrap(database);
        await this.save({ database, sha: null, syncedAt: Date.now() });
      } else {
        // Always reread the canonical GitHub file on a cold start. A stale DO
        // cache must never bootstrap over existing users or external edits.
        const cache = await this.storage.get<Snapshot>('snapshot');
        this.canonicalPreviouslyExisted = Boolean(cache?.sha);
        await this.refresh();
      }
    } else if (!this.local && (force || Date.now() - this.snapshot.syncedAt >= 10_000)) {
      await this.refresh();
    }
    return this.snapshot!.database;
  }

  private async refresh(): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await this.remote!.read();
      // Production setup commits the encrypted imported database separately.
      // A 404 must never recreate an empty database, even after cache failure
      // or on a new Durable Object with no initialization marker.
      if (!result) throw new ApiError(503, this.canonicalPreviouslyExisted ? 'DATABASE_REMOVED' : 'DATABASE_NOT_INITIALIZED', 'Ortak veritabanı bulunamadı. Yönetici şifreli başlangıç dosyasını yüklemeli veya dosyayı geri yüklemeli.');
      const database = result.database;
      assertDatabase(database);
      const bootstrapped = await this.bootstrap(database);
      let sha: string | null = result.sha;
      if (bootstrapped) {
        try { sha = await this.remote!.write(database, sha, `VagonTakip veritabanı başlatıldı (v${database.version})`); }
        catch (error) { if (error instanceof GitHubConflict) continue; throw error; }
      }
      await this.save({ database, sha, syncedAt: Date.now() });
      return;
    }
    throw new ApiError(409, 'DATABASE_BUSY', 'Veritabanı eşzamanlı güncelleniyor. Lütfen tekrar deneyin.');
  }

  async mutate<T>(operation: (database: DatabaseDocument) => Promise<T> | T): Promise<{ result: T; version: number }> {
    await this.load(true);
    for (let attempt = 0; attempt < 3; attempt++) {
      const database = structuredClone(this.snapshot!.database);
      const result = await operation(database);
      database.version++;
      database.updatedAt = new Date().toISOString();
      assertDatabase(database);
      let sha = this.snapshot!.sha;
      if (this.remote) {
        try { sha = await this.remote.write(database, sha, `VagonTakip verileri güncellendi (v${database.version})`); }
        catch (error) {
          if (error instanceof GitHubConflict) { await this.refresh(); continue; }
          throw error;
        }
      }
      await this.save({ database, sha, syncedAt: Date.now() });
      return { result, version: database.version };
    }
    throw new ApiError(409, 'DATABASE_BUSY', 'Veritabanı eşzamanlı güncelleniyor. Lütfen tekrar deneyin.');
  }

  async user(claims: SessionClaims, admin = false): Promise<StoredUser> {
    return assertActor(await this.load(), claims, admin);
  }

  async data(claims: SessionClaims) {
    const database = await this.load();
    return { version: database.version, updatedAt: database.updatedAt, wagons: database.wagons, parts: database.parts, inventory: database.inventory, user: safeUser(assertActor(database, claims)) };
  }
}
