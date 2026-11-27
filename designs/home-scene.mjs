/**
 * [INPUT]: 依赖 three；./home-trail.mjs 的 trail 几何与 orbitPosition；./home-terrain.mjs 的 bakeHeight；./home-tokens.mjs 的 TRAIL。
 * [OUTPUT]: 对外提供 createScene(canvas) → { resize(vw, vh, phone) → trail 几何, render(view, pins) → 珠子杆顶的屏幕坐标（视图未变为 null）, project([x,y,z]) → 屏幕 [x, y] }。
 *           view = { t 3D 程度, ex 分层, head 路头 τ, route 路线终点 τ, orbit 镜头轨道 }。
 *           画面：纸带上的十字像素点阵（四层纸共用一份几何），点阵跟着地形一起朝镜头流（路头每前进一个点距，整张点阵平移一格，
 *           每个点始终贴着同一块地形）；网点式明暗（背光小而淡、受光大而亮）、近处淡出、当前卡片周围留安静区；闪点很少且不纯白；
 *           白点路线沿中线、在前三道关处垂直穿层；地面稀疏点阵；t = 0 时纸带摊平成一张点画等高线地图。
 * [POS]: 首页的空间层。不请求帧、不读滚动：home.mjs 在帧调度器里调用 render；视图没变就不画。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import * as THREE from 'three';
import { trail as buildTrail, orbitPosition } from './home-trail.mjs';
import { bakeHeight, sampleBaked } from './home-terrain.mjs';
import { TRAIL } from './home-tokens.mjs';

const RAMP = /* glsl */`
vec3 ramp(float h){
  vec3 a = vec3(0.30,0.40,0.40), b = vec3(0.56,0.70,0.69), c = vec3(0.92,0.87,0.77), d = vec3(0.78,0.48,0.36), e = vec3(0.85,0.66,0.30);
  if (h < 0.25) return mix(a, b, h / 0.25);
  if (h < 0.6) return mix(b, c, (h - 0.25) / 0.35);
  if (h < 0.85) return mix(c, d, (h - 0.6) / 0.25);
  return mix(d, e, (h - 0.85) / 0.15);
}`;
const STRIP_VS = /* glsl */`
attribute float aA, aV, aRel, aJ;
attribute vec3 aPos3, aNrm, aPosPrev, aNrmPrev;
uniform sampler2D uHeight;
uniform float uHead, uRest, uT, uTau0, uTau1, uHalfW, uT3, uEx, uLayer, uGap, uL, uKeep, uPx, uDpr, uRefDist, uPlate, uStep, uQuietOn, uTail;
uniform vec4 uQuiet;
uniform vec2 uTexSize;
uniform vec3 uLight;
varying vec3 vCol; varying float vAlpha;
${RAMP}
float hash2(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  // 点阵跟着地形走：路头每前进一个点距，整张点阵平移一格，每个点始终贴着同一块地形（不再原地抖动、原地变色）
  float fr = fract(uHead / uStep);
  float a = aA - fr * uStep;
  float tau = uHead + a - uRest;
  float ri = floor((tau - uTau0) / uStep + 0.5);
  float rnd = hash2(vec2(ri, aJ)), rnd2 = hash2(vec2(aJ + 91.7, ri * 1.31));
  vec3 baseP = mix(aPos3, aPosPrev, fr), baseN = normalize(mix(aNrm, aNrmPrev, fr));

  // 纹素中心映射：烘焙时第 i 列放在 i/(w−1) 处，这里换算到 (i + 0.5)/w，与 JS 的 sampleBaked 一致
  vec2 st = vec2((aV + 1.6) / 3.2, (tau - uTau0) / (uTau1 - uTau0)) * (uTexSize - 1.0) + 0.5;
  vec4 tx = texture2D(uHeight, st / uTexSize);
  float h = tx.r, dht = (tx.g * 255.0 - 128.0) / 64.0, dhv = (tx.b * 255.0 - 128.0) / 64.0;
  vec3 nrm = normalize(mix(vec3(0.0, 1.0, 0.0), baseN, uT3));
  vec3 pos = mix(vec3(aV * uHalfW, 0.0, -a), baseP, uT3);
  float taper = 1.0 - smoothstep(uRest + 0.2, uL - 0.15, a);
  pos += nrm * (aRel * h * uT3 + (3.0 - uLayer) * uGap * taper * uEx);
  vec3 tang = normalize(vec3(0.0, nrm.z, -nrm.y));
  float rel = aRel * uT3 + 0.05;
  vec3 n2 = normalize(nrm - tang * dht * rel - vec3(1.0, 0.0, 0.0) * dhv * rel / uHalfW);
  float shade = 0.18 + 0.82 * max(dot(n2, uLight), 0.0);
  float tone = smoothstep(0.3, 0.85, clamp(0.2 + 0.7 * shade, 0.0, 1.0));
  float alt = max(clamp(0.75 * tau / uT + 0.25 * h, 0.0, 1.0), smoothstep(0.62, 1.0, a / uL) * (0.82 + 0.18 * h));
  float sparkle = step(0.9985, rnd);
  vCol = mix(ramp(alt) * (0.2 + 0.7 * shade) * mix(1.1, 1.0, uT3), vec3(1.0), sparkle * 0.35);

  float d = min(fract(h * 8.0), 1.0 - fract(h * 8.0)), major = min(fract(h * 2.0), 1.0 - fract(h * 2.0));
  float contour = max(1.0 - smoothstep(0.11, 0.19, d), 1.0 - smoothstep(0.03, 0.07, major));
  float hach = step(0.9, length(vec2(dht, dhv))) * step(rnd, 0.45);
  float flatA = max(max(contour, hach * 0.7), 0.14);
  float sub = step(mod(ri, 2.0) + mod(aJ, 2.0), 0.5);   // 平面每 2×2 留 1，等高线上的点全留
  // 山麓边缘散逸（随地形走，不随屏幕格子走）
  float av = abs(aV);
  float edge = av <= 0.78 ? 1.0 : av <= 1.0 ? step((av - 0.78) / 0.22 * 0.85, rnd2) : step(rnd2, 0.35 * (1.6 - av) / 0.6);
  float sky = (1.0 - step(uT + 0.02, tau)) * step(a, uL) * step(-uTail, a);
  float plate = step(uL - 1.15, a) * step(a, uL - 0.2) * step(abs(aV), 0.85) * step(0.08, rnd) * uPlate;
  vAlpha = sky * edge * step(rnd, uKeep) * mix(flatA * max(sub, contour), 1.0, uT3) * (1.0 - plate * 0.92) * (uLayer < 2.5 ? 0.75 : 1.0 - 0.45 * uEx);   // 揭层时底层退后，四张纸读得出层次
  vAlpha *= mix(0.4, 1.0, tone);                       // 网点：背光又小又淡，受光大而亮

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  vAlpha *= mix(0.45, 1.0, smoothstep(0.55, 0.95, -mv.z / uRefDist));   // 近处淡出：最快、最粗的那一带退后
  vec2 ndc = gl_Position.xy / gl_Position.w;
  vec2 dq = max(max(uQuiet.xy - ndc, ndc - uQuiet.zw), 0.0);
  vAlpha *= 1.0 - 0.65 * uQuietOn * (1.0 - smoothstep(0.0, 0.12, length(dq)));   // 卡片周围留出安静区
  gl_PointSize = vAlpha < 0.01 ? 0.0 : uPx * uDpr * (1.0 + sparkle * 0.25) * clamp(uRefDist / -mv.z, 0.7, 1.0) * mix(0.75, 1.1, tone);
}`;
const PLUS_FS = /* glsl */`
varying vec3 vCol; varying float vAlpha;
void main(){
  vec2 c = abs(gl_PointCoord - 0.5);
  float plus = max(1.0 - smoothstep(0.10, 0.24, c.x), 1.0 - smoothstep(0.10, 0.24, c.y)) * (1.0 - smoothstep(0.44, 0.5, max(c.x, c.y)));
  if (plus * vAlpha < 0.02) discard;
  gl_FragColor = vec4(vCol, plus * vAlpha);
}`;
const DOT_VS = /* glsl */`
attribute float aBright;
uniform float uSize, uDpr, uRefDist;
varying vec3 vCol; varying float vAlpha;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  vCol = vec3(0.96, 0.96, 0.94); vAlpha = aBright;
  gl_PointSize = aBright < 0.01 ? 0.0 : uSize * uDpr * clamp(uRefDist / -mv.z, 0.5, 1.8);
}`;
const DOT_FS = /* glsl */`
varying vec3 vCol; varying float vAlpha;
void main(){ vec2 c = gl_PointCoord - 0.5; if (dot(c, c) > 0.25) discard; gl_FragColor = vec4(vCol, vAlpha); }`;

