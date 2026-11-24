/**
 * [INPUT]: 无依赖；纯数据，Node（构建、品味门禁）与浏览器（运行时）都能直接导入。
 * [OUTPUT]: 对外提供 PALETTE 色板、MOTION 三档弹簧标尺与 rate()、REALMS 三界定义（含纸面与纸上文字色）、RIBBON 纸带几何、SCENE_REALM 章节归属、
 *           CROSSINGS 越界顺序、ENV_DEFAULTS 环境键表、cssText() 把同一份常数写成 :root 变量。
 * [POS]: 首页四层柔性编码的最底层（Token）：CSS、GLSL、WebAudio、震动都从这里取常数，
 *        视图不再各自硬编码颜色与时长；上面依次是 home-kit（原语）、home-source（组件）、home-taste（门禁）。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ============================================================================
//  色板：应用图标的石墨、象牙与陶土。酸性绿只属于"隔离"，不做装饰
// ============================================================================
export const PALETTE = {
  ink: 0x0a0908, ivory: 0xf6f0ea, terracotta: 0xd97757, ember: 0xffa07a,
  cool: 0xa9bfe3, amber: 0xf2b25c, alarm: 0xe5483a, acid: 0xd4ff00,
};
// 只在 DOM 里出现的文字与底色（3D 不用）
const SURFACE = { 'ink-2': '#14110f', text: '#ece5de', muted: '#a89f97', alarm: '#ef6a55' };

// ============================================================================
//  物理动效标尺：临界阻尼弹簧，无过冲。一切过渡只取这三档；减弱动态时统一退化为 fade
// ============================================================================
export const MOTION = { snap: 0.24, glide: 0.32, settle: 0.48, fade: 0.14 };
/** 指数跟随速率：约 4 个时间常数落定，对应该档的秒数。 */
export const rate = (tier) => 4.08 / MOTION[tier];
const SPRING = 'linear(0, .114, .319, .514, .669, .781, .859, .91, .944, .965, .979, .987, .992, .995, .997, .998, 1)';

// ============================================================================
//  三界：同一个世界的三种相。text = 人·现实（陶土纸面），code = 机器·心智（蓝图纸面），
//  token = AI·符号（象牙纸面、墨字）。每一界同时规定纸面、纸上文字、强调色、声音与震动——一处定义，处处生效。
//  纸面与文字的组合都过了 WCAG AA：正文 ≥ 4.5:1，次级文字 soft 同样 ≥ 4.5:1。
// ============================================================================
export const REALMS = [
  { id: 'text', glyph: '文', name: 'TEXT', who: '人', what: '现实', line: '回到现实，它就在你的 Mac 上。',
    sheet: 0x9a4326, on: 0xf6f0ea, soft: 0xf0dbcf,
    accent: PALETTE.terracotta, wind: 420, chord: [196, 246.94, 293.66], haptic: [10] },
  { id: 'code', glyph: '码', name: 'CODE', who: '机器', what: '心智', line: '机器把这句话变成连接。',
    sheet: 0x1d2c74, on: 0xf6f0ea, soft: 0xbfcaee,
    accent: PALETTE.cool, wind: 1150, chord: [220, 329.63, 440], haptic: [8, 36, 8] },
  { id: 'token', glyph: '符', name: 'TOKEN', who: 'AI', what: '符号', line: '模型读到的，只是符号。',
    sheet: 0xede6dc, on: 0x14110f, soft: 0x544c46,
    accent: PALETTE.ivory, wind: 2400, chord: [261.63, 392, 587.33], haptic: [5, 24, 5, 24, 5] },
];
export const realmIndex = (id) => Math.max(0, REALMS.findIndex((realm) => realm.id === id));

