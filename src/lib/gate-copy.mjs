/**
 * [INPUT]: gate.mjs 的稳定状态与事件标识，以及当前文档语言。
 * [OUTPUT]: 教学模型的中英文状态解释和动作名称。
 * [POS]: 只负责呈现；两种语言共享同一套状态转换，不改变模拟行为。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { states } from './gate.mjs';
const chineseStates = {
  stopped: { label: '已停止', detail: '门禁尚未启用。先验证上游代理，再启动受管会话。' },
  armed: { label: '允许连接', detail: '门禁按已经验证的出口基线放行新连接。' },
  holding: { label: '等待恢复', detail: '新连接的握手暂时等待。观测结果与出口基线一致时可以恢复放行；宽限期到期后怎么处理，要看恢复探测是否有不通过的结果。网络变化还可能关闭已有隧道。' },
  isolated: { label: '已隔离', detail: '等待中的握手失败，本轮已建立的连接会被关闭。重新验证通过后，才能再次启用门禁。' },
};
const chineseActions = {
  verify: '验证并启用', interrupt: '模拟上游中断', stop: '停止门禁',
  recover: '恢复到原出口', drift: '模拟出口身份变化',
  timeout: '探测未通过，等待到期', unobserved: '未取得新观测，等待到期',
};
export function stateText(state, locale) {
  return locale === 'zh' ? chineseStates[state] : states[state];
}
export function actionText(action, state, locale) {
  if (locale !== 'zh') return action.label;
  return action.event === 'verify' && state === 'isolated' ? '重新验证并启用' : chineseActions[action.event];
}
