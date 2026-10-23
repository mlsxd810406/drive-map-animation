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
function remember(x){x={...x,addr:cleanName(x.addr||'')};const l=recents().filter(r=>key(r)!==key(x));l.unshift({name:x.name,addr:x.addr||'',lat:x.lat,lon:x.lon});LS.set('acRecent',l.slice(0,12));}
function toggleFav(x){let l=favs();const k=key(x);if(l.some(r=>key(r)===k))l=l.filter(r=>key(r)!==k);else l.unshift({name:x.name,addr:x.addr||'',lat:x.lat,lon:x.lon});LS.set('acFav',l.slice(0,30));}
const isFav=x=>favs().some(r=>key(r)===key(x));
// ---- 查询解析：行政区前缀 + 关键词 + 同义词变体 ----
const SYN=[['市政府','人民政府'],['高铁站','火车站','站'],['服务区','服务站'],['分局','局'],['海洋和渔业局','海洋和渔业','海洋渔业局','渔业局','海洋局'],['人民政府','政府'],['公安局','派出所'],['火车站','站'],['汽车站','客运站']];
function parse(q){if(window.QS){const r=QS.parse(q);if(r.admin||!/\s/.test(q.trim()))return {q:q.trim(),region:r.admin?r.admin.n:'',typed:r.region,kw:r.kw||q.trim(),rc:r.rc,code:r.code,fixed:r.fixed,regionOnly:r.regionOnly,admin:r.admin,chain:r.chain};}return parse0(q);}
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
 (d.pois||[]).forEach((p,i)=>{const [la,lo]=tdtLL(p.lonlat);if(isFinite(la)&&isFinite(lo))o.push({lat:la,lon:lo,name:cleanName(p.name),addr:[p.city?'':p.province,p.city,p.county,p.address].filter((v,j,a)=>v&&a.indexOf(v)===j).join(' · '),src:'天地图',rank:i,typeName:p.typeName||''});});
 (d.suggests||[]).forEach((p,i)=>{const [la,lo]=tdtLL(p.lonlat);if(isFinite(la)&&isFinite(lo))o.push({lat:la,lon:lo,name:cleanName(p.name),addr:p.address||'',src:'天地图',rank:i+2});});
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
// 天地图行政区划 API：按 9 位国标码取区划中心（响应结构做防御式解析）
function tdtAdmin(code,sig){if(!TDT_KEY()||!code)return Promise.resolve(null);
 return tdtJ('geo','https://api.tianditu.gov.cn/v2/administrative?keyword='+code+'&childLevel=0&extensions=false&tk='+TDT_KEY(),sig).then(d=>{const dd=(d&&d.data&&(d.data.district||d.data))||[];const x=Array.isArray(dd)?dd[0]:dd;if(!x)return null;
  const c=x.center||{};let lat=+(c.lat??c.latitude),lon=+(c.lng??c.lon??c.longitude);if(!isFinite(lat)&&x.lonlat){[lat,lon]=tdtLL(x.lonlat);}return isFinite(lat)&&isFinite(lon)?{lat,lon,name:x.name}:null;}).catch(()=>null);}
window.__tdtPrefetch=(q)=>{const P=parse(q||'');if(P.code&&P.rc)ACODE.set(P.rc,P.code);else if(P.rc&&!P.regionOnly&&TDT_KEY())tdtCode(P.rc,P.region+P.kw);};
function tdtGeo(q,sig){if(!TDT_KEY())return Promise.resolve([]);
 return tdtJ('geo','https://api.tianditu.gov.cn/geocoder?ds='+encodeURIComponent(JSON.stringify({keyWord:q}))+'&tk='+TDT_KEY(),sig).then(d=>{const l=d&&d.location;return l&&+d.status===0?[{lat:+l.lat,lon:+l.lon,name:q,addr:'天地图地理编码（'+(l.level||'')+'）',src:'天地图',rank:3,geo:1}]:[];}).catch(()=>[]);}
window.__tdtSearch=(kw,full,rc)=>tdt(kw,full,rc,[kw]);
// 混合排序的上下文特征：距地图中心/当前路线、POI 类型、个人使用频次与“查询→选择”学习
const FREQ=LS.get('acFreq',{}),LEARN=LS.get('acLearn',{});const nq=q=>(q||'').replace(/\s+/g,'');
function ctxScore(r,P){let s=0;try{if(!P.rc&&typeof map!=='undefined'&&map.getCenter){const c=map.getCenter();const d=hav([c.lat,c.lng],[r.lat,r.lon]);s+=d<30?1.5:d<150?0.8:d>1500?-0.5:0;}
 if(!P.rc&&typeof coords!=='undefined'&&coords&&coords.length){let m=1e9;for(let i=0;i<coords.length;i+=Math.max(1,coords.length/60|0))m=Math.min(m,hav(coords[i],[r.lat,r.lon]));s+=m<20?1:0;}}catch(e){}
 const k=key(r),f=FREQ[k]||0;if(f)s+=Math.min(3,Math.log2(1+f));if(LEARN[nq(P.q)]===k)s+=5;return s;}
