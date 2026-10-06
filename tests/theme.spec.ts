import { test, expect } from '@playwright/test';
import { credentials, expectNoHorizontalOverflow, loginThroughPage } from './helpers';

test('theme selection follows system changes and survives reloads', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await loginThroughPage(page, await credentials());
  await page.getByRole('button', { name: 'Hesabımı aç', exact: true }).click();
  const selector = page.getByLabel('Tema', { exact: true });
  await expect(selector.locator('option')).toHaveText(['Sistem', 'Açık', 'Koyu']);
  await selector.selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await selector.selectOption('dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Hesabımı aç', exact: true }).click();
  await expect(selector).toHaveValue('dark');
  await selector.selectOption('system');
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expectNoHorizontalOverflow(page);
});
