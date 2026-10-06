import { test, expect } from '@playwright/test';
import type { CollectionName, RecordResponse } from '../shared/types';
import { apiContext, credentials, deleteCreatedRecords, expectNoHorizontalOverflow, login, uniqueName, waitUntilReady } from './helpers';

test('installable manifest, static-only service worker cache and offline read-only records', async ({ page, context, playwright }) => {
  const admin = await apiContext(playwright);
  const created: { collection: CollectionName; id: string }[] = [];
  try {
    await waitUntilReady(admin);
    await login(admin, await credentials());
    await context.addCookies((await admin.storageState()).cookies);
    const name = uniqueName('offlinewagon');
    const response = await admin.post('/api/wagons', { data: { number: name, entryDate: '2026-10-06', channelDate: '', completedDate: '', status: 'Bekliyor', notes: 'Available in the read-only offline snapshot.' } });
    expect(response.status()).toBe(201);
    const record = ((await response.json()) as RecordResponse).record;
    created.push({ collection: 'wagons', id: record.id });

    const manifestResponse = await admin.get('/manifest.webmanifest');
    expect(manifestResponse.status()).toBe(200);
    const manifest = await manifestResponse.json() as { name: string; display: string; start_url: string; scope: string; icons: { src: string; sizes: string; purpose: string }[] };
    expect(manifest.name).toBe('Vagon Takip');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.icons.map(icon => icon.sizes)).toContain('192x192');
    expect(manifest.icons.map(icon => icon.sizes)).toContain('512x512');
    expect(manifest.icons.some(icon => icon.purpose.includes('maskable'))).toBe(true);
    for (const icon of manifest.icons) {
      const iconResponse = await admin.get(icon.src);
      expect(iconResponse.status()).toBe(200);
      expect(iconResponse.headers()['content-type']).toContain('image/png');
      const bytes = await iconResponse.body();
      expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      const [width, height] = icon.sizes.split('x').map(Number);
      expect(bytes.readUInt32BE(16)).toBe(width);
      expect(bytes.readUInt32BE(20)).toBe(height);
    }

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Genel bakış', exact: true })).toBeVisible();
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 30_000, message: 'Built PWA service worker must control the page.' }).toBe(true);
    const navigation = page.getByRole('navigation', { name: 'Mobil gezinme' });
    await navigation.getByRole('button', { name: 'Vagonlar', exact: true }).click();
    await page.getByRole('textbox', { name: 'Vagonlar içinde ara' }).fill(name);
    await expect(page.getByRole('button', { name: `Vagon ${name} ayrıntıları`, exact: true })).toBeVisible();

    // Only a per-browser operational snapshot is kept in IndexedDB. Passwords,
    // sessions and the administrator user list must not be present there.
    await expect.poll(() => page.evaluate(async id => new Promise<boolean>(resolve => {
      const request = indexedDB.open('vagon-takip-offline', 1);
      request.onerror = () => resolve(false);
      request.onsuccess = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('snapshots')) { database.close(); resolve(false); return; }
        const read = database.transaction('snapshots', 'readonly').objectStore('snapshots').get('latest');
        read.onerror = () => { database.close(); resolve(false); };
        read.onsuccess = () => {
          const cached = read.result;
          const safe = cached && !('users' in cached) && !('audit' in cached) && !('password' in cached.user) && !('authVersion' in cached.user) && !('token' in cached) && cached.wagons.some((wagon: { id: string }) => wagon.id === id);
          database.close(); resolve(Boolean(safe));
        };
      };
    }), record.id), { message: 'Operational snapshot must be present without credentials.' }).toBe(true);
    const cachedPaths = await page.evaluate(async () => {
      const keys = await caches.keys();
      const requests = await Promise.all(keys.map(async key => (await (await caches.open(key)).keys()).map(request => new URL(request.url).pathname)));
      return requests.flat();
    });
    expect(cachedPaths.some(path => path === '/' || path === '/index.html'), 'Application HTML shell must be cached.').toBe(true);
    expect(cachedPaths.some(path => path.startsWith('/api/'))).toBe(false);
    expect(cachedPaths.some(path => /\.env|test-credentials|database\.enc/.test(path))).toBe(false);

    await context.setOffline(true);
    await expect(page.getByText('Son alınan kayıtları görüntülüyorsunuz.', { exact: false })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Genel bakış', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Vagon ekle', exact: true })).toBeDisabled();
    await navigation.getByRole('button', { name: 'Vagonlar', exact: true }).click();
    await page.getByRole('textbox', { name: 'Vagonlar içinde ara' }).fill(name);
    await expect(page.getByRole('button', { name: 'Vagon ekle', exact: true })).toBeDisabled();
    const row = page.getByRole('button', { name: `Vagon ${name} ayrıntıları`, exact: true });
    await expect(row).toBeVisible();
    await row.click();
    const dialog = page.getByRole('dialog', { name: 'Vagon ayrıntıları' });
    await expect(dialog.getByRole('button', { name: 'Düzenle', exact: true })).toBeDisabled();
    await expect(dialog.getByRole('button', { name: 'Sil', exact: true })).toBeDisabled();
    await expectNoHorizontalOverflow(page);
    await dialog.getByRole('button', { name: 'Kapat', exact: true }).click();
    await context.setOffline(false);
    await expect(page.getByRole('button', { name: 'Vagon ekle', exact: true })).toBeEnabled();
  } finally {
    await context.setOffline(false);
    try { await deleteCreatedRecords(admin, created); }
    finally { await admin.dispose(); }
  }
});