/** 每个 data-scene 章节属于哪一界：现实 → 心智 → 符号 → 回到现实。 */
export const SCENE_REALM = {
  hero: 'text', gate: 'code', sessions: 'code', observe: 'code', recovery: 'code',
  preflight: 'token', product: 'text', finale: 'text',
};
/** 越界发生在哪个章节之前：[章节, 来处, 去处]。 */
export const CROSSINGS = [['gate', 'text', 'code'], ['preflight', 'code', 'token'], ['product', 'token', 'text']];

// ============================================================================
//  纸带：整页内容印在一条纸带上，越过"折线"后卷向远方。DOM 的 CSS 3D 与 WebGL 纸面读同一组常数，
//  两相同构才能严丝合缝。长度单位是视口高度（vh 的倍数），角度是弧度。
// ============================================================================
export const RIBBON = {
  bend: 0.3,          // 折线：视口高度 30% 以上的纸面开始卷起；以下是平整的阅读区
  radius: 0.55,       // 卷曲半径
  arc: 1.05,          // 卷过约 60° 后沿切线直奔远方（不翻过头，远处的内容仍可见）
  perspective: 1.15,  // CSS perspective 与 WebGL 视场共用的视距
  fade: 2.4,          // 纸面退到这么深时，DOM 文字完全淡出
  capture: 0.42,      // 磁吸半径：停下时离最佳展示位不到这么远，就被吸过去
  width: 1180, ratio: 0.64, gutter: 16,   // 纸宽：宽屏取视口 64% 且不超过 1180px，窄屏两侧各留 16px
};

// ============================================================================
//  环境：视图只声明"我绑定哪个键"，编码交给环境。键表在此登记，品味门禁据此核对每个 data-bind
// ============================================================================
export const ENV_DEFAULTS = {
  realm: 'text', from: 'text', to: 'text', mix: 0,     // 三界：当前、越界两端与进度
  progress: 0, velocity: 0, chapter: '',                // 滚动：全页进度、速度（屏/秒）、当前章节
  frames: 0, depth: 0, moving: false,                   // 本页遥测：已渲染帧数、镜头走过的距离、是否仍在出帧
  checked: 0, recovery: 0,                              // 章节数据：已过的检查数、恢复三态
  focus: '', sense: false,                              // 联动：指针/焦点指向的对象；声音与触感是否开启
};

const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
const rgb = (n) => `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;

/** 同一份常数的 CSS 相：由 home-source 内联进首页，脚本失败时样式依旧完整。 */
export function cssText() {
  const palette = Object.entries(PALETTE).map(([name, value]) => `--${name}: ${hex(value)}; --${name}-rgb: ${rgb(value)};`).join(' ');
  const surface = Object.entries(SURFACE).map(([name, value]) => `--${name}: ${value};`).join(' ');
  const motion = ['snap', 'glide', 'settle'].map((tier) => `--${tier}: ${MOTION[tier] * 1000}ms var(--spring);`).join(' ');
  const realms = REALMS.map((realm, i) =>
    `[data-realm='${realm.id}'] { --accent: ${hex(realm.accent)}; --accent-rgb: ${rgb(realm.accent)}; --realm-index: ${i}; --sheet: ${hex(realm.sheet)}; --on: ${hex(realm.on)}; --on-rgb: ${rgb(realm.on)}; --soft: ${hex(realm.soft)}; }`).join('\n');
  const sheets = REALMS.map((realm) => `--sheet-${realm.id}: ${hex(realm.sheet)};`).join(' ');
  return `:root { ${palette} ${surface} --spring: ${SPRING}; ${motion} --fade: ${MOTION.fade * 1000}ms; --accent: ${hex(REALMS[0].accent)}; --accent-rgb: ${rgb(REALMS[0].accent)}; --realm-index: 0; --realm-count: ${REALMS.length}; ${sheets} --sheet-w: min(${RIBBON.width}px, ${RIBBON.ratio * 100}vw); }\n@media (max-width: 900px) { :root { --sheet-w: calc(100vw - ${RIBBON.gutter * 2}px); } }\n${realms}`;
}
