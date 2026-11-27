# designs/

> L2 | 父级: ../CLAUDE.md

成员清单
publication.mjs: 公开源码与站点运行文件的明确清单，排除目录内未授权附加文件。
assemble.mjs: 先生成展示页，再将运行清单写入 Astro dist/designs，资源链接复用公共目录；产品首页写入站点根地址，英文旧文章路径保留为规范页面的别名。
build.mjs: 共享文案、页壳和组件生成三种独立静态页、UI Kit 与光学场景包；首页先过 home-taste 品味门禁，再由 home-source 写出并打包 home.mjs；公开事实来自现有文档。
release.mjs: 读取 public/releases.json 最新正式版，向首页与获取页提供版本、发布说明、DMG 地址与 SHA-256 前缀；发版只改发布源。
home-tokens.mjs: 首页四层柔性编码 · Token 层：色板、snap/glide/settle 三档弹簧标尺、三界（文·人·现实 / 码·机器·心智 / 符·AI·符号，各自规定纸面与纸上文字色（均过 AA）、强调色、风声频段、和弦与震动型）、GROUND 地面网格·脉冲·翻滚方块与 GRAPH 首屏图谱参数、RIBBON 纸带几何（5H 地面—立面纸带、立起锐度、镜头高度/俯角/视场、对焦行、阅读线、最佳展示位、磁吸半径、跟手速率、平整与卷曲纸宽、纸面光照 shade 与立体层 stand）、章节归属与越界顺序、环境键表；cssText() 把同一份常数内联成 :root 变量，CSS、GLSL、WebAudio 不再各写一份。
home-kit.mjs: Kit 层：env 环境键值与订阅、全页唯一的事件唤醒帧调度器（只有这里允许请求帧，落定即零帧）、三档临界阻尼跟随器（可换档、可设落定阈值），以及 readout / meter / spark / state / focus 五个微件原语；视图用 data-kit 声明"我是什么"、data-bind 声明"我读哪个键"。
home-sense.mjs: 听觉与触觉相：全部现场合成、不带音频文件，默认关闭且只由用户手势开启；风声音量即滚动速度（停下即无声），越界响该界和弦，恢复三态升级有提示音与震动（Vibration API 缺失时静默跳过）。
home-source.mjs: 组件与自适应组合层，也是首页文案与结构的唯一来源（工作台截图清单、页脚三列去处集中于此，版本信息取自 release.mjs）：整页印在一条纸带上——每节 .sheet 带 data-realm 与 data-snap，.col 的直接子元素即纸片，data-anchor 标引线落点，恢复章用 data-hold/data-pin 驻留；越界段是一块换色渐变片；左侧七项章节索引、引线层、固定世界与滚动空杆、页头 2D/3D 开关都只声明结构与绑定；三界只驱动纸色与声音，不印成文字；示意用虚线框表示，图例只在页脚出现一次；正文是一排短条目（points），小图面板带标题、说明与深色小按钮（plateHead/pill），会话为两只存储框对照，恢复为带条件的有向状态图。
home.mjs: 首页 DOM 编排入口（有 WebGL 且未减弱动态才能卷曲，否则平整纸带；页头 2D/3D 开关运行时切换、回到同一章、选择记在本机）：卷曲版把世界固定在视口，原生滚动推动空杆，显示位置以每秒 6 的速率跟随（Lenis lerp 0.1 的手感）；停下时离最佳展示位不到 0.12 屏才轻轻吸正，锚点与键盘焦点换算成文档滚动；把滚动翻译成环境（进度、速度、当前章节、章节进度 --p、三界 from/to/mix、恢复三态），再交给纸带、3D、引线、声音与触感；另管标题入场、解密标题、刻度尺、按钮与索引的指针磁吸、工作台画廊与截图倾斜。
home-ribbon.mjs: 纸带几何真源：按参考稿的模型造一条 5H 纸带（近端平铺地面、远端立起正对镜头），俯视 30.2° 的镜头投影出近大远小、近低远高；curve/bend/project/qAt 由此给出每一行的 CSS 3D 落点、倾角与缩放，阅读线 1:1 反解倍率 m；另有最佳展示位 rest、offsetTop 链版面缓存与驻留段、逐块写 perspective()+rotateX+scale 的纸片变换器（data-stand 立起、data-float 离纸、--lit 纸面光照）、索引引线；只算几何、只写 transform/opacity，不请求帧。
home-scene.mjs: 首页 3D 渲染器：相机即纸带模型的俯视镜头（原点看 −z，视场与 CSS perspective 同），单位为世界单位；画与 DOM 纸片同形的连续纸面（顶点每帧按 bend 重算、按越界段换色）、随滚动后退的地面网格，并把 figures/stage.mjs 的物理材质舞台物件按近/中两层摆到纸带两侧（单独一遍渲染、RoomEnvironment 环境光），道闸随本节进度 p 落下；视图没变就不画，写回帧数遥测。
home-world.mjs: 首页 3D 的地面：纸带近端平铺、舞台素材站立的那片地。照参考稿 grid 着色器在片元里画细格/粗格/对角线，一半粗格纵线上跑亮头拖尾的光脉冲；两侧地面上每隔一段一片小格子，方块绕底边翻到相邻格。脉冲与翻滚由滚动距离推动，停下即静止。
home-graph.mjs: 首屏关系图谱：九个产品对象为方块枢纽、叶子散在四周、枢纽间弱连接，整张图沿纸面法线悬起（枢纽更高并垂线回纸面），等宽字标签朝向镜头；位置取首屏 [data-graph] 纸片，只算几何。
home-taste.mjs: Taste Contract 层：Good/Bad 双向门禁。BAD 拦时钟、散落的帧循环、无限动画、贝塞尔与裸毫秒、悬停改尺寸、超 800 行；GOOD 要求减弱动态退路、三界定义完整（含纸面与文字色）、章节与越界段一致、每个 data-kit/data-bind 都有环境承接、分形文档头。build.mjs 出包前审一次，tests/home-taste.test.mjs 再审并验证每条规则真的会报。
home.css: 纸带首页样式：黑色地面上的一条居中纸带（平整版宽屏 64vw、卷曲版 50vw，至多 1180px），每节铺自己那一界的纸色，纸片自带纸色与内边距；卷曲版把世界固定并裁切、顶部加远雾；左侧章节索引与引线、内嵌图版、恢复驻留、工作台与页脚；圆角映射 geist.css 6/8/10/12，页头沿用 Docs 64px 几何且下边线即进度；酸性绿只属于隔离态；动效只取三档弹簧，无无限循环，减弱动态退化为 140ms 淡入淡出。
kit-source.mjs: 共享按钮生成器与十个分区的 UI Kit 组合，演示数据不进入真实应用。
kit.css: UI Kit 展台排版与响应式布局，控件外观来自共享样式。
kit.js: 复制、原生浮层定位/焦点恢复及本地表单演示；主题和单选键盘复用 public/scripts/ui-controls.js，光学模块按需加载。
ui-kit.html: 生成的完整组件库与交互状态样本。
optics-scene.mjs: Three.js 物理材质、环境反射、主光阴影与三项调参；按事件渲染并释放资源。
optical.css: 营销页面的光环境、美术节奏和静态主视觉组合。
serve.mjs: 仅回环地址的设计预览服务，限定 designs/public/dist。
playwright.config.ts: 生产 dist 与正式域名的桌面/手机 Chromium 验收入口。
kit.spec.ts: 纸带首页的内容/恢复三态/画廊/空闲零帧/Axe、三界越界且页面不印自我标注、近处轻吸、远处不吸与章节进度、声音开关与无 WebGL·减弱动态退化为平整纸带、其余四页明暗/响应式/链接/Axe、原生选择、WebGL 调参回归及页面清单截图；首页导航经章节索引（与真人路径一致）。
states.spec.ts: 按组件族操作展开、焦点、选中、禁用及反馈；跨 Docs/营销/UI Kit 比较计算样式，输出真实状态截图。
styles.css: 功能/场景/获取三页的文字、布局与响应式几何（首页改用 home.css）；页头由 cb-site-header、截图由 cb-panel 统一材质；按钮、导航与分段选择材质来自共享 UI Kit。
interactions.js: 脚本就绪后启用手机导航、展开/关闭和 cb:change 之后的业务文案；选择状态交给共享运行时。
index.html: 生成的纸带产品首页（勿手改，改 home-source.mjs）：按用户场景组织——首屏之后是出口漂移、流量绕路、断网之后、同机多号、时区错位五个场景，再到工作台与下载；网络三场景在码界（蓝图纸），身份两场景在符界（象牙纸），首尾在文界（陶土纸）。
network.html: 生成的功能页，解释门禁路径、恢复与保护边界。
sessions.html: 生成的场景页，以两个浏览器会话解释数据与路由隔离。
access.html: 生成的获取页，说明实际获取前提和安装流程，不提供虚构下载。
assets/: 静态材质主视觉、可编辑 SVG 机制图与按需光学运行包；许可和来源由局部地图记录。
README.md: 样页类型、来源、生成与本地查看方式，以及验收记录入口。
figures/: 场景图的三维物件套件、五张痛点顷刻的 PBR 场景与离线出图脚本（HDRI 光环境，渲成 assets/figures/*.webp），以及纸带两侧实时渲染的舞台物件 stage.mjs（同一套物件与材质）；编码表：连续线已发生、断续线未发生、mark 漆只给出事处，图里不写字。

首页四层柔性编码自下而上：home-tokens（环境常数、动效标尺与纸带几何）→ home-kit / home-sense / home-ribbon（可感知的原语与同一条曲线）→ home-source + home.css（组件与自适应组合）→ home-taste（Good/Bad 门禁）。依赖只向下：视图声明、环境编码。章节小图的 22 项检查与符号切分均为标注过的示意；状态栏的帧数、深度、速度是本页真实读数。

产品首页位于 /ClaudeBar-docs/，是独立的深色纸带体验（构图研究参考 Shopify Editions Fall ’26 的卷曲纸带，实现与素材均为原创），不挂主题切换、也不复用营销页壳；旧 designs/index.html 保持可用；其余静态页仍在 designs/。文档规范入口为 en/ 与 zh/，既有英文文章 URL 保留别名，中文 URL 不变。UI Kit 无公开导航入口且 noindex，仅保留组件维护与验收用途。顶层 publication.mjs 仅收录本模块 publicationFiles 明确列出的文件。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
