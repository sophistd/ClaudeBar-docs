/**
 * [INPUT]: 依赖 ./home-tokens.mjs 的 RIBBON 纸带常数。
 * [OUTPUT]: 对外提供 curve(vw, vh) 纸带与镜头几何（含 world 行→世界坐标、row 行→CSS 3D 落点、qAt 屏幕高度→版面行、toCam 世界→镜头、camY/camF 镜头位置）、
 *           createLeaders(svg) → {draw(from, targets)} 章节索引引线。
 * [POS]: 首页纸带的几何真源：home-trail 由 curve 造出山坡与参考机位；只算几何，不读滚动、不请求帧。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { RIBBON } from './home-tokens.mjs';

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// ============================================================================
//  曲线：一条长 5H 的纸带，近端平铺在地面上，越往远端越立起来、直到正对镜头；镜头俯视 30°。
//  纸带本身不动，内容沿纸带滑行：滚动时内容从屏幕下方（近、低、大）走向上方（远、高、小）。
//  这里在世界坐标里造出纸带（y 向上、f 向前），换到镜头坐标（u 向上、g 为深度），
//  再换成 CSS 3D：Y = H/2 − u，Z = P − g，于是 CSS perspective(P) 与 WebGL 相机逐像素一致。
// ============================================================================
const N = 64, DEG = Math.PI / 180;

export function curve(vw, vh) {
  const H = vh, L = RIBBON.length * H, ds = L / N, pitch = RIBBON.pitch * DEG, k = RIBBON.sharpness;
  const camH = RIBBON.height * H, camB = -RIBBON.back * H;
  const ease = (u) => Math.expm1(k * u) / Math.expm1(k);

  // ---- 造纸带：每段的倾角 = 立起程度 × "正对基准镜头所需的角度" ----
  const y = new Float64Array(N + 1), f = new Float64Array(N + 1), th = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const face = Math.PI / 2 + Math.atan2(y[i] - camH, camB - f[i]), a = ease((i + 0.5) / N) * face;
    y[i + 1] = y[i] + Math.sin(a) * ds; f[i + 1] = f[i] - Math.cos(a) * ds; th[i] = a;
  }

  // ---- 镜头：基准视线打到纸带上的距离 D；再把镜头沿视线移到对准 focus 行的位置 ----
  const dir = [Math.sin(pitch), -Math.cos(pitch)];
  let D = H;
  for (let i = 0; i < N; i++) {
    const ex = y[i + 1] - y[i], ef = f[i + 1] - f[i], den = dir[0] * ef - dir[1] * ex;
    if (Math.abs(den) < 1e-9) continue;
    const dy = y[i] - camH, df = f[i] - camB, t = (ef * dy - ex * df) / den, s = (dir[1] * dy - dir[0] * df) / den;
    if (s >= -1e-6 && s <= 1 + 1e-6 && t > 0) { D = t; break; }
  }
  const at = (arc) => { const o = clamp(arc / ds, 0, N), i = Math.min(N - 1, Math.floor(o)), t = o - i; return [y[i] + (y[i + 1] - y[i]) * t, f[i] + (f[i + 1] - f[i]) * t]; };
  const [fy, ff] = at(L - (RIBBON.focus * H + H / 2));
  const camY = fy - D * dir[0], camF = ff - D * dir[1];
  const sp = Math.sin(pitch), cp = Math.cos(pitch);
  /** 世界点 → 镜头坐标 [u 向上, g 深度]。地面网格也用它。 */
  const toCam = (py, pf) => { const l = py - camY, h = pf - camF; return [l * cp + h * sp, l * sp - h * cp]; };

  // ---- 每个采样点的 CSS 3D 位置与切面倾角（沿"行增大"方向，即朝近端）----
  const P = (H / 2) / Math.tan((RIBBON.fov * DEG) / 2);
  const Y = new Float64Array(N + 1), Z = new Float64Array(N + 1), A = new Float64Array(N + 1);
  for (let i = 0; i <= N; i++) { const [u, g] = toCam(y[i], f[i]); Y[i] = H / 2 - u; Z[i] = P - g; }
  const seg = Array.from({ length: N }, (_, i) => Math.atan2(Z[i] - Z[i + 1], Y[i] - Y[i + 1]));
  for (let i = 0; i <= N; i++) A[i] = (seg[Math.max(0, i - 1)] + seg[Math.min(N - 1, i)]) / 2;

  const c = { vw, vh, P, m: 1, L, toCam, camY, camF, pitch };
  /** 世界行 row（0 = 远端）在世界坐标里的 [y, f]：舞台素材据此站到纸带旁的地面上。 */
  c.world = (row) => at(L - row);
  /** 世界行 row（0 = 远端）→ [Y, Z, 倾角, 光照, 纸面在世界里的立起角]。光照随纸面立起而暗（参考稿 shade 项）。超出两端的行贴在端点上。 */
  c.row = (row) => {
    const o = clamp((L - row) / ds, 0, N), i = Math.min(N - 1, Math.floor(o)), t = o - i;
    const w = th[Math.min(N - 1, Math.round(o))];
    return [Y[i] + (Y[i + 1] - Y[i]) * t, Z[i] + (Z[i + 1] - Z[i]) * t, A[i] + (A[i + 1] - A[i]) * t, 1 - RIBBON.shade * Math.max(0, Math.sin(w)), w];
  };
  const screenY = (row) => { const [Yc, Zc] = c.row(row); return c.vh / 2 + (Yc - c.vh / 2) * P / Math.max(1, P - Zc); };
  const rowAt = (sy) => { let lo = 0, hi = L; for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (screenY(mid) < sy) lo = mid; else hi = mid; } return lo; };

  // 阅读线上的内容 1:1 显示：版面像素到世界单位的倍率 m = 1 / 该处的透视缩放
  const reading = c.row(rowAt(H * RIBBON.reading));
  c.m = (P - reading[1]) / P;
  /** 屏幕高度 sy 处对应的版面视口行 q（未卷曲时内容距视口顶边的距离）。 */
  c.qAt = (sy) => rowAt(sy) / c.m;
  c.qBottom = c.qAt(H * 1.08);
  c.qRead = c.qAt(H * RIBBON.reading);   // 阅读线所在的版面行，逐帧要用，先算好
  return c;
}

