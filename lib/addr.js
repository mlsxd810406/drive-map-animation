// 地址搜索/自动补全、地图选点、拖拽起终点、我的位置。依赖页面提供 window.MAPAPI 与 plan()/msg()
(function(){
// 内置天地图浏览器端 key（白名单：mlsxd810406.github.io 等），用户在“地址搜索设置”中填写的 key 优先
const TDT_DEFAULT='0ca02853aa2274507ff0f31b73d13e7d';window.TDT_KEY=()=>((localStorage.getItem('tdtKey')||'').trim()||TDT_DEFAULT);
// 天地图诊断：POI 搜索与地理编码分别计失败；取消(Abort)不计；连续 3 次失败才暂停 60 秒
const TD={poi:{fail:0,until:0,err:''},geo:{fail:0,until:0,err:''}};window.__tdtDiag=TD;
const $=id=>document.getElementById(id);
const PICK={};// 名称 -> [lat,lon]（选中的精确坐标，规划时不再重新地理编码）
const hav=(a,b)=>{const r=Math.PI/180,x=Math.sin((b[0]-a[0])*r/2)**2+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin((b[1]-a[1])*r/2)**2;return 12742*Math.asin(Math.sqrt(x));};
async function J(u,ms=12000,sig){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);if(sig)sig.addEventListener('abort',()=>c.abort());try{const r=await fetch(u,{signal:c.signal});if(!r.ok)throw Error(r.status);return await r.json();}finally{clearTimeout(t);}}
// ---- 本地记忆：缓存 / 最近 / 收藏 ----
const LS={get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d;}catch(e){return d;}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
const CACHE=new Map(Object.entries(LS.get('acCache5',{})));
function cachePut(q,l){CACHE.set(q,{t:Date.now(),l});if(CACHE.size>150)CACHE.delete(CACHE.keys().next().value);LS.set('acCache5',Object.fromEntries(CACHE));}
const cacheGet=q=>{const e=CACHE.get(q);return e&&Date.now()-e.t<7*864e5?e.l:null;};
const key=x=>x.name+'@'+x.lat.toFixed(4)+','+x.lon.toFixed(4);
const recents=()=>LS.get('acRecent',[]),favs=()=>LS.get('acFav',[]);
function remember(x){const l=recents().filter(r=>key(r)!==key(x));l.unshift({name:x.name,addr:x.addr||'',lat:x.lat,lon:x.lon});LS.set('acRecent',l.slice(0,12));}
function toggleFav(x){let l=favs();const k=key(x);if(l.some(r=>key(r)===k))l=l.filter(r=>key(r)!==k);else l.unshift({name:x.name,addr:x.addr||'',lat:x.lat,lon:x.lon});LS.set('acFav',l.slice(0,30));}
const isFav=x=>favs().some(r=>key(r)===key(x));
// ---- 查询解析：行政区前缀 + 关键词 + 同义词变体 ----
const SYN=[['市政府','人民政府'],['高铁站','火车站','站'],['服务区','服务站'],['分局','局'],['海洋和渔业局','海洋和渔业','海洋渔业局','渔业局','海洋局'],['人民政府','政府'],['公安局','派出所'],['火车站','站'],['汽车站','客运站']];
function parse(q){if(window.QS){const r=QS.parse(q);if(r.admin||!/\s/.test(q.trim()))return {q:q.trim(),region:r.admin?r.admin.n:'',typed:r.region,kw:r.kw||q.trim(),rc:r.rc,code:r.code,fixed:r.fixed,regionOnly:r.regionOnly};}return parse0(q);}
function parse0(q){q=q.trim().replace(/\s+/g,' ');let region='',kw=q;
 const sp=q.split(' ');if(sp.length>1){region=sp[0];kw=sp.slice(1).join('');}
 else{const m=q.match(/^((?:[^省]{2,7}省|[^区]{2,8}自治区)?(?:北京|天津|上海|重庆|[^市州盟]{2,6}(?:市|自治州|州|盟))?(?:[^区县旗]{1,6}(?:区|县|旗))?)(.{2,})$/);if(m&&m[1])region=m[1],kw=m[2];}
 const rc=(region.match(/([^省市区县旗州盟]{2,})(?:市|区|县|旗|自治州|州|盟)?$/)||[])[1]||'';return {q,region,kw:kw||q,rc:rc.replace(/^(北京|天津|上海|重庆)(?=..)/,'')};}
function kwVariants(kw){const out=[kw];for(const g of SYN){const h=g.find(w=>kw.includes(w));if(h)for(const w of g)if(w!==h)out.push(kw.replace(h,w));}
 if(/政府$/.test(kw)&&!/人民政府$/.test(kw))out.push(kw.replace(/政府$/,'人民政府'));if(kw.length>=3&&/[业务理源政育生通安保商监统管规划]$/.test(kw))out.push(kw+'局');return [...new Set(out)].slice(0,4);}
function variants(q){const p=parse(q);return [...new Set([q,p.kw,...kwVariants(p.kw).map(k=>p.region+k)])];}
const REG=new Map(Object.entries(LS.get('acRegion',{})));
async function region(name,sig){if(!name)return null;if(REG.has(name))return REG.get(name);
 const d=await J('https://nominatim.openstreetmap.org/search?format=json&limit=3&addressdetails=1&accept-language=zh&countrycodes=cn&q='+encodeURIComponent(name),12000,sig).catch(()=>[]);
 const x=d.find(x=>x.class==='boundary'||x.class==='place')||null;const r=x&&{name:(x.name||'').replace(/[\u1800-\u18AF\u202F]+/g,'').trim(),lat:+x.lat,lon:+x.lon,bb:x.boundingbox.map(Number),addr:adminPath(x.address,x.name),type:x.type};
 REG.set(name,r);LS.set('acRegion',Object.fromEntries([...REG].slice(-60)));return r;}
function adminPath(a,name){if(!a)return '';const p=[a.state,a.city||a.prefecture,a.district||a.county,a.town||a.suburb,a.road].filter((v,i,ar)=>v&&v!==name&&ar.indexOf(v)===i);return p.join(' ');}
// bb: [south,north,west,east]
const nomi=(q,bb,sig)=>J('https://nominatim.openstreetmap.org/search?format=json&limit=8&addressdetails=1&accept-language=zh&countrycodes=cn'+(bb?`&bounded=1&viewbox=${bb[2]},${bb[1]},${bb[3]},${bb[0]}`:'')+'&q='+encodeURIComponent(q),12000,sig).then(d=>d.map((x,i)=>({lat:+x.lat,lon:+x.lon,name:x.name||x.display_name.split(',')[0],addr:adminPath(x.address,x.name),src:'OSM',rank:i,type:x.type,cls:x.class}))).catch(()=>[]);
const phot=(q,bb,c,sig)=>J('https://photon.komoot.io/api/?limit=8&lang=default'+(bb?`&bbox=${bb[2]},${bb[0]},${bb[3]},${bb[1]}`:c?`&lat=${c[0]}&lon=${c[1]}`:'')+'&q='+encodeURIComponent(q),12000,sig).then(d=>d.features.filter(f=>(f.properties.countrycode||'CN')==='CN').map((f,i)=>{const p=f.properties;return {lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0],name:p.name||'',addr:[p.state,p.city,p.district||p.county,p.street].filter((v,j,a)=>v&&v!==p.name&&a.indexOf(v)===j).join(' '),src:'Photon',rank:i,type:p.osm_value};})).catch(()=>[]);
const isAbort=(e,sig)=>(sig&&sig.aborted)||(e&&e.name==='AbortError'&&!e.timeout);
async function tdtJ(kind,u,sig,again){const st=TD[kind];if(Date.now()<st.until)throw Object.assign(Error('paused: '+st.err),{paused:1});
 const c=new AbortController();let to=false;const t=setTimeout(()=>{to=true;c.abort();},5000);if(sig)sig.addEventListener('abort',()=>c.abort());
 try{let r;try{r=await fetch(u,{signal:c.signal,mode:'cors'});}catch(e){if(to)throw Object.assign(Error('超时 5s'),{timeout:1,retry:1});if(isAbort(e,sig))throw e;throw Object.assign(Error('网络/CORS 被拒（'+e.message+'）'),{retry:1});}
  const txt=await r.text();if(!r.ok)throw Error('HTTP '+r.status+(/拦截/.test(txt)?' 访问被拦截（WAF）':''));
  let d;try{d=JSON.parse(txt);}catch(_){throw Error('返回非 JSON：'+txt.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,60));}
  const ic=d&&d.status&&(d.status.infocode??d.status);if(kind==='poi'&&d.status&&typeof d.status==='object'&&+ic!==1000)throw Error('infocode '+ic+' '+(d.status.cndesc||''));
  st.fail=0;st.err='';return d;}
 catch(e){if(e.retry&&!again&&!isAbort(e,sig)){clearTimeout(t);return tdtJ(kind,u,sig,1);}if(!isAbort(e,sig)&&!e.paused){st.fail++;st.err=e.message;console.warn('[天地图'+(kind==='poi'?'搜索':'地理编码')+'失败]',e.message,u.replace(/tk=\w+/,'tk=***'));if(st.fail>=3)st.until=Date.now()+60000;}throw e;}
 finally{clearTimeout(t);}}