function learn(q,x){const k=key(x);FREQ[k]=(FREQ[k]||0)+1;LS.set('acFreq',FREQ);if(q){LEARN[nq(q)]=k;const ks=Object.keys(LEARN);if(ks.length>300)delete LEARN[ks[0]];LS.set('acLearn',LEARN);}}
const bigr=s=>{s=s.replace(/[\s·()（）]/g,'');const o=new Set();for(let i=0;i<s.length-1;i++)o.add(s.slice(i,i+2));return o;};
// 重要度（参照百度/高德：行政区、地标、交通枢纽、大型公共设施优先；小店、办公室、居委会、公交站靠后）
const IMP_HI=/(人民政府$|^.{0,6}[市区县旗]政府$|广场$|火车站$|高铁站$|^.{0,8}站$|机场$|国际机场|风景区|景区$|公园$|人民医院|第一医院|中心医院|附属医院|大学$|学院$|博物馆$|体育场$|体育中心$|会展中心|步行街$|古城$|老街$|海滩|港$|码头$)/;
const IMP_LO=/(办公室|居委会|社区|村委会|委员会$|公交站|-公交|车站-|地铁站出口|出入口|食堂|浴池|门市|商店|超市|便利店|小卖部|批发|五金|门诊|诊所|药店|药房|停车场|厕所|宿舍|公司$|有限公司|经营部|服务部|工作室|分店|专卖|加盟|中介|理发|美发|洗车|维修|快递|驿站|彩票|网吧|棋牌|^[^市]*[路街]\d+号)/;
function imp(r){const n=r.name||'',t=r.typeName||'';let v=0;if(r.cityc||r.canon)v+=3;else if(/行政区/.test(r.addr||'')||/^(administrative|city|county|district)$/.test(r.type||''))v+=2.5;
 if(IMP_HI.test(n)||/风景|景点|交通设施|火车站|机场|政府机构|医院|高等院校|广场|公园/.test(t))v+=3;if(IMP_LO.test(n)||/餐饮|零售|生活服务|公司企业|购物/.test(t))v-=3;return v;}
function urban(r,P,C){let v=0;const a=r.addr||'';if(P.admin&&P.admin.lv===2){if(/(自治县|县|旗)\b|(自治县|县|旗)[\s·]/.test(a+' '))v-=2.5;else if(/区[\s·]|区$/.test(a))v+=1;}
 if(C&&C.lat!=null){const d=hav([C.lat,C.lon],[r.lat,r.lon]);v+=d<15?1.5:d<40?0.5:d>80?-2:-0.8;}return v;}
function score(r,P,R,kws,C){const n=r.name||'';let s=-r.rank*0.3+imp(r)+urban(r,P,C),best=0;const qq=(P.q||'').replace(/\s+/g,'');if(P.region&&qq.length>=3&&(n===qq||n.replace(/\s+/g,'')===qq))s+=12;else if(P.region&&qq.length>=3&&n.includes(qq))s+=7;else if(P.region&&qq.length>=4&&!P.admin?0:0){}
 if(/[路街道巷]$|路[东南西北]?口$|[东南西北]口$/.test(n)&&!/[路街道巷口]$/.test(P.kw))s-=1.5;
 for(const k of kws){const core=k.replace(/人民政府$|政府$/,'');let v=0;if(n===k||n===P.region+k)v=13;else if(n.includes(k))v=8;else if(k.length>=3&&(()=>{let i=0;for(const ch of n)if(ch===k[i])i++;return i>=k.length;})())v=7.5;else if(core.length>1&&n.includes(core))v=6;else{const B=bigr(k),N=bigr(n);let hit=0;B.forEach(b=>N.has(b)&&hit++);v=B.size?6*hit/B.size:0;}best=Math.max(best,v);}
 if(best<5&&P.kw.length>=2&&(n+r.addr).includes(P.kw))best=Math.max(best,n.includes(P.kw)?8:5);s+=best;if(best<2)s-=10;// 与关键词无关的 POI 强烈降权
 if(R){const [S,N,W,E]=R.bb,inb=r.lat>=S&&r.lat<=N&&r.lon>=W&&r.lon<=E;s+=inb?2:-5;const rc=P.rc;if(rc){if(n.includes(rc))s+=4;else if(r.addr.includes(rc))s+=2;else s-=2;}}
 s+=ctxScore(r,P);if(r.src==='天地图')s+=3;if(r.geo)s-=7;if(isFav(r))s+=3;else if(recents().some(x=>key(x)===key(r)))s+=1.5;return s;}
