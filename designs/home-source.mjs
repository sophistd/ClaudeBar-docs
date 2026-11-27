/**
 * [INPUT]: 依赖 ../public/scripts/site-navigation.mjs 的 renderSiteNavigation、./release.mjs 的最新正式版、
 *          ./home-tokens.mjs 的 REALMS/SCENE_REALM/CROSSINGS/cssText；./figures/studio-scenes.mjs 的五张场景图（离线渲成 assets/figures/*.webp）；其余公开事实取自现有文档。
 * [OUTPUT]: 对外提供 renderHome() → 纸带产品首页完整 HTML 字符串、portalMark() 品牌标记。
 * [POS]: 首页四层柔性编码的第三层（组件与自适应组合），也是文案与结构的唯一来源，由 build.mjs 写成 index.html。
 *        组件只声明"我是什么"：data-realm 归属哪一界、data-kit 是哪种微件、data-bind 读哪个环境键、--i 是第几项；
 *        怎么动、什么颜色、发什么声，由 home-tokens / home-kit 的环境决定。结构契约：.sheet 是一节纸、.col 的直接子元素是
 *        纸片、data-snap 标最佳展示位、data-anchor 标引线落点、data-hold/data-pin 标驻留段。卷曲归 home-ribbon，3D 归 home-scene，样式归 home.css。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { readFileSync } from 'node:fs';
import { renderSiteNavigation } from '../public/scripts/site-navigation.mjs';
import { RELEASE } from './release.mjs';
import { kitButton } from './kit-source.mjs';
import { REALMS, SCENE_REALM, CROSSINGS, RIBBON, cssText } from './home-tokens.mjs';
import { FIGURE_SCENES } from './figures/studio-scenes.mjs';

// 场景图：figures/render.mjs 离线渲好的透明底 PBR 图，页面只加载 WebP；首屏那张立即加载，其余懒加载
const FIGURE_SIZES = JSON.parse(readFileSync(new URL('./assets/figures/sizes.json', import.meta.url), 'utf8'));
const FIGURES = Object.fromEntries(Object.entries(FIGURE_SCENES).map(([id, spec]) => [id, () =>
  `<img class="fig" src="assets/figures/${id}.webp" width="${FIGURE_SIZES[id].width}" height="${FIGURE_SIZES[id].height}" alt="${spec.label}" loading="${spec.chapter === 'hero' ? 'eager' : 'lazy'}" decoding="async"/>`]));

// ============================================================================
//  公开事实：版本信息来自 release.mjs（读取 releases.json），页面不写死版本
// ============================================================================
// 版本、下载与校验前缀来自 releases.json，发版不必改页面
const docs = (path = '') => `/ClaudeBar-docs/zh/${path}`;
const arrow = '<svg class="arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** 应用图标的门框几何（右侧开口圆角方框 + 陶土锚点）：只作页头与页脚的品牌标记，不进 3D 场景。 */
export const portalMark = (cls = 'mark') => `<svg class="${cls}" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M15.2 6v-.4a2.8 2.8 0 0 0-2.8-2.8H5.6a2.8 2.8 0 0 0-2.8 2.8v6.8a2.8 2.8 0 0 0 2.8 2.8h6.8a2.8 2.8 0 0 0 2.8-2.8V12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="10" cy="9" r="1.2" fill="#d97757"/></svg>`;

