/**
 * [INPUT]: 依赖 ../public/scripts/site-navigation.mjs 的 renderSiteNavigation、./release.mjs 的最新正式版、./kit-source.mjs 的 kitButton、
 *          ./home-tokens.mjs 的 GATES/CAMERA/trailCss；公开事实取自 concepts/security、guides/multi-account-isolation、concepts/network-egress。
 * [OUTPUT]: 对外提供 renderHome() → 山路纸带首页完整 HTML、portalMark() 品牌标记、CHAPTERS 章节表。
 * [POS]: 首页四层柔性编码的第三层（组件与自适应组合），也是文案与结构的唯一来源，由 build.mjs 写成 index.html。
 *        组件只声明「我是第几章（data-chapter / data-shot）、我是哪颗珠子（data-bead）、哪张层标签（data-chip）」；
 *        镜头、路头、分层与卡片显隐都由 home.mjs 按滚动换算，样式归 home.css。没有脚本或 WebGL 时，同一份 HTML 是一页从上往下读的黑底长文。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { renderSiteNavigation } from '../public/scripts/site-navigation.mjs';
import { RELEASE } from './release.mjs';
import { kitButton } from './kit-source.mjs';
import { GATES, CAMERA, trailCss } from './home-tokens.mjs';

const docs = (path = '') => `/ClaudeBar-docs/zh/${path}`;
const arrow = '<svg class="arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/></svg>';
const downloadIcon = '<svg class="icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2.5v8m-3.5-3.5L8 10.5 11.5 7M3 13.5h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/></svg>';

/** 应用图标的门框几何：只作页头与页脚的品牌标记，不进 3D 场景。 */
export const portalMark = (cls = 'mark') => `<svg class="${cls}" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M15.2 6v-.4a2.8 2.8 0 0 0-2.8-2.8H5.6a2.8 2.8 0 0 0-2.8 2.8v6.8a2.8 2.8 0 0 0 2.8 2.8h6.8a2.8 2.8 0 0 0 2.8-2.8V12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="10" cy="9" r="1.2" fill="currentColor"/></svg>`;

// ============================================================================
//  章节：id、索引名、镜头下标。最后一章（工作台）沿用山顶的镜头
// ============================================================================
export const CHAPTERS = [
  ['top', '总览', 0], ['start', '起点', 1], ['session', '隔离', 2], ['env', '对齐', 3], ['leak', '封堵', 4],
  ['gate', '门禁', 5], ['layers', '分层', 6], ['summit', '下载', 7], ['workbench', '工作台', 7],
];

/** 读数：键 · 值。全页只在页脚说一次「示意」。 */
const readout = (rows) => `<dl class="readout">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
const edge = (text) => `<p class="edge">${text}</p>`;
const textLink = (text, href) => `<a class="text-link" href="${href}">${text}${arrow}</a>`;
const card = (id, kicker, title, body, extra = '', bead = '') => `<section class="chapter" id="${id}" data-chapter data-shot="${CHAPTERS.find(([c]) => c === id)[2]}" aria-labelledby="${id}-title">
  <div class="hold"><article class="card glass"${bead ? ` data-card-bead="${bead}"` : ''}>
    <p class="kicker">${bead ? `<i class="dot" data-for="${bead}" aria-hidden="true"></i>` : ''}${kicker}</p>
    <h2 id="${id}-title">${title}</h2>
    <p class="body">${body}</p>
    ${extra}
  </article></div>
