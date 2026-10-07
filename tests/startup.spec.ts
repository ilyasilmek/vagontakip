import { test, expect } from '@playwright/test';
import { credentials, expectNoHorizontalOverflow, loginThroughPage } from './helpers';

test('startup animation can be disabled before first render and re-enabled from Account', async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page.getByRole('status', { name: 'Vagon Takip açılıyor' })).toBeVisible();
  await loginThroughPage(page, await credentials());
  await page.getByRole('button', { name: 'Hesabımı aç', exact: true }).click();
  const selector = page.getByLabel('Açılış animasyonu', { exact: true });
  await expect(selector).toHaveValue('on');
  await selector.selectOption('off');
  await expectNoHorizontalOverflow(page);

  // Observe the entire startup, so a brief animation flash also fails the test.
  await context.addInitScript(() => {
    const probe = window as Window & { startupWasShown?: boolean };
    probe.startupWasShown = false;
    new MutationObserver(mutations => {
      for (const mutation of mutations) for (const node of mutation.addedNodes) {
        if (node instanceof Element && (node.matches('.startup-overlay') || node.querySelector('.startup-overlay'))) probe.startupWasShown = true;
      }
    }).observe(document, { childList: true, subtree: true });
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Hesabım', exact: true })).toBeVisible();
  await expect(selector).toHaveValue('off');
  expect(await page.evaluate(() => (window as Window & { startupWasShown?: boolean }).startupWasShown)).toBe(false);

  const reopened = await context.newPage();
  await reopened.goto('/');
  await expect(reopened.getByRole('heading', { name: 'Genel bakış', exact: true })).toBeVisible();
  expect(await reopened.evaluate(() => (window as Window & { startupWasShown?: boolean }).startupWasShown)).toBe(false);
  await reopened.close();

  await context.setOffline(true);
  await expect(selector).toBeEnabled();
  await selector.selectOption('on');
  await expect(page.getByRole('heading', { name: 'Hesabım', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('status', { name: 'Vagon Takip açılıyor' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Hesabım', exact: true })).toBeVisible();
  await expect(selector).toHaveValue('on');
  await context.setOffline(false);
});
