import { test, expect } from '@playwright/test';

const API =
  process.env.E2E_API_URL ||
  process.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  'http://localhost:5001';

const PREFIX = 'm10e2e_';

function uniqueCreds() {
  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    email: `${PREFIX}${stamp}@example.com`,
    username: `${PREFIX}${stamp}`.slice(0, 50),
    password: 'test-password-ok',
  };
}

async function apiRegister(request, creds) {
  return request.post(`${API}/api/auth/register`, { data: creds });
}

test.describe.configure({ mode: 'serial' });

test.describe('Auth flow', () => {
  test('redirects unauthenticated users from dashboard to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dinkboard' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    expect(page.url()).toMatch(/\/login/);
  });

  test('shows error on bad credentials', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByLabel(/email/i).fill('nobody-m10@example.com');
    await page.getByLabel(/^password$/i).fill('wrong-password-xx');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('alert')).toContainText(/incorrect|failed|password/i);
    expect(page.url()).toMatch(/\/login/);
  });

  test('login success, logout, and guards re-engage', async ({ page, request }) => {
    const creds = uniqueCreds();
    const reg = await apiRegister(request, creds);
    const body = await reg.text();
    expect(reg.ok(), `register failed: ${reg.status()} ${body}`).toBeTruthy();

    await page.goto('/login');
    await page.getByLabel(/email/i).fill(creds.email);
    await page.getByLabel(/^password$/i).fill(creds.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 60_000 });
    await expect(page.getByRole('button', { name: 'Log out' }).first()).toBeVisible({
      timeout: 60_000,
    });

    await page.getByRole('button', { name: 'Log out' }).first().click();
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    await page.goto('/members');
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
  });
});
