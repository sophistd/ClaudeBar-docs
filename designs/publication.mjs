/**
 * [INPUT]: 经授权的五页静态展示源码、共享资源引用与第三方许可。
 * [OUTPUT]: 公开源码和静态站运行文件的明确清单。
 * [POS]: publication 与 assemble 共用的边界；不递归公开设计目录。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
export const siteFiles = [
  'index.html', 'network.html', 'sessions.html', 'access.html', 'ui-kit.html',
  'styles.css', 'optical.css', 'kit.css', 'interactions.js', 'kit.js',
  'kit-source.mjs', 'optics-scene.mjs',
  'assets/gateway-studio.webp', 'assets/sessions-studio.webp', 'assets/package-studio.webp',
  'assets/network.svg', 'assets/gate.svg', 'assets/sessions.svg', 'assets/package.svg',
  'assets/optics.bundle.js', 'assets/optics.bundle.js.LEGAL.txt', 'assets/THREE-LICENSE.txt',
];
export const publicationFiles = [...siteFiles, 'CLAUDE.md', 'README.md', 'assets/CLAUDE.md',
  'build.mjs', 'assemble.mjs', 'publication.mjs', 'serve.mjs', 'playwright.config.ts', 'kit.spec.ts', 'states.spec.ts'];