// 渐进式搜索：各数据源返回即排序并回调 onPart(list, pending)；天地图不等待 Nominatim/Photon
async function search(q,sig,onPart){q=q.trim();const P=parse(q);const kws=kwVariants(P.kw);let R=null,Rq=null;const all=[];let pending=0;
 const cl=t=>cleanName(t||'').replace(/\s{2,}/g,' ').replace(/^[\s·]+|[\s·]+$/g,'').trim();
 const rank=()=>{const C=cityC&&cityC.lat!=null?cityC:R;const res=all.map(r=>({...r,s:score(r,P,R,[P.kw,...kws],C)}));res.sort((a,b)=>b.s-a.s);
  const out=[];for(const r of res){if(!out.some(o=>(o.name===r.name&&hav([o.lat,o.lon],[r.lat,r.lon])<10)||(hav([o.lat,o.lon],[r.lat,r.lon])<0.2&&(o.name.includes(r.name)||r.name.includes(o.name)))))out.push(r);}
  let good=out.filter(r=>r.s>0);
  {const real=good.filter(r=>!r.geo);good=real.length?real:good.filter(r=>r.geo&&r.name!==q&&r.name!==P.region+P.kw);}// 地理编码回显仅在无任何 POI/OSM 结果且非原样回显时保留
  if(P.rc){const inR=good.filter(r=>(r.name+r.addr).includes(P.rc));if(inR.length)good=inR;}
  if(cityC&&(cityC.lat!=null||R)&&SHORTKW){const c=cityC.lat!=null?cityC:{...cityC,lat:R.lat,lon:R.lon};const sc=Math.max(1,...good.slice(0,4).map(x=>x.s))-0.01;const idx=Math.min(good.length,good.filter(x=>x.s>=sc&&!x.geo).length,4);if(!good.some(x=>x.cityc))good.splice(idx,0,{...c,s:sc});}
  if(canon){const ad=P.admin,names=new Set([ad.n,ad.s,canon.name,...(P.chain||[]).flatMap(e=>[e.n,e.s])]);
   if(canon.lat==null){const src=Rq||R;if(src){canon.lat=src.lat;canon.lon=src.lon;canon.src='行政区 · OSM';}}
   good=good.filter(r=>!(names.has(r.name)&&isAdminT(r))&&!(names.has(r.name)&&!r.type&&!r.typeName)).map(r=>names.has(r.name)?{...r,addr:(TYPEZH[r.type]||r.typeName||r.type||'地点')+' · '+r.addr}:r);
   if(canon.lat!=null)good.unshift(canon);}
  else if(Rq&&!good.some(r=>r.name===Rq.name&&hav([r.lat,r.lon],[Rq.lat,Rq.lon])<15))good.unshift({...Rq,src:'行政区',s:99});
  if(!good.length&&R&&!pending&&!canon)good=[{...R,src:'行政区（未找到“'+P.kw+'”）',s:0}];
  return good.slice(0,8);};
 const emit=()=>{if(onPart&&!(sig&&sig.aborted))onPart(rank(),pending);};
 const track=p=>{pending++;return p.then(l=>{if(sig&&sig.aborted)return;(l||[]).forEach(r=>{r.name=cl(r.name);r.addr=cl(r.addr);all.push(r);});}).catch(()=>{}).finally(()=>{pending--;emit();});};
 if(P.code&&P.rc&&!ACODE.get(P.rc))ACODE.set(P.rc,P.code);let canon=null;let cityC=null;const jobs0=[];const TYPEZH={services:'服务区',rest_area:'停车区',motorway_junction:'高速出入口',station:'车站',bus_stop:'公交站',fuel:'加油站',toll_booth:'收费站',school:'学校',hospital:'医院',townhall:'政府'};
 const isAdminT=r=>r.cls==='boundary'||r.cls==='place'||/^(administrative|city|county|district|state|province|town|suburb|village|municipality|region)$/.test(r.type||'')||r.src==='行政区';
 if(P.regionOnly&&P.admin&&window.QS){const pa=QS.path(P.admin);const nm=pa.filter(e=>e.lv>1||pa.length===1).map(e=>e.n).join('')||P.admin.n;
  canon={name:nm,addr:pa.map(e=>e.n).join(' '),src:'行政区',s:99,canon:1,code:P.code};
  pending++;tdtAdmin(P.code,sig).then(c=>{if(c){canon.lat=c.lat;canon.lon=c.lon;canon.src='行政区 · 天地图';}}).finally(()=>{pending--;emit();});}
 if(!P.regionOnly&&P.admin&&P.admin.lv<=2&&window.QS){const pa=QS.path(P.admin);const nm=P.admin.n;cityC={name:nm+(/市$/.test(nm)?'（市中心）':''),addr:pa.map(e=>e.n).join(' · ')+' · 行政区',src:'',rank:6,cityc:1,lat:null,lon:null};
  pending++;tdtAdmin(P.code,sig).then(c=>{if(c){cityC.lat=c.lat;cityC.lon=c.lon;}}).finally(()=>{pending--;emit();});}
 const SHORTKW=!P.regionOnly&&P.rc&&P.kw.length<=2&&!/[站场园院馆区县镇村路街]$/.test(P.kw);
 if(SHORTKW)['广场','医院','公园','政府','站'].forEach(sf=>jobs0.push(track(tdt(P.kw+sf,P.region+P.kw+sf,P.rc,[P.kw+sf],sig).then(l=>l.map(x=>({...x,rank:x.rank+1}))))));
 const jobs=[...jobs0,track(P.regionOnly?Promise.resolve([]):tdt(P.kw,P.region?P.region+P.kw:q,P.rc,kws,sig)),track(P.regionOnly?Promise.resolve([]):tdtGeo(P.region+P.kw,sig))];
 jobs.push(track(region(q,sig).then(x=>{Rq=x;return [];})));
 jobs.push(track(region(P.region,sig).then(x=>{R=x;const bb=R&&R.bb,js=[];
  kws.forEach((k,i)=>{if(i<2||bb)js.push(track(nomi(k,bb,sig)));js.push(track(phot(k,bb,R&&[R.lat,R.lon],sig)));});
  if(!bb)js.push(track(nomi(q,null,sig)),track(phot(q,null,null,sig)));else js.push(track(phot(q,null,[R.lat,R.lon],sig)));return Promise.all(js).then(()=>[]);})));
 await Promise.all(jobs);while(pending>0)await new Promise(r=>setTimeout(r,30));if(sig&&sig.aborted)return [];return rank();}