const downloadIcon = '<svg class="icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2.5v8m-3.5-3.5L8 10.5 11.5 7M3 13.5h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// ============================================================================
//  页尾：一行定位 + 三列去处 + 发布状态。只链接已存在的页面与发布记录
// ============================================================================
const FOOTER_COLUMNS = [
  ['产品', [['门禁路径', 'network.html'], ['会话隔离', 'sessions.html'], ['获取方式', 'access.html']]],
  ['文档', [['认识 ClaudeBar', docs('start/introduction/')], ['首次配置', docs('start/first-setup/')], ['诊断指南', docs('guides/diagnostics/')], ['命令行参考', docs('reference/cli/')]]],
  ['项目', [['保护边界', docs('concepts/security/')], ['验证记录', docs('project/status/')], ['常见问题', docs('project/faq/')], ['发布说明', RELEASE.notes]]],
];
const footer = () => `<footer class="foot" data-slab><div class="foot-inner">
  <div class="foot-lead">
    <a href="/ClaudeBar-docs/" class="brand" aria-label="ClaudeBar 首页">${portalMark()}<span>ClaudeBar</span></a>
    <p>Mac 菜单栏里的出口门禁，加上分开的浏览器会话。</p>
    ${kitButton(`${downloadIcon}<span>下载 ${RELEASE.version}</span>`, { href: RELEASE.dmg, variant: 'small' })}
  </div>
  ${FOOTER_COLUMNS.map(([title, items]) => `<nav class="foot-col" aria-label="${title}"><h2>${title}</h2><ul>${items.map(([label, href]) => `<li><a href="${href}">${label}</a></li>`).join('')}</ul></nav>`).join('')}
  <div class="foot-base">
    <span>独立项目，未获 Anthropic 背书。</span>
    <span class="legend"><i aria-hidden="true"></i>虚线框里是示意；数字与截图用的是演示数据。</span>
  </div>
</div></footer>`;

const button = (text, href, { primary = false, icon = '' } = {}) =>
  kitButton(`<span>${text}</span>${icon}`, { href, variant: primary ? 'primary large' : 'large', attributes: primary ? 'data-magnet' : '' });
// 立体层（只在卷曲版生效）：标题立起、按钮浮起斜立、界面截图斜立在纸上，数值取自 RIBBON.stand
const S = RIBBON.stand;
const standing = `data-stand="${S.heading}" data-float="${S.float}"`;
const floating = `data-stand="${S.button}" data-float="${S.lift}"`;
const shot = (file, alt, { w = 2080, h = 1360, cls = '' } = {}) =>
  `<figure class="stand-shot${cls ? ` ${cls}` : ''}" data-stand="${S.shot}" style="--depth:${S.depth}px"><img src="../public/screenshots/${file}" width="${w}" height="${h}" alt="${alt}" loading="lazy" decoding="async"/></figure>`;
const points = (items) => `<ul class="points">${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
// 面板头：参考稿面板的 18px 标题 + 两三行说明 + 一枚深色小按钮
const pill = (text, href) => kitButton(`${text}${arrow}`, { href, variant: 'small', className: 'cb-button pill' });
const plateHead = (title, text, link = '') => `<header class="plate-head"><h3>${title}</h3>${text ? `<p>${text}</p>` : ''}${link}</header>`;
// 场景图面板：一张画出"顷刻"的图 + 一枚入口按钮；图自己说明发生了什么，面板只给一个短名
const scene_ = (fig, title, link) => `<div class="plate figure-plate" data-anchor>
      ${plateHead(title, '', link)}
      ${fig}
    </div>`;
const more = (text, href) => kitButton(`${text}${arrow}`, { href, variant: 'ghost small', className: 'cb-button more' });

// 当前版本工作台的截图（演示数据）
const SHOTS = [
  ['launchpad', '启动台', 'workbench-overview-dark.png', 'ClaudeBar 启动台：主通道 US-Primary 已放行，下方列出五个受控入口及各自通道'],
  ['repair', '检查与修复', 'workbench-topology-dark.png', 'ClaudeBar 检查与修复：出口、检查、同一出口与风险四项指标，左侧风险关系，右侧 22 项检查'],
  ['preflight', '发前预检', 'workbench-preflight-dark.png', 'ClaudeBar 发前预检：分阶段判定，左侧原文与改写结果，右侧风险分布'],
];

const CHAPTERS = [
  ['gate', '01', '出口核验'], ['leak', '02', '流量绕路'], ['recovery', '03', '断网之后'],
  ['sessions', '04', '同机多号'], ['locale', '05', '时区错位'], ['product', '06', '工作台'], ['download', '07', '下载'],
];

// 属于哪一界由 home-tokens 的 SCENE_REALM 决定，组件不自己写颜色
const scene = (id) => `data-scene="${id}" data-realm="${SCENE_REALM[id]}"`;

// ============================================================================
//  纸带上的一节：每个 .col 的直接子元素是一块"纸片"，各自随纸面卷曲；
//  data-anchor 标出左侧索引引线的落点，data-snap 让磁吸知道这一节的最佳展示位
// ============================================================================
function chapter(id, body) {
  return `<section class="sheet chapter" id="${id}" ${scene(id)} data-chapter data-snap aria-labelledby="${id}-title">
  <div class="col">
    ${body}
  </div></section>`;
}

// ============================================================================
//  越界：纸面在这一段换色（来处 → 去处），文字只说去处是什么。
//  渐变那块纸片与 WebGL 纸面读同一段文档坐标，两相同时换色
// ============================================================================
function threshold(before) {
  const [, from, to] = CROSSINGS.find(([id]) => id === before);
  return `<div class="sheet threshold" id="to-${before}" data-threshold data-from="${from}" data-to="${to}" data-realm="${to}">
  <div class="col">
    <div class="fade" data-fade data-skip-rest aria-hidden="true" style="--from: var(--sheet-${from}); --to: var(--sheet-${to})"></div>
  </div>
