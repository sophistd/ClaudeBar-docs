/**
 * [INPUT]: 无依赖；纯数据，Node（构建、品味门禁）与浏览器（运行时）都能直接导入。
 * [OUTPUT]: 对外提供 PALETTE 色板、MOTION 三档弹簧标尺与 rate()、REALMS 三界定义（含纸面与纸上文字色）、RIBBON 纸带几何（地面—立面纸带、俯视镜头、阅读线、磁吸与跟手速率、光照与立体层）、GROUND 地面网格·脉冲·翻滚方块、GRAPH 首屏关系图谱、SCENE_REALM 章节归属、
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
  { id: 'text', glyph: '文', name: 'TEXT', who: '人', what: '现实', line: '回到现实：这些都在菜单栏里。',
    sheet: 0xa83a0c, on: 0xf6f0ea, soft: 0xf0dbcf,
    accent: PALETTE.terracotta, wind: 420, chord: [196, 246.94, 293.66], haptic: [10] },
  { id: 'code', glyph: '码', name: 'CODE', who: '机器', what: '心智', line: '受管连接，先过门禁。',
    sheet: 0x1430b0, on: 0xf6f0ea, soft: 0xbfcaee,
    accent: PALETTE.cool, wind: 1150, chord: [220, 329.63, 440], haptic: [8, 36, 8] },
  { id: 'token', glyph: '符', name: 'TOKEN', who: 'AI', what: '符号', line: '模型读到的，只是一串符号。',
    sheet: 0xede6dc, on: 0x14110f, soft: 0x544c46,
    accent: PALETTE.ivory, wind: 2400, chord: [261.63, 392, 587.33], haptic: [5, 24, 5, 24, 5] },
];
export const realmIndex = (id) => Math.max(0, REALMS.findIndex((realm) => realm.id === id));

/** 每个 data-scene 章节属于哪一界：现实 → 心智 → 符号 → 回到现实。 */
export const SCENE_REALM = {
  hero: 'text', gate: 'code', leak: 'code', recovery: 'code',   // 网络这一侧：出口漂移、流量绕路、断网之后
  sessions: 'token', locale: 'token',                            // 服务方看到的你：同机多号的指纹、时区与语言
  product: 'text', finale: 'text',
};
/** 越界发生在哪个章节之前：[章节, 来处, 去处]。 */
export const CROSSINGS = [['gate', 'text', 'code'], ['sessions', 'code', 'token'], ['product', 'token', 'text']];

// ============================================================================
//  纸带：整页内容印在一条长纸上——近处平铺在地面（低、大），远处立起来正对镜头（高、小），
//  镜头俯视 30°。形态复刻 Shopify Editions Fall ’26 的"New Dimension"纸带（同一组几何常数，实现原创）。
//  DOM 的 CSS 3D、WebGL 纸面、线框与引线都读同一条曲线。长度以视口高度 H 为单位，角度为度。
// ============================================================================
export const RIBBON = {
  length: 5,          // 纸带全长 = 5H，自近端（地面）向远端
  sharpness: 6.54,    // 立起的集中程度：expm1(k·u)/expm1(k)，越大越集中在远端
  height: 1.015,      // 镜头离地高度（H）
  back: 1,            // 镜头基准位置在纸带起点前方多远（H）
  pitch: -30.2,       // 镜头俯角
  fov: 45,            // 竖直视场
  focus: 0.77,        // 镜头对准的纸带行（H），决定纸带在屏幕上的上下位置
  reading: 0.45,      // 阅读线：屏幕高度 45% 处的内容按 1:1 显示，其余处近大远小
  rest: 0.5,          // 最佳展示位：内容中线落在屏幕高度 50%
  capture: 0.12,      // 磁吸半径（H）：只在停得很近时轻轻吸正，不打断自由滚动
  lerp: 6,            // 滚轮跟手速率（每秒），即 Lenis lerp 0.1 × 60
  width: 1180, ratio: 0.64, gutter: 16,   // 平整版纸宽
  curled: 0.5,        // 卷曲版纸宽（视口宽度的比例）：近处放大后约占八成宽
  shade: 0.215,       // 纸面越立起越暗：亮度 = 1 − shade·sin(立起角)，近端平铺处不暗
  // 立体层：纸上的东西不全是印上去的。data-stand 的块绕自己的下沿从纸面立起，data-float 的块离开纸面悬起（版面像素）
  stand: { heading: 90, float: 60, shot: 35, depth: 14, button: 42, lift: 22 },
};

// ============================================================================
//  地面与图谱：照参考稿 grid / pulses / cubes / graph 四层的同名参数。参考稿的强度是黑色受光地面上的发光量，
//  这里画在黑底上的半透明线，强度按画面对过一遍；脉冲与翻滚由滚动距离推动（run、step），不走时钟
// ============================================================================
// 光环境：全页只有一盏主光，从左前上方来；面板投影、场景图投影都从这里取方向（版面像素，y 向下为正）
export const LIGHT = { x: 4, y: -5 };

export const GROUND = {
  columns: 6, every: 10,                       // 一屏宽 = 6 个粗格 = 60 个细格
  minor: 0.05, major: 0.15, diagonal: 0.045,   // 细格 / 粗格 / 对角线的线强
  pulse: { amount: 0.5, length: 300, bright: 0.6, run: 1.6 },   // 一半的粗格纵线带脉冲；拖尾 300 版面像素；脉冲跑得比地面后退快 1.6 倍
  cubes: { count: 12, cols: 5, rows: 4, apart: 0.85, alpha: 0.24, edge: 0.8, step: 150 },   // 每 0.85 屏一片格子、左右交替；格线淡、方块的棱亮；每滚 150px 翻一格
};
export const GRAPH = {
  hubs: 9, leaves: [10, 18], cross: 36,        // 枢纽数、每个枢纽的叶子数区间、跨枢纽的弱连接数
  lift: 46, hubLift: 92, spread: 0.17,         // 叶子与枢纽离开纸面的高度（版面像素）；叶子散开半径（占图宽）
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
  return `:root { ${palette} ${surface} --spring: ${SPRING}; ${motion} --fade: ${MOTION.fade * 1000}ms; --light-x: ${LIGHT.x}px; --light-y: ${LIGHT.y}px; --accent: ${hex(REALMS[0].accent)}; --accent-rgb: ${rgb(REALMS[0].accent)}; --realm-index: 0; --realm-count: ${REALMS.length}; ${sheets} --sheet-w: min(${RIBBON.width}px, ${RIBBON.ratio * 100}vw); }\n.has-webgl { --sheet-w: min(${RIBBON.width}px, ${RIBBON.curled * 100}vw); }\n@media (max-width: 900px) { :root { --sheet-w: calc(100vw - ${RIBBON.gutter * 2}px); } .has-webgl { --sheet-w: calc(100vw - ${RIBBON.gutter * 5}px); } }\n${realms}`;
}
