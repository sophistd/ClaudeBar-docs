/**
 * [INPUT]: 共用 UI Kit、四个静态页及 Docs 的生产构建。
 * [OUTPUT]: 按组件族、明暗和视口验证真实状态；可导出实际状态截图。
 * [POS]: 状态审计回归；比较跨页面计算样式，防止同名组件重新分叉。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import {test,expect,type Page,type Locator} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
async function capture(page:Page,name:string,target?:Locator){
 const root=process.env.UI_STATE_REVIEW_DIR;if(!root)return;
 const dir=path.join(root,test.info().project.name);mkdirSync(dir,{recursive:true});
 await page.evaluate(()=>document.fonts.ready);
 if(target) await target.screenshot({path:path.join(dir,`${name}.png`),animations:'disabled'});
 else await page.screenshot({path:path.join(dir,`${name}.png`),animations:'disabled'});
}
async function settle(page:Page){await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))))}
async function focus(page:Page,el:Locator){await page.keyboard.press('Tab');await el.focus();await expect(el).toBeFocused();expect(await el.evaluate(e=>e.matches(':focus-visible'))).toBe(true);await expect(el).toHaveCSS('outline-style','solid');}
async function audit(page:Page){expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
const signature=(el:Locator)=>el.evaluate(e=>{const s=getComputedStyle(e);return [s.color,s.backgroundImage,s.backgroundColor,s.borderRadius,s.boxShadow,s.fontSize,s.fontWeight,s.outlineOffset]});
for(const theme of ['light','dark']){
 test.describe(theme,()=>{
  test.beforeEach(async({page})=>{await page.goto('/ClaudeBar-docs/designs/ui-kit.html');if(theme==='dark')await page.locator('#theme-toggle').click();await expect(page.locator('html')).toHaveAttribute('data-theme',theme);await settle(page);});
  test('buttons: all variants hover focus press disabled',async({page,isMobile})=>{
   for(const variant of ['primary','danger','ghost','']){
    const b=page.locator('#buttons .specimen .cb-button').nth(['primary','','danger','ghost'].indexOf(variant));
    await focus(page,b);await capture(page,`${theme}-button-${variant||'secondary'}-focus`,b);
    if(!isMobile){await b.hover();await expect(b).toHaveCSS('transform','matrix(1, 0, 0, 1, 0, -1)');await capture(page,`${theme}-button-${variant||'secondary'}-hover`,b);}
   }
   const b=page.locator('#buttons .specimen .cb-button').first();
   await b.scrollIntoViewIfNeeded();const r=await b.boundingBox();await page.mouse.move(r!.x+10,r!.y+10);await page.mouse.down();
   await expect(b).toHaveCSS('transform','matrix(1, 0, 0, 1, 0, 1)');await capture(page,`${theme}-button-pressed`,b);await page.mouse.up();
   for(const disabled of await page.locator('#buttons button:disabled').all()){
    const before=await signature(disabled);await disabled.hover();expect(await signature(disabled)).toEqual(before);await expect(disabled).toBeDisabled();
   }
   await capture(page,`${theme}-button-states`,page.locator('#buttons'));await audit(page);
  });
  test('fields: editable readonly invalid disabled and select open',async({page,isMobile})=>{
   if(!isMobile){const input=page.locator('#session-name');await input.hover();await capture(page,`${theme}-input-hover`,input);}
   for(const id of ['session-name','notes','read-only','invalid-field','invalid-notes']){const el=page.locator('#'+id);await focus(page,el);await capture(page,`${theme}-${id}-focus`,el);}
   await expect(page.locator('#read-only')).toHaveAttribute('readonly','');
   for(const id of ['disabled-field','disabled-select','disabled-notes']){
    const el=page.locator('#'+id);await expect(el).toBeDisabled();const before=await signature(el);await el.hover();expect(await signature(el)).toEqual(before);
   }
   const select=page.locator('#browser-select');await select.click();expect(await select.evaluate(el=>el.matches(':open'))).toBe(true);
   await expect(select.getByRole('option',{name:'不可用浏览器'})).toBeDisabled();await capture(page,`${theme}-select-open`);
   await page.keyboard.press('Escape');await expect(select).toBeFocused();
   await select.click();await select.getByRole('option',{name:'Edge',exact:true}).click();await expect(select).toHaveValue('Edge');
   await page.locator('#session-name').fill('状态检查');await expect(page.locator('#session-name')).toHaveValue('状态检查');
   await capture(page,`${theme}-fields`,page.locator('#inputs'));await audit(page);
  });
  test('choice: checkbox radio switch range selected and disabled',async({page})=>{
   for(const selector of ['input[type=checkbox]:not([role])','input[type=radio]','input[role=switch]']){
    const el=page.locator('#selection '+selector+':not(:disabled)').first();await focus(page,el);
    if(selector.includes('radio')) {await page.keyboard.press('ArrowRight');await expect(page.locator('#selection input[value=existing]')).toBeChecked();}
    else {const prior=await el.isChecked();await page.keyboard.press('Space');expect(await el.isChecked()).toBe(!prior);}
   }
   for(const el of await page.locator('#selection input:disabled').all()){await expect(el).toBeDisabled();await el.hover();await expect(el).toHaveCSS('cursor','not-allowed');}
   for(const el of await page.locator('.cb-range').all())await expect(el).toBeDisabled();
   await capture(page,`${theme}-choices`,page.locator('#selection'));await audit(page);
   await page.locator('#load-optics').click();await expect(page.locator('#roughness')).toBeEnabled();await focus(page,page.locator('#roughness'));await page.keyboard.press('End');await expect(page.locator('#roughness-value')).toHaveText('0.75');await capture(page,`${theme}-range-enabled`,page.locator('.optics-controls'));
  });
  test('tabs and segmented: keyboard skips disabled and groups stay independent',async({page})=>{
   await focus(page,page.locator('#tab-0'));await page.keyboard.press('End');await expect(page.locator('#tab-2')).toBeFocused();await expect(page.locator('#panel-2')).toBeVisible();await expect(page.locator('#tab-3')).toBeDisabled();
   const group=page.locator('#navigation .cb-segmented');await group.getByRole('button',{name:'7天',exact:true}).click();await expect(group.getByRole('button',{name:'7天',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.locator('#tab-2')).toHaveAttribute('aria-selected','true');
   await group.getByRole('button',{name:'7天',exact:true}).press('End');await expect(group.getByRole('button',{name:'30天',exact:true})).toBeFocused();await expect(group.getByRole('button',{name:'全年',exact:true})).toBeDisabled();
   await capture(page,`${theme}-tabs-selected`,page.locator('#navigation'));await audit(page);
  });
  test('overlays: native popup, outside dismissal, dialog trap and tooltip',async({page})=>{
   const trigger=page.locator('#menu-trigger'),popup=page.locator('#demo-popover');await trigger.click();await expect(popup).toBeVisible();
   await expect(popup.getByRole('button',{name:'暂停同步（不可用）'})).toBeDisabled();await capture(page,`${theme}-popover-open`);await audit(page);
   await page.keyboard.press('Escape');await expect(popup).toBeHidden();await expect(trigger).toBeFocused();
   await trigger.click();await page.locator('#overlays h2').click();await expect(popup).toBeHidden();
   const opener=page.getByRole('button',{name:'打开对话框',exact:true});await opener.click();const dialog=page.locator('#demo-dialog');await expect(dialog).toBeVisible();
   for(let i=0;i<5;i++)await page.keyboard.press('Tab');expect(await dialog.evaluate(e=>e.contains(document.activeElement))).toBe(true);
   await capture(page,`${theme}-dialog-open`);await audit(page);await page.keyboard.press('Escape');await expect(opener).toBeFocused();
   const tooltip=page.locator('.cb-tooltip');await tooltip.hover();await expect(page.locator('#tip-example')).toBeVisible();await page.locator('#tip-example').hover();await expect(page.locator('#tip-example')).toBeVisible();
   await capture(page,`${theme}-tooltip-open`);await page.keyboard.press('Escape');await expect(page.locator('#tip-example')).toBeHidden();
   await page.mouse.move(0,0);await focus(page,tooltip);await expect(page.locator('#tip-example')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#tip-example')).toBeHidden();
  });
  test('feedback: validation toast empty state disclosures and table focus',async({page})=>{
   await page.locator('#demo-form button[type=submit]').click();await expect(page.locator('#demo-name')).toBeFocused();await expect(page.locator('#form-error')).toContainText('请输入');await capture(page,`${theme}-invalid-form`,page.locator('#composition'));
   await page.locator('#demo-name').fill('状态审查');await page.locator('#demo-form button[type=submit]').click();await expect(page.locator('#kit-toast')).toBeVisible();await expect(page.locator('#demo-name')).not.toHaveAttribute('aria-invalid','true');await capture(page,`${theme}-toast-visible`);
   await expect(page.locator('#kit-toast')).toBeHidden({timeout:6000});await page.locator('#empty-create').click();await expect(page.locator('.kit-empty h3')).toContainText('已创建');
   const details=page.locator('#buttons details');await details.locator('summary').click();await expect(details.locator('code')).toBeVisible();await focus(page,details.locator('summary'));await page.keyboard.press('Space');await expect(details.locator('code')).toBeHidden();
   await focus(page,page.locator('.kit-table-wrap'));await capture(page,`${theme}-feedback`,page.locator('#feedback'));await audit(page);
  });
  test('same select and selected segment materials across kit, marketing and docs',async({page,isMobile})=>{
   const kitSelect=page.locator('#browser-select');await focus(page,kitSelect);const selectStyle=await signature(kitSelect);
   const kitSegment=page.locator('#navigation .cb-segmented button[aria-pressed=true]');await focus(page,kitSegment);const segmentStyle=await signature(kitSegment);
   await page.goto('/ClaudeBar-docs/designs/network.html');const marketing=page.locator('[data-cb-theme]');await focus(page,marketing);expect(await signature(marketing)).toEqual(selectStyle);
   const segment=page.locator('.cb-segmented button[aria-pressed=true]');await focus(page,segment);expect(await signature(segment)).toEqual(segmentStyle);
   await page.goto('/ClaudeBar-docs/zh/reference/cli/');if(isMobile)await page.getByRole('button',{name:'菜单',exact:true}).click();
   const docsSelect=page.locator('starlight-theme-select select:visible').first();await focus(page,docsSelect);expect(await signature(docsSelect)).toEqual(selectStyle);
   if(isMobile){await page.getByRole('button',{name:'菜单',exact:true}).click();await expect.poll(()=>page.locator('#starlight__sidebar').evaluate(e=>e.matches(':popover-open'))).toBe(false);await expect(page.locator('.main-frame')).not.toHaveAttribute('inert','');}const docsTab=page.locator('starlight-tabs [role=tab][aria-selected=true]').first();await focus(page,docsTab);expect(await signature(docsTab)).toEqual(segmentStyle);
  });
  test('same button signature across kit, marketing and docs',async({page})=>{
   const kitButton=page.locator('#buttons .cb-button.primary').first();await focus(page,kitButton);const expected=await signature(kitButton);
   await page.goto('/ClaudeBar-docs/designs/index.html');await expect(page.locator('html')).toHaveAttribute('data-theme',theme);const marketing=page.locator('.hero .button.primary').first();await focus(page,marketing);expect(await signature(marketing)).toEqual(expected);
   await page.goto('/ClaudeBar-docs/zh/concepts/network-egress/');const docs=page.locator('gate-explorer .cb-button.primary');await focus(page,docs);expect(await signature(docs)).toEqual(expected);
  });
  test('docs states: search no-results, clear, tabs, copy, disclosure, gate and navigation',async({page,isMobile,context})=>{
   await context.grantPermissions(['clipboard-read','clipboard-write']);
   await page.goto('/ClaudeBar-docs/zh/reference/cli/');await page.keyboard.press('Control+k');const dialog=page.locator('site-search dialog');await expect(dialog).toBeVisible();
   await dialog.locator('input').fill('zzzznomatch98765');await expect(dialog.locator('.pagefind-ui__message')).toContainText('没有');await capture(page,`${theme}-docs-search-empty`);await audit(page);
   const geometry=await dialog.locator('input').evaluate(input=>{
    const style=getComputedStyle(input),form=getComputedStyle(input.closest('form')!,'::before');const r=input.getBoundingClientRect();const clear=input.closest('form')!.querySelector('.pagefind-ui__search-clear')!.getBoundingClientRect();
    return {textStart:r.left+parseFloat(style.paddingLeft),iconEnd:r.left+parseFloat(form.left)+parseFloat(form.width),textEnd:r.right-parseFloat(style.paddingRight),clearStart:clear.left};
   });expect(geometry.textStart).toBeGreaterThan(geometry.iconEnd+4);expect(geometry.textEnd).toBeLessThanOrEqual(geometry.clearStart);
   await dialog.locator('input').fill('门禁');await expect(dialog.locator('.pagefind-ui__result-link').first()).toBeVisible();await capture(page,`${theme}-docs-search-results`);await audit(page);await page.keyboard.press('Escape');
   const tab=page.getByRole('tab',{name:'通过 SwiftPM 运行',exact:true});await tab.click();await focus(page,tab);await capture(page,`${theme}-docs-tabs`,page.locator('starlight-tabs').first());
   const panel=page.getByRole('tabpanel',{name:'通过 SwiftPM 运行',exact:true});await panel.locator('button').click();expect(await page.evaluate(()=>navigator.clipboard.readText())).toContain('swift run');await capture(page,`${theme}-docs-copy`,panel);
   await page.goto('/ClaudeBar-docs/zh/concepts/network-egress/');const gate=page.locator('gate-explorer');await gate.getByRole('button',{name:'模拟上游中断',exact:true}).click();await capture(page,`${theme}-docs-gate-hold`,gate);await gate.getByRole('button',{name:'探测未通过，等待到期',exact:true}).click();await capture(page,`${theme}-docs-gate-isolated`,gate);
   const details=page.locator('.sl-markdown-content details').first();await details.locator('summary').click();await expect(details.locator('table')).toBeVisible();await focus(page,details.locator('summary'));await capture(page,`${theme}-docs-details`,details);
   if(isMobile){await page.getByRole('button',{name:'菜单',exact:true}).click();await capture(page,`${theme}-docs-mobile-menu`);await audit(page);await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'菜单',exact:true})).toBeFocused();}
   else {const link=page.locator('.sidebar-content a[aria-current=page]');await link.hover();await focus(page,link);await capture(page,`${theme}-docs-navigation`);}
  });
 });
}

// ---- 自动主题与实际展开：四个营销页使用同一个行为入口 ----
test('marketing selectors: native menu, automatic theme and persisted preference',async({page})=>{
 await page.goto('/ClaudeBar-docs/designs/index.html');const select=page.locator('[data-cb-theme]');
 await select.click();expect(await select.evaluate(e=>e.matches(':open'))).toBe(true);await page.keyboard.press('Escape');await expect(select).toBeFocused();
 await select.selectOption('auto');await page.emulateMedia({colorScheme:'dark'});await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.emulateMedia({colorScheme:'light'});await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 await select.selectOption('dark');await page.goto('/ClaudeBar-docs/designs/network.html');await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await expect(page.locator('[data-cb-theme]')).toHaveValue('dark');await page.goto('/ClaudeBar-docs/designs/ui-kit.html');await expect(page.locator('#theme-toggle')).toHaveAttribute('aria-pressed','true');
});