</div>`;
}

// ============================================================================
//  章节里的小图：每一项只带自己的序号 --i，点亮与否由章节的滚动进度 --p 决定（home.mjs 写在章节上）
// ============================================================================
const FLOW = [['应用'], ['127.0.0.1'], ['上游代理'], ['出口']];
const flow = () => `<div class="plate flow-plate" data-anchor>
      ${plateHead('一条受管连接的四站', '', pill('看门禁路径', 'network.html'))}
      <ol class="flow" style="--n:${FLOW.length}" aria-label="一条受管连接依次经过的四站">${FLOW.map(([name], i) => `<li style="--i:${i}"><b>${name}</b></li>`).join('')}</ol>
    </div>`;

// 时区错位：出口、时区、语言三项，对齐前后
const LOCALE = [['出口', '美国', '美国'], ['时区', 'UTC+8', 'UTC−5'], ['语言', 'zh-CN', 'en-US']];
const locale = () => `<div class="plate locale-plate is-specimen" data-anchor>
      ${plateHead('启动前对齐', '')}
      <dl class="align" aria-label="示意：出口在美国时，受管进程的时区与语言跟着对齐">${LOCALE.map(([key, before, after]) => `<div${before === after ? ' class="is-anchor"' : ''}><dt>${key}</dt><dd><s>${before}</s><b>${after}</b></dd></div>`).join('')}</dl>
    </div>`;

const senseIcon = '<svg class="icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.5 6.2h2.2L8 3.4v9.2L4.7 9.8H2.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path class="wave" d="M10.4 5.8a3.1 3.1 0 0 1 0 4.4M12.2 4a5.6 5.6 0 0 1 0 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path class="mute" d="M10.6 6.4l3 3.2m0-3.2l-3 3.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';

const sections = () => `
<section class="sheet hero" id="top" ${scene('hero')} data-snap aria-labelledby="hero-title">
  <div class="col">
    <h1 id="hero-title" data-split ${standing}>网络一抖，<br/>账号又用不了。</h1>
    <p class="badge"><span class="pulse"></span>macOS 14+ · Apple Silicon · ${RELEASE.version} · 已公证</p>
    <p class="lead">Wi-Fi 一换、代理一跳，出口就漂到了别的国家。<br class="wide"/>ClaudeBar 在菜单栏里先核验出口：漂了就先停下，不带着错的出口去连接。</p>
    <div class="actions" ${floating}>${button(`下载 ${RELEASE.version}`, RELEASE.dmg, { primary: true, icon: arrow })}${button('看它怎么拦', '#gate')}</div>
    <div class="hero-figure">${FIGURES.drift()}</div>
    ${shot('menu-panel-firstrun-light.png', 'ClaudeBar 菜单栏面板：首次运行时的连接状态与入口', { w: 712, h: 388, cls: 'is-panel' })}
  </div>
</section>

${threshold('gate')}

${chapter('gate', `
    <h2 id="gate-title" ${standing}>先核验，<br/>再放行。</h2>
    ${points(['应用先连本机门禁，门禁再交给档案指定的代理。', '启动前，核验出口的国家和 IP。', '对不上就不启动；中途漂了，就隔离会话。'])}
    ${flow()}
    ${shot('workbench-overview-dark.png', 'ClaudeBar 启动台：主通道已放行，下方列出受控入口及各自通道')}`)}