async function reverse(lat,lon){
 // 1) 天地图逆地理编码（国内可用，CGCS2000≈WGS84）
 try{if(TDT_KEY()){const d=await J('https://api.tianditu.gov.cn/geocoder?postStr='+encodeURIComponent(JSON.stringify({lon:+lon.toFixed(6),lat:+lat.toFixed(6),ver:1}))+'&type=geocode&tk='+TDT_KEY(),5000);
  const r=d&&+d.status===0&&d.result;if(r){const a=r.addressComponent||{};const city=a.city||a.province||'',cty=a.county&&a.county!==city?a.county:'';let poi=a.poi||'';const dd=+a.poi_distance||0;
   if(poi&&dd>800)poi='';const s=cleanName((city+cty+(poi||a.road||a.town||''))||r.formatted_address||'');if(s){window.__revSrc='天地图';return s;}}}}catch(e){}
 // 2) OSM Nominatim（国外/代理环境）
 try{const d=await J('https://nominatim.openstreetmap.org/reverse?format=json&zoom=17&accept-language=zh&lat='+lat+'&lon='+lon,4000);const a=d.address||{};
  const city=a.city||a.county||a.state||'',dist=a.district||a.county||a.suburb||'',poi=d.name||a.road||a.village||a.town||'';const s=cleanName([city,dist!==city?dist:'',poi].filter(Boolean).join(''));if(s){window.__revSrc='osm';return s;}}catch(e){}
 // 3) 友好标签（不显示数字），同名时加序号避免与其它选点冲突
 window.__revSrc='fallback';let n='地图选点',k=2;while(PICK[n]&&Math.abs(PICK[n][0]-lat)+Math.abs(PICK[n][1]-lon)>1e-5)n='地图选点 '+(k++);return n;}
