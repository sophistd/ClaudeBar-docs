/**
 * [INPUT]: 真实生产构建页面与 axe 规则引擎。
 * [OUTPUT]: 全页主题/溢出/a11y、搜索、复制、键盘与触控行为证据。
 * [POS]: 文档站验收；不把静态编译等同于浏览器可用。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdirSync } from 'node:fs';
import path from 'node:path';
const base = '/ClaudeBar-docs/';
function routes(dir: string, prefix = ''): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry): string[] => {
    if (entry.isDirectory()) return routes(path.join(dir, entry.name), `${prefix}${entry.name}/`);
    return entry.name.endsWith('.mdx') ? [`${prefix}${entry.name.replace(/\.mdx$/, '').replace(/^index$/, '')}${entry.name === 'index.mdx' ? '' : '/'}`] : [];
  });
}
for (const route of routes('src/content/docs')) {
  test(`page, themes, accessibility and overflow: ${route || 'home'}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const response = await page.goto(`${base}${route}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
    for (const theme of ['light', 'dark']) {
      // Use the desktop picker or reveal the actual mobile navigation picker.
      const picker = page.locator('starlight-theme-select select:visible').first();
      if (!await picker.count()) await page.getByRole('button', { name: 'Menu', exact: true }).click();
      await page.locator('starlight-theme-select select:visible').first().selectOption(theme);
      const menu = page.getByRole('button', { name: 'Menu', exact: true });
      if (await menu.isVisible() && await page.locator('#starlight__sidebar').evaluate((node) => node.matches(':popover-open'))) await menu.click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      // Expressive Code adds focusability after its debounced ResizeObserver runs.
      await expect.poll(() => page.locator('.expressive-code pre').evaluateAll((nodes) =>
        nodes.filter((node) => node.clientWidth > 0 && node.scrollWidth > node.clientWidth)
          .every((node) => node.getAttribute('tabindex') === '0'),
      )).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))).toEqual([]);
    }
    expect(errors).toEqual([]);
  });
}
test('search keyboard shortcut returns a real deep link', async ({ page }) => {
  await page.goto(base);
  await expect(page.locator('button[data-open-modal]')).toBeEnabled();
  await page.keyboard.press('Control+k');
  await expect(page.locator('dialog[open]')).toBeVisible();
  await page.locator('dialog input').fill('pinning');
  const result = page.locator('.pagefind-ui__result-link').first();
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).not.toHaveURL(new RegExp(`${base}$`));
  await expect(page.locator('h1')).toBeVisible();
});
test('simulation distinguishes rejection expiry and missing observation', async ({ page }) => {
  await page.goto(`${base}concepts/network-egress/`);
  const explorer = page.locator('gate-explorer');
  await explorer.getByRole('button', { name: 'Interrupt upstream' }).click();
  await expect(explorer.locator('[data-code]')).toHaveText('GRACE_HOLD');
  await explorer.getByRole('button', { name: 'Expire with no observation' }).click();
  await expect(explorer.locator('[data-code]')).toHaveText('ARMED_OPEN');
  await explorer.getByRole('button', { name: 'Interrupt upstream' }).click();
  await explorer.getByRole('button', { name: 'Expire after rejection' }).click();
  await expect(explorer.locator('[data-code]')).toHaveText('TRIPPED_ISOLATED');
  await expect(explorer.getByRole('button', { name: 'Reverify and arm' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(explorer.locator('[data-code]')).toHaveText('ARMED_OPEN');
});
test('code tabs and copy use the visible command', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(`${base}reference/cli/`);
  await page.getByRole('tab', { name: 'SwiftPM', exact: true }).click();
  const panel = page.getByRole('tabpanel', { name: 'SwiftPM', exact: true });
  await expect(panel).toContainText('swift run claudebar-cli --help');
  await panel.locator('button').click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('swift run claudebar-cli --help');
});
test('navigation and Markdown representation work', async ({ page, isMobile, request }) => {
  await page.goto(base);
  if (isMobile) {
    await page.getByRole('button', { name: 'Menu', exact: true }).tap();
    await expect(page.locator('#starlight__sidebar')).toBeVisible();
    expect(await page.locator('#starlight__sidebar').evaluate((node) => node.matches(':popover-open'))).toBe(true);
  }
  await page.locator('#starlight__sidebar').getByRole('link', { name: 'First successful setup', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('First successful setup');
  await page.locator('.page-contract summary').click();
  const rawLink = page.getByRole('link', { name: 'Read as Markdown' });
  const raw = await request.get((await rawLink.getAttribute('href'))!);
  expect(raw.ok()).toBe(true);
  expect(await raw.text()).toContain('# First successful setup');
  const index = await request.get(`${base}llms.txt`);
  expect(index.ok()).toBe(true);
  expect(await index.text()).toContain('/markdown/concepts/network-egress.md');
});
test('keyboard skip link and reduced motion remain available', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(base);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
});
test('wide tables expose keyboard scrolling', async ({ page, isMobile }) => {
  await page.goto(`${base}reference/configuration/`);
  const table = page.locator('table').first();
  await expect(table).toHaveAttribute('tabindex', '0');
  await table.focus();
  await expect(table).toBeFocused();
  if (isMobile) {
    expect(await table.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => table.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  }
});
