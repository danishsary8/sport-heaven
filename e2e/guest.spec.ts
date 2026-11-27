import { expect, test } from '@playwright/test';
import { approvePayment, latestTranId, testPhone } from './helpers';

test('a guest finds boots, pays with KHQR and tracks the order', async ({ page, request }) => {
  const phone = testPhone();
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('dialog', { name: 'Menu' }).getByRole('link', { name: 'Football Boots' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Football Boots' })).toBeVisible();

  // Filter by a brand on the phone sheet; the URL keeps it.
  await page.getByRole('button', { name: 'Filter' }).click();
  const sheet = page.getByRole('dialog', { name: 'Filters' });
  // Filters apply through the URL, so the box ticks after the navigation: click, then assert.
  await sheet.getByRole('checkbox', { name: /Adidas/ }).click();
  await expect(page).toHaveURL(/brand=adidas/);
  await expect(sheet.getByRole('checkbox', { name: /Adidas/ })).toBeChecked();
  await sheet.getByRole('button', { name: /^Show \d+ items$/ }).click();

  await page.locator('main article a').first().click();
  await expect(page).toHaveURL(/\/p\//);
  const sizes = page.getByRole('radiogroup', { name: 'Size' });
  await sizes.locator('input:not([disabled])').first().check({ force: true });
  await page.getByRole('button', { name: 'Add to bag' }).last().click();
  await expect(page.getByText('Added to bag')).toBeVisible();

  await page.getByRole('link', { name: /^Bag, 1 items$/ }).click();
  await page.getByRole('dialog', { name: 'Your bag' }).getByRole('link', { name: 'Check out' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Checkout' })).toBeVisible();

  await page.getByLabel('Full name').fill('E2E Guest');
  await page.getByLabel('Phone number').fill(phone);
  await page.getByLabel('Province or city').selectOption({ label: 'Phnom Penh' });
  const district = page.getByLabel('District');
  await expect(district.locator('option')).not.toHaveCount(1);
  await district.selectOption({ index: 1 });
  const commune = page.getByLabel('Commune');
  await expect(commune.locator('option')).not.toHaveCount(1);
  await commune.selectOption({ index: 1 });
  await page.getByLabel('Street, house and floor').fill('St 51, house 12');
  await page.getByRole('radio', { name: /Phnom Penh rider/ }).check();
  await page.getByRole('radio', { name: /^KHQR/ }).check();
  await page.getByRole('checkbox', { name: /I agree to the terms/ }).check();
  await page.getByRole('button', { name: 'Place order' }).click();

  await expect(page).toHaveURL(/\/pay\/SC-/);
  const number = page.url().split('/pay/')[1]!;
  await expect(page.getByRole('img', { name: `KHQR code for order ${number}` })).toBeVisible();

  await approvePayment(request, await latestTranId(number));
  await expect(page).toHaveURL(new RegExp(`/order/${number}$`), { timeout: 15_000 });
  await expect(page.getByText('Thank you. Your order is confirmed.')).toBeVisible();

  await page.goto('/track');
  await page.getByLabel('Order number').fill(number);
  await page.getByLabel('Phone number used for the order').fill(phone);
  await page.getByRole('button', { name: 'Find order' }).click();
  await expect(page.getByText('Confirmed').first()).toBeVisible();
});
