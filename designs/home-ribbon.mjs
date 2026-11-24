/**
 * [INPUT]: 依赖 ./home-tokens.mjs 的 RIBBON 纸带常数；读取 home-source 生成的纸带结构
 *          （.col > * 与 [data-slab] 为纸片，[data-hold] / [data-pin] 为驻留段，[data-anchor] 为引线落点）。
 * [OUTPUT]: 对外提供 curve(vw, vh) 视口几何、bend(y, c) 纸面卷曲、project(x, y, c) 屏幕投影、rest(h, c) 最佳展示线、
 *           GLSL_BEND 着色器片段、measure(track) 版面缓存、pinShift(pin, scroll) 驻留位移、
 *           createRibbon(layout) → {apply(scroll, c)} 纸片变换写入器、createLeaders(svg) → {draw(rail, targets)} 引线。
 * [POS]: 首页纸带的几何真源：DOM 的 CSS 3D（home.mjs 驱动）、WebGL 纸面与线框（home-scene）、章节引线都调用这里的同一条曲线，
 *        所以文字与纸面严丝合缝。它只算几何、只写 transform/opacity，不读滚动、不请求帧——帧归 home-kit 的调度器。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { RIBBON } from './home-tokens.mjs';

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// ============================================================================
//  曲线：折线以下是平整的阅读区；以上先沿半径 R 卷起 arc 弧度，再沿切线直奔远方。
//  坐标是视口像素：y 向下，z 向外为正（卷起的纸面 z < 0，离开观者）。
// ============================================================================
export function curve(vw, vh) {
  return { vw, vh, yb: vh * RIBBON.bend, R: vh * RIBBON.radius, arc: RIBBON.arc, P: Math.max(900, vh * RIBBON.perspective) };
}

/** 平面上视口高度 y 处的纸，卷曲后落在 [Y, Z]，切面倾角 a（弧度，正值 = 上沿远离观者）。 */
export function bend(y, c) {
  if (y >= c.yb) return [y, 0, 0];
  const d = c.yb - y, L = c.R * c.arc;
  if (d <= L) { const t = d / c.R; return [c.yb - c.R * Math.sin(t), -c.R * (1 - Math.cos(t)), t]; }
  const e = d - L, s = Math.sin(c.arc), k = Math.cos(c.arc);
  return [c.yb - c.R * s - e * k, -c.R * (1 - k) - e * s, c.arc];
}

/** 纸面上一点（x 相对视口中线，y 为平面视口高度）在屏幕上的位置与缩放。 */
export function project(x, y, c) {
  const [Y, Z] = bend(y, c), k = c.P / (c.P - Z);
  return [c.vw / 2 + x * k, c.vh / 2 + (Y - c.vh / 2) * k, k];
}

/** 一块高 h 的内容的最佳展示线：在平整阅读区内居中，太高就贴着折线下方。底部让出状态栏。 */
export const rest = (h, c) => Math.max(c.yb + 16, c.yb + (c.vh - 32 - c.yb - h) / 2);

/** WebGL 纸面与线框用的同一条曲线（GLSL 版），常数由 uniform 传入。 */
export const GLSL_BEND = /* glsl */`
uniform float uYb, uR, uArc;
vec3 bend(float y) {
  if (y >= uYb) return vec3(y, 0.0, 0.0);
  float d = uYb - y, L = uR * uArc;
  if (d <= L) { float t = d / uR; return vec3(uYb - uR * sin(t), -uR * (1.0 - cos(t)), t); }
  float e = d - L;
  return vec3(uYb - uR * sin(uArc) - e * cos(uArc), -uR * (1.0 - cos(uArc)) - e * sin(uArc), uArc);
}`;

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
    const slab = box(el); slab.pin = pins.find((pin) => pin.el.contains(el)) ?? null; slab.key = ''; return slab;
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
//  纸片写入器：每块纸片按自身中线所在高度卷曲。透视原点放在视口中心（换算成纸片自己的坐标），
//  于是每块纸片单独带 perspective() 也共享同一个消失点，不依赖 preserve-3d 链。
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
      const depth = c.vh * RIBBON.fade;
      for (const slab of layout.slabs) {
        const yL = slab.top + slab.h / 2, yv = yL - scroll + pinShift(slab.pin, scroll);
        if (yv - slab.h / 2 > c.vh * 1.25) { write(slab, 'none', '', ''); continue; }   // 还在视口下方：版面位置本就在裁切区外
        const [Y, Z, a] = bend(yv, c), fade = clamp(1 + Z / depth, 0, 1);
        if (fade <= 0) { write(slab, 'none', '', '0'); continue; }
        const cy = (yL - c.vh / 2).toFixed(1);
        const transform = a === 0 && Z === 0
          ? `translate3d(0, ${(Y - yL).toFixed(2)}px, 0)`
          : `perspective(${c.P.toFixed(0)}px) translate3d(0, ${(Y - yL).toFixed(2)}px, ${Z.toFixed(2)}px) translateY(${cy}px) rotateX(${a.toFixed(4)}rad) translateY(${-cy}px)`;
        write(slab, transform, `${(c.vw / 2 - slab.x).toFixed(1)}px ${(c.vh / 2 - slab.top).toFixed(1)}px`, fade >= 1 ? '' : fade.toFixed(3));
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
