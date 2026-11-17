/**
 * [INPUT]: 双语图解页、原图链接、同源 SVG/PNG 与 Markdown 端点。
 * [OUTPUT]: 图片解码、可访问说明、放大阅读和文本替代的真实浏览器回归。
 * [POS]: 图文交付的验收边界，补充全站主题和无障碍扫描。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { test, expect } from '@playwright/test';

for (const locale of ['', 'zh/']) {
  test(`illustrations and actual app screenshots: ${locale || 'en'}`, async ({ page, request }) => {
    await page.goto(`/ClaudeBar-docs/${locale}concepts/visual-guide/`);
    const figures = page.locator('main figure');
    await expect(figures).toHaveCount(7);
    for (const figure of await figures.all()) {
      const img = figure.locator('img');
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
      expect(await img.getAttribute('alt')).toBeTruthy();
      await expect(figure.locator('figcaption')).not.toBeEmpty();
      const source = await img.getAttribute('src');
      expect((await request.get(source!)).ok()).toBe(true);
      await expect(figure.locator(`a[href="${source}"]`).first()).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const raw = await request.get(`/ClaudeBar-docs/markdown/${locale}concepts/visual-guide.md`);
    const text = await raw.text();
    expect(raw.ok()).toBe(true);
    expect(text).not.toContain('<DocFigure');
    expect(text.match(/!\[/g)).toHaveLength(7);
  });
}
