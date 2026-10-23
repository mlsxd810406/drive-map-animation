// 底图管理：Google 影像优先，失败自动回退 Esri World Imagery（WGS84，无需 GCJ 纠偏）+ 注记
window.BM=(()=>{
 const E='https://server.arcgisonline.com/ArcGIS/rest/services/';
 const U={google:'https://mt{s}.google.com/vt/lyrs=s&hl=zh-CN&x={x}&y={y}&z={z}',googleY:'https://mt{s}.google.com/vt/lyrs=y&hl=zh-CN&x={x}&y={y}&z={z}',
  esri:E+'World_Imagery/MapServer/tile/{z}/{y}/{x}',eb:E+'Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',et:E+'Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
  tdt:k=>'https://t{s}.tianditu.gov.cn/cia_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk='+k};
 const NAMES={google:'Google',esri:'Esri',tdt:'Esri+天地图'};
 const key=()=>window.TDT_KEY?TDT_KEY():(localStorage.getItem('tdtKey')||'').trim();
 let cur=null,applyFn=()=>{};
 function toast(t){let d=document.getElementById('toast');if(!d){d=document.createElement('div');d.id='toast';document.body.appendChild(d);}d.textContent=t;d.className='on';clearTimeout(d._t);d._t=setTimeout(()=>d.className='',4200);}
 function probe(ms=3000,url){return new Promise(r=>{const i=new Image();let done=0;const f=v=>{if(done)return;done=1;clearTimeout(t);r(v);};const t=setTimeout(()=>{i.src='';f(false);},ms);i.onload=()=>f(i.naturalWidth>0);i.onerror=()=>f(false);i.src=url||(U.google.replace('{s}','1').replace('{x}','26').replace('{y}','12').replace('{z}','5')+'&_t='+Date.now());});}
 function sync(){document.querySelectorAll('#bmsel [data-bm]').forEach(b=>{b.classList.toggle('on',b.dataset.bm===cur);b.classList.toggle('dis',b.dataset.bm==='tdt'&&!key());b.title=b.dataset.bm==='tdt'&&!key()?'需在“地址搜索设置”中填写天地图 key':'';});}
 function set(m,save){if(m==='tdt'&&!key()){toast('天地图注记需要 key：点击“添加途经点”行右侧齿轮填写');return;}cur=m;if(save)localStorage.setItem('basemap',m);applyFn(m);sync();window.__basemap=m;}
 async function init(fn){applyFn=fn;const MOBQ=matchMedia('(max-width:640px),(max-height:500px)').matches;let m=MOBQ?'tdt':(localStorage.getItem('basemap')||'google');if(m==='tdt'&&!key())m='esri';
  document.querySelectorAll('#bmsel [data-bm]').forEach(b=>b.onclick=()=>set(b.dataset.bm,true));
  const tdtOk=()=>key()?probe(4000,U.tdt(key()).replace('{s}','0').replace('{z}','5').replace('{y}','12').replace('{x}','26')):Promise.resolve(false);
  set(m);if(m==='google'&&!(await probe())){const t=await tdtOk();set(t?'tdt':'esri');window.__bmFallback=true;}
  else if(m==='tdt'&&!(await tdtOk())){set('esri');if(!MOBQ)toast('天地图注记暂不可用，已改用 Esri 注记');}
  addEventListener('storage',sync);document.getElementById('tdtk')?.addEventListener('change',sync);return cur;}
 return {U,NAMES,init,set,toast,key,get cur(){return cur;}};
})();
