# 由 index.html 生成 3D 版 index3d.html（共享全部业务逻辑，仅替换地图渲染层）
import re
s=open('index.html',encoding='utf-8').read()
def R(a,b,cnt=1):
    global s
    assert s.count(a)==cnt,(s.count(a),a[:80]); s=s.replace(a,b)
R('<title>自驾行进动画</title>','<title>自驾行进动画 · 3D</title>')
R('<script src="lib/leaflet.js"></script>','<script src="lib/leaflet.js"></script><link rel="stylesheet" href="lib/maplibre-gl.css"><script src="lib/maplibre-gl.js"></script>')
CUBE='<svg class="i" viewBox="0 0 24 24"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/></svg>';MAPI='<svg class="i" viewBox="0 0 24 24"><path d="M9 4L3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/></svg>'
R('#legend{position','.maplibregl-ctrl-top-right{top:6px;right:4px}.maplibregl-ctrl-group{border-radius:12px!important;overflow:hidden;box-shadow:0 3px 14px rgba(0,0,0,.32),0 0 0 1px rgba(0,0,0,.08)!important;background:#fff!important}.maplibregl-ctrl-group button{width:36px;height:36px}.maplibregl-ctrl-group button+button{border-top:1px solid #e0e0e0}.maplibregl-ctrl button.maplibregl-ctrl-compass{background:linear-gradient(180deg,#fff 0%,#fff5f5 55%,#ffe8e8 100%)!important;border-top:1px solid #ffcdd2!important}.maplibregl-ctrl button.maplibregl-ctrl-compass:hover{background:linear-gradient(180deg,#fff 0%,#ffebee 100%)!important}.maplibregl-ctrl button.maplibregl-ctrl-compass .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2229%22 height=%2229%22 viewBox=%220 0 29 29%22%3E%3Cpath fill=%22%23e53935%22 d=%22M14.5 3.2 19.8 14.2 14.5 12.4 9.2 14.2Z%22/%3E%3Cpath fill=%22%23607d8b%22 d=%22M14.5 25.8 9.2 14.8 14.5 16.6 19.8 14.8Z%22/%3E%3Ccircle cx=%2214.5%22 cy=%2214.5%22 r=%222.1%22 fill=%22%23fff%22 stroke=%22%23c62828%22 stroke-width=%221.2%22/%3E%3C/svg%3E")!important;background-size:28px 28px!important}.mk3{cursor:pointer}#legend{position')
R(CUBE+'<span>切换3D</span></a>',MAPI+'<span>切换2D</span></a>')#<span>切换3D</span></a>','{IC_MAP}<span>切换2D</span></a>')
R("onclick=\"this.href='index3d.html'+location.search\"","onclick=\"this.href='index.html'+location.search\"")
R('<div id="d3ctl" style="display:none">','<div id="d3ctl">')
# 地图：MapLibre + Google 影像 + 地形
R("""const map=L.map('map',{attributionControl:false,zoomControl:false,zoomSnap:0.25}).setView([35.5,104],4.25);
L.control.zoom({position:'topright'}).addTo(map);
const LblLayer=L.GridLayer.extend({createTile(c,done){const cv=document.createElement('canvas');GCJLBL.tile(c.x,c.y,c.z,cv).then(()=>done(null,cv));return cv;}});map.createPane('lbl').style.zIndex=350;map.getPane('lbl').style.pointerEvents='none';
const baseL=L.layerGroup().addTo(map);
function applyBase(m){baseL.clearLayers();const o={maxZoom:20,keepBuffer:4};
 if(m==='google'){baseL.addLayer(L.tileLayer(BM.U.google,{...o,subdomains:'0123'}));baseL.addLayer(new LblLayer({...o,pane:'lbl'}));}
 else{baseL.addLayer(L.tileLayer(BM.U.esri,{...o,maxNativeZoom:18}));
  if(m==='tdt')baseL.addLayer(L.tileLayer(BM.U.tdt(BM.key()),{...o,maxNativeZoom:18,subdomains:'01234567',pane:'lbl'}));
  else{baseL.addLayer(L.tileLayer(BM.U.et,{...o,maxNativeZoom:18,pane:'lbl',opacity:.85}));baseL.addLayer(L.tileLayer(BM.U.eb,{...o,maxNativeZoom:18,pane:'lbl'}));}}}""",
"""const DEM='https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
const EMPTY={type:'FeatureCollection',features:[]};
maplibregl.addProtocol('gcjh',async p=>{const [z,x,y]=p.url.replace('gcjh://','').split('/').map(Number);const cv=await GCJLBL.tile(x,y,z);const bl=await new Promise(r=>cv.toBlob(r,'image/png'));return {data:await bl.arrayBuffer()};});
const __mob3=matchMedia('(max-width:640px),(max-height:500px)').matches;
const __dpr=Math.min(__mob3?1.5:(devicePixelRatio>1.75?1.5:Math.min(2,devicePixelRatio||1)),devicePixelRatio||1);
const map=new maplibregl.Map({container:'map',attributionControl:false,center:[104,35.5],zoom:3.6,pitch:45,maxPitch:85,preserveDrawingBuffer:!!Q.get('hide'),antialias:!__mob3,fadeDuration:__mob3?0:220,pixelRatio:__dpr,maxTileCacheSize:__mob3?400:750,refreshExpiredTiles:false,
 style:{version:8,sources:{
  g:{type:'raster',tiles:[0,1,2,3].map(i=>GURL.replace('{s}',i).replace('lyrs=y','lyrs=s')),tileSize:256,maxzoom:20},lbl:{type:'raster',tiles:['gcjh://{z}/{x}/{y}'],tileSize:256,maxzoom:20},
  esri:{type:'raster',tiles:[BM.U.esri],tileSize:256,maxzoom:18},eb:{type:'raster',tiles:[BM.U.eb],tileSize:256,maxzoom:18},et:{type:'raster',tiles:[BM.U.et],tileSize:256,maxzoom:18},
  dem:{type:'raster-dem',tiles:[DEM],encoding:'terrarium',tileSize:256,maxzoom:14},
  dem2:{type:'raster-dem',tiles:[DEM],encoding:'terrarium',tileSize:256,maxzoom:14}},
  layers:[{id:'bg',type:'background',paint:{'background-color':'#1a2a1f'}},{id:'g',type:'raster',source:'g',layout:{visibility:'none'},paint:{'raster-fade-duration':__mob3?0:280}},{id:'esri',type:'raster',source:'esri',layout:{visibility:'none'},paint:{'raster-fade-duration':__mob3?0:280}},{id:'hs',type:'hillshade',source:'dem2',paint:{'hillshade-exaggeration':0.25,'hillshade-shadow-color':'#1a1a2e','hillshade-highlight-color':'#fff8e1'}},{id:'lbl',type:'raster',source:'lbl',layout:{visibility:'none'}},{id:'et',type:'raster',source:'et',paint:{'raster-opacity':.85,'raster-fade-duration':__mob3?0:280},layout:{visibility:'none'}},{id:'eb',type:'raster',source:'eb',layout:{visibility:'none'},paint:{'raster-fade-duration':__mob3?0:280}}],
  terrain:{source:'dem',exaggeration:__mob3?0.8:1.5},
  sky:{'sky-color':'#5fa8ff','horizon-color':'#dcecff','fog-color':'#e8f0ff','sky-horizon-blend':0.6,'horizon-fog-blend':0.6,'fog-ground-blend':0.85,'atmosphere-blend':['interpolate',['linear'],['zoom'],0,1,10,1,12,0]}}});
try{map.getCanvas().style.background='#1a2a1f';}catch(_){}
map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'top-right');
// Leaflet 兼容小工具，复用 2D 版业务逻辑
map.latLngToContainerPoint=ll=>map.project([ll.lng??ll[1],ll.lat??ll[0]]);
map.setView=(ll,z)=>map.jumpTo({center:[ll.lng??ll[1],ll.lat??ll[0]],zoom:z});
window.gotoLL=(lat,lon,z)=>map.flyTo({center:[lon,lat],zoom:z,pitch:+$('pit').value,duration:1500});
let mapReady=new Promise(r=>{window.__resolveMapReady=()=>{if(window.__resolveMapReady){window.__resolveMapReady=null;r();}};map.on('load',()=>setTimeout(()=>window.__resolveMapReady&&window.__resolveMapReady(),0));setTimeout(()=>window.__resolveMapReady&&window.__resolveMapReady(),12000);});
function applyBase(m){mapReady.then(()=>{const V=(id,on)=>map.getLayer(id)&&map.setLayoutProperty(id,'visibility',on?'visible':'none');
 if(m==='tdt'&&!map.getSource('tdt')){map.addSource('tdt',{type:'raster',tiles:[0,1,2,3,4,5,6,7].map(i=>BM.U.tdt(BM.key()).replace('{s}',i)),tileSize:256,maxzoom:18});map.addLayer({id:'tdt',type:'raster',source:'tdt'},map.getLayer('rd-c')?'rd-c':undefined);}
 V('g',m==='google');V('lbl',m==='google');V('esri',m!=='google');V('et',m==='esri');V('eb',m==='esri');V('tdt',m==='tdt');});}
const hwFC=[],_gjQ={};const GJ=(id,d)=>{const s=map.getSource(id);if(s)s.setData(d);else _gjQ[id]=d;};
map.on('load',()=>{
 for(const id of ['hw','rd','done','svc','nlink','car'])map.addSource(id,{type:'geojson',data:EMPTY});
 map.addLayer({id:'rd-c',type:'line',source:'rd',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#002b36','line-width':['interpolate',['linear'],['zoom'],5,5,12,10],'line-opacity':.9}});
 map.addLayer({id:'rd',type:'line',source:'rd',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#00e5ff','line-width':['interpolate',['linear'],['zoom'],5,2.8,12,6]}});
 map.addLayer({id:'hw-c',type:'line',source:'hw',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#3e2723','line-width':['interpolate',['linear'],['zoom'],5,6,12,13],'line-opacity':.9}});
 map.addLayer({id:'hw',type:'line',source:'hw',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#ff9800','line-width':['interpolate',['linear'],['zoom'],5,3.5,12,8]}});
 map.addLayer({id:'done',type:'line',source:'done',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#d50000','line-width':['interpolate',['linear'],['zoom'],5,2.2,12,4.5]}});
 map.addLayer({id:'nlink',type:'line',source:'nlink',paint:{'line-color':['get','c'],'line-width':2,'line-dasharray':[2,2]}});
 map.addLayer({id:'svc',type:'circle',source:'svc',paint:{'circle-radius':4,'circle-color':['get','c'],'circle-stroke-color':'#fff','circle-stroke-width':1,'circle-pitch-alignment':'map'}});
 map.addLayer({id:'car',type:'fill-extrusion',source:'car',paint:{'fill-extrusion-color':['get','c'],'fill-extrusion-base':['get','b'],'fill-extrusion-height':['get','h'],'fill-extrusion-opacity':1,'fill-extrusion-vertical-gradient':true}});
 for(const id of Object.keys(_gjQ)){const s=map.getSource(id);if(s){s.setData(_gjQ[id]);delete _gjQ[id];}}
 for(const id of ['rd-c','rd','hw-c','hw','done','nlink','svc','car']){if(map.getLayer(id))try{map.moveLayer(id);}catch(_){}}
 window.__mapLayersReady=1;if(window.__resolveMapReady)window.__resolveMapReady();
});
// ---- 3D 小汽车（fill-extrusion 拼装：车身/车窗/车顶/车轮/车灯，随缩放保持约 56px 车长）----
const CARPARTS=[ // [前,后,左右半宽, 底, 顶, 颜色] 单位：车长L
 [0.42,-0.42,0.27,0,0.002,'#000000'],
 [0.36,0.24,0.25,0,0.11,'#111111'],[-0.24,-0.36,0.25,0,0.11,'#111111'],
 [0.5,-0.5,0.22,0.04,0.17,'#e53935'],[0.47,0.40,0.23,0.04,0.155,'#e53935'],
 [0.24,-0.30,0.19,0.17,0.30,'#263238'],[0.14,-0.24,0.18,0.30,0.32,'#c62828'],
 [0.505,0.48,0.07,0.10,0.14,'#fff59d',0.13],[0.505,0.48,0.07,0.10,0.14,'#fff59d',-0.13],
 [-0.48,-0.505,0.06,0.10,0.14,'#ff1744',0.15],[-0.48,-0.505,0.06,0.10,0.14,'#ff1744',-0.15]];
let carLL=null;
function carLen(){const lat=carLL?carLL[0]:40,z=map.getZoom(),fb=36*156543*Math.cos(lat*Math.PI/180)/2**z;if(!carLL)return Math.min(60,fb);
 // 屏幕约 36px 车长，但绝对米数必须封顶——否则远距/俯仰下 L 飙到数公里，挤出成白色大斑
 const h=heading*Math.PI/180,d=Math.min(fb,80),k=111320,kc=k*Math.cos(lat*Math.PI/180),a=map.project([carLL[1],carLL[0]]),b=map.project([carLL[1]+Math.cos(h)*d/kc,carLL[0]-Math.sin(h)*d/k]);const px=Math.hypot(b.x-a.x,b.y-a.y);
 let L=px>0.5&&isFinite(px)?36*d/px:fb;return Math.min(70,Math.max(14,L));}
function updateCar(lat,lon){carLL=[lat,lon];const L_=carLen()*VEH().len,h=heading*Math.PI/180,sh=Math.sin(h),ch=Math.cos(h),k=111320,kc=k*Math.cos(lat*Math.PI/180);
 const P=(f,r)=>[lon+(f*sh+r*ch)*L_/kc,lat+(f*ch-r*sh)*L_/k];
 let elev=0;try{const e=map.queryTerrainElevation({lng:lon,lat:lat},{exaggerated:true});if(e!=null&&isFinite(e)&&e>-50&&e<9000)elev=e;}catch(_){}
 const lift=Math.max(0,elev)+0.6;
 // 近景：挤出车身；远景挤出会糊成白斑 → 清空挤出，改靠 Marker 清晰图标
 const z=map.getZoom();
 if(z>=12.2){GJ('car',{type:'FeatureCollection',features:VEH().parts.map(([f1,f2,w,b,t,c,o=0])=>({type:'Feature',properties:{c,b:lift+b*L_,h:lift+t*L_},geometry:{type:'Polygon',coordinates:[[P(f1,o-w),P(f1,o+w),P(f2,o+w),P(f2,o-w),P(f1,o-w)]]}}))});}
 else GJ('car',EMPTY);
 // 始终用 SVG Marker 保证能看见所选车型（含重型卡车）
 if(!window.__carMk){const el=document.createElement('div');el.className='carw';el.style.cssText='width:72px;height:72px;pointer-events:none;filter:drop-shadow(0 3px 4px rgba(0,0,0,.65));transform-origin:center center;';el.innerHTML=CAR_SVG;
  window.__carMk=new maplibregl.Marker({element:el,rotationAlignment:'viewport',pitchAlignment:'viewport'}).setLngLat([lon,lat]).addTo(map);carEl=el;}
 else{window.__carMk.setLngLat([lon,lat]);}
 try{window.__carMk.setRotation(heading-map.getBearing());}catch(_){}
 if(carEl&&String(carEl.dataset.veh)!==String(VEH_I)){carEl.innerHTML=CAR_SVG;carEl.dataset.veh=VEH_I;}
}
const car={setLatLng:p=>updateCar(p[0],p[1]),getLatLng:()=>({lat:carLL[0],lng:carLL[1]})};
let camBear=0,camInit=false,camZ=11,camZv=0;\nconst camBase=()=>14.6-6.6*(+$('dist').value/100);\nfunction camPad(){const H=innerHeight,W=innerWidth,vis=e=>e&&getComputedStyle(e).display!=='none'&&!e.classList.contains('hide');const c=$('ctl'),pr=$('prof');const mob=MOB();const rb=(mob?(window.__mobTop!=null?window.__mobTop+46-8:c.getBoundingClientRect().top):(vis(pr)?pr.getBoundingClientRect().top:H))-46,rt=mob?(window.__mobTopT||$('stat').getBoundingClientRect().bottom)+12:60,R=Math.max(100,rb-rt);const l=!mob&&vis(c)&&!document.body.classList.contains('rec')?c.getBoundingClientRect().right+10:0;return {top:Math.round(rt+0.2*R),bottom:Math.round(H-rb),left:Math.round(Math.min(l,W*0.5)),right:0};}\nwindow.__cam={};window.__lastBase=null;addEventListener('resize',()=>{if(!playing&&camInit)map.easeTo({padding:camPad(),duration:300});});\nfunction hAt(d){const A=pointAt(d-0.15),B=pointAt(d+0.6);return Math.atan2((B[1]-A[1])*Math.cos(A[0]*Math.PI/180),B[0]-A[0])*180/Math.PI;}""")
R(",routeG=L.layerGroup().addTo(map),doneLayer,car,carEl,",",doneLayer,carEl={style:{}},")
R(",svcLayer=L.layerGroup().addTo(map),",",")
R("""routeG.clearLayers();[doneLayer,miniRoute].forEach(l=>l&&l.remove());""","""[miniRoute].forEach(l=>l&&l.remove());""")
R(""" L.polyline(hwC,{color:'#3e2723',weight:10,opacity:.9}).addTo(routeG);L.polyline(hwC,{color:'#ff9800',weight:6}).addTo(routeG);
 L.polyline(rdC,{color:'#002b36',weight:8,opacity:.9}).addTo(routeG);L.polyline(rdC,{color:'#00e5ff',weight:4.5}).addTo(routeG);
 doneLayer=L.polyline([],{color:'#d50000',weight:3.5}).addTo(map);""",
""" const ML=a=>{const lines=a.filter(p=>p&&p.length>=2).map(p=>p.map(q=>[q[1],q[0]]));return {type:'FeatureCollection',features:lines.length?[{type:'Feature',properties:{},geometry:{type:'MultiLineString',coordinates:lines}}]:[]};};GJ('hw',ML(hwC));GJ('rd',ML(rdC));
 doneLayer={setLatLngs:a=>{const st=Math.max(1,Math.floor(a.length/1500)),o=[];for(let i=0;i<a.length-1;i+=st)o.push([a[i][1],a[i][0]]);const l=a[a.length-1];if(l)o.push([l[1],l[0]]);GJ('done',{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:o.length>1?o:[[0,0],[0,0]]}});}};""")
