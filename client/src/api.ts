export class ApiError extends Error {
  status: number;
  code?: string;
  details?: { operationIds: string[] };

  constructor(message: string, status: number, code?: string, details?: { operationIds: string[] }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: 'no-store',
  });
  const result = await response.json().catch(() => null) as { error?: string; code?: string; details?: { operationIds: string[] } } | null;
  if (!response.ok) throw new ApiError(result?.error || 'İşlem tamamlanamadı. Lütfen tekrar deneyin.', response.status, result?.code, result?.details);
  return result as T;
}

const DATABASE = 'vagon-takip-offline';
const STORE = 'snapshots';

async function openCache(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function writeSnapshot(data: unknown): Promise<void> {
  const db = await openCache();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(data, 'latest');
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}

export async function cacheRead<T>(): Promise<T | null> {
  const db = await openCache();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get('latest');
    request.onsuccess = () => { db.close(); resolve((request.result as T | undefined) ?? null); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

async function clearSnapshot(): Promise<void> {
  const db = await openCache();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).clear();
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}

let cacheMutation: Promise<void> = Promise.resolve();
export function cacheWrite(data: unknown): Promise<void> {
  cacheMutation = cacheMutation.catch(() => {}).then(() => writeSnapshot(data));
  return cacheMutation;
}
export function cacheClear(): Promise<void> {
  cacheMutation = cacheMutation.catch(() => {}).then(() => clearSnapshot());
  return cacheMutation;
}
