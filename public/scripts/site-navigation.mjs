/**
 * [INPUT]: 当前站点分区和文档语言；固定的公开 base path。
 * [OUTPUT]: 所有页面共用的产品/文档双入口导航 HTML。
 * [POS]: 全站导航的唯一数据与结构源；样页构建和 Astro 侧栏共同消费。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
export function renderSiteNavigation(section, locale = 'zh') {
  const chinese = locale === 'zh';
  const items = [
    ['product', '/ClaudeBar-docs/', chinese ? '产品' : 'Product'],
    ['docs', `/ClaudeBar-docs/${chinese ? 'zh/' : 'en/'}`, chinese ? '文档' : 'Docs'],
  ];
  return `<nav class="cb-site-nav cb-nav" aria-label="${chinese ? '站点导航' : 'Site navigation'}">${items.map(([id,href,label]) => `<a href="${href}"${id === section ? ' aria-current="location"' : ''}>${label}</a>`).join('')}</nav>`;
}
