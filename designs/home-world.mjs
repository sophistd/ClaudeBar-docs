/**
 * [INPUT]: 依赖 three 的几何、材质与 ShaderMaterial；图标几何与应用图标共用同一套单位。
 * [OUTPUT]: 对外提供 PALETTE、WORLD 坐标表与 createPortal/createOrb/createStream/createDust/
 *           createTunnel/createSessions/createConstellation/createSheets 八个场景构件。
 * [POS]: designs 首页 3D 世界的"零件库"，只造物不调度；镜头、滚动与渲染循环归 home-scene.mjs。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import * as THREE from 'three';

// ============================================================================
//  色板与世界坐标：所有章节的 z 位置集中于此，home-scene 的镜头轨道按它取景
// ============================================================================
export const PALETTE = {
  ink: 0x0a0908, ivory: 0xf6f0ea, terracotta: 0xd97757, ember: 0xffa07a,
  cool: 0xa9bfe3, amber: 0xf2b25c, alarm: 0xe5483a,
  acid: 0xd4ff00,   // 刻意的"坏品味"：只在隔离态出现，屏幕占比 < 2%
};
export const WORLD = {
  heroZ: 0, tunnelFrom: -6, tunnelTo: -60, splitZ: -64, lanesTo: -106, laneX: 2.4,
  graphZ: -138, recoveryZ: -172, sheetsZ: -198, finaleZ: -236,
};

// ============================================================================
//  门框：应用图标的"右侧开口圆角方框"。路径从开口上沿出发逆时针绕行，最后一段补上开口，
//  这样 drawRange 只需截断尾部就能在"打开 ↔ 闭合"之间连续过渡（隔离 = 开口闭合）。
// ============================================================================
const ICON = { half: 6.2, corner: 2.8, stroke: 1.6, gap: 3.0, dotX: 1.0, dotR: 1.2 };

class Arc3 extends THREE.Curve {
  constructor(cx, cy, r, a0, a1) { super(); Object.assign(this, { cx, cy, r, a0, a1 }); }
  getPoint(t, target = new THREE.Vector3()) {
    const a = this.a0 + (this.a1 - this.a0) * t;
    return target.set(this.cx + Math.cos(a) * this.r, this.cy + Math.sin(a) * this.r, 0);
  }
}

function portalCurve(s) {
  const h = ICON.half * s, c = ICON.corner * s, g = ICON.gap * s, P = Math.PI;
  const v = (x, y) => new THREE.Vector3(x, y, 0);
  const path = new THREE.CurvePath();
  path.add(new THREE.LineCurve3(v(h, g), v(h, h - c)));
  path.add(new Arc3(h - c, h - c, c, 0, P / 2));
  path.add(new THREE.LineCurve3(v(h - c, h), v(-h + c, h)));
  path.add(new Arc3(-h + c, h - c, c, P / 2, P));
  path.add(new THREE.LineCurve3(v(-h, h - c), v(-h, -h + c)));
  path.add(new Arc3(-h + c, -h + c, c, P, P * 1.5));
  path.add(new THREE.LineCurve3(v(-h + c, -h), v(h - c, -h)));
  path.add(new Arc3(h - c, -h + c, c, P * 1.5, P * 2));
  path.add(new THREE.LineCurve3(v(h, -h + c), v(h, -g)));
  path.add(new THREE.LineCurve3(v(h, -g), v(h, g)));            // 开口段，放在最后
  const lengths = path.getCurveLengths();
  const total = lengths[lengths.length - 1];
  return { path, openFraction: (total - 2 * g) / total };
}

const SEGMENTS = 360, RADIAL = 20;
const portalGeometries = new Map();
function portalGeometry(size) {
  if (!portalGeometries.has(size)) {
    const s = size / (ICON.half * 2);
    const { path, openFraction } = portalCurve(s);
    const geometry = new THREE.TubeGeometry(path, SEGMENTS, (ICON.stroke / 2) * s, RADIAL, false);
    portalGeometries.set(size, { geometry, path, openFraction, s });
  }
  return portalGeometries.get(size);
}

export function ceramic(options = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: PALETTE.ivory, roughness: 0.34, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.2,
    sheen: 0.4, sheenColor: new THREE.Color(PALETTE.terracotta), ...options,
  });
}

/** 门框：返回 group 与 setOpen(0 闭合 … 1 开口)。 */
export function createPortal({ size = 3.2, material = ceramic() } = {}) {
  const { geometry, path, openFraction, s } = portalGeometry(size);
  const group = new THREE.Group();
  const tube = new THREE.Mesh(geometry, material);
  const capGeometry = new THREE.SphereGeometry((ICON.stroke / 2) * s, RADIAL, 12);
  const head = new THREE.Mesh(capGeometry, material), tail = new THREE.Mesh(capGeometry, material);
  head.position.copy(path.getPointAt(0));
  group.add(tube, head, tail);
  const setOpen = (open) => {
    const fraction = THREE.MathUtils.lerp(1, openFraction, THREE.MathUtils.clamp(open, 0, 1));
    tube.geometry.setDrawRange(0, Math.ceil(SEGMENTS * fraction) * RADIAL * 6);
    tail.position.copy(path.getPointAt(Math.min(fraction, 1)));
  };
  // 共享几何的 drawRange 会互相覆盖，需要独立开合的门框克隆一份
  const own = () => { tube.geometry = geometry.clone(); };
  setOpen(1);
  return { group, setOpen, own, dot: new THREE.Vector3(ICON.dotX * s, 0, 0), dotRadius: (ICON.dotR) * s };
}

