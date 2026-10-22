// 地址搜索/自动补全、地图选点、拖拽起终点、我的位置。依赖页面提供 window.MAPAPI 与 plan()/msg()
(function(){
const $=id=>document.getElementById(id);
const PICK={};// 名称 -> [lat,lon]（选中的精确坐标，规划时不再重新地理编码）
const hav=(a,b)=>{const r=Math.PI/180,x=Math.sin((b[0]-a[0])*r/2)**2+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin((b[1]-a[1])*r/2)**2;return 12742*Math.asin(Math.sqrt(x));};
async function J(u,ms=12000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(u,{signal:c.signal});if(!r.ok)throw Error(r.status);return await r.json();}finally{clearTimeout(t);}}
function variants(q){q=q.trim();const strip=s=>s.replace(/^(北京|天津|上海|重庆)市?(?=.{2,}[区县])/,'').replace(/^[^省]{2,7}省(?=.{2,})/,'');const ren=s=>/人民政府$/.test(s)?s:s.replace(/政府$/,'人民政府');
 return [...new Set([q,strip(q),ren(q),ren(strip(q))])];}
const nomi=q=>J('https://nominatim.openstreetmap.org/search?format=json&limit=6&addressdetails=1&accept-language=zh&countrycodes=cn&q='+encodeURIComponent(q)).then(d=>d.map((x,i)=>({lat:+x.lat,lon:+x.lon,name:x.name||x.display_name.split(',')[0],addr:x.display_name.split(',').slice(1,4).join(' ').trim(),src:'OSM',rank:i,type:x.type}))).catch(()=>[]);
const phot=q=>J('https://photon.komoot.io/api/?limit=6&q='+encodeURIComponent(q)).then(d=>d.features.filter(f=>(f.properties.countrycode||'CN')==='CN').map((f,i)=>{const p=f.properties;return {lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0],name:p.name||'',addr:[p.state,p.city,p.district||p.county,p.street].filter(Boolean).join(' '),src:'Photon',rank:i,type:p.osm_value};})).catch(()=>[]);
function tdt(q){const k=localStorage.getItem('tdtKey');if(!k)return Promise.resolve([]);
 return J('https://api.tianditu.gov.cn/v2/search?type=query&tk='+k+'&postStr='+encodeURIComponent(JSON.stringify({keyWord:q,level:12,mapBound:'73,3,136,54',queryType:1,start:0,count:6}))).then(d=>(d.pois||[]).map((p,i)=>{const [lo,la]=p.lonlat.split(/[ ,]/).map(Number);return {lat:la,lon:lo,name:p.name,addr:p.address||'',src:'天地图',rank:i-1};})).catch(()=>[]);}
async function search(q){const v=variants(q),core=v[v.length-1];
 const res=(await Promise.all([tdt(q),...v.map(phot),nomi(q),...(core!==q?[nomi(core)]:[])])).flat();
 const gov=/政府/.test(q);const sc=r=>{let s=-r.rank*0.6;if(r.name===core||r.name===q)s+=6;else if(r.name&&(core.includes(r.name)||r.name.includes(core)))s+=4;
  if(gov&&/人民政府$|区政府$|市政府$|县政府$/.test(r.name))s+=3;if(gov&&!/政府/.test(r.name))s-=3;if(r.src==='天地图')s+=2;
  const toks=core.replace(/人民政府|政府/,'').match(/.{2}/g)||[];for(const t of toks)if((r.name+r.addr).includes(t))s+=0.5;return s;};
 res.forEach(r=>r.s=sc(r));res.sort((a,b)=>b.s-a.s);const out=[];for(const r of res){if(!out.some(o=>hav([o.lat,o.lon],[r.lat,r.lon])<0.25&&o.name===r.name))out.push(r);}return out.slice(0,6);}
async function reverse(lat,lon){try{const d=await J('https://nominatim.openstreetmap.org/reverse?format=json&zoom=17&accept-language=zh&lat='+lat+'&lon='+lon);const a=d.address||{};
 const city=a.city||a.county||a.state||'',dist=a.district||a.county||a.suburb||'',poi=d.name||a.road||a.village||a.town||'';const s=[city,dist!==city?dist:'',poi].filter(Boolean).join('');if(s)return s;}catch(e){}return lat.toFixed(5)+','+lon.toFixed(5);}
