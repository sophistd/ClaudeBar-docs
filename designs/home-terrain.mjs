/**
 * [INPUT]: 无依赖；纯函数，Node 与浏览器都能导入。
 * [OUTPUT]: 对外提供 heightAt(τ, v, T) 山路高度场（0…1；τ 为山路长度坐标，v 为横向 −1.6…1.6，T 为山顶位置）、
 *           altitude(τ, h, T) 海拔着色输入（0…1）、bakeHeight(T, w, h, tau0) → {data, w, h, tau0, tau1} RGBA8 纹理数据
 *           （R 高度，G/B 沿 τ 与 v 的坡度，128 为零）、sampleBaked(baked, τ, v) 用与着色器相同的纹素中心双线性读回高度（珠子、路线与粒子落在同一个面上）。
 * [POS]: 点阵山的高度真源。home-scene 的着色器读烘好的纹理，珠子与路线经 sampleBaked 读同一张纹理；纯几何测试仍可直接调 heightAt。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

function hash(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function ridged(x, z) {
  let sum = 0, amp = 0.5, f = 1;
  for (let o = 0; o < 5; o++) { sum += amp * (1 - Math.abs(2 * vnoise(x * f, z * f) - 1)); f *= 2.03; amp *= 0.5; }
  return sum / 0.97;
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** 山路高度：越往山顶越高，中线是山脊，两侧散成山麓；山顶处加一道参差的脊。 */
export function heightAt(tau, v, T) {
  const rise = smooth(-1.5, T, tau) ** 1.3;
  const spine = Math.exp(-(v * v) / 0.35);
  const rough = ridged(tau * 2.1 + 7.3, v * 2.6 + 3.1);
  const crest = smooth(T - 0.35, T, tau) * 0.25 * ridged(v * 6 + 1, tau * 3);
  const edge = 1 - smooth(0.85, 1.55, Math.abs(v));
  return Math.max(0, Math.min(1, (rise * spine * 0.62 + rough * 0.3 * (0.35 + rise) + crest) * edge));
}

/** 海拔：沿山路的进度为主，局部起伏为辅。 */
export const altitude = (tau, h, T) => Math.min(1, Math.max(0, 0.75 * (tau / T) + 0.25 * h));

/** 烘成纹理：横向 w 列覆盖 v ∈ [−1.6, 1.6]，纵向 h 行覆盖 τ ∈ [tau0, T + 0.2]。 */
export function bakeHeight(T, w = 128, h = 1024, tau0 = -3.6) {
  const tau1 = T + 0.2, data = new Uint8Array(w * h * 4), field = new Float32Array(w * h);
  const vAt = (i) => -1.6 + (3.2 * i) / (w - 1), tAt = (j) => tau0 + ((tau1 - tau0) * j) / (h - 1);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) field[j * w + i] = heightAt(tAt(j), vAt(i), T);
  const dt = (tau1 - tau0) / (h - 1), dv = 3.2 / (w - 1), enc = (g) => Math.round(128 + Math.max(-127, Math.min(127, g * 64)));
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = j * w + i, at = (ii, jj) => field[Math.min(h - 1, Math.max(0, jj)) * w + Math.min(w - 1, Math.max(0, ii))];
    data[k * 4] = Math.round(field[k] * 255);
    data[k * 4 + 1] = enc((at(i, j + 1) - at(i, j - 1)) / (2 * dt));
    data[k * 4 + 2] = enc((at(i + 1, j) - at(i - 1, j)) / (2 * dv));
    data[k * 4 + 3] = 255;
  }
  return { data, w, h, tau0, tau1 };
}

/** 与着色器 texture2D(LinearFilter) 一致的读法：坐标落在纹素中心之间做双线性插值，越界按边缘钳住。 */
export function sampleBaked(baked, tau, v) {
  const { data, w, h, tau0, tau1 } = baked;
  const x = Math.min(w - 1, Math.max(0, ((v + 1.6) / 3.2) * (w - 1)));
  const y = Math.min(h - 1, Math.max(0, ((tau - tau0) / (tau1 - tau0)) * (h - 1)));
  const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1), fx = x - x0, fy = y - y0;
  const at = (i, j) => data[(j * w + i) * 4] / 255;
  return (at(x0, y0) * (1 - fx) + at(x1, y0) * fx) * (1 - fy) + (at(x0, y1) * (1 - fx) + at(x1, y1) * fx) * fy;
}