// ============================================================================
//  陶土锚点：自发光球体 + 加色光晕精灵，泛光后期把它变成整页的"光源"
// ============================================================================
let haloTexture;
function halo() {
  if (haloTexture) return haloTexture;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.18, 'rgba(255,255,255,.55)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,.12)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
  haloTexture = new THREE.CanvasTexture(canvas);
  haloTexture.colorSpace = THREE.SRGBColorSpace;
  return haloTexture;
}

export function createOrb({ radius = 0.3, color = PALETTE.terracotta, glow = 6 } = {}) {
  const material = new THREE.MeshStandardMaterial({ color: 0x1a0c08, emissive: color, emissiveIntensity: 2.6, roughness: 0.4 });
  const core = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), material);
  const aura = new THREE.Sprite(new THREE.SpriteMaterial({
    map: halo(), color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  aura.scale.setScalar(radius * glow);
  const light = new THREE.PointLight(color, 6, radius * 30, 1.6);
  const group = new THREE.Group(); group.add(core, aura, light);
  const tint = new THREE.Color(color);
  // spill：对环境的染色比例。告警色把 spill 压低，只点亮锚点本身而不染整个场景
  const setColor = (hex, intensity = 2.6, spill = 1) => {
    tint.set(hex); material.emissive.copy(tint); material.emissiveIntensity = intensity;
    aura.material.color.copy(tint); aura.material.opacity = 0.55 * spill; light.color.copy(tint); light.intensity = 6 * spill;
  };
  return { group, core, aura, light, setColor };
}

// ============================================================================
//  连接流：沿 -z 前进的发光粒子。uTravel 由 JS 累加（变速不跳帧），uStop/uStopMix 让粒子
//  在闭合的门前堆积——"隔离"不是消失，而是被挡在门外。
// ============================================================================
const streamVertex = /* glsl */`
  attribute vec4 aSeed;
  uniform float uTravel, uLength, uRadius, uStop, uStopMix, uPixel, uSize;
  uniform vec3 uStart;
  varying float vFade; varying float vMix;
  void main() {
    float d = mod(aSeed.z * uLength + uTravel * (0.55 + aSeed.w * 0.9), uLength);
    float r = aSeed.y * uRadius;
    vec3 p = uStart + vec3(cos(aSeed.x) * r, sin(aSeed.x) * r, -d);
    float wall = uStop + aSeed.y * 0.6 + aSeed.w * 0.25;
    p.z = mix(p.z, max(p.z, wall), uStopMix);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.5 + aSeed.w) * uPixel * (24.0 / max(-mv.z, 0.5));
    float t = d / uLength;
    vFade = smoothstep(0.0, 0.06, t) * smoothstep(1.0, 0.82, t);
    vMix = step(0.72, fract(aSeed.x * 3.71));
  }`;
const streamFragment = /* glsl */`
  uniform vec3 uColorA, uColorB; uniform float uOpacity;
  varying float vFade; varying float vMix;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, r);
    gl_FragColor = vec4(mix(uColorA, uColorB, vMix) * 1.6, a * a * vFade * uOpacity);
  }`;

export function createStream({ count = 900, start, length, radius = 1, colorA, colorB, size = 1, opacity = 1 }) {
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    seeds.set([Math.random() * Math.PI * 2, Math.sqrt(Math.random()), Math.random(), Math.random()], i * 4);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  const material = new THREE.ShaderMaterial({
    vertexShader: streamVertex, fragmentShader: streamFragment,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uTravel: { value: 0 }, uLength: { value: length }, uRadius: { value: radius },
      uStart: { value: start.clone() }, uStop: { value: -1e4 }, uStopMix: { value: 0 },
      uPixel: { value: 1 }, uSize: { value: size }, uOpacity: { value: opacity },
      uColorA: { value: new THREE.Color(colorA) }, uColorB: { value: new THREE.Color(colorB) },
    },
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return { points, uniforms: material.uniforms };
}

// ============================================================================
//  星尘：覆盖整条航线的远景粒子，提供速度感与纵深
// ============================================================================
export function createDust({ count = 5000, from = 30, to = -280 } = {}) {
  const positions = new Float32Array(count * 3), seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, r = 4 + Math.pow(Math.random(), 0.6) * 40;
    positions.set([Math.cos(a) * r, Math.sin(a) * r * 0.7, THREE.MathUtils.lerp(from, to, Math.random())], i * 3);
    seeds[i] = Math.random();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPixel: { value: 1 } },
    vertexShader: /* glsl */`
      attribute float aSeed; uniform float uTime, uPixel; varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (0.6 + aSeed * 1.6) * uPixel * (30.0 / max(-mv.z, 1.0));
        vA = (0.35 + 0.65 * sin(uTime * (0.6 + aSeed) + aSeed * 40.0) * 0.5 + 0.5) * smoothstep(120.0, 10.0, -mv.z);
      }`,
    fragmentShader: /* glsl */`
      varying float vA;
      void main() { float r = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(1.0, 0.93, 0.86), smoothstep(0.5, 0.0, r) * vA * 0.7); }`,
  });
  const points = new THREE.Points(geometry, material); points.frustumCulled = false;
  return { points, uniforms: material.uniforms };
}

