import { expect, test } from '@playwright/test';
import { nav, signInAs, testPhone } from './helpers';

test('staff sell a pair at the counter and the count goes down', async ({ page }) => {
  await signInAs(page, testPhone(), 'staff', 'sensok');
  await nav(page, '/admin/stock');
  const search = page.getByLabel('SKU or product name');
  await search.fill('predator');
  await search.press('Enter');
  const row = page.getByRole('listitem', { name: /^EU 41/ }).first();
  const onHand = Number((await row.locator('span.tabular').first().textContent())?.trim());
  await row.getByRole('button', { name: 'Sell EU 41' }).click();
  await page.getByRole('button', { name: 'Record sale of 1 item' }).click();
  await expect(page.getByText('Sale recorded')).toBeVisible();
  await expect(row.locator('span.tabular').first()).toHaveText(String(onHand - 1));
});

test('an admin price change shows in the shop', async ({ page, browser }) => {
  await signInAs(page, testPhone('011'), 'admin');
  await nav(page, '/admin/products');
  await page.getByLabel('Search products').fill('Predator 25 Elite');
  await page.getByRole('search').getByRole('button', { name: 'Search' }).click();
  await page.getByRole('link', { name: /Predator 25 Elite/ }).first().click();
  await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]{36}$/);
  const slug = (await page.getByRole('link', { name: 'View in shop' }).getAttribute('href'))!.replace('/p/', '');
  const row = page.getByRole('listitem', { name: /^EU 39 / });
  await row.getByLabel('Price EU 39').fill('199.00');
  await row.getByRole('button', { name: 'Save EU 39' }).click();
  await expect(page.getByText('Saved EU 39')).toBeVisible();

  const shopper = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await shopper.goto(`/p/${slug}`);
  await shopper.getByRole('radiogroup', { name: 'Size' }).getByRole('radio', { name: 'EU 39' }).check({ force: true });
  await expect(shopper.getByText('$199.00').first()).toBeVisible();
});
