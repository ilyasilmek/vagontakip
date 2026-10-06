import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, type APIRequestContext, type Page, type PlaywrightWorkerArgs } from '@playwright/test';
import type { CollectionName, DataResponse, OperationalRecord, SafeUser } from '../shared/types';

export const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8787';
export const uniqueName = (label: string): string => `e2e_${label}_${randomUUID().slice(0, 12).replaceAll('-', '')}`;
export const uniquePassword = (): string => `${randomUUID()}-A1!`;

export async function credentials(): Promise<{ username: string; password: string }> {
  try {
    const value = JSON.parse(await readFile('.local/test-credentials.json', 'utf8')) as { username?: string; password?: string };
    if (typeof value.username === 'string' && typeof value.password === 'string') return { username: value.username, password: value.password };
  } catch { /* Only a generic setup error is safe to print. */ }
  throw new Error('Local E2E credentials are missing. Run npm run setup:local before testing.');
}

export async function apiContext(playwright: PlaywrightWorkerArgs['playwright']): Promise<APIRequestContext> {
  return playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: new URL(baseURL).origin }, timeout: 30_000 });
}

export async function waitUntilReady(context: APIRequestContext): Promise<void> {
  await expect.poll(async () => {
    try { return (await context.get('/api/session')).status(); }
    catch { return 0; }
  }, { timeout: 60_000, intervals: [250, 500, 1000], message: 'Local Wrangler server must serve /api/session.' }).toBe(200);
}

export async function login(context: APIRequestContext, account: { username: string; password: string }): Promise<SafeUser> {
  const response = await context.post('/api/login', { data: account });
  expect(response.status(), 'Local account login status').toBe(200);
  return ((await response.json()) as { user: SafeUser }).user;
}

export async function loginThroughPage(page: Page, account: { username: string; password: string }): Promise<void> {
  await page.getByLabel('Kullanıcı adı', { exact: true }).fill(account.username);
  await page.getByLabel('Şifre', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Genel bakış', exact: true })).toBeVisible();
}

export async function data(context: APIRequestContext): Promise<DataResponse> {
  const response = await context.get('/api/data');
  expect(response.status(), 'Authenticated data status').toBe(200);
  return response.json() as Promise<DataResponse>;
}

export async function createUser(context: APIRequestContext, label: string): Promise<{ user: SafeUser; account: { username: string; password: string } }> {
  const account = { username: uniqueName(label), password: uniquePassword() };
  const response = await context.post('/api/admin/users', { data: { ...account, displayName: `E2E ${label}`, role: 'user' } });
  expect(response.status(), 'Temporary user creation status').toBe(201);
  const user = ((await response.json()) as { user: SafeUser }).user;
  expect(Object.keys(user)).not.toContain('password');
  expect(Object.keys(user)).not.toContain('authVersion');
  return { user, account };
}

export async function deleteCreatedRecords(context: APIRequestContext, created: { collection: CollectionName; id: string }[]): Promise<void> {
  if (!created.length) return;
  const current = await data(context);
  for (const entry of created) {
    const record = (current[entry.collection] as OperationalRecord[]).find(candidate => candidate.id === entry.id);
    if (!record) continue;
    const response = await context.delete(`/api/${entry.collection}/${encodeURIComponent(entry.id)}`, { data: { revision: record.revision } });
    expect(response.status(), 'Temporary record cleanup status').toBe(200);
  }
}

export async function deleteCreatedUser(context: APIRequestContext, id: string | undefined): Promise<void> {
  if (!id) return;
  const response = await context.delete(`/api/admin/users/${encodeURIComponent(id)}`, { data: {} });
  expect([200, 404]).toContain(response.status());
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const width = await page.evaluate(() => ({ viewport: window.innerWidth, content: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) }));
  expect(width.content, 'Mobile document width').toBeLessThanOrEqual(width.viewport + 1);
}
