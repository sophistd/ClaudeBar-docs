/**
 * [INPUT]: 真实生产构建页面与 axe 规则引擎。
 * [OUTPUT]: 全页主题/溢出/a11y、搜索与交互证据；可选导出逐页明暗截图与组件清单。
 * [POS]: 文档站验收；不把静态编译等同于浏览器可用。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const base = '/ClaudeBar-docs/';
function routes(dir: string, prefix = ''): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry): string[] => {
    if (entry.isDirectory()) return routes(path.join(dir, entry.name), `${prefix}${entry.name}/`);
    return entry.name.endsWith('.mdx') ? [`${prefix}${entry.name.replace(/\.mdx$/, '').replace(/^index$/, '')}${entry.name === 'index.mdx' ? '' : '/'}`] : [];
  });
}
for (const route of [...routes('src/content/docs'),'404.html']) {
  test(`page, themes, accessibility and overflow: ${route || 'home'}`, async ({ page }, testInfo) => {
    const menuName = route.startsWith('zh/') ? '菜单' : 'Menu';
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const response = await page.goto(`${base}${route}`);
    expect(response?.status()).toBe(200); // 直接读取静态 404.html；不据此推断托管服务的错误状态码。
    await expect(page.locator('h1')).toBeVisible();
    for (const theme of ['light', 'dark']) {
      // Use the desktop picker or reveal the actual mobile navigation picker.
      if(route==='404.html'&&testInfo.project.name==='mobile'){
        // 无侧栏的错误页沿用系统主题；手机壳没有选择器。
        await page.emulateMedia({colorScheme:theme as 'light'|'dark'});
      } else {
      const picker = page.locator('starlight-theme-select select:visible').first();
      if (!await picker.count()) await page.getByRole('button', { name: menuName, exact: true }).click();
      await page.locator('starlight-theme-select select:visible').first().selectOption(theme);
      const menu = page.getByRole('button', { name: menuName, exact: true });
      if (await menu.isVisible() && await page.locator('#starlight__sidebar').evaluate((node) => node.matches(':popover-open'))) await menu.click();
      }
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      // Expressive Code adds focusability after its debounced ResizeObserver runs.
      await expect.poll(() => page.locator('.expressive-code pre').evaluateAll((nodes) =>
        nodes.filter((node) => node.clientWidth > 0 && node.scrollWidth > node.clientWidth)
          .every((node) => node.getAttribute('tabindex') === '0'),
      )).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))).toEqual([]);
      if (process.env.DOCS_REVIEW_DIR) {
        // 可选逐页审阅证据；不改变页面或常规测试结果。
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all([...document.images].map(image => { image.loading = 'eager'; return image.decode().catch(() => {}); }));
        });
        const name = `${testInfo.project.name}/${theme}/${route.replace(/\/$/, '') || 'index'}.png`;
        const target = path.resolve(process.env.DOCS_REVIEW_DIR, name);
        mkdirSync(path.dirname(target), {recursive:true});
        await page.screenshot({path:target,fullPage:true,animations:'disabled'});
        const inventory=await page.evaluate(()=>Object.fromEntries(['button','select','input','textarea','summary','[role=tab]','[aria-current=page]','dialog','.starlight-aside','.expressive-code','gate-explorer'].map(selector=>[selector,document.querySelectorAll(selector).length])));
        writeFileSync(target.replace(/\.png$/,'.json'),JSON.stringify({route,theme,viewport:testInfo.project.name,inventory,axeViolations:result.violations.length},null,2));
      }
    }
    expect(errors).toEqual([]);
  });
}
test('search keyboard shortcut returns a real deep link', async ({ page }) => {
  await page.goto(`${base}en/`);
  await expect(page.locator('button[data-open-modal]')).toBeEnabled();
  await page.keyboard.press('Control+k');
  await expect(page.locator('dialog[open]')).toBeVisible();
  await page.locator('dialog input').fill('pinning');
  const result = page.locator('.pagefind-ui__result-link').first();
  await expect(result).toBeVisible();
  const searchAudit = await new AxeBuilder({page}).include('dialog[open]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(searchAudit.violations).toEqual([]);
  await result.click();
  await expect(page).not.toHaveURL(new RegExp(`${base}$`));
  await expect(page.locator('h1')).toBeVisible();
});
test('simulation distinguishes rejection expiry and missing observation', async ({ page }) => {
  await page.goto(`${base}concepts/network-egress/`);
  const explorer = page.locator('gate-explorer');
  await explorer.getByRole('button', { name: 'Interrupt upstream' }).click();
  await expect(explorer.locator('[data-label]')).toHaveText('Holding');
  await explorer.getByRole('button', { name: 'Expire with no observation' }).click();
  await expect(explorer.locator('[data-label]')).toHaveText('Armed');
  await explorer.getByRole('button', { name: 'Interrupt upstream' }).click();
  await explorer.getByRole('button', { name: 'Expire after rejection' }).click();
  await expect(explorer.locator('[data-label]')).toHaveText('Isolated');
  await expect(explorer.getByRole('button', { name: 'Reverify and arm' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(explorer.locator('[data-label]')).toHaveText('Armed');
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
  await page.goto(`${base}en/`);
  if (isMobile) {
    await page.getByRole('button', { name: 'Menu', exact: true }).tap();
    await expect(page.locator('#starlight__sidebar')).toBeVisible();
    expect(await page.locator('#starlight__sidebar').evaluate((node) => node.matches(':popover-open'))).toBe(true);
  }
  await page.locator('#starlight__sidebar').getByRole('link', { name: 'First successful setup', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('First successful setup');
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
  await page.goto(`${base}en/`);
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

// ---- 防止 Markdown 排版侵入共用控件，以及重新堆叠状态标注 ----
test('docs reuse kit controls without duplicate state chrome', async ({ page }) => {
  await page.goto(`${base}concepts/network-egress/`);
  const gate = page.locator('gate-explorer');
  await expect(gate.locator('[data-label]')).toHaveCount(1);
  await expect(gate.locator('.simulation-label')).toHaveCount(1);
  const buttons = gate.getByRole('button');
  const heights = await buttons.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
  expect(new Set(heights).size).toBe(1);
  const reference = page.locator('details').filter({has: page.getByText('State reference', {exact:true})});
  await expect(reference.locator('table')).toBeHidden();
  await reference.locator('summary').click();
  await expect(reference.locator('table')).toBeVisible();
  await expect(reference).toContainText('GRACE_HOLD');
});
