/**
 * [INPUT]: data-cb-theme / data-cb-choice 标记、原生按钮及可选关联面板。
 * [OUTPUT]: 静态页面共享主题、单选分组键盘行为与 cb:change 事件。
 * [POS]: UI Kit 和营销页的单一行为入口；Docs 继续由 Starlight 管理既有路由和主题。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
(() => {
  // ---- 与 Docs 共用偏好键；存储不可用时仍可在当前页切换 ----
  const key = 'starlight-theme';
  const system = matchMedia('(prefers-color-scheme: dark)');
  let preference = 'auto';
  try { preference = localStorage.getItem(key) || 'auto'; } catch {}
  if (!['light','dark','auto'].includes(preference)) preference = 'auto';
  function applyTheme(value, persist = false) {
    preference = value;
    document.documentElement.dataset.theme = value === 'auto' ? (system.matches ? 'dark' : 'light') : value;
    document.querySelectorAll('[data-cb-theme]').forEach(select => { select.value = value; });
    document.querySelectorAll('[data-cb-theme-toggle]').forEach(button => {
      const dark = document.documentElement.dataset.theme === 'dark';
      button.setAttribute('aria-pressed', String(dark));
      button.textContent = dark ? '浅色' : '深色';
    });
    if (persist) try { localStorage.setItem(key, value === 'auto' ? '' : value); } catch {}
  }
  applyTheme(preference);
  system.addEventListener('change', () => { if (preference === 'auto') applyTheme('auto'); });
  addEventListener('storage', event => { if (event.key === key) applyTheme(['light','dark'].includes(event.newValue) ? event.newValue : 'auto'); });
  function initialize() {
    applyTheme(preference);
    document.querySelectorAll('[data-cb-theme]').forEach(select => select.addEventListener('change', () => applyTheme(select.value, true)));
    document.querySelectorAll('[data-cb-theme-toggle]').forEach(button => button.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark', true)));
    // ---- 每个分组独立选择，跳过不可用项；页面只处理选择后的业务结果 ----
    document.querySelectorAll('[data-cb-choice]').forEach(group => {
      const buttons = [...group.querySelectorAll('button')];
      const tabs = group.getAttribute('role') === 'tablist';
      const state = tabs ? 'aria-selected' : 'aria-pressed';
      const enabled = () => buttons.filter(b => !b.disabled && b.getAttribute('aria-disabled') !== 'true');
      function activate(button, focus = false) {
        if (!enabled().includes(button)) return;
        buttons.forEach(b => {
          const selected = b === button;
          b.setAttribute(state, String(selected));
          if (tabs) b.tabIndex = selected ? 0 : -1;
          const panel = document.getElementById(b.getAttribute('aria-controls'));
          if (panel) panel.hidden = !selected;
        });
        if (focus) button.focus();
        group.dispatchEvent(new CustomEvent('cb:change', { bubbles:true, detail:{button} }));
      }
      buttons.forEach(button => {
        button.addEventListener('click', () => activate(button));
        button.addEventListener('keydown', event => {
          const list = enabled(); const index = list.indexOf(button); let next;
          if (event.key === 'ArrowRight') next = (index + 1) % list.length;
          if (event.key === 'ArrowLeft') next = (index + list.length - 1) % list.length;
          if (event.key === 'Home') next = 0;
          if (event.key === 'End') next = list.length - 1;
          if (next !== undefined) { event.preventDefault(); activate(list[next], true); }
        });
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, {once:true});
  else initialize();
})();
