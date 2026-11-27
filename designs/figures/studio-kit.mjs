/**
 * [INPUT]: 依赖 three 的 Mesh/MeshPhysicalMaterial/ExtrudeGeometry/TubeGeometry 与 addons 的 RoundedBoxGeometry；
 *          颜色只收调用方给的 palette（{ mark, paper }），不自己定"出事"色。
 * [OUTPUT]: 对外提供 materials(palette) 材质表与 STUDIO 物件套件：mac 笔记本、gate 道闸三态、tube 玻璃代理管、cable 线缆（实 / 断续 / 出事）、
 *           pin 出口图钉、land 一块国土（here / there 两种釉面）、clock 钟（白天 / 夜里）、window 浏览器窗口、token 账号币、
 *           print 指纹卡、cut 断开的线缆（铜芯外露）、watch 宽限期秒表、wobble 抖动的线缆。每件返回 THREE.Group，单位约等于厘米。
 * [POS]: 场景图的 Kit 层（三维版）：只造物、不讲场景；studio-scenes.mjs 组合五个场景的顷刻，render.mjs 离线渲成 WebP。
 *        编码表与平面版一致：连续的线 = 已发生；断续的线 = 被截住或尚未发生；mark 漆只给出事的那一处；国土釉面区分哪一国。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** 材质表：铝、玻璃、陶瓷、石墨、黄铜、两种国土釉面，外加唯一的 mark 漆。 */
