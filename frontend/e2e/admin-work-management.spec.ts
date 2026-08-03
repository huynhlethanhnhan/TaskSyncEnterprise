// 📂 FILE: frontend/e2e/admin-work-management.spec.ts
import { test, expect } from '@playwright/test';

const adminEmail = process.env.E2E_ADMIN_EMAIL || 'admin@tasksync.example.com';
const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'TaskSync@2026';
const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:5173';
const apiBaseUrl = process.env.E2E_API_URL || 'http://127.0.0.1:8000/api/v1';

test.describe('Module 2: Admin Work Management & Task Creation', () => {
  test('Minimal Task Creation (201 Created) and Non-member 409 Protection', async ({ page }) => {
    // Login
    await page.goto(`${baseUrl}/login`);
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'));

    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(token).toBeTruthy();

    // Fetch active project
    const projectsRes = await fetch(`${apiBaseUrl}/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const projectsData = await projectsRes.json();
    const projects = Array.isArray(projectsData) ? projectsData : projectsData.data || [];
    expect(projects.length).toBeGreaterThan(0);
    const targetProject = projects[0];

    // Minimal Task POST -> 201 Created
    const timestamp = Date.now();
    const minTaskRes = await fetch(`${apiBaseUrl}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `E2E Minimal Task ${timestamp}`,
        status: 'To Do',
        priority: 'Medium',
        project_id: targetProject.id,
        assigned_to: null,
        sprint_id: null,
        topic_id: null,
        deadline: null,
        story_points: null,
      }),
    });
    expect(minTaskRes.status).toBe(201);
    const createdTask = await minTaskRes.json();
    expect(createdTask.id).toBeTruthy();
    expect(createdTask.story_points).toBeNull();
    expect(createdTask.assigned_to).toBeNull();

    // Non-member Assignee Protection -> 409 Conflict
    const nonMemberRes = await fetch(`${apiBaseUrl}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `E2E Non Member Task ${timestamp}`,
        status: 'To Do',
        priority: 'Low',
        project_id: targetProject.id,
        assigned_to: 999999,
      }),
    });
    expect(nonMemberRes.status).toBe(409);
  });
});
