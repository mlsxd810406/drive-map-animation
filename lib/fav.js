// ===== 电脑：收藏路线（含节点、照片、车型、底图、视角），IndexedDB 持久化；手机端不显示 =====
(()=>{const B=document.body;if(typeof map==='undefined'||typeof nodes==='undefined')return;
 const pc=()=>!B.classList.contains('mob')&&!matchMedia('(hover:none)').matches;
 const ZO=window.ZOFF||0,esc=t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const st=document.createElement('style');st.textContent=`body.mob #bfav,body.mob #favpan,body.mob #bcam{}body:not(.mob) #bcam{display:none!important}body.mob #bfav,body.mob #favpan{display:none!important}
body:not(.mob) #ctl .pa-act{grid-template-columns:minmax(0,1fr) auto auto!important}#bfav{flex:none!important;aspect-ratio:1;padding:0!important;display:inline-flex;align-items:center;justify-content:center}#bfav svg{margin:0!important;transition:fill .2s,stroke .2s,transform .25s cubic-bezier(.2,.9,.3,1.4)}#bfav.on svg{fill:#f5b301;stroke:#d99a00;transform:scale(1.08)}
#favpan .curh{margin:8px 8px 2px;padding:8px 10px;border-radius:11px;background:rgba(245,179,1,.12);display:flex;align-items:center;gap:8px}#favpan .curh b{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#favpan .curh a{color:#c62828;cursor:pointer;font-size:12px;white-space:nowrap}#favpan .hd2{padding:8px 14px 4px;color:#8a847a;font-size:12px}
#favpan{position:fixed;z-index:1600;display:none;width:300px;max-height:min(460px,calc(100vh - 80px));overflow:hidden;flex-direction:column;border-radius:16px;background:rgba(252,250,246,.97);box-shadow:0 14px 40px rgba(0,0,0,.24),0 0 0 .5px rgba(0,0,0,.08);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);font:13px/1.35 var(--font,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif);color:#2b2620;transform-origin:top left;animation:favin .18s cubic-bezier(.2,.9,.3,1.1)}
#favpan.on{display:flex}@keyframes favin{from{opacity:0;transform:scale(.96) translateY(-4px)}to{opacity:1;transform:none}}
#favpan .add{display:flex;align-items:center;gap:8px;margin:8px;padding:0 12px;height:38px;border:0;border-radius:11px;background:#5f7f64;color:#fff;font:600 13.5px/1 inherit;cursor:pointer}#favpan .add:hover{background:#557359}#favpan .add[disabled]{opacity:.45;cursor:default}
#favpan .add svg{width:16px;height:16px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#favpan .ls{overflow:auto;padding:0 6px 6px;scrollbar-width:thin}#favpan .em{padding:14px 12px 16px;color:#8a847a;text-align:center;font-size:12.5px}
#favpan .it{display:flex;align-items:center;gap:10px;padding:6px;border-radius:11px;cursor:pointer;position:relative}#favpan .it:hover{background:rgba(95,127,100,.1)}#favpan .it.cur{background:rgba(95,127,100,.16)}
#favpan canvas{width:52px;height:38px;flex:none;border-radius:8px;background:#e9e5dc}
#favpan .tx{flex:1;min-width:0}#favpan .nm{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#favpan .mt{color:#8a847a;font-size:11.5px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#favpan .nm input{width:100%;box-sizing:border-box;font:600 13px/1.3 inherit;border:1px solid #5f7f64;border-radius:6px;padding:1px 5px;outline:none;background:#fff}
#favpan .ac{display:none;gap:2px}#favpan .it:hover .ac{display:flex}#favpan .ac a{width:24px;height:24px;display:grid;place-items:center;border-radius:7px;color:#7a7268}#favpan .ac a:hover{background:rgba(0,0,0,.07);color:#2b2620}#favpan .ac a.d:hover{color:#c62828}
#favpan .ac svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}`;document.head.appendChild(st);
 // ---------- 存储 ----------
 let __d=null;const db=()=>__d||(__d=new Promise((res,rej)=>{const r=indexedDB.open('drivego_fav',1);r.onupgradeneeded=()=>r.result.createObjectStore('fav',{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>{__d=null;rej(r.error);};}));
 const tx=(mode,fn)=>db().then(d=>new Promise((res,rej)=>{const t=d.transaction('fav',mode);const o=fn(t.objectStore('fav'));t.oncomplete=()=>res(o&&o.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error||Error('abort'));}));
 const all=()=>tx('readonly',s=>s.getAll()).then(a=>(a||[]).sort((x,y)=>y.t-x.t)).catch(()=>[]);
 const put=f=>tx('readwrite',s=>s.put(f));const del=id=>tx('readwrite',s=>s.delete(id));
 let favs=[],curId=null;
 // ---------- 快照 ----------
 const clean=a=>JSON.parse(JSON.stringify(a.map(({along,off,...n})=>n)));
 const snap=()=>{const c=map.getCenter();return {from:$('from').value,to:$('to').value,via:$('via').value,pick:{...ADDR.PICK},coords,duration,segs,svc:lastSvc,fb:lastFb,elev,nodes:clean(nodes),veh:VEH_I,bm:window.BM&&BM.cur||window.__basemap||null,
  speed:$('speed').value,follow:$('follow').checked,sl:['dist','pit','exag'].filter(id=>$(id)).map(id=>[id,$(id).value]),view:{lat:c.lat,lng:c.lng,z:map.getZoom()+ZO}};};
 const sig=s=>JSON.stringify([s.from,s.to,s.via,(s.coords||[]).length,s.coords&&s.coords[0],(s.nodes||[]).map(n=>[n.id,n.title,n.note,n.lat,n.lon,(n.photos||[]).length])]);
 const apply=s=>{pause();clearRouteStops();resetAnim();
  nodes.length=0;nodes.push(...JSON.parse(JSON.stringify(s.nodes||[])));
  if(s.coords&&s.coords.length)restoreRoute({...s,svc:s.svc||[],speed:s.speed||$('speed').value});
  else{$('from').value=s.from||'';$('to').value=s.to||'';$('via').value=s.via||'';rebuildStops();}
  try{if(typeof renderVia==='function')renderVia();if(typeof renderChips==='function')renderChips();}catch(_){}
  rebuildStops();saveNodes();renderList();if(s.veh!=null&&typeof setVeh==='function')setVeh(s.veh);
  if(s.bm&&window.BM&&BM.cur!==s.bm)try{BM.set(s.bm,true);}catch(_){}
  if(s.view)map.setView([s.view.lat,s.view.lng],s.view.z-ZO);if(typeof updateUI==='function')try{updateUI(1e12);}catch(_){}};
 // ---------- 缩略图（路线简图） ----------
 const sketch=(cv,f)=>{const W=104,H=76;cv.width=W;cv.height=H;const g=cv.getContext('2d');const P=(f.coords||[]).filter((_,i,a)=>i%Math.max(1,Math.floor(a.length/300))===0);const N=f.nodes||[];const all=P.concat(N.map(n=>[n.lat,n.lon]));if(!all.length)return;
  let a=1e9,b=-1e9,c=1e9,d=-1e9;all.forEach(p=>{a=Math.min(a,p[0]);b=Math.max(b,p[0]);c=Math.min(c,p[1]);d=Math.max(d,p[1]);});const k=Math.cos((a+b)/2*Math.PI/180),sx=(d-c)*k||1e-3,sy=(b-a)||1e-3,s=Math.min((W-16)/sx,(H-16)/sy);
  const X=p=>W/2+((p[1]-(c+d)/2)*k)*s,Y=p=>H/2-(p[0]-(a+b)/2)*s;
  if(P.length){g.lineWidth=3.2;g.lineJoin=g.lineCap='round';g.strokeStyle='#5f7f64';g.beginPath();P.forEach((p,i)=>i?g.lineTo(X(p),Y(p)):g.moveTo(X(p),Y(p)));g.stroke();
   [[P[0],'#43a047'],[P[P.length-1],'#c62828']].forEach(([p,col])=>{g.beginPath();g.arc(X(p),Y(p),4,0,7);g.fillStyle=col;g.fill();g.lineWidth=1.5;g.strokeStyle='#fff';g.stroke();});}
  N.forEach(n=>{g.beginPath();g.arc(X([n.lat,n.lon]),Y([n.lat,n.lon]),2.6,0,7);g.fillStyle='#e91e63';g.fill();});};
 const fmtD=t=>{const d=new Date(t),n=new Date();const p=x=>String(x).padStart(2,'0');return d.toDateString()===n.toDateString()?'今天 '+p(d.getHours())+':'+p(d.getMinutes()):(d.getFullYear()===n.getFullYear()?'':d.getFullYear()+'/')+(d.getMonth()+1)+'/'+d.getDate();};
 // ---------- UI ----------
 const ret=document.getElementById('ret');if(!ret)return;
 const STAR='<svg class="i" viewBox="0 0 24 24"><path d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.8L12 16.9l-5.2 2.75 1-5.8-4.2-4.1 5.8-.85z" stroke-linejoin="round"/></svg>';
 const btn=document.createElement('button');btn.id='bfav';btn.className='bt ol';btn.title='收藏';btn.setAttribute('aria-label','收藏');btn.innerHTML=STAR;ret.after(btn);
 const pan=document.createElement('div');pan.id='favpan';B.appendChild(pan);
 const IC={ren:'<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',del:'<svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/></svg>'};
 const defName=()=>{const f=$('from').value.trim(),t=$('to').value.trim();return f&&t?f+'→'+t:(f||t||'我的路线');};
 const hasRoute=()=>coords.length||nodes.length;
 const curFav=()=>{if(!hasRoute())return null;const g=sig(snap());return favs.find(x=>sig(x)===g)||null;};
 const sync=()=>{if(ret.offsetHeight)btn.style.width=ret.offsetHeight+'px';const f=curFav();curId=f?f.id:null;btn.classList.toggle('on',!!f);btn.title=f?'已收藏 · 点击管理收藏':'收藏';};
 const render=()=>{const cf=curFav();pan.innerHTML=(cf?'<div class="curh">'+STAR.replace('class="i"','width="16" height="16" style="fill:#f5b301;stroke:#d99a00"')+'<b>当前：'+esc(cf.name)+'</b><a id="fav_un">取消收藏</a></div>':hasRoute()?'<button class="add" id="fav_add"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>收藏当前路线</button>':'')+'<div class="hd2">我的收藏</div><div class="ls">'+
  (favs.length?favs.map(f=>'<div class="it'+(f.id===curId?' cur':'')+'" data-id="'+f.id+'"><canvas></canvas><div class="tx"><div class="nm">'+esc(f.name)+'</div><div class="mt">'+(f.km?f.km.toFixed(0)+' km · ':'')+(f.nodes||[]).length+' 个节点 · '+fmtD(f.t)+'</div></div><div class="ac"><a data-a="ren" title="重命名">'+IC.ren+'</a><a class="d" data-a="del" title="删除">'+IC.del+'</a></div></div>').join(''):'<div class="em">还没有收藏<br>规划好路线、加好节点后点上面按钮收藏</div>')+'</div>';
  const fa=pan.querySelector('#fav_add');if(fa)fa.onclick=()=>saveCur(1);const fu=pan.querySelector('#fav_un');if(fu)fu.onclick=()=>remove(cf);
  pan.querySelectorAll('.it').forEach(r=>{const f=favs.find(x=>x.id===r.dataset.id);sketch(r.querySelector('canvas'),f);
   r.onclick=e=>{const a=e.target.closest('[data-a]');if(a){e.stopPropagation();a.dataset.a==='del'?remove(f):rename(r,f);return;}if(r.querySelector('input'))return;open(f);};});
  sync();};
 const place=()=>{const r=btn.getBoundingClientRect();pan.style.left=Math.max(8,Math.min(innerWidth-308,r.left))+'px';pan.style.top=Math.min(r.bottom+8,innerHeight-pan.offsetHeight-8)+'px';};
 const close=()=>pan.classList.remove('on');
 btn.onclick=async e=>{e.stopPropagation();if(pan.classList.contains('on'))return close();favs=await all();if(hasRoute()&&!curFav()){await saveCur(0);return;}render();pan.classList.add('on');place();};
 all().then(a=>{favs=a;sync();});setInterval(()=>{if(pc())sync();},700);
 document.addEventListener('pointerdown',e=>{if(pan.classList.contains('on')&&!pan.contains(e.target)&&!btn.contains(e.target)&&!(e.target.closest&&e.target.closest('#ntoast')))close();},true);
 addEventListener('keydown',e=>{if(e.key==='Escape'&&pan.classList.contains('on')&&!pan.querySelector('input'))close();});
 const qerr=e=>{const q=e&&(e.name==='QuotaExceededError'||/quota/i.test(e.message||''));ntoast(q?'存储空间不足，收藏失败：可删除旧收藏或减少照片后再试':'收藏失败：'+((e&&e.message)||e),{color:'#c62828',ms:5000});};
 async function saveCur(inPan){if(!hasRoute())return;const s=snap();const f={id:Math.random().toString(36).slice(2,10),name:defName(),t:Date.now(),km:total||0,...s};
  try{await put(f);}catch(e){qerr(e);window.__favErr=e&&e.name||'err';return;}favs=await all();if(inPan)render();else sync();
  ntoast('已收藏',{color:'#f5b301',undo:async()=>{await del(f.id);favs=await all();if(pan.classList.contains('on'))render();else sync();ntoast('已取消收藏',{});}});}
 function rename(r,f,sel){const nm=r.querySelector('.nm');nm.innerHTML='<input maxlength="40" value="'+esc(f.name)+'">';const i=nm.querySelector('input');i.focus();i.select();let done=0;
  const fin=async ok=>{if(done)return;done=1;const v=i.value.trim();if(ok&&v&&v!==f.name){f.name=v;try{await put(f);}catch(e){qerr(e);}}favs=await all();render();};
  i.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter')fin(1);else if(e.key==='Escape')fin(0);};i.onblur=()=>fin(1);i.onclick=e=>e.stopPropagation();}
 async function remove(f){await del(f.id);favs=await all();render();
  ntoast('已删除收藏“'+esc(f.name)+'”',{undo:async()=>{try{await put(f);}catch(e){qerr(e);}favs=await all();if(pan.classList.contains('on'))render();else sync();}});}
 function open(f){const cur=snap(),dirty=hasRoute()&&!curFav();
  apply(f);close();sync();window.__favLoaded=f.id;
  ntoast('已进入“'+esc(f.name)+'”',dirty?{color:'#43a047',ms:6000,undo:()=>{apply(cur);curId=null;sync();ntoast('已恢复之前的路线',{});}}:{color:'#43a047'});}
 window.FAV={all,save:saveCur,open:id=>all().then(a=>{favs=a;const f=a.find(x=>x.id===id);if(f)open(f);}),get favs(){return favs;},snap,sig};
})();
