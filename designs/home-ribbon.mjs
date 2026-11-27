/**
 * [INPUT]: 依赖 ./home-tokens.mjs 的 RIBBON 纸带常数；读取 home-source 生成的纸带结构
 *          （.col > * 与 [data-slab] 为纸片，[data-hold] / [data-pin] 为驻留段，[data-anchor] 为引线落点）。
 * [OUTPUT]: 对外提供 curve(vw, vh) 纸带与镜头几何（含 qAt 屏幕高度→版面行、world 行→世界坐标、toCam 世界→镜头）、bend(q, c) 纸面落点、
 *           project(x, q, c) 屏幕投影、rest(h, c) 最佳展示位、measure(track) 版面缓存、pinShift(pin, scroll) 驻留位移、
 *           createRibbon(layout) → {apply(scroll, c)} 纸片变换写入器（含 data-stand 立起、data-float 悬浮、--lit 纸面光照）、createLeaders(svg) → {draw(rail, targets)} 引线。
 * [POS]: 首页纸带的几何真源：DOM 的 CSS 3D（home.mjs 驱动）、WebGL 纸面与线框（home-scene）、章节引线都调用这里的同一条曲线，
 *        所以文字与纸面严丝合缝。形态复刻 Shopify Editions Fall ’26 的地面—立面纸带（同组常数，代码原创）。它只算几何、只写 transform/opacity，不读滚动、不请求帧——帧归 home-kit 的调度器。
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

  const c = { vw, vh, P, m: 1, L, toCam, camF, pitch };
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

/** 版面视口行 q 处的纸，卷曲后落在 [Y, Z]，倾角 a（弧度，正值 = 下沿朝向观者），可见度 alpha，光照 lit，纸面在世界里的立起角 th（0 = 平铺地面，π/2 = 直立）。 */
export function bend(q, c) {
  const row = q * c.m, [Y, Z, a, lit, th] = c.row(row);
  return [Y, Z, a, clamp(row / (c.vh * 0.18), 0, 1), lit, th];
}

/** 纸面上一点（x 为版面中相对视口中线的偏移，q 为版面视口行）在屏幕上的位置与缩放。 */
export function project(x, q, c) {
  const [Y, Z] = bend(q, c), k = c.P / Math.max(1, c.P - Z);
  return [c.vw / 2 + x * c.m * k, c.vh / 2 + (Y - c.vh / 2) * k, k * c.m];
}

/** 一块高 h 的内容的最佳展示位：中线落在屏幕高度 rest 处；太高就让顶边贴在屏幕 16% 处。返回该内容顶边的版面视口行。 */
export const rest = (h, c) => Math.max(c.qAt(c.vh * 0.16), c.qAt(c.vh * RIBBON.rest) - h / 2);

// ============================================================================
//  版面缓存：一次读完所有纸片的版面位置（offsetTop 链不受 transform 影响），滚动时只做算术。
// ============================================================================
const SLAB = '.col > *, [data-slab]';
const offset = (el, root) => { let x = 0, y = 0; for (let n = el; n && n !== root; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; } return [x, y]; };

export function measure(track) {
  const box = (el) => { const [x, y] = offset(el, track); return { el, x, top: y, h: el.offsetHeight, w: el.offsetWidth }; };
  const pins = [...track.querySelectorAll('[data-pin]')].map((el) => {
    const hold = box(el.closest('[data-hold]')), self = box(el);
    return { ...self, H: Math.max(0, hold.top + hold.h - self.top - self.h), a: 0 };
  });
  const slabs = [...track.querySelectorAll(SLAB)].filter((el) => !el.closest('[hidden]')).map((el) => {
    const slab = box(el); slab.pin = pins.find((pin) => pin.el.contains(el)) ?? null; slab.key = ''; slab.lit = '';
    slab.stand = Number(el.dataset.stand ?? 0) * DEG; slab.float = Number(el.dataset.float ?? 0);
    return slab;
  });
  const sections = new Map([...track.querySelectorAll('section[id]')].map((el) => [el.id, box(el)]));
  // 每一节的内容框：第一块纸片到最后一块，供最佳展示位与引线使用
  for (const section of sections.values()) {
    const own = slabs.filter((slab) => section.el.contains(slab.el) && !slab.el.matches('[data-skip-rest]'));
    if (own.length) { section.cTop = own[0].top; section.cH = own.at(-1).top + own.at(-1).h - own[0].top; }
    section.anchors = slabs.filter((slab) => section.el.contains(slab.el) && slab.el.matches('[data-anchor]'));
  }
  const col = track.querySelector('.col');
  return { slabs, pins, sections, height: track.offsetHeight, sheetW: col?.offsetWidth ?? 0 };
}

