import { expect, test } from '@playwright/test';
import { approvePayment, latestTranId, nav, signInAs, testPhone } from './helpers';

test('a member gets their guest bag, orders to a saved address and returns an item', async ({ page, browser, request }) => {
  const phone = testPhone();

  // As a guest, put something in the bag.
  await page.goto('/c/boots');
  await page.locator('main article a').first().click();
  await page.getByRole('radiogroup', { name: 'Size' }).locator('input:not([disabled])').first().check({ force: true });
  await page.getByRole('button', { name: 'Add to bag' }).last().click();
  await expect(page.getByText('Added to bag')).toBeVisible();

  // Sign in: the guest bag is merged.
  await page.getByRole('banner').getByRole('link', { name: 'Sign in' }).click();
  await page.getByLabel('Phone number').fill(phone);
  await page.getByRole('button', { name: 'Send code' }).click();
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('We added 1 item from your earlier bag.')).toBeVisible();

  // Save an address.
  await nav(page, '/account/addresses');
  await page.getByRole('button', { name: 'Add an address' }).click();
  const form = page.getByRole('dialog', { name: 'New address' });
  await form.getByLabel('Name for this address').fill('Home');
  await form.getByLabel('Recipient name').fill('E2E Member');
  await form.getByLabel('Recipient phone').fill(phone);
  await form.getByLabel('Province or city').selectOption({ label: 'Phnom Penh' });
  await expect(form.getByLabel('District').locator('option')).not.toHaveCount(1);
  await form.getByLabel('District').selectOption({ index: 1 });
  await expect(form.getByLabel('Commune').locator('option')).not.toHaveCount(1);
  await form.getByLabel('Commune').selectOption({ index: 1 });
  await form.getByLabel('Street, house and floor').fill('St 63, house 8');
  await form.getByRole('button', { name: 'Save address' }).click();
  await expect(page.getByText('St 63, house 8')).toBeVisible();

  // Check out with the saved address.
  await nav(page, '/checkout');
  await expect(page.getByRole('radio', { name: /St 63, house 8/ })).toBeChecked();
  await page.getByLabel('Full name').fill('E2E Member');
  await page.getByRole('radio', { name: /Phnom Penh rider/ }).check();
  await page.getByRole('radio', { name: /ABA KHQR/ }).check();
  await page.getByRole('checkbox', { name: /I agree to the terms/ }).check();
  await page.getByRole('button', { name: 'Place order' }).click();
  await expect(page).toHaveURL(/\/pay\/SC-/);
  const number = page.url().split('/pay/')[1]!;
  await approvePayment(request, await latestTranId(number));
  await expect(page.getByText('Thank you. Your order is confirmed.')).toBeVisible({ timeout: 15_000 });

  // An admin sends it out and marks it delivered.
  const adminContext = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const admin = await adminContext.newPage();
  await signInAs(admin, testPhone('011'), 'admin');
  await nav(admin, `/admin/orders/${number}`);
  await admin.getByRole('button', { name: 'Mark out for delivery' }).click();
  await admin.getByRole('button', { name: 'Mark delivered' }).click();
  await expect(admin.getByText('Delivered').first()).toBeVisible();

  // The member starts a return.
  await nav(page, `/account/orders/${number}`);
  await page.getByRole('link', { name: 'Start a return' }).click();
  await page.locator('input[type=checkbox]').first().check();
  await page.getByLabel('Why are you returning it?').selectOption('Too small');
  await page.getByRole('radio', { name: /Refund/ }).check();
  await page.getByRole('button', { name: 'Send return request' }).click();
  await expect(page.getByText(/We got your return request/)).toBeVisible();
  await expect(page.getByText('Waiting for review').first()).toBeVisible();

  // The admin sees it waiting.
  await nav(admin, '/admin/returns?status=requested');
  await expect(admin.getByRole('article', { name: new RegExp(`Return RMA`) }).first()).toBeVisible();
  await adminContext.close();
});