// ============================================================================
//  章节 01 · 门禁隧道：逐层旋进的门框 + 纵向光轨
// ============================================================================
export function createTunnel() {
  const group = new THREE.Group();
  const material = ceramic({ roughness: 0.42, clearcoat: 0.6 });
  for (let z = WORLD.tunnelFrom, i = 0; z >= WORLD.tunnelTo; z -= 6, i++) {
    const { group: portal } = createPortal({ size: 4.2, material });
    portal.position.z = z; portal.rotation.z = i * 0.42;
    group.add(portal);
  }
  const rails = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2, r = 3.4 + (i % 3) * 0.5;
    rails.push(Math.cos(a) * r, Math.sin(a) * r, 4, Math.cos(a) * r, Math.sin(a) * r, WORLD.tunnelTo - 4);
  }
  const railGeometry = new THREE.BufferGeometry();
  railGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rails, 3));
  group.add(new THREE.LineSegments(railGeometry, new THREE.LineBasicMaterial({
    color: PALETTE.terracotta, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false,
  })));
  return group;
}

// ============================================================================
//  章节 02 · 会话隔离：一道大门分出两条独立航道，中间是一面光栅玻璃墙
// ============================================================================
export function createSessions() {
  const group = new THREE.Group();
  const splitter = createPortal({ size: 8.4, material: ceramic() });
  splitter.group.position.z = WORLD.splitZ; group.add(splitter.group);
  const material = ceramic({ roughness: 0.4 });
  for (const side of [-1, 1]) {
    for (let z = WORLD.splitZ - 6, i = 0; z > WORLD.lanesTo; z -= 8, i++) {
      const { group: portal } = createPortal({ size: 2.6, material });
      portal.position.set(side * WORLD.laneX, 0, z); portal.rotation.z = side * i * 0.3;
      group.add(portal);
    }
  }
  const depth = WORLD.splitZ - WORLD.lanesTo;
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(depth, 5.2), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(PALETTE.ivory) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: /* glsl */`
      uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
      void main() {
        float lines = smoothstep(0.92, 1.0, sin(vUv.y * 140.0) * 0.5 + 0.5) * 0.35;
        float scan = exp(-pow((fract(vUv.x * 1.0 - uTime * 0.08) - 0.5) * 9.0, 2.0));
        float edge = smoothstep(0.0, 0.06, vUv.y) * smoothstep(1.0, 0.94, vUv.y) * smoothstep(0.0, 0.05, vUv.x);
        float a = (0.05 + lines + scan * 0.35) * edge;
        gl_FragColor = vec4(uColor, a * 0.55);
      }`,
  }));
  wall.rotation.y = Math.PI / 2; wall.position.z = WORLD.splitZ - depth / 2;
  group.add(wall);
  return { group, wall };
}