function coord(q){const m=(q||'').trim().match(/^\s*(-?\d+(?:\.\d+)?)\s*[,，\s]\s*(-?\d+(?:\.\d+)?)\s*$/);if(!m)return null;let a=+m[1],b=+m[2];if(Math.abs(a)>90&&Math.abs(b)<=90)[a,b]=[b,a];return Math.abs(a)<=90&&Math.abs(b)<=180?[a,b]:null;}
function lookup(q){q=(q||'').trim();if(PICK[q])return PICK[q];return coord(q);}
const cleanName=n=>{const c=String(n||'').replace(/^(我的位置)\s*[·•]\s*-?\d+(\.\d+)?\s*[,，]\s*-?\d+(\.\d+)?\s*$/,'$1').replace(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\u1800-\u18AF\u202F\u200E\u200F\u202A-\u202E\u0F00-\u0FFF]+/g,' ').replace(/\s+/g,' ').trim();return c||String(n||'');};window.cleanName=cleanName;
function setField(f,name,lat,lon){name=cleanName(name);PICK[name]=[lat,lon];if(f==='via'){const t=$('via');t.value=(t.value.trim()?t.value.trim()+'\n':'')+name;}else $(f).value=name;window.__pick=PICK;}
// ---- 自动补全下拉（防抖 250ms、取消旧请求、缓存即显、键盘上下/回车、最近/收藏）----
let ddQ='',dd=null,ddFor=null,ddInp=null,tmr=null,seq=0,ctl=null,ddList=[],ddSel=-1;
const esc=s=>(s||'').replace(/[&<]/g,c=>c==='&'?'&amp;':'&lt;');
const STAR='<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/></svg>';
document.addEventListener('pointerdown',e=>{if(!dd||dd.style.display==='none'||MS.on)return;if(!dd.contains(e.target)&&e.target!==ddInp)closeDD();else if(dd.contains(e.target)&&!e.target.closest('.aci')&&document.body.classList.contains('mob')){e.preventDefault();const x=e.clientX,y=e.clientY;closeDD();const u=document.elementFromPoint(x,y);if(u&&/INPUT|TEXTAREA/.test(u.tagName))u.focus();else if(ddInp)ddInp.blur();}},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDD();});
function closeDD(){if(dd)dd.style.display='none';ddFor=null;ddSel=-1;}
function choose(x,field){if(field==='msx'&&!x.complete){seq++;clearTimeout(tmr);if(ctl)ctl.abort();remember(x);learn(ddQ,x);msApply(x.name,x.lat,x.lon);closeDD();msClose();if(x.lat!=null){MAPAPI.flyTo(x.lat,x.lon,13);showPin(MS.f==='viarow'?'via':MS.f,x.lat,x.lon);}return;}if(x.complete){ddInp.value=x.name+' ';ddInp.focus();ddInp.dispatchEvent(new Event('input'));return;}seq++;clearTimeout(tmr);if(ctl)ctl.abort();remember(x);learn(ddQ,x);if(field==='viarow'){PICK[x.name]=[x.lat,x.lon];ddInp.value=x.name;ddInp.dispatchEvent(new Event('input'));}else if(field==='via'){const t=$('via');const ls=t.value.split('\n');ls[ls.length-1]=x.name;t.value=ls.join('\n');PICK[x.name]=[x.lat,x.lon];}else setField(field,x.name,x.lat,x.lon);closeDD();if(document.body.classList.contains('mob')&&field!=='viarow'&&ddInp)ddInp.blur();MAPAPI.flyTo(x.lat,x.lon,13);showPin(field,x.lat,x.lon);}
function showDD(inp,list,field,note){if(document.activeElement!==inp&&inp.id!=='ms_inp'){closeDD();return;}ddInp=inp;if(!dd){dd=document.createElement('div');dd.id='acdd';document.body.appendChild(dd);}const r=inp.getBoundingClientRect();if(inp.id==='ms_inp'){const host=$('ms_list');if(dd.parentNode!==host)host.appendChild(dd);dd.style.cssText='display:block';dd.classList.add('inms');}else{if(dd.parentNode!==document.body)document.body.appendChild(dd);dd.classList.remove('inms');}
 if(inp.id!=='ms_inp'){const w=Math.min(innerWidth-16,Math.max(r.width+40,260));dd.style.cssText=`display:block;left:${Math.max(8,Math.min(r.left-8,innerWidth-w-8))}px;top:${r.bottom+4}px;width:${w}px`;{const vv=window.visualViewport,vb=vv?vv.height+vv.offsetTop:innerHeight;dd.style.maxHeight=Math.max(132,Math.min(300,vb-r.bottom-12))+'px';}}ddFor=field;ddList=list;ddSel=-1;
 dd.innerHTML=(note?`<div class="ach">${note}</div>`:'')+(list.length?list.map((x,i)=>`<div class="aci${x.hd?' hd':''}" data-i="${i}"><div class="acm"><div class="acn">${hlName(cleanName(x.name))}</div><div class="aca">${esc(cleanName(x.addr))}${/收藏|最近/.test(x.src||'')?` · ${esc(x.src)}`:''}</div></div>${x.lat!=null&&!x.coord?`<button class="acs${isFav(x)?' on':''}" data-s="${i}" title="收藏">${STAR}</button>`:''}</div>`).join(''):(note?'':'<div class="ach">无匹配结果</div>'));
 dd.querySelectorAll('.aci').forEach(e=>e.onmousedown=ev=>{ev.preventDefault();const i=+e.dataset.i;if(ev.target.closest('.acs')){toggleFav(list[i]);ev.target.closest('.acs').classList.toggle('on');return;}choose(list[i],field);});}
function hlName(n){const k=(ddQ&&parse(ddQ).kw||'').trim();const e=esc(n);if(!k||k.length<1)return e;const i=n.indexOf(k);if(i<0)return e;return esc(n.slice(0,i))+'<b class="ackw">'+esc(k)+'</b>'+esc(n.slice(i+k.length));}
function hl(i){const it=dd?[...dd.querySelectorAll('.aci')]:[];if(!it.length)return;ddSel=(i+it.length)%it.length;it.forEach((e,j)=>e.classList.toggle('sel',j===ddSel));it[ddSel].scrollIntoView({block:'nearest'});}
function memList(q){const f=favs().map(x=>({...x,src:'★ 收藏'})),r=recents().filter(x=>!f.some(y=>key(y)===key(x))).map(x=>({...x,src:'最近'}));let l=[...f,...r];
 if(q){const lq=q.toLowerCase(),lat=/^[a-z]+$/.test(lq);l=l.filter(x=>(x.name+x.addr).includes(q)||(lat&&window.QS&&QS.initials(x.name).includes(lq)));}return l.slice(0,8);}
