// 📂 FILE: frontend/e2e/auth-login.spec.ts
import { test, expect } from '@playwright/test';

const adminEmail = process.env.E2E_ADMIN_EMAIL || 'admin@tasksync.example.com';
const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'TaskSync@2026';
const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:5173';

test.describe('Module 1: Authentication & Token Verification', () => {
  test('Admin Login & Protected API Authorization Header Verification', async ({ page }) => {
    let hasAuthHeader = false;

    page.on('request', (req) => {
      if (req.url().includes('/api/v1/projects') || req.url().includes('/api/v1/tasks')) {
        const headers = req.headers();
        if (headers.authorization && headers.authorization.startsWith('Bearer ')) {
          hasAuthHeader = true;
        }
      }
    });

    await page.goto(`${baseUrl}/login`);
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => !url.pathname.includes('/login'));
    expect(page.url()).not.toContain('/login');

    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(token).toBeTruthy();
    expect(hasAuthHeader).toBeTruthy();
  });
});
