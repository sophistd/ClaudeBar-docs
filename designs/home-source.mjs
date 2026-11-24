/**
 * [INPUT]: 依赖 ../public/scripts/site-navigation.mjs 的 renderSiteNavigation、./release.mjs 的最新正式版；其余公开事实取自现有文档。
 * [OUTPUT]: 对外提供 renderHome() → 沉浸式产品首页完整 HTML 字符串、portalMark() 品牌标记。
 * [POS]: designs 首页的内容与结构源，由 build.mjs 写成 index.html；3D 与交互分别归 home-scene/home.mjs，样式归 home.css。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { renderSiteNavigation } from '../public/scripts/site-navigation.mjs';
import { RELEASE } from './release.mjs';

// ============================================================================
//  公开事实：版本信息来自 release.mjs（读取 releases.json），页面不写死版本
// ============================================================================
// 版本、下载与校验前缀来自 releases.json，发版不必改页面
const docs = (path = '') => `/ClaudeBar-docs/zh/${path}`;
const arrow = '<svg class="arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** 应用图标的门框几何（右侧开口圆角方框 + 陶土锚点），与应用图标同一坐标系。 */
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
const footer = () => `<footer class="foot"><div class="foot-inner">
  <div class="foot-lead">
    <a href="/ClaudeBar-docs/" class="brand" aria-label="ClaudeBar 首页">${portalMark()}<span>ClaudeBar</span></a>
    <p>掌握连接，看清边界。macOS 原生的网络出口与浏览器会话工具。</p>
    <a class="btn btn-small" href="${RELEASE.dmg}">${downloadIcon}<span>下载 ${RELEASE.version}</span></a>
  </div>
  ${FOOTER_COLUMNS.map(([title, items]) => `<nav class="foot-col" aria-label="${title}"><h2>${title}</h2><ul>${items.map(([label, href]) => `<li><a href="${href}">${label}</a></li>`).join('')}</ul></nav>`).join('')}
  <div class="foot-base">
    <span>独立项目，未获 Anthropic 背书。</span>
    <span class="foot-status"><i aria-hidden="true"></i>${RELEASE.version} · Developer ID 签名 · Apple 公证 · macOS 14+</span>
  </div>
</div></footer>`;

const button = (text, href, { primary = false, icon = '' } = {}) =>
  `<a class="btn${primary ? ' btn-primary' : ''}" href="${href}"><span>${text}</span>${icon}</a>`;
const more = (text, href) => `<a class="more" href="${href}">${text}${arrow}</a>`;

// 当前版本工作台的离屏渲染（演示数据）
const SHOTS = [
  ['launchpad', '启动台', 'workbench-overview-dark.png', 'ClaudeBar 启动台：主通道 US-Primary 已放行，下方列出五个受控入口及各自通道'],
  ['repair', '检查与修复', 'workbench-topology-dark.png', 'ClaudeBar 检查与修复：出口、检查、同一出口与风险四项指标，左侧风险关系，右侧 22 项检查'],
  ['preflight', '内容预检', 'workbench-preflight-dark.png', 'ClaudeBar 内容预检：分阶段判定，左侧原文与改写结果，右侧风险分布'],
];

const CHAPTERS = [
  ['gate', '01', '出口门禁'], ['sessions', '02', '会话隔离'], ['observe', '03', '检查与修复'],
  ['recovery', '04', '恢复条件'], ['preflight', '05', '发送前检查'],
];

function chapter(id, body, { align = 'left', extra = '' } = {}) {
  const [, index, label] = CHAPTERS.find(([key]) => key === id);
  return `<section class="chapter align-${align}" id="${id}" data-scene="${id}" data-chapter aria-labelledby="${id}-title"${extra}>
  <div class="chapter-inner"><span class="numeral" aria-hidden="true">${index}</span><div class="panel" data-reveal data-spot>
    <p class="eyebrow"><span class="index">${index}</span><span class="rule"></span>${label}</p>
    ${body}
  </div></div></section>`;
}

