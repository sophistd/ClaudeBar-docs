/**
 * [INPUT]: 静态导航结构、ui-controls.js 的 cb:change 选择事件。
 * [OUTPUT]: 手机菜单展开/收起、键盘 Escape 和状态说明切换。
 * [POS]: 静态样页的渐进增强，不读取应用数据或发起网络请求。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
const menu=document.querySelector('.menu');
const nav=document.querySelector('#nav-links');
function closeMenu(){menu?.setAttribute('aria-expanded','false');nav?.classList.remove('open');menu?.setAttribute('aria-label','打开菜单');}
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'关闭菜单':'打开菜单');nav?.classList.toggle('open',open);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}});
matchMedia('(min-width:721px)').addEventListener('change',event=>{if(event.matches)closeMenu();});
const messages={open:'已有核验基线，允许新的受管连接握手。',wait:'上游中断后，新的握手等待恢复探测。默认宽限期为 4 秒。',isolated:'实测出口漂移，或探测被拒且到期未恢复，门禁拒绝新的握手。'};
document.querySelector('[data-cb-choice]')?.addEventListener('cb:change', event => {
  document.querySelector('[data-state-description]').textContent = messages[event.detail.button.dataset.state];
});
