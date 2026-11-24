/**
 * [INPUT]: 依赖 three 的 WebGLRenderer/PerspectiveCamera/ShaderMaterial；./home-tokens.mjs 的 PALETTE/REALMS；
 *          ./home-ribbon.mjs 的 bend 与 GLSL_BEND（与 DOM 纸片同一条曲线）；./home-kit.mjs 的 env（写回帧数遥测）；
 *          ./home-world.mjs 的 PARTS 线框零件与 createRoom 蓝图房间。
 * [OUTPUT]: 对外提供 mountScene(canvas) → {render(view), setRecovery(state), dispose()}。
 *           view = {scroll, c, sheet:{w, top, bottom}, stops:[{y0, y1, from, to}], anchors:[{id, y}], focus}，由 home.mjs 每帧给出；
 *           视图没变就不画，所以落定之后零帧。
 * [POS]: 首页 3D 的渲染器：只画三样东西——与 DOM 纸片同形的连续纸面（补齐卷曲处纸片之间的缝、按越界段换色）、
 *        随滚动推进的黑色蓝图房间、纸带两侧随纸面一起卷走的线框零件。相机与 CSS perspective 同视距同视场，
 *        单位就是 CSS 像素，所以两相逐像素对齐。不写文案与 DOM。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import * as THREE from 'three';
import { PALETTE, REALMS } from './home-tokens.mjs';
import { bend, GLSL_BEND } from './home-ribbon.mjs';
import { env } from './home-kit.mjs';
import { PARTS, createRoom } from './home-world.mjs';

// 颜色按 sRGB 原值进出：纸面渐变与 CSS linear-gradient 同一插值空间，两相颜色一致
THREE.ColorManagement.enabled = false;
const rgb = (hex) => new THREE.Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
const SHEET = Object.fromEntries(REALMS.map((realm) => [realm.id, rgb(realm.sheet)]));
const MAX_STOPS = 4, ROWS = 640;

const vertex = /* glsl */`
${GLSL_BEND}
uniform float uVh, uW, uScroll;
attribute vec2 aSheet;
varying float vDoc;
void main() {
  float y = uVh * 1.4 - uVh * 14.0 * aSheet.y * aSheet.y;   // 近处稀、折线附近与远方密
  vec3 b = bend(y);
  vDoc = y + uScroll;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(aSheet.x * uW, uVh * 0.5 - b.x, b.y, 1.0);
}`;
const fragment = /* glsl */`
uniform float uTop, uBottom; uniform vec3 uBase; uniform vec2 uSpan[${MAX_STOPS}]; uniform vec3 uTo[${MAX_STOPS}]; uniform int uCount;
varying float vDoc;
void main() {
  if (vDoc < uTop || vDoc > uBottom) discard;
  vec3 color = uBase;
  for (int i = 0; i < ${MAX_STOPS}; i++) {
    if (i >= uCount) break;
    color = mix(color, uTo[i], clamp((vDoc - uSpan[i].x) / max(1.0, uSpan[i].y - uSpan[i].x), 0.0, 1.0));
  }
  gl_FragColor = vec4(color, 1.0);
}`;

function sheetGeometry() {
  const v = [], index = [];
  for (let r = 0; r <= ROWS; r++) { const t = r / ROWS; v.push(-0.5, t, 0.5, t); }
  for (let r = 0; r < ROWS; r++) { const a = r * 2; index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('aSheet', new THREE.Float32BufferAttribute(v, 2));
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Array((ROWS + 1) * 6).fill(0), 3));   // 占位：真实位置在着色器里算
  g.setIndex(index);
  return g;
}

export function mountScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(PALETTE.ink, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 1, 1e5);

  const uniforms = {
    uYb: { value: 0 }, uR: { value: 1 }, uArc: { value: 1 }, uVh: { value: 1 }, uW: { value: 1 }, uScroll: { value: 0 },
    uTop: { value: 0 }, uBottom: { value: 0 }, uBase: { value: SHEET.text }, uCount: { value: 0 },
    uSpan: { value: Array.from({ length: MAX_STOPS }, () => new THREE.Vector2()) },
    uTo: { value: Array.from({ length: MAX_STOPS }, () => new THREE.Vector3()) },
  };
  const sheet = new THREE.Mesh(sheetGeometry(), new THREE.ShaderMaterial({ uniforms, vertexShader: vertex, fragmentShader: fragment, side: THREE.DoubleSide }));
  sheet.frustumCulled = false;
  scene.add(sheet);

  let room = null;
  const parts = new Map(Object.entries(PARTS).map(([id, make]) => [id, make()]));
  parts.forEach((part) => scene.add(part.group));
  let key = '', size = '';

  const resize = (c) => {
    const next = `${c.vw}x${c.vh}`;
    if (next === size) return;
    size = next;
    renderer.setSize(c.vw, c.vh, false);
    camera.aspect = c.vw / c.vh;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(c.vh / 2 / c.P));
    camera.position.set(0, 0, c.P); camera.near = 1; camera.far = c.P * 60;
    camera.updateProjectionMatrix();
    if (room) { scene.remove(room.object); room.object.geometry.dispose(); }
    room = createRoom(c); scene.add(room.object);
  };

  return {
    render(view) {
      const { c, scroll, sheet: s } = view;
      const next = `${scroll.toFixed(1)}|${c.vw}|${c.vh}|${s.w}|${s.top}|${view.focus}|${view.recovery}`;
      if (next === key) return;
      key = next;
      resize(c);
      uniforms.uYb.value = c.yb; uniforms.uR.value = c.R; uniforms.uArc.value = c.arc; uniforms.uVh.value = c.vh;
      uniforms.uW.value = s.w; uniforms.uScroll.value = scroll; uniforms.uTop.value = s.top; uniforms.uBottom.value = s.bottom;
      uniforms.uBase.value = SHEET[view.stops[0]?.from ?? 'text'];
      uniforms.uCount.value = Math.min(MAX_STOPS, view.stops.length);
      view.stops.slice(0, MAX_STOPS).forEach((stop, i) => { uniforms.uSpan.value[i].set(stop.y0, stop.y1); uniforms.uTo.value[i].copy(SHEET[stop.to]); });

      // 房间截面以滚动距离为相位向观者推进；静止即不动
      room.object.position.z = (scroll * 0.35) % room.cell;

      // 线框零件：贴在纸带两侧，随纸面同一条曲线卷走；两侧留白不够就收起
      const margin = (c.vw - s.w) / 2, unit = Math.min(220, margin * 0.5), shown = margin > 150;
      view.anchors.forEach(({ id, y }, i) => {
        const part = parts.get(id);
        if (!part) return;
        const yv = y - scroll, [Y, Z, a] = bend(yv, c), side = i % 2 ? 1 : -1;
        part.group.visible = shown && yv < c.vh * 1.6;
        if (!part.group.visible) return;
        part.group.position.set(side * (s.w / 2 + margin * 0.5), c.vh / 2 - Y, Z - unit * 0.4);
        part.group.scale.setScalar(unit);
        part.group.rotation.set(0.42 + a * 0.6, side * 0.6 + (yv / c.vh) * 0.5, 0);
        part.focus?.(view.focus);
        part.set?.(view.recovery);
      });

      renderer.render(scene, camera);
      env.set({ frames: env.get('frames') + 1 });
    },
    setRecovery() { key = ''; },
    dispose() { renderer.dispose(); },
  };
}
