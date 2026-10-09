import { test, expect } from '@playwright/test';
import { credentials, loginThroughPage } from './helpers';

test('back closes dialogs before navigating through pages, including after reload', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await loginThroughPage(page, await credentials());
  const navigation = page.getByRole('navigation', { name: 'Mobil gezinme' });
  await navigation.getByRole('button', { name: 'Vagonlar', exact: true }).click();
  await navigation.getByRole('button', { name: 'Parçalar', exact: true }).click();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Vagonlar', exact: true })).toBeVisible();
  await page.locator('.page-heading').getByRole('button', { name: 'Vagon ekle', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Yeni vagon ekle' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Vagonlar', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Genel bakış', exact: true })).toBeVisible();

  await navigation.getByRole('button', { name: 'Vagonlar', exact: true }).click();
  await page.locator('.page-heading').getByRole('button', { name: 'Vagon ekle', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Vazgeç', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => !!history.state?.vagonNavigation?.modal)).toBe(false);
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Genel bakış', exact: true })).toBeVisible();

  await navigation.getByRole('button', { name: 'Yönetim', exact: true }).click();
  await page.getByRole('button', { name: 'Kullanıcı', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Yeni kullanıcı' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Yönetim', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Genel bakış', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Hesabımı aç', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Hesabım', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Genel bakış', exact: true })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'Hesabım', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Çıkış yap', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Giriş yap', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Giriş yap', exact: true })).toBeVisible();
});

test('back keeps a saving form open and closes it once the request completes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await loginThroughPage(page, await credentials());
  await page.getByRole('navigation', { name: 'Mobil gezinme' }).getByRole('button', { name: 'Vagonlar', exact: true }).click();
  await page.locator('.page-heading').getByRole('button', { name: 'Vagon ekle', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Yeni vagon ekle' });
  await dialog.getByLabel('Vagon numarası', { exact: false }).fill('1234 5678 901-23');
  let release!: () => void;
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/wagons', async route => {
    if (route.request().method() !== 'POST') { await route.continue(); return; }
    await barrier;
    await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: 'Test request completed.' } }) });
  });
  try {
    await dialog.getByRole('button', { name: 'Kaydet', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'Kaydediliyor', exact: true })).toBeDisabled();
    await page.goBack();
    await expect(dialog).toBeVisible();
    await expect.poll(() => page.evaluate(() => !!history.state?.vagonNavigation?.modal)).toBe(true);
    release();
    await expect(dialog.getByRole('button', { name: 'Kaydet', exact: true })).toBeEnabled();
    await page.goBack();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Vagonlar', exact: true })).toBeVisible();
  } finally { release(); }
});
