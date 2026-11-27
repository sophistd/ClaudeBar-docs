/**
 * [INPUT]: 依赖 ./home-ribbon.mjs 的 curve（纸带几何真源）、./home-tokens.mjs 的 RIBBON/TRAIL/CAMERA、./home-terrain.mjs 的 heightAt。
 * [OUTPUT]: 对外提供 trail(vw, vh, phone) → 山路纸带几何（H 为单位：长度 L、近端延长 tail、半宽 halfW、最佳展示位 aRest、山顶 T、
 *           at(a) 纸带中线点与法线、surface(a, v, opts) 纸面点、cameraFor(spec, mode) 绕支点的机位）；
 *           chapterState(s) 章节连续坐标 → 路头 head、路线终点 route、分层 ex、镜头插值 w 与前后两个机位下标；smootherstep。
 * [POS]: 首页的空间语法：纸带不动、山路纹理朝镜头流（τ = head + a − aRest）。纯函数，可在 Node 里测；home-scene 与 home.mjs 都只调这里。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { curve } from './home-ribbon.mjs';
import { RIBBON, TRAIL, CAMERA } from './home-tokens.mjs';
import { heightAt } from './home-terrain.mjs';

const DEG = Math.PI / 180;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smootherstep = (x) => { const t = clamp(x); return t * t * t * (t * (t * 6 - 15) + 10); };

/** 纸带几何（世界单位 = 屏高 H；x 横向，y 向上，z = 纸带的 f 轴，远端为负）。 */
export function trail(vw, vh, phone = false) {
  const c = curve(vw, vh), H = vh, L = RIBBON.length, tail = TRAIL.tail;
  const N = 256, ys = new Float64Array(N + 1), fs = new Float64Array(N + 1);
  for (let i = 0; i <= N; i++) { const [y, f] = c.world(c.L - (i / N) * c.L); ys[i] = y / H; fs[i] = f / H; }
  /** 弧长 a（0 = 近端，L = 墙顶；a < 0 为向镜头平铺的延长段）→ 中线点 [y, z]、法线 [ny, nz]、立起角 th。 */
  const at = (a) => {
    if (a <= 0) return { y: 0, z: -a, ny: 1, nz: 0, th: 0 };
    const o = Math.min(N - 1e-6, (a / L) * N), i = Math.floor(o), t = o - i;
    const ty = ys[i + 1] - ys[i], tz = fs[i + 1] - fs[i], len = Math.hypot(ty, tz) || 1;
    const ny = -tz / len, nz = ty / len;
    return { y: ys[i] + ty * t, z: fs[i] + tz * t, ny, nz, th: Math.atan2(ty, -tz) };
  };
  const aRest = (c.L - c.qAt(vh * (phone ? TRAIL.restPhone : RIBBON.rest)) * c.m) / H;
  const halfW = ((phone ? vw - 32 : TRAIL.curled * vw) * c.m) / (2 * H);
  const T = TRAIL.gates[3] + (L - aRest) - 0.04;
  const relief = (th) => TRAIL.relief * Math.max(0.2, Math.cos(th));

  /** 纸面点：t 为 3D 程度（0 = 平铺成地图），ex 为分层程度，layer 为第几层纸，head 为路头，lift 为沿法线再抬多少。 */
  function surface(a, v, { t = 1, ex = 0, layer = 3, head = 0, lift = 0 } = {}) {
    const p = at(a), tau = head + a - aRest, h = geom.height(tau, v, T);
    const taper = 1 - clampStep(aRest + 0.2, L - 0.15, a);
    const off = relief(p.th) * h * t + (3 - layer) * TRAIL.gap * taper * ex + lift;
    const y = p.y * t, z = p.z * t + -a * (1 - t), ny = p.ny * t + (1 - t), nz = p.nz * t;
    const n = Math.hypot(ny, nz) || 1;
    return [v * halfW, y + (ny / n) * off, z + (nz / n) * off];
  }

  /** 参考机位（main 的纸带镜头）在 H 单位下的位置与支点。 */
  const restPoint = at(aRest), camY = c.camY / H, camZ = c.camF / H;
  const ref = { dist: Math.hypot(camY - restPoint.y, camZ - restPoint.z), el: Math.atan2(camY - restPoint.y, camZ - restPoint.z) / DEG };
  const pivots = {
    hero: () => { const p = at(3.0); return [0, p.y + 0.2, p.z]; },
    rest: () => [0, restPoint.y, restPoint.z],
    layers: () => { const p = at(aRest - 2.2); return [0, p.y + 0.6, p.z]; },
    plate: () => { const p = at(L - 0.65); return [0, p.y, p.z]; },
  };
  /** 一个镜头规格在 3D（mode = 1）或 2D（mode = 0）下的轨道参数。 */
  function cameraFor(spec) {
    const fovAdd = phone ? 7 : 0;
    const shift = phone ? spec.phone : spec.shift === 'ref' ? [TRAIL.axis, RIBBON.rest] : spec.shift;
    const three = { pivot: pivots[spec.pivot](), yaw: spec.yaw, el: spec.el === 'ref' ? ref.el : spec.el, dist: spec.dist * ref.dist, fov: spec.fov + fovAdd, shift };
    const a = spec.pivot === 'plate' ? L - 0.65 : spec.pivot === 'layers' ? aRest - 2.2 : spec.pivot === 'hero' ? 3.0 : aRest;
    const fa = spec.pivot === 'hero' ? L - 1.0 : a;   // 平面首屏看山顶那一段：海拔最高、颜色最暖
    const flat = { pivot: [0, 0, -fa], yaw: 0, el: 89, dist: 2.6 * ref.dist, fov: 30 + fovAdd, shift: phone ? [0.5, spec.pivot === 'hero' ? 0.34 : 0.4] : [TRAIL.axis, 0.5] };
    return { three, flat };
  }
  /** height 可由渲染层换成「读烘好的纹理」，让珠子与粒子落在同一个面上；默认直接算高度场。 */
  const geom = { c, H, L, tail, halfW, aRest, T, at, surface, relief, ref, cameraFor, height: heightAt };
  return geom;
}
function clampStep(a, b, x) { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); }

