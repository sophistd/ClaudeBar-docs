/**
 * [INPUT]: 实际静态页、Axe 与原生浏览器交互。
 * [OUTPUT]: 首页与 Docs 材质/语义一致性、响应式/对比度、单选展开/确认、表单验证、浮层焦点与光学调参证据。
 * [POS]: UI Kit 的行为验收；不把 DOM 存在视为美术质量通过。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
for(const pageName of ['index','network','sessions','access','ui-kit'])for(const theme of ['light','dark'])test(`${pageName} ${theme}: readable, linked, no overflow`,async({page,request,isMobile},testInfo)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`/ClaudeBar-docs/designs/${pageName}.html`);await page.evaluate(()=>document.fonts.ready);
 if(pageName==='ui-kit'){if(theme==='dark')await page.locator('#theme-toggle').click();}
 else await page.locator('[data-cb-theme]').selectOption(theme);
 await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
 await expect(page.locator('h1')).toHaveCount(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBeTruthy();
 for(const img of await page.locator('img:visible').all())await img.evaluate((el:HTMLImageElement)=>el.decode());
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 if(pageName!=='ui-kit'&&!isMobile)await expect(page.locator('.menu')).toBeHidden();
 if(pageName!=='ui-kit'&&isMobile){await page.locator('.menu').click();await expect(page.locator('#nav-links')).toBeVisible();const target=page.getByRole('navigation',{name:'站点导航',exact:true}).getByRole('link',{name:'文档',exact:true});await target.click({trial:true});await page.keyboard.press('Escape');await expect(page.locator('#nav-links')).toBeHidden();await expect(page.locator('.menu')).toBeFocused();}
 if(pageName==='network'){await page.getByRole('button',{name:'隔离',exact:true}).click();await expect(page.locator('[data-state-description]')).toContainText('拒绝新的握手');}
 if(pageName==='access')for(const details of await page.locator('.faq details').all()){await details.locator('summary').click();await expect(details).toHaveAttribute('open','');await details.locator('summary').click();}
 const hrefs=await page.locator('a[href]').evaluateAll(es=>[...new Set(es.map(e=>(e as HTMLAnchorElement).href))]);
 for(const href of hrefs.filter(h=>!h.includes('#')))expect((await request.get(href)).ok(),href).toBeTruthy();
 expect(errors).toEqual([]);
 if(process.env.UI_STATE_REVIEW_DIR){
  const dir=path.resolve(process.env.UI_STATE_REVIEW_DIR,'..','pages',testInfo.project.name,theme,'designs');mkdirSync(dir,{recursive:true});
  await page.screenshot({path:path.join(dir,pageName+'.png'),fullPage:true,animations:'disabled'});
  const inventory=await page.evaluate(()=>Object.fromEntries(['button','select','input','textarea','summary','[role=tab]','[aria-current=page]','dialog','.cb-alert','.cb-popover'].map(selector=>[selector,document.querySelectorAll(selector).length])));
  writeFileSync(path.join(dir,pageName+'.json'),JSON.stringify({route:`designs/${pageName}.html`,theme,viewport:testInfo.project.name,inventory,axeViolations:0},null,2));
 }

});
test('kit: theme, validation, tabs and dialog focus',async({page})=>{
 await page.goto('/ClaudeBar-docs/designs/ui-kit.html');
 await page.getByRole('button',{name:'深色',exact:true}).click();
 await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 await page.locator('#demo-form button[type=submit]').click();
 await expect(page.locator('#demo-name')).toBeFocused();
 await expect(page.locator('#form-error')).toHaveText('请输入会话名称。');
 await page.locator('#demo-name').fill('工作演示');
 await page.locator('#demo-form button[type=submit]').click();
 await expect(page.locator('#form-result')).toContainText('工作演示');
 await page.locator('#tab-0').focus();await page.keyboard.press('ArrowRight');
 await expect(page.locator('#tab-1')).toBeFocused();await expect(page.locator('#panel-1')).toBeVisible();
 const open=page.getByRole('button',{name:'打开对话框',exact:true});await open.click();
 await expect(page.locator('#demo-dialog')).toBeVisible();
 await page.keyboard.press('Escape');await expect(open).toBeFocused();
 await page.locator('#menu-trigger').click();await expect(page.locator('#demo-popover')).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.locator('#demo-popover')).toBeHidden();await expect(page.locator('#menu-trigger')).toBeFocused();
 await page.locator('.cb-tooltip').hover();await expect(page.locator('#tip-example')).toBeVisible();
 await expect(page.locator('.cb-tooltip')).not.toBeFocused();
 await page.keyboard.press('Escape');await expect(page.locator('#tip-example')).toBeHidden();
 await page.mouse.move(0,0);
 await page.locator('.cb-tooltip').focus();await expect(page.locator('#tip-example')).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.locator('#tip-example')).toBeHidden();
});
test('optics: lazy load and real rendered response',async({page})=>{
 await page.goto('/ClaudeBar-docs/designs/ui-kit.html');await expect(page.locator('#optics-stage canvas')).toHaveCount(0);
 await page.locator('#load-optics').click();
 await expect(page.locator('#optics-stage')).toHaveAttribute('data-renderer','webgl',{timeout:30000});
 await expect(page.locator('#ior')).toBeEnabled();
 const canvas=page.locator('#optics-stage canvas');const before=await canvas.screenshot();
 await page.locator('#light-angle').focus();await page.keyboard.press('End');
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 await expect(page.locator('#light-value')).toHaveText('80°');
 const after=await canvas.screenshot();expect(before.equals(after)).toBeFalsy();
 await page.locator('#ior').focus();await page.keyboard.press('End');await expect(page.locator('#ior-value')).toHaveText('2.10');
});
test('reduced motion removes control animation',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/ClaudeBar-docs/designs/ui-kit.html');
 expect(await page.locator('.cb-spinner').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
});

// ---- 两处表单单选复用同一菜单，覆盖展开态而非仅写入值 ----
test('kit: shared native selection opens and commits',async({page})=>{
 await page.goto('/ClaudeBar-docs/designs/ui-kit.html');
 for(const id of ['browser-select','demo-browser']){
  const select=page.locator(`#${id}`);
  await expect(select).toHaveCSS('appearance','base-select');
  await select.click();expect(await select.evaluate(el=>el.matches(':open'))).toBe(true);
  expect(await select.evaluate(el=>getComputedStyle(el,'::picker(select)').borderRadius)).toBe('10px');
  await select.getByRole('option',{name:'Edge',exact:true}).click();await expect(select).toHaveValue('Edge');
  await select.click();await page.keyboard.press('Escape');await expect(select).toBeFocused();
 }
});

// ---- 生产路径上的三入口往返，避免展台成为导航孤岛 ----
test('shared navigation connects product and docs without a kit entry',async({page,isMobile})=>{
 await page.goto('/ClaudeBar-docs/designs/ui-kit.html');
 await page.getByRole('navigation',{name:'站点导航',exact:true}).getByRole('link',{name:'文档',exact:true}).click();
 await expect(page).toHaveURL(/\/ClaudeBar-docs\/zh\/$/);
 if(isMobile)await page.getByRole('button',{name:'菜单',exact:true}).click();
 const nav=page.getByRole('navigation',{name:'站点导航',exact:true});
 await expect(nav.getByRole('link',{name:'文档',exact:true})).toHaveAttribute('aria-current','location');
 await nav.getByRole('link',{name:'产品',exact:true}).click();
 await expect(page.locator('h1')).toContainText('掌握连接');
 await page.getByRole('link',{name:'了解门禁',exact:true}).click();
 await expect(page).toHaveURL(/network.html$/);
 if(isMobile)await page.getByRole('button',{name:'打开菜单',exact:true}).click();
 await page.getByRole('navigation',{name:'站点导航',exact:true}).getByRole('link',{name:'文档',exact:true}).click();
 await expect(page).toHaveURL(/\/ClaudeBar-docs\/zh\/$/);
 if(isMobile)await page.getByRole('button',{name:'菜单',exact:true}).click();
 await expect(page.getByRole('navigation',{name:'站点导航',exact:true}).getByRole('link',{name:'UI Kit',exact:true})).toHaveCount(0);
});

// ---- 窄手机尺寸不让布局视口扩张掩盖横向溢出 ----
test('320px navigation remains reachable on every showcase page',async({page})=>{
 await page.setViewportSize({width:320,height:740});
 for(const file of ['index','network','sessions','access','ui-kit']){
  await page.goto(`/ClaudeBar-docs/designs/${file}.html`);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  if(file!=='ui-kit')await page.getByRole('button',{name:'打开菜单',exact:true}).click();
  await page.getByRole('navigation',{name:'站点导航',exact:true}).getByRole('link',{name:'文档',exact:true}).click({trial:true});
 }
});

// ---- 覆盖手机与大桌面之间的真实布局宽度 ----
test('intermediate viewports keep every showcase page within the viewport',async({page})=>{
 for(const width of [768,1024,1280,1440]){
  await page.setViewportSize({width,height:900});
  for(const file of ['index','network','sessions','access','ui-kit']){
   await page.goto(`/ClaudeBar-docs/designs/${file}.html`);
   const sizes=await page.evaluate(()=>({content:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
   expect(sizes.content,`${file} at ${width}px`).toBeLessThanOrEqual(sizes.viewport);
  }
 }
});

// ---- 延迟脚本期间禁用菜单，脚本就绪后的第一次点击必须生效 ----
test('mobile menu waits for its behavior before accepting a click',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 let release!:()=>void;const ready=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/designs/interactions.js',async route=>{await ready;await route.continue();});
 await page.goto('/ClaudeBar-docs/designs/index.html',{waitUntil:'commit'});
 const menu=page.getByRole('button',{name:'打开菜单',exact:true});
 try {await expect(menu).toBeVisible();await expect(menu).toBeDisabled();} finally {release();}
 await page.waitForLoadState('load');await expect(menu).toBeEnabled();await menu.click();
 await expect(page.getByRole('button',{name:'关闭菜单',exact:true})).toHaveAttribute('aria-expanded','true');
 await page.getByRole('navigation',{name:'站点导航',exact:true}).getByRole('link',{name:'文档',exact:true}).click();
 await expect(page).toHaveURL(/\/ClaudeBar-docs\/zh\/$/);
});

// ---- 首页与 Docs 复用同一表面；根地址也纳入验收，而非只测 designs 样页 ----
for(const theme of ['light','dark'])test(`homepage follows Docs surface and semantic rules: ${theme}`,async({page})=>{
 await page.goto('/ClaudeBar-docs/');
 await page.locator('[data-cb-theme]').selectOption(theme);
 await expect(page.locator('a[href$="access.html"]')).toHaveCount(1);
 await expect(page.locator('.feature-strip .icon,.closing')).toHaveCount(0);
 await expect(page.locator('.feature-strip')).toHaveCSS('box-shadow','none');
 await expect(page.locator('.topbar')).toHaveCSS('backdrop-filter','none');
 const signature=async(selector:string)=>page.locator(selector).first().evaluate(el=>{
  const s=getComputedStyle(el);return {background:s.backgroundColor,shadow:s.boxShadow,radius:s.borderRadius,border:s.borderBottom};
 });
 const header=await signature('.topbar');const image=await signature('.window');
 const art=await page.locator('.hero-art').evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right};});
 expect(art.left).toBeGreaterThanOrEqual(0);expect(art.right).toBeLessThanOrEqual(page.viewportSize()!.width);
 await page.goto('/ClaudeBar-docs/zh/concepts/visual-guide/');
 await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
 expect(await signature('.page > .header')).toEqual(header);
 expect(await signature('.doc-figure.screenshot .image-frame')).toEqual(image);
});
