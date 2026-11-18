# assets/

> L2 | 父级: ../CLAUDE.md

成员清单
gateway-studio.webp: 生成的金属/玻璃/石墨门框主视觉，统一左上软光。
sessions-studio.webp: 生成的独立会话材质面板主视觉。
package-studio.webp: 生成的陶瓷、铝与玻璃安装包主视觉。
optics.bundle.js: esbuild 输出的 Three.js 按需运行包，仅 UI Kit 按需加载，与静态站一同发布。
optics.bundle.js.LEGAL.txt: 打包器保留的第三方许可。
THREE-LICENSE.txt: Three.js 原始 MIT 许可。
network.svg: 可复用的平面受管路径示意，浏览器与应用接入门禁，出口证据参与判断。
gate.svg: 可复用的平面门禁示意，稀疏点阵、中心门禁与进出连接。
sessions.svg: 两份独立浏览器数据目录并列，无跨会话连接。
package.svg: 平面安装包示意，不代表可下载的产品文件。

SVG 与运行包由 ../build.mjs 生成；WebP 由 ImageGen 原图转换，不由构建脚本重新生成。营销页的主视觉使用 WebP，机制示意仍由可编辑 SVG 承担。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