R("if(!window.__restoring)map.fitBounds(L.latLngBounds(c),MOB()?(P=>({paddingTopLeft:[P.l,P.t],paddingBottomRight:[P.r,P.b]}))(__mpad()):{paddingTopLeft:[$(\'ctl\').classList.contains(\'hide\')?40:$(\'ctl\').getBoundingClientRect().right+30,60],paddingBottomRight:[60,170]});","{if(!window.__restoring){let b=new maplibregl.LngLatBounds();c.forEach(q=>b.extend([q[1],q[0]]));map.fitBounds(b,{padding:{top:70,bottom:170,right:60,left:MOB()?24:$(\'ctl\').classList.contains(\'hide\')?50:$(\'ctl\').getBoundingClientRect().right+30,...(MOB()?(P=>({top:P.t,bottom:P.b,left:P.l,right:P.r}))(__mpad()):{})},pitch:45,bearing:0,duration:0});camInit=false;}}")
R(""" if(!car){car=L.marker(c[0],{icon:L.divIcon({className:'',html:'<div class="carw">'+CAR_SVG+'</div>',iconSize:[60,60],iconAnchor:[30,30]}),zIndexOffset:1000,interactive:false}).addTo(map);carEl=car.getElement().firstChild;}
""","")
# 服务区标记
R("svcLayer.clearLayers();","svcMk.forEach(m=>m.remove());svcMk=[];",2)
R(""" m.forEach(s=>L.circleMarker([s.lat,s.lon],{radius:4,color:'#fff',weight:1,fillColor:s.fuel?'#43a047':'#ff9800',fillOpacity:1}).bindTooltip(s.label+(s.fuel?'（可加油）':'')).addTo(svcLayer));""",
""" GJ('svc',{type:'FeatureCollection',features:m.map(s=>({type:'Feature',properties:{c:s.fuel?'#43a047':'#ff9800'},geometry:{type:'Point',coordinates:[s.lon,s.lat]}}))});""")
R("""svcStops.forEach(s=>{const mk=L.marker([s.lat,s.lon],{icon:L.divIcon({className:'',html:'<div class="pulse" style="background:'+(s.fallback?'#9e9e9e':(s.fuel?'#43a047':'#ff9800'))+'"></div>',iconSize:[16,16],iconAnchor:[8,8]})}).bindTooltip(s.label).addTo(svcLayer);s.mk=mk;});""",
"""svcStops.forEach(s=>{const e=document.createElement('div');e.title=s.label+(s.fuel?'（可加油）':'');e.innerHTML='<div class="pulse" style="position:relative;background:'+(s.fallback?'#9e9e9e':(s.fuel?'#43a047':'#ff9800'))+'"></div>';const mk=new maplibregl.Marker({element:e}).setLngLat([s.lon,s.lat]).addTo(map);svcMk.push(mk);s.mk=mk;});""")
# 朝向：地理方位角（3D 模型在世界坐标中旋转）
R("function targetHeading(){","function targetHeading(){const A=pointAt(dist-0.15),B=pointAt(dist+0.6);let dy=B[0]-A[0],dx=(B[1]-A[1])*Math.cos(A[0]*Math.PI/180);if(Math.hypot(dx,dy)<1e-6){const C=pointAt(dist-1),E=pointAt(dist+3);dy=E[0]-C[0];dx=(E[1]-C[1])*Math.cos(C[0]*Math.PI/180);}return Math.atan2(dx,dy)*180/Math.PI;}\nfunction targetHeading2D(){")
# 尾气方向：屏幕方向 = 地理朝向 - 镜头方位
R("const r=heading*Math.PI/180,bx=-Math.sin(r),by=Math.cos(r);","const r=(heading-map.getBearing())*Math.PI/180,bx=-Math.sin(r),by=Math.cos(r)*Math.cos(map.getPitch()*Math.PI/180*0.8);")
R("p.x=cp.x+bx*20+","p.x=cp.x+bx*26+");R("p.y=cp.y+by*20+","p.y=cp.y+by*26+")
# 镜头
R("""  if(playing&&!stopTimer&&$('follow').checked&&!window.__touching){let la=pointAt(dist+v*0.8);if(window.__mobCY!=null){const sz=map.getSize(),pp=map.latLngToContainerPoint([la[0],la[1]]),q=map.containerPointToLatLng([pp.x,pp.y+(sz.y/2-window.__mobCY)]);la=[q.lat,q.lng];}const c=map.getCenter(),k=Math.min(1,dt*2.5);map.setView([c.lat+(la[0]-c.lat)*k,c.lng+(la[1]-c.lng)*k],map.getZoom(),{animate:false});}
  if(v>0.01||!playing){const th=targetHeading();const d=((th-heading+540)%360)-180;heading+=d*Math.min(1,dt*7);carEl.style.transform='rotate('+heading+'deg)';}""",
"""  if(v>0.01||!playing){const th=targetHeading();const d=((th-heading+540)%360)-180;heading+=d*Math.min(1,dt*7);}
  updateCar(p[0],p[1]);
  if(playing&&$('follow').checked&&!window.__touching){camInit=true;
   const vm=+$('speed').value,sp=Math.min(1,v/Math.max(1,vm)),Wk=Math.max(3,vm*0.9),h0=hAt(dist);let cv=0;for(let k=1;k<=4;k++){cv=Math.max(cv,Math.abs(((hAt(dist+Wk*k/4)-h0+540)%360)-180));}cv=Math.min(1,cv/70);window.__cvS=(window.__cvS??cv)+(cv-(window.__cvS??cv))*Math.min(1,dt*1.2);cv=window.__cvS;window.__spS=(window.__spS??0)+(Math.min(1,v/Math.max(1,+$('speed').value))-(window.__spS??0))*Math.min(1,dt*0.8);
   const ns=nextStop<stops.length?stops[nextStop].along-dist:1e9,ap=Math.max(0,Math.min(1,1-ns/Math.max(6,vm*1.6)));const hw=runs[runIdx]&&runs[runIdx].hw;
   const base=camBase(),tz=stopTimer?base+1.1:base-(hw?0.7:0.35)*window.__spS*(1-cv)+0.8*cv+1.0*ap+0.1*Math.sin(t*0.00027);
   camZv+=(6*(tz-camZ)-4.9*camZv)*dt;camZ+=camZv*dt;Object.assign(__cam,{base,tz,camZ});
   if(stopTimer)camBear+=dt*7;else{const d=((heading-camBear+540)%360)-180;camBear+=d*Math.min(1,dt*(1.1+cv));}
   const ahead=0,la=pointAt(dist+ahead);
   const c=map.getCenter(),k=Math.min(1,dt*(stopTimer?(window.__mobTop!=null?5:1.5):6)),tp=Math.max(20,Math.min(85,+$('pit').value+5*window.__spS*(1-cv)-9*cv+2.5*Math.sin(t*0.0004)-6*ap));Object.assign(__cam,{cv,sp:window.__spS,tp,pitBase:+$('pit').value});
   let camO={center:[c.lng+(la[1]-c.lng)*k,c.lat+(la[0]-c.lat)*k],zoom:camZ,bearing:camBear+2.5*Math.sin(t*0.00021),pitch:map.getPitch()+(tp-map.getPitch())*Math.min(1,dt*1.5)};
   if(window.CINE&&CINE.active()){const o=CINE.apply({t,dt,dist,heading,stopTimer,carLL:[p[0],p[1]],camZ,camBear,pitchBase:+$(\'pit\').value,v,tilesOk:map.areTilesLoaded()});if(o)camO=o;}
   if(!MOB()&&window.CINE&&CINE.active()&&!map.areTilesLoaded()&&window.__camLast){const L=__camLast,k=.55;camO={center:[L.center[0]+(camO.center[0]-L.center[0])*k,L.center[1]+(camO.center[1]-L.center[1])*k],zoom:L.zoom+(camO.zoom-L.zoom)*k,bearing:L.bearing+(((camO.bearing-L.bearing+540)%360)-180)*k,pitch:L.pitch+(camO.pitch-L.pitch)*k};}
   window.__camLast=camO;map.jumpTo({...camO,padding:camPad()});}""")