/** 驻留段（与 position: sticky 同义）在滚动 scroll 时的位移。 */
export const pinShift = (pin, scroll) => (pin ? clamp(scroll - pin.a, 0, pin.H) : 0);

// ============================================================================
//  纸片写入器：每块纸片按自身中线所在的行落到纸带上，并放大 m 倍（世界单位 = 版面像素 × m）。
//  透视原点放在视口中心（换算成纸片自己的坐标），于是每块纸片单独带 perspective() 也共享同一个消失点。
// ============================================================================
export function createRibbon(layout) {
  const write = (slab, transform, origin, opacity) => {
    const key = `${transform}|${opacity}`;
    if (key === slab.key) return;
    slab.key = key;
    slab.el.style.transformOrigin = origin; slab.el.style.transform = transform; slab.el.style.opacity = opacity;
  };
  return {
    apply(scroll, c) {
      for (const slab of layout.slabs) {
        const yL = slab.top + slab.h / 2, q = yL - scroll + pinShift(slab.pin, scroll);
        if (q - slab.h / 2 > c.qBottom) { write(slab, 'none', '', '0'); continue; }   // 还没走到屏幕底边
        const [Y, Z, a, alpha, lit, th] = bend(q, c);
        if (alpha <= 0) { write(slab, 'none', '', '0'); continue; }                    // 已越过纸带远端
        const cx = slab.x + slab.w / 2 - c.vw / 2, cy = yL - c.vh / 2;
        // 立起与悬浮发生在纸面自己的坐标里：先离开纸面 float，再绕下沿转 stand（上沿朝天）。
        // 立起角按"纸面已经立起多少"递减：平铺处标题直立如墙，纸面直立处标题平贴回纸上，任何位置都正对得上镜头
        const stand = slab.stand * clamp(1 - th / (Math.PI / 2), 0, 1);
        const up = slab.stand || slab.float ? ` translateZ(${slab.float}px) translateY(${(slab.h / 2).toFixed(1)}px) rotateX(${(-stand).toFixed(4)}rad) translateY(${(-slab.h / 2).toFixed(1)}px)` : '';
        const transform = `perspective(${c.P.toFixed(0)}px) translate3d(${(cx * (c.m - 1)).toFixed(2)}px, ${(Y - yL).toFixed(2)}px, ${Z.toFixed(2)}px) `
          + `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px) rotateX(${a.toFixed(4)}rad) scale(${c.m.toFixed(4)})${up} translate(${(-cx).toFixed(1)}px, ${(-cy).toFixed(1)}px)`;
        const shade = lit.toFixed(3);
        if (shade !== slab.lit) { slab.lit = shade; slab.el.style.setProperty('--lit', shade); }
        // 挤出高度随远近增长（参考稿 cityGrow）：阅读线处 1 倍，越往远处越高，最多 3 倍——远处的面板像一排更高的楼
        const grow = (1 + 2 * clamp((c.qRead - q) / c.vh, 0, 1)).toFixed(2);
        if (grow !== slab.grow) { slab.grow = grow; slab.el.style.setProperty('--grow', grow); }
        write(slab, transform, `${(c.vw / 2 - slab.x).toFixed(1)}px ${(c.vh / 2 - slab.top).toFixed(1)}px`, alpha >= 1 ? '' : alpha.toFixed(3));
      }
    },
  };
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
