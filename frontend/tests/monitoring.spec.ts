import { test, expect, type Page } from '@playwright/test';
import axe from 'axe-core';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
const output = path.resolve(__dirname, '../../docs/frontend/screenshots');
async function open(page: Page, route = '/monitoring') {
  await page.goto(route);
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.getByText('Loading connections…', { exact: true })).toHaveCount(0);
}
async function checkAxe(page: Page) {
  await page.addScriptTag({ content: axe.source });
  const result = await page.evaluate(() =>
    (window as typeof window & { axe: typeof axe }).axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
    }),
  );
  expect(
    result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
}
for (const width of [1440, 1280, 1024, 768, 390])
  for (const route of [
    '/monitoring',
    '/monitoring/connections/CONN-services-SYS-001',
    '/monitoring/incidents/ALT-services-seed-violation',
  ])
    test(`${route} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await open(page, route);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
      await mkdir(output, { recursive: true });
      await page.screenshot({
        path: path.join(output, `monitoring-${route.split('/').at(-1)}-${width}.png`),
        fullPage: true,
      });
      await checkAxe(page);
    });
test('Sidebar has a native external gutter and fixed header, workspace selector and footer', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 620 });
  await open(page);
  const scroller = page.locator('aside:not(.mobile-sidebar) .nav-scroll');
  await expect(scroller).toBeVisible();
  const backgrounds = await scroller.evaluate((node) => {
    const content = node.querySelector('.nav-content')!;
    return {
      scroll: getComputedStyle(node).backgroundColor,
      content: getComputedStyle(content).backgroundColor,
      topGap: content.getBoundingClientRect().top - node.getBoundingClientRect().top,
    };
  });
  expect(backgrounds.scroll).toBe(backgrounds.content);
  expect(backgrounds.topGap).toBe(0);
  const before = await page.locator('aside:not(.mobile-sidebar) .wordmark').boundingBox();
  const dimensions = await scroller.evaluate((node) => {
    const el = node as HTMLElement;
    el.scrollTop = el.scrollHeight;
    const style = getComputedStyle(el);
    return {
      overflowY: style.overflowY,
      gutter: style.scrollbarGutter,
      scrollbarWidth: style.scrollbarWidth,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      scrollTop: el.scrollTop,
      width: el.clientWidth,
      scrollWidth: el.scrollWidth,
    };
  });
  expect(dimensions.overflowY).toBe('auto');
  expect(dimensions.gutter).toBe('auto');
  expect(dimensions.scrollbarWidth).toBe('none');
  expect(dimensions.scrollTop).toBeGreaterThan(0);
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
  expect(await page.locator('aside:not(.mobile-sidebar) .wordmark').boundingBox()).toEqual(before);
  await expect(page.locator('aside:not(.mobile-sidebar) .org-switch')).toBeVisible();
  await scroller.focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('End');
  await expect(
    page.locator('aside:not(.mobile-sidebar) .nav-link[href="/settings"]'),
  ).toBeVisible();
});
test('Navigation and workspace changes do not throw during monitoring cleanup', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await open(page, '/registry');
  for (const route of ['settings', 'monitoring', 'registry']) {
    await page.locator(`aside:not(.mobile-sidebar) a[href="/${route}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/${route}$`));
    await expect(page.locator('main h1')).toBeVisible();
  }
  await page.locator('#org').selectOption('research');
  await page.locator('#org').selectOption('services');
  await expect(page.locator('main h1')).toBeVisible();
  expect(errors).toEqual([]);
});
test('Feed pause buffers updates and resume reveals them; global simulation pause stops generation', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('button', { name: 'Pause display', exact: true }).click();
  const eventRows = page.getByRole('region', { name: 'Monitoring activity table', exact: true });
  const before = await eventRows.locator('tbody tr td:nth-child(2)').allTextContents();
  await expect(page.getByText(/pending retained updates/)).toBeVisible();
  await expect(async () => {
    const pending = page.locator('.feed-paused');
    expect(await pending.textContent()).not.toMatch(/^0 /);
  }).toPass({ timeout: 12000 });
  expect(await eventRows.locator('tbody tr td:nth-child(2)').allTextContents()).toEqual(before);
  await page.getByRole('button', { name: 'Resume display', exact: true }).click();
  await expect(page.locator('.feed-paused')).toHaveCount(0);
  await page.getByRole('button', { name: 'Pause simulation', exact: true }).click();
  await expect(page.getByText('Simulation paused', { exact: true })).toBeVisible();
});
test('Registry filters and optional metadata preserve compliance columns', async ({ page }) => {
  await open(page, '/registry');
  await page
    .getByRole('combobox', { name: 'Filter registry connection status' })
    .selectOption('CONNECTED');
  await expect(page.getByRole('columnheader', { name: 'Compliance', exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Risk', exact: true })).toBeVisible();
  await page.getByText('Connection columns', { exact: true }).click();
  await page.getByLabel('Last heartbeat', { exact: true }).check();
  await expect(
    page.getByRole('columnheader', { name: 'Last heartbeat', exact: true }),
  ).toBeVisible();
  await page.getByRole('combobox', { name: 'Filter registry provider' }).selectOption('OPENAI');
  await page.getByRole('button', { name: 'Benefits eligibility assistant', exact: true }).click();
  await page.getByRole('link', { name: 'Monitoring information', exact: true }).click();
  await expect(page).toHaveURL(/monitoring\/connections\/CONN-services-SYS-001/);
});
test('Six-step connector wizard simulates test/save without any API key field', async ({
  page,
}) => {
  await open(page, '/integrations?setup=ai');
  const wizard = page.getByRole('dialog', { name: 'Set up AI connector', exact: true });
  await expect(wizard).toBeVisible();
  await expect(wizard.locator('input[type="password"]')).toHaveCount(0);
  await wizard.getByLabel('AI provider', { exact: true }).selectOption('OLLAMA');
  await wizard.getByRole('button', { name: 'Next', exact: true }).click();
  await wizard.getByLabel('Registered AI system').selectOption('SYS-005');
  await wizard.getByRole('button', { name: 'Next', exact: true }).click();
  await wizard.getByLabel('Endpoint URL').fill('http://localhost:11434');
  await wizard.getByRole('button', { name: 'Next', exact: true }).click();
  await wizard.getByRole('button', { name: 'Next', exact: true }).click();
  await wizard.getByRole('button', { name: 'Run simulated test' }).click();
  await expect(wizard.getByText(/no endpoint was contacted/)).toBeVisible();
  await wizard.getByRole('button', { name: 'Next', exact: true }).click();
  await wizard.getByRole('button', { name: 'Save connector' }).click();
  await wizard.getByRole('link', { name: 'Open connection' }).click();
  await expect(page).toHaveURL(/CONN-services-SYS-005/);
});
test('A governance alert links to its actual assessment and remediation', async ({ page }) => {
  await open(page, '/monitoring/incidents/ALT-services-seed-violation');
  await page.getByRole('link', { name: 'Open related record' }).click();
  await expect(page).toHaveURL(/assessments\?record=ASM-003/);
  await expect(page.getByRole('dialog', { name: 'ASM-003', exact: true })).toBeVisible();
  await open(page, '/monitoring/incidents/ALT-services-seed-violation');
  await page.getByRole('button', { name: 'Create remediation' }).click();
  await page.getByRole('link', { name: 'View remediation' }).click();
  await expect(page).toHaveURL(/remediation\?record=REM-ALT-services-seed-violation/);
  await expect(page.getByRole('dialog')).toBeVisible();
});
test('Live backend errors never show demo connections or zero-valued fake metrics', async ({
  page,
}) => {
  await page.route('**/api/v1/monitoring/**', (route) =>
    route.fulfill({ status: 503, body: 'Unavailable' }),
  );
  await open(page);
  await page.getByRole('button', { name: 'Pause display', exact: true }).click();
  await page.getByRole('combobox', { name: 'Monitoring mode', exact: true }).selectOption('live');
  await expect(page.getByRole('alert')).toContainText('Monitoring is unavailable');
  await expect(page.getByText('synthetic-model-1', { exact: false })).toHaveCount(0);
  await expect(
    page
      .getByRole('region', { name: 'Monitoring activity table', exact: true })
      .getByText('Synthetic decision metadata recorded.', { exact: true }),
  ).toHaveCount(0);
  for (const value of await page.locator('.metric-value').allTextContents())
    expect(value).toBe('—');
});
test('Monitoring workspace switching clears previous-organization data and French stays localized', async ({
  page,
}) => {
  await open(page);
  await page.locator('#org').selectOption('research');
  await expect(
    page.getByRole('link', { name: 'Benefits eligibility assistant', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Switch to French' }).click();
  await expect(page.locator('main h1')).toHaveText('Surveillance en temps réel');
  await expect(page.getByRole('button', { name: 'Suspendre la simulation' })).toBeVisible();
  await checkAxe(page);
});