const ROUTE_N = 640, DROP_N = 36;

export function createScene(canvas, { onRestore } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(45, 1, 0.05, 200);
  const light = new THREE.Vector3(...TRAIL.light).normalize();
  let geo = null, tr = null, heightTex = null, baked = null, builtW = 0, builtCols = 0, w = 1, h = 1, last = '';
  canvas.addEventListener('webglcontextrestored', () => { last = ''; onRestore?.(); });

  const stripUniforms = () => ({
    uHeight: { value: null }, uHead: { value: 0 }, uRest: { value: 0 }, uT: { value: 1 }, uTau0: { value: TRAIL.tau0 }, uTau1: { value: 1 },
    uHalfW: { value: 1 }, uT3: { value: 1 }, uEx: { value: 0 }, uLayer: { value: 3 }, uGap: { value: TRAIL.gap }, uL: { value: 5 },
    uKeep: { value: 1 }, uPx: { value: 3 }, uDpr: { value: 1 }, uRefDist: { value: 2 }, uPlate: { value: 0 }, uStep: { value: 0.02 }, uTail: { value: 3 },
    uQuiet: { value: new THREE.Vector4(2, 2, 2, 2) }, uQuietOn: { value: 0 }, uTexSize: { value: new THREE.Vector2(128, 1024) }, uLight: { value: light },
  });
  const plies = [0, 1, 2, 3].map((layer) => {
    const mat = new THREE.ShaderMaterial({ vertexShader: STRIP_VS, fragmentShader: PLUS_FS, uniforms: stripUniforms(), transparent: true, depthWrite: false });
    mat.uniforms.uLayer.value = layer; mat.uniforms.uKeep.value = layer === 3 ? 1 : 0.28;
    const pts = new THREE.Points(new THREE.BufferGeometry(), mat); pts.frustumCulled = false; pts.renderOrder = layer === 3 ? 0 : 4 - layer;
    scene.add(pts); return pts;
  });

  /* 路线与穿层竖线：动态点 */
  const rPos = new Float32Array((ROUTE_N + 3 * DROP_N) * 3), rBright = new Float32Array(ROUTE_N + 3 * DROP_N);
  const rGeo = new THREE.BufferGeometry();
  rGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3)); rGeo.setAttribute('aBright', new THREE.BufferAttribute(rBright, 1));
  const dotUniforms = (size) => ({ uSize: { value: size }, uDpr: { value: 1 }, uRefDist: { value: 2 } });
  const route = new THREE.Points(rGeo, new THREE.ShaderMaterial({ vertexShader: DOT_VS, fragmentShader: DOT_FS, uniforms: dotUniforms(3.4), transparent: true, depthWrite: false }));
  route.frustumCulled = false; route.renderOrder = 20; scene.add(route);

  /* 地面：稀疏点阵 */
  const ground = new THREE.Points(new THREE.BufferGeometry(), new THREE.ShaderMaterial({ vertexShader: DOT_VS, fragmentShader: DOT_FS, uniforms: dotUniforms(1.6), transparent: true, depthWrite: false }));
  ground.frustumCulled = false; scene.add(ground);

  /* 图钉杆 */
  const stickGeo = new THREE.BufferGeometry(); stickGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6 * 6), 3));
  const sticks = new THREE.LineSegments(stickGeo, new THREE.LineBasicMaterial({ color: 0x8a8d90, transparent: true, opacity: 0.6 }));
  sticks.frustumCulled = false; scene.add(sticks);

  /** 纸带上的点位：完整网格（边缘散逸与抽稀在着色器里按地形格子决定），多出一行墙顶以便整体平移时不露缝。
   *  每个点位同时存自己与「近一格」处的位置与法线，着色器按路头的小数部分在两者之间平移。 */
  function buildStrip(cols) {
    const step = (2 * tr.halfW) / cols, A = [], V = [], J = [], REL = [], P = [], NR = [], PP = [], NP = [];
    const half = Math.round(1.6 * cols / 2);
    for (let a = -tr.tail - step; a <= tr.L + step; a += step) {
      const p = tr.at(Math.min(a, tr.L)), q = tr.at(Math.min(a - step, tr.L - step));
      for (let vi = -half; vi <= half; vi++) {
        const v = vi / (cols / 2);
        A.push(a); V.push(v); J.push(vi); REL.push(TRAIL.relief * Math.max(0.2, Math.cos(p.th)));
        P.push(v * tr.halfW, p.y, p.z); NR.push(0, p.ny, p.nz);
        PP.push(v * tr.halfW, q.y, q.z); NP.push(0, q.ny, q.nz);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('aPos3', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aNrm', new THREE.Float32BufferAttribute(NR, 3));
    g.setAttribute('aPosPrev', new THREE.Float32BufferAttribute(PP, 3)); g.setAttribute('aNrmPrev', new THREE.Float32BufferAttribute(NP, 3));
    for (const [name, data] of [['aA', A], ['aV', V], ['aJ', J], ['aRel', REL]]) g.setAttribute(name, new THREE.Float32BufferAttribute(data, 1));
    g.userData.step = step;
    return g;
  }
  function buildGround() {
    const P = [], B = [];
    for (let x = -7; x <= 7; x += 0.12) for (let z = -9; z <= 3; z += 0.12) {
      if (Math.abs(x) < tr.halfW * 1.7) continue;
      P.push(x, -0.01, z); B.push(0.07 * Math.max(0, 1 - Math.hypot(x, z - 0.5) / 9));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aBright', new THREE.Float32BufferAttribute(B, 1));
    return g;
  }

  function resize(vw, vh, phone) {
    w = vw; h = vh;
    renderer.setPixelRatio(Math.min(2, devicePixelRatio));
    renderer.setSize(vw, vh, false);
    tr = buildTrail(vw, vh, phone);
    tr.height = (tau, v) => sampleBaked(baked, tau, v);
    // 高度图只取决于山顶 T；手机地址栏收放不改 T，就不重烘（一次约 85ms）
    if (!baked || Math.abs(baked.T - tr.T) > 1e-3) {
      baked = { ...bakeHeight(tr.T, 128, 1024, TRAIL.tau0), T: tr.T };
      heightTex?.dispose();
      heightTex = new THREE.DataTexture(baked.data, baked.w, baked.h, THREE.RGBAFormat);
      heightTex.magFilter = heightTex.minFilter = THREE.LinearFilter; heightTex.needsUpdate = true;
    }
    // 点阵几何只取决于纸宽；变化不到 2% 时沿用
    const cols = phone ? 48 : 72;   // 手机点距放大 1.5 倍，点数减半以上
    if (!geo || cols !== builtCols || Math.abs(tr.halfW - builtW) / builtW > 0.02) {
      builtW = tr.halfW; builtCols = cols;
      geo?.dispose(); geo = buildStrip(cols);
      ground.geometry.dispose(); ground.geometry = buildGround();
    }
    const px = Math.max(2.2, Math.min(3.6, vw / 400)), dpr = renderer.getPixelRatio();
    for (const ply of plies) {
      ply.geometry = geo;
      const u = ply.material.uniforms;
      u.uHeight.value = heightTex; u.uRest.value = tr.aRest; u.uT.value = tr.T; u.uTau1.value = baked.tau1; u.uHalfW.value = tr.halfW;
      u.uHalfW.value = builtW; u.uStep.value = geo.userData.step; u.uTail.value = tr.tail; u.uL.value = tr.L; u.uPx.value = px; u.uDpr.value = dpr; u.uRefDist.value = tr.ref.dist;
    }
    for (const m of [route.material, ground.material]) { m.uniforms.uDpr.value = dpr; m.uniforms.uRefDist.value = tr.ref.dist; }
    route.material.uniforms.uSize.value = px * 0.9;
    last = '';
    return tr;
  }

  const gateTaus = TRAIL.gates.slice(0, 3);
  const layerOf = (tau) => gateTaus.filter((g) => tau >= g).length;

  /** 画一帧；返回珠子杆顶的屏幕坐标（视图没变则返回 null，什么也不画）。 */
  function render(view, pinList = []) {
    const key = JSON.stringify([view.t, view.ex, view.head, view.route, view.plate, view.quiet, view.quietOn, view.orbit, w, h].map((x) => (typeof x === 'number' ? +x.toFixed(4) : x)));
    if (key === last || !tr) return null;
    last = key;
    const { t, ex, head } = view;
    for (const ply of plies) {
      const u = ply.material.uniforms; u.uHead.value = head; u.uT3.value = t; u.uEx.value = ex; u.uPlate.value = view.plate ?? 0;
      if (view.quiet) u.uQuiet.value.set(...view.quiet); u.uQuietOn.value = view.quietOn ?? 0;
      ply.visible = ply.material.uniforms.uLayer.value === 3 || ex > 0.002;
    }
    // 路线：τ ∈ [起点可见处, route]
    const lo = Math.max(0, head - tr.aRest - tr.tail), hi = Math.min(view.route, head + tr.L - tr.aRest);
    for (let k = 0; k < ROUTE_N; k++) {
      const tau = lo + ((hi - lo) * k) / (ROUTE_N - 1), a = tr.aRest + tau - head;
      const p = tr.surface(a, 0, { t, ex, layer: layerOf(tau), head, lift: 0.03 });
      rPos.set(p, k * 3); rBright[k] = hi > lo ? 1 - 0.85 * (view.plate ?? 0) : 0;
    }
    gateTaus.forEach((g, j) => {
      const a = tr.aRest + g - head, show = ex > 0.01 && g <= view.route && a >= -tr.tail && a <= tr.L;
      const top = tr.surface(a, 0, { t, ex, layer: j, head, lift: 0.03 }), bottom = tr.surface(a, 0, { t, ex, layer: j + 1, head, lift: 0.03 });
      for (let d = 0; d < DROP_N; d++) {
        const f = d / (DROP_N - 1), o = (ROUTE_N + j * DROP_N + d) * 3;
        rPos.set([top[0] + (bottom[0] - top[0]) * f, top[1] + (bottom[1] - top[1]) * f, top[2] + (bottom[2] - top[2]) * f], o);
        rBright[ROUTE_N + j * DROP_N + d] = show && d % 2 === 0 ? 0.9 : 0;
      }
    });
    rGeo.attributes.position.needsUpdate = true; rGeo.attributes.aBright.needsUpdate = true;

    const o = view.orbit, [cx, cy, cz] = orbitPosition(o);
    camera.fov = o.fov; camera.aspect = w / h;
    camera.setViewOffset(w, h, (0.5 - o.shift[0]) * w, (0.5 - o.shift[1]) * h, w, h);
    camera.position.set(cx, cy, cz); camera.lookAt(...o.pivot); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    const screen = pins(pinList, view);
    renderer.render(scene, camera);
    return screen;
  }

  /** 珠子与杆：pin = {tau, layer}；写杆的几何，返回杆顶的屏幕坐标（不在纸带上则为 null）。 */
  function pins(list, view) {
    const sp = sticks.geometry.attributes.position.array, out = [];
    list.forEach((pin, i) => {
      const a = tr.aRest + pin.tau - view.head, inside = a >= -tr.tail && a <= tr.L;
      const base = tr.surface(a, 0, { t: view.t, ex: view.ex, layer: pin.layer, head: view.head, lift: 0.02 });
      const len = 0.06 + 0.07 * view.t, top = [base[0], base[1] + len, base[2]];
      sp.set(inside ? [...base, ...top] : [0, 0, 0, 0, 0, 0], i * 6);
      out.push(inside ? project(top) : null);
    });
    sticks.geometry.attributes.position.needsUpdate = true;
    return out;
  }
  const v3 = new THREE.Vector3();
  function project(p) {
    v3.set(p[0], p[1], p[2]).project(camera);
    if (v3.z > 1) return null;
    return [(v3.x * 0.5 + 0.5) * w, (-v3.y * 0.5 + 0.5) * h];
  }
  return { resize, render, project };
}