const sections = () => `
<section class="hero" id="top" data-scene="hero" aria-labelledby="hero-title">
  <div class="hero-poster" aria-hidden="true">${portalMark('poster')}</div>
  <div class="hero-copy">
    <p class="badge" data-reveal><span class="pulse"></span>macOS 原生 · ${RELEASE.version} · Apple 公证</p>
    <h1 id="hero-title" data-split>掌握连接。<br/>看清边界。</h1>
    <p class="lead" data-reveal>在 Mac 上配置网络出口、分开浏览器会话，<br class="wide"/>并在异常发生时找到原因。</p>
    <div class="actions" data-reveal>${button(`下载 ${RELEASE.version}`, RELEASE.dmg, { primary: true, icon: arrow })}${button('穿过这道门', '#gate')}</div>
  </div>
  <a class="scroll-cue" href="#gate" aria-label="向下滚动，进入第一章"><span></span></a>
</section>

${chapter('gate', `
    <h2 id="gate-title">先核验出口，<br/>再放行连接。</h2>
    <p>应用接入本机回环门禁，再由档案指定的上游代理转发。启动前核验出口身份，转发层只传递隧道字节，无需安装 TLS 拦截证书。</p>
    <dl class="facts"><div><dt>127.0.0.1</dt><dd>本机回环门禁</dd></div><div><dt>0 张</dt><dd>需安装的拦截证书</dd></div></dl>
    ${more('了解门禁路径', 'network.html')}`)}

${chapter('sessions', `
    <h2 id="sessions-title">不同账号，<br/>各自的会话空间。</h2>
    <p>工作与个人会话各自使用独立的浏览器数据目录。需要沿用登录时，也清楚地知道这次连接走哪条路。</p>
    <ul class="pair"><li><b>单独打开</b><span>独立数据目录，注入门禁代理配置</span></li><li><b>用现有登录</b><span>沿用已有数据，不因检查而自动受管</span></li></ul>
    ${more('选择会话模式', 'sessions.html')}`, { align: 'right' })}

${chapter('observe', `
    <h2 id="observe-title">从观测，<br/>追到原因。</h2>
    <p>观测结果反映检查当时的情况。顺着它找到失败的那一环，再决定是否执行对应的修复。线路变了，就看新的观测。</p>
    <ul class="tags" aria-label="工作台分区"><li>Launchpad</li><li>Channels</li><li>Incidents</li><li>Preflight</li><li>Settings</li></ul>
    ${more('阅读诊断指南', docs('guides/diagnostics/'))}`)}

<section class="chapter recovery align-left" id="recovery" data-scene="recovery" data-chapter data-hold data-recovery data-state="0" aria-labelledby="recovery-title">
  <div class="chapter-inner"><span class="numeral" aria-hidden="true">04</span><div class="panel" data-reveal data-spot>
    <p class="eyebrow"><span class="index">04</span><span class="rule"></span>恢复条件</p>
    <h2 id="recovery-title">中断之后，<br/>每一步都有条件。</h2>
    <p>继续滚动，看门禁如何在三种状态之间切换；也可以直接选择。</p>
    <div class="states" role="group" aria-label="选择门禁示意状态">
      <button type="button" data-recovery-chip aria-pressed="true"><i></i>放行</button>
      <button type="button" data-recovery-chip aria-pressed="false"><i></i>等待</button>
      <button type="button" data-recovery-chip aria-pressed="false"><i></i>隔离</button>
    </div>
    <p class="state-text" data-recovery-text aria-live="polite">已有核验基线，允许新的受管连接握手。</p>
    <p class="fine">教学示意，不连接真实网络。若到期时没有新观测、也没有探测拒绝，门禁沿用旧基线恢复，这一次没有重新核验出口。</p>
  </div></div>
</section>

${chapter('preflight', `
    <h2 id="preflight-title" data-decrypt>发出之前，<br/>再读一遍。</h2>
    <p>发送前检查提示词是一项单独的流程，用来在提交前找出含混之处。配置云端处理步骤后，输入的文本可能会发给你选定的模型提供方；只管理网络会话时可以跳过它。</p>
    ${more('查看保护边界', docs('concepts/security/'))}`, { align: 'right' })}

<section class="showcase" id="product" data-scene="product" aria-labelledby="product-title">
  <div class="showcase-head" data-reveal>
    <h2 id="product-title">状态就在菜单栏。<br/>细节留在工作台。</h2>
    ${more('查看应用界面', docs('concepts/visual-guide/'))}
  </div>
  <div class="device" data-reveal data-gallery>
    <div class="views" role="tablist" aria-label="工作台界面">
      ${SHOTS.map(([id, label], i) => `<button type="button" role="tab" id="tab-${id}" aria-controls="shot-${id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${label}</button>`).join('')}
      <span class="views-indicator" aria-hidden="true"></span>
    </div>
    <div class="device-frame" data-tilt>
      ${SHOTS.map(([id, label, file, alt], i) => `<figure class="shot" id="shot-${id}" role="tabpanel" aria-labelledby="tab-${id}"${i ? ' hidden' : ''}><img src="../public/screenshots/${file}" width="2080" height="1360" alt="${alt}" loading="${i ? 'lazy' : 'eager'}" decoding="async"/></figure>`).join('')}
      <span class="glare" aria-hidden="true"></span>
    </div>
    <p class="device-note">界面为当前版本的离屏渲染，使用演示数据。</p>
  </div>