// ============================================================================
//  引线：左侧章节索引的当前项，用三次曲线连到纸面左缘上本章的落点（与参考稿的"索引—内容"同一读法）。
// ============================================================================
export function createLeaders(svg) {
  const NS = 'http://www.w3.org/2000/svg';
  const pool = [];
  const node = (i) => {
    if (!pool[i]) {
      const g = document.createElementNS(NS, 'g'), path = document.createElementNS(NS, 'path'), dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('r', '3'); g.append(path, dot); svg.append(g); pool[i] = { g, path, dot, key: '' };
    }
    return pool[i];
  };
  return {
    /** from：屏幕上的起点；targets：[{x, y, alpha}] 屏幕上的落点。 */
    draw(from, targets) {
      targets.forEach((t, i) => {
        const n = node(i), dx = Math.max(40, (t.x - from.x) * 0.5);
        const d = `M${from.x.toFixed(1)} ${from.y.toFixed(1)}C${(from.x + dx).toFixed(1)} ${from.y.toFixed(1)} ${(t.x - dx).toFixed(1)} ${t.y.toFixed(1)} ${t.x.toFixed(1)} ${t.y.toFixed(1)}`;
        const key = `${d}|${t.alpha.toFixed(2)}`;
        if (key === n.key) return;
        n.key = key; n.path.setAttribute('d', d); n.dot.setAttribute('cx', t.x.toFixed(1)); n.dot.setAttribute('cy', t.y.toFixed(1));
        n.g.style.opacity = t.alpha.toFixed(2);
      });
      for (let i = targets.length; i < pool.length; i++) if (pool[i].key) { pool[i].key = ''; pool[i].g.style.opacity = '0'; }
    },
  };
}
