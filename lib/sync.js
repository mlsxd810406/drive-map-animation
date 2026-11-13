/* 云同步（Supabase）：采集码配对，手机采集的节点+照片同步到电脑。默认关闭；SDK/网络失败不影响页面。 */
(()=>{
'use strict';
const SB_URL='https://wtfidaspbwonmqpjlwea.supabase.co',SB_KEY='sb_publishable_n5fH-kq9NOOstdJRKVtlOg_dZCwDmVl',BUCKET='dm-photos',TABLE='dm_nodes';
const SDK=['lib/supabase.min.js?v=2.119.0','https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/dist/umd/supabase.min.js','https://unpkg.com/@supabase/supabase-js@2.119.0/dist/umd/supabase.min.js'];
const ALPH='23456789ABCDEFGHJKMNPQRSTUVWXYZ',LS='dm_sync_code',LSON='dm_sync_on';
const $=id=>document.getElementById(id);
const toast=(t,c)=>{try{window.ntoast?ntoast(t,c?{color:c}:{}):(window.msg&&msg(t));}catch(_){}};
const isMob=()=>document.body.classList.contains('mob');
const norm=s=>String(s||'').toUpperCase().replace(/[^0-9A-Z]/g,'');
const valid=c=>c.length>=8&&c.length<=16&&[...c].every(ch=>ALPH.includes(ch));
const fmtCode=c=>c.length===10?c.slice(0,5)+' '+c.slice(5):c.replace(/(.{4})(?=.)/g,'$1 ');
function genCode(n=10){const a=new Uint32Array(n);crypto.getRandomValues(a);return [...a].map(x=>ALPH[x%ALPH.length]).join('');}
// ---- hash ----
const HC=new Map();
function hash(s){if(HC.has(s))return HC.get(s);let a=0x811c9dc5,b=0x01000193^s.length;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b^c,0x5bd1e995)^(b>>>15);}const h=(a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');if(HC.size>800)HC.clear();HC.set(s,h);return h;}
const phs=n=>(Array.isArray(n.photos)?n.photos:[]).map(p=>typeof p==='string'?hash(p):'');
const sigOf=n=>hash(JSON.stringify([+n.lat,+n.lon,n.title||'',n.note||'',n.icon||'',n.color||'',+n.dwell||0,phs(n)]));
// ---- idb (独立库，不碰 drivemap) ----
let _db=null;
function db(){if(_db)return _db;_db=new Promise((res,rej)=>{const r=indexedDB.open('drivego_sync',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>{const d=r.result;d.onversionchange=()=>{d.close();_db=null;};res(d);};r.onerror=()=>{_db=null;rej(r.error);};});return _db;}
async function iget(k){try{const d=await db();return await new Promise(r=>{const q=d.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>r(q.result);q.onerror=()=>r(undefined);});}catch(e){return undefined;}}
async function iput(k,v){try{const d=await db();await new Promise(r=>{const t=d.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=r;t.onerror=r;t.onabort=r;});}catch(e){}}
// ---- state ----
let code=localStorage.getItem(LS)||'',on=localStorage.getItem(LSON)==='1'&&valid(code);
let S={st:{},dirty:[],lastPull:''};  // st[nid]={sig,ph:{hash:path},up,local,at}
let loadedFor=null,snap=null,busy=null,err='',lastOk=0,client=null,sdkP=null;
const deviceName=()=>(isMob()?'手机':'电脑')+' · '+((navigator.userAgent.match(/iPhone|iPad|Android|Mac OS X|Windows|Linux/)||['?'])[0]);
async function loadState(){if(loadedFor===code)return;const v=await iget('s:'+code);S=v&&v.st?v:{st:{},dirty:[],lastPull:''};loadedFor=code;}
let _sv=null;function saveState(){clearTimeout(_sv);_sv=setTimeout(()=>iput('s:'+loadedFor,S),150);}
const saveStateNow=()=>{clearTimeout(_sv);return iput('s:'+loadedFor,S);};
const getNodes=()=>{try{return nodes;}catch(e){return [];}};
// ---- SDK ----
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=res;s.onerror=()=>{s.remove();rej(new Error('load '+src));};document.head.appendChild(s);setTimeout(()=>rej(new Error('timeout')),15000);});}
async function sdk(){if(window.supabase&&window.supabase.createClient)return window.supabase;if(!sdkP)sdkP=(async()=>{for(const u of SDK){try{await loadScript(u);if(window.supabase&&window.supabase.createClient)return window.supabase;}catch(e){}}sdkP=null;throw new Error('无法加载同步组件');})();return sdkP;}
async function cli(){if(client&&client.__code===code)return client;const sb=await sdk();client=sb.createClient(SB_URL,SB_KEY,{global:{headers:{'x-sync-code':code}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'dm-sync-auth'}});client.__code=code;return client;}
// ---- 变更检测 ----
function scan(){if(!on||loadedFor!==code)return;const ns=getNodes(),ids=new Set(),d=new Set(S.dirty);
 for(const n of ns){if(!n||!n.id)continue;ids.add(n.id);const st=S.st[n.id];if(st&&st.local)continue;if(!st||st.sig!==sigOf(n))d.add(n.id);}
 if(snap)for(const id of snap)if(!ids.has(id)){const st=S.st[id];if(st&&!st.local)d.add(id);}
 snap=ids;const before=S.dirty.length;S.dirty=[...d];if(S.dirty.length!==before)saveState();ui();}
