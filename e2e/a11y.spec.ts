import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { nav, signInAs, testPhone } from './helpers';

/** Runs axe (WCAG 2 A and AA) on the page as it is now; serious and critical violations fail the test. */
async function audit(page: Page, name: string): Promise<string[]> {
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${name}: ${v.id} (${v.impact}) ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`);
}

test('shop pages have no serious accessibility problems', async ({ page }) => {
  const found: string[] = [];
  await page.goto('/');
  found.push(...(await audit(page, 'home')));

  await page.goto('/c/boots');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  found.push(...(await audit(page, 'listing')));

  await page.locator('main article a').first().click();
  await expect(page).toHaveURL(/\/p\//);
  found.push(...(await audit(page, 'product')));

  await page.getByRole('radiogroup', { name: 'Size' }).locator('input:not([disabled])').first().check({ force: true });
  await page.getByRole('button', { name: 'Add to bag' }).last().click();
  await expect(page.getByText('Added to bag')).toBeVisible();
  await page.goto('/bag');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  found.push(...(await audit(page, 'bag')));

  await page.goto('/checkout');
  await expect(page.getByRole('heading', { level: 1, name: 'Checkout' })).toBeVisible();
  found.push(...(await audit(page, 'checkout')));

  await page.goto('/sign-in');
  await expect(page.getByLabel('Phone number')).toBeVisible();
  found.push(...(await audit(page, 'sign-in')));

  expect(found).toEqual([]);
});

test('account and admin pages have no serious accessibility problems', async ({ page }) => {
  const found: string[] = [];
  await signInAs(page, testPhone('011'), 'admin');
  found.push(...(await audit(page, 'account')));

  await nav(page, '/admin');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  found.push(...(await audit(page, 'admin overview')));

  expect(found).toEqual([]);
});
