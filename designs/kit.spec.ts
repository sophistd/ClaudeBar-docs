/**
 * [INPUT]: 实际静态页、Axe 与原生浏览器交互。
 * [OUTPUT]: 沉浸式首页内容/恢复三态/画廊/空闲零帧与降级、营销页与 Docs 导航往返、响应式/对比度、单选展开/确认、表单验证、浮层焦点与光学调参证据。
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
 await expect(page.locator('h1')).toContainText('网络一抖');
 await goTo(page,'gate');   // 卷曲版的世界固定在视口，先像真人一样滚到这一章
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

// 纸带首页：卷曲版把世界固定在视口里，浏览器不会替它滚动；导航一律走章节索引（与真人点击同一条路径）
const goTo=(page:any,id:string)=>page.evaluate(async(id:string)=>{const link=document.querySelector(`a[href="#${id}"]`) as HTMLAnchorElement|null;if(link)link.click();else document.getElementById(id)!.scrollIntoView();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));},id);
// ---- 沉浸式首页：内容不依赖 WebGL；恢复三态与画廊可操作；动效只由事件触发，空闲时零帧 ----
test('immersive homepage: content, recovery states, gallery and idle frames',async({page,request})=>{
 test.setTimeout(120000);   // 无头浏览器用软件渲染跑全屏后期，比真机慢一个量级
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const raf=window.requestAnimationFrame.bind(window);(window as any).__frames=0;window.requestAnimationFrame=(f:FrameRequestCallback)=>{(window as any).__frames++;return raf(f);};});
 await page.goto('/ClaudeBar-docs/');await page.evaluate(()=>document.fonts.ready);
 await expect(page.locator('h1')).toHaveCount(1);await expect(page.locator('h1')).toHaveAttribute('aria-label',/网络一抖/);
 await expect(page.locator('.cb-site-nav a[aria-current]')).toHaveText('产品');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBeTruthy();
 expect(await page.evaluate(()=>document.getAnimations().filter(a=>a.effect?.getTiming().iterations===Infinity).length)).toBe(0);
 // 恢复三态：手动选择优先于滚动，文案随状态切换
 await goTo(page,'recovery');
 await page.getByRole('button',{name:'隔离',exact:true}).click();
 await expect(page.locator('[data-recovery]')).toHaveAttribute('data-state','2');
 await expect(page.locator('[data-recovery-text]')).toContainText('新的握手一律拒绝');
 // 画廊：点击与方向键都切换同一组标签
 await goTo(page,'product');
 await page.getByRole('tab',{name:'检查与修复',exact:true}).click();
 await expect(page.locator('#shot-repair')).toBeVisible();await expect(page.locator('#shot-launchpad')).toBeHidden();
 await page.keyboard.press('ArrowRight');await expect(page.getByRole('tab',{name:'发前预检',exact:true})).toHaveAttribute('aria-selected','true');
 for(const img of await page.locator('img:visible').all())await img.evaluate((el:HTMLImageElement)=>el.decode());
 // 弹簧过渡（≤480ms）落定后再审计，避免在选中态颜色渐变的半途取样
 await page.evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 const hrefs=await page.locator('a[href]').evaluateAll(es=>[...new Set(es.map(e=>(e as HTMLAnchorElement).href))]);
 // 站外下载只核对发布地址可达（HEAD、不跟随跳转），不拉取整个安装包
 for(const href of hrefs.filter(h=>!h.includes('#'))){const external=!href.startsWith(new URL(page.url()).origin);const r=external?await request.head(href,{maxRedirects:0}):await request.get(href);expect(r.status(),href).toBeLessThan(400);}
 // 空闲：落定之后整窗不再请求任何一帧
 await page.mouse.move(0,0);await page.waitForTimeout(3000);
 const before=await page.evaluate(()=>(window as any).__frames);await page.waitForTimeout(1000);
 expect(await page.evaluate(()=>(window as any).__frames)).toBe(before);
 expect(errors).toEqual([]);
});
test('immersive homepage keeps all content under reduced motion and without WebGL',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,type:string,...rest:unknown[]){return /webgl/.test(type)?null:(get as any).call(this,type,...rest);} as any;});
 await page.goto('/ClaudeBar-docs/');
 await expect(page.locator('html')).not.toHaveClass(/has-webgl/);
 // 平整纸带：同一份 HTML，首屏印在陶土纸上
 await expect(page.locator('#top')).toHaveCSS('background-color','rgb(168, 58, 12)');
 await page.locator('#download').scrollIntoViewIfNeeded();
 await expect(page.locator('#download-title')).toBeVisible();
 await expect(page.locator('#download .actions')).toHaveCSS('opacity','1');
});
// ---- 三界：滚动越过越界段后，纸色与强调色换界；三界只驱动环境，不印成文字；联动与声音开关不报错 ----
test('homepage crosses the three realms without printing design notes',async({page,isMobile})=>{
 test.setTimeout(120000);   // 无头浏览器用软件渲染跑全屏后期，比真机慢一个量级
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/ClaudeBar-docs/');await page.evaluate(()=>document.fonts.ready);
 const html=page.locator('html');
 await expect(html).toHaveAttribute('data-realm','text');
 for(const [id,realm] of [['gate','code'],['locale','token'],['download','text']]){
  await page.evaluate(id=>{const el=document.getElementById(id)!;scrollTo({top:el.offsetTop+el.offsetHeight/2-innerHeight/2,behavior:'instant'});},id);
  await expect(html).toHaveAttribute('data-realm',realm);
 }
 await expect(page.locator('[data-threshold]')).toHaveCount(3);
 // 自我标注不出现在页面上：三界名、遥测、刻度、引注
 const text=await page.locator('body').innerText();
 for(const word of ['TEXT','CODE','TOKEN','零帧','机器 · 心智','[1]'])expect(text).not.toContain(word);
 await expect(page.locator('.tick, .status, .note')).toHaveCount(0);
 // 场景图：五张图都在，每张都有读屏说明，图里不放文字
 await expect(page.locator('img.fig')).toHaveCount(5);
 for(const label of await page.locator('img.fig').evaluateAll(els=>els.map(el=>el.getAttribute('alt')??'')))expect(label).toMatch(/^示意：/);
 // 声音与触感默认关闭，只由用户手势开启
 const sense=page.getByRole('button',{name:'声音与触感'});
 await expect(sense).toHaveAttribute('aria-pressed','false');await sense.click();await expect(sense).toHaveAttribute('aria-pressed','true');
 await sense.click();await expect(sense).toHaveAttribute('aria-pressed','false');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBeTruthy();
 expect(errors).toEqual([]);
});
test('reduced motion still switches realm colours without mounting the scene',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/ClaudeBar-docs/');
 await page.evaluate(()=>{const el=document.getElementById('locale')!;scrollTo({top:el.offsetTop+el.offsetHeight/2-innerHeight/2,behavior:'instant'});});
 await expect(page.locator('html')).toHaveAttribute('data-realm','token');
 await expect(page.locator('html')).not.toHaveClass(/has-webgl/);
});
// ---- 减弱动态即使有 WebGL 也不挂载镜头穿越；脚本加载失败时内容不被隐藏 ----
test('reduced motion keeps a flat sheet even when WebGL is available',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/ClaudeBar-docs/');
 await expect(page.locator('html')).toHaveClass(/motion/);
 await expect(page.locator('html')).not.toHaveClass(/has-webgl/);
 await expect(page.locator('[data-world]')).toHaveCSS('position','relative');
 await expect(page.locator('h1')).toBeInViewport();
 await expect(page.locator('[data-mode="3d"]')).toBeDisabled();
});
// ---- 2D / 3D：切换后停在同一章，选择在重新载入后保留 ----
test('2D/3D switch flattens and re-curls the ribbon, keeping the chapter and the choice',async({page,isMobile})=>{
 test.skip(isMobile,'手机宽度下页头只放主要入口');
 test.setTimeout(120000);
 await page.goto('/ClaudeBar-docs/');await page.evaluate(()=>document.fonts.ready);
 const html=page.locator('html'),flat=page.locator('[data-mode="2d"]'),curl=page.locator('[data-mode="3d"]');
 await expect(html).toHaveClass(/has-webgl/);await expect(curl).toHaveAttribute('aria-pressed','true');
 await goTo(page,'leak');await page.waitForTimeout(1500);
 await flat.click();
 await expect(html).not.toHaveClass(/has-webgl/);await expect(flat).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-world]')).toHaveCSS('position','relative');
 await expect(page.locator('#leak-title')).toBeInViewport();
 expect(await page.locator('#leak-title').evaluate((el)=>el.style.transform)).toBe('');
 await page.reload();await expect(html).not.toHaveClass(/has-webgl/);
 await page.locator('[data-mode="3d"]').click();
 await expect(html).toHaveClass(/has-webgl/);await expect(page.locator('[data-world]')).toHaveCSS('position','fixed');
});
// ---- 磁吸：只在停得离最佳展示位很近时吸正（章节进度恰好为 1）；远一点不干预 ----
test('ribbon gently snaps only a very near resting position to the chapter\'s best display position',async({page,isMobile})=>{
 test.skip(isMobile,'触控滚动的惯性由系统处理，磁吸只在桌面合成滚动下验收');
 test.setTimeout(120000);
 await page.goto('/ClaudeBar-docs/');
 test.skip(!(await page.locator('html').evaluate(el=>el.classList.contains('has-webgl'))),'无 WebGL 时是平整纸带，不磁吸');
 await goTo(page,'gate');
 const best=await page.evaluate(()=>scrollY);
 await page.evaluate(y=>scrollTo({top:y+innerHeight*0.06,behavior:'instant'}),best);
 await expect.poll(()=>page.evaluate(()=>scrollY),{timeout:5000}).toBe(best);
 await expect(page.locator('#gate')).toHaveAttribute('data-p','1.000');
 await expect(page.locator('[data-chapter-link][href="#gate"]')).toHaveAttribute('aria-current','step');
 // 停得远一些就不吸：自由滚动的手感优先
 const far=await page.evaluate(y=>{const t=Math.round(y+innerHeight*0.3);scrollTo({top:t,behavior:'instant'});return t;},best);
 await page.waitForTimeout(1200);
 expect(await page.evaluate(()=>scrollY)).toBe(far);
});
test('homepage content stays visible when the script bundle fails to load',async({page})=>{
 await page.route('**/designs/assets/home.bundle.js',route=>route.abort());
 await page.goto('/ClaudeBar-docs/');
 await expect(page.locator('html')).not.toHaveClass(/motion/);
 for(const id of ['#gate','#recovery','#download'])await expect(page.locator(`${id} h2`)).toHaveCSS('opacity','1');
 await expect(page.locator('.hero .lead')).toHaveCSS('opacity','1');
});