R("""if($('follow').checked)map.setView(car.getLatLng(),Math.max(map.getZoom(),9),{animate:false});}""",
"""if($('follow').checked){camBear=heading;camInit=true;map.jumpTo({center:[carLL[1],carLL[0]],zoom:(camZ=camBase(),window.__lastBase=camZ,camZv=0,camZ),pitch:+$('pit').value,bearing:heading,padding:camPad()});}}""")
R("""resetAnim(){pause();""","""resetAnim(){pause();camInit=false;""")
R("""heading=targetHeading();carEl.style.transform='rotate('+heading+'deg)';}}""","""heading=targetHeading();camBear=heading;updateCar(...pointAt(0).slice(0,2));}}""")
# 卡片：3D 视角下不平移地图；环绕时每秒重新寻位
R("const shifts=pan&&$('follow').checked?","const shifts=false?")
R("cd--;window.__cd=cd;$('cd').textContent=cd;","cd--;window.__cd=cd;$('cd').textContent=cd;placeCard(false);")
R('window.MAPAPI={addPin(kind,lat,lon,onEnd){const m=L.marker([lat,lon],{draggable:true,zIndexOffset:900,icon:L.divIcon({className:\'\',html:\'<svg viewBox="0 0 28 38" width="28" height="38"><path d="M14 37S2 23 2 13.5a12 12 0 0124 0C26 23 14 37 14 37z" fill="\'+PINC[kind]+\'" stroke="#fff" stroke-width="2"/><circle cx="14" cy="13.5" r="4.5" fill="#fff"/></svg>\',iconSize:[28,38],iconAnchor:[14,37]})}).bindTooltip(kind===\'from\'?\'起点（可拖动）\':\'终点（可拖动）\').addTo(map);\n m.on(\'dragend\',()=>{const p=m.getLatLng();onEnd(p.lat,p.lng);});return {setLatLng:(a,b)=>m.setLatLng([a,b])};},\n onClick(cb){map.on(\'click\',e=>cb(e.latlng.lat,e.latlng.lng));},setCursor(c){map.getContainer().style.cursor=c;},flyTo(a,b,z){map.setView([a,b],z);}};\n','window.MAPAPI={addPin(kind,lat,lon,onEnd){const e=document.createElement(\'div\');e.title=kind===\'from\'?\'起点（可拖动）\':\'终点（可拖动）\';e.innerHTML=\'<svg viewBox="0 0 28 38" width="28" height="38"><path d="M14 37S2 23 2 13.5a12 12 0 0124 0C26 23 14 37 14 37z" fill="\'+PINC[kind]+\'" stroke="#fff" stroke-width="2"/><circle cx="14" cy="13.5" r="4.5" fill="#fff"/></svg>\';\n const m=new maplibregl.Marker({element:e,anchor:\'bottom\',draggable:true}).setLngLat([lon,lat]).addTo(map);m.on(\'dragend\',()=>{const p=m.getLngLat();onEnd(p.lat,p.lng);});return {setLatLng:(a,b)=>m.setLngLat([b,a])};},\n onClick(cb){map.on(\'click\',e=>cb(e.lngLat.lat,e.lngLat.lng));},setCursor(c){map.getCanvas().style.cursor=c;},flyTo(a,b,z){map.flyTo({center:[b,a],zoom:z,duration:1200});}};\n')
R("const ZOFF=window.ZOFF||0;","const ZOFF=1;")
R("function panCar(dx,dy){map.panBy([dx,dy],{animate:true,duration:0.9,easeLinearity:0.35});}","function panCar(dx,dy){map.panBy([dx,dy],{duration:900,easing:t=>1-Math.pow(1-t,3)});}")
# 自定义节点
R("let nodes=[],nodeLayer=L.layerGroup().addTo(map),","let svcMk=[],nodeMk=[],nodes=[],")
R("function rebuildStops(){nodeLayer.clearLayers();const ns=[];","function rebuildStops(){nodeMk.forEach(m=>m.remove());nodeMk=[];const ns=[],lk=[];")
R("""  const mk=L.marker([n.lat,n.lon],{icon:L.divIcon({className:'',html:pinHtml(n.icon,n.color),iconSize:[32,41],iconAnchor:[16,41]}),zIndexOffset:500}).bindTooltip((n.title||'自定义节点')+(n.off>NODE_MAX_OFF?'（距本路线 '+n.off.toFixed(0)+' km，不在本路线上，不停靠）':n.off>0.5?'（距路线 '+n.off.toFixed(1)+' km）':'')).on('click',()=>editNode(n.id)).addTo(nodeLayer);
  if(n.off>0.05&&n.off<=NODE_MAX_OFF)L.polyline([[n.lat,n.lon],[si.lat,si.lon]],{color:n.color,weight:2,dashArray:'4 4'}).addTo(nodeLayer);""",
"""  const e=document.createElement('div');e.className='mk3';e.innerHTML=pinHtml(n.icon,n.color);e.title=(n.title||'自定义节点')+(n.off>NODE_MAX_OFF?'（距本路线 '+n.off.toFixed(0)+' km，不在本路线上，不停靠）':n.off>0.5?'（距路线 '+n.off.toFixed(1)+' km）':'');e.onclick=ev=>{ev.stopPropagation();editNode(n.id);};
  const mk=new maplibregl.Marker({element:e,anchor:'bottom'}).setLngLat([n.lon,n.lat]).addTo(map);nodeMk.push(mk);
  if(n.off>0.05&&n.off<=NODE_MAX_OFF)lk.push({type:'Feature',properties:{c:n.color},geometry:{type:'LineString',coordinates:[[n.lon,n.lat],[si.lon,si.lat]]}});""")
