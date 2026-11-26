import { expect, type APIRequestContext, type Page } from '@playwright/test';
import pg from 'pg';

const DB = process.env.E2E_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/sport_e2e';
export const API = `http://localhost:${process.env.E2E_API_PORT ?? '3100'}`;

export async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const c = new pg.Client({ connectionString: DB });
  await c.connect();
  try {
    return (await c.query(text, params)).rows as T[];
  } finally {
    await c.end();
  }
}

/** Signs in through the real page with the test code (e2e builds only). Ends on the page sign-in returns to. */
export async function signIn(page: Page, phone: string, from?: string): Promise<void> {
  if (from) await page.goto(from);
  await page.getByRole('link', { name: 'Sign in' }).first().click();
  await page.getByLabel('Phone number').fill(phone);
  await page.getByRole('button', { name: 'Send code' }).click();
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/sign-in/);
}

/** "012 111 222" → "+85512111222" */
export const e164 = (phone: string) => `+855${phone.replace(/\D/g, '').replace(/^0/, '')}`;

/** Gives an existing user a staff/admin role (the user must have signed in once). */
export async function makeRole(phone: string, role: 'staff' | 'admin', branch: string | null = null): Promise<void> {
  const rows = await sql(`update users set role = $1, staff_branch_id = $2 where phone_e164 = $3 returning id`, [role, branch, e164(phone)]);
  expect(rows.length).toBe(1);
}

export async function approvePayment(request: APIRequestContext, tranId: string): Promise<void> {
  const res = await request.post(`${API}/v1/dev/payments/${tranId}/approve`);
  expect(res.ok()).toBeTruthy();
}

/** The latest payment attempt's provider id (read from the e2e database, like PayWay's callback would know it). */
export async function latestTranId(number: string): Promise<string> {
  const rows = await sql<{ tran: string }>(
    `select p.provider_tran_id as tran from payments p join orders o on o.id = p.order_id where o.number = $1 order by p.attempt desc limit 1`,
    [number],
  );
  expect(rows[0]?.tran).toBeTruthy();
  return rows[0]!.tran;
}

/** A unique Cambodian test phone per run so reruns don't hit per-phone limits. */
export const testPhone = (prefix = '012') => `${prefix} ${String(Math.floor(100 + Math.random() * 900))} ${String(Math.floor(100 + Math.random() * 900))}`;

/** In-app navigation (a full page load would forget the in-memory test sign-in). */
export async function nav(page: Page, path: string): Promise<void> {
  await page.evaluate((to) => {
    window.history.pushState({}, '', to);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await page.waitForURL(`**${path.split('?')[0]}*`);
}

/** Signs in, gives the account a role, and signs in again so the new role is in the session. */
export async function signInAs(page: Page, phone: string, role: 'staff' | 'admin', branch: string | null = null): Promise<void> {
  await page.goto('/sign-in');
  await page.getByLabel('Phone number').fill(phone);
  await page.getByRole('button', { name: 'Send code' }).click();
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/account$/);
  await makeRole(phone, role, branch);
  await page.goto('/sign-in'); // a reload ends the in-memory test sign-in
  await page.getByLabel('Phone number').fill(phone);
  await page.getByRole('button', { name: 'Send code' }).click();
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/account$/);
}
