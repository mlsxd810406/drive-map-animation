// 手机抽屉“全部展开”样式方案预览：仅在 URL 带 ?mlay=A|B|C 时加载，不影响正式版
(()=>{let V=(new URLSearchParams(location.search).get('mlay')||'').toUpperCase();if(!/^[ABC]$/.test(V)){if(matchMedia('(max-width:640px),(max-height:500px)').matches)V='A';else return;}
const $=id=>document.getElementById(id),B=document.body;B.classList.add('ml','ml'+V);
const secBy=t=>[...document.querySelectorAll('#ctl .pa-sec')].find(s=>(s.querySelector('.pa-sh')||{}).textContent===t);
const sPlay=secBy('播放'),sVeh=secBy('车型'),sBm=secBy('底图'),sCam=secBy('镜头'),ft=document.querySelector('#ctl .pa-ft');
[sPlay,sVeh,sBm,sCam].forEach((s,i)=>s&&s.classList.add(['s-play','s-veh','s-bm','s-cam'][i]));
const css=`
/* —— 通用：图标与 17px 半粗体文字匹配 —— */
body.mob.ml #ctl .ib svg,body.mob.ml #ctl .rt-x svg,body.mob.ml #ctl .bt svg,body.mob.ml #ctl .btn svg{width:22px!important;height:22px!important;stroke-width:2!important;stroke:currentColor}
body.mob.ml #ctl .ib{color:#4a443c!important;opacity:1!important;width:44px;height:44px}
body.mob.ml #ctl .rt-x a{color:#4a443c!important;font-size:15px!important;font-weight:500!important;gap:6px}
body.mob.ml #ctl .rt-x svg{width:20px!important;height:20px!important}
body.mob.ml #ctl .seg button svg{width:20px!important;height:20px!important}
body.mob.ml #ctl .pa-sh{display:none!important}
body.mob.ml #ctl{background:#f2efe9!important}
body.mob.ml #ctl .rt{background:#fff;border-radius:14px;padding:0 4px 0 10px}
body.mob.ml #ctl .pa-act{margin:8px 0 10px!important}
body.mob.ml #ctl .pa-act .bt{min-height:46px!important}
/* —— A：分组列表 —— */
body.mob.mlA #ctl .grp{background:#fff;border-radius:14px;overflow:hidden;margin:0 0 10px}
body.mob.mlA #ctl .grp>.pa-sec,body.mob.mlA #ctl .grp>.row2{margin:0!important;padding:0 12px;min-height:50px;display:flex;align-items:center;justify-content:space-between;gap:10px;border-top:.5px solid rgba(60,50,40,.12)}
body.mob.mlA #ctl .grp>:first-child{border-top:0}
body.mob.mlA .s-play .pl{display:flex!important;width:100%;align-items:center;gap:10px}
body.mob.mlA .s-play .pl .seg{width:132px!important;flex:none;margin:0!important}
body.mob.mlA .s-play .pl .seg button{height:36px!important}
body.mob.mlA .s-play #chips{flex:1;min-width:0}body.mob.mlA .s-play #chips span{min-width:44px}body.mob.mobL.mlA .s-play .pl .seg{width:120px!important}body.mob.mobL.mlA .s-play .pl{gap:6px}body.mob.mlA .s-play #chips span{min-height:36px!important;display:flex;align-items:center;justify-content:center;font-size:15px!important;font-weight:600}
body.mob.mlA .rlab{font-size:17px;font-weight:500;color:#2b2722;flex:none}
body.mob.mlA .s-veh #vehsel{border:0!important;background:transparent!important;text-align:right;text-align-last:right;font-size:16px!important;color:#6f6a62!important;width:auto!important;max-width:220px;padding:0 4px!important}
body.mob.mlA .s-bm #bmsel{flex:none;width:auto!important;background:rgba(60,50,40,.06);border-radius:10px;padding:2px}
body.mob.mlA .s-bm #bmsel span{min-height:34px!important;padding:0 10px!important;display:flex;align-items:center;font-size:14px!important;flex:none}
body.mob.mlA .s-cam{flex-direction:column;align-items:stretch!important;justify-content:center!important}
body.mob.mlA .s-cam label.sw{min-height:50px!important}body.mob.mlA #ctl .s-cam label.sw span{font-size:17px!important;font-weight:500;color:#2b2722}
body.mob.mlA .s-cam #d3ctl .sl{min-height:44px}
body.mob.mlA #ctl .pa-ft{background:#fff;border-radius:14px;overflow:hidden;display:block!important;margin:0}
body.mob.mlA #ctl .pa-ft .bt{width:100%;border:0!important;border-radius:0!important;min-height:50px!important;justify-content:flex-start!important;font-size:17px!important;font-weight:500!important;color:#2b2722!important;background:#fff!important;padding:0 12px!important;gap:10px}
body.mob.mlA #ctl .pa-ft .bt+.bt{border-top:.5px solid rgba(60,50,40,.12)!important}
body.mob.mlA #ctl .pa-ft .bt::after{content:'›';margin-left:auto;font-size:22px;color:#b8b0a3}
/* —— B：图标工具条 —— */
body.mob.mlB .tb{display:flex;align-items:center;gap:8px;margin:0 0 10px;flex-wrap:nowrap}
body.mob.mlB .tb .pl{display:flex!important;align-items:center;gap:8px;flex:1;min-width:0}
body.mob.mlB .tb .seg{width:120px!important;flex:none;margin:0!important}body.mob.mlB .tb .seg button{height:40px!important}
body.mob.mlB .tb #chips{flex:1;background:rgba(60,50,40,.06);border-radius:10px;padding:2px}body.mob.mlB .tb #chips span{min-height:36px!important;display:flex;align-items:center;justify-content:center;font-size:14px!important;font-weight:600}
body.mob.mlB .tb label.sw{width:44px;height:44px!important;min-height:44px!important;flex:none;border-radius:12px;background:rgba(60,50,40,.06);justify-content:center!important;position:relative;margin:0!important}
body.mob.mlB .tb label.sw span{display:none}body.mob.mlB .tb label.sw input{position:absolute;opacity:0;inset:0;width:100%!important;height:100%!important;margin:0}
body.mob.mlB .tb label.sw::before{content:'';width:22px;height:22px;background:#6f6a62;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='8'/%3E%3Ccircle cx='12' cy='12' r='2.5' fill='black'/%3E%3Cpath d='M12 1v3M12 20v3M1 12h3M20 12h3'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='8'/%3E%3Ccircle cx='12' cy='12' r='2.5' fill='black'/%3E%3Cpath d='M12 1v3M12 20v3M1 12h3M20 12h3'/%3E%3C/svg%3E") center/contain no-repeat}
body.mob.mlB .tb label.sw:has(input:checked){background:var(--sagebg,#e3ebe1)}body.mob.mlB .tb label.sw:has(input:checked)::before{background:var(--sage,#5f7f64)}
body.mob.mlB .tb2{display:flex;gap:8px;margin:0 0 10px}
body.mob.mlB .tb2 #vehsel{flex:1;min-width:0;min-height:44px!important;font-size:15px!important;border-radius:12px!important;border:0!important;background:#fff!important}
body.mob.mlB .tb2 #bmsel{flex:none;background:#fff;border-radius:12px;padding:3px}body.mob.mlB .tb2 #bmsel span{min-height:38px!important;padding:0 9px!important;display:flex;align-items:center;font-size:14px!important;flex:none}
body.mob.mlB .s-cam,body.mob.mlB .s-veh,body.mob.mlB .s-bm{margin:0!important}
body.mob.mlB .s-cam #d3ctl{background:#fff;border-radius:12px;padding:2px 12px;margin:0 0 10px}
body.mob.mlB #ctl .pa-ft{display:grid!important;grid-template-columns:1fr 1fr;gap:8px}
body.mob.mlB #ctl .pa-ft .bt{flex-direction:column!important;min-height:64px!important;gap:4px!important;font-size:14px!important;font-weight:600!important;border:0!important;background:#fff!important;border-radius:14px!important;color:#2b2722!important}
/* —— C：分页标签 —— */
body.mob.mlC .tabs{display:grid;grid-template-columns:repeat(4,1fr);background:rgba(60,50,40,.08);border-radius:10px;padding:2px;margin:2px 0 12px;position:sticky;top:0;z-index:3}
body.mob.mlC .tabs button{border:0;background:transparent;min-height:36px;border-radius:8px;font:600 15px var(--font);color:#5d574e}
body.mob.mlC .tabs button.on{background:#fff;color:#2b2722;box-shadow:0 1px 3px rgba(40,30,20,.14)}
body.mob.mlC #ctl [data-tab]{display:none!important}
body.mob.mlC.tab-route #ctl [data-tab=route],body.mob.mlC.tab-play #ctl [data-tab=play],body.mob.mlC.tab-show #ctl [data-tab=show],body.mob.mlC.tab-more #ctl [data-tab=more]{display:block!important}
body.mob.mlC.tab-route #ctl .pa-act[data-tab]{display:flex!important}body.mob.mlC.tab-more #ctl .pa-ft[data-tab]{display:grid!important;grid-template-columns:1fr 1fr;gap:8px}
body.mob.mlC .card{background:#fff;border-radius:14px;padding:4px 12px;margin:0 0 10px}
body.mob.mlC .crow{display:flex;align-items:center;justify-content:space-between;min-height:50px;gap:10px}
body.mob.mlC .crow+.crow{border-top:.5px solid rgba(60,50,40,.12)}
body.mob.mlC .crow .rlab{font-size:17px;font-weight:500;color:#2b2722}
body.mob.mlC .s-play .pl{display:flex!important;flex-direction:column;gap:10px}body.mob.mlC .s-play .seg button{height:48px!important}body.mob.mlC .s-play #chips span{min-height:44px!important;display:flex;align-items:center;justify-content:center;font-size:16px!important;font-weight:600}
body.mob.mlC .s-veh #vehsel{border:0!important;background:transparent!important;text-align-last:right;font-size:16px!important;color:#6f6a62!important;width:auto!important}
body.mob.mlC .s-bm #bmsel span{min-height:34px!important;display:flex;align-items:center;font-size:14px!important;padding:0 9px!important;flex:none}body.mob.mlC .s-bm #bmsel{width:auto!important;flex:none}
body.mob.mlC #ctl .s-cam label.sw span{font-size:17px!important;font-weight:500}

body.mob.mlA .s-veh #vehsel{text-align:left!important;text-align-last:left!important;color:#2b2722!important;font-weight:500;font-size:17px!important;max-width:none!important;width:100%!important;padding:0!important}
body.mob.mlA .s-bm #bmsel{width:100%!important}body.mob.mlA .s-bm #bmsel span{flex:1!important;justify-content:center}
body.mob.mlC .s-veh #vehsel{text-align-last:left!important;color:#2b2722!important;font-weight:500;font-size:17px!important;width:100%!important}
body.mob.mlC .s-bm #bmsel{width:100%!important}body.mob.mlC .s-bm #bmsel span{flex:1!important;justify-content:center}
body.mob.mlB .tb2 #vehsel{flex:none!important;width:128px!important}body.mob.mlB .tb2 #bmsel{flex:1}body.mob.mlB .tb2 #bmsel span{flex:1!important;justify-content:center;padding:0 4px!important}

body.mob.mlA .s-bm,body.mob.mlA .s-cam{display:none!important}
`;const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
const rlab=t=>{const s=document.createElement('span');s.className='rlab';s.textContent=t;return s;};
const go=()=>{
if(V==='A'){const g=document.createElement('div');g.className='grp';sPlay.parentNode.insertBefore(g,sPlay);[sPlay,sVeh,sBm,sCam].forEach(s=>g.appendChild(s));}
if(V==='B'){const SN=['🚘 轿车','🚐 商务车','🚙 SUV','🚌 中巴','🚛 重卡','🏍 摩托车'];[...$('vehsel').options].forEach((o,i)=>o.textContent=SN[i]||o.textContent);const tb=document.createElement('div');tb.className='tb';sPlay.parentNode.insertBefore(tb,sPlay);tb.appendChild(sPlay.querySelector('.pl'));tb.appendChild(sCam.querySelector('label.sw'));const tb2=document.createElement('div');tb2.className='tb2';tb.after(tb2);tb2.appendChild($('vehsel'));tb2.appendChild($('bmsel'));sPlay.style.display='none';sVeh.style.display='none';sBm.style.display='none';}
if(V==='C'){const tabs=document.createElement('div');tabs.className='tabs';tabs.innerHTML='<button data-t="route">路线</button><button data-t="play">播放</button><button data-t="show">显示</button><button data-t="more">更多</button>';
 const hd=document.querySelector('#ctl .pa-hd');hd.after(tabs);
 const set=t=>{['route','play','show','more'].forEach(x=>B.classList.toggle('tab-'+x,x===t));tabs.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));};
 tabs.onclick=e=>{const b=e.target.closest('button');if(b)set(b.dataset.t);};
 const rt=document.querySelector('#ctl .rt')||$('from').closest('.rt-row').parentNode;[rt,document.querySelector('#ctl .rt-x'),document.querySelector('#ctl .pa-act')].forEach(e=>e&&(e.dataset.tab='route'));
 const c1=document.createElement('div');c1.className='card';c1.dataset.tab='play';sPlay.before(c1);c1.appendChild(sPlay);
 const c2=document.createElement('div');c2.className='card';c2.dataset.tab='show';sVeh.before(c2);[sVeh,sBm,sCam].forEach(s=>{s.classList.add('crow');c2.appendChild(s);});sCam.style.display='block';
 ft.dataset.tab='more';['fnodes','fexp'].forEach(id=>$(id).dataset.tab='more');window.__mlTab=set;set('route');}
};
if(document.readyState==='loading')addEventListener('DOMContentLoaded',go);else go();
})();
