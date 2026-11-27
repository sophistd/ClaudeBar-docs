/**
 * [INPUT]: 依赖 three 的 Points/LineSegments/Sprite/CanvasTexture；./home-tokens.mjs 的 PALETTE 与 GRAPH；
 *          ./home-ribbon.mjs 的 bend（图谱贴着纸面立起）。
 * [OUTPUT]: 对外提供 createGraph() → {object, place(view, c), useFont(family)}。
 *           view.graph = {top, h, w}：首屏里 [data-graph] 那块纸片的版面位置（home.mjs 量好传入）。
 * [POS]: 首屏的关系图谱：照参考稿 HeroGraph 的读法——枢纽是方块、叶子散在枢纽四周、枢纽之间有弱连接，
 *        整张图离开纸面悬起（graph.lift），枢纽比叶子更高，并各自垂一根细线回到纸面，像钉在纸上的立体模型。
 *        枢纽站在纸面栏线上、叶子落在细格交点上，与地面网格同一把尺。节点与连线是示意，名字取自产品的九个对象，不标数字。只算几何、不请求帧。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import * as THREE from 'three';
import { PALETTE, GRAPH } from './home-tokens.mjs';
import { bend } from './home-ribbon.mjs';

const HUBS = ['Gate', 'Egress', 'Sessions', 'Browser', 'Observe', 'Repair', 'Recovery', 'Preflight', 'Profiles'];
const rand = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

/** 版面上的图：坐标是相对图块中线的 x 与相对图块顶边的 y，都按图宽 1 归一。 */
function layout() {
  const r = rand(20261126), nodes = [], hubEdges = [], cross = [];
  const cols = 3, rows = Math.ceil(GRAPH.hubs / cols);
  for (let k = 0; k < GRAPH.hubs; k++) {
    const x = ((k % cols) - 1) * 0.25, y = (Math.floor(k / cols) + 0.5) / rows + (r() - 0.5) * 0.08;   // 枢纽站在 −¼、0、+¼ 三条栏线上
    const hub = { x, y, hub: true, label: HUBS[k], n: 0 };
    nodes.push(hub);
    const count = GRAPH.leaves[0] + Math.floor(r() * (GRAPH.leaves[1] - GRAPH.leaves[0] + 1));
    for (let i = 0; i < count; i++) {
      const a = r() * Math.PI * 2, d = GRAPH.spread * (0.35 + 0.65 * Math.sqrt(r()));
      nodes.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.62, hub: false, of: k });
      hubEdges.push([nodes.indexOf(hub), nodes.length - 1]);
      hub.n += 1;
    }
  }
  const leaves = nodes.map((node, i) => [node, i]).filter(([node]) => !node.hub);
  for (let k = 0; k < GRAPH.cross; k++) {
    const [a, i] = leaves[Math.floor(r() * leaves.length)], [b, j] = leaves[Math.floor(r() * leaves.length)];
    if (a.of !== b.of) cross.push([i, j]);
  }
  const hubs = nodes.map((node, i) => [node, i]).filter(([node]) => node.hub).map(([, i]) => i);
  for (let k = 0; k + 1 < hubs.length; k++) cross.push([hubs[k], hubs[(k + 4) % hubs.length]]);
  return { nodes, hubEdges, cross };
}

const lineMat = (opacity) => new THREE.LineBasicMaterial({ color: PALETTE.ivory, transparent: true, opacity, depthWrite: false });

