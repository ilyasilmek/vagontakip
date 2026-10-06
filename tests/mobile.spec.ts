import ExcelJS from 'exceljs';
import { test, expect } from '@playwright/test';
import type { CollectionName, RecordResponse } from '../shared/types';
import { apiContext, createUser, credentials, data, deleteCreatedRecords, deleteCreatedUser, expectNoHorizontalOverflow, login, loginThroughPage, uniqueName, waitUntilReady } from './helpers';

test('phone login, all collections, accessible editing, Excel export and ordinary user access', async ({ page, playwright }) => {
  const admin = await apiContext(playwright);
  const created: { collection: CollectionName; id: string }[] = [];
  let temporaryUserId: string | undefined;
  const browserErrors: string[] = [];
  page.on('pageerror', error => browserErrors.push(error.name));
  try {
    await waitUntilReady(admin);
    const account = await credentials();
    await login(admin, account);
    const temporary = await createUser(admin, 'mobile');
    temporaryUserId = temporary.user.id;

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Giriş yap', exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await loginThroughPage(page, account);
    await expectNoHorizontalOverflow(page);
    const navigation = page.getByRole('navigation', { name: 'Mobil gezinme' });
    await expect(navigation.getByRole('button', { name: 'Yönetim', exact: true })).toBeVisible();
    for (const item of [{ button: 'Vagonlar', heading: 'Vagonlar' }, { button: 'Parçalar', heading: 'Parçalar' }, { button: 'Demirbaş', heading: 'Demirbaşlar' }]) {
      await navigation.getByRole('button', { name: item.button, exact: true }).click();
      await expect(page.getByRole('heading', { name: item.heading, exact: true })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }

    await navigation.getByRole('button', { name: 'Yönetim', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Yönetim', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Kullanıcılar', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Kullanıcı', exact: true }).click();
    const userEditor = page.getByRole('dialog', { name: 'Yeni kullanıcı' });
    await expect(userEditor.getByLabel('Ad soyad', { exact: true })).toBeVisible();
    await expect(userEditor.getByLabel('Kullanıcı adı', { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await userEditor.getByRole('button', { name: 'Vazgeç', exact: true }).click();

    await navigation.getByRole('button', { name: 'Vagonlar', exact: true }).click();
    await page.getByRole('button', { name: 'Vagon ekle', exact: true }).click();
    const wagonName = uniqueName('mobilewagon');
    const editor = page.getByRole('dialog', { name: 'Yeni vagon ekle' });
    await editor.getByLabel('Vagon numarası', { exact: false }).fill(wagonName);
    await expect(editor.getByLabel('Vagon tipi', { exact: true }).locator('option')).toHaveCount(21);
    await editor.getByLabel('Vagon tipi', { exact: true }).selectOption('Hbbills');
    await editor.getByLabel(/^Giriş tarihi/).fill('2026-10-06');
    await editor.getByLabel(/^Açıklama/).fill('Created on a phone.');
    await expectNoHorizontalOverflow(page);
    const [createResponse] = await Promise.all([
      page.waitForResponse(response => response.url().endsWith('/api/wagons') && response.request().method() === 'POST'),
      editor.getByRole('button', { name: 'Kaydet', exact: true }).click(),
    ]);
    expect(createResponse.status()).toBe(201);
    const record = ((await createResponse.json()) as RecordResponse).record;
    created.push({ collection: 'wagons', id: record.id });
    await expect(editor).not.toBeVisible();
    await page.getByRole('textbox', { name: 'Vagonlar içinde ara' }).fill(wagonName);
    const row = page.getByRole('button', { name: `Vagon ${wagonName} ayrıntıları`, exact: true });
    await expect(row).toBeVisible();
    await expect(row).toContainText('Hbbills');
    await expect(page.locator('.record-card')).toHaveCount(1);
    await row.click();
    const details = page.getByRole('dialog', { name: 'Vagon ayrıntıları' });
    await expect(details.getByRole('button', { name: 'Sil', exact: true })).toBeVisible();
    await details.getByRole('button', { name: 'Düzenle', exact: true }).click();
    await page.getByRole('dialog').getByLabel(/^Açıklama/).fill('Administrator edited on a phone.');
    await page.getByRole('dialog').getByRole('button', { name: 'Kaydet', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    expect((await data(admin)).wagons.find(wagon => wagon.id === record.id)?.notes).toBe('Administrator edited on a phone.');

    await navigation.getByRole('button', { name: 'Özet', exact: true }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Genel Excel raporunu indir' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
    const downloadedPath = await download.path();
    if (!downloadedPath) throw new Error('Excel report download produced no file.');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(downloadedPath);
    expect(workbook.worksheets.map(sheet => sheet.name)).toEqual(['Vagonlar', 'Parçalar', 'Demirbaşlar']);
    expect(workbook.getWorksheet('Vagonlar')?.getCell('A1').value).toBe('Vagon numarası');
    expect(workbook.getWorksheet('Vagonlar')?.getCell('B1').value).toBe('Vagon tipi');
    expect(workbook.getWorksheet('Vagonlar')?.rowCount).toBeGreaterThan(1);

    await page.getByRole('button', { name: 'Hesabımı aç', exact: true }).click();
    await page.getByRole('button', { name: 'Çıkış yap', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Giriş yap', exact: true })).toBeVisible();
    await loginThroughPage(page, temporary.account);
    await expect(navigation.getByRole('button', { name: 'Yönetim', exact: true })).toHaveCount(0);
    await expect(navigation.getByRole('button', { name: 'Hesabım', exact: true })).toBeVisible();
    await navigation.getByRole('button', { name: 'Vagonlar', exact: true }).click();
    await page.getByRole('textbox', { name: 'Vagonlar içinde ara' }).fill(wagonName);
    await row.click();
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Sil', exact: true })).toHaveCount(0);
    await page.getByRole('dialog').getByRole('button', { name: 'Düzenle', exact: true }).click();
    await page.getByRole('dialog').getByLabel(/^Açıklama/).fill('Ordinary user edited on another phone.');
    await page.getByRole('dialog').getByRole('button', { name: 'Kaydet', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    expect((await data(admin)).wagons.find(wagon => wagon.id === record.id)?.notes).toBe('Ordinary user edited on another phone.');
    await expectNoHorizontalOverflow(page);
    await navigation.getByRole('button', { name: 'Hesabım', exact: true }).click();
    await page.getByRole('button', { name: 'Çıkış yap', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Giriş yap', exact: true })).toBeVisible();
    const clearedSnapshot = await page.evaluate(async () => new Promise<boolean>(resolve => {
      const request = indexedDB.open('vagon-takip-offline', 1);
      request.onerror = () => resolve(false);
      request.onsuccess = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('snapshots')) { database.close(); resolve(true); return; }
        const read = database.transaction('snapshots', 'readonly').objectStore('snapshots').get('latest');
        read.onerror = () => { database.close(); resolve(false); };
        read.onsuccess = () => { database.close(); resolve(read.result === undefined); };
      };
    }));
    expect(clearedSnapshot, 'Logging out removes the offline operational snapshot.').toBe(true);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Giriş yap', exact: true })).toBeVisible();
    expect(browserErrors, 'Uncaught browser errors').toEqual([]);
  } finally {
    try { await deleteCreatedRecords(admin, created); }
    finally {
      try { await deleteCreatedUser(admin, temporaryUserId); }
      finally { await admin.dispose(); }
    }
  }
});
