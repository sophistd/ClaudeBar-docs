/**
 * [INPUT]: 已核对的 ClaudeBar 文档与 Vercel 页面结构、共享样式、ui-controls.js 行为和字体。
 * [OUTPUT]: 沉浸式首页（home-source.mjs + home.bundle.js，出包前先过 home-taste.mjs 的品味门禁）、三个静态页面、完整 UI Kit、原创 SVG 与按需加载的光学场景包。
 * [POS]: designs 的内容与组件组合源，与 Docs 同时构建并发布。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import {writeFileSync,copyFileSync} from 'node:fs';
import {build as bundle} from 'esbuild';
import {kitButton,renderKit} from './kit-source.mjs';
import {renderSiteNavigation} from '../public/scripts/site-navigation.mjs';
import {renderHome} from './home-source.mjs';
import {auditHome} from './home-taste.mjs';
import {RELEASE} from './release.mjs';
const root=new URL('./',import.meta.url);
const arrow='<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const paths={gate:'M5 21V3h14v18M9 21V7h6v14M3 21h18',layers:'m3 7 9-4 9 4-9 4-9-4Zm0 5 9 4 9-4M3 17l9 4 9-4',check:'m5 12 4 4L19 6',activity:'M2 12h5l3-8 4 16 3-8h5',shield:'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Zm-4 9 3 3 5-6',command:'M8 8H5a3 3 0 1 1 3-3v14a3 3 0 1 1-3-3h14a3 3 0 1 1-3 3V5a3 3 0 1 1 3 3H8Z',browser:'M3 8h18M7 5h.1M10 5h.1M3 3h18v18H3Z',download:'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',info:'M12 11v6m0-10v.1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z'};
const icon=(name,cls='icon')=>`<svg class="${cls}" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="${paths[name]}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const brand=()=>`${icon('gate','brand-mark')}<span>ClaudeBar</span>`;
const button=(text,href,primary=false)=>kitButton(text,{href,variant:primary?'primary':'',className:'button'});
const link=(text,href)=>`<a class="text-link" href="${href}">${text}${arrow}</a>`;
const docs=(path='')=>`/ClaudeBar-docs/zh/${path}`;
const title=(id,text,desc)=>`<title id="${id}-title">${text}</title><desc id="${id}-desc">${desc}</desc>`;
const svg=(id,w,h,body,desc)=>`<svg class="illustration" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${id}-title ${id}-desc">${title(id,desc,desc)}${body}</svg>`;
const node=(x,y,w,label,sub='')=>`<rect class="node" x="${x}" y="${y}" width="${w}" height="64" rx="6"/><text x="${x+w/2}" y="${y+(sub?27:38)}" text-anchor="middle">${label}</text>${sub?`<text class="muted" x="${x+w/2}" y="${y+47}" text-anchor="middle">${sub}</text>`:''}`;
const centerGate=(x,y)=>`<g transform="translate(${x} ${y})"><rect width="88" height="88" rx="18" fill="#171717"/><path d="M26 64V23h36v41M36 64V33h16v31M21 64h46" fill="none" stroke="white" stroke-width="2.5" stroke-linejoin="round"/><circle cx="70" cy="18" r="3" fill="#fff"/></g>`;
function heroNetwork(){
 let s='';
 
 s+=`<path class="wire" d="M212 116H346Q370 116 370 140V180Q370 204 394 204H556M212 292H346Q370 292 370 268V228Q370 204 394 204M644 204H778Q802 204 802 180V140Q802 116 826 116H988"/>`;
 s+=`<path class="wire" d="M988 292H740Q700 292 700 252V248Q700 232 676 232H644" stroke-dasharray="4 5"/><path class="strong-wire" d="m650 228-6 4 6 4"/>`;
 s+=node(52,84,160,'浏览器会话','独立数据目录')+node(52,260,160,'受管应用','显式接入门禁');
 s+=centerGate(556,160)+`<text x="600" y="278" text-anchor="middle">本机回环门禁</text><text class="tiny" x="600" y="300" text-anchor="middle">127.0.0.1</text>`;
 s+=node(988,84,160,'上游代理','配置指定的线路')+node(988,260,160,'出口基线','用于恢复时核对');
 s+=`<circle class="signal" cx="394" cy="204" r="4"/><circle class="dot" cx="802" cy="204" r="3"/><path d="m540 200 5 4-5 4M972 112l5 4-5 4" class="strong-wire"/>`;
 return svg('hero-network',1200,396,s,'浏览器与受管应用接入本机门禁，由上游代理转发；门禁依据出口基线判断恢复。');
}
function featureArt(){
 let s='';for(let x=32;x<=480;x+=32)for(let y=32;y<=384;y+=32)s+=`<circle cx="${x}" cy="${y}" r=".8" fill="#d5d5d5"/>`;
 s+=`<rect x="176" y="118" width="160" height="160" rx="80" fill="#fafafa" stroke="#e6e6e6"/><circle cx="256" cy="198" r="120" fill="none" stroke="#ebebeb"/>`;
 s+=`<path class="strong-wire" d="M24 198H212M300 198H488"/><path d="m480 193 8 5-8 5" class="strong-wire"/>${centerGate(212,154)}<circle cx="96" cy="198" r="4" fill="#0070f3"/><circle cx="416" cy="198" r="4" fill="#0070f3"/>`;
 s+=``;
 return svg('feature-art',512,400,s,'受管连接通过本机门禁，门禁基于核验后的出口身份决定放行。');
}
function sessionsArt(){
 let s=`<path class="wire" d="M600 0V380"/>`;
 for(const [offset,name,sub,tag] of [[0,'工作会话','独立数据目录 A','档案 A'],[600,'个人会话','独立数据目录 B','档案 B']]){
 s+=`<g transform="translate(${offset} 0)"><rect class="node" x="100" y="54" width="400" height="230" rx="8"/><path class="wire" d="M100 90H500"/><circle cx="120" cy="72" r="3" fill="#d5d5d5"/><circle cx="132" cy="72" r="3" fill="#d5d5d5"/><circle cx="144" cy="72" r="3" fill="#d5d5d5"/><text class="tiny" x="480" y="77" text-anchor="end">${tag}</text><rect class="soft" x="124" y="116" width="72" height="72" rx="36"/><path class="strong-wire" d="M148 154a12 12 0 1 1 24 0m-32 22a20 14 0 0 1 40 0"/><text class="emphasis" x="220" y="143">${name}</text><text class="muted" x="220" y="169">${sub}</text><path class="wire" d="M124 212H476"/><text class="muted" x="124" y="248">浏览器实例</text><text x="476" y="248" text-anchor="end">单独打开</text><path class="strong-wire" d="M300 284V322"/><rect class="node" x="208" y="322" width="184" height="40" rx="6"/><text x="300" y="347" text-anchor="middle">各自配置的门禁</text></g>`;
 }
 return svg('sessions-art',1200,400,s,'工作和个人会话各用独立浏览器数据目录与配置的门禁路径；两个会话并列且没有数据连线。');
}
function accessArt(){
 const s=`<path class="wire" d="M64 338H448M256 72V338" stroke-dasharray="4 6"/><ellipse cx="256" cy="338" rx="136" ry="20" fill="#f2f2f2"/><path d="m138 136 118-46 118 46-118 47-118-47Z" fill="#fff" stroke="#d6d6d6"/><path d="M138 136v136l118 48V183L138 136Z" fill="#fafafa" stroke="#d6d6d6"/><path d="M256 183v137l118-48V136l-118 47Z" fill="#f2f2f2" stroke="#d6d6d6"/><path d="m198 113 118 47v49l-30 12v-49l-118-47" fill="#e6e6e6" stroke="#d6d6d6"/><path d="M170 237v-46l38 15v46m-27-4v-29l16 6v29" fill="none" stroke="#171717" stroke-width="3"/><text class="tiny" x="300" y="270" transform="rotate(-22 300 270)">macOS</text>`;
 return svg('access-art',512,400,s,'ClaudeBar macOS 安装包的示意图。');
}
function mobileNetwork(){
 const s=node(20,28,140,'受管会话','浏览器或应用')+node(200,28,140,'出口基线','恢复时核对')+`<path class="strong-wire" d="M90 92V158Q90 180 112 180H136"/><path class="wire" d="M270 92V158Q270 180 248 180H224" stroke-dasharray="4 5"/>${centerGate(136,136)}<text x="180" y="256" text-anchor="middle">本机回环门禁</text><path class="strong-wire" d="M180 276V314m-4-6 4 6 4-6"/>`+node(100,322,160,'上游代理');
 return svg('mobile-network',360,418,s,'受管会话接入门禁，由上游代理转发。出口基线为恢复提供判断依据。');
}
function mobileSessions(){
 let s='';for(const [y,label,data] of [[24,'工作会话','独立数据目录 A'],[238,'个人会话','独立数据目录 B']])s+=`<g transform="translate(24 ${y})"><rect class="node" width="312" height="180" rx="8"/><path class="wire" d="M0 32H312"/><circle cx="16" cy="16" r="3" fill="#d5d5d5"/><circle cx="28" cy="16" r="3" fill="#d5d5d5"/><circle cx="40" cy="16" r="3" fill="#d5d5d5"/><text class="emphasis" x="24" y="72">${label}</text><text class="muted" x="24" y="98">${data}</text><path class="wire" d="M24 122H288"/><text class="muted" x="24" y="152">连接路径</text><text x="288" y="152" text-anchor="end">各自配置的门禁</text></g>`;
 return svg('mobile-sessions',360,444,s,'工作和个人会话各自使用独立浏览器数据目录与配置的门禁。');
}
function mobileRecovery(){
 const rows=[['出口身份匹配','放行'],['无新观测、无拒绝','沿用旧基线'],['实测出口漂移','隔离'],['探测拒绝且到期','隔离']];
 let body=node(80,16,200,'新的握手等待');
 body+='<path class="wire" d="M180 80V104H16V370"/>';
 rows.forEach(([condition,result],i)=>{const y=110+i*76;body+=`<path class="wire" d="M16 ${y+28}H30"/><rect class="node" x="30" y="${y}" width="310" height="56" rx="6"/><text class="muted" x="44" y="${y+33}">${condition}</text><text x="326" y="${y+33}" text-anchor="end">${result}</text>`;});
 return svg('mobile-recovery',360,414,body,'等待后的四条恢复分支：身份匹配放行；没有新观测且没有拒绝则沿用旧基线；实测漂移或拒绝到期则隔离。');
}
const responsive=(desktop,mobile)=>`<div class="desktop-illustration">${desktop}</div><div class="mobile-illustration">${mobile}</div>`;
function shell(file,pageTitle,body){return `<!doctype html>
<!-- [INPUT]: build.mjs 的公开内容、共享组件与 Geist 样式。
     [OUTPUT]: ${pageTitle} 静态页。
     [POS]: designs 的生成样页，请修改 build.mjs。
     [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md -->
<html lang="zh-CN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="description" content="${pageTitle} — ClaudeBar macOS 网络出口与浏览器会话工具。"/><title>${pageTitle} · ClaudeBar</title><link rel="canonical" href="https://sophistd.github.io/ClaudeBar-docs/${file==='index.html'?'':'designs/'+file}"/><link rel="stylesheet" href="styles.css"/><link rel="stylesheet" href="../public/styles/ui-kit.css"/><link rel="stylesheet" href="optical.css"/><script src="../public/scripts/ui-controls.js"></script><script src="interactions.js" defer></script></head><body><a class="skip" href="#main">跳至正文</a><header class="topbar cb-site-header"><div class="nav"><a href="/ClaudeBar-docs/" class="brand" aria-label="ClaudeBar 首页">${brand()}</a><div class="links cb-nav" id="nav-links">${renderSiteNavigation('product')}</div><div class="nav-end"><select class="cb-select cb-theme" data-cb-theme aria-label="选择主题"><option value="light">浅色</option><option value="dark">深色</option><option value="auto">自动</option></select>${file === 'index.html' ? '' : `<a class="button compact" href="access.html"${file==='access.html'?' aria-current="page"':''}>获取 ClaudeBar</a>`}<button class="menu" disabled aria-label="打开菜单" aria-controls="nav-links" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16M4 16h16" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></button></div></div></header><main class="frame" id="main">${body}</main><footer class="footer"><span>ClaudeBar · 独立项目，未获 Anthropic 背书。</span><nav aria-label="页尾导航"><a href="${docs('concepts/security/')}">保护边界</a><a href="${docs('project/status/')}">验证记录</a><a href="${docs('project/faq/')}">常见问题</a></nav></footer></body></html>`}
const closing=(titleText,desc,cta,href)=>`<section class="closing"><div><h2>${titleText}</h2><p>${desc}</p></div><div class="actions">${button(cta,href,true)}</div></section>`;
const boundary=(text)=>`<aside class="boundary">${icon('info')}<p>${text}</p></aside>`;
const pages={
'network.html':['网络出口与门禁',`
<section class="hero split"><div><h1>先核验出口。<br/>再放行连接。</h1><p class="lead">把连接路径和恢复条件放在一起管理。上游中断后，知道门禁为什么等待、恢复或隔离。</p><div class="actions">${button('配置受管连接',docs('start/first-setup/'),true)}${button('查看工作原理',docs('concepts/network-egress/'))}</div></div><div class="hero-art studio"><img src="assets/gateway-studio.webp" width="1536" height="1024" alt="层叠门框的光与投影，门禁边界的材质示意" fetchpriority="high"/></div></section>
<section class="section white"><div class="section-intro"><h2>一条明确的受管路径。</h2><p>应用接入本机回环门禁，再由档案指定的上游代理转发。转发层传递隧道字节，无需安装 TLS 拦截证书。</p></div><div class="grid-art">${responsive(heroNetwork(),mobileNetwork())}</div></section>
<section class="section"><div class="section-intro"><h2>中断后，每一步都有条件。</h2><p>新的握手先等待。门禁根据恢复观测与到期条件，决定下一步。</p></div><div class="state-demo"><div class="cb-segmented" data-cb-choice role="group" aria-label="选择门禁示意状态"><button type="button" aria-pressed="true" data-state="open">放行</button><button type="button" aria-pressed="false" data-state="wait">等待</button><button type="button" aria-pressed="false" data-state="isolated">隔离</button></div>${responsive('<img src="../public/diagrams/recovery-zh.svg" width="780" height="330" alt="恢复条件分为出口匹配、无新观测、实测漂移和到期拒绝"/>',mobileRecovery())}<p class="state-label" data-state-description aria-live="polite">已有核验基线，允许新的受管连接握手。</p><p class="switch-note">教学示意，不连接真实网络。</p></div></section>
<section class="two-up feature-strip"><article class="cell">${icon('check')}<h2 style="font-size:24px">匹配后恢复。</h2><p>恢复观测与出口基线匹配时重新放行。严格固定 IP 开启时，还要核对出口 IP。</p></article><article class="cell">${icon('shield')}<h2 style="font-size:24px">漂移时隔离。</h2><p>实测出口身份漂移会立即隔离。记录到探测拒绝且到期仍未恢复，也会隔离。</p></article></section>
${boundary('若到期时没有新观测、也没有探测拒绝，门禁会沿用旧基线恢复；这一次恢复没有重新核验出口。')}
${closing('把实际观测查清楚。','从诊断记录确认这次连接发生了什么。','阅读诊断指南',docs('guides/diagnostics/'))}`],
'sessions.html':['浏览器会话隔离',`
<section class="hero center sessions-hero"><h1>不同账号。<br/>各自的会话空间。</h1><p class="lead">工作与个人会话各自使用独立数据目录。<br/>需要沿用登录时，也清楚地知道连接边界。</p><div class="actions">${button('配置浏览器会话',docs('guides/configuration/'),true)}${button('查看兼容性',docs('reference/compatibility/'))}</div></section>
<div class="studio-wide"><img src="assets/sessions-studio.webp" width="1536" height="1024" alt="相互独立的陶瓷与玻璃会话面板，各自具有清楚的实体边界" fetchpriority="high"/></div>
<section class="section"><div class="section-intro"><h2>先选择登录数据，<br/>再确认网络路径。</h2><p>这两件事彼此相关，但不能用其中一件代替另一件。</p></div><div class="table-scroll" tabindex="0" aria-label="两种会话模式对比，可横向滚动"><table class="compare"><thead><tr><th scope="col">你要决定的事</th><th scope="col">单独打开</th><th scope="col">用现有登录</th></tr></thead><tbody><tr><th scope="row">登录数据</th><td>独立的数据目录</td><td>沿用已有浏览器数据</td></tr><tr><th scope="row">网络配置</th><td>注入门禁代理配置</td><td>继续使用浏览器原有设置</td></tr><tr><th scope="row">受管范围</th><td>这次启动的实例与连接路径</td><td>不会因打开前检查而自动受管</td></tr><tr><th scope="row">浏览器支持</th><td>受支持的 Chromium 浏览器</td><td>依本机扫描结果提供选项</td></tr></tbody></table></div></section>
<section class="section split-section"><div><h2>多开一个窗口，<br/>不等于多一份身份。</h2><p>两个档案如果绑定同一个浏览器数据容器，可能仍共享登录。要分开账号，应选择不同的受支持子配置档案，或使用独立的受控沙箱。</p>${link('阅读会话隔离说明',docs('concepts/sessions/'))}</div><ol class="line-list"><li><b>01</b><div><h3>选择配置档案</h3><p>确定这次使用的代理和浏览器。</p></div></li><li><b>02</b><div><h3>选择会话模式</h3><p>单独打开，或者用现有登录。</p></div></li><li><b>03</b><div><h3>核对实际实例</h3><p>从工作台确认这次启动的进程是否受管。</p></div></li></ol></section>
${boundary('独立数据目录不是虚拟机或系统用户隔离。已有浏览器窗口的登录状态与网络路径，仍需逐个确认。')}
${closing('让第一个会话跑通。','选择档案，核验出口，然后启动。','首次配置指南',docs('start/first-setup/'))}`],
'access.html':['获取 ClaudeBar',`
<section class="hero split"><div class="access-hero"><h1>把连接边界，<br/>带回你的 Mac。</h1><p class="lead">ClaudeBar 是一款原生 macOS 工具。<br/>已通过 Developer ID 签名与 Apple 公证，下载后拖入「应用程序」即可使用。</p><div class="actions">${button(`下载 ClaudeBar ${RELEASE.version} (DMG)`,RELEASE.dmg,true)}${button('阅读安装说明',docs('start/installation/'))}</div><p class="hero-note">macOS 14+ · Apple Silicon · Apple Notarized · SHA-256 前缀 <code>${RELEASE.sha}</code></p></div><div class="hero-art studio"><img src="assets/package-studio.webp" width="1536" height="1024" alt="具有铝制边缘、陶瓷正面与玻璃背板的安装包示意" fetchpriority="high"/></div></section>
<section class="section white access-grid"><div><h2>安装前，确认这些。</h2><p class="lead" style="font-size:16px">系统版本只是起点。还需要可用的代理，以及你选用的浏览器。</p>${link('查看完整兼容范围',docs('reference/compatibility/'))}</div><dl class="requirement-list"><div><dt>操作系统</dt><dd>macOS 14 或更高版本</dd></div><div><dt>网络</dt><dd>可访问的上游代理</dd></div><div><dt>浏览器</dt><dd>已安装所选模式支持的浏览器</dd></div><div><dt>源码构建</dt><dd>仓库权限 · Swift 6.2 或兼容工具链</dd></div></dl></section>
<section class="section"><div class="section-intro"><h2>从获取到第一次连接。</h2></div><div class="three-up"><article class="cell"><div class="eyebrow mono">01</div><h3>确认来源</h3><p>向维护者核对版本、适用机型与公证状态。</p></article><article class="cell"><div class="eyebrow mono">02</div><h3>安装应用</h3><p>收到 DMG 后按说明安装，保留 macOS 的安全检查。</p></article><article class="cell"><div class="eyebrow mono">03</div><h3>配置会话</h3><p>选择档案和浏览器，核验出口，再启动受管会话。</p></article></div></section>
<section class="section faq"><h2>获取前的几个问题。</h2><details><summary>是否需要关闭 macOS 的安全检查？</summary><p>不需要。若系统拦下来源尚未核实的版本，请保留安全检查，先向维护者核实安装包和说明。</p></details><details><summary>可以从源码构建吗？</summary><p>需要应用仓库的访问权限。准备 Swift 6.2 或兼容工具链，按<a class="color-link" href="${docs('developers/build/')}">构建与测试文档</a>操作。</p></details><details><summary>系统扩展会随普通构建自动启用吗？</summary><p>不会。系统扩展需要相应签名、entitlement、配置描述文件与 macOS 批准，必须单独部署和验证。</p></details></section>
${closing('已经拿到授权版本？','从一个档案、一条线路开始。','完成首次配置',docs('start/first-setup/'))}`]
};
for(const [name,[heading,body]] of Object.entries(pages))writeFileSync(new URL(name,root),shell(name,heading,body));
for(const [name,art] of Object.entries({'network':heroNetwork(),'gate':featureArt(),'sessions':sessionsArt(),'package':accessArt()})) {
 const style='<style>text{font:15px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;fill:#171717}.muted{fill:#666;font-size:12px}.wire{fill:none;stroke:#a8a8a8;stroke-width:1}.strong-wire{fill:none;stroke:#171717;stroke-width:1.5}.node{fill:white;stroke:#e6e6e6}.soft{fill:#fafafa;stroke:#e6e6e6}.dot{fill:#171717}.tiny{font:11px monospace;fill:#666}.emphasis{font-size:18px;font-weight:500}.signal{fill:#0070f3}</style>';
 writeFileSync(new URL(`assets/${name}.svg`,root),art.replace('</svg>',style+'</svg>'));
}
writeFileSync(new URL('ui-kit.html',root),renderKit());
// 品味门禁：首页源文件不过 Good/Bad 双向规则就不出包
const taste=auditHome();if(taste.length){console.error(taste.join('\n'));process.exit(1);}
writeFileSync(new URL('index.html',root),renderHome());
await bundle({entryPoints:[new URL('optics-scene.mjs',root).pathname],outfile:new URL('assets/optics.bundle.js',root).pathname,bundle:true,format:'esm',minify:true,legalComments:'linked',target:'es2022'});
await bundle({entryPoints:[new URL('home.mjs',root).pathname],outfile:new URL('assets/home.bundle.js',root).pathname,bundle:true,format:'esm',minify:true,legalComments:'linked',target:'es2022'});
copyFileSync(new URL('../node_modules/three/LICENSE',root),new URL('assets/THREE-LICENSE.txt',root));
console.log('Generated immersive homepage, 3 static pages, UI Kit, SVG illustrations and on-demand optics bundle.');