export function createGraph() {
  const { nodes, hubEdges, cross } = layout();
  const positions = new Float32Array(nodes.length * 3), grounds = new Float32Array(nodes.length * 3);
  const shared = new THREE.BufferAttribute(positions, 3);
  const edgeGeometry = (pairs) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', shared); g.setIndex(pairs.flat()); return g; };
  const near = new THREE.LineSegments(edgeGeometry(hubEdges), lineMat(0.34));
  const weak = new THREE.LineSegments(edgeGeometry(cross), lineMat(0.14));

  const hubIdx = nodes.flatMap((node, i) => (node.hub ? [i] : [])), leafIdx = nodes.flatMap((node, i) => (node.hub ? [] : [i]));
  const pointsOf = (idx, size, opacity) => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', shared); g.setIndex(idx);
    return new THREE.Points(g, new THREE.PointsMaterial({ color: PALETTE.ivory, size, sizeAttenuation: false, transparent: true, opacity, depthWrite: false }));
  };
  const hubs = pointsOf(hubIdx, 8, 1), leaves = pointsOf(leafIdx, 3.5, 0.85);

  // 枢纽垂向纸面的细线：上端是枢纽，下端是它在纸上的落点
  const stems = new Float32Array(hubIdx.length * 6), stemGeometry = new THREE.BufferGeometry();
  stemGeometry.setAttribute('position', new THREE.BufferAttribute(stems, 3));
  const stem = new THREE.LineSegments(stemGeometry, lineMat(0.22));

  const group = new THREE.Group();
  for (const object of [near, weak, hubs, leaves, stem]) { object.frustumCulled = false; object.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6); group.add(object); }

  // 枢纽的名字：等宽字，画在画布上做成永远朝向镜头的标签（参考稿 labels 层）
  let labels = [];
  const useFont = (family) => {
    labels.forEach((sprite) => { group.remove(sprite); sprite.material.map.dispose(); sprite.material.dispose(); });
    labels = hubIdx.map((i) => {
      const text = nodes[i].label, canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
      ctx.font = `500 44px ${family}`;
      canvas.width = Math.ceil(ctx.measureText(text).width) + 16; canvas.height = 64;
      ctx.font = `500 44px ${family}`; ctx.fillStyle = '#f6f0ea'; ctx.textBaseline = 'middle'; ctx.fillText(text, 8, 34);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.NoColorSpace;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
      sprite.userData = { i, aspect: canvas.width / canvas.height };
      group.add(sprite);
      return sprite;
    });
  };

  /** 每一点：先落到纸面（同一条 bend），再沿纸面法线抬起 lift。镜头坐标里纸面法线 = (0, sin a, cos a)。 */
  const at = (out, o, x, q, lift, c) => {
    const [Y, Z, a] = bend(q, c);
    out[o] = x * c.m; out[o + 1] = c.vh / 2 - Y + Math.sin(a) * lift * c.m; out[o + 2] = Z - c.P + Math.cos(a) * lift * c.m;
  };
  const place = (view, c) => {
    const box = view.graph;
    group.visible = Boolean(box) && c.vw >= 720;
    if (!group.visible) return;
    const q0 = box.top - view.scroll;
    group.visible = q0 + box.h > -c.vh * 0.2 && q0 < c.qBottom;
    if (!group.visible) return;
    const cell = box.w / 40, snap = (v) => Math.round(v / cell) * cell;   // 与纸面、地面同一把细格尺
    nodes.forEach((node, i) => {
      const x = snap(node.x * box.w), q = q0 + snap(node.y * box.h);
      at(positions, i * 3, x, q, node.hub ? GRAPH.hubLift : GRAPH.lift, c);
      at(grounds, i * 3, x, q, 0, c);
    });
    shared.needsUpdate = true;
    hubIdx.forEach((i, k) => { stems.set(positions.subarray(i * 3, i * 3 + 3), k * 6); stems.set(grounds.subarray(i * 3, i * 3 + 3), k * 6 + 3); });
    stemGeometry.getAttribute('position').needsUpdate = true;
    for (const sprite of labels) {
      const { i, aspect } = sprite.userData, h = 15 * c.m;
      sprite.position.set(positions[i * 3] + (aspect * h) / 2 + 8 * c.m, positions[i * 3 + 1] - h * 0.9, positions[i * 3 + 2]);
      sprite.scale.set(aspect * h, h, 1);
    }
  };
  return { object: group, place, useFont };
}
