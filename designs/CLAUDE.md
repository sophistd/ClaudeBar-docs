# designs/

> L2 | 父级: ../CLAUDE.md

成员清单
publication.mjs: 公开源码与站点运行文件的明确清单，排除目录内未授权附加文件。
assemble.mjs: 先生成展示页，再将运行清单写入 Astro dist/designs，资源链接复用公共目录；产品首页写入站点根地址，英文旧文章路径保留为规范页面的别名。
build.mjs: 共享文案、页壳和组件生成三种独立静态页、UI Kit 与光学场景包，并调用 home-source 写出首页、打包 home.mjs；公开事实来自现有文档。
release.mjs: 读取 public/releases.json 最新正式版，向首页与获取页提供版本、发布说明、DMG 地址与 SHA-256 前缀；发版只改发布源。
home-source.mjs: 沉浸式首页的文案与结构唯一来源（工作台截图清单、页脚三列去处集中于此，版本信息取自 release.mjs），输出带 data-* 契约的 HTML。
home.mjs: 首页 DOM 编排入口（运行时加 .motion 才隐藏待入场内容；减弱动态不挂载 3D，保留静态海报）：首次入场、滚动显现、章节导轨、巨型序号字重与预检标题解密（均以章节滚动为相位）、恢复三态（滚动与手动选择）、工作台画廊、截图倾斜；挂载 3D 场景，失败时保留静态海报。
home-scene.mjs: 首页 3D 调度器：章节锚点（含每章检查模式）→ Catmull-Rom 镜头轨道 → 泛光 → X 光合成；渲染只由滚动/指针/尺寸/状态跃迁唤醒，临界阻尼落定后零帧，粒子以滚动距离为相位。
home-fx.mjs: 首页"海关 X 光"后期：Bayer 1-bit 抖动与静态扫描线（扫描线以下即被检查区）、Geist Mono 字符化（诊断即日志）、按镜头追赶距离的 RGB 色散；参数全由轨道推出，静止归零。
home-world.mjs: 首页 3D 零件库：与应用图标同几何的开口门框（drawRange 开合表达隔离）、陶土锚点、连接流着色器、星尘、门禁隧道、会话双航道、观测超图、预检纸页；只造物不调度。
home.css: 首页深色电影感样式；圆角与版心全部映射 geist.css token（6/8/10/12 同心嵌套、统一 --edge 对齐线），页头沿用 Docs 64px 几何且下边线即进度；刻意混入两味"坏品味"——描边巨型等宽序号与只属于隔离态的酸性绿 #D4FF00；动效只取 snap/glide/settle 三档临界阻尼弹簧，无无限循环，减弱动态退化为 140ms 淡入淡出。
kit-source.mjs: 共享按钮生成器与十个分区的 UI Kit 组合，演示数据不进入真实应用。
kit.css: UI Kit 展台排版与响应式布局，控件外观来自共享样式。
kit.js: 复制、原生浮层定位/焦点恢复及本地表单演示；主题和单选键盘复用 public/scripts/ui-controls.js，光学模块按需加载。
ui-kit.html: 生成的完整组件库与交互状态样本。
optics-scene.mjs: Three.js 物理材质、环境反射、主光阴影与三项调参；按事件渲染并释放资源。
optical.css: 营销页面的光环境、美术节奏和静态主视觉组合。
serve.mjs: 仅回环地址的设计预览服务，限定 designs/public/dist。
playwright.config.ts: 生产 dist 与正式域名的桌面/手机 Chromium 验收入口。
kit.spec.ts: 沉浸式首页的内容/恢复三态/画廊/空闲零帧与无 WebGL·减弱动态降级、其余四页明暗/响应式/链接/Axe、原生选择、WebGL 调参回归及页面清单截图。
states.spec.ts: 按组件族操作展开、焦点、选中、禁用及反馈；跨 Docs/营销/UI Kit 比较计算样式，输出真实状态截图。
styles.css: 功能/场景/获取三页的文字、布局与响应式几何（首页改用 home.css）；页头由 cb-site-header、截图由 cb-panel 统一材质；按钮、导航与分段选择材质来自共享 UI Kit。
interactions.js: 脚本就绪后启用手机导航、展开/关闭和 cb:change 之后的业务文案；选择状态交给共享运行时。
index.html: 生成的沉浸式产品首页（勿手改，改 home-source.mjs），以一次镜头穿越讲完门禁、会话、观测、恢复、预检五章并给出下载。
network.html: 生成的功能页，解释门禁路径、恢复与保护边界。
sessions.html: 生成的场景页，以两个浏览器会话解释数据与路由隔离。
access.html: 生成的获取页，说明实际获取前提和安装流程，不提供虚构下载。
assets/: 静态材质主视觉、可编辑 SVG 机制图与按需光学运行包；许可和来源由局部地图记录。
README.md: 样页类型、来源、生成与本地查看方式，以及验收记录入口。

产品首页位于 /ClaudeBar-docs/，是独立的深色 3D 体验，不挂主题切换、也不复用营销页壳；旧 designs/index.html 保持可用；其余静态页仍在 designs/。文档规范入口为 en/ 与 zh/，既有英文文章 URL 保留别名，中文 URL 不变。UI Kit 无公开导航入口且 noindex，仅保留组件维护与验收用途。顶层 publication.mjs 仅收录本模块 publicationFiles 明确列出的文件。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
