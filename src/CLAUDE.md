# src/

> L2 | 父级: ../CLAUDE.md

成员清单
components/: 页面入口与渐进增强解释器，复用 Starlight 壳。
content/: 中英文规范正文与界面词条，不收录内部工程文档。
content.config.ts: 校验双语页面任务契约并加载界面词条；正文只收录 MDX，排除维护地图。
lib/: 共用教学状态机、双语说明与构建期表格键盘访问，不接触网络。
endpoints/: 由内容集合生成的机器阅读端点。
styles/: 中性表面、原生字体与单强调色的视觉覆盖层。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
