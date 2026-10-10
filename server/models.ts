import { z } from 'zod';
import type { JobType, MaintenanceOperation } from '../shared/maintenance';
import { jobTypeSchema, maintenanceRecordSchema } from './maintenance';
import { WAGON_STATUSES, POSTS, LEGACY_POSTS, normalizePost, type AuditEvent, type Inventory, type Part, type SafeUser, type Wagon } from '../shared/types';
import type { PasswordHash } from './crypto';
import { ApiError } from './errors';
import type { WorkshopData } from '../shared/workshop';
import type { WorkEntry } from '../shared/work-entry';
import { validateWorkshop, workshopSchema } from './workshop';
import { wagonTypeFromNumber } from '../shared/wagon-types';

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
  jobTypes?: JobType[];
  maintenanceOperations?: MaintenanceOperation[];
  workshop?: WorkshopData;
  workEntries?: WorkEntry[];
}

export type { WorkEntry } from '../shared/work-entry';

const shortText = z.string().trim().max(200);
const requiredText = shortText.min(1);
const date = z.string().refine(value => value === '' || (/^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value), 'Geçerli bir tarih girin.');
const quantity = z.number().int().min(0).max(1_000_000);

export const wagonFields = z.object({
  number: requiredText,
  wagonType: z.string().max(100).optional(),
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

export function derivedWagonFields<T extends {number:string;status:Wagon['status'];completedDate:string}>(fields:T,previous?:Wagon):T&{wagonType:string} {
 const today=new Date(Date.now()+3*3600000).toISOString().slice(0,10);
 return {...fields,wagonType:wagonTypeFromNumber(fields.number),completedDate:fields.status==='Tamamlandı'?(previous?.status==='Tamamlandı'&&previous.completedDate?previous.completedDate:today):''};
}
export function rejectManualCompletionDate(fields:Pick<Wagon,'status'|'completedDate'>):void {
 if(fields.status!=='Tamamlandı'&&fields.completedDate)throw new ApiError(400,'INVALID_WAGON_DATES','Tamamlanma tarihi yalnız Tamamlandı durumu için kullanılabilir.');
}

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

export const normalizeUsername = (value: string): string => value.trim().normalize('NFC').toLocaleLowerCase('tr-TR');
export const usernameSchema = z.string().transform(normalizeUsername).pipe(z.string().regex(/^[a-z0-9çğıöşü._-]{3,64}$/u, 'Kullanıcı adı 3–64 Türkçe veya İngilizce harf, rakam, nokta, tire ya da alt çizgiden oluşmalı.'));
export const passwordSchema = z.string().min(8, 'Şifre en az 8 karakter olmalı.').max(256);
export const postSchema = z.union([z.enum(POSTS), z.literal('')]);
const storedPostSchema = z.union([postSchema,z.enum(LEGACY_POSTS)]);
export const createUserSchema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().min(1).max(100),
  post: postSchema.optional(),
  password: passwordSchema,
  role: z.enum(['admin', 'user']),
}).strict();
export const updateUserSchema = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
  post: postSchema.optional(),
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
  return { id: user.id, username: user.username, displayName: user.displayName, post: normalizePost(user.post), role: user.role, active: user.active, createdAt: user.createdAt, updatedAt: user.updatedAt };
}

export function assertDatabase(database: unknown): asserts database is DatabaseDocument {
  const metadata = z.object({ id: z.string().min(1), revision: z.number().int().positive(), createdAt: z.string(), updatedAt: z.string(), updatedBy: z.string() });
  const password = z.object({ algorithm: z.literal('PBKDF2-SHA256'), iterations: z.literal(100_000), salt: z.string().regex(/^[A-Za-z0-9+/]{22}==$/), hash: z.string().regex(/^[A-Za-z0-9+/]{43}=$/) });
  const user = z.object({ id: z.string().min(1), username: usernameSchema, displayName: z.string(), post: storedPostSchema.optional(), role: z.enum(['admin', 'user']), active: z.boolean(), createdAt: z.string(), updatedAt: z.string(), password, authVersion: z.number().int().nonnegative() });
  const document = z.object({
    formatVersion: z.literal(1), version: z.number().int().nonnegative(), updatedAt: z.string(),
    wagons: z.array(wagonFields.merge(metadata)), parts: z.array(partFields.merge(metadata)), inventory: z.array(inventoryFields.merge(metadata)),
    jobTypes: z.array(jobTypeSchema).optional(), maintenanceOperations: z.array(maintenanceRecordSchema).optional(),
    workshop: workshopSchema.optional(),
    workEntries: z.array(z.object({id:z.string(),wagonNumber:z.string(),actorId:z.string(),actorName:z.string(),post:z.string(),startedAt:z.string().datetime(),finishedAt:z.string().datetime(),jobs:z.array(z.object({id:z.number().int(),name:z.string(),category:z.string(),quantity:z.number().int().positive(),durationMinutes:z.number().nonnegative().optional(),heavyMinutes:z.number().nonnegative().optional(),standardMinutes:z.number().nonnegative().optional()})).min(1),crew:z.array(z.object({id:z.string(),name:z.string()})).optional(),notes:z.string(),createdAt:z.string().datetime()})).optional(),
    users: z.array(user), audit: z.array(z.object({ id: z.string(), at: z.string(), actorId: z.string(), actorName: z.string(), action: z.string(), entity: z.enum(['wagon', 'part', 'inventory', 'user', 'system', 'maintenance']), entityId: z.string().optional(), details: z.string().optional() })),
  });
  if (!document.safeParse(database).success) throw new ApiError(503, 'INVALID_DATABASE', 'Ortak veritabanının yapısı geçersiz.');
  const value = database as DatabaseDocument;
  if (value.workshop) validateWorkshop(value.workshop);
  for (const records of [value.wagons, value.parts, value.inventory, value.users, value.maintenanceOperations ?? []]) {
    if (new Set(records.map(r => r.id)).size !== records.length) throw new ApiError(503, 'INVALID_DATABASE', 'Veritabanında yinelenen kimlikler var.');
  }
  if (new Set(value.users.map(u => normalizeUsername(u.username))).size !== value.users.length) throw new ApiError(503, 'INVALID_DATABASE', 'Veritabanında yinelenen kullanıcılar var.');
  if (value.users.some(user => user.username !== normalizeUsername(user.username))) throw new ApiError(503, 'INVALID_DATABASE', 'Kullanıcı adları küçük harf olmalı.');
  if (value.users.length && !value.users.some(user => user.active && user.role === 'admin')) throw new ApiError(503, 'INVALID_DATABASE', 'Veritabanında en az bir aktif yönetici olmalı.');
}