function bindAC(field,el){const inp=el||$(field);inp.setAttribute('autocomplete','off');
 const qOf=()=>(field==='via'?inp.value.split('\n').pop():inp.value).trim();
 const run=e=>{if(inp.id==='ms_inp')$('ms_clr').style.visibility=inp.value?'visible':'hidden';if(e&&(e.isComposing||inp.__comp))return;clearTimeout(tmr);if(ctl)ctl.abort();const q=qOf();ddQ=q;
  const c=coord(q);if(c){showDD(inp,[{name:c[0].toFixed(5)+','+c[1].toFixed(5),addr:'经纬度坐标（WGS84）',lat:c[0],lon:c[1],src:'',coord:1}],field);return;}
  if(q.length<2||PICK[q]){const m=memList(q.length?q:'');m.length&&(document.activeElement===inp||inp.id==='ms_inp')?showDD(inp,m,field,q?'':'最近与收藏'):closeDD();return;}
  ddQ=q;const mem=memList(q),hit=cacheGet(q);
  if(/^[a-z]{2,8}$/i.test(q)&&window.QS){const ad=QS.adminByInitials(q).map(e=>({name:e.n,addr:'行政区 · 拼音 '+e.i+' · 回车补全后继续输入',complete:1}));const l=[...mem,...ad];if(l.length){showDD(inp,l,field,'拼音首字母匹配');return;}}
  if(hit){const lk=LEARN[nq(q)];const hb=hit.map((x,i)=>[x,(key(x)===lk?-100:0)-Math.min(3,Math.log2(1+(FREQ[key(x)]||0)))+i*0.01]).sort((u,v)=>u[1]-v[1]).map(u=>u[0]);showDD(inp,[...mem,...hb.filter(x=>!mem.some(m=>key(m)===key(x)))],field);return;}
  showDD(inp,mem,field,'搜索中…');
  tmr=setTimeout(async()=>{const my=++seq;ctl=new AbortController();const sg=ctl.signal;
   const merge=l=>[...mem,...l.filter(x=>!mem.some(m=>key(m)===key(x)))];
   const P0=parse(q);const fx=P0.fixed?'已按“'+esc(P0.fixed.to)+'”搜索 · ':'';const note=(pend)=>{const bad=TD.poi.err;return [fx.replace(/ · $/,''),pend?'搜索中…':''].filter(Boolean).join(' · ')+(bad?'<span class="tdx">'+(pend?' · ':'')+'天地图搜索不可用：'+esc(bad)+'（已用 OSM）</span>':'');};
   const l=await search(q,sg,(part,pend)=>{if(my===seq&&!sg.aborted&&(document.activeElement===inp||inp.id==='ms_inp'))showDD(inp,merge(part),field,note(pend));});
   if(my!==seq||sg.aborted)return;if(!TD.poi.err&&(!TDT_KEY()||l.some(x=>x.src==='天地图')))cachePut(q,l);if(document.activeElement===inp||inp.id==='ms_inp')showDD(inp,merge(l),field,note(0));},250);};
 inp.addEventListener('input',run);inp.addEventListener('compositionstart',()=>{inp.__comp=1;});inp.addEventListener('compositionend',()=>{inp.__comp=0;run();});inp.addEventListener('focus',()=>{window.__tdtPrefetch(qOf());if(!qOf()||qOf().length<2)run();});
 inp.addEventListener('blur',()=>setTimeout(()=>{if(!MS.on)closeDD();},150));
 inp.addEventListener('keydown',e=>{const open=dd&&dd.style.display!=='none'&&ddFor;if(e.key==='Escape')closeDD();else if(open&&e.key==='ArrowDown'){e.preventDefault();hl(ddSel+1);}else if(open&&e.key==='ArrowUp'){e.preventDefault();hl(ddSel-1);}
  else if(open&&e.key==='Enter'&&ddList.length){e.preventDefault();choose(ddList[Math.max(0,ddSel)],ddFor);}});}
// ---- 地图选点 / 拖拽 ----
let pickMode=null;const pins={};
function showPin(kind,lat,lon){if(kind==='via')return;if(pins[kind])pins[kind].setLatLng(lat,lon);else pins[kind]=MAPAPI.addPin(kind,lat,lon,async(la,lo)=>{const n=await reverse(la,lo);setField(kind,n,la,lo);window.msg&&msg('');await plan();});}
function startPick(field){pickMode=field;if(document.body.classList.contains('mob')&&window.__setDet)__setDet('peek');MAPAPI.setCursor('crosshair');window.msg&&msg('请在地图上点击选择'+({from:'起点',to:'终点',via:'途经点'})[field]);}
async function onMapClick(lat,lon){if(!pickMode)return false;const f=pickMode;pickMode=null;MAPAPI.setCursor('');window.msg&&msg('正在获取地名…');const n=await reverse(lat,lon);setField(f,n,lat,lon);showPin(f,lat,lon);window.msg&&msg('已设置'+({from:'起点',to:'终点',via:'途经点'})[f]+'：'+n+'，点“规划路线”生效');if(document.body.classList.contains('mob')&&window.__setDet)__setDet('compact');return true;}
function routeSet(a,b){const fa=lookup($('from').value),tb=lookup($('to').value);showPin('from',...(fa||a));showPin('to',...(tb||b));}
function myLoc(fld){fld=fld||'from';const lbl={from:'起点',to:'终点',via:'途经点'}[fld]||'位置';if(!navigator.geolocation){msg('此浏览器不支持定位');return;}if(!isSecureContext){msg('定位需要 https 或 localhost 访问页面');return;}
 msg('正在定位…');navigator.geolocation.getCurrentPosition(async p=>{const la=p.coords.latitude,lo=p.coords.longitude;const rv=await reverse(la,lo);const n=(coord(rv)||window.__revSrc==='fallback')?'我的位置':cleanName(rv);remember({name:n,addr:'我的位置 · 定位',lat:la,lon:lo});if(fld==='msx'){msApply(n,la,lo);showPin(MS.f==='viarow'?'via':MS.f,la,lo);}else{setField(fld,n,la,lo);showPin(fld,la,lo);}MAPAPI.flyTo(la,lo,13);msg((fld==='msx'?({from:'起点',to:'终点',viarow:'途经点'})[MS.f]:lbl)+'已设为我的位置（精度约 '+Math.round(p.coords.accuracy)+' m）');},
  e=>msg(({1:'定位被拒绝：请在浏览器地址栏允许位置权限',2:'无法获取位置（信号/网络不可用）',3:'定位超时，请重试'})[e.code]||('定位失败：'+e.message)),{enableHighAccuracy:true,timeout:15000,maximumAge:60000});}

