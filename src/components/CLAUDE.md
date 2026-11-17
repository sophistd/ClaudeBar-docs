# components/

> L2 | 父级: ../CLAUDE.md

成员清单
Head.astro: 保留框架 head，仅剔除静态 404 不存在的语言互链和 canonical。
GateExplorer.astro: 中英文共用门禁生命周期教学；显式区分拒绝到期与观察缺失。
PageTitle.astro: 只渲染文章标题与摘要，编辑元数据不进入 UI。
Footer.astro: 在正文之后提供同源 Markdown 入口，复用框架页尾。
DocFigure.astro: 为中英文图解导读提供可滚动、可按原尺寸打开的图像和可选补充图注；每张图只保留一个原图入口；截图使用共享浮起高度，机制图保持平面。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
