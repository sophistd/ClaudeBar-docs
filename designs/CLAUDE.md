# designs/

> L2 | 父级: ../CLAUDE.md

成员清单
publication.mjs: 公开源码与站点运行文件的明确清单，排除目录内未授权附加文件。
assemble.mjs: 先生成展示页，再将运行清单写入 Astro dist/designs，资源链接复用公共目录；产品首页写入站点根地址，英文旧文章路径保留为规范页面的别名。
build.mjs: 共享文案、页壳和组件生成三种独立静态页、UI Kit 与光学场景包；首页先过 home-taste 品味门禁，再由 home-source 写出并打包 home.mjs；公开事实来自现有文档。
release.mjs: 读取 public/releases.json 最新正式版，向首页与获取页提供版本、发布说明、DMG 地址与 SHA-256 前缀；发版只改发布源。
home-tokens.mjs: 首页 Token 层：MOTION 三档弹簧、RIBBON 纸带几何（参考稿同组常数）、ENV_DEFAULTS、TRAIL（山路长度、中轴、浮雕、层距、四道关位置 τ、主光）、GATES（四道关与核验结果）、STATE 结果色、CAMERA 每章镜头、RADII 方角四档、trailCss()。
home-terrain.mjs: 山路高度场 heightAt(τ, v, T)（越往山顶越高、中线成脊、两侧散成山麓、山顶一道参差的脊）、altitude 海拔与 bakeHeight 烘成 RGBA8 纹理（高度与两向坡度）。
home-trail.mjs: 首页空间语法：纸带不动、山路纹理朝镜头流（τ = head + a − aRest）；trail() 给出 H 单位的纸带中线、最佳展示位、山顶 T、纸面点与每章机位（3D 与 2D 两份），chapterState(s) 给出路头、路线、分层与镜头插值，mixOrbit/orbitPosition 做轨道插值。纯函数。
home-kit.mjs: Kit 层：env 环境键值与订阅、全页唯一的事件唤醒帧调度器（只有这里允许请求帧，落定即零帧）、三档临界阻尼跟随器 spring（可换档为每秒速率）。
home-source.mjs: 首页文案与结构的唯一来源：九章（总览、起点、四道关、拆开看、山顶、工作台），每章一张液态玻璃卡（眉标、标题、一行正文、示意读数、必要时的边界注与文字入口）；珠子层 [data-bead]、层标签 [data-chip]、引线层、左侧索引、2D/3D 开关；页脚只说一次「卡片读数为示意」。没有脚本或 WebGL 时是一页黑底长文。
home.mjs: 首页编排入口：拿得到 WebGL2 才挂载空间层；滚动换算成章节连续坐标 s（显示值以每秒 6 跟随），s 决定镜头、路头、分层、珠子结果、卡片显隐、索引与引线；scrollend 时离章节中心不到 0.12 屏才轻吸，任何其他滚动来源都会让位；2D/3D 记在本机，减弱动态强制 2D，触控窄屏默认 2D；工作台画廊标签。
home-ribbon.mjs: 纸带几何真源：curve(vw, vh) 按参考稿模型造 5H 纸带与俯视 30.2° 镜头（home-trail 由此造山坡与参考机位）；createLeaders 为索引引线。
home-scene.mjs: 首页空间层：纸带上的十字像素点阵（四层纸共用一份几何），点阵跟着地形一起朝镜头流（不在原地抖动变色）；网点式明暗、近处淡出、卡片周围安静区、少量暗闪点（为减轻「看着花」：避开 3 周期/度的规整条纹与满对比）；墙顶偏暖、山脚偏青；白点路线沿中线、在前三道关处垂直穿层；地面稀疏点阵；t=0 时摊平成点画等高线地图；视图没变就不画。
home-taste.mjs: Taste Contract 层：Good/Bad 双向门禁。BAD 拦时钟、散落的帧循环、无限动画、贝塞尔与裸毫秒、悬停改尺寸、自我标注、中文句子复述、超字数章节、超 800 行；GOOD 要求减弱动态退路、每章有镜头且不倒退、每道关有珠子、圆角只取四档、分形文档头。build.mjs 出包前审一次，tests/home-taste.test.mjs 再审并验证每条规则真的会报。
home.css: 山路首页样式：黑底；固定画布与珠子层；液态玻璃卡（深色、模糊、左上细高光、右下投影）；26px 方形微拟物珠子按核验结果换色（通过绿、缓解琥珀）；左侧索引与引线；方角四档 2/3/4/6px；山顶告示板与唯一的凸起下载按钮；工作台画廊与页脚；动效只取三档弹簧，减弱动态退化为 140ms 淡入淡出。
kit-source.mjs: 共享按钮生成器与十个分区的 UI Kit 组合，演示数据不进入真实应用。
kit.css: UI Kit 展台排版与响应式布局，控件外观来自共享样式。
kit.js: 复制、原生浮层定位/焦点恢复及本地表单演示；主题和单选键盘复用 public/scripts/ui-controls.js，光学模块按需加载。
ui-kit.html: 生成的完整组件库与交互状态样本。
optics-scene.mjs: Three.js 物理材质、环境反射、主光阴影与三项调参；按事件渲染并释放资源。
optical.css: 营销页面的光环境、美术节奏和静态主视觉组合。
serve.mjs: 仅回环地址的设计预览服务，限定 designs/public/dist。
playwright.config.ts: 生产 dist 与正式域名的桌面/手机 Chromium 验收入口。
kit.spec.ts: 山路首页的文案/画廊/链接/Axe/空闲零帧、滚动推进与珠子结果、2D/3D 与减弱动态、轻吸只在近处、无 WebGL 与脚本失败降级；其余四页明暗/响应式/链接/Axe、原生选择、WebGL 调参回归与页面清单截图。
states.spec.ts: 按组件族操作展开、焦点、选中、禁用及反馈；跨 Docs/营销/UI Kit 比较计算样式，输出真实状态截图。
styles.css: 功能/场景/获取三页的文字、布局与响应式几何（首页改用 home.css）；页头由 cb-site-header、截图由 cb-panel 统一材质；按钮、导航与分段选择材质来自共享 UI Kit。
interactions.js: 脚本就绪后启用手机导航、展开/关闭和 cb:change 之后的业务文案；选择状态交给共享运行时。
index.html: 生成的山路纸带产品首页（勿手改，改 home-source.mjs）：出口不对，就不出发——起点、会话隔离、环境对齐、暗道封堵、出口门禁、拆开看、山顶下载、工作台。
network.html: 生成的功能页，解释门禁路径、恢复与保护边界。
sessions.html: 生成的场景页，以两个浏览器会话解释数据与路由隔离。
access.html: 生成的获取页，说明实际获取前提和安装流程，不提供虚构下载。
assets/: 静态材质主视觉、可编辑 SVG 机制图与按需光学运行包；许可和来源由局部地图记录。
README.md: 样页类型、来源、生成与本地查看方式，以及验收记录入口。

首页四层柔性编码自下而上：home-tokens（常数）→ home-kit / home-terrain / home-ribbon / home-trail（原语、高度场与同一条纸带）→ home-scene + home-source + home.css + home.mjs（组件、空间与编排）→ home-taste（Good/Bad 门禁）。依赖只向下：视图声明、环境编码。卡片读数为示意，页脚说明一次。

产品首页位于 /ClaudeBar-docs/，是独立的黑底山路体验：纸带几何沿用 Shopify Editions Fall ’26 纸带的同组常数（代码与素材原创），点阵山印在纸带上，立起的墙即山顶；不挂主题切换、也不复用营销页壳；其余静态页仍在 designs/。文档规范入口为 en/ 与 zh/，既有英文文章 URL 保留别名，中文 URL 不变。UI Kit 无公开导航入口且 noindex，仅保留组件维护与验收用途。顶层 publication.mjs 仅收录本模块 publicationFiles 明确列出的文件。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
