/**
 * [INPUT]: 依赖 three 的 ShaderPass/CanvasTexture；由 home-scene.mjs 放在 OutputPass 之后（显示参考色彩空间）。
 * [OUTPUT]: 对外提供 createInspection({ink, paper, onRedraw}) → { pass, setResolution(w, h, dpr), apply({sweep, ascii, aberration}) }。
 * [POS]: 首页的"海关 X 光"后期：Bayer 1-bit 抖动 + 扫描线（被检查的区域）、等宽字符化（诊断即日志）、
 *        按滚动速度的 RGB 分离。全部参数由镜头轨道推出，静止即归零，不持有任何时钟。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// ============================================================================
//  字形图集：按亮度从暗到亮排列的 10 个字符，Geist Mono 绘制；字体就绪后重画一次
// ============================================================================
const RAMP = ' .:-=+*#%@';
function glyphAtlas() {
  const cell = 64, canvas = document.createElement('canvas');
  canvas.width = cell * RAMP.length; canvas.height = cell;
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter; texture.generateMipmaps = false;
  const draw = () => {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, cell);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `500 ${cell * 0.78}px "Geist Mono", ui-monospace, monospace`;
    [...RAMP].forEach((ch, i) => ctx.fillText(ch, i * cell + cell / 2, cell / 2 + 2));
    texture.needsUpdate = true;
  };
  draw();
  return { texture, redraw: draw };
}

const fragment = /* glsl */`
  uniform sampler2D tDiffuse, tGlyphs;
  uniform vec2 uRes; uniform float uDpr, uSweep, uAscii, uAberr, uCell;
  uniform vec3 uInk, uPaper;
  varying vec2 vUv;

  float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
  float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
  float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }
  float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  // 陶土锚点与暖色粒子是"证据"，在 X 光与字符化下都保留原色
  float warmth(vec3 c) { return smoothstep(0.12, 0.32, c.r - c.b) * smoothstep(0.25, 0.5, c.r); }

  void main() {
    vec2 uv = vUv;

    // ---- 速度色散：只在镜头追赶滚动时出现 ----
    vec2 dir = (uv - 0.5) * uAberr;
    vec3 color = vec3(texture2D(tDiffuse, uv + dir).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - dir).b);

    // ---- 字符化：诊断章节把画面重写成等宽日志 ----
    if (uAscii > 0.001) {
      vec2 cell = vec2(uCell * 0.62, uCell) * uDpr / uRes;
      vec2 id = floor(uv / cell), inCell = fract(uv / cell);
      vec3 src = texture2D(tDiffuse, (id + 0.5) * cell).rgb;
      // 黑场 0.2：雾与泛光晕不生成字符，只有门框、节点与路径被"写"出来
      float lit = clamp((luma(src) - 0.2) / 0.55, 0.0, 1.0);
      float level = floor(min(pow(lit, 0.75), 0.999) * 10.0);
      float glyph = texture2D(tGlyphs, vec2((level + inCell.x) / 10.0, inCell.y)).r;
      vec3 ink = mix(uPaper * 0.9, vec3(0.96, 0.52, 0.36), warmth(src));
      vec3 ascii = uInk + glyph * ink;
      color = mix(color, ascii, uAscii);
    }

    // ---- X 光：扫描线以下的区域被 1-bit 抖动"检查"，扫描线本身是一道冷白光 ----
    float inspected = step(uv.y, uSweep) * step(0.001, uSweep);
    if (inspected > 0.0) {
      vec2 px = floor(gl_FragCoord.xy / max(1.0, uDpr * 1.5));
      float threshold = bayer8(px);
      vec3 bit = luma(color) * 1.15 > threshold ? uPaper : uInk;
      bit = mix(bit, color, warmth(color));
      bit *= 0.9 + 0.1 * step(0.5, fract(gl_FragCoord.y / (3.0 * uDpr)));   // 静态 CRT 扫描线，不滚动
      color = bit;
    }
    float edge = exp(-pow((uv.y - uSweep) * uRes.y / (1.2 * uDpr), 2.0)) * step(0.001, uSweep) * step(uSweep, 0.995);
    color += uPaper * edge * 0.9;

    gl_FragColor = vec4(color, 1.0);
  }`;

export function createInspection({ ink = 0x0a0908, paper = 0xf6f0ea, onRedraw = () => {} } = {}) {
  const atlas = glyphAtlas();
  const srgb = (hex) => new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace);   // 已在显示空间，按原值传入
  const pass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null }, tGlyphs: { value: atlas.texture },
      uRes: { value: new THREE.Vector2(1, 1) }, uDpr: { value: 1 },
      uSweep: { value: 0 }, uAscii: { value: 0 }, uAberr: { value: 0 }, uCell: { value: 11 },
      uInk: { value: srgb(ink) }, uPaper: { value: srgb(paper) },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: fragment,
  });
  const u = pass.uniforms;
  document.fonts?.ready.then(() => { atlas.redraw(); onRedraw(); });   // 字形换成 Geist Mono 后补一帧
  return {
    pass,
    setResolution(w, h, dpr) { u.uRes.value.set(w * dpr, h * dpr); u.uDpr.value = dpr; },
    apply({ sweep = 0, ascii = 0, aberration = 0 }) {
      u.uSweep.value = sweep; u.uAscii.value = ascii; u.uAberr.value = aberration;
    },
  };
}
