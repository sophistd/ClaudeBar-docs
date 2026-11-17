# ClaudeBar Docs

Astro 7 + Starlight + MDX + Pagefind + TypeScript + Playwright。独立静态文档站，应用源代码不进入发布包。

成员清单
public/: 单字母站点 favicon 静态资源；不含产品截图。
.github/: 独立仓库自动化，不访问私有源码。
.gitignore: 隔离依赖、生成物和浏览器测试输出。
.nvmrc: 建议使用的 Node 主版本。
AGENTS.md: 贡献者的事实、隐私与验证执行契约。
README.md: 站点构建、维护、发布和权利边界。
astro.config.mjs: 静态生成、项目 base path、导航与页面组件覆盖的唯一配置。
package.json: 开发、构建、模型/浏览器验收命令与依赖声明。
package-lock.json: 锁定生产与验收依赖的公共 registry 版本。
playwright.config.ts: 桌面/触控 Chromium 与生产预览服务编排。
scripts/: 静态链接与敏感串检查、精确发布文件清单；不读取应用数据。
src/: 页面、组件、内容集合与教学模型，站点唯一实现树。
tests/: 教学模型和真实浏览器验收，面向生产构建。
tsconfig.json: Astro strict 类型检查范围。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