const tdtLL=s=>{const [lo,la]=String(s||'').trim().split(/[\s,]+/).map(Number);return [la,lo];};
const TDT_URL=ps=>'https://api.tianditu.gov.cn/v2/search?postStr='+encodeURIComponent(JSON.stringify(ps))+'&type=query&tk='+TDT_KEY();
function tdtParse(d){const o=[];
 (d.pois||[]).forEach((p,i)=>{const [la,lo]=tdtLL(p.lonlat);if(isFinite(la)&&isFinite(lo))o.push({lat:la,lon:lo,name:p.name,addr:[p.province,p.city,p.county,p.address].filter((v,j,a)=>v&&a.indexOf(v)===j).join(' '),src:'天地图',rank:i,typeName:p.typeName||''});});
 (d.suggests||[]).forEach((p,i)=>{const [la,lo]=tdtLL(p.lonlat);if(isFinite(la)&&isFinite(lo))o.push({lat:la,lon:lo,name:p.name,addr:p.address||'',src:'天地图',rank:i+2});});
 const ar=Array.isArray(d.area)?d.area:d.area?[d.area]:[];ar.forEach(x=>{const [la,lo]=tdtLL(x.lonlat);if(isFinite(la))o.push({lat:la,lon:lo,name:x.name,addr:'行政区',src:'天地图',rank:0});});
 return o;}
