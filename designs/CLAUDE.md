# designs/

> L2 | 父级: ../CLAUDE.md

成员清单
publication.mjs: 公开源码与站点运行文件的明确清单，排除目录内未授权附加文件。
assemble.mjs: 先生成展示页，再将运行清单写入 Astro dist/designs，资源链接复用公共目录；产品首页写入站点根地址，英文旧文章路径保留为规范页面的别名。
build.mjs: 共享文案、页壳和组件生成三种独立静态页、UI Kit 与光学场景包；首页先过 home-taste 品味门禁，再由 home-source 写出并打包 home.mjs；公开事实来自现有文档。
release.mjs: 读取 public/releases.json 最新正式版，向首页与获取页提供版本、发布说明、DMG 地址与 SHA-256 前缀；发版只改发布源。
home-tokens.mjs: 首页四层柔性编码 · Token 层：色板、snap/glide/settle 三档弹簧标尺、三界（文·人·现实 / 码·机器·心智 / 符·AI·符号，各自规定纸面与纸上文字色（均过 AA）、强调色、风声频段、和弦与震动型）、RIBBON 纸带几何（折线、卷曲半径与弧度、视距、淡出深度、磁吸半径、纸宽）、章节归属与越界顺序、环境键表；cssText() 把同一份常数内联成 :root 变量，CSS、GLSL、WebAudio 不再各写一份。
home-kit.mjs: Kit 层：env 环境键值与订阅、全页唯一的事件唤醒帧调度器（只有这里允许请求帧，落定即零帧）、三档临界阻尼跟随器（可换档、可设落定阈值），以及 readout / meter / spark / state / focus 五个微件原语；视图用 data-kit 声明"我是什么"、data-bind 声明"我读哪个键"。
home-sense.mjs: 听觉与触觉相：全部现场合成、不带音频文件，默认关闭且只由用户手势开启；风声音量即滚动速度（停下即无声），越界响该界和弦，恢复三态升级有提示音与震动（Vibration API 缺失时静默跳过）。
home-source.mjs: 组件与自适应组合层，也是首页文案与结构的唯一来源（工作台截图清单、页脚三列去处集中于此，版本信息取自 release.mjs）：整页印在一条纸带上——每节 .sheet 带 data-realm 与 data-snap，.col 的直接子元素即纸片，data-anchor 标引线落点，恢复章用 data-hold/data-pin 驻留；越界段是一块换色渐变片；左侧七项章节索引、引线层、固定世界与滚动空杆、底部状态栏都只声明结构与绑定。
home.mjs: 首页 DOM 编排入口（有 WebGL 且未减弱动态才卷曲，否则平整纸带）：卷曲版把世界固定在视口，原生滚动推动空杆，显示位置由弹簧跟随；停下时离某节最佳展示位不到 0.42 屏即磁吸归位，锚点与键盘焦点换算成文档滚动；把滚动翻译成环境（进度、速度、当前章节、章节进度 --p、三界 from/to/mix、恢复三态），再交给纸带、3D、引线、声音与触感；另管标题入场、解密标题、刻度尺、按钮与索引的指针磁吸、工作台画廊与截图倾斜。
home-ribbon.mjs: 纸带几何真源：curve/bend/project 一条曲线（平整阅读区 → 半径卷起 → 切线直奔远方）、最佳展示线 rest、GLSL 同构片段、offsetTop 链版面缓存与驻留段、逐块写 perspective()+rotateX 的纸片变换器（透视原点换算到视口中心，不依赖 preserve-3d）、索引引线；只算几何、只写 transform/opacity，不请求帧。
home-scene.mjs: 首页 3D 渲染器：相机与 CSS perspective 同视距同视场、单位即 CSS 像素；只画与 DOM 纸片同形的连续纸面（按越界段换色，sRGB 原值插值与 CSS 渐变一致）、随滚动推进的黑色蓝图房间、纸带两侧随纸面卷走的线框零件；视图没变就不画，写回帧数遥测。
home-world.mjs: 首页 3D 零件库：每章一件 ClaudeBar 领域对象的技术线稿（菜单栏面板、检查站闸门、两扇会话窗、观测图、三态开关、待检纸页、工作台、安装包），各带尺寸标注线；会话窗与观测图响应联动高亮，开关随恢复三态扳动；另造蓝图房间。不再使用应用图标几何，只造物不调度。
home-taste.mjs: Taste Contract 层：Good/Bad 双向门禁。BAD 拦时钟、散落的帧循环、无限动画、贝塞尔与裸毫秒、悬停改尺寸、超 800 行；GOOD 要求减弱动态退路、三界定义完整（含纸面与文字色）、章节与越界段一致、每个 data-kit/data-bind 都有环境承接、分形文档头。build.mjs 出包前审一次，tests/home-taste.test.mjs 再审并验证每条规则真的会报。
home.css: 纸带首页样式：黑色蓝图房间里的一条居中纸带（宽屏 64vw 至多 1180px），每节铺自己那一界的纸色，纸片自带纸色与内边距；卷曲版把世界固定并裁切、顶部加远雾；左侧章节索引与引线、刻度尺、内嵌图版、恢复驻留、工作台与页脚；圆角映射 geist.css 6/8/10/12，页头沿用 Docs 64px 几何且下边线即进度；酸性绿只属于隔离态；动效只取三档弹簧，无无限循环，减弱动态退化为 140ms 淡入淡出。
kit-source.mjs: 共享按钮生成器与十个分区的 UI Kit 组合，演示数据不进入真实应用。
kit.css: UI Kit 展台排版与响应式布局，控件外观来自共享样式。
kit.js: 复制、原生浮层定位/焦点恢复及本地表单演示；主题和单选键盘复用 public/scripts/ui-controls.js，光学模块按需加载。
ui-kit.html: 生成的完整组件库与交互状态样本。
optics-scene.mjs: Three.js 物理材质、环境反射、主光阴影与三项调参；按事件渲染并释放资源。
optical.css: 营销页面的光环境、美术节奏和静态主视觉组合。
serve.mjs: 仅回环地址的设计预览服务，限定 designs/public/dist。
playwright.config.ts: 生产 dist 与正式域名的桌面/手机 Chromium 验收入口。
kit.spec.ts: 纸带首页的内容/恢复三态/画廊/空闲零帧/Axe、三界越界与状态栏遥测、磁吸归位与章节进度、声音开关与无 WebGL·减弱动态退化为平整纸带、其余四页明暗/响应式/链接/Axe、原生选择、WebGL 调参回归及页面清单截图；首页导航经章节索引（与真人路径一致）。
states.spec.ts: 按组件族操作展开、焦点、选中、禁用及反馈；跨 Docs/营销/UI Kit 比较计算样式，输出真实状态截图。
styles.css: 功能/场景/获取三页的文字、布局与响应式几何（首页改用 home.css）；页头由 cb-site-header、截图由 cb-panel 统一材质；按钮、导航与分段选择材质来自共享 UI Kit。
interactions.js: 脚本就绪后启用手机导航、展开/关闭和 cb:change 之后的业务文案；选择状态交给共享运行时。
index.html: 生成的纸带产品首页（勿手改，改 home-source.mjs）：一条纸带印着首屏、门禁、会话、观测、恢复、预检五章、工作台与下载，越过折线即卷向远方；途中三次越界，纸色依次由陶土（文）到蓝图（码）到象牙（符）再回陶土。
network.html: 生成的功能页，解释门禁路径、恢复与保护边界。
sessions.html: 生成的场景页，以两个浏览器会话解释数据与路由隔离。
access.html: 生成的获取页，说明实际获取前提和安装流程，不提供虚构下载。
assets/: 静态材质主视觉、可编辑 SVG 机制图与按需光学运行包；许可和来源由局部地图记录。
README.md: 样页类型、来源、生成与本地查看方式，以及验收记录入口。

首页四层柔性编码自下而上：home-tokens（环境常数、动效标尺与纸带几何）→ home-kit / home-sense / home-ribbon（可感知的原语与同一条曲线）→ home-source + home.css（组件与自适应组合）→ home-taste（Good/Bad 门禁）。依赖只向下：视图声明、环境编码。章节小图的 22 项检查与符号切分均为标注过的示意；状态栏的帧数、深度、速度是本页真实读数。

产品首页位于 /ClaudeBar-docs/，是独立的深色纸带体验（构图研究参考 Shopify Editions Fall ’26 的卷曲纸带，实现与素材均为原创），不挂主题切换、也不复用营销页壳；旧 designs/index.html 保持可用；其余静态页仍在 designs/。文档规范入口为 en/ 与 zh/，既有英文文章 URL 保留别名，中文 URL 不变。UI Kit 无公开导航入口且 noindex，仅保留组件维护与验收用途。顶层 publication.mjs 仅收录本模块 publicationFiles 明确列出的文件。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
