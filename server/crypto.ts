import { ApiError } from './errors';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
// Workers WebCrypto limits PBKDF2 to 100,000 iterations.
export const PASSWORD_ITERATIONS = 100_000;

export interface PasswordHash {
  algorithm: 'PBKDF2-SHA256';
  iterations: number;
  salt: string;
  hash: string;
}

export interface EncryptedDatabase {
  format: 'vagontakip-aes256gcm';
  formatVersion: 1;
  iv: string;
  ciphertext: string;
}

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value.replace(/\s/g, ''));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function base64url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64url(value: string): Uint8Array<ArrayBuffer> {
  return fromBase64(value.replace(/-/g, '+').replace(/_/g, '/'));
}

export async function createPasswordHash(password: string, salt?: string): Promise<PasswordHash> {
  const saltBytes = salt ? fromBase64(salt) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations: PASSWORD_ITERATIONS, hash: 'SHA-256' }, key, 256);
  return { algorithm: 'PBKDF2-SHA256', iterations: PASSWORD_ITERATIONS, salt: toBase64(saltBytes), hash: toBase64(new Uint8Array(bits)) };
}

export async function verifyPassword(password: string, stored: PasswordHash): Promise<boolean> {
  if (stored.algorithm !== 'PBKDF2-SHA256' || stored.iterations !== PASSWORD_ITERATIONS) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: fromBase64(stored.salt), iterations: stored.iterations, hash: 'SHA-256' }, key, 256);
  const actual = new Uint8Array(bits);
  const expected = fromBase64(stored.hash);
  let difference = actual.length ^ expected.length;
  for (let i = 0; i < actual.length; i++) difference |= actual[i] ^ (expected[i] ?? 0);
  return difference === 0;
}

async function encryptionKey(secret: string): Promise<CryptoKey> {
  let bytes: Uint8Array<ArrayBuffer>;
  try { bytes = fromBase64(secret); } catch { throw new ApiError(503, 'CONFIGURATION_REQUIRED', 'Veritabanı şifreleme anahtarı yapılandırılmalı.'); }
  if (bytes.length !== 32) throw new ApiError(503, 'CONFIGURATION_REQUIRED', 'Veritabanı şifreleme anahtarı yapılandırılmalı.');
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptDatabase(database: unknown, secret: string): Promise<EncryptedDatabase> {
  const key = await encryptionKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode('vagontakip-database-v1') }, key, encoder.encode(JSON.stringify(database)));
  return { format: 'vagontakip-aes256gcm', formatVersion: 1, iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) };
}

export async function decryptDatabase<T>(envelope: EncryptedDatabase, secret: string): Promise<T> {
  if (envelope.format !== 'vagontakip-aes256gcm' || envelope.formatVersion !== 1) {
    throw new ApiError(503, 'INVALID_DATABASE', 'Veritabanı biçimi desteklenmiyor.');
  }
  const key = await encryptionKey(secret);
  try {
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(envelope.iv), additionalData: encoder.encode('vagontakip-database-v1') }, key, fromBase64(envelope.ciphertext));
    return JSON.parse(decoder.decode(plaintext)) as T;
  } catch {
    throw new ApiError(503, 'DATABASE_DECRYPTION_FAILED', 'Veritabanı doğrulanamadı. Şifreleme anahtarını kontrol edin.');
  }
}

export interface SessionClaims {
  userId: string;
  authVersion: number;
  expiresAt: number;
  nonce: string;
}

async function signingKey(secret: string): Promise<CryptoKey> {
  if (!secret || secret.length < 32) throw new ApiError(503, 'CONFIGURATION_REQUIRED', 'Oturum anahtarı yapılandırılmalı.');
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signSession(claims: SessionClaims, secret: string): Promise<string> {
  const payload = base64url(encoder.encode(JSON.stringify(claims)));
  const signature = await crypto.subtle.sign('HMAC', await signingKey(secret), encoder.encode(payload));
  return `${payload}.${base64url(new Uint8Array(signature))}`;
}

export async function verifySession(token: string, secret: string, now = Date.now()): Promise<SessionClaims | null> {
  if (token.length > 2048) return null;
  const pieces = token.split('.');
  if (pieces.length !== 2) return null;
  const key = await signingKey(secret);
  try {
    const valid = await crypto.subtle.verify('HMAC', key, decodeBase64url(pieces[1]), encoder.encode(pieces[0]));
    if (!valid) return null;
    const claims = JSON.parse(decoder.decode(decodeBase64url(pieces[0]))) as SessionClaims;
    if (typeof claims.userId !== 'string' || !Number.isInteger(claims.authVersion) || !Number.isFinite(claims.expiresAt) || claims.expiresAt <= now || typeof claims.nonce !== 'string') return null;
    return claims;
  } catch { return null; }
}