</section>

<section class="finale" id="download" data-scene="finale" aria-labelledby="download-title">
  <div class="finale-copy" data-reveal>
    <h2 id="download-title">把连接边界，<br/>带回你的 Mac。</h2>
    <p class="lead">已通过 Developer ID 签名与 Apple 公证，下载后拖入「应用程序」即可使用。</p>
    <div class="actions">${button(`下载 ClaudeBar ${RELEASE.version} (DMG)`, RELEASE.dmg, { primary: true, icon: arrow })}${button('阅读安装说明', docs('start/installation/'))}</div>
    <p class="meta">macOS 14+ · Apple Silicon · SHA-256 前缀 <code>${RELEASE.sha}</code></p>
    <p class="boundary">门禁只管理接入它的连接。它不接管所有应用，也不保证账号安全。</p>
  </div>
</section>`;

export function renderHome() {
  return `<!doctype html>
<!-- [INPUT]: home-source.mjs 的公开文案与结构、home.css、assets/home.bundle.js。
     [OUTPUT]: ClaudeBar 沉浸式产品首页。
     [POS]: designs 的生成页面，请修改 home-source.mjs。
     [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md -->
<html lang="zh-CN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="description" content="ClaudeBar：在 Mac 上配置网络出口、分开浏览器会话，并在异常发生时找到原因。"/>
<meta name="theme-color" content="#0a0908"/><meta name="color-scheme" content="dark"/>
<title>ClaudeBar · 掌握每一次连接</title><link rel="canonical" href="https://sophistd.github.io/ClaudeBar-docs/"/>
<link rel="icon" href="../public/favicon.svg" type="image/svg+xml"/>
<link rel="preload" href="../public/fonts/Geist-Variable.woff2" as="font" type="font/woff2" crossorigin/>
<link rel="stylesheet" href="home.css"/><script type="module" src="assets/home.bundle.js"></script></head>
<body class="home"><a class="skip" href="#main">跳至正文</a>
<canvas class="stage" data-stage aria-hidden="true"></canvas><div class="grain" aria-hidden="true"></div>
<header class="bar"><div class="bar-inner">
  <a href="/ClaudeBar-docs/" class="brand" aria-label="ClaudeBar 首页">${portalMark()}<span>ClaudeBar</span></a>
  <a class="version" href="${RELEASE.notes}" aria-label="${RELEASE.version} 发布说明">${RELEASE.version}</a>
  <span class="bar-rule" aria-hidden="true"></span>
  ${renderSiteNavigation('product')}
  <a class="bar-cta" href="${RELEASE.dmg}">${downloadIcon}<span>下载</span></a>
</div><div class="progress" data-progress aria-hidden="true"></div></header>
<nav class="rail" aria-label="章节">${CHAPTERS.map(([id, index, label]) => `<a href="#${id}" data-chapter-link><span>${index}</span><em>${label}</em></a>`).join('')}</nav>
<main id="main">${sections()}</main>
${footer()}
</body></html>`;
}
