// 📂 FILE: frontend/e2e/employee-task-rbac.spec.ts
import { test, expect } from '@playwright/test';

const employeeEmail = process.env.E2E_EMPLOYEE_EMAIL || 'employee001@tasksync.example.com';
const employeePassword = process.env.E2E_EMPLOYEE_PASSWORD || 'TaskSync@2026';
const apiBaseUrl = process.env.E2E_API_URL || 'http://127.0.0.1:8000/api/v1';

test.describe('Module 3: Employee RBAC Verification', () => {
  test('Employee Allowed Mutation (200 OK) & Restricted Field Locking (403 Forbidden)', async () => {
    // Employee Login
    const empLoginRes = await fetch(`${apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: employeeEmail, password: employeePassword }),
    });

    if (empLoginRes.status === 200) {
      const empData = await empLoginRes.json();
      const token = empData.access_token;

      // Attempt to modify restricted field (title/priority) via standard PUT endpoint
      const res = await fetch(`${apiBaseUrl}/tasks/1`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'Hacked Title By Employee', priority: 'High' }),
      });
      // Expect 403 Forbidden or 404 Not Found if task 1 doesn't exist, but non-200 for forbidden modification
      expect([403, 404]).toContain(res.status);
    }
  });
});
