/**
 * [INPUT]: 构建产物、Chromium 与本地静态预览服务。
 * [OUTPUT]: 可复现的桌面和触控浏览器验证配置。
 * [POS]: 仅测试文档站，不连接原生应用与真实账号。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  use: { baseURL: 'http://127.0.0.1:4321', browserName: 'chromium', channel: process.env.DOCS_BROWSER_CHANNEL, viewport: { width: 1536, height: 1024 }, screenshot: 'only-on-failure' },
  projects: [{ name: 'desktop' }, { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }],
  webServer: { command: 'npm run preview -- --port 4321 --ignore-lock', url: 'http://127.0.0.1:4321/ClaudeBar-docs/', reuseExistingServer: !process.env.CI },
  reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }]],
});
