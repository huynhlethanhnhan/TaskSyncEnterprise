import { chromium } from 'playwright-core';

const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();

// Intercept ALL image requests
p.on('request', req => {
  if (req.resourceType() === 'image' || req.url().includes('avatar') || req.url().includes('uploads')) {
    console.log('IMAGE_REQUEST:', req.url());
  }
});
p.on('response', res => {
  if (res.request().resourceType() === 'image' || res.url().includes('avatar') || res.url().includes('uploads')) {
    console.log('IMAGE_RESPONSE:', res.url(), res.status());
  }
});

await p.goto('http://127.0.0.1/login', { waitUntil: 'networkidle' });
await p.locator('input[type="email"]').fill('employee001@tasksync.example.com');
await p.locator('input[type="password"]').fill('TaskSync@2026');
await p.getByRole('button', { name: 'Sign In to Portal' }).click();
await p.waitForURL('**/dashboard', { timeout: 20000 });
await p.waitForTimeout(3000);

// Check the Navbar dropdown area specifically - last 2000 chars of header HTML
const headerHtml = await p.locator('header').first().innerHTML();
const last2k = headerHtml.substring(headerHtml.length - 2000);
console.log('=== Navbar end HTML ===');
console.log(last2k);

// Check if there's a Sidebar footer with user avatar
const sidebarHtml = await p.locator('aside').first().innerHTML();
const sidebarLast = sidebarHtml.substring(sidebarHtml.length - 1500);
console.log('\n=== Sidebar end HTML ===');
console.log(sidebarLast);

// Navigate to /profile
await p.goto('http://127.0.0.1/profile', { waitUntil: 'networkidle' });
await p.waitForTimeout(3000);

// Get profile main content HTML (limited)
const mainContent = await p.evaluate(() => {
  const main = document.querySelector('main') || document.querySelector('#main-content');
  return main ? main.innerHTML.substring(0, 3000) : 'NO MAIN FOUND';
});
console.log('\n=== Profile main content ===');
console.log(mainContent);

// Check for span elements that might contain initials (Avatar fallback)
const spans = await p.$$eval('span', els => 
  els.filter(e => e.textContent.length <= 3 && e.textContent.length >= 1 && e.closest('[class*="avatar"], [class*="rounded-full"]'))
    .map(e => ({ text: e.textContent, parent: e.parentElement?.className?.substring(0, 80) }))
);
console.log('\n=== Initials spans (Avatar fallback) ===');
console.log(JSON.stringify(spans, null, 2));

await b.close();
