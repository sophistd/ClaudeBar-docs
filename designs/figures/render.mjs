/**
 * [INPUT]: 依赖 esbuild（打包 studio-scenes.mjs）、playwright 的 Chromium（带 GPU 的离屏 WebGL）、sharp（降采样与 WebP 编码）、
 *          ../assets/hdri/ 的 Poly Haven CC0 摄影棚 HDRI。
 * [OUTPUT]: 命令 `node designs/figures/render.mjs [id…]`：把五张 PBR 场景图以 2 倍超采样渲出、缩回 1920 宽、裁掉透明留白（四周留 3%），写成 ../assets/figures/<id>.webp（透明底），
 *           并把每张的实际宽高写进 ../assets/figures/sizes.json，供 home-source 写 <img> 的 width/height（随公开源码发布，构建时要读）。
 * [POS]: 场景图的离线出图工序：图是构建前就定好的静态资产（与 assets/*.webp 同类），首页运行时只加载 WebP，不加载 three 或 HDRI。
 *        改了 studio-kit / studio-scenes 之后手动重跑本脚本，再跑站点构建。临时打包产物只写进仓库已忽略的 .claude/scratch/。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { FIGURE_SCENES } from './studio-scenes.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const designs = path.resolve(here, '..');
const work = path.resolve(designs, '../../.claude/scratch/figure-render');
const out = path.join(designs, 'assets/figures');
const HDRI = 'studio_small_08_1k.hdr';
const W = 1920, H = 720, SS = 2;

await fs.mkdir(work, { recursive: true });
await fs.mkdir(out, { recursive: true });
await build({ entryPoints: [path.join(here, 'studio-scenes.mjs')], outfile: path.join(work, 'studio.js'), bundle: true, format: 'esm', target: 'es2022', logLevel: 'error' });
await fs.writeFile(path.join(work, 'index.html'), '<!doctype html><meta charset="utf-8"><body style="margin:0"><canvas></canvas>');

const files = { '/': path.join(work, 'index.html'), '/studio.js': path.join(work, 'studio.js'), [`/${HDRI}`]: path.join(designs, 'assets/hdri', HDRI) };
const server = http.createServer(async (req, res) => {
  const file = files[new URL(req.url, 'http://x').pathname];
  if (!file) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': file.endsWith('.js') ? 'text/javascript' : file.endsWith('.html') ? 'text/html' : 'application/octet-stream' });
  res.end(await fs.readFile(file));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage();
  page.on('console', (m) => m.type() === 'error' && console.error('[page]', m.text()));
  await page.goto(origin);
  const sizes = JSON.parse(await fs.readFile(path.join(out, 'sizes.json'), 'utf8').catch(() => '{}'));
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(FIGURE_SCENES);
  for (const id of ids) {
    const started = Date.now();
    const data = await page.evaluate(async ({ id, w, h, hdr }) => {
      const { renderFigure } = await import('/studio.js');
      const canvas = document.createElement('canvas');
      const done = await renderFigure(id, canvas, { hdr, width: w, height: h });
      const url = canvas.toDataURL('image/png'); done.dispose();
      return url;
    }, { id, w: W * SS, h: H * SS, hdr: `/${HDRI}` });
    const png = Buffer.from(data.split(',')[1], 'base64');
    const file = path.join(out, `${id}.webp`);
    const scaled = await sharp(png).resize(W, H, { kernel: 'lanczos3' }).png().toBuffer();
    const trimmed = await sharp(scaled).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
    const pad = Math.round(trimmed.info.width * 0.03);
    const info = await sharp(trimmed.data).extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 86, alphaQuality: 90, effort: 6 }).toFile(file);
    sizes[id] = { width: info.width, height: info.height };
    console.log(`${id}: ${info.width}×${info.height}, ${info.size} B in ${Date.now() - started} ms`);
  }
  await fs.writeFile(path.join(out, 'sizes.json'), `${JSON.stringify(sizes, null, 2)}\n`);
} finally {
  await browser.close();
  server.close();
}
