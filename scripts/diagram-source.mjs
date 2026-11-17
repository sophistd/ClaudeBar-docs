/**
 * [INPUT]: 已有双语机制说明与 Geist 的灰阶、6px 圆角和 1px 边界规范。
 * [OUTPUT]: 三组中英文 SVG；图内只标对象、连接与判断条件。
 * [POS]: public/diagrams 的唯一生成源，原生界面截图不参与重绘。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { writeFileSync } from 'node:fs';
const escapeXml = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const label = (x, y, text, style = '') => `<text x="${x}" y="${y}" class="${style}">${escapeXml(text)}</text>`;
const box = (x, y, width, text, secondary = '') => `<rect class="node" x="${x}" y="${y}" width="${width}" height="56" rx="6"/>${label(x + width / 2, y + (secondary ? 23 : 33), text, 'center')}${secondary ? label(x + width / 2, y + 42, secondary, 'center secondary small') : ''}`;
const line = (d, kind = 'route') => `<path class="${kind}" d="${d}" marker-end="url(#arrow)"/>`;

function architecture(t) {
  return `${label(32, 42, t.storage, 'secondary small')}
    ${box(32, 60, 180, t.profile)}
    ${label(286, 42, t.observation, 'secondary small')}
    ${box(286, 60, 180, t.probe)}
    ${box(540, 60, 208, t.baseline)}
    ${line('M212 88H280')}${line('M466 88H534')}
    ${line('M644 116V170H376V226', 'control')}
    ${label(500, 157, t.control, 'secondary small')}
    ${label(32, 213, t.runtime, 'secondary small')}
    ${box(32, 232, 180, t.process)}
    ${box(286, 232, 180, t.gate)}
    ${box(540, 232, 208, t.upstream)}
    ${line('M212 260H280')}${line('M466 260H534')}
    ${label(376, 321, t.tunnel, 'center secondary small')}`;
}
function routes(t) {
  return `${label(32, 38, t.managed)}
    ${box(32, 58, 208, t.browser, t.separate)}
    ${box(310, 58, 188, t.gate)}
    ${box(568, 58, 180, t.upstream)}
    ${line('M240 86H304')}${line('M498 86H562')}
    <path class="rule" d="M32 158H748"/>
    ${label(32, 202, t.native)}
    ${box(32, 222, 208, t.browser, t.existing)}
    <path class="control" d="M240 250H730"/>
    <circle class="endpoint" cx="738" cy="250" r="5"/>
    ${label(498, 233, t.unknown, 'center secondary small')}`;
}
function recovery(t) {
  return `${box(24, 137, 124, t.armed)}
    ${box(208, 137, 150, t.hold)}
    ${line('M148 165H202')}
    ${label(176, 125, t.interruption, 'center secondary small')}
    ${line('M358 165H382V54H622')}
    ${line('M382 165V276H622')}
    <circle class="junction" cx="382" cy="165" r="3"/>
    ${box(628, 26, 128, t.armed)}
    ${box(628, 248, 128, t.isolated)}
    ${label(404, 40, t.match, 'small')}
    ${line('M382 112H610V54H622', 'control')}
    ${label(404, 98, t.noSample, 'small')}
    ${label(404, 138, t.previous, 'secondary small')}
    ${line('M382 216H610V276H622')}
    ${label(404, 202, t.drift, 'small')}
    ${label(404, 262, t.reject, 'small')}`;
}
const copies = {
  en: {
    browser: 'Browser', storage: 'Configuration', observation: 'Observation', runtime: 'Runtime control',
    profile: 'Profile', probe: 'Egress probe', baseline: 'Verified baseline',
    control: 'Control signal', tunnel: 'Tunnel traffic', process: 'Managed app',
    gate: 'Loopback gate', upstream: 'Upstream proxy', managed: 'Open separately',
    native: 'Use existing sign-in', separate: 'Isolated data folder', existing: 'Existing data folder',
    unknown: 'Unverified network path', armed: 'Armed', hold: 'Handshakes wait', isolated: 'Isolated',
    interruption: 'Interruption', match: 'Matching observation', noSample: 'No new sample · no rejection',
    previous: 'Expiry · reuse prior baseline', drift: 'Measured identity drift', reject: 'Grace expires after rejection',
    architecture: ['Three cooperating layers', 'A profile informs the egress probe. Verified evidence controls the gate. Managed traffic passes through the loopback gate to the upstream proxy.'],
    routes: ['Two browser launch paths', 'A separately opened browser uses an isolated data folder and the configured gate. Existing sign-in keeps its browser data, receives no gate proxy settings, and follows an unverified network path.'],
    recovery: ['Gate decisions during a hold', 'New handshakes wait after an interruption. A matching observation resumes admission. Expiry with no new observation and no probe rejection reuses the prior baseline without reverification. Measured drift isolates immediately, and expiry after a recorded rejection also isolates.'],
  },
  zh: {
    browser: '浏览器', storage: '配置存储', observation: '观测决策', runtime: '运行控制',
    profile: '配置档案', probe: '出口探测', baseline: '已核验的出口基线',
    control: '控制信号', tunnel: '隧道流量', process: '受管应用',
    gate: '本机回环门禁', upstream: '上游代理', managed: '单独打开',
    native: '用现有登录', separate: '独立数据目录', existing: '现有数据目录',
    unknown: '联网路径未核实', armed: '放行', hold: '新握手等待', isolated: '隔离',
    interruption: '链路中断', match: '出口身份匹配', noSample: '无新观测、无拒绝',
    previous: '到期沿用旧基线', drift: '实测出口漂移', reject: '宽限到期仍被拒',
    architecture: ['ClaudeBar 的三层协作', '配置档案为出口探测提供设置。核验后的证据用于控制门禁。受管应用的流量经本机回环门禁发往上游代理。'],
    routes: ['两种浏览器启动方式', '单独打开的浏览器使用独立数据目录，配置门禁代理。用现有登录时，浏览器沿用现有数据目录，ClaudeBar 不注入门禁代理，实际联网路径未核实。'],
    recovery: ['门禁进入宽限期后的判断', '链路中断后，新握手等待。观测到的出口身份匹配时恢复放行。到期时若无新观测且无探测拒绝，沿用旧基线恢复，本次没有重新核验。实测出口漂移会立即隔离，记录探测拒绝后到期也会隔离。'],
  },
};

for (const [lang, copy] of Object.entries(copies)) {
  for (const [name, draw, height] of [['architecture', architecture, 348], ['routes', routes, 326], ['recovery', recovery, 330]]) {
    const [title, description] = copy[name].map(escapeXml);
    const id = `${name}-${lang}`;
    const graphic = draw(copy).replaceAll('url(#arrow)', `url(#${id}-arrow)`);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="780" height="${height}" viewBox="0 0 780 ${height}" xml:lang="${lang === 'zh' ? 'zh-CN' : 'en'}" role="img" aria-labelledby="${id}-title ${id}-desc">
  <!-- [INPUT]: diagram-source.mjs 双语机制与 Geist 视觉标尺。
       [OUTPUT]: ${name} 的 ${lang} 静态机制图。
       [POS]: public/diagrams 的生成资源。
       [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md -->
  <title id="${id}-title">${title}</title>
  <desc id="${id}-desc">${description}</desc>
  <defs><marker id="${id}-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path class="arrow" d="m2 1 6 4-6 4"/></marker></defs>
  <style>
    :root { color-scheme: light dark; --bg: #fff; --surface: #fafafa; --border: #e6e6e6; --ink: #171717; --muted: #666; }
    @media (prefers-color-scheme: dark) { :root { --bg: #000; --surface: #0a0a0a; --border: #333; --ink: #ededed; --muted: #a1a1a1; } }
    text { font: 15px Geist, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; fill: var(--ink); }
    .small { font-size: 13px; }
    .secondary { fill: var(--muted); }
    .center { text-anchor: middle; }
    .node { fill: var(--surface); stroke: var(--border); stroke-width: 1; }
    .route, .control, .arrow { fill: none; stroke: var(--ink); stroke-width: 1.5; stroke-linejoin: round; }
    .control { stroke: var(--muted); stroke-dasharray: 4 4; }
    .rule { stroke: var(--border); }
    .endpoint { fill: var(--bg); stroke: var(--muted); stroke-width: 1.5; }
    .junction { fill: var(--ink); }
  </style>
  <rect width="780" height="${height}" fill="var(--bg)"/>${graphic}
</svg>
`;
    writeFileSync(new URL(`../public/diagrams/${id}.svg`, import.meta.url), svg);
  }
}
