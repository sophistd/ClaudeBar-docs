/**
 * [INPUT]: 生产构建或正式域名与 Chromium。
 * [OUTPUT]: 桌面/手机 UI Kit、表单、浮层及 WebGL 行为验收。
 * [POS]: 五页展示及跨分区状态验收，沿用正式 base path。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import {fileURLToPath} from 'node:url';
import {defineConfig} from '@playwright/test';
const port=process.env.DOCS_PORT??'4328';
const origin=process.env.SITE_ORIGIN??`http://127.0.0.1:${port}`;
export default defineConfig({
  testDir:'.',testMatch:['kit.spec.ts','states.spec.ts'],timeout:45000,workers:2,
  use:{baseURL:origin,channel:process.env.DOCS_BROWSER_CHANNEL,screenshot:'only-on-failure'},
  webServer:process.env.SITE_ORIGIN?undefined:{cwd:fileURLToPath(new URL('../',import.meta.url)),command:`npm run preview -- --port ${port} --ignore-lock`,url:`${origin}/ClaudeBar-docs/designs/ui-kit.html`,reuseExistingServer:!process.env.CI,timeout:15000},
  projects:[{name:'desktop',use:{viewport:{width:1440,height:1000}}},{name:'mobile',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}}],
  outputDir:'../test-results/designs'
});