${chapter('leak', `
    <h2 id="leak-title" ${standing}>代理开着，<br/>流量还在绕路。</h2>
    ${points(['DNS、IPv6、WebRTC、QUIC 都可能绕开代理。', '绕出去的一小段，会带出真实位置。', 'ClaudeBar 用受管启动参数和本地探针把旁路盖住。', '有公网 IPv6 时标为「参数缓解」，不冒充实测。'])}
    ${scene_(FIGURES.leak(), '四条旁路', pill('看保护范围', docs('concepts/security/')))}`)}

<section class="sheet chapter recovery" id="recovery" ${scene('recovery')} data-chapter data-snap data-hold data-recovery data-state="0" aria-labelledby="recovery-title">
  <div class="col">
    <h2 id="recovery-title" ${standing}>网络断了，<br/>该等还是该查？</h2>
    ${points(['切换网络、合上盖子，会话会先停下。', '宽限期里先等，出口对上了就恢复，默认等 4 秒。', '出口变了，或探测被拒、到期没恢复，就隔离并写明原因。'])}
    ${scene_(FIGURES.recovery(), '宽限期', pill('读恢复指南', docs('guides/recovery/')))}
    <div class="pin" data-pin><div class="plate states-plate is-specimen">
      <div class="states machine" role="group" aria-label="选择门禁示意状态">
        <button type="button" class="cb-button small" data-recovery-chip aria-pressed="true"><i></i>放行</button>
        <span class="edge" aria-hidden="true"><em>上游断了</em></span>
        <button type="button" class="cb-button small" data-recovery-chip aria-pressed="false"><i></i>等待</button>
        <span class="edge" aria-hidden="true"><em>探测被拒、到期未恢复</em></span>
        <button type="button" class="cb-button small" data-recovery-chip aria-pressed="false"><i></i>隔离</button>
      </div>
      <p class="state-text" data-recovery-text aria-live="polite">出口已核验。新的受管连接可以握手。</p>
    </div></div>
  </div>
</section>

${threshold('sessions')}

${chapter('sessions', `
    <h2 id="sessions-title" ${standing}>一个 Chrome，<br/>登了三个号。</h2>
    ${points(['多开 Profile，分开的只是 Cookie 和缓存。', '约 79 项指纹里，有 74 项还是同一套。', '每个档案独立数据目录，CLI 单独隔离。', '多个网页号，换不同内核的浏览器。'])}
    ${scene_(FIGURES.sessions(), '一套指纹', pill('读多账号隔离', docs('guides/multi-account-isolation/')))}`)}

${chapter('locale', `
    <h2 id="locale-title" ${standing}>出口在美国，<br/>时区在上海。</h2>
    ${points(['代理把出口换到了美国，系统的时区和语言还是中国的。', 'ClaudeBar 按出口国家，给受管进程对齐时区和语言。', '启动前，还会剥离宿主带进来的环境变量。'])}
    ${scene_(FIGURES.locale(), '两只钟', pill('看环境一致性', docs('guides/multi-account-isolation/')))}
    ${locale()}`)}

${threshold('product')}

<section class="sheet showcase" id="product" ${scene('product')} data-snap aria-labelledby="product-title">
  <div class="col">
    <h2 id="product-title" ${standing}>状态就在菜单栏。<br/>细节留在工作台。</h2>
    <p class="more-row">${more('看界面导览', docs('concepts/visual-guide/'))}</p>
    <div class="device" data-gallery data-anchor>
      <div class="cb-segmented views" role="tablist" aria-label="工作台界面">
        ${SHOTS.map(([id, label], i) => `<button type="button" role="tab" id="tab-${id}" aria-controls="shot-${id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${label}</button>`).join('')}
      </div>
      <div class="device-frame" data-tilt>
        ${SHOTS.map(([id, label, file, alt], i) => `<figure class="shot" id="shot-${id}" role="tabpanel" aria-labelledby="tab-${id}"${i ? ' hidden' : ''}><img src="../public/screenshots/${file}" width="2080" height="1360" alt="${alt}" loading="${i ? 'lazy' : 'eager'}" decoding="async"/></figure>`).join('')}
        <span class="glare" aria-hidden="true"></span>
      </div>
    </div>
  </div>