/** 章节连续坐标 s（整数 = 该章停驻中心）→ 叙事参数。停驻段占章间距的 40%（|f − 整数| ≤ 0.2）。 */
export function chapterState(s, T) {
  const last = CAMERA.length - 1, x = clamp(s, 0, last);
  const i = Math.min(last - 1, Math.floor(x)), f = x - i;
  const w = smootherstep((f - 0.2) / 0.6);
  const A = CAMERA[i], B = CAMERA[i + 1];
  const head = A.head + (B.head - A.head) * w;
  const routeOf = (spec) => (spec.route === 'T' ? T : spec.route);
  const route = routeOf(A) + (routeOf(B) - routeOf(A)) * w;
  // 分层：第 6 章停驻段揭开，进入第 7 章的过渡里合回
  const ex = x <= 6 ? smootherstep((x - 5.8) / 0.2) : 1 - smootherstep((x - 6.2) / 0.6);
  return { i, j: i + 1, w, head, route, ex: clamp(ex) };
}

/** 两个轨道参数之间插值：角度线性，距离与视场取对数。 */
export function mixOrbit(A, B, w) {
  const lin = (a, b) => a + (b - a) * w, log = (a, b) => Math.exp(lin(Math.log(a), Math.log(b)));
  return {
    pivot: A.pivot.map((v, k) => lin(v, B.pivot[k])), yaw: lin(A.yaw, B.yaw), el: lin(A.el, B.el),
    dist: log(A.dist, B.dist), fov: log(A.fov, B.fov), shift: [lin(A.shift[0], B.shift[0]), lin(A.shift[1], B.shift[1])],
  };
}
/** 轨道 → 镜头位置。 */
export function orbitPosition(o) {
  const y = o.yaw * DEG, e = o.el * DEG;
  return [o.pivot[0] + Math.sin(y) * Math.cos(e) * o.dist, o.pivot[1] + Math.sin(e) * o.dist, o.pivot[2] + Math.cos(y) * Math.cos(e) * o.dist];
}
