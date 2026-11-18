/**
 * [INPUT]: 生产文档壳的主题/语言原生 select 与共享 UI Kit 样式。
 * [OUTPUT]: 展开菜单、键盘取消/确认、触控尺寸及主题/语言结果的回归证据。
 * [POS]: 专门覆盖展开态；避免只用 selectOption 跳过读者实际看到的菜单。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync } from 'node:fs';
const base = '/ClaudeBar-docs/';

test('shared selectors: open states, Escape, keyboard and language navigation', async ({page, isMobile}, testInfo) => {
  await page.goto(`${base}zh/concepts/network-egress/`);
  if (isMobile) await page.getByRole('button', {name:'菜单',exact:true}).click();
  const theme = page.locator('starlight-theme-select select:visible').first();
  const language = page.locator('starlight-lang-select select:visible').first();
  for (const mode of ['light','dark']) {
    await theme.selectOption(mode);
    for (const [name, select] of [['theme',theme],['language',language]] as const) {
      await expect(select).toHaveCSS('appearance','base-select');
      await expect(select).toHaveCSS('padding-inline-start','36px');
      await expect(select.locator('..').locator('.label-icon')).toHaveCSS('z-index','1');
      await select.click();
      await expect(select).toHaveJSProperty('value', name==='theme' ? mode : `${base}zh/concepts/network-egress/`);
      expect(await select.evaluate(el=>el.matches(':open'))).toBe(true);
      const metrics = await select.evaluate(el=>{
        const panel=getComputedStyle(el,'::picker(select)');
        const options=[...el.querySelectorAll('option')].map(option=>{const r=option.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height}});
        return {shadow:panel.boxShadow,radius:panel.borderRadius,options};
      });
      expect(metrics.shadow).not.toBe('none');
      expect(metrics.radius).toBe('10px');
      for (const r of metrics.options) {
        expect(r.top).toBeGreaterThanOrEqual(0);expect(r.left).toBeGreaterThanOrEqual(0);
        expect(r.right).toBeLessThanOrEqual(page.viewportSize()!.width);
        expect(r.bottom).toBeLessThanOrEqual(page.viewportSize()!.height);
        if (isMobile) expect(r.height).toBeGreaterThanOrEqual(44);
      }
      expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
      if (process.env.DOCS_SELECT_REVIEW_DIR) {
        mkdirSync(process.env.DOCS_SELECT_REVIEW_DIR,{recursive:true});
        await page.screenshot({path:`${process.env.DOCS_SELECT_REVIEW_DIR}/${testInfo.project.name}-${name}-${mode}.png`,animations:'disabled'});
      }
      await page.keyboard.press('ArrowUp');await page.keyboard.press('Escape');
      expect(await select.evaluate(el=>el.matches(':open'))).toBe(false);
      await expect(select).toBeFocused();
      await expect(select).toHaveValue(name==='theme' ? mode : `${base}zh/concepts/network-egress/`);
      if(isMobile) expect(await page.locator('#starlight__sidebar').evaluate(el=>el.matches(':popover-open'))).toBe(true);
    }
  }
  // 原生键盘确认必须触发框架已有的持久化逻辑。
  await theme.focus();await page.keyboard.press('Space');await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  expect(await page.evaluate(()=>localStorage.getItem('starlight-theme'))).toBe('light');
  await theme.click();await theme.getByRole('option',{name:'自动',exact:true}).click();
  expect(await page.evaluate(()=>localStorage.getItem('starlight-theme'))).toBe('');
  await page.emulateMedia({colorScheme:'dark'});await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.emulateMedia({colorScheme:'light'});await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await language.click();await language.getByRole('option',{name:'English',exact:true}).click();
  await expect(page).toHaveURL(`${base}en/concepts/network-egress/`);
  await expect(page.locator('h1')).toHaveText('Network egress');
});
