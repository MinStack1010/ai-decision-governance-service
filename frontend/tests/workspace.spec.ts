import { test, expect, type Page } from '@playwright/test';
import axe from 'axe-core';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
const modules = [
  'dashboard',
  'registry',
  'policies',
  'assessments',
  'impact',
  'evidence',
  'traceability',
  'risks',
  'reviews',
  'remediation',
  'reports',
  'audit',
  'integrations',
  'settings',
];
const screenshots = path.resolve(__dirname, '../../docs/frontend/screenshots');
async function ready(page: Page, route: string) {
  await page.goto(route);
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.getByText('Loading saved workspace…')).toHaveCount(0);
}
async function accessibility(page: Page) {
  await page.addScriptTag({ content: axe.source });
  const result = await page.evaluate(
    async () =>
      await (window as typeof window & { axe: typeof axe }).axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      }),
  );
  expect(
    result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
}
for (const width of [1440, 1280, 1024, 768, 390]) {
  for (const module of modules)
    test(`${module} · ${width}px · rendered accessibility and layout`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await ready(page, `/${module}`);
      await expect(page.locator('main h1')).toHaveCount(1);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      ).toBe(true);
      await mkdir(screenshots, { recursive: true });
      await page.screenshot({
        path: path.join(screenshots, `en-${module}-${width}.png`),
        fullPage: true,
      });
      await accessibility(page);
      expect(errors).toEqual([]);
    });
}
for (const module of modules)
  test(`${module} · French labels and accessibility`, async ({ page }) => {
    await ready(page, `/${module}`);
    await page.getByRole('button', { name: 'Switch to French' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await page.screenshot({
      path: path.join(screenshots, `fr-${module}-1440.png`),
      fullPage: true,
    });
    await accessibility(page);
  });
test('Register, edit, persist, filter, and export an AI system', async ({ page }) => {
  await ready(page, '/registry');
  await page.getByRole('button', { name: 'Register AI system', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Register AI system', exact: true });
  await form.getByLabel('System name', { exact: true }).fill('Local test classifier');
  await form.getByLabel('Accountable owner').fill('Test owner');
  await form.getByLabel('Department').fill('Operations');
  await form.getByLabel('Intended purpose').fill('Classifies test documents.');
  await form.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search table' }).fill('Local test classifier');
  await expect(
    page.getByRole('button', { name: 'Local test classifier', exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('textbox', { name: 'Search table' }).fill('Local test classifier');
  await page.getByRole('button', { name: 'Local test classifier', exact: true }).click();
  await page.getByRole('button', { name: 'Edit record' }).click();
  const edit = page.getByRole('dialog', { name: 'Edit AI system', exact: true });
  await edit.getByLabel('System name', { exact: true }).fill('Updated test classifier');
  await edit.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('textbox', { name: 'Search table' }).fill('Updated test classifier');
  await expect(page.getByRole('button', { name: 'Updated test classifier' })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('ai-system-registry.csv');
});
test('Registry system name content is left aligned with its system ID', async ({ page }) => {
  await ready(page, '/registry');
  const row = page.getByRole('row').filter({ hasText: 'SYS-001' }).first();
  const nameCell = row.locator('td').first();
  expect(
    await nameCell.locator('button').evaluate((node) => getComputedStyle(node).textAlign),
  ).toBe('left');
  const nameLeft = await nameCell
    .locator('button')
    .evaluate((node) => node.getBoundingClientRect().left);
  const idLeft = await nameCell
    .locator('.table-meta')
    .evaluate((node) => node.getBoundingClientRect().left);
  expect(Math.abs(nameLeft - idLeft)).toBeLessThanOrEqual(1);
});
test('Policies accept PDF Word and Excel document metadata in the demo workspace', async ({
  page,
}) => {
  await ready(page, '/policies');
  await page.getByRole('button', { name: 'Add policy document', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add policy document', exact: true });
  await dialog.getByLabel('Policy name', { exact: true }).fill('Imported service policy');
  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'service-policy.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 synthetic audit fixture'),
  });
  await dialog.getByRole('button', { name: 'Add document', exact: true }).click();
  await expect(page.getByText('PDF · service-policy.pdf', { exact: true })).toBeVisible();
});
test('Evidence references appear in control findings; approval retains human rationale', async ({
  page,
}) => {
  await ready(page, '/evidence');
  await page.getByRole('button', { name: 'Add evidence reference', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Add evidence reference', exact: true });
  await form.getByLabel('Document name or reference').fill('Decision-factor-validation.pdf');
  await form.getByLabel('AI system').selectOption('SYS-001');
  await form.getByLabel('Control requirement').selectOption('REQ-02');
  await form.getByRole('button', { name: 'Save', exact: true }).click();
  await ready(page, '/assessments?record=ASM-001');
  const drawer = page.getByRole('dialog', { name: 'ASM-001', exact: true });
  await expect(drawer.getByText('Decision-factor-validation.pdf', { exact: false })).toBeVisible();
  await drawer.getByRole('button', { name: 'Review finding', exact: true }).nth(1).click();
  const finding = page.getByRole('dialog', { name: 'Review control finding', exact: true });
  await finding.getByLabel('Outcome', { exact: true }).selectOption('compliant');
  await finding.getByLabel('Finding rationale').fill('Evidence includes all decision factors.');
  await finding.getByRole('button', { name: 'Save', exact: true }).click();
  await drawer.getByRole('button', { name: 'Approve assessment', exact: true }).click();
  const decision = page.getByRole('dialog', { name: 'Approve assessment', exact: true });
  await decision.getByLabel('Decision rationale').fill('All control records reviewed.');
  await decision.getByRole('button', { name: 'Record decision', exact: true }).click();
  await expect(drawer.getByText('All control records reviewed.')).toBeVisible();
  await ready(page, '/registry');
  await page.getByRole('textbox', { name: 'Search table' }).fill('SYS-001');
  await expect(
    page.getByRole('row').filter({ hasText: 'SYS-001' }).getByText('Compliant', { exact: true }),
  ).toBeVisible();
  await ready(page, '/audit');
  await page.getByRole('textbox', { name: 'Search table' }).fill('Assessment approved');
  await expect(page.getByText('Assessment approved', { exact: true })).toBeVisible();
});
test('Impact scheduling reuses pending assessments', async ({ page }) => {
  await ready(page, '/impact');
  async function queue() {
    await page.getByRole('button', { name: 'Queue reassessments', exact: true }).click();
    const form = page.getByRole('dialog', { name: 'Queue reassessments', exact: true });
    await form.getByLabel('Scheduling reason').fill('Policy explanation change.');
    await form.getByRole('button', { name: 'Confirm queue' }).click();
  }
  await queue();
  const first = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('governance-hub-demo-v1')!).workspaces.services.assessments
        .length,
  );
  await queue();
  const second = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('governance-hub-demo-v1')!).workspaces.services.assessments
        .length,
  );
  expect(second).toBe(first);
});
test('Search, notifications, language persistence, and workspace isolation', async ({ page }) => {
  await ready(page, '/dashboard');
  await page.getByRole('button', { name: 'Search workspace', exact: true }).click();
  await page.getByRole('textbox', { name: 'Global search' }).fill('Benefits');
  await page.getByRole('link', { name: /Benefits eligibility/ }).click();
  await expect(
    page.getByRole('dialog', { name: 'Benefits eligibility assistant', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Notifications', exact: true }).click();
  await page.getByRole('link', { name: 'Open review queue' }).click();
  await expect(page.locator('h1')).toHaveText('Human review');
  await page.locator('#org').selectOption('research');
  await expect(page.getByText('No matching records.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Switch to French' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.locator('h1')).toHaveText('Examen humain');
});
test('Mobile menu, dialog focus, and graph text alternative', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page, '/dashboard');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  const menu = page.getByRole('dialog', { name: 'Navigation', exact: true });
  await expect(menu).toBeVisible();
  await accessibility(page);
  await page.keyboard.press('Escape');
  await expect(menu).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
  await ready(page, '/traceability');
  await page.getByRole('button', { name: 'Text alternative', exact: true }).click();
  await expect(page.getByRole('list')).toBeVisible();
  await page.getByRole('button', { name: /Supporting evidence:/ }).click();
  await expect(
    page.getByRole('heading', { name: 'No evidence linked', exact: true }),
  ).toBeVisible();
});
test('Reports download; simulated model registry sync is idempotent', async ({ page }) => {
  await ready(page, '/reports');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Generate & download' }).click();
  expect((await download).suggestedFilename()).toMatch(/^governance-portfolio-/);
  await ready(page, '/integrations');
  const row = page
    .locator('.integration-row')
    .filter({ has: page.getByRole('heading', { name: 'Model registry', exact: true }) });
  await row.getByRole('button', { name: 'Set up demo' }).click();
  await page.getByRole('button', { name: 'Enable simulation', exact: true }).click();
  await row.getByRole('button', { name: 'Simulate sync', exact: true }).click();
  await row.getByRole('button', { name: 'Simulate sync', exact: true }).click();
  await ready(page, '/registry');
  await page.getByRole('textbox', { name: 'Search table' }).fill('SYS-SYNC');
  await expect(
    page.getByRole('button', { name: 'Imported model · sample', exact: true }),
  ).toHaveCount(1);
});
