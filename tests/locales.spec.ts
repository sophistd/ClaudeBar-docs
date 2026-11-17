/**
 * [INPUT]: 同一生产站点的中英文页面、搜索索引与机器阅读端点。
 * [OUTPUT]: 语言切换、中文搜索/教学交互/复制及语言一致性的浏览器证据。
 * [POS]: 本地化回归；检查真实读者操作，英文基础行为由 site.spec.ts 覆盖。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { test, expect, type Page } from '@playwright/test';
const base = '/ClaudeBar-docs/';
async function revealLanguagePicker(page: Page, menuName: string) {
  if (!await page.locator('starlight-lang-select select:visible').count()) {
    await page.getByRole('button', { name: menuName, exact: true }).click();
  }
  return page.locator('starlight-lang-select select:visible').first();
}
test('switching languages preserves the current article', async ({ page }) => {
  await page.goto(`${base}concepts/network-egress/`);
  await (await revealLanguagePicker(page, 'Menu')).selectOption({ label: '简体中文' });
  await expect(page).toHaveURL(`${base}zh/concepts/network-egress/`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.locator('.page-meta')).toContainText('原理说明');
  await expect(page.locator('.breadcrumb')).toContainText('理解工作原理');
  await (await revealLanguagePicker(page, '菜单')).selectOption({ label: 'English' });
  await expect(page).toHaveURL(`${base}concepts/network-egress/`);
  await expect(page.locator('h1')).toHaveText('Network egress');
});
test('Chinese search returns Chinese results and a working route', async ({ page }) => {
  await page.goto(`${base}zh/`);
  await expect(page.getByRole('button', { name: '搜索', exact: true })).toBeEnabled();
  await page.keyboard.press('Control+k');
  await page.locator('dialog input').fill('门禁');
  const result = page.locator('.pagefind-ui__result-link').first();
  await expect(result).toBeVisible();
  await expect(result).toHaveAttribute('href', /\/ClaudeBar-docs\/zh\//);
  await expect(page.locator('.pagefind-ui__message').first()).toContainText('找到');
  await result.click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.locator('h1')).toBeVisible();
});
test('Chinese simulation preserves both expiry behaviors', async ({ page }) => {
  await page.goto(`${base}zh/concepts/network-egress/`);
  await expect(page.locator('.simulation-label')).toContainText('教学模拟');
  const gate = page.locator('gate-explorer');
  await gate.getByRole('button', { name: '模拟上游中断', exact: true }).click();
  await gate.getByRole('button', { name: '未取得新观测，等待到期', exact: true }).click();
  await expect(gate.locator('[data-code]')).toHaveText('ARMED_OPEN');
  await gate.getByRole('button', { name: '模拟上游中断', exact: true }).click();
  await gate.getByRole('button', { name: '探测未通过，等待到期', exact: true }).click();
  await expect(gate.locator('[data-code]')).toHaveText('TRIPPED_ISOLATED');
  await expect(gate.getByRole('button', { name: '重新验证并启用', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(gate.locator('[data-code]')).toHaveText('ARMED_OPEN');
  for (const label of await gate.getByRole('button').allTextContents()) expect(label).toMatch(/[\p{Script=Han}]/u);
});
test('Chinese Markdown and agent index match the visible language', async ({ page, request }) => {
  await page.goto(`${base}zh/concepts/network-egress/`);
  await page.locator('.page-contract summary').click();
  const href = await page.getByRole('link', { name: '查看 Markdown 原文' }).getAttribute('href');
  const raw = await request.get(href!);
  expect(raw.ok()).toBe(true);
  const text = await raw.text();
  expect(text).toContain('lang: zh-CN');
  expect(text).toContain('教学模拟');
  expect(text).not.toContain('The web version');
  const index = await request.get(`${base}zh/llms.txt`);
  expect(index.ok()).toBe(true);
  expect(await index.text()).toContain('# ClaudeBar 中文文档');
  expect((await index.text()).match(/^- \[/gm)).toHaveLength(22);
  expect(await index.text()).toContain('/markdown/zh/concepts/visual-guide.md');
});
test('Chinese code tabs retain runnable commands and copy labels', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(`${base}zh/reference/cli/`);
  await page.getByRole('tab', { name: '通过 SwiftPM 运行', exact: true }).click();
  const panel = page.getByRole('tabpanel', { name: '通过 SwiftPM 运行', exact: true });
  await panel.getByRole('button', { name: /复制/ }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('swift run claudebar-cli --help');
});
