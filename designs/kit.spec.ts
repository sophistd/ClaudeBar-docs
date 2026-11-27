/**
 * [INPUT]: 实际静态页、Axe 与原生浏览器交互。
 * [OUTPUT]: 山路首页的文案/画廊/链接/Axe/空闲零帧、滚动推进与珠子结果、2D/3D 与减弱动态、轻吸、无 WebGL 与脚本失败降级、营销页与 Docs 导航往返、响应式/对比度、单选展开/确认、表单验证、浮层焦点与光学调参证据。
 * [POS]: UI Kit 的行为验收；不把 DOM 存在视为美术质量通过。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
for(const pageName of ['network','sessions','access','ui-kit'])for(const theme of ['light','dark'])test(`${pageName} ${theme}: readable, linked, no overflow`,async({page,request,isMobile},testInfo)=>{
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
 await expect(page.locator('h1')).toContainText('出口不对');
 await goTo(page,'gate');
 await page.getByRole('link',{name:'看门禁路径',exact:true}).click();
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
  if(file!=='ui-kit'&&file!=='index')await page.getByRole('button',{name:'打开菜单',exact:true}).click();
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
 await page.goto('/ClaudeBar-docs/designs/network.html',{waitUntil:'commit'});
 const menu=page.getByRole('button',{name:'打开菜单',exact:true});
 try {await expect(menu).toBeVisible();await expect(menu).toBeDisabled();} finally {release();}
 await page.waitForLoadState('load');await expect(menu).toBeEnabled();await menu.click();
 await expect(page.getByRole('button',{name:'关闭菜单',exact:true})).toHaveAttribute('aria-expanded','true');
 await page.getByRole('navigation',{name:'站点导航',exact:true}).getByRole('link',{name:'文档',exact:true}).click();
 await expect(page).toHaveURL(/\/ClaudeBar-docs\/zh\/$/);
});

// 山路首页：章节在正常文档流里，索引是原生锚点；滚到章节中心与真人点击同一路径
const goTo=(page:any,id:string)=>page.evaluate(async(id:string)=>{const el=document.getElementById(id)!;scrollTo({top:el.offsetTop+el.offsetHeight/2-innerHeight/2,behavior:'instant'});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));},id);
const settle=(page:any)=>page.waitForFunction(()=>{const w=window as any;const n=w.__frames;return new Promise(r=>setTimeout(()=>r(w.__frames===n),400));},null,{timeout:20000});
const countFrames=async(page:any)=>page.addInitScript(()=>{const raf=window.requestAnimationFrame.bind(window);(window as any).__frames=0;window.requestAnimationFrame=(f:FrameRequestCallback)=>{(window as any).__frames++;return raf(f);};});
// ---- 山路首页：文案、画廊、链接、Axe 与空闲零帧 ----
test('trail homepage: copy, gallery, links, accessibility and idle frames',async({page,request})=>{
 test.setTimeout(120000);   // 无头浏览器用软件渲染画十余万个点，比真机慢一个量级
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await countFrames(page);
 await page.goto('/ClaudeBar-docs/');await page.evaluate(()=>document.fonts.ready);
 await expect(page.locator('h1')).toHaveCount(1);await expect(page.locator('h1')).toContainText('出口不对');
 await expect(page.locator('.cb-site-nav a[aria-current]')).toHaveText('产品');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBeTruthy();
 expect(await page.evaluate(()=>document.getAnimations().filter(a=>a.effect?.getTiming().iterations===Infinity).length)).toBe(0);
 // 示意只说一次，且不出现防封承诺
 const text=await page.locator('body').innerText();
 expect(text.split('示意').length-1).toBe(1);
 for(const word of ['防封保证','零泄漏','干净 IP'])expect(text).not.toContain(word);
 // 画廊：点击与方向键都切换同一组标签
 await goTo(page,'workbench');
 await page.getByRole('tab',{name:'检查与修复',exact:true}).click();
 await expect(page.locator('#shot-repair')).toBeVisible();await expect(page.locator('#shot-launchpad')).toBeHidden();
 await page.keyboard.press('ArrowRight');await expect(page.getByRole('tab',{name:'发前预检',exact:true})).toHaveAttribute('aria-selected','true');
 for(const img of await page.locator('img:visible').all())await img.evaluate((el:HTMLImageElement)=>el.decode());
 await settle(page);
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 const hrefs=await page.locator('a[href]').evaluateAll(es=>[...new Set(es.map(e=>(e as HTMLAnchorElement).href))]);
 for(const href of hrefs.filter(h=>!h.includes('#'))){const external=!href.startsWith(new URL(page.url()).origin);const r=external?await request.head(href,{maxRedirects:0}):await request.get(href);expect(r.status(),href).toBeLessThan(400);}
 // 空闲：落定之后整窗不再请求任何一帧
 await page.mouse.move(0,0);await settle(page);
 const before=await page.evaluate(()=>(window as any).__frames);await page.waitForTimeout(1000);
 expect(await page.evaluate(()=>(window as any).__frames)).toBe(before);
 expect(errors).toEqual([]);
});
// ---- 滚动推进叙事：每章停稳后，当前关的珠子给出结果，索引指向本章 ----
test('scrolling advances the climb: bead results and index follow the chapter',async({page,isMobile})=>{
 test.setTimeout(120000);
 await page.goto('/ClaudeBar-docs/');
 // 桌面项目强制要求 WebGL：否则这组用例会在没有 GPU 的环境里静默跳过
 if(!isMobile)await expect(page.locator('html')).toHaveClass(/has-webgl/);
 test.skip(!(await page.locator('html').evaluate(el=>el.classList.contains('has-webgl'))),'无 WebGL 时是一页长文');
 await goTo(page,'leak');
 await expect(page.locator('[data-bead="leak"]')).toHaveAttribute('data-state','mitigated',{timeout:15000});
 await expect(page.locator('[data-bead="session"]')).toHaveAttribute('data-state','pass');
 await expect(page.locator('[data-bead="gate"]')).not.toHaveAttribute('data-state','pass');
 if(!isMobile)await expect(page.locator('[data-chapter-link][href="#leak"]')).toHaveAttribute('aria-current','step');
 await goTo(page,'gate');
 await expect(page.locator('[data-bead="gate"]')).toHaveAttribute('data-state','pass',{timeout:15000});
 await expect(page.locator('#gate .card')).toHaveCSS('opacity','1');
 await expect(page.locator('#leak .card')).toHaveCSS('opacity','0');
 // 看不见的卡片仍在无障碍树里（读屏能顺读整篇），但其中的链接不进 Tab 序列
 await expect(page.getByRole('heading',{name:'各用各的抽屉。'})).toHaveCount(1);
 await expect(page.locator('#session .text-link')).toHaveAttribute('tabindex','-1');
 await expect(page.locator('#gate .text-link')).not.toHaveAttribute('tabindex','-1');
});
// ---- 2D / 3D：切换后停在同一章，选择在重新载入后保留；减弱动态强制 2D ----
test('2D/3D switch keeps the chapter and the choice',async({page})=>{
 test.setTimeout(120000);
 await page.goto('/ClaudeBar-docs/');
 test.skip(!(await page.locator('html').evaluate(el=>el.classList.contains('has-webgl'))),'无 WebGL 时没有视图开关');
 await goTo(page,'env');
 const flat=page.locator('[data-mode="2d"]'),curl=page.locator('[data-mode="3d"]');
 const y=await page.evaluate(()=>scrollY);
 await flat.click();await expect(flat).toHaveAttribute('aria-pressed','true');
 expect(Math.abs(await page.evaluate(()=>scrollY)-y)).toBeLessThan(2);
 await expect(page.locator('#env .card')).toHaveCSS('opacity','1');
 await expect(page.locator('[data-bead="env"]')).toHaveAttribute('data-state','pass');
 await page.reload();await expect(page.locator('[data-mode="2d"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-mode="3d"]').click();await expect(curl).toHaveAttribute('aria-pressed','true');
});
test('reduced motion forces the flat map and disables 3D',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/ClaudeBar-docs/');
 test.skip(!(await page.locator('html').evaluate(el=>el.classList.contains('has-webgl'))),'无 WebGL 时没有视图开关');
 await expect(page.locator('[data-mode="3d"]')).toBeDisabled();
 await expect(page.locator('[data-mode="2d"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('h1')).toBeInViewport();
});
// ---- 轻吸：只在停得离章节中心很近时吸正；远一点不干预 ----
test('the trail gently snaps only a very near resting position',async({page,isMobile})=>{
 test.skip(isMobile,'触控滚动的惯性由系统处理，轻吸只在桌面合成滚动下验收');
 test.setTimeout(120000);
 await page.goto('/ClaudeBar-docs/');
 test.skip(!(await page.locator('html').evaluate(el=>el.classList.contains('has-webgl'))),'无 WebGL 时不吸');
 await goTo(page,'gate');
 const best=await page.evaluate(()=>scrollY);
 await page.evaluate(y=>scrollTo({top:y+Math.round(innerHeight*0.06),behavior:'instant'}),best);
 await expect.poll(async()=>Math.abs(await page.evaluate(()=>scrollY)-best),{timeout:6000}).toBeLessThanOrEqual(1);
 await expect(page.locator('[data-chapter-link][href="#gate"]')).toHaveAttribute('aria-current','step');
 const far=await page.evaluate(y=>{const t=Math.round(y+innerHeight*0.3);scrollTo({top:t,behavior:'instant'});return t;},best);
 await page.waitForTimeout(1500);
 expect(await page.evaluate(()=>scrollY)).toBe(far);
});
// ---- 没有 WebGL 或脚本加载失败时，同一份 HTML 是一页可读的长文 ----
test('homepage reads as a long page without WebGL',async({page})=>{
 await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,type:string,...rest:unknown[]){return /webgl/.test(type)?null:(get as any).call(this,type,...rest);} as any;});
 await page.goto('/ClaudeBar-docs/');
 await expect(page.locator('html')).not.toHaveClass(/has-webgl/);
 for(const id of ['#gate .card','#layers .card','#summit .board'])await expect(page.locator(id)).toHaveCSS('opacity','1');
 await page.locator('#summit').scrollIntoViewIfNeeded();await expect(page.locator('#summit-title')).toBeVisible();
});
test('homepage content stays visible when the script bundle fails to load',async({page})=>{
 await page.route('**/designs/assets/home.bundle.js',route=>route.abort());
 await page.goto('/ClaudeBar-docs/');
 await expect(page.locator('html')).not.toHaveClass(/has-webgl/);
 for(const id of ['#gate .card','#summit .board','.hero-copy'])await expect(page.locator(id)).toHaveCSS('opacity','1');
});
