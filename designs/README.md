# ClaudeBar · Vercel 风格静态页

功能、场景、获取三种页面与一个完整的项目 UI Kit 共用同一套颜色、字体、材质和组件状态；沉浸式首页另有深色 3D 体系，只共用 Geist 字体、圆角与版心 token。

| 页面 | 负责回答的问题 | 入口 |
| --- | --- | --- |
| Landing / 产品首页 | 它是什么，对我有什么用？（Three.js 沉浸式穿越文、码、符三界；源在 home-*.mjs，自 home-tokens 起四层） | [index.html](index.html) |
| Feature / 功能页 | 这个能力怎样工作，边界在哪？ | [network.html](network.html) |
| Use case / 场景页 | 我的情况该选哪一种方式？ | [sessions.html](sessions.html) |
| Access / 获取页 | 怎样获得，需要准备什么？ | [access.html](access.html) |
| UI Kit / 组件库 | 组件有哪些状态，如何复制、组合和验证？ | [ui-kit.html](ui-kit.html) |
| Docs / 文档 | 具体怎么操作，参数怎样查？ | 现有 Astro/Starlight 站点 |

## 共用的系统

`../public/styles/geist.css` 管理字体和基础token，`../public/styles/ui-kit.css` 管理材质、高度与组件状态。`kit-source.mjs` 导出的按钮同时被营销页面调用。UI Kit 包含基础标尺、光学样本、按钮状态、字段验证、checkbox/radio/switch/range、tabs/分段/导航、badge/alert/toast/loading/empty、表格、tooltip/popover/dialog，以及完整本地表单组合。代码片段可复制，token和组件源文件可下载。

在 website 目录执行：

```sh
node designs/build.mjs
node designs/serve.mjs
npm run build
npx playwright test --config designs/playwright.config.ts
```

预览为 `http://127.0.0.1:4324/designs/`，UI Kit 为 `/designs/ui-kit.html`。文档链接需要先执行 `npm run build`。无后端，组件演示不操作真实应用或网络；所有输入只留在当前页面。

这些命令在包含本目录的应用仓库中运行，依赖由 `website/` 下的 `npm ci` 安装。本地也可使用 `npm run designs:build`、`npm run designs:preview` 和 `npm run designs:test`。公开导出收录 publication.mjs 明确列出的文件及这些命令，应用代码和其他设计附加文件不公开。

主视觉采用三张本地WebP，合计约100KB。实时材质模块约568KB未压缩代码，仅在用户开启UI Kit光学样本时加载，普通页面不请求它。实时样本使用环境反射、PBR透射、厚度、IOR和真实主光阴影；按事件渲染，没有空闲动画循环。浏览器不支持WebGL或上下文丢失时显示静态图。

## 直接参考的原件

- [Geist Brands](https://vercel.com/geist/brands)：文档页骨架与标题/正文层级。
- [Geist Colors](https://vercel.com/geist/colors)、[Typography](https://vercel.com/geist/typography)、[Button](https://vercel.com/geist/button)、[Grid](https://vercel.com/geist/grid)：token、组件状态和可见网格规范。
- [Vercel 首页](https://vercel.com/)：64px 标题、轻字重、开放空间和主要操作。
- [Vercel Security](https://vercel.com/security)：功能页的文字/配图分栏、主次按钮和下游内容节奏。
- [Vercel for Platforms](https://vercel.com/for/platforms)：场景页按使用方式组织能力和比较。

字体原样采用官方 `geist@1.9.2` WOFF2；许可见 `../public/fonts/LICENSE.txt`。机制图为原创SVG；主视觉为ImageGen生成的材质图；实时场景为Three.js，许可见 `assets/THREE-LICENSE.txt`。没有把 Vercel 商标用作 ClaudeBar 标识。与应用有关的事实仅来自现有文档，未虚构公开下载、定价、客户证言或安全保证。

## 交付边界

用户已授权公开五类页面展示；模块 publication.mjs 明确列出公开源码和部署运行文件。npm run build 将页面构建到 dist/designs，与 Docs 共用发布和导航。设计思考、评分和检查记录不进入页面 UI。

## 验收边界

浏览器自动检查覆盖桌面/手机、浅/深色、组件焦点、验证、链接、对比度与WebGL调参前后画面变化。美术还需查看实际截图；测试通过不代表用户已认可艺术质量。前轮9.5自评不沿用。


组件状态统一来自 `../public/styles/ui-kit.css`，静态页主题与分组键盘来自 `../public/scripts/ui-controls.js`。`styles.css`、`optical.css`、`kit.css` 只负责页面和展台布局；Docs 使用同一视觉层并保留 Starlight 行为。

`UI_STATE_REVIEW_DIR=<绝对路径> npm run designs:test` 导出真实状态截图，并在同级 pages 目录保存五类页面明暗/桌面手机全页截图及组件清单。状态回归比较跨页面计算样式，覆盖原生浮层、键盘、禁用、只读、错误、复制、主题持久化及自动主题。审阅记录留在任务 scratch；不把验收矩阵塞进产品页面。

正式入口为 `/ClaudeBar-docs/`，UI Kit 保留维护用途，不在对外导航展示。生产预览使用 `npm run preview`；本地源文件预览仍可使用 serve.mjs。