// 天地图 POI 搜索：
// 1) 先用普通搜索 queryType 1（keyWord=完整查询，如“秦皇岛市海洋和渔业局”，全国范围）——常直接返回 pois；
//    同时从 prompt[].admins / statistics 中取得行政区 9 位国标码（如 秦皇岛市=156130300）并缓存；
// 2) 有国标码时用行政区划区域搜索 queryType 12（specify=国标码，keyWord=去掉城市前缀的关键词）。
const ACODE=new Map(Object.entries(LS.get('tdtAdmin',{})));
function admCode(d,rc){if(!rc)return null;let hit=null;const chk=(n,c)=>{if(!hit&&n&&c&&String(n).includes(rc))hit=String(c);};
 (d.prompt||[]).forEach(p=>(p.admins||[]).forEach(x=>chk(x.adminName||x.name,x.adminCode)));
 const st=d.statistics;if(st){(st.priorityCitys||[]).forEach(x=>chk(x.name||x.adminName,x.adminCode));(st.allAdmins||[]).forEach(x=>chk(x.name||x.adminName,x.adminCode));}
 (Array.isArray(d.area)?d.area:d.area?[d.area]:[]).forEach(x=>chk(x.name,x.adminCode));return hit;}
const CODEP={};
function tdtCode(rc,full,sig){// 取行政区国标码：本地缓存 → qt1 的 prompt/statistics；同城并发只查一次
 if(!rc)return Promise.resolve({code:null});if(ACODE.get(rc))return Promise.resolve({code:ACODE.get(rc)});
 return CODEP[rc]||(CODEP[rc]=tdtJ('poi',TDT_URL({keyWord:full||rc,level:12,mapBound:'73.5,3.8,135.1,53.6',queryType:1,start:0,count:10,show:2}),sig).then(d=>{const c=admCode(d,rc);if(c){ACODE.set(rc,c);LS.set('tdtAdmin',Object.fromEntries(ACODE));}window.__tdtLast={q:full||rc,resultType:d.resultType,count:d.count,code:c};return {code:c,d};}).catch(e=>({code:null})).finally(()=>delete CODEP[rc]));}
