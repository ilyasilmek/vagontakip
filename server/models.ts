import { z } from 'zod';
import { WAGON_STATUSES, type AuditEvent, type Inventory, type Part, type SafeUser, type Wagon } from '../shared/types';
import type { PasswordHash } from './crypto';
import { ApiError } from './errors';

export interface StoredUser extends SafeUser {
  password: PasswordHash;
  authVersion: number;
}

export interface DatabaseDocument {
  formatVersion: 1;
  version: number;
  updatedAt: string;
  wagons: Wagon[];
  parts: Part[];
  inventory: Inventory[];
  users: StoredUser[];
  audit: AuditEvent[];
}

const shortText = z.string().trim().max(200);
const requiredText = shortText.min(1);
const date = z.string().refine(value => value === '' || (/^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value), 'Geçerli bir tarih girin.');
const quantity = z.number().int().min(0).max(1_000_000);

export const wagonFields = z.object({
  number: requiredText,
  entryDate: date,
  channelDate: date,
  completedDate: date,
  status: z.enum(WAGON_STATUSES),
  notes: z.string().trim().max(10_000),
}).strict();
export const partFields = z.object({
  type: requiredText,
  brand: shortText,
  quantity,
  serialNumber: shortText,
  wagonNumber: shortText,
  removedDate: date,
  sentDate: date,
  returnedDate: date,
  faultNotes: z.string().trim().max(10_000),
}).strict();
export const inventoryFields = z.object({ type: requiredText, brand: shortText, quantity, serialNumber: shortText }).strict();
export const fieldSchemas = { wagons: wagonFields, parts: partFields, inventory: inventoryFields };

export function validateWagonWorkflow(candidate: Pick<Wagon, 'entryDate' | 'channelDate' | 'completedDate' | 'status'>, existing?: Wagon, changed?: Record<string, unknown>): void {
  const relevant = ['entryDate', 'channelDate', 'completedDate', 'status'] as const;
  // Imported historical records may contain unfinished workflow information.
  // Editing unrelated notes must not force rewriting the original data.
  if (existing && changed && !relevant.some(field => Object.hasOwn(changed, field) && changed[field] !== existing[field])) return;
  if (!candidate.entryDate) throw new ApiError(400, 'INVALID_WAGON_DATES', 'Vagonun giriş tarihi girilmeli.');
  if (candidate.channelDate && candidate.channelDate < candidate.entryDate) throw new ApiError(400, 'INVALID_WAGON_DATES', 'Kanala giriş tarihi vagon girişinden önce olamaz.');
  if (candidate.completedDate && candidate.completedDate < (candidate.channelDate || candidate.entryDate)) throw new ApiError(400, 'INVALID_WAGON_DATES', 'Tamamlanma tarihi giriş tarihlerinden önce olamaz.');
  if (candidate.status === 'Tamamlandı' && !candidate.completedDate) throw new ApiError(400, 'INVALID_WAGON_DATES', 'Tamamlanan vagonun bitiş tarihi girilmeli.');
  if (candidate.completedDate && candidate.status !== 'Tamamlandı') throw new ApiError(400, 'INVALID_WAGON_DATES', 'Bitiş tarihi girilen vagonun durumu Tamamlandı olmalı.');
}

export const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,64}$/, 'Kullanıcı adı 3–64 harf, rakam, nokta, tire veya alt çizgiden oluşmalı.');
export const passwordSchema = z.string().min(8, 'Şifre en az 8 karakter olmalı.').max(256);
export const createUserSchema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().min(1).max(100),
  password: passwordSchema,
  role: z.enum(['admin', 'user']),
}).strict();
export const updateUserSchema = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
  password: passwordSchema.optional(),
  role: z.enum(['admin', 'user']).optional(),
  active: z.boolean().optional(),
  updatedAt: z.string().optional(),
}).strict().refine(value => Object.keys(value).some(key => key !== 'updatedAt'), 'En az bir alan değiştirilmeli.');

export function parseInput<S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw new ApiError(400, 'INVALID_INPUT', result.error.issues[0]?.message ?? 'Girilen bilgiler geçersiz.');
  return result.data;
}

export function safeUser(user: StoredUser): SafeUser {
  return { id: user.id, username: user.username, displayName: user.displayName, role: user.role, active: user.active, createdAt: user.createdAt, updatedAt: user.updatedAt };
}

export function assertDatabase(database: unknown): asserts database is DatabaseDocument {
  const metadata = z.object({ id: z.string().min(1), revision: z.number().int().positive(), createdAt: z.string(), updatedAt: z.string(), updatedBy: z.string() });
  const password = z.object({ algorithm: z.literal('PBKDF2-SHA256'), iterations: z.literal(100_000), salt: z.string().regex(/^[A-Za-z0-9+/]{22}==$/), hash: z.string().regex(/^[A-Za-z0-9+/]{43}=$/) });
  const user = z.object({ id: z.string().min(1), username: usernameSchema, displayName: z.string(), role: z.enum(['admin', 'user']), active: z.boolean(), createdAt: z.string(), updatedAt: z.string(), password, authVersion: z.number().int().nonnegative() });
  const document = z.object({
    formatVersion: z.literal(1), version: z.number().int().nonnegative(), updatedAt: z.string(),
    wagons: z.array(wagonFields.merge(metadata)), parts: z.array(partFields.merge(metadata)), inventory: z.array(inventoryFields.merge(metadata)),
    users: z.array(user), audit: z.array(z.object({ id: z.string(), at: z.string(), actorId: z.string(), actorName: z.string(), action: z.string(), entity: z.enum(['wagon', 'part', 'inventory', 'user', 'system']), entityId: z.string().optional(), details: z.string().optional() })),
  });
  if (!document.safeParse(database).success) throw new ApiError(503, 'INVALID_DATABASE', 'Ortak veritabanının yapısı geçersiz.');
  const value = database as DatabaseDocument;
  for (const records of [value.wagons, value.parts, value.inventory, value.users]) {
    if (new Set(records.map(r => r.id)).size !== records.length) throw new ApiError(503, 'INVALID_DATABASE', 'Veritabanında yinelenen kimlikler var.');
  }
  if (new Set(value.users.map(u => u.username.toLowerCase())).size !== value.users.length) throw new ApiError(503, 'INVALID_DATABASE', 'Veritabanında yinelenen kullanıcılar var.');
  if (value.users.some(user => user.username !== user.username.toLowerCase())) throw new ApiError(503, 'INVALID_DATABASE', 'Kullanıcı adları küçük harf olmalı.');
  if (value.users.length && !value.users.some(user => user.active && user.role === 'admin')) throw new ApiError(503, 'INVALID_DATABASE', 'Veritabanında en az bir aktif yönetici olmalı.');
}