// ============================================================================
//  章节 03 · 观测超图：节点、边、半透明超边面；一条陶土色追因路径带着脉冲点穿行
// ============================================================================
export function createConstellation({ count = 96, radius = 5.2 } = {}) {
  const group = new THREE.Group(); group.position.z = WORLD.graphZ;
  const nodes = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2, r = Math.sqrt(1 - y * y), a = golden * i;
    const k = radius * (0.55 + 0.45 * ((i * 7919) % 97) / 97);
    nodes.push(new THREE.Vector3(Math.cos(a) * r * k, y * k * 0.8, Math.sin(a) * r * k));
  }
  // ---- 每个节点连到最近的 3 个邻居，形成可读的局部结构 ----
  const neighbors = nodes.map((p, i) => nodes.map((q, j) => [j, p.distanceToSquared(q)])
    .filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]).slice(0, 3).map(([j]) => j));
  const edges = [];
  neighbors.forEach((list, i) => list.forEach((j) => { if (i < j || !neighbors[j].includes(i)) edges.push(nodes[i], nodes[j]); }));
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(edges), new THREE.LineBasicMaterial({
    color: PALETTE.ivory, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false,
  })));
  const faces = [];
  for (let i = 0; i < count; i += 5) faces.push(nodes[i], nodes[neighbors[i][0]], nodes[neighbors[i][1]]);
  group.add(new THREE.Mesh(new THREE.BufferGeometry().setFromPoints(faces), new THREE.MeshBasicMaterial({
    color: PALETTE.terracotta, transparent: true, opacity: 0.08, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })));
  const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: PALETTE.ivory, emissiveIntensity: 1.4 }), count);
  const matrix = new THREE.Matrix4();
  nodes.forEach((p, i) => dots.setMatrixAt(i, matrix.makeScale(1, 1, 1).setPosition(p)));
  group.add(dots);
  // ---- 追因路径：从最外侧的"观测"沿邻接走向中心的"原因" ----
  const trace = [0]; const seen = new Set(trace);
  while (trace.length < 8) {
    const next = neighbors[trace.at(-1)].concat(nodes.map((_, j) => j))
      .filter((j) => !seen.has(j)).sort((a, b) => nodes[a].length() - nodes[b].length())[0];
    trace.push(next); seen.add(next);
  }
  const traceCurve = new THREE.CatmullRomCurve3(trace.map((i) => nodes[i]), false, 'centripetal');
  group.add(new THREE.Mesh(new THREE.TubeGeometry(traceCurve, 200, 0.025, 8, false),
    new THREE.MeshBasicMaterial({ color: PALETTE.ember, transparent: true, opacity: 0.9 })));
  const pulse = createOrb({ radius: 0.12, glow: 9 });
  group.add(pulse.group);
  const cause = createOrb({ radius: 0.22, glow: 7 });
  cause.group.position.copy(traceCurve.getPoint(1)); group.add(cause.group);
  const tick = (time) => {
    pulse.group.position.copy(traceCurve.getPoint((time * 0.18) % 1));
    group.rotation.y = time * 0.05;
  };
  return { group, tick };
}