const inCity=(x,rc)=>!rc||(x.name+x.addr).includes(rc);
async function tdt(kw,full,rc,kws,sig){if(!TDT_KEY())return [];const out=[];const add=l=>{for(const x of l)if(!out.some(o=>o.name===x.name&&hav([o.lat,o.lon],[x.lat,x.lon])<0.3))out.push(x);};
 const qt12=(k,code)=>tdtJ('poi',TDT_URL({keyWord:k,queryType:12,specify:String(code),start:0,count:10,show:2}),sig).then(tdtParse).catch(()=>[]);
 try{const r=await tdtCode(rc,full,sig);if(r.d)add(tdtParse(r.d).filter(x=>inCity(x,rc)));
  if(rc&&r.code){add(await qt12(kw,r.code));// 1) 城市国标码 + 关键词
   if(!out.length)for(const k of kws.slice(1,3)){add(await qt12(k,r.code));if(out.length)break;}}// 2) 关键词变体
  if(!out.length){// 3) 全国范围关键词，再按城市名过滤
   const d=await tdtJ('poi',TDT_URL({keyWord:kw,level:12,mapBound:'73.5,3.8,135.1,53.6',queryType:1,start:0,count:20,show:2}),sig).catch(()=>null);
   if(d){add(tdtParse(d).filter(x=>inCity(x,rc)));const st=d.statistics;if(!out.length&&st&&!rc){const pc=(st.priorityCitys||[])[0];if(pc&&pc.adminCode)add(await qt12(kw,pc.adminCode));}}}
  window.__tdtLast2={kw,rc,code:r.code,n:out.length};return out;}catch(e){return out;}}
window.__tdtPrefetch=(q)=>{const P=parse(q||'');if(P.code&&P.rc)ACODE.set(P.rc,P.code);else if(P.rc&&!P.regionOnly&&TDT_KEY())tdtCode(P.rc,P.region+P.kw);};
function tdtGeo(q,sig){if(!TDT_KEY())return Promise.resolve([]);
 return tdtJ('geo','https://api.tianditu.gov.cn/geocoder?ds='+encodeURIComponent(JSON.stringify({keyWord:q}))+'&tk='+TDT_KEY(),sig).then(d=>{const l=d&&d.location;return l&&+d.status===0?[{lat:+l.lat,lon:+l.lon,name:q,addr:'天地图地理编码（'+(l.level||'')+'）',src:'天地图',rank:3,geo:1}]:[];}).catch(()=>[]);}
window.__tdtSearch=(kw,full,rc)=>tdt(kw,full,rc,[kw]);
// 混合排序的上下文特征：距地图中心/当前路线、POI 类型、个人使用频次与“查询→选择”学习
const FREQ=LS.get('acFreq',{}),LEARN=LS.get('acLearn',{});const nq=q=>(q||'').replace(/\s+/g,'');
function ctxScore(r,P){let s=0;try{if(!P.rc&&typeof map!=='undefined'&&map.getCenter){const c=map.getCenter();const d=hav([c.lat,c.lng],[r.lat,r.lon]);s+=d<30?1.5:d<150?0.8:d>1500?-0.5:0;}
 if(!P.rc&&typeof coords!=='undefined'&&coords&&coords.length){let m=1e9;for(let i=0;i<coords.length;i+=Math.max(1,coords.length/60|0))m=Math.min(m,hav(coords[i],[r.lat,r.lon]));s+=m<20?1:0;}}catch(e){}
 const t=r.typeName||'';if(/政府|机关|火车站|高铁|机场|服务区|景区|博物馆|医院|大学/.test(t+r.name))s+=0.6;
 const k=key(r),f=FREQ[k]||0;if(f)s+=Math.min(3,Math.log2(1+f));if(LEARN[nq(P.q)]===k)s+=5;return s;}