// ---- 手机：全屏搜索页（仿高德/百度）：输入框固定顶部，最近/收藏/联想在键盘上方可见区内 ----
const MS={on:false,f:null,el:null};
const isMobUI=()=>document.body.classList.contains('mob');
function msApply(name,lat,lon){name=cleanName(name);if(lat!=null)PICK[name]=[lat,lon];window.__pick=PICK;const el=MS.el;
 if(MS.f==='viarow'){el.value=name;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
 else if(lat!=null)setField(MS.f,name,lat,lon);else{el.value=name;el.dispatchEvent(new Event('input',{bubbles:true}));}}
function msFit(){const pg=$('msearch');if(!pg||!MS.on)return;const vv=window.visualViewport;const h=vv?vv.height:innerHeight,t=vv?vv.offsetTop:0;
 pg.style.top=t+'px';pg.style.height=h+'px';if(!vv||vv.offsetTop>0||window.scrollY)window.scrollTo(0,0);}
function msOpen(el,field){if(MS.on)return;MS.on=true;MS.f=field;MS.el=el;const pg=$('msearch'),i=$('ms_inp');
 i.placeholder=({from:'搜索起点',to:'搜索终点',viarow:'搜索途经点'})[field]||'搜索地点';$('ms_pick').lastChild.textContent='在地图上选点';
 $('ms_loc').lastChild.textContent=field==='from'?'我的位置':'用我的位置';
 i.value=(el.value||'').trim();pg.classList.add('on');document.body.classList.add('ms-on');msFit();try{el.blur();}catch(_){}
 i.focus({preventScroll:true});try{i.setSelectionRange(i.value.length,i.value.length);}catch(_){}
 i.dispatchEvent(new Event('input'));setTimeout(msFit,50);setTimeout(msFit,350);}
function msClose(){if(!MS.on)return;MS.on=false;const pg=$('msearch');pg.classList.remove('on');document.body.classList.remove('ms-on');closeDD();const i=$('ms_inp');i.blur();window.scrollTo(0,0);}
function msInit(){if($('msearch'))return;const pg=document.createElement('div');pg.id='msearch';pg.setAttribute('role','dialog');pg.setAttribute('aria-label','搜索地点');
 pg.innerHTML='<div class="ms-top"><button id="ms_back" aria-label="返回"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div class="ms-box"><svg class="ms-mag" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 16l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><input id="ms_inp" type="search" enterkeyhint="search" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"><button id="ms_clr" aria-label="清除"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="currentColor"/><path d="M9 9l6 6M15 9l-6 6" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg></button></div><button id="ms_cancel">取消</button></div>'
  +'<div class="ms-acts"><button id="ms_loc"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5" fill="currentColor"/><circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg><span>我的位置</span></button><button id="ms_pick"><svg viewBox="0 0 24 24"><path d="M12 21s-6-5.6-6-11a6 6 0 0112 0c0 5.4-6 11-6 11z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="10" r="2.2" fill="currentColor"/></svg><span>在地图上选点</span></button></div><div id="ms_list"></div>';
 document.body.appendChild(pg);
 const st=document.createElement('style');st.textContent=`#msearch{display:none}
#msearch.on{display:flex;flex-direction:column;position:fixed;left:0;right:0;top:0;height:100%;z-index:3000;background:#faf8f4;color:#222;font-family:var(--font,-apple-system,"PingFang SC",sans-serif);padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right);overscroll-behavior:contain;touch-action:pan-y}
#msearch .ms-top{flex:none;display:flex;align-items:center;gap:4px;padding:calc(env(safe-area-inset-top) + 6px) 8px 6px 4px;border-bottom:.5px solid rgba(0,0,0,.08)}
#msearch .ms-top>button{flex:none;height:44px;min-width:44px;border:0;background:none;color:var(--sage,#5f7f64);font:500 16px/1 inherit;display:flex;align-items:center;justify-content:center;padding:0 6px}
#msearch #ms_back svg{width:24px;height:24px}
#msearch .ms-box{flex:1;min-width:0;display:flex;align-items:center;height:40px;border-radius:12px;background:rgba(0,0,0,.055);padding:0 2px 0 10px}
#msearch .ms-mag{flex:none;width:18px;height:18px;color:#8a8a8a}
#msearch #ms_inp{flex:1;min-width:0;height:40px;border:0;background:none;outline:0;font-size:16px;color:inherit;padding:0 6px;-webkit-appearance:none;appearance:none}
#msearch #ms_inp::-webkit-search-cancel-button{display:none}
#msearch #ms_clr{flex:none;width:36px;height:40px;border:0;background:none;color:#b8b8b8;display:flex;align-items:center;justify-content:center;padding:0}
#msearch #ms_clr svg{width:18px;height:18px}
#msearch .ms-acts{flex:none;display:flex;gap:8px;padding:8px 12px;border-bottom:.5px solid rgba(0,0,0,.06)}
#msearch .ms-acts button{flex:1;height:44px;border:0;border-radius:12px;background:var(--sagebg,rgba(95,127,100,.1));color:var(--sage,#5f7f64);font:600 14px/1 inherit;display:flex;align-items:center;justify-content:center;gap:6px}
#msearch .ms-acts svg{width:18px;height:18px}
#msearch #ms_list{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:2px 4px calc(env(safe-area-inset-bottom) + 8px)}
#msearch #acdd.inms{position:static!important;max-height:none!important;width:auto!important;box-shadow:none!important;background:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;border-radius:0!important;overflow:visible!important;font-size:15px}
#msearch #acdd.inms .aci{min-height:54px;padding:8px 6px 8px 12px;border-bottom:.5px solid rgba(0,0,0,.06);border-radius:0}
#msearch #acdd.inms .acn{font-size:15px}#msearch #acdd.inms .aca{font-size:12.5px}#msearch #acdd.inms .ach{padding:10px 12px 4px;font-size:12px}
#msearch #acdd.inms .acs{width:44px;height:44px}
body.ms-on #acdd:not(.inms){display:none!important}`;document.head.appendChild(st);
 const i=$('ms_inp');bindAC('msx',i);
 $('ms_back').onclick=$('ms_cancel').onclick=()=>msClose();
 $('ms_clr').onmousedown=e=>e.preventDefault();$('ms_clr').onclick=()=>{i.value='';i.focus();i.dispatchEvent(new Event('input'));};
 i.addEventListener('keydown',e=>{if(e.key==='Enter'&&!(dd&&dd.style.display!=='none'&&ddList.length&&!ddList[0].complete)){e.preventDefault();const v=i.value.trim();if(v){msApply(v,...(lookup(v)||[null,null]));}msClose();}else if(e.key==='Escape')msClose();});
 $('ms_loc').onclick=()=>{myLoc('msx');msClose();};
 $('ms_pick').onclick=()=>{const f=MS.f==='viarow'?'via':MS.f;msClose();if(f==='via'){window.__viaPickEl=MS.el;}startPick(f);};
 if(window.visualViewport){visualViewport.addEventListener('resize',msFit);visualViewport.addEventListener('scroll',msFit);}addEventListener('resize',msFit);
 // 手机上点任何地点输入框 → 打开搜索页（不在原位弹键盘）
 const hook=(el,field)=>{if(el.__msHook)return;el.__msHook=1;
  el.addEventListener('pointerdown',e=>{if(!isMobUI())return;e.preventDefault();},true);
  el.addEventListener('click',e=>{if(!isMobUI())return;e.preventDefault();msOpen(el,field);},true);
  el.addEventListener('focus',()=>{if(isMobUI()&&!MS.on)msOpen(el,field);});};
 hook($('from'),'from');hook($('to'),'to');window.__msHook=hook;
 new MutationObserver(()=>document.querySelectorAll('.viarow input, #vias input').forEach(e=>hook(e,'viarow'))).observe(document.body,{childList:true,subtree:true});
 window.__ms=MS;window.msOpen=msOpen;window.msClose=msClose;}
function init(){try{const ll=JSON.parse(new URLSearchParams(location.search).get('ll')||'{}');for(const k in ll)if(Array.isArray(ll[k])&&ll[k].length===2&&isFinite(ll[k][0])&&isFinite(ll[k][1]))PICK[k]=[+ll[k][0],+ll[k][1]];window.__pick=PICK;}catch(_){}
['from','to','via'].forEach(f=>bindAC(f));const fixC=()=>['from','to'].forEach(async f=>{const v=$(f).value.trim(),c=coord(v);if(!c||fixC[v])return;fixC[v]=1;PICK[v]=c;const n=await reverse(c[0],c[1]);fixC[v]=0;if($(f).value.trim()===v){setField(f,n,c[0],c[1]);}});[800,2500,5000,9000].forEach(t=>setTimeout(fixC,t));['from','to'].forEach(f=>$(f).addEventListener('change',()=>setTimeout(fixC,50)));window.__fixCoordFields=fixC;
 document.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>startPick(b.dataset.pick));$('myloc').onclick=()=>myLoc('from');msInit();
 $('tdtk').value=localStorage.getItem('tdtKey')||'';$('tdtk').placeholder='已内置默认 key，可填自己的覆盖';$('tdtk').onchange=e=>{localStorage.setItem('tdtKey',e.target.value.trim());};
 MAPAPI.onClick(onMapClick);}
window.ADDR={bindInput:el=>{bindAC('viarow',el);if(window.__msHook)__msHook(el,'viarow');},search,parse,remember,toggleFav,recents,favs,reverse,lookup,init,routeSet,PICK,variants,get pickMode(){return pickMode}};
})();
