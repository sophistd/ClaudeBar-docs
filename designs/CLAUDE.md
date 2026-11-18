# designs/

> L2 | 父级: ../CLAUDE.md

成员清单
publication.mjs: 公开源码与站点运行文件的明确清单，排除目录内未授权附加文件。
assemble.mjs: 先生成展示页，再将运行清单写入 Astro dist/designs，资源链接复用公共目录；产品首页写入站点根地址，英文旧文章路径保留为规范页面的别名。
build.mjs: 共享文案、页壳和组件生成四种独立静态页、UI Kit 与光学场景包；公开事实来自现有文档。
kit-source.mjs: 共享按钮生成器与十个分区的 UI Kit 组合，演示数据不进入真实应用。
kit.css: UI Kit 展台排版与响应式布局，控件外观来自共享样式。
kit.js: 复制、原生浮层定位/焦点恢复及本地表单演示；主题和单选键盘复用 public/scripts/ui-controls.js，光学模块按需加载。
ui-kit.html: 生成的完整组件库与交互状态样本。
optics-scene.mjs: Three.js 物理材质、环境反射、主光阴影与三项调参；按事件渲染并释放资源。
optical.css: 营销页面的光环境、美术节奏和静态主视觉组合。
serve.mjs: 仅回环地址的设计预览服务，限定 designs/public/dist。
playwright.config.ts: 生产 dist 与正式域名的桌面/手机 Chromium 验收入口。
kit.spec.ts: 根首页与 Docs 页头/截图表面及语义去重契约、五页明暗/响应式/链接/Axe、原生选择、WebGL 调参回归及页面清单截图。
states.spec.ts: 按组件族操作展开、焦点、选中、禁用及反馈；跨 Docs/营销/UI Kit 比较计算样式，输出真实状态截图。
styles.css: 营销页的文字、布局与响应式几何；页头由 cb-site-header、截图由 cb-panel 统一材质；按钮、导航与分段选择材质来自共享 UI Kit。
interactions.js: 脚本就绪后启用手机导航、展开/关闭和 cb:change 之后的业务文案；选择状态交给共享运行时。
index.html: 生成的产品首页，承担首次认识与进入功能的任务。
network.html: 生成的功能页，解释门禁路径、恢复与保护边界。
sessions.html: 生成的场景页，以两个浏览器会话解释数据与路由隔离。
access.html: 生成的获取页，说明实际获取前提和安装流程，不提供虚构下载。
assets/: 静态材质主视觉、可编辑 SVG 机制图与按需光学运行包；许可和来源由局部地图记录。
README.md: 样页类型、来源、生成与本地查看方式，以及验收记录入口。

产品首页位于 /ClaudeBar-docs/，旧 designs/index.html 保持可用；其余静态页仍在 designs/。文档规范入口为 en/ 与 zh/，既有英文文章 URL 保留别名，中文 URL 不变。UI Kit 无公开导航入口且 noindex，仅保留组件维护与验收用途。顶层 publication.mjs 仅收录本模块 publicationFiles 明确列出的文件。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
