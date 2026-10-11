import { z } from 'zod';
import { maintenanceInputSchema, maintenanceRecordSchema, resolveJobs } from './maintenance';
import { JOB_TYPES } from '../shared/maintenance';
import type { CollectionName, Inventory, OperationalRecord, Part, Wagon } from '../shared/types';
import { PASSWORD_ITERATIONS, createPasswordHash, signSession, verifyPassword, verifySession, type SessionClaims } from './crypto';
import { DatabaseEngine, assertActor, audit, type DatabaseEnvironment } from './database';
import { ApiError, errorResponse } from './errors';
import { WorkshopSqlStorage } from './workshop-storage';
import { workshopRequest } from './workshop-routes';
import { createUserSchema, derivedWagonFields, fieldSchemas, normalizeUsername, parseInput, passwordSchema, postSchema, rejectManualCompletionDate, safeUser, updateUserSchema, validateWagonWorkflow, type DatabaseDocument, type StoredUser } from './models';

export interface Env extends DatabaseEnvironment {
  DB: DurableObjectNamespace;
  ASSETS: Fetcher;
}

const COOKIE_NAME = 'vagontakip_session';
const SESSION_LIFETIME = 7 * 24 * 60 * 60 * 1000;
const encoder = new TextEncoder();
const entityNames = { wagons: 'wagon', parts: 'part', inventory: 'inventory' } as const;

function json(value: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(value, { status, headers });
}