function learn(q,x){const k=key(x);FREQ[k]=(FREQ[k]||0)+1;LS.set('acFreq',FREQ);if(q){LEARN[nq(q)]=k;const ks=Object.keys(LEARN);if(ks.length>300)delete LEARN[ks[0]];LS.set('acLearn',LEARN);}}
const bigr=s=>{s=s.replace(/[\s·()（）]/g,'');const o=new Set();for(let i=0;i<s.length-1;i++)o.add(s.slice(i,i+2));return o;};
function score(r,P,R,kws){const n=r.name||'';let s=-r.rank*0.3,best=0;
 for(const k of kws){const core=k.replace(/人民政府$|政府$/,'');let v=0;if(n===k||n===P.region+k)v=10;else if(n.includes(k))v=8;else if(core.length>1&&n.includes(core))v=6;else{const B=bigr(k),N=bigr(n);let hit=0;B.forEach(b=>N.has(b)&&hit++);v=B.size?6*hit/B.size:0;}best=Math.max(best,v);}
 if(best<5&&P.kw.length>=2&&(n+r.addr).includes(P.kw))best=Math.max(best,n.includes(P.kw)?8:5);s+=best;if(best<2)s-=10;// 与关键词无关的 POI 强烈降权
 if(R){const [S,N,W,E]=R.bb,inb=r.lat>=S&&r.lat<=N&&r.lon>=W&&r.lon<=E;s+=inb?2:-5;const rc=P.rc;if(rc){if(n.includes(rc))s+=4;else if(r.addr.includes(rc))s+=2;else s-=2;}}
 s+=ctxScore(r,P);if(r.src==='天地图')s+=3;if(r.geo)s-=7;if(isFav(r))s+=3;else if(recents().some(x=>key(x)===key(r)))s+=1.5;return s;}
// 渐进式搜索：各数据源返回即排序并回调 onPart(list, pending)；天地图不等待 Nominatim/Photon
async function search(q,sig,onPart){q=q.trim();const P=parse(q);const kws=kwVariants(P.kw);let R=null,Rq=null;const all=[];let pending=0;
 const cl=t=>(t||'').replace(/[\u1800-\u18AF\u202F]+/g,'').replace(/\s{2,}/g,' ').trim();
 const rank=()=>{const res=all.map(r=>({...r,s:score(r,P,R,[P.kw,...kws])}));res.sort((a,b)=>b.s-a.s);
  const out=[];for(const r of res){if(!out.some(o=>(o.name===r.name&&hav([o.lat,o.lon],[r.lat,r.lon])<10)||(hav([o.lat,o.lon],[r.lat,r.lon])<0.2&&(o.name.includes(r.name)||r.name.includes(o.name)))))out.push(r);}
  let good=out.filter(r=>r.s>0);
  {const real=good.filter(r=>!r.geo);good=real.length?real:good.filter(r=>r.geo&&r.name!==q&&r.name!==P.region+P.kw);}// 地理编码回显仅在无任何 POI/OSM 结果且非原样回显时保留
  if(P.rc){const inR=good.filter(r=>(r.name+r.addr).includes(P.rc));if(inR.length)good=inR;}
  if(Rq&&!good.some(r=>r.name===Rq.name&&hav([r.lat,r.lon],[Rq.lat,Rq.lon])<15))good.unshift({...Rq,src:'行政区',s:99});
  if(!good.length&&R&&!pending)good=[{...R,src:'行政区（未找到“'+P.kw+'”）',s:0}];
  return good.slice(0,7);};
 const emit=()=>{if(onPart&&!(sig&&sig.aborted))onPart(rank(),pending);};
 const track=p=>{pending++;return p.then(l=>{if(sig&&sig.aborted)return;(l||[]).forEach(r=>{r.name=cl(r.name);r.addr=cl(r.addr);all.push(r);});}).catch(()=>{}).finally(()=>{pending--;emit();});};
 if(P.code&&P.rc&&!ACODE.get(P.rc))ACODE.set(P.rc,P.code);const jobs=[track(P.regionOnly?Promise.resolve([]):tdt(P.kw,P.region?P.region+P.kw:q,P.rc,kws,sig)),track(tdtGeo(P.region+P.kw,sig))];
 jobs.push(track(region(q,sig).then(x=>{Rq=x;return [];})));
 jobs.push(track(region(P.region,sig).then(x=>{R=x;const bb=R&&R.bb,js=[];
  kws.forEach((k,i)=>{if(i<2||bb)js.push(track(nomi(k,bb,sig)));js.push(track(phot(k,bb,R&&[R.lat,R.lon],sig)));});
  if(!bb)js.push(track(nomi(q,null,sig)),track(phot(q,null,null,sig)));else js.push(track(phot(q,null,[R.lat,R.lon],sig)));return Promise.all(js).then(()=>[]);})));
 await Promise.all(jobs);while(pending>0)await new Promise(r=>setTimeout(r,30));if(sig&&sig.aborted)return [];return rank();}
