/**
 * [INPUT]: 配置档案、出口观测、浏览器会话与门禁恢复的公开机制说明。
 * [OUTPUT]: 架构、浏览器路由与门禁恢复的中英文静态 SVG。
 * [POS]: 双语图解共用坐标和形元，图稿由此文件生成至 public/diagrams。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { writeFileSync } from 'node:fs';

const escapeXml = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const label = (x, y, text, style = '') => `<text x="${x}" y="${y}" class="${style}">${escapeXml(text)}</text>`;
const shape = (x, y, body) => `<g transform="translate(${x} ${y})">${body}</g>`;

const document = (x, y, stamp = false) => shape(x, y, `
  <path class="object" d="M-18-24H5L18-11V24H-18Z M5-24v13h13"/>
  <path class="detail" d="M-10-5h18 M-10 2h15 M-10 9h10"/>
  ${stamp ? '<circle class="seal" cx="9" cy="14" r="6"/><path class="control" d="m6 14 2 2 4-4"/>' : ''}`);

const lens = (x, y) => shape(x, y, `
  <circle class="object" cx="-3" cy="-4" r="17"/>
  <path class="detail" d="M-14-4a11 11 0 0 1 11-11 M-12 1l5 2 4-9 5 6 5-2"/>
  <path class="object" d="m8 9 5-5 13 13a3.5 3.5 0 0 1-5 5Z"/>`);

const window = (x, y, existing = false) => shape(x, y, `
  <rect class="object" x="-43" y="-25" width="86" height="50" rx="4"/>
  <path class="detail" d="M-42-11h84"/>
  <path class="object" d="M-34-18h1m5 0h1m5 0h1"/>
  ${existing
    ? '<circle class="detail" cx="0" cy="0" r="5"/><path class="detail" d="M-10 16a10 7 0 0 1 20 0Z"/>'
    : '<path class="detail" d="M-27 0h54v14h-54Z M-20 7h19"/>'}`);

const folder = (x, y, existing = false) => shape(x, y, `
  <path class="object" d="M-25 15v-30h18l4 5h28v25Z"/>
  <path class="detail" d="M-24-5h48"/>
  ${existing ? '<path class="detail" d="M-16 2h26 M-16 8h18"/>' : ''}`);

const relay = (x, y) => shape(x, y, `
  <path class="object" d="M-31-21h62v17h-62Z M-31 1h62v17h-62Z"/>
  <path class="detail" d="M-22-12h20 M-22 10h20"/>
  <circle class="port" cx="21" cy="-12" r="2"/>
  <circle class="port" cx="21" cy="10" r="2"/>`);

const gate = (x, y, state = 'open') => {
  const door = {
    open: '<path class="door" d="M2-24 23-13"/><path class="traffic" d="M-27 4H27"/>',
    hold: '<path class="door panel" d="M2-24 9 12"/><path class="queue" d="M-23 4h1m5 0h1m5 0h1 M-3-3v14"/>',
    shut: '<path class="door block" d="M2-24V22"/><path class="traffic" d="M-27 4H-10"/><path class="cut" d="m15-2 8 12m0-12-8 12"/>',
  };
  return shape(x, y, `
  <path class="object" d="M-27-24h54v7h-54Z M-27 18h54v6h-54Z"/>
  ${door[state]}
  <circle class="hinge" cx="2" cy="-24" r="3"/>`);
};

// 配置档案与出口证据参与门禁控制。只有底层隧道承载应用流量。
function architecture(t) {
  return `
  <path class="layer" d="M186 25H726L738 37v64H186Z M186 113H726L738 125v79H186Z M186 216H726L738 228v95H186Z"/>
  <path class="rule" d="M166 25v298m-9-298h9m-9 82h9m-9 103h9m-9 113h9"/>
  ${label(150, 68, t.storage, 'end bold')}
  ${label(150, 158, t.observation, 'end bold')}
  ${label(150, 272, t.runtime, 'end bold')}
  <path class="control" d="M299 63h90a12 12 0 0 1 12 12v53" marker-end="url(#control)"/>
  <path class="control" d="M427 154h93" marker-end="url(#control)"/>
  <path class="control" d="M550 178v34a14 14 0 0 1-14 14h-47a14 14 0 0 0-14 14v4" marker-end="url(#control)"/>
  <path class="traffic" d="M319 272h150m33 0h126" marker-end="url(#ink)"/>
  ${document(272, 61)}
  ${lens(401, 152)}
  ${document(550, 154, true)}
  ${window(276, 268)}
  ${gate(475, 268)}
  ${relay(663, 272)}
  ${label(316, 53, t.profile)}
  ${label(401, 189, t.probe, 'center')}
  ${label(575, 160, t.baseline)}
  ${label(565, 242, t.control, 'secondary')}
  ${label(386, 258, t.tunnel, 'center secondary')}
  ${label(276, 312, t.process, 'center')}
  ${label(475, 312, t.gate, 'center')}
  ${label(663, 312, t.upstream, 'center')}
  `;
}

// 已有登录不注入门禁代理。虚线止于开放端，具体联网路径未核实。
function routes(t) {
  return `
  <path class="rule" d="M34 166h712"/>
  ${label(35, 37, t.managed, 'bold')}
  ${label(35, 200, t.native, 'bold')}
  <path class="traffic" d="M222 74h191m45 0h169" marker-end="url(#ink)"/>
  <path class="unknown" d="M222 237h405"/>
  <circle class="unknown-end" cx="630" cy="237" r="5"/>
  <path class="detail" d="M179 95v20 M179 258v20"/>
  ${window(179, 70)}
  ${window(179, 233, true)}
  ${folder(179, 130)}
  ${folder(179, 293, true)}
  ${gate(436, 70)}
  ${relay(662, 74)}
  ${label(216, 135, t.separate)}
  ${label(216, 298, t.existing)}
  ${label(436, 115, t.gate, 'center')}
  ${label(662, 115, t.upstream, 'center')}
  ${label(434, 222, t.unknown, 'center secondary')}
  `;
}

// 恢复探测分为实测匹配、未取得观测、实测漂移、记录拒绝四条路径。
function recovery(t) {
  return `
  <path class="transition" d="M112 146h77" marker-end="url(#ink)"/>
  <path class="transition" d="M259 146h61m0-96v250 M320 50h258q12 0 12 12v22 M320 124h258q12 0 12-12V84 M590 84h43" marker-end="url(#ink)"/>
  <path class="transition" d="M320 226h258q12 0 12 12v22 M320 300h258q12 0 12-12v-28 M590 260h43" marker-end="url(#ink)"/>
  <path class="port" d="m548 46 8 4-8 4Z m0 74 8 4-8 4Z m0 102 8 4-8 4Z m0 74 8 4-8 4Z"/>
  <circle class="port" cx="320" cy="146" r="3"/>
  <circle class="port" cx="590" cy="84" r="3"/>
  <circle class="port" cx="590" cy="260" r="3"/>
  ${gate(77, 171)}
  ${gate(225, 171, 'hold')}
  ${gate(668, 80)}
  ${gate(668, 256, 'shut')}
  ${label(77, 218, t.armed, 'center bold')}
  ${label(226, 218, t.hold, 'center bold')}
  ${label(668, 129, t.armed, 'center bold')}
  ${label(668, 304, t.isolated, 'center bold')}
  ${label(151, 134, t.interruption, 'center secondary')}
  ${label(342, 40, t.match)}
  ${label(342, 114, t.noSample)}
  ${label(342, 147, t.previous, 'secondary')}
  ${label(342, 216, t.drift)}
  ${label(342, 290, t.reject)}
  `;
}

const copies = {
  en: {
    storage: 'Configuration', observation: 'Observation', runtime: 'Runtime control',
    profile: 'Profile', probe: 'Egress probe', baseline: 'Verified baseline',
    control: 'Control signal', tunnel: 'Tunnel traffic', process: 'Managed app',
    gate: 'Loopback gate', upstream: 'Upstream proxy', managed: 'Open separately',
    native: 'Use existing sign-in', separate: 'Isolated data folder', existing: 'Existing data folder',
    unknown: 'Unverified network path', armed: 'Armed', hold: 'New handshakes wait', isolated: 'Isolated',
    interruption: 'Interruption', match: 'Matching observation', noSample: 'No new sample · no rejection',
    previous: 'Expiry · reuse prior baseline', drift: 'Measured identity drift', reject: 'Grace expires after rejection',
    architecture: ['Three cooperating layers', 'A profile informs the egress probe. Verified evidence controls the gate. Managed traffic passes through the loopback gate to the upstream proxy.'],
    routes: ['Two browser launch paths', 'A separately opened browser uses an isolated data folder and the configured gate. Existing sign-in keeps its browser data, receives no gate proxy settings, and follows an unverified network path.'],
    recovery: ['Gate decisions during a hold', 'New handshakes wait after an interruption. A matching observation resumes admission. Expiry with no new observation and no probe rejection reuses the prior baseline without reverification. Measured drift isolates immediately, and expiry after a recorded rejection also isolates.'],
  },
  zh: {
    storage: '配置存储', observation: '观测决策', runtime: '运行控制',
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
    const graphic = draw(copy).replaceAll(/url\(#([\w-]+)\)/g, `url(#${id}-$1)`);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="780" height="${height}" viewBox="0 0 780 ${height}" xml:lang="${lang === 'zh' ? 'zh-CN' : 'en'}" role="img" aria-labelledby="${id}-title ${id}-desc">
  <!-- [INPUT]: diagram-source.mjs 的双语标注与机制形元。
       [OUTPUT]: ${name} 的 ${lang} 静态图解。
       [POS]: 文档站 public/diagrams 的生成资源。
       [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md -->
  <title id="${id}-title">${title}</title>
  <desc id="${id}-desc">${description}</desc>
  <defs>
    <marker id="${id}-ink" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path fill="#252422" d="M0 0l10 5-10 5Z"/>
    </marker>
    <marker id="${id}-control" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path fill="none" stroke="#496478" stroke-width="1.4" d="m1 1 8 4-8 4"/>
    </marker>
  </defs>
  <style>
    text { font: 15px -apple-system, BlinkMacSystemFont, "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", Arial, sans-serif; fill: #252422; }
    path { stroke-linejoin: round; stroke-linecap: round; }
    .bold { font-size: 16px; font-weight: 650; }
    .secondary { fill: #5f5a54; }
    .center { text-anchor: middle; }
    .end { text-anchor: end; }
    .layer { fill: #f2efe8; stroke: #d4cec2; stroke-width: 1; }
    .rule { fill: none; stroke: #c5bdb1; stroke-width: 1; }
    .object, .hinge { fill: #fcfbf8; stroke: #252422; stroke-width: 1.7; }
    .detail { fill: none; stroke: #6d675e; stroke-width: 1.2; }
    .control { fill: none; stroke: #496478; stroke-width: 1.6; }
    .traffic { fill: none; stroke: #252422; stroke-width: 2.25; }
    .transition { fill: none; stroke: #252422; stroke-width: 1.5; }
    .port { fill: #252422; }
    .seal { fill: #dbe5ea; stroke: #496478; }
    .unknown, .unknown-end { fill: none; stroke: #66625c; stroke-width: 1.6; }
    .unknown { stroke-dasharray: 6 6; }
    .door { fill: none; stroke: #3b604c; stroke-width: 4; }
    .panel { stroke: #736347; }
    .queue { stroke: #736347; stroke-width: 2.5; }
    .block, .cut { fill: none; stroke: #a3442d; }
    .cut { stroke-width: 1.5; }
  </style>
  <rect x=".5" y=".5" width="779" height="${height - 1}" fill="#fcfbf8" stroke="#d4cec2"/>${graphic}
</svg>
`;
    writeFileSync(new URL(`../public/diagrams/${id}.svg`, import.meta.url), svg);
  }
}