R("stops=[...svcStops,...ns].sort(","GJ('nlink',{type:'FeatureCollection',features:lk});stops=[...svcStops,...ns].sort(")
R("""<a onclick="map.setView(['+n.lat+','+n.lon+'],12)">定位</a>""","""<a onclick="gotoLL('+n.lat+','+n.lon+',12)">定位</a>""")
R("const si=snapInfo(e.latlng.lat,e.latlng.lng);const n=m.type==='click'?newNode(si.lat,si.lon):newNode(e.latlng.lat,e.latlng.lng,m.photos);","const si=snapInfo(e.lngLat.lat,e.lngLat.lng);const n=m.type==='click'?newNode(si.lat,si.lon):newNode(e.lngLat.lat,e.lngLat.lng,m.photos);")
R("map.setView([last.lat,last.lon],11);","gotoLL(last.lat,last.lon,11);")
R("get heading(){return heading},","get heading(){return heading},map,get car3d(){return carLL},carPx(){const a=map.project([carLL[1],carLL[0]]),h=heading*Math.PI/180,L_=carLen(),k=111320,kc=k*Math.cos(carLL[0]*Math.PI/180);const b=map.project([carLL[1]+Math.sin(h)*L_/kc,carLL[0]+Math.cos(h)*L_/k]);return Math.hypot(b.x-a.x,b.y-a.y);},")