let _sc=null;function schedule(ms=900){if(!on)return;clearTimeout(_sc);_sc=setTimeout(()=>{scan();flush().catch(()=>{});},ms);}
// ---- 照片 ----
function dataToBlob(u){const m=/^data:([^;,]+)?(;base64)?,(.*)$/s.exec(u);if(!m)return null;const mime=m[1]||'application/octet-stream';let bytes;if(m[2]){const b=atob(m[3]);bytes=new Uint8Array(b.length);for(let i=0;i<b.length;i++)bytes[i]=b.charCodeAt(i);}else bytes=new TextEncoder().encode(decodeURIComponent(m[3]));return new Blob([bytes],{type:mime});}
async function toJpeg(blob){const url=URL.createObjectURL(blob);try{const im=await new Promise((r,j)=>{const i=new Image();i.onload=()=>r(i);i.onerror=j;i.src=url;});const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;c.getContext('2d').drawImage(im,0,0);return await new Promise(r=>c.toBlob(r,'image/jpeg',.9));}finally{URL.revokeObjectURL(url);}}
const blobToData=b=>new Promise((r,j)=>{const f=new FileReader();f.onload=()=>r(f.result);f.onerror=()=>j(f.error);f.readAsDataURL(b);});
const EXT={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
async function uploadPhoto(c,nid,p,h){let b=dataToBlob(p);if(!b)throw new Error('bad photo');if(!EXT[b.type])b=await toJpeg(b);if(b.size>10*1024*1024)b=await toJpeg(b);const path=code+'/'+nid+'/'+h+'.'+EXT[b.type];
 const {error}=await c.storage.from(BUCKET).upload(path,b,{contentType:b.type,upsert:false,cacheControl:'31536000'});
 if(error&&!/exist|duplicate|409/i.test((error.message||'')+' '+(error.statusCode||error.status||'')))throw error;return path;}
// ---- 上传 ----
async function flush(){if(!on)return;if(busy)return busy;busy=(async()=>{await loadState();if(!S.dirty.length){ui();return;}if(!navigator.onLine){err='离线';ui();return;}
 const c=await cli();let fails=0;
 for(const nid of [...S.dirty]){if(!on||loadedFor!==code)break;try{const n=getNodes().find(x=>x.id===nid),st=S.st[nid];const now=new Date().toISOString();
  if(!n){if(st&&st.up){const {error}=await c.from(TABLE).update({deleted:true,updated_at:now,device:deviceName()}).eq('code',code).eq('nid',nid);if(error)throw error;}delete S.st[nid];}
  else{const sig=sigOf(n),ph=Object.assign({},st&&st.ph||{}),hs=phs(n),paths=[];const pl=Array.isArray(n.photos)?n.photos:[];
   for(let i=0;i<pl.length;i++){const p=pl[i],h=hs[i];if(typeof p!=='string')continue;if(!/^data:/.test(p)){paths.push(p);continue;}if(!ph[h])ph[h]=await uploadPhoto(c,nid,p,h);paths.push(ph[h]);}
   const keep={};hs.forEach(h=>{if(ph[h])keep[h]=ph[h];});
   const row={code,nid,lat:+n.lat,lon:+n.lon,title:n.title||'',note:n.note||'',icon:n.icon||'',color:n.color||'',dwell:+n.dwell||0,photos:paths,created_at:n.createdAt?new Date(+n.createdAt).toISOString():null,updated_at:now,deleted:false,device:deviceName()};
   const {error}=await c.from(TABLE).upsert(row,{onConflict:'code,nid'});if(error)throw error;
   S.st[nid]={sig,ph:keep,up:true,at:Date.parse(now)};
   if(sigOf(n)!==sig)continue;}
  S.dirty=S.dirty.filter(x=>x!==nid);saveState();ui();}catch(e){fails++;err=(e&&e.message)||'上传失败';console.warn('[sync] push',nid,e);}}
 await saveStateNow();if(!fails){err='';lastOk=Date.now();}ui();})().finally(()=>{busy=null;ui();});return busy;}
// ---- 拉取 ----
let pulling=null;
async function pull(opt={}){if(!on)throw new Error('未开启云同步');if(pulling)return pulling;pulling=(async()=>{await loadState();scan();try{await flush();}catch(e){}
 if(!navigator.onLine)throw new Error('当前离线');const c=await cli();
 const since=opt.all||!S.lastPull?'1970-01-01T00:00:00Z':new Date(Date.parse(S.lastPull)-3600e3).toISOString();
 let rows=[];for(let from=0;;from+=500){const {data,error}=await c.from(TABLE).select('*').eq('code',code).gt('updated_at',since).order('updated_at',{ascending:true}).range(from,from+499);if(error)throw error;rows=rows.concat(data||[]);if(!data||data.length<500)break;}
 let added=0,updated=0,removed=0,photos=0,failed=0,maxAt=S.lastPull||'',okUpTo=true;const dset=new Set(S.dirty);
 for(const r of rows){const nid=r.nid,at=Date.parse(r.updated_at),st=S.st[nid];const ns=getNodes();const idx=ns.findIndex(x=>x.id===nid),loc=idx>=0?ns[idx]:null;
  if(st&&st.local){continue;}
  const done=()=>{if(okUpTo&&(!maxAt||at>Date.parse(maxAt)))maxAt=r.updated_at;};
  if(dset.has(nid)&&loc){done();continue;}           // 本地有未上传改动：本地优先
  if(st&&st.at&&st.at>=at&&loc&&st.sig===sigOf(loc)){done();continue;} // 已是最新
  if(r.deleted){if(loc){ns.splice(idx,1);removed++;}delete S.st[nid];if(snap)snap.delete(nid);done();continue;}
  const have={};if(loc)(loc.photos||[]).forEach(p=>{if(typeof p==='string')have[hash(p)]=p;});
  const ph={},out=[];let bad=false;
  for(const path of (Array.isArray(r.photos)?r.photos:[])){if(typeof path!=='string')continue;if(/^(data:|https?:)/.test(path)){out.push(path);continue;}
   const fh=(path.split('/').pop()||'').split('.')[0];if(have[fh]){out.push(have[fh]);ph[fh]=path;continue;}
   try{const {data,error}=await c.storage.from(BUCKET).download(path);if(error||!data)throw error||new Error('no data');let b=data;if(!b.type||b.type==='application/octet-stream'){const ext=path.split('.').pop();b=new Blob([b],{type:ext==='png'?'image/png':ext==='webp'?'image/webp':'image/jpeg'});}
    const du=await blobToData(b);out.push(du);ph[hash(du)]=path;photos++;}catch(e){bad=true;console.warn('[sync] photo',path,e);}}
  if(bad){failed++;okUpTo=false;continue;}
  const o=loc||{id:nid};Object.assign(o,{lat:+r.lat,lon:+r.lon,title:r.title||'',note:r.note||'',dwell:r.dwell==null?5:+r.dwell,icon:r.icon||'camera',color:r.color||'#e91e63',photos:out});
  if(r.created_at&&!o.createdAt)o.createdAt=Date.parse(r.created_at);
  if(!loc){ns.push(o);added++;}else updated++;
  S.st[nid]={sig:sigOf(o),ph,up:true,at};if(snap)snap.add(nid);done();}
 if(maxAt)S.lastPull=maxAt;await saveStateNow();
 if(added||updated||removed){try{rebuildStops();}catch(e){}try{renderList();}catch(e){}try{await __origSave();}catch(e){}}
 err=failed?'部分照片未下载':'';lastOk=Date.now();ui();return {added,updated,removed,photos,failed,total:getNodes().length};})().finally(()=>{pulling=null;ui();});return pulling;}
// ---- 开关 ----
async function enable(c0,opt={}){const c=norm(c0);if(!valid(c))throw new Error('采集码需 8–16 位字母数字');code=c;localStorage.setItem(LS,c);client=null;loadedFor=null;await loadState();
 const ns=getNodes();const fresh=ns.filter(n=>n&&n.id&&!S.st[n.id]);
 let up=opt.uploadExisting;if(up===undefined)up=!fresh.length||confirm('把本机已有的 '+fresh.length+' 个节点也上传到云端？\n选“取消”则只同步之后新增的节点。');
 if(!up)fresh.forEach(n=>{S.st[n.id]={local:true};});
 snap=null;on=true;localStorage.setItem(LSON,'1');await saveStateNow();scan();ui();
 try{await flush();}catch(e){}if(opt.pull!==false)pull().then(r=>{if(r&&(r.added||r.updated||r.removed))toast('已从云端同步 '+(r.added+r.updated)+' 个节点','#43a047');}).catch(e=>{err=e.message||'拉取失败';ui();});return true;}
function disable(){on=false;localStorage.setItem(LSON,'0');err='';ui();}
// ---- hook saveNodes ----
const __origSave=window.saveNodes;
if(typeof __origSave==='function'){window.saveNodes=function(){const r=__origSave.apply(this,arguments);try{schedule();}catch(e){}return r;};}
// ---- UI ----
const ICO='<svg class="i" viewBox="0 0 24 24"><path d="M7 18a4.5 4.5 0 01-.6-8.96A6 6 0 0118 8.5a4 4 0 01-.5 9.5z"/><path d="M12 11v5M9.8 13.2L12 11l2.2 2.2"/></svg>';
const css=`
.syb{font-style:normal;font-size:12px;font-weight:600;margin-left:auto;padding:2px 8px;border-radius:10px;background:#eef0f3;color:#6b7280;white-space:nowrap}
.syb.ok{background:#e8f5e9;color:#2e7d32}.syb.pend{background:#fff4e5;color:#b26a00}.syb.bad{background:#fdecea;color:#c62828}
#m_sync>span{flex:1;text-align:left}#m_sync .syb{margin-left:0}#m_sync::after{margin-left:8px!important}
#syncbg{position:fixed;inset:0;background:rgba(20,18,15,.38);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);z-index:100000;display:none;align-items:center;justify-content:center}
#syncbg.on{display:flex}
#syncm{width:min(380px,calc(100vw - 28px));max-height:calc(100vh - 40px);overflow:auto;background:#fff;border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.28);padding:18px 18px 14px;font-size:14px;color:#1d1d1f;box-sizing:border-box}
body.mob #syncbg{align-items:flex-end}body.mob #syncm{width:100vw;border-radius:18px 18px 0 0;padding:18px 18px calc(16px + env(safe-area-inset-bottom));max-height:88vh}
#syncm h3{margin:0 0 4px;font-size:18px;font-weight:650;display:flex;align-items:center;gap:8px}
#syncm h3 .x{margin-left:auto;border:0;background:#f1f1f4;width:30px;height:30px;border-radius:15px;font-size:17px;color:#666;cursor:pointer}
#syncm .sub{color:#6e6e73;font-size:13px;line-height:1.5;margin:0 0 12px}
#syncm .code{font:700 26px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:2px;text-align:center;background:#f5f5f7;border-radius:12px;padding:12px 8px;margin:0 0 10px;user-select:all}
#syncm .qrw{display:flex;justify-content:center;margin:0 0 6px}#syncm canvas{width:156px;height:156px;border-radius:10px}
#syncm .qh{text-align:center;color:#8e8e93;font-size:12px;margin:0 0 12px}
#syncm .st{display:flex;align-items:center;gap:8px;background:#f5f5f7;border-radius:12px;padding:10px 12px;margin:0 0 12px;font-size:13px;color:#3a3a3c}
#syncm .st .dot{width:8px;height:8px;border-radius:4px;background:#9aa0a6;flex:none}#syncm .st.ok .dot{background:#34c759}#syncm .st.pend .dot{background:#ff9f0a}#syncm .st.bad .dot{background:#ff3b30}
#syncm .b{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;min-height:46px;border:0;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;margin:0 0 8px;background:#f1f1f4;color:#1d1d1f}
#syncm .b.pri{background:#0a84ff;color:#fff}#syncm .b:disabled{opacity:.55;cursor:default}
#syncm .row2{display:flex;gap:8px}#syncm .row2 .b{flex:1}
#syncm .lnk{display:block;width:100%;border:0;background:none;color:#ff3b30;font-size:14px;padding:8px 0 2px;cursor:pointer}
#syncm .lnk.g{color:#0a84ff}
#syncm input{width:100%;box-sizing:border-box;height:46px;border:1px solid #d2d2d7;border-radius:12px;padding:0 12px;font:600 18px ui-monospace,Menlo,Consolas,monospace;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 8px;outline:none}
#syncm input:focus{border-color:#0a84ff;box-shadow:0 0 0 3px rgba(10,132,255,.18)}
#syncm .warn{font-size:12px;color:#8e8e93;line-height:1.5;margin:6px 0 0}`;
function statusInfo(){if(!on)return {cls:'',t:'未开启',badge:''};const n=S.dirty.length;if(busy||pulling)return {cls:'pend',t:pulling?'正在从云端拉取…':'正在上传…',badge:n?'待同步 '+n:'同步中'};
 if(err)return {cls:n?'bad':'bad',t:(err==='离线'?'离线，有网后自动补传':'同步出错：'+err)+(n?'（待同步 '+n+'）':''),badge:n?'待同步 '+n:'出错'};
 if(n)return {cls:'pend',t:'待同步 '+n+' 个节点',badge:'待同步 '+n};return {cls:'ok',t:'已同步'+(lastOk?' · '+new Date(lastOk).toTimeString().slice(0,5):''),badge:'已同步'};}
function ui(){const s=statusInfo();document.querySelectorAll('.syb').forEach(b=>{b.textContent=s.badge;b.className='syb '+s.cls;b.style.display=s.badge?'':'none';});if($('syncbg')&&$('syncbg').classList.contains('on'))render();}
function pairUrl(){return location.origin+location.pathname+'#sync='+code;}
function drawQR(cv,txt){try{const q=qrcode(0,'M');q.addData(txt,'Byte');q.make();const n=q.getModuleCount(),px=6,m=3,sz=(n+m*2)*px;cv.width=cv.height=sz;const g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,sz,sz);g.fillStyle='#1d1d1f';for(let r=0;r<n;r++)for(let k=0;k<n;k++)if(q.isDark(r,k))g.fillRect((k+m)*px,(r+m)*px,px,px);}catch(e){cv.style.display='none';}}
let view='main';
function render(){const m=$('syncm');if(!m)return;const s=statusInfo();
 const head='<h3>'+ICO.replace('class="i"','width="22" height="22" fill="none" stroke="#0a84ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"')+'云同步<button class="x" id="sy_x" aria-label="关闭">×</button></h3>';
 if(!on||view==='set'){const pre=view==='set'?norm($('sy_in')&&$('sy_in').value||''):'';
  m.innerHTML=head+'<p class="sub">手机和电脑用<b>同一个采集码</b>，手机上新增的节点和照片会自动上传，电脑上点“从云端拉取”即可看到。</p>'+
  '<input id="sy_in" placeholder="输入采集码" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="20" value="'+(pre||(view==='set'?'':code))+'">'+
  '<button class="b pri" id="sy_on">使用此采集码开启</button><button class="b" id="sy_gen">生成新采集码</button>'+(view==='set'?'<button class="lnk g" id="sy_back">返回</button>':'')+
  '<p class="warn">采集码相当于这份数据的钥匙，知道它的人就能查看和修改，请勿公开。分享路线链接不会带上采集码。</p>';}
 else{m.innerHTML=head+'<div class="code" id="sy_code">'+fmtCode(code)+'</div>'+
  (isMob()?'':'<div class="qrw"><canvas id="sy_qr"></canvas></div><div class="qh">用手机相机扫码，即可在手机上配对</div>')+
  '<div class="st '+s.cls+'" id="sy_st"><span class="dot"></span><span>'+s.t+'</span></div>'+
  '<button class="b pri" id="sy_pull"'+(pulling?' disabled':'')+'>从云端拉取</button>'+
  '<div class="row2"><button class="b" id="sy_push"'+(busy?' disabled':'')+'>立即上传</button><button class="b" id="sy_copy">复制采集码</button></div>'+
  '<div class="row2"><button class="lnk g" id="sy_chg">更换采集码</button><button class="lnk" id="sy_off">关闭同步</button></div>';
  if($('sy_qr'))drawQR($('sy_qr'),pairUrl());}
 const B=(id,f)=>{const e=$(id);if(e)e.onclick=f;};
 B('sy_x',close);
 B('sy_gen',()=>{$('sy_in').value=fmtCode(genCode());});
 B('sy_back',()=>{view='main';render();});
 B('sy_on',async()=>{const c=norm($('sy_in').value);if(!valid(c)){toast('采集码需 8–16 位（不含 0/O/1/I/L）','#e53935');return;}view='main';try{await enable(c);toast('云同步已开启','#43a047');}catch(e){toast(e.message||'开启失败','#e53935');}render();});
 B('sy_pull',async()=>{try{const p=pull({all:false});render();const r=await p;toast(r.added||r.updated||r.removed?'拉取完成：新增 '+r.added+'，更新 '+r.updated+(r.removed?'，删除 '+r.removed:'')+(r.failed?'，'+r.failed+' 个未完成':''):'云端没有新数据','#43a047');}catch(e){err=e.message||'拉取失败';toast('拉取失败：'+err,'#e53935');}ui();});
 B('sy_push',async()=>{scan();const p=flush();render();await p;toast(S.dirty.length?'还有 '+S.dirty.length+' 个待同步':'已全部上传',S.dirty.length?'#ff9f0a':'#43a047');});
 B('sy_copy',async()=>{try{await navigator.clipboard.writeText(code);toast('已复制采集码','#43a047');}catch(e){toast('采集码：'+code);}});
 B('sy_chg',()=>{view='set';render();const i=$('sy_in');if(i){i.value='';i.focus();}});
 B('sy_off',()=>{if(confirm('关闭云同步？本机数据不会删除，云端数据也保留。')){disable();render();}});
 const inp=$('sy_in');if(inp){inp.oninput=()=>{const p=inp.selectionStart;inp.value=inp.value.toUpperCase();try{inp.setSelectionRange(p,p);}catch(e){}};inp.onkeydown=e=>{if(e.key==='Enter')$('sy_on').click();};}}