</section>`;

const gateCards = [
  card('start', '起点 · 你的 Mac', '一个账号，一份档案。', '走哪条上游、开哪个浏览器，档案里写定。',
    readout([['档案', 'work-jp'], ['浏览器', 'Chrome'], ['上游', 'SOCKS5']]), 's'),
  card('session', '第一关 · 会话隔离', '各用各的抽屉。', 'Cookie、CLI 的 userID、Desktop 设备目录，各存一份。',
    readout([['Cookie', '独立'], ['userID', '独立'], ['P19 碰撞', '未发现']]) + edge('同内核多开，硬件指纹仍相同。') + textLink('看会话隔离', 'sessions.html'), 'session'),
  card('env', '第二关 · 环境对齐', '出口在东京，钟也在东京。', '时区和语言跟着出口走，宿主的杂变量先剥掉。',
    readout([['时区', 'Asia/Tokyo'], ['语言', 'ja-JP'], ['宿主变量', '已剥离']]), 'env'),
  card('leak', '第三关 · 暗道封堵', '不许抄近路。', 'DNS 走远端；IPv6、STUN、QUIC 用启动参数关掉。',
    readout([['DNS', '远端'], ['IPv6', '已关'], ['STUN · QUIC', '参数缓解']]) + edge('宿主仍有公网 IPv6，只算参数缓解。'), 'leak'),
  card('gate', '第四关 · 出口门禁', '出口一变，立刻停下。', '启动前先核出口、记基线；对不上就拦下或隔离。',
    readout([['基线', 'JP · AS2516'], ['本次', 'JP · AS2516'], ['多源', '3 / 3 一致']]) + textLink('看门禁路径', 'network.html'), 'gate'),
  card('layers', '拆开看', '四层，一层不少。', '请求逐层穿过。再往下，是工具管不到的地方。', edge('不承诺防封。')),
];

// 当前版本工作台的截图（演示数据）
const SHOTS = [
  ['launchpad', '启动台', 'workbench-overview-dark.png', 'ClaudeBar 启动台：主通道 US-Primary 已放行，下方列出五个受控入口及各自通道'],
  ['repair', '检查与修复', 'workbench-topology-dark.png', 'ClaudeBar 检查与修复：出口、检查、同一出口与风险四项指标，左侧风险关系，右侧 22 项检查'],
  ['preflight', '发前预检', 'workbench-preflight-dark.png', 'ClaudeBar 发前预检：分阶段判定，左侧原文与改写结果，右侧风险分布'],
];

const FOOTER_COLUMNS = [
  ['产品', [['门禁路径', 'network.html'], ['会话隔离', 'sessions.html'], ['获取方式', 'access.html']]],
  ['文档', [['认识 ClaudeBar', docs('start/introduction/')], ['首次配置', docs('start/first-setup/')], ['诊断指南', docs('guides/diagnostics/')], ['命令行参考', docs('reference/cli/')]]],
  ['项目', [['保护边界', docs('concepts/security/')], ['验证记录', docs('project/status/')], ['常见问题', docs('project/faq/')], ['发布说明', RELEASE.notes]]],
];

const bead = (key, inner) => `<span class="bead" data-bead="${key}" data-state="idle">${inner}</span>`;
const icon = (paths) => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
const overlay = () => `<div class="overlay" data-overlay aria-hidden="true">
  ${bead('s', '<b>S</b>')}
  ${GATES.map((g) => bead(g.key, icon(g.icon))).join('\n  ')}
  ${bead('flag', icon('<path d="M6 21V4h11l-2.5 4L17 12H6"/>'))}
  ${GATES.map((g, i) => `<span class="chip glass" data-chip="${i}"><i data-for="${g.key}"></i>0${i + 1} ${g.name}</span>`).join('\n  ')}
</div>`;

const sections = () => `<section class="chapter hero" id="top" data-chapter data-shot="0" aria-labelledby="top-title">
  <div class="hold"><div class="hero-copy">
    <h1 id="top-title">出口不对，<br/>就不出发。</h1>
    <p class="body">ClaudeBar 在菜单栏，替你先过四道关。</p>
  </div></div>
</section>
${gateCards.join('\n')}
<section class="chapter summit" id="summit" data-chapter data-shot="7" aria-labelledby="summit-title">
  <div class="hold"><div class="board">
    <h2 id="summit-title">只走核过的那条路。</h2>
    <p class="body">装进菜单栏，每次出发前先核一遍。</p>
    <p class="actions"><a class="get" href="${RELEASE.dmg}">${downloadIcon}<span>下载 ClaudeBar</span></a>${textLink('读安装说明', docs('start/installation/'))}</p>
    <p class="meta">${RELEASE.version} · macOS 14+ · Apple Silicon · SHA-256 <code>${RELEASE.sha}</code></p>
  </div></div>
