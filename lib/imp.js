// ===== 电脑：导入数据（KML/KMZ、GeoJSON/JSON、Shapefile、GPX），图层显示/开关/删除，持久化；用作路线、点转节点 =====
(()=>{const B=document.body,ML=!!window.maplibregl;if(typeof map==='undefined')return;
 const pc=()=>!B.classList.contains('mob')&&!matchMedia('(hover:none)').matches;
 const COL=['#7b1fa2','#00838f','#c2185b','#2e7d32','#ef6c00','#3949ab'];
 const esc=t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const loadJS=src=>new Promise((res,rej)=>{if(document.querySelector('script[data-l="'+src+'"]'))return res();const s=document.createElement('script');s.src=src+(window.__libv?'?v='+__libv:'');s.dataset.l=src;s.onload=res;s.onerror=()=>rej(Error('加载 '+src+' 失败'));document.head.appendChild(s);});
 const libs={kml:()=>loadJS('lib/togeojson.js'),zip:()=>loadJS('lib/jszip.min.js'),shp:()=>loadJS('lib/shp.min.js'),proj:()=>loadJS('lib/proj4.js')};
 let layers=[];const vis={};
 // ---------- 坐标系 ----------
 const defCRS=()=>{const P=window.proj4;if(!P||P.__dm)return;P.__dm=1;P.defs('EPSG:4490','+proj=longlat +ellps=GRS80 +no_defs');
  const gk=(code,lon0,fe)=>P.defs('EPSG:'+code,'+proj=tmerc +lat_0=0 +lon_0='+lon0+' +k=1 +x_0='+fe+' +y_0=0 +ellps=GRS80 +units=m +no_defs');
  for(let z=25;z<=45;z++){gk(4513+z-25,z*3,z*1e6+5e5);gk(4534+z-25,z*3,5e5);}for(let z=13;z<=23;z++){gk(4491+z-13,z*6-3,z*1e6+5e5);gk(4502+z-13,z*6-3,5e5);}
  for(let z=1;z<=60;z++){P.defs('EPSG:'+(32600+z),'+proj=utm +zone='+z+' +datum=WGS84 +units=m +no_defs');P.defs('EPSG:'+(32700+z),'+proj=utm +zone='+z+' +south +datum=WGS84 +units=m +no_defs');}};
 const mapCoords=(g,f)=>{if(!g)return g;const m=c=>typeof c[0]==='number'?f(c):c.map(m);if(g.type==='GeometryCollection')return {...g,geometries:g.geometries.map(x=>mapCoords(x,f))};return {...g,coordinates:m(g.coordinates)};};
 const eachC=(g,f)=>{if(!g)return;const m=c=>typeof c[0]==='number'?f(c):c.forEach(m);if(g.type==='GeometryCollection')g.geometries.forEach(x=>eachC(x,f));else m(g.coordinates);};
 const isGeo=fc=>{let ok=true,n=0;for(const ft of fc.features){eachC(ft.geometry,c=>{n++;if(Math.abs(c[0])>180.0001||Math.abs(c[1])>90.0001)ok=false;});if(!ok||n>2000)break;}return ok;};
 const reproj=async(fc,src)=>{await libs.proj();defCRS();const t=proj4(src,'EPSG:4326');fc.features=fc.features.map(ft=>({...ft,geometry:mapCoords(ft.geometry,c=>{const r=t.forward([c[0],c[1]]);return [r[0],r[1]];})}));return fc;};
 const guessGK=fc=>{let x=null;for(const ft of fc.features){eachC(ft.geometry,c=>{if(x==null)x=c[0];});if(x!=null)break;}if(x==null||x<1e6)return null;const z=Math.floor(x/1e6);if(z>=25&&z<=45)return 'EPSG:'+(4513+z-25);if(z>=13&&z<=23)return 'EPSG:'+(4491+z-13);return null;};
 // ---------- 解析 ----------
 const norm=d=>{if(!d)throw Error('文件里没有可识别的数据');if(d.type==='FeatureCollection')return {type:'FeatureCollection',features:d.features.filter(f=>f&&f.geometry)};if(d.type==='Feature')return {type:'FeatureCollection',features:[d]};if(d.type&&d.coordinates)return {type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:d}]};if(Array.isArray(d))return {type:'FeatureCollection',features:d.flatMap(x=>norm(x).features)};throw Error('不是 GeoJSON 格式');};
 const parseXML=t=>{const x=new DOMParser().parseFromString(t,'text/xml');if(x.getElementsByTagName('parsererror').length)throw Error('XML 格式有误');return x;};
 const fromKML=async t=>{await libs.kml();return norm(toGeoJSON.kml(parseXML(t)));};
 const fromGPX=async t=>{await libs.kml();return norm(toGeoJSON.gpx(parseXML(t)));};
 const fromGeoJSON=async t=>{let d;try{d=JSON.parse(t);}catch(e){throw Error('JSON 格式有误');}const fc=norm(d);const crs=d.crs&&d.crs.properties&&d.crs.properties.name;
  if(crs){const m=String(crs).match(/EPSG:*:?(\d{4,5})/i);if(m&&!['4326','4490','4979','4214'].includes(m[1])){window.__impCRS='EPSG:'+m[1];return reproj(fc,'EPSG:'+m[1]);}}
  if(!isGeo(fc)){const g=guessGK(fc);if(g){window.__impCRS=g+'(推断)';return reproj(fc,g);}throw Error('坐标不是经纬度，且无法判断坐标系（请附带 crs 或用 Shapefile+.prj）');}return fc;};
 const fromSHP=async(parts,name)=>{await libs.shp();const shpB=parts.shp;if(!shpB)throw Error('缺少 .shp 文件');let warn=[];let geoms=shp.parseShp(shpB);let props=null;
  if(parts.dbf){try{props=shp.parseDbf(parts.dbf,parts.cpg||'UTF-8');}catch(e){warn.push('属性表(.dbf)读取失败');}}else warn.push('缺少 .dbf，只导入图形不含属性');
  let fc={type:'FeatureCollection',features:geoms.map((g,i)=>({type:'Feature',properties:props&&props[i]||{},geometry:g}))};
  if(parts.prj){const w=parts.prj.trim();if(!/^GEOGCS/i.test(w)){window.__impCRS=(w.match(/PROJCS\["([^"]+)"/)||[])[1]||'投影坐标';await libs.proj();defCRS();try{fc=await reproj(fc,w);}catch(e){throw Error('无法识别 .prj 坐标系：'+((w.match(/PROJCS\["([^"]+)"/)||[])[1]||''));}}else window.__impCRS=(w.match(/GEOGCS\["([^"]+)"/)||[])[1]||'经纬度';}
  else if(!isGeo(fc)){const g=guessGK(fc);if(g){fc=await reproj(fc,g);warn.push('缺少 .prj，按 CGCS2000 高斯-克吕格带号推断');}else throw Error('缺少 .prj，坐标不是经纬度，无法确定坐标系');}
  else warn.push('缺少 .prj，按 WGS84 经纬度处理');
  fc.__warn=warn;return fc;};
 const txt=f=>f.text?f.text():new Response(f).text();
 async function parseFiles(files){const out=[];const shpGroups={};
  for(const f of files){const n=f.name||'数据',ext=(n.split('.').pop()||'').toLowerCase(),base=n.replace(/\.[^.]+$/,'');
   if(ext==='kml')out.push({name:base,fc:await fromKML(await txt(f))});
   else if(ext==='gpx')out.push({name:base,fc:await fromGPX(await txt(f))});
   else if(ext==='geojson'||ext==='json')out.push({name:base,fc:await fromGeoJSON(await txt(f))});
   else if(ext==='kmz'||ext==='zip'){await libs.zip();const z=await JSZip.loadAsync(await f.arrayBuffer());const names=Object.keys(z.files).filter(k=>!z.files[k].dir&&!/__MACOSX/.test(k));
    if(ext==='kmz'||names.some(k=>/\.kml$/i.test(k))&&!names.some(k=>/\.shp$/i.test(k))){const k=names.find(k=>/\.kml$/i.test(k));if(!k)throw Error('KMZ 里没有 KML');out.push({name:base,fc:await fromKML(await z.file(k).async('string'))});continue;}
    const shps=names.filter(k=>/\.shp$/i.test(k));if(!shps.length){const gj=names.find(k=>/\.(geo)?json$/i.test(k));if(gj){out.push({name:base,fc:await fromGeoJSON(await z.file(gj).async('string'))});continue;}throw Error('压缩包里没有 .shp / .kml / .geojson');}
    for(const s of shps){const b=s.replace(/\.shp$/i,'');const get=async(e,tp)=>{const k=names.find(x=>x.toLowerCase()===(b+'.'+e).toLowerCase());return k?z.file(k).async(tp):null;};
     out.push({name:b.split('/').pop(),fc:await fromSHP({shp:await get('shp','arraybuffer'),dbf:await get('dbf','arraybuffer'),prj:await get('prj','string'),cpg:((await get('cpg','string'))||'').trim()||null})});}}
   else if(['shp','dbf','prj','shx','cpg'].includes(ext)){(shpGroups[base]=shpGroups[base]||{})[ext]=ext==='prj'||ext==='cpg'?await txt(f):await f.arrayBuffer();}
   else throw Error('不支持的文件类型：.'+ext+'（支持 KML/KMZ、GeoJSON/JSON、Shapefile(.zip 或 .shp+.dbf+.prj)、GPX）');}
  for(const [b,p] of Object.entries(shpGroups)){if(!p.shp)throw Error('“'+b+'”缺少 .shp 文件');out.push({name:b,fc:await fromSHP({...p,cpg:(p.cpg||'').trim()||null})});}
  return out;}
 // ---------- 简化 ----------
 const MAXV=50000;const simplify=fc=>{let n=0;fc.features.forEach(f=>eachC(f.geometry,()=>n++));if(n<=MAXV)return {fc,n,simp:false};const k=Math.ceil(n/MAXV);
  const thin=a=>{if(a.length<=4)return a;const r=a.filter((_,i)=>i%k===0);if(r[r.length-1]!==a[a.length-1])r.push(a[a.length-1]);return r;};
  const sg=g=>{if(!g)return g;const t=g.type;if(t==='LineString')return {...g,coordinates:thin(g.coordinates)};if(t==='MultiLineString'||t==='Polygon')return {...g,coordinates:g.coordinates.map(thin)};if(t==='MultiPolygon')return {...g,coordinates:g.coordinates.map(p=>p.map(thin))};return g;};
  fc.features=fc.features.map(f=>({...f,geometry:sg(f.geometry)}));let m=0;fc.features.forEach(f=>eachC(f.geometry,()=>m++));return {fc,n,m,simp:true};};
 const bbox=fc=>{let w=180,s=90,e=-180,nn=-90;fc.features.forEach(f=>eachC(f.geometry,c=>{w=Math.min(w,c[0]);e=Math.max(e,c[0]);s=Math.min(s,c[1]);nn=Math.max(nn,c[1]);}));return [w,s,e,nn];};
 // ---------- 显示 ----------
 const popHTML=(p,name)=>{const ks=Object.keys(p||{}).filter(k=>p[k]!=null&&p[k]!==''&&typeof p[k]!=='object').slice(0,14);return '<div class="impop"><b>'+esc(p&&(p.name||p.NAME||p.Name||p['名称'])||name)+'</b>'+(ks.length?'<table>'+ks.map(k=>'<tr><td>'+esc(k)+'</td><td>'+esc(p[k])+'</td></tr>').join('')+'</table>':'')+'</div>';};
 const draw=L_=>{undraw(L_.id);if(!L_.on)return;const c=L_.color;
  if(!ML){vis[L_.id]=L.geoJSON(L_.fc,{style:()=>({color:c,weight:3,opacity:.9,dashArray:'7 5',fillColor:c,fillOpacity:.12}),pointToLayer:(f,ll)=>L.circleMarker(ll,{radius:6,color:'#fff',weight:2,fillColor:c,fillOpacity:1}),onEachFeature:(f,l)=>l.bindPopup(popHTML(f.properties,L_.name),{maxWidth:280})}).addTo(map);return;}
  const go=()=>{const s='imp_'+L_.id;if(map.getSource(s))return;map.addSource(s,{type:'geojson',data:L_.fc});
   map.addLayer({id:s+'_f',type:'fill',source:s,filter:['==',['geometry-type'],'Polygon'],paint:{'fill-color':c,'fill-opacity':.14}});
   map.addLayer({id:s+'_l',type:'line',source:s,filter:['!=',['geometry-type'],'Point'],paint:{'line-color':c,'line-width':3,'line-dasharray':[2,1.4],'line-opacity':.9}});
   map.addLayer({id:s+'_p',type:'circle',source:s,filter:['==',['geometry-type'],'Point'],paint:{'circle-radius':6,'circle-color':c,'circle-stroke-color':'#fff','circle-stroke-width':2}});
   [s+'_p',s+'_l',s+'_f'].forEach(id=>{map.on('click',id,e=>{if(e.__impDone)return;e.__impDone=1;const f=e.features&&e.features[0];if(!f)return;new maplibregl.Popup({maxWidth:'280px'}).setLngLat(e.lngLat).setHTML(popHTML(f.properties,L_.name)).addTo(map);});map.on('mouseenter',id,()=>map.getCanvas().style.cursor='pointer');map.on('mouseleave',id,()=>map.getCanvas().style.cursor='');});vis[L_.id]=s;};
  const tryGo=(k=0)=>{try{go();}catch(e){if(k<60)setTimeout(()=>tryGo(k+1),300);}};tryGo();};
 const undraw=id=>{const v=vis[id];if(!v)return;if(!ML)v.remove();else{['_p','_l','_f'].forEach(x=>{if(map.getLayer(v+x))map.removeLayer(v+x);});if(map.getSource(v))map.removeSource(v);}delete vis[id];};
 const fit=L_=>{const b=bbox(L_.fc);if(!(b[2]>=b[0]))return;if(ML)map.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:80,maxZoom:14,pitch:map.getPitch(),duration:0});else map.fitBounds([[b[1],b[0]],[b[3],b[2]]],{padding:[60,60],maxZoom:14,animate:false});};
 const save=async()=>{try{const db=await idb();db.transaction('kv','readwrite').objectStore('kv').put(JSON.parse(JSON.stringify(layers)),'implayers');}catch(e){}};
 const load=async()=>{try{const db=await idb();return await new Promise(r=>{const q=db.transaction('kv').objectStore('kv').get('implayers');q.onsuccess=()=>r(q.result||[]);q.onerror=()=>r([]);});}catch(e){return [];}};
 // ---------- 动作 ----------
 const lines=fc=>{const out=[];fc.features.forEach(f=>{const g=f.geometry;if(!g)return;if(g.type==='LineString')out.push(g.coordinates);else if(g.type==='MultiLineString')out.push(...g.coordinates);});return out;};
 const pts=fc=>fc.features.filter(f=>f.geometry&&f.geometry.type==='Point');
 const asRoute=L_=>{const ls=lines(L_.fc);if(!ls.length)return;let best=ls[0],bl=0;const len=a=>a.reduce((s,c,i)=>i?s+hav([a[i-1][1],a[i-1][0]],[c[1],c[0]]):0,0);ls.forEach(a=>{const l=len(a);if(l>bl){bl=l;best=a;}});
  const c=best.map(p=>[p[1],p[0]]);try{pause();}catch(_){}try{clearRouteStops();}catch(_){}resetAnim();setRoute(c,bl/70*3600,null);try{buildStops([]);}catch(_){}elev=[];try{drawProf(true);}catch(_){}try{rebuildStops();}catch(_){}
  try{setPlayEn&&setPlayEn(true);}catch(_){}fit(L_);window.__impRoute={n:c.length,km:Math.round(bl)};ntoast('已用“'+L_.name+'”作为路线 · '+Math.round(bl)+' km',{color:'#43a047'});};
 const toNodes=L_=>{const P=pts(L_.fc);if(!P.length)return;const added=[];window.__silentNode=1;window.__noPoi=1;try{P.slice(0,200).forEach(f=>{const p=f.properties||{};const n=newNode(f.geometry.coordinates[1],f.geometry.coordinates[0]);n.title=String(p.name||p.NAME||p.Name||p['名称']||'导入点').slice(0,30);n.note=String(p.description||p.desc||'').replace(/<[^>]+>/g,'').slice(0,120);added.push(n);});}finally{window.__silentNode=0;window.__noPoi=0;}
  rebuildStops();saveNodes();ntoast('已把 '+added.length+' 个点转为节点',{color:'#43a047',undo:()=>{added.forEach(n=>{const i=nodes.indexOf(n);if(i>=0)nodes.splice(i,1);});rebuildStops();saveNodes();ntoast('已撤销',{});}});};
 // ---------- 界面 ----------
 const st=document.createElement('style');st.textContent=`body.mob #bimp,body.mob #imppan{display:none!important}
#imppan{position:fixed;z-index:1600;display:none;width:300px;max-height:60vh;overflow:auto;padding:10px;border-radius:14px;background:rgba(252,250,246,.97);box-shadow:0 10px 30px rgba(0,0,0,.22);font:13px/1.4 var(--font,-apple-system,"PingFang SC",sans-serif);color:#2b2620}#imppan.on{display:block}
#imppan .hd{display:flex;align-items:center;gap:8px;margin-bottom:8px}#imppan .hd b{flex:1;font-size:14px}#imppan .pick{position:relative;overflow:hidden;display:inline-flex;align-items:center;height:32px;padding:0 14px;border-radius:16px;background:#5f7f64;color:#fff;font-weight:600;cursor:pointer}#imppan .pick input{position:absolute;inset:0;opacity:0;cursor:pointer}
#imppan .tip{color:#8a847a;font-size:12px;margin:2px 0 6px}#imppan .ly{display:flex;align-items:center;gap:6px;padding:6px 4px;border-top:1px solid rgba(0,0,0,.07)}#imppan .ly i{width:12px;height:12px;border-radius:3px;flex:none}#imppan .ly .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#imppan .ly small{color:#8a847a}
#imppan .ly a{color:#3b6e48;cursor:pointer;white-space:nowrap;font-size:12px}#imppan .ly a.d{color:#c62828}#imppan .err{color:#c62828;font-size:12px;margin:4px 0}
.impop b{display:block;margin-bottom:4px}.impop table{border-collapse:collapse;font-size:12px}.impop td{padding:1px 6px 1px 0;vertical-align:top}.impop td:first-child{color:#8a847a}`;document.head.appendChild(st);
 const bar=document.getElementById('bar');if(!bar)return;const btn=document.createElement('button');btn.id='bimp';btn.title='导入数据（KML/KMZ、GeoJSON、Shapefile、GPX）';btn.innerHTML='<svg class="i" viewBox="0 0 24 24"><path d="M12 3v11M7.5 9.5L12 14l4.5-4.5"/><path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3"/></svg><span>导入</span>';bar.appendChild(btn);
 const pan=document.createElement('div');pan.id='imppan';B.appendChild(pan);
 const render=(err)=>{pan.innerHTML='<div class="hd"><b>导入数据</b><label class="pick">选择文件<input id="impin" type="file" multiple accept=".kml,.kmz,.geojson,.json,.zip,.shp,.dbf,.prj,.shx,.cpg,.gpx"></label></div><div class="tip">KML/KMZ · GeoJSON/JSON · Shapefile（.zip，或同时选 .shp+.dbf+.prj）· GPX</div>'+(err?'<div class="err">'+esc(err)+'</div>':'')+
  (layers.length?layers.map(l=>{const nl=lines(l.fc).length,np=pts(l.fc).length;return '<div class="ly" data-id="'+l.id+'"><input type="checkbox" data-a="on"'+(l.on?' checked':'')+'><i style="background:'+l.color+'"></i><span class="nm" title="'+esc(l.name)+'">'+esc(l.name)+' <small>'+l.fc.features.length+'项</small></span>'+(nl?'<a data-a="route">用作路线</a>':'')+(np?'<a data-a="nodes">点转节点</a>':'')+'<a data-a="fit">定位</a><a class="d" data-a="del">删除</a></div>';}).join(''):'<div class="tip">还没有导入的图层</div>');
  pan.querySelector('#impin').onchange=async e=>{const fs=[...e.target.files];e.target.value='';if(fs.length)await doImport(fs);};
  pan.querySelectorAll('.ly').forEach(r=>{const l=layers.find(x=>x.id===r.dataset.id);r.querySelectorAll('[data-a]').forEach(a=>{const k=a.dataset.a;const h=()=>{if(k==='on'){l.on=a.checked;draw(l);save();}else if(k==='route')asRoute(l);else if(k==='nodes')toNodes(l);else if(k==='fit')fit(l);else if(k==='del'){undraw(l.id);layers=layers.filter(x=>x!==l);save();render();ntoast('已删除图层“'+l.name+'”',{undo:()=>{layers.push(l);draw(l);save();render();}});}};if(k==='on')a.onchange=h;else a.onclick=h;});});};
 const place=()=>{const r=btn.getBoundingClientRect();pan.style.left=Math.min(innerWidth-310,r.left)+'px';pan.style.top=(r.bottom+8)+'px';};
 btn.onclick=e=>{e.stopPropagation();if(pan.classList.toggle('on')){render();place();}};
 document.addEventListener('pointerdown',e=>{if(pan.classList.contains('on')&&!pan.contains(e.target)&&!btn.contains(e.target)&&!(e.target.closest&&e.target.closest('#ntoast')))pan.classList.remove('on');},true);
 async function doImport(files){window.__impCRS=null;let res;try{res=await parseFiles(files);}catch(e){window.__impErr=e.message;render('导入失败：'+e.message);ntoast('导入失败：'+e.message,{color:'#c62828',ms:5000});return;}
  const msgs=[];let last=null;for(const r of res){if(!r.fc.features.length){msgs.push('“'+r.name+'”没有可显示的要素');continue;}const warn=r.fc.__warn||[];delete r.fc.__warn;const s=simplify(r.fc);if(s.simp)warn.push('顶点过多（'+s.n+'），已简化为 '+s.m);
   const l={id:Math.random().toString(36).slice(2,9),name:r.name,color:COL[layers.length%COL.length],on:true,fc:s.fc};layers.push(l);draw(l);last=l;msgs.push(...warn.map(w=>r.name+'：'+w));}
  save();render(msgs.length?msgs.join('；'):null);if(last){fit(last);ntoast('已导入 '+res.length+' 个图层'+(window.__impCRS?' · 坐标系 '+__impCRS:''),{color:'#43a047',ms:3500});}window.__impErr=null;window.__impMsgs=msgs;}
 window.IMP={parseFiles,doImport,get layers(){return layers;}};
 load().then(a=>{if(!pc())return;layers=a||[];layers.forEach(draw);});
})();