// ============================================================================
//  章节 05 · 发送前检查：漂浮的"提示词纸页"，扫描线逐页通过，其中一页被标记待消歧
// ============================================================================
export function createSheets({ count = 14 } = {}) {
  const group = new THREE.Group(); group.position.z = WORLD.sheetsZ;
  const geometry = new THREE.PlaneGeometry(1.6, 2.1);
  const sheets = [];
  for (let i = 0; i < count; i++) {
    const flagged = i === 5;
    const material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 }, uSeed: { value: Math.random() * 10 }, uFlag: { value: flagged ? 1 : 0 },
        uInk: { value: new THREE.Color(PALETTE.ivory) }, uMark: { value: new THREE.Color(PALETTE.ember) },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: /* glsl */`
        uniform float uTime, uSeed, uFlag; uniform vec3 uInk, uMark; varying vec2 vUv;
        float hash(float n){ return fract(sin(n) * 43758.5453); }
        void main() {
          vec2 uv = vUv;
          float border = 1.0 - smoothstep(0.0, 0.012, min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)));
          float row = floor(uv.y * 18.0);
          float width = 0.35 + 0.5 * hash(row + uSeed);
          float line = step(0.12, uv.x) * step(uv.x, 0.12 + width) * smoothstep(0.32, 0.5, fract(uv.y * 18.0)) * step(fract(uv.y * 18.0), 0.68);
          line *= step(0.12, uv.y) * step(uv.y, 0.86);
          float scanY = fract(uTime * 0.16 + uSeed * 0.1);
          float scan = exp(-pow((uv.y - scanY) * 18.0, 2.0));
          float flagRow = step(abs(row - 9.0), 0.5) * uFlag * step(0.12, uv.x) * step(uv.x, 0.12 + width);
          vec3 color = uInk * (0.05 + line * 0.32 + border * 0.45 + scan * 0.35) + uMark * flagRow * 1.4;
          float a = 0.08 + line * 0.35 + border * 0.6 + scan * 0.3 + flagRow;
          gl_FragColor = vec4(color, a * 0.6);
        }`,
    });
    const sheet = new THREE.Mesh(geometry, material);
    const a = (i / count) * Math.PI * 2;
    sheet.position.set(Math.cos(a) * (2.6 + (i % 3)), Math.sin(a * 1.7) * 1.6, -Math.sin(a) * 3.2);
    sheet.rotation.set((Math.random() - 0.5) * 0.4, -a * 0.5, (Math.random() - 0.5) * 0.3);
    sheet.userData.base = sheet.position.clone();
    group.add(sheet); sheets.push(sheet);
  }
  const tick = (time) => sheets.forEach((sheet, i) => {
    sheet.material.uniforms.uTime.value = time;
    sheet.position.y = sheet.userData.base.y + Math.sin(time * 0.6 + i) * 0.12;
  });
  return { group, tick };
}