export function materials({ mark }) {
  const P = (o) => new THREE.MeshPhysicalMaterial(o);
  return {
    aluminum: P({ color: 0xc9ccd0, metalness: 1, roughness: 0.32, anisotropy: 0.5 }),
    darkAluminum: P({ color: 0x3a3d42, metalness: 1, roughness: 0.4 }),
    screen: P({ color: 0x0c0f14, metalness: 0, roughness: 0.22, envMapIntensity: 0.35, emissive: 0x16233a, emissiveIntensity: 0.6 }),
    ui: new THREE.MeshBasicMaterial({ color: 0x3b4d6e }),
    glass: P({ color: 0xffffff, metalness: 0, roughness: 0.35, transmission: 0.55, thickness: 1.2, ior: 1.5, clearcoat: 1, clearcoatRoughness: 0.1 }),
    page: P({ color: 0xf4f1ec, metalness: 0, roughness: 0.6, emissive: 0xf4f1ec, emissiveIntensity: 0.12 }),
    ceramic: P({ color: 0xf4f1ec, metalness: 0, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
    graphite: P({ color: 0x24262a, metalness: 0.2, roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.3 }),
    brass: P({ color: 0xd6b47a, metalness: 1, roughness: 0.28 }),
    copper: P({ color: 0xd98a5a, metalness: 1, roughness: 0.3 }),
    here: P({ color: 0xe9e3d6, metalness: 0, roughness: 0.78, sheen: 0.4, sheenColor: 0xffffff }),
    there: P({ color: 0x5c6270, metalness: 0, roughness: 0.6, clearcoat: 0.4, clearcoatRoughness: 0.4 }),
    night: P({ color: 0x141a2e, metalness: 0, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 }),
    mark: P({ color: mark, metalness: 0, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 }),
    glow: new THREE.MeshBasicMaterial({ color: 0xbfe3ff }),
  };
}

const mesh = (geometry, material, at = [0, 0, 0]) => {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(...at); m.castShadow = true; m.receiveShadow = true;
  return m;
};
const box = (w, h, d, r, material, at) => mesh(new RoundedBoxGeometry(w, h, d, 4, r), material, at);
const group = (...children) => { const g = new THREE.Group(); children.forEach((c) => g.add(c)); return g; };

export function kit(M) {
  return {
    /** 笔记本：铝机身 + 开到 110° 的黑玻璃屏；屏上一点冷光，像正开着。 */
    mac() {
      const base = box(30, 1.4, 21, 0.6, M.aluminum, [0, 0.7, 0]);
      const deck = box(26, 0.12, 9, 0.05, M.darkAluminum, [0, 1.42, -3.6]);
      const pad = box(11, 0.06, 6.5, 0.05, M.aluminum, [0, 1.41, 5.8]);
      const lid = group(box(30, 20, 0.8, 0.5, M.aluminum, [0, 10, 0]), box(28, 17.6, 0.1, 0.05, M.screen, [0, 10.4, 0.42]),
        box(28, 0.9, 0.05, 0.02, M.ui, [0, 18.7, 0.5]), box(13, 9, 0.05, 0.3, M.ui, [-4, 11, 0.5]));
      lid.position.set(0, 1.4, -10.4); lid.rotation.x = -0.35;
      return group(base, deck, pad, lid);
    },

    /** 道闸：一根立柱 + 一根红白相间的横杆。open 竖起、hold 斜在半空、shut 放平拦住线路。 */
    gate(state = 'open', length = 34) {
      const post = group(box(4, 14, 4, 0.8, M.ceramic, [0, 7, 0]), box(4.4, 1.2, 4.4, 0.4, M.graphite, [0, 14.4, 0]), box(6, 0.8, 6, 0.3, M.graphite, [0, 0.4, 0]));
      const arm = new THREE.Group();
      const n = 7, seg = length / n;
      for (let i = 0; i < n; i++) arm.add(box(seg - 0.15, 1.6, 1.6, 0.35, i % 2 ? M.ceramic : M.graphite, [2.6 + seg * (i + 0.5), 0, 0]));
      arm.add(mesh(new THREE.CylinderGeometry(1.3, 1.3, 2.4, 32).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), M.graphite, [0, 0, 0]));
      arm.position.set(0, 11.5, 2.6);
      arm.rotation.z = { open: 1.4, hold: 0.7, shut: 0 }[state];
      const g = group(post, arm); g.userData = { arm, open: 1.4 };   // 舞台版按章节进度转动横杆
      return g;
    },

    /** 玻璃代理管：一段透明的管子，里面一串冷光珠子在走。 */
    tube(length = 60) {
      const shell = mesh(new THREE.CylinderGeometry(2.6, 2.6, length, 48, 1, true).rotateZ(Math.PI / 2), M.glass);
      const rims = [-1, 1].map((s) => mesh(new THREE.TorusGeometry(2.6, 0.5, 16, 48).rotateY(Math.PI / 2), M.graphite, [s * length / 2, 0, 0]));
      const beads = Array.from({ length: Math.floor(length / 5) }, (_, i) => mesh(new THREE.SphereGeometry(0.9, 16, 12), M.graphite, [-length / 2 + 2.5 + i * 5, 0, 0]));
      return group(shell, ...rims, ...beads);
    },

    /** 线缆：沿点列的一根软管。dashed = 断续（没走出去 / 将要发生），mark = 出事的那一根。 */
    cable(points, { dashed = false, mark = false, radius = 0.7, sharp = false } = {}) {
      const curve = new THREE.CatmullRomCurve3(points.map((p) => V(...p)), false, sharp ? 'catmullrom' : 'centripetal', 0.05);
      const material = mark ? M.mark : M.graphite;
      if (!dashed) return group(mesh(new THREE.TubeGeometry(curve, 96, radius, 16), material));
      const g = new THREE.Group(), pieces = Math.max(4, Math.round(curve.getLength() / 4));
      for (let i = 0; i < pieces; i += 2) {
        const a = i / pieces, b = (i + 1) / pieces;
        const part = new THREE.CatmullRomCurve3(Array.from({ length: 6 }, (_, k) => curve.getPointAt(a + ((b - a) * k) / 5)));
        g.add(mesh(new THREE.TubeGeometry(part, 8, radius, 12), material));
      }
      return g;
    },

    /** 出口图钉：插在哪块国土上，出口就在哪一国。mark = 出口落错了地方。 */
    pin({ mark = false, s = 1 } = {}) {
      const head = mesh(new THREE.SphereGeometry(3, 48, 32), mark ? M.mark : M.ceramic, [0, 11, 0]);
      const neck = mesh(new THREE.CylinderGeometry(0.9, 1.6, 2, 32), M.aluminum, [0, 8, 0]);
      const needle = mesh(new THREE.ConeGeometry(0.35, 7.5, 16).rotateX(Math.PI), M.aluminum, [0, 3.6, 0]);
      const g = group(head, neck, needle); g.scale.setScalar(s);
      return g;
    },

    /** 一块国土：不规则的厚片。here = 本机所在的一国（米白釉），there = 另一国（石板灰）。 */
    land(w, d, kind = 'here', seed = 0) {
      const shape = new THREE.Shape(), n = 14;
      for (let i = 0; i <= n; i++) {
        const t = (i / n) * Math.PI * 2, wobble = 1 + 0.09 * Math.sin(t * 3 + seed) + 0.05 * Math.sin(t * 5 + seed * 2);
        const x = Math.cos(t) * (w / 2) * wobble, y = Math.sin(t) * (d / 2) * wobble;
        i ? shape.lineTo(x, y) : shape.moveTo(x, y);
      }
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1.6, bevelEnabled: true, bevelSize: 0.6, bevelThickness: 0.5, bevelSegments: 4, curveSegments: 24 });
      geometry.rotateX(-Math.PI / 2);
      return group(mesh(geometry, M[kind]));
    },

    /** 钟：铝圈 + 表盘 + 两根针。night = 深色表盘（那边还是夜里）；mark = 这只钟的时间对不上。 */
    clock(hours = 3, { night = false, mark = false, r = 7 } = {}) {
      const ring = mesh(new THREE.CylinderGeometry(r, r, 2, 64).rotateX(Math.PI / 2), mark ? M.mark : M.aluminum);
      const face = mesh(new THREE.CylinderGeometry(r - 0.8, r - 0.8, 0.2, 64).rotateX(Math.PI / 2), night ? M.night : M.ceramic, [0, 0, 1]);
      const ink = night ? M.ceramic : M.graphite;
      const ticks = Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2, t = box(0.4, i % 3 ? 0.8 : 1.6, 0.2, 0.1, ink, [Math.sin(a) * (r - 1.8), Math.cos(a) * (r - 1.8), 1.15]); t.rotation.z = -a; return t; });
      const hand = (len, wid, angle, material) => { const h = group(box(wid, len, 0.3, 0.12, material, [0, len / 2 - 0.6, 0])); h.position.z = 1.35; h.rotation.z = -angle; return h; };
      const hourHand = hand(r * 0.5, 0.7, (hours / 12) * Math.PI * 2, mark ? M.mark : ink);
      const minHand = hand(r * 0.78, 0.45, ((hours % 1) || 0.02) * Math.PI * 2, mark ? M.mark : ink);
      const knob = mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.8, 24).rotateX(Math.PI / 2), M.brass, [0, 0, 1.6]);
      return group(ring, face, ...ticks, hourHand, minHand, knob);
    },

    /** 支架：一根细铝杆，让悬着的东西有个落脚处。 */
    stand(h) { return group(mesh(new THREE.CylinderGeometry(0.45, 0.45, h, 16), M.aluminum, [0, h / 2, 0]), mesh(new THREE.CylinderGeometry(2.2, 2.6, 0.8, 32), M.graphite, [0, 0.4, 0])); },

    /** 浏览器窗口：一片竖起的玻璃屏，顶边三颗圆点。 */
    window(w = 34, h = 24) {
      const frame = box(w, h, 1, 0.8, M.aluminum, [0, h / 2, 0]);
      const pane = box(w - 1.6, h - 5.4, 0.12, 0.1, M.page, [0, h / 2 - 1.9, 0.52]);
      const tabs = [0, 1, 2].map((i) => box((w - 12) / 3 - 0.6, 1.8, 0.14, 0.3, i === 0 ? M.page : M.darkAluminum, [-w / 2 + 8 + ((w - 12) / 3) * (i + 0.5), h - 2, 0.55]));
      const dots = [0, 1, 2].map((i) => mesh(new THREE.SphereGeometry(0.5, 16, 12), M.graphite, [-w / 2 + 1.6 + i * 1.5, h - 2, 0.55]));
      const lines = [0, 1, 2, 3].map((i) => box(w * (0.55 - i * 0.08), 0.9, 0.08, 0.3, M.darkAluminum, [-w * 0.12, h - 7 - i * 3, 0.62]));
      return group(frame, pane, ...tabs, ...dots, ...lines);
    },

    /** 账号币：一枚立着的圆币，正面浮雕一个头像。 */
    token({ mark = false } = {}) {
      const coin = mesh(new THREE.CylinderGeometry(5, 5, 1.2, 64).rotateX(Math.PI / 2), mark ? M.mark : M.ceramic, [0, 5.2, 0]);
      const head = mesh(new THREE.SphereGeometry(1.5, 32, 24), M.graphite, [0, 6.6, 0.7]);
      const body = mesh(new THREE.SphereGeometry(2.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.75, 0.35), M.graphite, [0, 2.9, 0.6]);
      return group(coin, head, body);
    },

    /** 指纹卡：一片立着的卡，上面一圈圈断开的脊线；variant 改开口，同一 variant = 同一套指纹。 */
    print(variant = 0, { mark = false, s = 1 } = {}) {
      const card = box(18, 22, 0.8, 1.2, M.ceramic, [0, 11, 0]);
      const ridges = [1, 2, 3, 4, 5, 6, 7].map((r, i) => {
        const gap = 0.9 + ((variant + i) % 3) * 0.4;
        const t = mesh(new THREE.TorusGeometry(r, 0.24, 12, 64, Math.PI * 2 - gap), mark ? M.mark : M.graphite, [0.25 * i - 0.8, 9 + 0.32 * i, 0.5]);
        t.scale.set(0.72, 1, 1); t.rotation.z = -Math.PI / 2 + gap / 2 + variant * 0.8;
        return t;
      });
      const g = group(card, ...ridges); g.scale.setScalar(s);
      return g;
    },

    /** 断开的线缆：两截软管，断口里露出铜芯。 */
    cut(from, to, gap = 6) {
      const mid = V(...from).lerp(V(...to), 0.5), dir = V(...to).sub(V(...from)).normalize();
      const endA = mid.clone().addScaledVector(dir, -gap / 2), endB = mid.clone().addScaledVector(dir, gap / 2);
      const g = group(this.cable([from, endA.toArray()], { mark: true }), this.cable([endB.toArray(), to], { mark: true }));
      [endA, endB].forEach((end, side) => {
        for (let k = 0; k < 5; k++) {
          const spread = V(Math.cos(k * 1.3) * 0.4, 0.3 + Math.sin(k * 1.7) * 0.5, Math.sin(k * 1.1) * 0.4);
          const tip = end.clone().addScaledVector(dir, side ? -1.4 : 1.4).add(spread);
          g.add(mesh(new THREE.TubeGeometry(new THREE.LineCurve3(end, tip), 1, 0.12, 6), M.copper));
        }
      });
      return g;
    },

    /** 宽限期秒表：表冠 + 已走过的扇形（mark 漆），没走的部分留白；p = 已过的比例。 */
    watch(p = 0.75, r = 8) {
      const body = mesh(new THREE.CylinderGeometry(r, r, 2.4, 64).rotateX(Math.PI / 2), M.aluminum);
      const face = mesh(new THREE.CylinderGeometry(r - 0.9, r - 0.9, 0.2, 64).rotateX(Math.PI / 2), M.ceramic, [0, 0, 1.2]);
      const elapsed = mesh(new THREE.CircleGeometry(r - 1.6, 64, Math.PI / 2 - Math.PI * 2 * p, Math.PI * 2 * p), M.mark, [0, 0, 1.33]);
      const crown = group(mesh(new THREE.CylinderGeometry(1, 1, 2, 24), M.brass, [0, r + 1, 0]), mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.8, 24), M.brass, [0, r + 2.2, 0]));
      const a = Math.PI / 2 - Math.PI * 2 * p, hand = box(0.5, r - 2, 0.3, 0.12, M.graphite, [Math.cos(a) * (r - 2) / 2, Math.sin(a) * (r - 2) / 2, 1.5]);
      hand.rotation.z = a - Math.PI / 2;
      return group(body, face, elapsed, crown, hand);
    },

    /** 抖动的线缆：一段折来折去的 mark 线，网络在这里晃了一下。 */
    wobble(x1, x2, y, z = 0, amp = 3.2) {
      const n = 9, pts = [[x1, y, z]];
      for (let i = 1; i < n; i++) pts.push([x1 + ((x2 - x1) * i) / n, y + amp + (i % 2 ? amp : -amp * 0.6), z]);
      pts.push([x2, y, z]);
      return this.cable(pts, { mark: true, radius: 0.8, sharp: true });
    },
  };
}
