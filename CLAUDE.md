# ClaudeBar Docs

Astro 7 + Starlight + MDX + Pagefind + TypeScript + Playwright。产品根首页与中英文静态文档站，应用源代码不进入发布包。

成员清单
public/: 共享 token、组件状态与静态页控件行为，官方 Geist 字体及许可、站点图标、双语 SVG 与演示界面截图。
.github/: 独立仓库自动化，不访问私有源码。
.gitignore: 隔离依赖、生成物和浏览器测试输出。
.nvmrc: 建议使用的 Node 主版本。
AGENTS.md: 贡献者的事实、隐私与验证执行契约。
DESIGN.md: 维护者设计契约，记录 Geist 来源、素材许可、语义分工、首页三界与四层柔性编码及验证边界，不渲染为页面。
README.md: 站点构建、维护、发布和权利边界。
astro.config.mjs: 静态生成、项目 base path、双语导航与页面组件覆盖的唯一配置。
package.json: 开发、构建、模型/浏览器验收命令与依赖声明。
package-lock.json: 锁定生产与验收依赖的公共 registry 版本。
playwright.config.ts: 桌面/触控 Chromium 与生产预览服务编排。
scripts/: 静态链接与敏感串检查、精确发布文件清单；不读取应用数据。
src/: 页面、组件、内容集合与教学模型，站点唯一实现树。
tests/: 教学模型、首页品味门禁和真实浏览器验收，面向生产构建。
tsconfig.json: Astro strict 类型检查范围。

designs/: 山路纸带产品首页（黑底；Shopify Editions Fall ’26 纸带的同组几何常数造出「近低远高」的山坡，十字像素点阵山印在纸带上、立起的墙即山顶；滚动推进九章叙事，山路纹理朝镜头流、镜头只在章节之间移动；四道关为方形微拟物珠子、只用颜色表示核验结果；液态玻璃卡片、左侧索引与引线、2D 点画等高线地图与 3D 共用一份几何；事件驱动、零空闲帧，Token → Kit → 组件 → 品味门禁四层柔性编码）、三个产品静态页、UI Kit 与按需材质预览；明确清单控制公开源码，构建后与 Docs 同处 dist，复用共享导航、样式和状态；公开导航仅产品/文档，UI Kit 保留维护用途。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