</section>
<section class="chapter workbench" id="workbench" data-chapter data-shot="7" aria-labelledby="workbench-title">
  <div class="bench glass">
    <h2 id="workbench-title">状态在菜单栏，细节在工作台。</h2>
    <div class="device" data-gallery>
      <div class="seg tabs" role="tablist" aria-label="工作台界面">
        ${SHOTS.map(([id, label], i) => `<button type="button" role="tab" id="tab-${id}" aria-controls="shot-${id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${label}</button>`).join('')}
      </div>
      ${SHOTS.map(([id, , file, alt], i) => `<figure class="shot" id="shot-${id}" role="tabpanel" aria-labelledby="tab-${id}"${i ? ' hidden' : ''}><img src="../public/screenshots/${file}" width="2080" height="1360" alt="${alt}" loading="lazy" decoding="async"/></figure>`).join('')}
    </div>
  </div>
</section>`;

const footer = () => `<footer class="foot"><div class="foot-inner">
  <div class="foot-lead"><a href="/ClaudeBar-docs/" class="brand" aria-label="ClaudeBar 首页">${portalMark()}<span>ClaudeBar</span></a></div>
  ${FOOTER_COLUMNS.map(([title, items]) => `<nav class="foot-col" aria-label="${title}"><h2>${title}</h2><ul>${items.map(([label, href]) => `<li><a href="${href}">${label}</a></li>`).join('')}</ul></nav>`).join('')}
  <div class="foot-base"><span>ClaudeBar 是独立项目，与 Anthropic 无隶属，也未获其背书。</span><span>卡片读数为示意。</span></div>
</div></footer>`;

export function renderHome() {
  if (CHAPTERS.length !== CAMERA.length + 1) throw new Error('章节与镜头数量不一致');
  return `<!doctype html>
<!-- [INPUT]: home-source.mjs 的公开文案与结构、home.css、assets/home.bundle.js。
     [OUTPUT]: ClaudeBar 山路纸带产品首页。
     [POS]: designs 的生成页面，请修改 home-source.mjs。
     [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md -->
<html lang="zh-CN" data-theme="dark"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="description" content="ClaudeBar：Mac 菜单栏里的出口门禁。会话、环境、暗道、出口四道关，哪一道没过就不出发。"/>
<meta name="theme-color" content="#0f0f10"/><meta name="color-scheme" content="dark"/>
<title>ClaudeBar · 出口不对，就不出发</title><link rel="canonical" href="https://sophistd.github.io/ClaudeBar-docs/"/>
<link rel="icon" href="../public/favicon.svg" type="image/svg+xml"/>
<link rel="preload" href="../public/fonts/Geist-Variable.woff2" as="font" type="font/woff2" crossorigin/>
<link rel="stylesheet" href="../public/styles/geist.css"/><link rel="stylesheet" href="../public/styles/ui-kit.css"/><style data-tokens>${trailCss()}</style><link rel="stylesheet" href="home.css"/><script>document.documentElement.classList.add('js')</script><script type="module" src="assets/home.bundle.js"></script></head>
<body class="home"><a class="skip" href="#main">跳至正文</a>
<canvas class="stage" data-stage aria-hidden="true"></canvas>
${overlay()}
<svg class="leaders" data-leaders aria-hidden="true"></svg>
<header class="bar"><div class="bar-inner">
  <a href="/ClaudeBar-docs/" class="brand" aria-label="ClaudeBar 首页">${portalMark()}<span>ClaudeBar</span></a>
  ${renderSiteNavigation('product')}
  <span class="spacer"></span>
  <div class="seg glass mode" role="group" aria-label="视图" data-mode-switch><button type="button" data-mode="2d" aria-pressed="false" aria-label="2D 平面视图" disabled>2D</button><button type="button" data-mode="3d" aria-pressed="true" aria-label="3D 立体视图" disabled>3D</button></div>
  ${kitButton(`${downloadIcon}<span>下载</span>`, { href: RELEASE.dmg, variant: 'small', className: 'cb-button bar-get', attributes: `aria-label="下载 ClaudeBar ${RELEASE.version}"` })}
</div></header>
<nav class="index" aria-label="章节" data-index><ol>${CHAPTERS.map(([id, label], i) => `<li><a href="#${id}" data-chapter-link><em>${String(i + 1).padStart(2, '0')}</em><span>${label}</span></a></li>`).join('')}</ol><p class="index-count" aria-hidden="true"><b data-count>01</b> / ${String(CHAPTERS.length).padStart(2, '0')}</p></nav>
<main id="main">${sections()}</main>
${footer()}
</body></html>`;
}