async function reverse(lat,lon){try{const d=await J('https://nominatim.openstreetmap.org/reverse?format=json&zoom=17&accept-language=zh&lat='+lat+'&lon='+lon);const a=d.address||{};
 const city=a.city||a.county||a.state||'',dist=a.district||a.county||a.suburb||'',poi=d.name||a.road||a.village||a.town||'';const s=[city,dist!==city?dist:'',poi].filter(Boolean).join('');if(s)return s;}catch(e){}return lat.toFixed(5)+','+lon.toFixed(5);}
function coord(q){const m=(q||'').trim().match(/^\s*(-?\d+(?:\.\d+)?)\s*[,，\s]\s*(-?\d+(?:\.\d+)?)\s*$/);if(!m)return null;let a=+m[1],b=+m[2];if(Math.abs(a)>90&&Math.abs(b)<=90)[a,b]=[b,a];return Math.abs(a)<=90&&Math.abs(b)<=180?[a,b]:null;}
function lookup(q){q=(q||'').trim();if(PICK[q])return PICK[q];return coord(q);}
function setField(f,name,lat,lon){PICK[name]=[lat,lon];if(f==='via'){const t=$('via');t.value=(t.value.trim()?t.value.trim()+'\n':'')+name;}else $(f).value=name;window.__pick=PICK;}
// ---- 自动补全下拉（防抖 250ms、取消旧请求、缓存即显、键盘上下/回车、最近/收藏）----
let ddQ='',dd=null,ddFor=null,ddInp=null,tmr=null,seq=0,ctl=null,ddList=[],ddSel=-1;
const esc=s=>(s||'').replace(/[&<]/g,c=>c==='&'?'&amp;':'&lt;');
const STAR='<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/></svg>';
function closeDD(){if(dd)dd.style.display='none';ddFor=null;ddSel=-1;}
function choose(x,field){if(x.complete){ddInp.value=x.name+' ';ddInp.focus();ddInp.dispatchEvent(new Event('input'));return;}remember(x);learn(ddQ,x);if(field==='viarow'){PICK[x.name]=[x.lat,x.lon];ddInp.value=x.name;ddInp.dispatchEvent(new Event('input'));}else if(field==='via'){const t=$('via');const ls=t.value.split('\n');ls[ls.length-1]=x.name;t.value=ls.join('\n');PICK[x.name]=[x.lat,x.lon];}else setField(field,x.name,x.lat,x.lon);closeDD();MAPAPI.flyTo(x.lat,x.lon,13);showPin(field,x.lat,x.lon);}
function showDD(inp,list,field,note){ddInp=inp;if(!dd){dd=document.createElement('div');dd.id='acdd';document.body.appendChild(dd);}const r=inp.getBoundingClientRect();
 const w=Math.min(innerWidth-16,Math.max(r.width+40,260));dd.style.cssText=`display:block;left:${Math.max(8,Math.min(r.left-8,innerWidth-w-8))}px;top:${r.bottom+4}px;width:${w}px`;ddFor=field;ddList=list;ddSel=-1;
 dd.innerHTML=(note?`<div class="ach">${note}</div>`:'')+(list.length?list.map((x,i)=>`<div class="aci${x.hd?' hd':''}" data-i="${i}"><div class="acm"><div class="acn">${esc(x.name)}</div><div class="aca">${esc(x.addr)}${x.src?` · ${esc(x.src)}`:''}</div></div>${x.lat!=null&&!x.coord?`<button class="acs${isFav(x)?' on':''}" data-s="${i}" title="收藏">${STAR}</button>`:''}</div>`).join(''):(note?'':'<div class="ach">无匹配结果</div>'));
 dd.querySelectorAll('.aci').forEach(e=>e.onmousedown=ev=>{ev.preventDefault();const i=+e.dataset.i;if(ev.target.closest('.acs')){toggleFav(list[i]);ev.target.closest('.acs').classList.toggle('on');return;}choose(list[i],field);});}
function hl(i){const it=dd?[...dd.querySelectorAll('.aci')]:[];if(!it.length)return;ddSel=(i+it.length)%it.length;it.forEach((e,j)=>e.classList.toggle('sel',j===ddSel));it[ddSel].scrollIntoView({block:'nearest'});}
function memList(q){const f=favs().map(x=>({...x,src:'★ 收藏'})),r=recents().filter(x=>!f.some(y=>key(y)===key(x))).map(x=>({...x,src:'最近'}));let l=[...f,...r];
 if(q){const lq=q.toLowerCase(),lat=/^[a-z]+$/.test(lq);l=l.filter(x=>(x.name+x.addr).includes(q)||(lat&&window.QS&&QS.initials(x.name).includes(lq)));}return l.slice(0,8);}