R("bindNodeUI();window.__ready=loadNodes()","$('dist').value=100;$('dv').textContent='100';camZ=camBase();try{['cinerow','bgmrow','bgmvolrow'].forEach(id=>{const el=document.getElementById(id);if(el&&!document.body.classList.contains('mob'))el.style.display='';});}catch(_){};window.__lastBase=camZ;$('sw').href='index.html'+location.search;$('exag').oninput=e=>{$('exv').textContent=e.target.value+'×';map.setTerrain(+e.target.value>0?{source:'dem',exaggeration:+e.target.value}:null);};$('pit').oninput=e=>{$('pv').textContent=e.target.value+'°';if(!playing)map.easeTo({pitch:+e.target.value});};\n$('dist').oninput=e=>{$('dv').textContent=e.target.value;const nb=camBase();camZ+=nb-(window.__lastBase??nb);window.__lastBase=nb;if(!playing)map.easeTo({zoom:camBase(),padding:camPad(),duration:400});};\n$('tog').addEventListener('click',()=>{if(!playing&&camInit)map.easeTo({padding:camPad(),duration:300});});\nif(MOB()){$('exag').value=0.8;$('exv').textContent='0.8×';}map.on('sourcedata',e=>{if(e.sourceId==='dem'&&e.isSourceLoaded&&carLL)try{updateCar(carLL[0],carLL[1]);}catch(_){}});\nbindNodeUI();window.__ready=mapReady.then(loadNodes)")

open('index3d.html','w',encoding='utf-8').write(s)
print('ok')
