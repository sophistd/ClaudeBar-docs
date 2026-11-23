/**
 * [INPUT]: 同一生产站点的中英文页面、搜索索引与机器阅读端点。
 * [OUTPUT]: 语言切换、中文搜索/教学交互/复制及语言一致性的浏览器证据。
 * [POS]: 本地化回归；检查真实读者操作，英文基础行为由 site.spec.ts 覆盖。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { test, expect, type Page } from '@playwright/test';
const base = '/ClaudeBar-docs/';
async function revealLanguagePicker(page: Page, menuName: string) {
  // ---- URL 已变化不等于新页面控件已加载，先等待页面再区分桌面/手机 ----
  await page.waitForLoadState('load');
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
  await expect(page.locator('h1')).toHaveText('网络出口与门禁');
  await expect(page.locator('.page-meta, .page-contract, .breadcrumb')).toHaveCount(0);
  await (await revealLanguagePicker(page, '菜单')).selectOption({ label: 'English' });
  await expect(page).toHaveURL(`${base}en/concepts/network-egress/`);
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
  await expect(gate.locator('[data-label]')).toHaveText('允许连接');
  await gate.getByRole('button', { name: '模拟上游中断', exact: true }).click();
  await gate.getByRole('button', { name: '探测未通过，等待到期', exact: true }).click();
  await expect(gate.locator('[data-label]')).toHaveText('已隔离');
  await expect(gate.getByRole('button', { name: '重新验证并启用', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(gate.locator('[data-label]')).toHaveText('允许连接');
  for (const label of await gate.getByRole('button').allTextContents()) expect(label).toMatch(/[\p{Script=Han}]/u);
});
test('Chinese Markdown and agent index match the visible language', async ({ page, request }) => {
  await page.goto(`${base}zh/concepts/network-egress/`);
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
  expect((await index.text()).match(/^- \[/gm)).toHaveLength(23);
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

// ---- 根入口只展示产品；中英文文档首页互切不回到产品 ----
test('product root and documentation home navigation stay separate', async ({page,isMobile}) => {
  await page.goto(base);
  await expect(page.locator('h1')).toContainText('掌握连接');
  await expect(page.locator('a').filter({hasText:'UI Kit'})).toHaveCount(0);
  if(isMobile)await page.getByRole('button',{name:'打开菜单',exact:true}).click();
  await page.getByRole('navigation',{name:'站点导航',exact:true}).getByRole('link',{name:'文档',exact:true}).click();
  await expect(page).toHaveURL(`${base}zh/`);
  await (await revealLanguagePicker(page,'菜单')).selectOption({label:'English'});
  await expect(page).toHaveURL(`${base}en/`);
  await expect(page.getByRole('heading',{name:'Get started',exact:true})).toBeVisible();
  await (await revealLanguagePicker(page,'Menu')).selectOption({label:'简体中文'});
  await expect(page).toHaveURL(`${base}zh/`);
  if(isMobile)await page.getByRole('button',{name:'菜单',exact:true}).click();
  await page.getByRole('navigation',{name:'站点导航',exact:true}).getByRole('link',{name:'产品',exact:true}).click();
  await expect(page).toHaveURL(base);
  await expect(page.locator('h1')).toContainText('掌握连接');
});

test('legacy English links and Markdown retain their content', async ({page,request}) => {
  await page.goto(`${base}concepts/network-egress/`);
  await expect(page.locator('h1')).toHaveText('Network egress');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href',`https://sophistd.github.io${base}en/concepts/network-egress/`);
  const oldMarkdown=await request.get(`${base}markdown/concepts/network-egress.md`);
  expect(oldMarkdown.ok()).toBe(true);
  expect(await oldMarkdown.text()).toContain('# Network egress');
  await page.goto(`${base}designs/index.html`);
  await expect(page.locator('h1')).toContainText('掌握连接');
  await expect(page.locator('a').filter({hasText:'UI Kit'})).toHaveCount(0);
});
