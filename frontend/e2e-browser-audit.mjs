import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const phaseEvidenceDirectory = path.resolve(here, '../docs/evidence/phase-4');
const args = new Set(process.argv.slice(2));
const browserName = [...args].find((arg) => arg.startsWith('--browser='))?.split('=')[1] || 'chrome';
const responsive = args.has('--responsive');
const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1';
const username = process.env.E2E_USERNAME || 'admin@tasksync.example.com';
const password = process.env.E2E_PASSWORD || 'TaskSync@2026';

const browserDefinitions = {
  chrome: {
    type: chromium,
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  },
  edge: {
    type: chromium,
    executablePath: process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  },
  firefox: {
    type: firefox,
    executablePath: process.env.FIREFOX_PATH || firefox.executablePath(),
  },
};

const viewports = responsive
  ? [
      { width: 1920, height: 1080 },
      { width: 1584, height: 900 },
      { width: 1440, height: 900 },
      { width: 1366, height: 768 },
      { width: 1024, height: 768 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
      { width: 375, height: 667 },
    ]
  : [{ width: 1584, height: 900 }];

const pagePaths = responsive
  ? ['/dashboard', '/employees', '/tasks', '/vacations']
  : ['/dashboard', '/profile', '/employees', '/projects', '/tasks', '/departments', '/vacations', '/notifications'];

const definition = browserDefinitions[browserName];
const outputDirectory = path.join(phaseEvidenceDirectory, responsive ? 'responsive' : browserName);
assert.ok(definition, `Unsupported browser: ${browserName}`);
assert.ok(
  existsSync(definition.executablePath),
  `${browserName} executable is unavailable at ${definition.executablePath}. Set the matching *_PATH variable to a real browser executable.`,
);

await mkdir(outputDirectory, { recursive: true });
const browser = await definition.type.launch({ executablePath: definition.executablePath, headless: true });
const evidence = {
  browser: browserName,
  browserVersion: browser.version(),
  executablePath: definition.executablePath,
  baseUrl,
  generatedAt: new Date().toISOString(),
  results: [],
};

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const consoleErrors = [];
    const failedRequests = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('requestfailed', (request) => {
      failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText || 'unknown failure'}`);
    });

    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
    await page.locator('input[type="email"]').fill(username);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole('button', { name: 'Sign In to Portal' }).click();
    await page.waitForURL('**/dashboard', { timeout: 20_000 });
    if (!responsive) {
      await page.screenshot({ path: path.join(outputDirectory, 'login_admin.png'), fullPage: true });
    }

    for (const pagePath of pagePaths) {
      const consoleStart = consoleErrors.length;
      const failedStart = failedRequests.length;
      if (new URL(page.url()).pathname === pagePath) {
        await page.waitForLoadState('networkidle');
      } else {
        await page.goto(`${baseUrl}${pagePath}`, { waitUntil: 'networkidle' });
      }
      // React Query requests may begin just after the navigation load state.
      // Evidence must show settled business content, not a passing skeleton.
      await page.waitForTimeout(300);
      await page.waitForFunction(
        () => !document.querySelector('.animate-pulse'),
        undefined,
        { timeout: 20_000 },
      );
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts.ready);
      const metrics = await page.evaluate(() => {
        const style = (selector) => {
          const element = document.querySelector(selector);
          if (!element) return null;
          const computed = getComputedStyle(element);
          return {
            fontFamily: computed.fontFamily,
            fontSize: computed.fontSize,
            fontWeight: computed.fontWeight,
            lineHeight: computed.lineHeight,
          };
        };
        const horizontalOverflow = [...document.querySelectorAll('*')]
          .filter((element) => element.scrollWidth > element.clientWidth + 1)
          .slice(0, 20)
          .map((element) => ({
            tag: element.tagName.toLowerCase(),
            className: typeof element.className === 'string' ? element.className.slice(0, 160) : '',
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
          }));
        const nestedVerticalScrollers = [...document.querySelectorAll('main *')]
          .filter((element) => {
            const overflowY = getComputedStyle(element).overflowY;
            return ['auto', 'scroll'].includes(overflowY) && element.scrollHeight > element.clientHeight + 1;
          })
          .slice(0, 20)
          .map((element) => ({ tag: element.tagName.toLowerCase(), className: String(element.className).slice(0, 160) }));
        return {
          fonts: { body: style('body'), heading: style('h1'), main: style('main') },
          interLoaded: document.fonts.check('16px "Inter Variable"'),
          viewport: { width: innerWidth, height: innerHeight },
          body: { clientWidth: document.body.clientWidth, scrollWidth: document.body.scrollWidth, scrollHeight: document.body.scrollHeight },
          document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight },
          hasDocumentHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          horizontalOverflow,
          nestedVerticalScrollers,
          visibleLoadingSkeletons: document.querySelectorAll('.animate-pulse').length,
        };
      });
      const slug = pagePath.slice(1).replaceAll('/', '-') || 'root';
      const screenshot = path.join(outputDirectory, `${slug}_${viewport.width}x${viewport.height}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      const pageFailedRequests = failedRequests.slice(failedStart);
      const relevantFailedRequests = pageFailedRequests.filter((failure) => !failure.includes('net::ERR_ABORTED'));
      evidence.results.push({
        page: pagePath,
        viewport,
        screenshot: path.relative(path.resolve(here, '..'), screenshot).replaceAll('\\', '/'),
        consoleErrors: consoleErrors.slice(consoleStart),
        failedRequests: relevantFailedRequests,
        abortedByNavigation: pageFailedRequests.filter((failure) => failure.includes('net::ERR_ABORTED')),
        ...metrics,
        pass: metrics.interLoaded && metrics.visibleLoadingSkeletons === 0 && !metrics.hasDocumentHorizontalOverflow && consoleErrors.length === consoleStart && relevantFailedRequests.length === 0,
      });
    }
    await context.close();
  }
} finally {
  await browser.close();
}

const evidencePath = path.join(outputDirectory, responsive ? 'viewport_matrix.json' : 'layout_matrix.json');
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
assert.ok(evidence.results.every((result) => result.pass), `One or more ${browserName} evidence rows failed; inspect ${evidencePath}`);
console.log(JSON.stringify({ status: 'ok', evidencePath, browser: evidence.browser, browserVersion: evidence.browserVersion, rows: evidence.results.length }, null, 2));
