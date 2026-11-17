/**
 * [INPUT]: Markdown/MDX 的 HTML 语法树。
 * [OUTPUT]: 可被键盘聚焦的语义表格，让窄屏横向滚动可操作。
 * [POS]: 构建期无障碍转换；不依赖客户端脚本，保留原始表格结构。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
export default function rehypeTables() {
  return function transform(tree) {
    function visit(node) {
      if (node.type === 'element' && node.tagName === 'table') {
        node.properties = { ...node.properties, tabIndex: 0 };
      }
      for (const child of node.children ?? []) visit(child);
    }
    visit(tree);
  };
}
