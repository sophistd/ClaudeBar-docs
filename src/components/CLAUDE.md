# components/

> L2 | 父级: ../CLAUDE.md

成员清单
Sidebar.astro: 在原生文档侧栏前接入共享站点入口，不复制目录或手机控件行为。
Head.astro: 保留框架 head，仅剔除静态 404 不存在的语言互链和 canonical。
GateExplorer.astro: 中英文门禁教学只显示当前状态，复用 UI Kit 主次按钮；拒绝到期与观察缺失保持不同结果。
PageTitle.astro: 渲染唯一标题及有新增信息的摘要；showDescription 仅控制正文展示，不影响搜索描述。
Footer.astro: 在正文之后提供同源 Markdown 入口，复用框架页尾。
DocFigure.astro: 为中英文图解导读提供可滚动、可按原尺寸打开的图像和可选补充图注；每张图只保留一个原图入口；截图直接使用共享 cb-panel 接触面板，机制图不额外套框，滚动区域引用共享焦点 token。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
