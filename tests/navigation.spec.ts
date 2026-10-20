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
  await expect(page.getByRole('heading', { name: 'Genel bakış', exact: true })).toBeVisible();
  await expect(page.locator('#wagon-collection-section').getByRole('heading', { name: 'Vagonlar', exact: true })).toBeVisible();
  await page.locator('.page-heading').getByRole('button', { name: 'Vagon ekle', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Yeni vagon ekle' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Genel bakış', exact: true })).toBeVisible();

  await navigation.getByRole('button', { name: 'Vagonlar', exact: true }).click();
  await page.locator('.page-heading').getByRole('button', { name: 'Vagon ekle', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Vazgeç', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => !!history.state?.vagonNavigation?.modal)).toBe(false);
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
  await dialog.getByLabel('Vagon numarası', { exact: false }).fill('1234 5678 901-2');
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
    await expect(page.getByRole('heading', { name: 'Genel bakış', exact: true })).toBeVisible();
  } finally { release(); }
});


test('desktop sidebar hides maintenance operations and keeps primary navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await loginThroughPage(page, await credentials());

  const sidebar = page.getByRole('navigation', { name: 'Ana gezinme' });
  await expect(sidebar.getByRole('button', { name: 'Bakım operasyonları', exact: true })).toHaveCount(0);
  for (const label of ['Genel bakış', 'Vagonlar', 'Parçalar', 'Demirbaşlar', 'Yönetim', 'Hesabım']) {
    await expect(sidebar.getByRole('button', { name: label, exact: true })).toBeVisible();
  }
});

test('mobile navigation hides maintenance operations and keeps primary navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await loginThroughPage(page, await credentials());

  const mobileNavigation = page.getByRole('navigation', { name: 'Mobil gezinme' });
  await expect(mobileNavigation.getByRole('button', { name: 'Bakım', exact: true })).toHaveCount(0);
  for (const label of ['Anasayfa', 'Vagonlar', 'Parçalar', 'Demirbaş', 'Yönetim']) {
    await expect(mobileNavigation.getByRole('button', { name: label, exact: true })).toBeVisible();
  }
  const homeButton = mobileNavigation.getByRole('button', { name: 'Anasayfa', exact: true });
  const wagonsButton = mobileNavigation.getByRole('button', { name: 'Vagonlar', exact: true });
  await expect(homeButton).toHaveClass(/active/);
  await expect(wagonsButton).not.toHaveClass(/active/);
  await expect(page.locator('main .page-heading').first().getByRole('button', { name: 'Vagon ekle', exact: true })).toHaveCount(0);
  await wagonsButton.click();
  await expect(page.getByRole('heading', { name: 'Genel bakış', exact: true })).toBeVisible();
  const wagonSection = page.locator('#wagon-collection-section');
  await expect(wagonSection.getByRole('heading', { name: 'Vagonlar', exact: true })).toBeVisible();
  await expect.poll(() => wagonSection.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  })).toBeTruthy();
  await expect(wagonsButton).toHaveClass(/active/);
  await homeButton.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(homeButton).toHaveClass(/active/);
  await expect(wagonsButton).not.toHaveClass(/active/);
  await page.evaluate(() => document.getElementById('wagon-collection-section')?.scrollIntoView({ behavior: 'instant', block: 'start' }));
  await expect.poll(() => wagonsButton.evaluate(element => element.classList.contains('active'))).toBe(true);
  await homeButton.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});


test('dashboard reuses the full wagon collection and sidebar navigation scrolls to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await loginThroughPage(page, await credentials());

  await expect(page.getByRole('heading', { name: 'Genel bakış', exact: true })).toBeVisible();
  const wagonSection = page.locator('#wagon-collection-section');
  await expect(wagonSection.getByRole('heading', { name: 'Vagonlar', exact: true })).toBeVisible();
  await expect(wagonSection.getByRole('textbox', { name: 'Vagonlar içinde ara' })).toBeVisible();
  await expect(wagonSection.getByRole('button', { name: 'Görünen kayıtları Excel uyumlu CSV olarak indir' })).toBeVisible();
  const statusGroup = wagonSection.getByRole('group', { name: 'Durum filtresi' });
  await expect(statusGroup.getByRole('button', { name: /Tümü/ })).toBeVisible();
  await statusGroup.getByRole('button', { name: /Bakım devam ediyor/ }).click();
  const visibleStatuses = await wagonSection.locator('.record-card .badge').allTextContents();
  expect(visibleStatuses.every(status => status.trim() === 'Bakım devam ediyor')).toBeTruthy();
  await statusGroup.getByRole('button', { name: /Tümü/ }).click();

  await page.getByRole('button', { name: /Tamamlanan:.*Tamamlanan vagonları göster/ }).click();
  await expect(statusGroup.getByRole('button', { name: /Tamamlandı/ })).toHaveAttribute('aria-pressed', 'true');
  const completedStatuses = await wagonSection.locator('.record-card .badge').allTextContents();
  expect(completedStatuses.every(status => status.trim() === 'Tamamlandı')).toBeTruthy();

  await page.getByRole('button', { name: /Toplam vagon:.*Tüm vagonları göster/ }).click();
  await expect(statusGroup.getByRole('button', { name: /Tümü/ })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: /Atölyedeki vagon:.*Bakım devam eden vagonları göster/ }).click();
  const activeStatuses = await wagonSection.locator('.record-card .badge').allTextContents();
  expect(activeStatuses.every(status => status.trim() === 'Bakım devam ediyor')).toBeTruthy();

  await page.getByRole('button', { name: /Bekleyen vagon:.*Bekleyen vagonları göster/ }).click();
  await expect(statusGroup.getByRole('button', { name: /^Bekliyor/ })).toHaveAttribute('aria-pressed', 'true');
  const waitingStatuses = await wagonSection.locator('.record-card .badge').allTextContents();
  expect(waitingStatuses.every(status => status.trim() === 'Bekliyor')).toBeTruthy();

  await page.getByRole('button', { name: /Toplam vagon:.*Tüm vagonları göster/ }).click();

  const sidebar = page.getByRole('navigation', { name: 'Ana gezinme' });
  await sidebar.getByRole('button', { name: 'Vagonlar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Genel bakış', exact: true })).toBeVisible();
  await expect.poll(() => page.locator('#wagon-collection-section').evaluate(element => {
    const rect = element.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  })).toBeTruthy();

  await sidebar.getByRole('button', { name: 'Parçalar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Parçalar', exact: true })).toBeVisible();
  await sidebar.getByRole('button', { name: 'Vagonlar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Genel bakış', exact: true })).toBeVisible();
  await expect.poll(() => page.locator('#wagon-collection-section').evaluate(element => {
    const rect = element.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  })).toBeTruthy();
});
