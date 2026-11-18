/**
 * [INPUT]: kit-source 生成的原生控件、共享 CSS 和按需打包的材质场景。
 * [OUTPUT]: 复制、共享选择事件的业务反馈、原生浮层定位/焦点恢复与本地表单演示。
 * [POS]: UI Kit 的渐进增强；不读写应用数据、不持久保存用户输入。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
const toast=document.getElementById('kit-toast');let toastTimer;
function notify(message){clearTimeout(toastTimer);toast.textContent=message;toast.hidden=false;toastTimer=setTimeout(()=>toast.hidden=true,3500);}
document.querySelectorAll('[data-link]').forEach(b=>b.addEventListener('click',()=>location.href=b.dataset.link));
document.querySelectorAll('[data-toast]').forEach(b=>b.addEventListener('click',()=>notify(b.dataset.toast)));
document.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(b.dataset.copy);notify('组件用法已复制');}catch{const details=b.closest('section').querySelector('details');if(details)details.open=true;notify('浏览器未允许复制，请从展开的代码中选择复制。');}}));
document.querySelector('.cb-segmented').addEventListener('cb:change',event=>{
 document.querySelector('[data-segment-label]').textContent=`当前范围：${event.detail.button.textContent}`;
});
// ---- 浏览器负责浮层关闭、Escape 和层级；只补定位及业务选择后的关闭 ----
const trigger=document.getElementById('menu-trigger'),popover=document.getElementById('demo-popover');
popover.addEventListener('toggle',event=>{
 const open=event.newState==='open';trigger.setAttribute('aria-expanded',String(open));
 if(open){const r=trigger.getBoundingClientRect();popover.style.left=`${Math.max(12,Math.min(r.left,innerWidth-popover.offsetWidth-12))}px`;popover.style.top=`${Math.min(r.bottom+8,innerHeight-popover.offsetHeight-12)}px`;}
});
popover.addEventListener('click',event=>{if(event.target.closest('button:not(:disabled)'))popover.hidePopover();});
const dialog=document.getElementById('demo-dialog');let dialogOpener;
document.querySelectorAll('[data-open-dialog]').forEach(b=>b.addEventListener('click',()=>{dialogOpener=b;dialog.showModal();}));
dialog.querySelector('[data-close-dialog]').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{if(dialogOpener?.offsetParent!==null)dialogOpener?.focus();else trigger.focus();});
document.getElementById('confirm-remove').addEventListener('click',()=>{document.getElementById('form-result').hidden=true;dialog.close();notify('示例已移除，真实会话未改变');});
document.getElementById('empty-create').addEventListener('click',event=>{const panel=event.target.closest('.kit-empty');panel.querySelector('h3').textContent='示例会话已创建';panel.querySelector('p').textContent='现在可以继续配置，或查看组件组合。';event.target.textContent='查看组合';event.target.onclick=()=>document.getElementById('composition').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
const form=document.getElementById('demo-form');
form.addEventListener('submit',event=>{event.preventDefault();const input=document.getElementById('demo-name'),error=document.getElementById('form-error'),name=input.value.trim();if(!name){input.setAttribute('aria-invalid','true');input.setAttribute('aria-describedby','form-error');error.textContent='请输入会话名称。';input.focus();return;}input.removeAttribute('aria-invalid');input.setAttribute('aria-describedby','demo-name-help');error.textContent='';const result=document.getElementById('form-result');result.textContent=`${name} · ${document.getElementById('demo-browser').value} · 已创建页面内示例`;result.hidden=false;if(document.getElementById('demo-notify').checked)notify('示例已创建；没有启动真实浏览器。');});
const load=document.getElementById('load-optics');
load.addEventListener('click',async()=>{load.disabled=true;load.textContent='正在准备光环境…';try{const {mountOptics}=await import('./assets/optics.bundle.js');mountOptics(document.getElementById('optics-stage'));load.hidden=true;document.getElementById('optics-status').textContent='实时渲染已开启。调整滑杆观察变化。';}catch{load.disabled=false;load.textContent='重试实时预览';document.getElementById('optics-status').textContent='当前环境无法启用 WebGL，已保留静态材质图。';}});

// ---- 提示可由 Escape 收起，下一次进入再显示 ----
document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('.cb-tooltip:hover, .cb-tooltip:focus-within').forEach(tooltip=>tooltip.dataset.dismissed='true');});
document.querySelectorAll('.cb-tooltip').forEach(tooltip=>{for(const event of ['blur','mouseleave'])tooltip.addEventListener(event,()=>delete tooltip.dataset.dismissed);});
