/**
 * [INPUT]: Astro/Starlight 的静态文档构建能力与表格键盘访问转换。
 * [OUTPUT]: 独立仓库的双语路由、搜索、导航与组件覆盖配置。
 * [POS]: 文档站唯一构建入口，发布路径不依赖私有应用仓库。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { unified } from '@astrojs/markdown-remark';
import rehypeTables from './src/lib/rehype-tables.mjs';

export default defineConfig({
  site: 'https://sophistd.github.io',
  base: '/ClaudeBar-docs',
  trailingSlash: 'always',
  markdown: { processor: unified({ rehypePlugins: [rehypeTables] }) },
  integrations: [{
    name: 'claudebar-static-endpoints',
    hooks: { 'astro:config:setup': ({ injectRoute }) => {
      injectRoute({ pattern: '/llms.txt', entrypoint: './src/endpoints/llms.txt.ts', prerender: true });
      injectRoute({ pattern: '/zh/llms.txt', entrypoint: './src/endpoints/llms.txt.ts', prerender: true });
      injectRoute({ pattern: '/markdown/[...slug].md', entrypoint: './src/endpoints/markdown/[...slug].md.ts', prerender: true });
    } },
  }, starlight({
    title: { en: 'ClaudeBar / Docs', 'zh-CN': 'ClaudeBar / 文档' },
    description: 'Understand, configure, and verify managed network sessions on macOS.',
    defaultLocale: 'en',
    locales: { en: { label: 'English', lang: 'en' }, zh: { label: '简体中文', lang: 'zh-CN' } },
    customCss: ['./src/styles/custom.css'],
    components: { Sidebar: './src/components/Sidebar.astro', Head: './src/components/Head.astro', PageTitle: './src/components/PageTitle.astro', Footer: './src/components/Footer.astro' },
    sidebar: [
      { label: 'Overview', translations: { 'zh-CN': '文档首页' }, link: '/' },
      { label: 'Get started', translations: { 'zh-CN': '开始使用' }, items: [{ autogenerate: { directory: 'start' } }] },
      { label: 'Concepts', translations: { 'zh-CN': '理解工作原理' }, items: [{ autogenerate: { directory: 'concepts' } }] },
      { label: 'Guides', translations: { 'zh-CN': '操作指南' }, items: [{ autogenerate: { directory: 'guides' } }] },
      { label: 'Reference', translations: { 'zh-CN': '查询与参考' }, items: [{ autogenerate: { directory: 'reference' } }] },
      { label: 'Developers', translations: { 'zh-CN': '参与开发' }, items: [{ autogenerate: { directory: 'developers' } }] },
      { label: 'Project', translations: { 'zh-CN': '项目说明' }, items: [{ autogenerate: { directory: 'project' } }] },
    ],
    tableOfContents: false,
    lastUpdated: false,
  })],
});