function lookup(q){q=(q||'').trim();if(PICK[q])return PICK[q];const m=q.match(/^\s*(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)\s*$/);if(m)return [+m[1],+m[2]];return null;}
function setField(f,name,lat,lon){PICK[name]=[lat,lon];if(f==='via'){const t=$('via');t.value=(t.value.trim()?t.value.trim()+'\n':'')+name;}else $(f).value=name;window.__pick=PICK;}
// ---- 自动补全下拉 ----
let dd=null,ddFor=null,ddInp=null,tmr=null,seq=0;
function closeDD(){if(dd)dd.style.display='none';ddFor=null;}
function showDD(inp,list,field){ddInp=inp;if(!dd){dd=document.createElement('div');dd.id='acdd';document.body.appendChild(dd);}const r=inp.getBoundingClientRect();
 dd.style.cssText=`display:block;left:${r.left}px;top:${r.bottom+4}px;width:${Math.max(r.width,250)}px`;ddFor=field;
 dd.innerHTML=list.length?list.map((x,i)=>`<div class="aci" data-i="${i}"><div class="acn">${x.name.replace(/</g,'&lt;')}</div><div class="aca">${(x.addr||'').replace(/</g,'&lt;')} · ${x.src}</div></div>`).join(''):'<div class="aca" style="padding:8px 10px">无匹配结果</div>';
 dd.querySelectorAll('.aci').forEach(e=>e.onmousedown=ev=>{ev.preventDefault();const x=list[+e.dataset.i];if(field==='viarow'){PICK[x.name]=[x.lat,x.lon];ddInp.value=x.name;ddInp.dispatchEvent(new Event('input'));}else if(field==='via'){const t=$('via');const ls=t.value.split('\n');ls[ls.length-1]=x.name;t.value=ls.join('\n');PICK[x.name]=[x.lat,x.lon];}else setField(field,x.name,x.lat,x.lon);closeDD();MAPAPI.flyTo(x.lat,x.lon,13);showPin(field,x.lat,x.lon);});}
function bindAC(field,el){const inp=el||$(field);inp.setAttribute('autocomplete','off');
 inp.addEventListener('input',()=>{clearTimeout(tmr);const q=(field==='via'?inp.value.split('\n').pop():inp.value).trim();if(q.length<2||lookup(q)){closeDD();return;}
  tmr=setTimeout(async()=>{const my=++seq;showDD(inp,[],field);dd.innerHTML='<div class="aca" style="padding:8px 10px">搜索中…</div>';const l=await search(q);if(my===seq&&document.activeElement===inp)showDD(inp,l,field);},550);});
 inp.addEventListener('blur',()=>setTimeout(closeDD,150));inp.addEventListener('keydown',e=>{if(e.key==='Escape')closeDD();});}
// ---- 地图选点 / 拖拽 ----
let pickMode=null;const pins={};
function showPin(kind,lat,lon){if(kind==='via')return;if(pins[kind])pins[kind].setLatLng(lat,lon);else pins[kind]=MAPAPI.addPin(kind,lat,lon,async(la,lo)=>{const n=await reverse(la,lo);setField(kind,n,la,lo);window.msg&&msg('');await plan();});}
function startPick(field){pickMode=field;MAPAPI.setCursor('crosshair');window.msg&&msg('请在地图上点击选择'+({from:'起点',to:'终点',via:'途经点'})[field]);}
async function onMapClick(lat,lon){if(!pickMode)return false;const f=pickMode;pickMode=null;MAPAPI.setCursor('');window.msg&&msg('正在获取地名…');const n=await reverse(lat,lon);setField(f,n,lat,lon);showPin(f,lat,lon);window.msg&&msg('已设置'+({from:'起点',to:'终点',via:'途经点'})[f]+'：'+n+'，点“规划路线”生效');return true;}
function routeSet(a,b){const fa=lookup($('from').value),tb=lookup($('to').value);showPin('from',...(fa||a));showPin('to',...(tb||b));}
function myLoc(){if(!navigator.geolocation){msg('此浏览器不支持定位');return;}if(!isSecureContext){msg('定位需要 https 或 localhost 访问页面');return;}
 msg('正在定位…');navigator.geolocation.getCurrentPosition(async p=>{const la=p.coords.latitude,lo=p.coords.longitude;const n='我的位置·'+await reverse(la,lo);setField('from',n,la,lo);showPin('from',la,lo);MAPAPI.flyTo(la,lo,13);msg('起点已设为我的位置（精度约 '+Math.round(p.coords.accuracy)+' m）');},
  e=>msg(({1:'定位被拒绝：请在浏览器地址栏允许位置权限',2:'无法获取位置（信号/网络不可用）',3:'定位超时，请重试'})[e.code]||('定位失败：'+e.message)),{enableHighAccuracy:true,timeout:15000,maximumAge:60000});}
function init(){['from','to','via'].forEach(f=>bindAC(f));
 document.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>startPick(b.dataset.pick));$('myloc').onclick=myLoc;
 $('tdtk').value=localStorage.getItem('tdtKey')||'';$('tdtk').onchange=e=>{localStorage.setItem('tdtKey',e.target.value.trim());};
 MAPAPI.onClick(onMapClick);}
window.ADDR={bindInput:el=>bindAC('viarow',el),search,reverse,lookup,init,routeSet,PICK,variants,get pickMode(){return pickMode}};
})();