function bindAC(field,el){const inp=el||$(field);inp.setAttribute('autocomplete','off');
 const qOf=()=>(field==='via'?inp.value.split('\n').pop():inp.value).trim();
 const run=()=>{clearTimeout(tmr);if(ctl)ctl.abort();const q=qOf();
  const c=coord(q);if(c){showDD(inp,[{name:c[0].toFixed(5)+','+c[1].toFixed(5),addr:'经纬度坐标（WGS84）',lat:c[0],lon:c[1],src:'',coord:1}],field);return;}
  if(q.length<2||PICK[q]){const m=memList(q.length?q:'');m.length&&document.activeElement===inp?showDD(inp,m,field,q?'':'最近与收藏'):closeDD();return;}
  ddQ=q;const mem=memList(q),hit=cacheGet(q);
  if(/^[a-z]{2,8}$/i.test(q)&&window.QS){const ad=QS.adminByInitials(q).map(e=>({name:e.n,addr:'行政区 · 拼音 '+e.i+' · 回车补全后继续输入',complete:1}));const l=[...mem,...ad];if(l.length){showDD(inp,l,field,'拼音首字母匹配');return;}}
  if(hit){const lk=LEARN[nq(q)];const hb=hit.map((x,i)=>[x,(key(x)===lk?-100:0)-Math.min(3,Math.log2(1+(FREQ[key(x)]||0)))+i*0.01]).sort((u,v)=>u[1]-v[1]).map(u=>u[0]);showDD(inp,[...mem,...hb.filter(x=>!mem.some(m=>key(m)===key(x)))],field);return;}
  showDD(inp,mem,field,'搜索中…');
  tmr=setTimeout(async()=>{const my=++seq;ctl=new AbortController();const sg=ctl.signal;
   const merge=l=>[...mem,...l.filter(x=>!mem.some(m=>key(m)===key(x)))];
   const P0=parse(q);const fx=P0.fixed?'已按“'+esc(P0.fixed.to)+'”搜索 · ':'';const note=(pend)=>{const bad=TD.poi.err;return [fx.replace(/ · $/,''),pend?'搜索中…':''].filter(Boolean).join(' · ')+(bad?'<span class="tdx">'+(pend?' · ':'')+'天地图搜索不可用：'+esc(bad)+'（已用 OSM）</span>':'');};
   const l=await search(q,sg,(part,pend)=>{if(my===seq&&!sg.aborted&&document.activeElement===inp)showDD(inp,merge(part),field,note(pend));});
   if(my!==seq||sg.aborted)return;if(!TD.poi.err&&(!TDT_KEY()||l.some(x=>x.src==='天地图')))cachePut(q,l);if(document.activeElement===inp)showDD(inp,merge(l),field,note(0));},250);};
 inp.addEventListener('input',run);inp.addEventListener('focus',()=>{window.__tdtPrefetch(qOf());if(!qOf()||qOf().length<2)run();});
 inp.addEventListener('blur',()=>setTimeout(closeDD,150));
 inp.addEventListener('keydown',e=>{const open=dd&&dd.style.display!=='none'&&ddFor;if(e.key==='Escape')closeDD();else if(open&&e.key==='ArrowDown'){e.preventDefault();hl(ddSel+1);}else if(open&&e.key==='ArrowUp'){e.preventDefault();hl(ddSel-1);}
  else if(open&&e.key==='Enter'&&ddList.length){e.preventDefault();choose(ddList[Math.max(0,ddSel)],ddFor);}});}
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
 $('tdtk').value=localStorage.getItem('tdtKey')||'';$('tdtk').placeholder='已内置默认 key，可填自己的覆盖';$('tdtk').onchange=e=>{localStorage.setItem('tdtKey',e.target.value.trim());};
 MAPAPI.onClick(onMapClick);}
window.ADDR={bindInput:el=>bindAC('viarow',el),search,parse,remember,toggleFav,recents,favs,reverse,lookup,init,routeSet,PICK,variants,get pickMode(){return pickMode}};
})();
