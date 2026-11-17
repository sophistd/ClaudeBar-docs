/**
 * [INPUT]: 教学模型的状态与转换表。
 * [OUTPUT]: 恢复、漂移、超时、重启和无效动作的回归证据。
 * [POS]: 防止交互图把隔离误画成自动恢复。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transition, transitions, states } from '../src/lib/gate.mjs';
test('matching recovery returns held connections to armed state', () => {
  assert.equal(transition(transition('armed', 'interrupt'), 'recover'), 'armed');
});
for (const event of ['drift', 'timeout']) {
  test(`${event} isolates; ordinary recovery cannot rearm`, () => {
    const isolated = transition(transition('armed', 'interrupt'), event);
    assert.equal(isolated, 'isolated');
    assert.equal(transition(isolated, 'recover'), 'isolated');
    assert.equal(transition(isolated, 'verify'), 'armed');
  });
}
test('stop always requires a new verification', () => {
  for (const state of ['armed', 'holding', 'isolated']) {
    assert.equal(transition(state, 'stop'), 'stopped');
  }
  assert.equal(transition('stopped', 'recover'), 'stopped');
  assert.equal(transition('stopped', 'verify'), 'armed');
});
test('all displayed actions reach a named state; unknown events are inert', () => {
  for (const [state, actions] of Object.entries(transitions)) {
    assert.equal(transition(state, 'unknown'), state);
    for (const action of actions) assert.ok(states[transition(state, action.event)]);
  }
});

test('unobserved-only expiry reuses the prior baseline in the current runtime', () => {
  assert.equal(transition('holding', 'unobserved'), 'armed');
});