function cookie(token: string, request: Request, clear = false): string {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE_NAME}=${clear ? '' : token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : SESSION_LIFETIME / 1000}${secure}`;
}

function sameOrigin(request: Request, env: DatabaseEnvironment): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  const origin = request.headers.get('Origin');
  const expected = new URL(request.url).origin;
  const localOrigins = env.STORAGE_MODE === 'local' ? (env.ALLOWED_ORIGINS ?? '').split(',').map(v => v.trim()).filter(Boolean) : [];
  if (!origin || (origin !== expected && !localOrigins.includes(origin))) {
    throw new ApiError(403, 'INVALID_ORIGIN', 'İstek güvenli bir uygulama sayfasından gönderilmeli.');
  }
}

async function body(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) throw new ApiError(415, 'JSON_REQUIRED', 'JSON biçiminde bilgi gönderilmeli.');
  if (Number(request.headers.get('Content-Length') ?? '0') > 32_768) throw new ApiError(413, 'REQUEST_TOO_LARGE', 'Gönderilen bilgiler çok büyük.');
  if (!request.body) throw new ApiError(400, 'INVALID_INPUT', 'Girilen bilgiler geçersiz.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 32_768) { await reader.cancel(); throw new ApiError(413, 'REQUEST_TOO_LARGE', 'Gönderilen bilgiler çok büyük.'); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const value = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid body');
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, 'INVALID_INPUT', 'Girilen bilgiler geçersiz.');
  }
}

function revisionCheck(record: OperationalRecord | undefined, revision: unknown): asserts record is OperationalRecord {
  if (!record) throw new ApiError(404, 'NOT_FOUND', 'Kayıt bulunamadı.');
  if (!Number.isInteger(revision) || revision !== record.revision) throw new ApiError(409, 'REVISION_CONFLICT', 'Bu kayıt başka bir kullanıcı tarafından değiştirildi. Güncel bilgileri yükleyin.');
}

type LimitBucket = { count: number; until: number };

export class VagonDatabase {
  private readonly engine: DatabaseEngine;
  private queue: Promise<unknown> = Promise.resolve();
  private limits: Record<string, LimitBucket> | undefined;
  private revoked: Record<string, number> | undefined;

  constructor(private readonly state: DurableObjectState, private readonly env: Env) {
    this.engine = new DatabaseEngine(env.STORAGE_MODE==='local'&&env.MAINTENANCE_ENABLED==='true'&&state.storage.sql ? new WorkshopSqlStorage(state.storage) : state.storage, env);
  }

  fetch(request: Request): Promise<Response> {
    // Awaited remote requests permit DO interleaving. An explicit queue keeps
    // the complete read/auth/CAS/cache operation serialized, including fetches.
    const operation = this.queue.then(() => this.handle(request));
    this.queue = operation.catch(() => undefined);
    return operation;
  }

  private async claims(request: Request): Promise<SessionClaims | null> {
    const token = request.headers.get('Cookie')?.split(';').map(p => p.trim()).find(p => p.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
    if (!token) return null;
    const claims = await verifySession(token, this.env.SESSION_SECRET);
    if (!claims) return null;
    this.revoked ??= await this.state.storage.get<Record<string, number>>('revokedSessions') ?? {};
    return this.revoked[claims.nonce] ? null : claims;
  }

  private async requireClaims(request: Request, admin = false): Promise<SessionClaims> {
    const claims = await this.claims(request);
    if (!claims) throw new ApiError(401, 'UNAUTHENTICATED', 'Devam etmek için giriş yapın.');
    await this.engine.user(claims, admin);
    return claims;
  }

  private async session(user: StoredUser, request: Request): Promise<string> {
    const token = await signSession({ userId: user.id, authVersion: user.authVersion, expiresAt: Date.now() + SESSION_LIFETIME, nonce: crypto.randomUUID() }, this.env.SESSION_SECRET);
    return cookie(token, request);
  }

  private async limitLogin(request: Request, username: string): Promise<string[]> {
    this.limits ??= await this.state.storage.get<Record<string, LimitBucket>>('loginLimits') ?? {};
    const now = Date.now();
    for (const [key, bucket] of Object.entries(this.limits)) if (bucket.until <= now) delete this.limits[key];
    // Only the edge-injected CF header is trusted. Do not accept forwarded IP
    // headers supplied by a browser. Local mode has one shared dev bucket.
    const address = request.headers.get('CF-Connecting-IP') ?? 'local';
    const keys = [`ip:${address}`, `user:${username}`];
    const consumed: string[] = [];
    for (const [index, raw] of keys.entries()) {
      const digest = await crypto.subtle.digest('SHA-256', encoder.encode(raw));
      const key = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
      if (!this.limits[key] && Object.keys(this.limits).length >= 2000) throw new ApiError(429, 'TOO_MANY_ATTEMPTS', 'Çok fazla giriş denemesi yapıldı. Daha sonra tekrar deneyin.');
      const bucket = this.limits[key] ?? { count: 0, until: now + 15 * 60 * 1000 };
      if (bucket.count >= (index === 0 ? 20 : 10)) throw new ApiError(429, 'TOO_MANY_ATTEMPTS', 'Çok fazla giriş denemesi yapıldı. 15 dakika sonra tekrar deneyin.');
      bucket.count++;
      this.limits[key] = bucket;
      consumed.push(key);
    }
    await this.state.storage.put('loginLimits', this.limits);
    return consumed;
  }

  private async successfulLogin(keys: string[]): Promise<void> {
    for (const key of keys) {
      const bucket = this.limits?.[key];
      if (!bucket) continue;
      bucket.count = Math.max(0, bucket.count - 1);
      if (bucket.count === 0) delete this.limits![key];
    }
    await this.state.storage.put('loginLimits', this.limits ?? {});
  }

  private async handle(request: Request): Promise<Response> {
    try {
      sameOrigin(request, this.env);
      const { pathname } = new URL(request.url);
      const method = request.method;

      if (pathname.startsWith('/api/workshop')) {
        if(this.env.MAINTENANCE_ENABLED!=='true'||this.env.STORAGE_MODE!=='local')throw new ApiError(404,'NOT_FOUND','Bu bölüm yalnız test ortamında etkin.');
        const claims=await this.requireClaims(request);
        return await workshopRequest(this.engine,claims,pathname,method,method==='GET'?undefined:await body(request));
      }

      if (pathname === '/api/session' && method === 'GET') {
        const claims = await this.claims(request);
        if (!claims) return json({ user: null });
        try { return json({ user: safeUser(await this.engine.user(claims)) }); }
        catch (error) { if (error instanceof ApiError && error.status === 401) return json({ user: null }); throw error; }
      }

      if (pathname === '/api/login' && method === 'POST') {
        const input = parseInput(z.object({ username: z.string().trim().min(1).max(64), password: z.string().min(1).max(256) }).strict(), await body(request));
        const legacyUsername = input.username.toLowerCase();
        const username = normalizeUsername(input.username);
        const loginKeys = await this.limitLogin(request, legacyUsername);
        let database: DatabaseDocument;
        try { database = await this.engine.load(); }
        catch (error) {
          // A database/configuration outage does not indicate a bad password.
          // Refund this attempt while retaining earlier credential failures.
          await this.successfulLogin(loginKeys);
          throw error;
        }
        const user = database.users.find(u => u.username === legacyUsername) ?? database.users.find(u => u.username === username);
        // Unknown accounts take the same PBKDF2 work as existing accounts.
        const valid = await verifyPassword(input.password, user?.password ?? { algorithm: 'PBKDF2-SHA256', iterations: PASSWORD_ITERATIONS, salt: 'AAAAAAAAAAAAAAAAAAAAAA==', hash: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' });
        if (!valid || !user?.active) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Kullanıcı adı veya şifre yanlış.');
        await this.successfulLogin(loginKeys);
        return json({ user: safeUser(user) }, 200, { 'Set-Cookie': await this.session(user, request) });
      }

      if (pathname === '/api/logout' && method === 'POST') {
        const claims = await this.claims(request);
        if (claims) {
          this.revoked ??= {};
          for (const [nonce, expiry] of Object.entries(this.revoked)) if (expiry <= Date.now()) delete this.revoked[nonce];
          this.revoked[claims.nonce] = claims.expiresAt;
          await this.state.storage.put('revokedSessions', this.revoked);
        }
        return json({ ok: true }, 200, { 'Set-Cookie': cookie('', request, true) });
      }

      if (pathname === '/api/data' && method === 'GET') return json(await this.engine.data(await this.requireClaims(request)));

      if (pathname === '/api/account' && method === 'PATCH') {
        const claims = await this.requireClaims(request);
        const input = parseInput(z.object({ post: postSchema }).strict(), await body(request));
        const { result: user } = await this.engine.mutate(database => {
          const user = assertActor(database, claims);
          user.post = input.post;
          user.updatedAt = new Date().toISOString();
          audit(database, user, 'Postası değiştirildi', 'user', user.id);
          return safeUser(user);
        });
        return json({ user });
      }

      if (pathname === '/api/password' && method === 'POST') {
        const claims = await this.requireClaims(request);
        const input = parseInput(z.object({ currentPassword: z.string().min(1).max(256), password: passwordSchema }).strict(), await body(request));
        const password = await createPasswordHash(input.password);
        const { result: user } = await this.engine.mutate(async database => {
          const user = assertActor(database, claims);
          if (!await verifyPassword(input.currentPassword, user.password)) throw new ApiError(400, 'INVALID_CURRENT_PASSWORD', 'Mevcut şifre yanlış.');
          user.password = password;
          user.authVersion++;
          user.updatedAt = new Date().toISOString();
          audit(database, user, 'Şifre değiştirildi', 'user', user.id);
          return user;
        });
        return json({ ok: true }, 200, { 'Set-Cookie': await this.session(user, request) });
      }

      const maintenanceRoute = /^\/api\/maintenance(?:\/([^/]+))?$/.exec(pathname);
      if (maintenanceRoute) {
        if (this.env.MAINTENANCE_ENABLED !== 'true') throw new ApiError(404, 'NOT_FOUND', 'Bu bölüm bu ortamda etkin değil.');
        const id = maintenanceRoute[1];
        const claims = await this.requireClaims(request, method === 'DELETE');
        if (method === 'POST' && id === 'with-wagon') {
          const input = parseInput(z.object({wagon:fieldSchemas.wagons,maintenance:maintenanceInputSchema}).strict(),await body(request));
          validateWagonWorkflow(input.wagon);
          if (input.wagon.number !== input.maintenance.wagonNumber) throw new ApiError(400,'WAGON_MISMATCH','Vagon ve bakım numarası aynı olmalı.');
          const {result,version}=await this.engine.mutate(database=>{
            const actor=assertActor(database,claims);const now=new Date().toISOString();
            const metadata={revision:1,createdAt:now,updatedAt:now,updatedBy:actor.id};
            const operation=parseInput(maintenanceRecordSchema,{...input.maintenance,jobs:resolveJobs(input.maintenance.jobs,database.jobTypes??JOB_TYPES),...metadata,id:crypto.randomUUID()});
            const wagon={...input.wagon,...metadata,id:crypto.randomUUID()} as Wagon;
            database.wagons.push(wagon);(database.maintenanceOperations??=[]).push(operation);
            audit(database,actor,'Vagon ve bakım birlikte eklendi','wagon',wagon.id);
            audit(database,actor,'Bakım operasyonu eklendi','maintenance',operation.id);
            return {wagon,operation};
          });
          return json({...result,version},201);
        }
        if (method === 'GET' && !id) {
          const database = await this.engine.load();
          return json({ operations: database.maintenanceOperations ?? [], jobTypes: database.jobTypes ?? JOB_TYPES });
        }
        if ((method === 'POST' && !id) || (method === 'PATCH' && id)) {
          const raw = await body(request);
          const revision = method === 'PATCH' ? parseInput(z.number().int().positive(), raw.revision) : undefined;
          const { revision: _ignored, ...values } = raw;
          const input = parseInput(maintenanceInputSchema, method === 'PATCH' ? values : raw);
          const { result: operation, version } = await this.engine.mutate(database => {
            const actor = assertActor(database, claims);
            const operations = database.maintenanceOperations ??= [];
            const existing = id ? operations.find(o => o.id === id) : undefined;
            if (id && !existing) throw new ApiError(404, 'NOT_FOUND', 'Bakım operasyonu bulunamadı.');
            if (existing && revision !== existing.revision) throw new ApiError(409, 'REVISION_CONFLICT', 'Operasyon değişmiş. Güncel kaydı yeniden açın.');
            const now = new Date().toISOString();
            const candidate = { ...input, jobs: resolveJobs(input.jobs, database.jobTypes ?? JOB_TYPES), id: existing?.id ?? crypto.randomUUID(), revision: (existing?.revision ?? 0) + 1, createdAt: existing?.createdAt ?? now, updatedAt: now, updatedBy: actor.id };
            const operation = parseInput(maintenanceRecordSchema, candidate);
            if (existing) operations[operations.indexOf(existing)] = operation; else operations.push(operation);
            audit(database, actor, existing ? 'Bakım operasyonu düzenlendi' : 'Bakım operasyonu eklendi', 'maintenance', operation.id);
            return operation;
          });
          return json({ operation, version }, method === 'POST' ? 201 : 200);
        }
        if (method === 'DELETE' && id) {
          const input = parseInput(z.object({revision:z.number().int().positive()}).strict(), await body(request));
          const { version } = await this.engine.mutate(database => {
            const actor = assertActor(database, claims, true);
            const operations = database.maintenanceOperations ??= [];
            const operation = operations.find(o => o.id === id);
            if (!operation) throw new ApiError(404, 'NOT_FOUND', 'Bakım operasyonu bulunamadı.');
            if (input.revision !== operation.revision) throw new ApiError(409, 'REVISION_CONFLICT', 'Operasyon değişmiş. Güncel kaydı yeniden açın.');
            operations.splice(operations.indexOf(operation), 1);
            audit(database, actor, 'Bakım operasyonu silindi', 'maintenance', id);
          });
          return json({version});
        }
        throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Bu işlem desteklenmiyor.');
      }

      const collectionRoute = /^\/api\/(wagons|parts|inventory)(?:\/([^/]+))?$/.exec(pathname);
      if (collectionRoute && ['POST', 'PATCH', 'DELETE'].includes(method)) {
        const collection = collectionRoute[1] as CollectionName;
        const id = collectionRoute[2];
        const claims = await this.requireClaims(request, method === 'DELETE');
        const input = await body(request);
        if (method === 'POST' && !id) {
          const fields = parseInput(fieldSchemas[collection], input);
          if (collection === 'wagons') { rejectManualCompletionDate(fields as Wagon);Object.assign(fields,derivedWagonFields(fields as Wagon)); validateWagonWorkflow(fields as Pick<Wagon, 'entryDate' | 'channelDate' | 'completedDate' | 'status'>); }
          const recordId = crypto.randomUUID();
          const { result: record, version } = await this.engine.mutate(database => {
            const actor = assertActor(database, claims);
            const now = new Date().toISOString();
            const record = { ...fields, id: recordId, revision: 1, createdAt: now, updatedAt: now, updatedBy: actor.id } as OperationalRecord;
            this.records(database, collection).push(record);
            audit(database, actor, 'Kayıt eklendi', entityNames[collection], record.id);
            return record;
          });
          return json({ record, version }, 201);
        }
        if (method === 'PATCH' && id) {
          const baseSchema: z.AnyZodObject = fieldSchemas[collection];
          const schema = baseSchema.partial().extend({ revision: z.number().int().positive() }).strict().refine(value => Object.keys(value).some(k => k !== 'revision'), 'En az bir alan değiştirilmeli.');
          const { revision, ...fields } = parseInput(schema, input);
          const { result: record, version } = await this.engine.mutate(database => {
            const actor = assertActor(database, claims);
            const record = this.records(database, collection).find(r => r.id === id);
            revisionCheck(record, revision);
            if (collection === 'wagons') {if(Object.hasOwn(fields,'completedDate'))rejectManualCompletionDate({...record,...fields} as Wagon);const derived=derivedWagonFields({...record,...fields} as Wagon,record as Wagon);if(Object.hasOwn(fields,'number'))Object.assign(fields,{wagonType:derived.wagonType});if(Object.hasOwn(fields,'status')||Object.hasOwn(fields,'completedDate'))Object.assign(fields,{completedDate:({...record,...fields} as Wagon).status==='Tamamlandı'&&fields.completedDate?fields.completedDate:derived.completedDate});validateWagonWorkflow({ ...record, ...fields } as Wagon, record as Wagon, fields);}
            Object.assign(record, fields, { revision: record.revision + 1, updatedAt: new Date().toISOString(), updatedBy: actor.id });
            audit(database, actor, 'Kayıt düzenlendi', entityNames[collection], record.id);
            return record;
          });
          return json({ record, version });
        }
        if (method === 'DELETE' && id) {
          const inputRevision = parseInput(z.object({ revision: z.number().int().positive() }).strict(), input).revision;
          const { version } = await this.engine.mutate(database => {
            const actor = assertActor(database, claims, true);
            const records = this.records(database, collection);
            const record = records.find(r => r.id === id);
            revisionCheck(record, inputRevision);
            records.splice(records.indexOf(record), 1);
            audit(database, actor, 'Kayıt silindi', entityNames[collection], record.id);
          });
          return json({ version });
        }
      }

      if (pathname.startsWith('/api/admin/')) return await this.admin(request, pathname, method);
      throw new ApiError(404, 'NOT_FOUND', 'İstenen işlem bulunamadı.');
    } catch (error) { return errorResponse(error); }
  }

  private records(database: DatabaseDocument, collection: CollectionName): OperationalRecord[] {
    return database[collection] as (Wagon | Part | Inventory)[];
  }

  private async admin(request: Request, pathname: string, method: string): Promise<Response> {
    const claims = await this.requireClaims(request, true);
    if (pathname === '/api/admin/audit' && method === 'GET') return json({ events: [...(await this.engine.load()).audit].reverse() });
    if (pathname === '/api/admin/users' && method === 'GET') return json({ users: (await this.engine.load()).users.map(safeUser) });
    if (pathname === '/api/admin/users' && method === 'POST') {
      const input = parseInput(createUserSchema, await body(request));
      const password = await createPasswordHash(input.password);
      const id = crypto.randomUUID();
      const { result: user, version } = await this.engine.mutate(database => {
        const actor = assertActor(database, claims, true);
        if (database.users.some(user => user.username === input.username)) throw new ApiError(409, 'USERNAME_TAKEN', 'Bu kullanıcı adı zaten kullanılıyor.');
        const now = new Date().toISOString();
        const user: StoredUser = { id, username: input.username, displayName: input.displayName, post: input.post || '', role: input.role, active: true, password, authVersion: 1, createdAt: now, updatedAt: now };
        database.users.push(user);
        audit(database, actor, 'Kullanıcı oluşturuldu', 'user', user.id);
        return safeUser(user);
      });
      return json({ user, version }, 201);
    }
    const userRoute = /^\/api\/admin\/users\/([^/]+)$/.exec(pathname);
    if (userRoute && (method === 'PATCH' || method === 'DELETE')) {
      const id = userRoute[1];
      const input: z.infer<typeof updateUserSchema> = method === 'PATCH' ? parseInput(updateUserSchema, await body(request)) : parseInput(z.object({ updatedAt: z.string().optional() }).strict(), await body(request));
      const password = input.password ? await createPasswordHash(input.password) : undefined;
      const { result: user, version } = await this.engine.mutate(database => {
        const actor = assertActor(database, claims, true);
        const user = database.users.find(u => u.id === id);
        if (!user) throw new ApiError(404, 'NOT_FOUND', 'Kullanıcı bulunamadı.');
        if (input.updatedAt && input.updatedAt !== user.updatedAt) throw new ApiError(409, 'REVISION_CONFLICT', 'Kullanıcı başka bir oturumda değiştirildi. Güncel bilgileri yükleyin.');
        const removesAdmin = method === 'DELETE' || input.active === false || input.role === 'user';
        if (user.active && user.role === 'admin' && removesAdmin && database.users.filter(u => u.active && u.role === 'admin').length === 1) {
          throw new ApiError(409, 'LAST_ADMIN', 'Son aktif yönetici silinemez veya yetkisi kaldırılamaz.');
        }
        if (method === 'DELETE') {
          database.users.splice(database.users.indexOf(user), 1);
          audit(database, actor, 'Kullanıcı silindi', 'user', user.id);
          return safeUser(user);
        }
        if (input.displayName !== undefined) user.displayName = input.displayName;
        if (input.post !== undefined) user.post = input.post;
        if (input.role !== undefined) user.role = input.role;
        if (input.active !== undefined) user.active = input.active;
        if (password) user.password = password;
        user.authVersion++;
        user.updatedAt = new Date().toISOString();
        audit(database, actor, 'Kullanıcı düzenlendi', 'user', user.id);
        return safeUser(user);
      });
      return json({ user, version });
    }
    throw new ApiError(404, 'NOT_FOUND', 'İstenen yönetici işlemi bulunamadı.');
  }
}

function secured(response: Response, api: boolean, request: Request): Response {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'same-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; manifest-src 'self'; worker-src 'self'");
  if (new URL(request.url).protocol === 'https:') headers.set('Strict-Transport-Security', 'max-age=31536000');
  if (api) { headers.set('Cache-Control', 'no-store'); headers.set('Vary', 'Cookie'); }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const pathname = new URL(request.url).pathname;
    const api = pathname.startsWith('/api/');
    try {
      if (pathname === '/api/health') return secured(json({ ok: true, storage: env.STORAGE_MODE === 'local' ? 'local' : 'github' }), true, request);
      if (api) {
        sameOrigin(request, env);
        const stub = env.DB.get(env.DB.idFromName('vagontakip-canonical-v1'));
        return secured(await stub.fetch(request), true, request);
      }
      return secured(await env.ASSETS.fetch(request), false, request);
    } catch (error) { return secured(errorResponse(error), api, request); }
  },
} satisfies ExportedHandler<Env>;
