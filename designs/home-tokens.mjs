/**
 * [INPUT]: 无依赖；纯常数，Node（构建、品味门禁）与浏览器（运行时）都能直接导入。
 * [OUTPUT]: 对外提供 MOTION 三档弹簧标尺与 rate()、RIBBON 纸带几何（地面—立面纸带、俯视镜头、阅读线、最佳展示位、磁吸半径、跟手速率、纸面光照）、
 *           ENV_DEFAULTS 环境键表、TRAIL 山路、GATES 四道关、STATE 结果色、CAMERA 每章镜头、RADII 方角四档与 trailCss()（同一份常数的 CSS 相）。
 * [POS]: 首页四层柔性编码的最底层（Token）：CSS、GLSL 与 DOM 读同一份常数；上面依次是 home-kit（原语）、home-source（组件）、home-taste（门禁）。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ============================================================================
//  物理动效标尺：临界阻尼弹簧，无过冲。一切过渡只取这三档；减弱动态时统一退化为 fade
// ============================================================================
export const MOTION = { snap: 0.24, glide: 0.32, settle: 0.48, fade: 0.14 };
/** 指数跟随速率：约 4 个时间常数落定，对应该档的秒数。 */
export const rate = (tier) => 4.08 / MOTION[tier];
const SPRING = 'linear(0, .114, .319, .514, .669, .781, .859, .91, .944, .965, .979, .987, .992, .995, .997, .998, 1)';

// ============================================================================
//  纸带：一条长 5H 的纸，近端平铺在地面（低、大），远端立起来正对镜头（高、小），镜头俯视 30°。
//  形态取 Shopify Editions Fall ’26 纸带的同组几何常数（实现原创）；山路首页把点阵山印在这条纸带上。
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
  shade: 0.215,       // 纸面越立起越暗：亮度 = 1 − shade·sin(立起角)，近端平铺处不暗
};

/** 环境键：当前章、视图模式、帧调度器是否仍在出帧。 */
export const ENV_DEFAULTS = { chapter: 0, mode: '3d', moving: false };

// ============================================================================
//  山路纸带（2026-11-27 起的首页）：纸带即山坡。下面的常数只服务新首页；上面的三界、地面、图谱在旧模块下线后删除
// ============================================================================
/** 山路：tail 纸带近端之后再向镜头平铺的长度（H）；axis 纸带中轴在屏宽中的位置；curled / restPhone 宽度与手机最佳展示位；
 *  relief 浮雕高度（H，墙面段按 cos 收到 0.2）；light 全页唯一主光（左、上、偏后，世界方向）；gap 拆层时最大层距（H）；gates 四道关在山路上的位置 τ（H）；tau0 纹理起点。 */
export const TRAIL = { tail: 3, axis: 0.47, curled: 0.42, restPhone: 0.3, relief: 0.45, gap: 0.3, gates: [1.1, 2.2, 3.3, 4.4], tau0: -8, light: [-0.55, 0.75, -0.35] };
/** 四道关：key、自上而下的层、核验结果（pass 通过 / mitigated 参数缓解）、24×24 线框图标。关卡色只表示结果。 */
export const GATES = [
  { key: 'session', layer: 0, result: 'pass', name: '会话隔离', icon: '<rect x="4" y="5" width="7" height="14" rx="1"/><rect x="13" y="5" width="7" height="14" rx="1"/>' },
  { key: 'env', layer: 1, result: 'pass', name: '环境对齐', icon: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>' },
  { key: 'leak', layer: 2, result: 'mitigated', name: '暗道封堵', icon: '<path d="M4 12h5M15 12h5M9 8v8M15 8v8"/>' },
  { key: 'gate', layer: 3, result: 'pass', name: '出口门禁', icon: '<path d="M5 20V9l7-5 7 5v11M9 20v-6h6v6"/>' },
];
/** 结果色与珠子底色：只在珠子与读数里出现；山体色阶只在粒子里出现。 */
export const STATE = { idle: '#2a2a2c', reached: '#3a3a3d', check: '#f2f1ec', pass: '#c9e27a', mitigated: '#e8b45c' };
/** 每章镜头（绕支点的轨道）：pivot 支点、yaw 绕竖轴（度，正值往右绕）、el 仰角（度，'ref' 取参考稿机位）、dist 相对参考机位的距离倍数、
 *  fov 视场、shift 支点在屏幕上的位置（'ref' 取纸带中轴与最佳展示位）、phone 手机版 shift。head 为路头 τ，route 为路线画到哪里（'T' = 山顶）。 */
export const CAMERA = [
  { pivot: 'hero', yaw: 66, el: 14, dist: 2.7, fov: 34, shift: [0.64, 0.58], phone: [0.5, 0.68], head: 0, route: 0 },
  { pivot: 'rest', yaw: 0, el: 'ref', dist: 1, fov: 45, shift: 'ref', phone: [0.5, 0.3], head: 0, route: 0 },
  { pivot: 'rest', yaw: 0, el: 'ref', dist: 1, fov: 45, shift: 'ref', phone: [0.5, 0.3], head: 1.1, route: 1.1 },
  { pivot: 'rest', yaw: 0, el: 'ref', dist: 1, fov: 45, shift: 'ref', phone: [0.5, 0.3], head: 2.2, route: 2.2 },
  { pivot: 'rest', yaw: 0, el: 'ref', dist: 1, fov: 45, shift: 'ref', phone: [0.5, 0.3], head: 3.3, route: 3.3 },
  { pivot: 'rest', yaw: 0, el: 'ref', dist: 1, fov: 45, shift: 'ref', phone: [0.5, 0.3], head: 4.4, route: 4.4 },
  { pivot: 'layers', yaw: 38, el: 22, dist: 2.4, fov: 36, shift: [0.42, 0.52], phone: [0.5, 0.34], head: 4.4, route: 4.4 },
  { pivot: 'plate', yaw: 0, el: 6, dist: 1.15, fov: 40, shift: [0.5, 0.46], phone: [0.5, 0.4], head: 4.4, route: 4.4 },
];
/** 圆角四档：精密工具的方角。内层 = 外层 − 内边距，最小 2。 */
export const RADII = [2, 3, 4, 6];
/** 新首页的 CSS 相：结果色、圆角、动效。 */
export function trailCss() {
  const state = Object.entries(STATE).map(([k, v]) => `--s-${k}:${v};`).join('');
  const radii = RADII.map((r, i) => `--r${i + 1}:${r}px;`).join('');
  const motion = ['snap', 'glide', 'settle'].map((tier) => `--${tier}:${MOTION[tier] * 1000}ms var(--spring);`).join('');
  return `:root{${state}${radii}--spring:${SPRING};${motion}--fade:${MOTION.fade * 1000}ms;}`;
}