function open(){if(!$('syncbg')){const bg=document.createElement('div');bg.id='syncbg';bg.innerHTML='<div id="syncm" role="dialog" aria-label="云同步"></div>';bg.onclick=e=>{if(e.target===bg)close();};document.body.appendChild(bg);}
 view='main';$('syncbg').classList.add('on');render();if(on){loadState().then(()=>{scan();ui();});}}
function close(){const b=$('syncbg');if(b)b.classList.remove('on');}
function mount(){const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
 const add=(anchor,id,cls,style)=>{const a=$(anchor);if(!a||$(id))return;const b=document.createElement('button');b.id=id;b.className=cls;if(style)b.style.cssText=style;b.innerHTML=ICO+'<span>云同步</span><em class="syb" style="display:none"></em>';b.onclick=open;a.after(b);};
 add('ncole','nsync','btn','width:100%;margin:0 0 6px;display:flex;align-items:center;gap:6px');
 add('m_cole','m_sync','bt');ui();}
// ---- 配对链接 #sync=CODE ----
function fromHash(){const m=/[#&]sync=([0-9A-Za-z-]+)/.exec(location.hash);if(!m)return;const c=norm(m[1]);try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}
 if(!valid(c))return;if(on&&c===code){toast('已在使用该采集码');return;}
 const go=()=>{if(confirm('使用采集码 '+fmtCode(c)+' 开启云同步？'))enable(c).then(()=>toast('云同步已开启','#43a047')).catch(e=>toast(e.message||'开启失败','#e53935'));};
 (window.__ready&&window.__ready.then?window.__ready:Promise.resolve()).then(()=>setTimeout(go,300),()=>setTimeout(go,300));}
// ---- 自动重试/拉取 ----
addEventListener('online',()=>{if(on){err='';schedule(300);}});
document.addEventListener('visibilitychange',()=>{if(on&&document.visibilityState==='visible'){schedule(300);pull().catch(()=>{});}});
setInterval(()=>{if(on&&document.visibilityState==='visible'&&S.dirty.length&&!busy)flush().catch(()=>{});},30000);
window.DMSync={enable,disable,flush,pull,scan:()=>{scan();return S.dirty.length;},open,close,genCode,get code(){return code;},get on(){return on;},get pending(){return S.dirty.length;},get error(){return err;},get state(){return S;}};
function boot(){mount();fromHash();if(on){(window.__ready&&window.__ready.then?window.__ready:Promise.resolve()).catch(()=>{}).then(async()=>{await loadState();scan();flush().catch(()=>{});pull().catch(e=>{err=e.message||'';ui();});});}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