</section>

<section class="sheet finale" id="download" ${scene('finale')} data-snap aria-labelledby="download-title">
  <div class="col">
    <h2 id="download-title" ${standing}>装到<br/>你的 Mac 上。</h2>
    <p class="lead">打开 DMG，把应用拖进「应用程序」。</p>
    <div class="actions" ${floating}>${button(`下载 ClaudeBar ${RELEASE.version} （DMG）`, RELEASE.dmg, { primary: true, icon: arrow })}${button('读安装说明', docs('start/installation/'))}</div>
    <p class="meta">SHA-256 前缀 <code>${RELEASE.sha}</code></p>
    <p class="boundary-row"><span class="boundary">门禁只管接入它的连接。它不接管整台 Mac，也不保证账号安全。</span></p>
  </div>
</section>`;

export function renderHome() {
  return `<!doctype html>
<!-- [INPUT]: home-source.mjs 的公开文案与结构、home.css、assets/home.bundle.js。
     [OUTPUT]: ClaudeBar 沉浸式产品首页。
     [POS]: designs 的生成页面，请修改 home-source.mjs。
     [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md -->
<html lang="zh-CN" data-theme="dark" data-realm="${SCENE_REALM.hero}"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="description" content="ClaudeBar：在 Mac 上配置网络出口、分开浏览器会话，并在异常发生时找到原因。"/>
<meta name="theme-color" content="#0a0908"/><meta name="color-scheme" content="dark"/>
<title>ClaudeBar · Mac 上的出口门禁</title><link rel="canonical" href="https://sophistd.github.io/ClaudeBar-docs/"/>
<link rel="icon" href="../public/favicon.svg" type="image/svg+xml"/>
<link rel="preload" href="../public/fonts/Geist-Variable.woff2" as="font" type="font/woff2" crossorigin/>
<link rel="stylesheet" href="../public/styles/geist.css"/><link rel="stylesheet" href="../public/styles/ui-kit.css"/><style data-tokens>${cssText()}</style><link rel="stylesheet" href="home.css"/><script type="module" src="assets/home.bundle.js"></script></head>
<body class="home"><a class="skip" href="#main">跳至正文</a>
<canvas class="stage" data-stage aria-hidden="true"></canvas>
<header class="bar"><div class="bar-inner">
  <a href="/ClaudeBar-docs/" class="brand" aria-label="ClaudeBar 首页">${portalMark()}<span>ClaudeBar</span></a>
  <a class="version" href="${RELEASE.notes}" aria-label="${RELEASE.version} 发布说明">${RELEASE.version}</a>
  <span class="bar-rule" aria-hidden="true"></span>
  ${renderSiteNavigation('product')}
  <div class="cb-segmented bar-mode" role="group" aria-label="纸带视图" data-mode-switch><button type="button" data-mode="2d" aria-pressed="false" title="平整纸带：一页从上往下读">2D</button><button type="button" data-mode="3d" aria-pressed="true" title="卷曲纸带：近处平铺、远处立起">3D</button></div>
  <button class="cb-button icon-only small bar-sense" type="button" data-sense aria-pressed="false" aria-label="声音与触感" title="声音与触感：现场合成，默认关闭">${senseIcon}</button>
  ${kitButton(`${downloadIcon}<span>下载</span>`, { href: RELEASE.dmg, variant: 'primary small', className: 'cb-button bar-cta', attributes: 'data-magnet' })}
</div><div class="progress" data-progress aria-hidden="true"></div></header>
<nav class="rail" aria-label="章节">${CHAPTERS.map(([id, index, label]) => `<a href="#${id}" data-chapter-link data-magnet><i aria-hidden="true"></i><span>${label}</span><em>${index}</em></a>`).join('')}</nav>
<svg class="leaders" data-leaders aria-hidden="true"></svg>
<div class="world" data-world><div class="track" data-track>
<main id="main">${sections()}</main>
${footer()}
</div></div>
<div class="spacer" data-spacer aria-hidden="true"></div>
</body></html>`;
}
