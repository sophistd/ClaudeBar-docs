/**
 * [INPUT]: 当前演示状态与显式用户事件。
 * [OUTPUT]: 无网络、无计时器的确定性状态转换与解释。
 * [POS]: 门禁教学组件的纯函数模型，不冒充真实 Swift 引擎。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
export const states = {
  stopped: { label: 'Stopped', code: 'STOPPED', detail: 'The gate is not armed. Verify an upstream before starting a managed session.' },
  armed: { label: 'Armed', code: 'ARMED_OPEN', detail: 'New connections may use the verified baseline.' },
  holding: { label: 'Holding', code: 'GRACE_HOLD', detail: 'New handshakes wait. A matching observation can resume admission. Expiry behavior depends on whether recovery probes rejected the upstream. Network changes may also close existing tunnels.' },
  isolated: { label: 'Isolated', code: 'TRIPPED_ISOLATED', detail: 'Pending handshakes fail and active epoch sockets close. A fresh verification is required before rearming.' },
};
export const transitions = {
  stopped: [{ event: 'verify', label: 'Verify and arm', next: 'armed' }],
  armed: [{ event: 'interrupt', label: 'Interrupt upstream', next: 'holding' }, { event: 'stop', label: 'Stop', next: 'stopped' }],
  holding: [{ event: 'recover', label: 'Recover same baseline', next: 'armed' }, { event: 'drift', label: 'Change exit identity', next: 'isolated' }, { event: 'timeout', label: 'Expire after rejection', next: 'isolated' }, { event: 'unobserved', label: 'Expire with no observation', next: 'armed' }, { event: 'stop', label: 'Stop', next: 'stopped' }],
  isolated: [{ event: 'verify', label: 'Reverify and arm', next: 'armed' }, { event: 'stop', label: 'Stop', next: 'stopped' }],
};
export function transition(state, event) {
  return transitions[state]?.find((action) => action.event === event)?.next ?? state;
}
