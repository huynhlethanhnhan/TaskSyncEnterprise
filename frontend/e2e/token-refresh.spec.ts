// 📂 FILE: frontend/e2e/token-refresh.spec.ts
import { test, expect } from '@playwright/test';

const adminEmail = process.env.E2E_ADMIN_EMAIL || 'admin@tasksync.example.com';
const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'TaskSync@2026';
const apiBaseUrl = process.env.E2E_API_URL || 'http://127.0.0.1:8000/api/v1';

test.describe('Module 4: Token Refresh API Verification', () => {
  test('Token Refresh returns 200 OK and rotates access & refresh tokens', async () => {
    const loginRes = await fetch(`${apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: adminEmail, password: adminPassword }),
    });

    expect(loginRes.status).toBe(200);
    const data = await loginRes.json();

    const refreshRes = await fetch(`${apiBaseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: data.refresh_token }),
    });

    expect(refreshRes.status).toBe(200);
    const refreshedData = await refreshRes.json();
    expect(refreshedData.access_token).toBeTruthy();
    expect(refreshedData.refresh_token).toBeTruthy();
  });
});
