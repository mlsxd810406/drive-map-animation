// 行程体验增强：拖动进度/海拔图定位、跳到下一站、抵达后全景 + 行程总结卡、行程图（路线缩略图 + 二维码）
(function(){
const $=id=>document.getElementById(id),B=document.body,is3D=!!window.maplibregl,MQ=()=>B.classList.contains('mob');
const SVG=p=>'<svg class="i" viewBox="0 0 24 24">'+p+'</svg>';
// ---------- 定位到任意位置 ----------
window.seekTo=function(d,o){if(!coords.length)return;o=o||{};d=Math.max(0,Math.min(total,d));
 clearStop();window.__resumeCd=null;arrived=false;window.__arrived=false;clearTimeout(window.__arrT);clearTimeout(window.__arrT2);$('arrive').classList.remove('on','out');confetti.length=0;hideSum();
 dist=d;v=0;const ns=stops.findIndex(s=>s.along>d+0.05);nextStop=ns<0?stops.length:ns;markNext();runIdx=-1;updateUI(1e12);heading=targetHeading();if(!is3D&&carEl)carEl.style.transform='rotate('+heading+'deg)';
 if($('follow').checked){const p=pointAt(d);try{if(is3D)map.jumpTo({center:[p[1],p[0]],padding:camPad()});else map.panTo([p[0],p[1]],{animate:!o.drag,duration:.35});}catch(e){}}
 window.__lastSeek=d;};
window.jumpNext=function(){if(!coords.length)return;const lead=Math.min(3,Math.max(0.3,+$('speed').value*0.25));const i=stops.findIndex(s=>s.along>dist+0.5);
 const d=i<0?Math.max(dist,total-lead):Math.max(dist,stops[i].along-lead);seekTo(d);if(!playing)play(true);};
// 通用拖动定位：map(x)->距离
function scrub(el,toD){let on=false,was=false;el.style.touchAction='none';
 const go=e=>{const d=toD(e);if(d!=null)seekTo(d,{drag:1});};
 el.addEventListener('pointerdown',e=>{if(!coords.length||e.button>0)return;e.preventDefault();e.stopPropagation();on=true;was=playing;if(playing)pause();B.classList.add('scrubbing');try{el.setPointerCapture(e.pointerId);}catch(_){}go(e);});
 el.addEventListener('pointermove',e=>{if(on){e.preventDefault();go(e);}});
 const end=e=>{if(!on)return;on=false;B.classList.remove('scrubbing');if(was)play(true);};el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);}
// 进度条
const pb=document.querySelector('#stat .pb');if(pb){pb.classList.add('seekable');pb.insertAdjacentHTML('beforeend','<b class="knob"></b>');pb.title='拖动定位';
 scrub(pb,e=>{const r=pb.getBoundingClientRect();return total*Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));});}
// 海拔图：坐标与 drawProf 一致（X(d)=40+(W-50)*d/total）
const pf=$('prof');if(pf){pf.title='点按或拖动跳到该位置';scrub(pf,e=>{const r=pf.getBoundingClientRect(),x=e.clientX-r.left;if(x<30)return 0;return total*Math.max(0,Math.min(1,(x-40)/(r.width-50)));});}
// 跳到下一站按钮
const rs=$('reset');if(rs&&!$('nextst')){rs.insertAdjacentHTML('afterend','<button id="nextst" title="跳到下一站">'+SVG('<path d="M5 5l9 7-9 7z" fill="currentColor" stroke="none"/><path d="M18 5v14" stroke-width="2.6"/>')+'</button>');$('nextst').onclick=()=>jumpNext();}
const pbb=$('pbar');if(pbb)new MutationObserver(()=>{const k=pb&&pb.querySelector('.knob');if(k)k.style.left=(total?dist/total*100:0)+'%';}).observe(pbb,{attributes:true,attributeFilter:['style']});
// ---------- 抵达：全景 + 行程总结 ----------
B.insertAdjacentHTML('beforeend','<div id="tripsum" role="dialog" aria-label="行程总结"><button class="ts-x" id="ts_x" aria-label="关闭">'+SVG('<path d="M6 6l12 12M18 6L6 18"/>')+'</button><div class="ts-h">行程完成</div><div class="ts-r" id="ts_r"></div><div class="ts-g" id="ts_g"></div><div class="ts-b"><button id="ts_img">'+SVG('<rect x="5" y="2" width="14" height="20" rx="2.5"/><path d="M8 7h8M8 11h8M8 15h5"/>')+'保存行程图</button><button id="ts_re">'+SVG('<path d="M4 12a8 8 0 108-8 8.2 8.2 0 00-6 2.7"/><path d="M5 3v4h4"/>')+'重新播放</button></div></div>');
const TS=$('tripsum');let tA=0,tB=0,shownKey=null;
function hideSum(){clearTimeout(tA);clearTimeout(tB);TS.classList.remove('on','pre');B.classList.remove('ts-on');}window.hideTripSum=hideSum;
$('ts_x').onclick=hideSum;addEventListener('keydown',e=>{if(e.key==='Escape')hideSum();});
document.addEventListener('pointerdown',e=>{if(TS.classList.contains('on')&&!TS.contains(e.target)&&$('map').contains(e.target))hideSum();},true);
$('ts_img').onclick=()=>{(MQ()&&$('m_img')?$('m_img'):$('sumpng')).click();};
$('ts_re').onclick=()=>{hideSum();resetAnim();play();};
new MutationObserver(()=>{if(B.classList.contains('playing')&&TS.classList.contains('on'))hideSum();}).observe(B,{attributes:true,attributeFilter:['class']});
function stats(){const ev=(elev||[]).map(e=>e[2]).filter(isFinite),mx=ev.length?Math.round(Math.max(...ev)):null;const nn=stops.filter(s=>s.node).length,sv=stops.filter(s=>!s.node).length;
 return [[total.toFixed(0),'km','全程'],[fmtH(duration).replace('时','<small>时</small>').replace('分','<small>分</small>'),'','驾驶时长'],[mx!=null?mx:'—',mx!=null?'m':'','最高海拔'],nn?[nn,'个','途经节点']:sv?[sv,'次','停靠']:[duration?Math.round(total/(duration/3600)):'—','km/h','平均时速']];}
function fitAll(pad){if(!coords.length)return;const W=innerWidth,H=innerHeight;
 try{if(is3D){const b=new maplibregl.LngLatBounds();for(let i=0;i<coords.length;i+=Math.max(1,coords.length/400|0))b.extend([coords[i][1],coords[i][0]]);b.extend([coords[coords.length-1][1],coords[coords.length-1][0]]);
   try{map.setPadding({top:0,bottom:0,left:0,right:0});}catch(_){}
   map.fitBounds(b,{padding:{top:pad.t,bottom:pad.b,left:pad.l,right:pad.r},pitch:Math.min(40,map.getPitch()),bearing:0,duration:1700,essential:true});}
  else map.flyToBounds(L.latLngBounds(coords),{paddingTopLeft:[pad.l,pad.t],paddingBottomRight:[pad.r,pad.b],duration:1.5});}catch(e){console.warn('fitAll',e);}}
function padFor(){const W=innerWidth,H=innerHeight,r=TS.getBoundingClientRect();let p;
 if(MQ()&&window.__mpad){p=__mpad();if(B.classList.contains('mobL'))p.l=Math.max(p.l,r.right+14);else p.b=Math.max(p.b,H-r.top+14);}
 else{const c=$('ctl'),pr=$('prof'),vis=e=>e&&e.getClientRects().length&&getComputedStyle(e).display!=='none'&&!e.classList.contains('hide');
  p={t:70,l:vis(c)?c.getBoundingClientRect().right+30:40,r:W-r.left+24,b:vis(pr)?H-pr.getBoundingClientRect().top+20:50};}
 p.t=Math.min(p.t,H*0.4);p.b=Math.min(p.b,H-p.t-80);p.l=Math.min(p.l,W*0.6);p.r=Math.min(p.r,W-p.l-80);return p;}
function showSum(){const key=total.toFixed(2)+'|'+$('from').value+'|'+$('to').value;
 $('ts_r').textContent=$('from').value+' → '+$('to').value;$('ts_g').innerHTML=stats().map(s=>'<div><b>'+s[0]+(s[1]?'<small>'+s[1]+'</small>':'')+'</b><span>'+s[2]+'</span></div>').join('');
 if(MQ()&&window.__setDet&&!B.classList.contains('mobL'))__setDet('peek');
 TS.classList.add('pre');B.classList.add('ts-on');requestAnimationFrame(()=>{fitAll(padFor());tB=setTimeout(()=>{if(window.__arrived){TS.classList.add('on');shownKey=key;}},1100);});}
let sumDone=false;['pointerdown','wheel'].forEach(ev=>$('map').addEventListener(ev,()=>{if(window.__arrived&&(tA||TS.classList.contains('pre'))){clearTimeout(tA);tA=0;sumDone=true;if(!TS.classList.contains('on'))hideSum();try{map.stop&&map.stop();}catch(_){}}},{capture:true,passive:true}));
setInterval(()=>{if(!window.__arrived)sumDone=false;if(window.__arrived&&!sumDone&&!tA&&!TS.classList.contains('on')&&!TS.classList.contains('pre')&&!B.classList.contains('rec')){tA=setTimeout(()=>{tA=0;if(window.__arrived&&!sumDone){sumDone=true;showSum();}},3000);}if(!window.__arrived&&(tA||TS.classList.contains('pre'))){clearTimeout(tA);tA=0;hideSum();}},200);
const _ra=window.resetAnim;// 重置、规划时关闭
['reset','plan','ret'].forEach(id=>$(id)&&$(id).addEventListener('click',hideSum));
// ---------- 行程图：路线缩略图 + 二维码 ----------
function thumb(g,x,y,w,h,F){g.save();g.fillStyle='#eef0ea';g.beginPath();g.roundRect(x,y,w,h,18);g.fill();g.clip();
 const P=coords.map(c=>[c[1]*Math.PI/180,Math.log(Math.tan(Math.PI/4+c[0]*Math.PI/360))]);let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;P.forEach(p=>{x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1]);});
 const m=48,s=Math.min((w-2*m)/((x1-x0)||1e-6),(h-2*m)/((y1-y0)||1e-6)),ox=x+(w-(x1-x0)*s)/2,oy=y+(h-(y1-y0)*s)/2,T=p=>[ox+(p[0]-x0)*s,oy+(y1-p[1])*s],TL=(la,lo)=>T([lo*Math.PI/180,Math.log(Math.tan(Math.PI/4+la*Math.PI/360))]);
 g.strokeStyle='rgba(60,50,40,.06)';g.lineWidth=1;for(let i=1;i<6;i++){g.beginPath();g.moveTo(x+w*i/6,y);g.lineTo(x+w*i/6,y+h);g.stroke();}for(let i=1;i<4;i++){g.beginPath();g.moveTo(x,y+h*i/4);g.lineTo(x+w,y+h*i/4);g.stroke();}
 const st=Math.max(1,P.length/1500|0),path=()=>{g.beginPath();P.forEach((p,i)=>{if(i%st&&i<P.length-1)return;const q=T(p);i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]);});};
 g.lineJoin=g.lineCap='round';path();g.strokeStyle='rgba(255,255,255,.95)';g.lineWidth=9;g.stroke();path();g.strokeStyle='#5f7f64';g.lineWidth=4.5;g.stroke();
 stops.forEach(s=>{const p=pointAt(s.along),q=TL(p[0],p[1]);g.beginPath();g.arc(q[0],q[1],s.node?5:3.5,0,7);g.fillStyle=s.node?'#e91e63':s.fuel?'#43a047':'#e0a040';g.fill();g.lineWidth=1.5;g.strokeStyle='#fff';g.stroke();});
 const dot=(q,c)=>{g.beginPath();g.arc(q[0],q[1],8,0,7);g.fillStyle='#fff';g.fill();g.beginPath();g.arc(q[0],q[1],5.5,0,7);g.fillStyle=c;g.fill();};
 const a=T(P[0]),b=T(P[P.length-1]);dot(a,'#5f7f64');dot(b,'#b5654a');
 g.font='600 14px '+F;const lab=(t,q)=>{const tw=g.measureText(t).width,lx=Math.max(x+8,Math.min(x+w-tw-16,q[0]-tw/2-6)),ly=q[1]-30<y+6?q[1]+14:q[1]-30;g.fillStyle='rgba(255,255,255,.92)';g.beginPath();g.roundRect(lx,ly,tw+12,22,11);g.fill();g.fillStyle='#2b2722';g.fillText(t,lx+6,ly+16);};
 const cut=t=>t.length>14?t.slice(0,13)+'…':t;lab(cut($('from').value),a);lab(cut($('to').value),b);g.restore();}
function qr(g,url,x,y,sz){try{const q=qrcode(0,'M');q.addData(url,'Byte');q.make();const n=q.getModuleCount(),c=sz/(n+2);g.fillStyle='#fff';g.fillRect(x,y,sz,sz);g.fillStyle='#1d1d1f';
  for(let r=0;r<n;r++)for(let k=0;k<n;k++)if(q.isDark(r,k))g.fillRect(Math.round(x+(k+1)*c),Math.round(y+(r+1)*c),Math.ceil(c),Math.ceil(c));return n;}catch(e){console.warn('qr',e);return 0;}}
window.qrURL=function(){let u=window.shareURL?shareURL():location.href;if(u.length>700){const U=new URL(u);U.searchParams.delete('n');u=U.toString();}return u;};
const sp=$('sumpng');if(sp)sp.onclick=()=>{if(!coords.length){msg('请先规划路线');return;}const Ls=tripLines(),W=820,lh=26,TH=380,QS=150,F="'PingFang SC','Microsoft YaHei UI','Microsoft YaHei',sans-serif";
 const H=84+24+TH+28+(Ls.length-1)*lh+24+QS+40,c=document.createElement('canvas'),d=2;c.width=W*d;c.height=H*d;const g=c.getContext('2d');g.scale(d,d);
 g.fillStyle='#f6f4ef';g.fillRect(0,0,W,H);const gr=g.createLinearGradient(0,0,W,0);gr.addColorStop(0,'#5f7f64');gr.addColorStop(1,'#7d9b81');g.fillStyle=gr;g.fillRect(0,0,W,84);
 g.fillStyle='#fff';g.font='700 28px '+F;g.fillText(Ls[0],32,50);g.font='500 14px '+F;g.globalAlpha=.88;g.fillText($('from').value+' → '+$('to').value+' · '+total.toFixed(0)+' km · '+fmtH(duration),32,73);g.globalAlpha=1;
 thumb(g,32,84+24,W-64,TH,F);let y=84+24+TH+28+12;
 Ls.slice(1).forEach((t,i)=>{const yy=y+i*lh;g.font=(/^\d+\./.test(t)?'400 14px ':/^(全程|起点|终点|途经|停靠)/.test(t)?'600 15px ':'400 13px ')+F;g.fillStyle=/^数据/.test(t)?'#86868b':'#1d1d1f';g.fillText(t.replace('　可加油',''),32,yy);if(/可加油$/.test(t)){const w=g.measureText(t.replace('　可加油','')).width;g.fillStyle='#34c759';g.beginPath();g.roundRect(44+w,yy-15,52,20,10);g.fill();g.fillStyle='#fff';g.font='600 12px '+F;g.fillText('可加油',50+w,yy);}});
 const qy=H-QS-34;g.strokeStyle='rgba(60,50,40,.12)';g.beginPath();g.moveTo(32,qy-16);g.lineTo(W-32,qy-16);g.stroke();const url=qrURL();qr(g,url,32,qy,QS);
 g.fillStyle='#1d1d1f';g.font='600 18px '+F;g.fillText('扫码打开同一条路线',32+QS+22,qy+58);g.fillStyle='#86868b';g.font='400 13px '+F;g.fillText('用手机相机扫描，即可回放这段自驾动画',32+QS+22,qy+84);
 window.__lastQR=url;c.toBlob(b=>dl(b,'自驾行程单.png'),'image/png');};
})();

// ===== 电脑鼠标：跟随时拖动=暂停跟随（显示“跟随”按钮/Z 恢复）；滚轮=镜头远近；右键/Ctrl 拖=旋转俯仰 =====
(()=>{const mc=document.getElementById('map');if(!mc)return;const ML=!!window.maplibregl;
 const isMob=()=>document.body.classList.contains('mob');const F=()=>document.getElementById('follow');const RC=()=>document.getElementById('recenter');
 const following=()=>playing&&F().checked;
 const showRC=on=>{const b=RC();if(b)b.classList.toggle('on',on);};
 const unfollowD=()=>{const f=F();if(f.checked){f.checked=false;f.dispatchEvent(new Event('change',{bubbles:true}));}showRC(true);window.__dUnf=(window.__dUnf||0)+1;};
 let down=null;
 mc.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||isMob())return;down={x:e.clientX,y:e.clientY};},true);
 addEventListener('pointermove',e=>{if(!down||e.pointerType!=='mouse')return;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>4){down=null;if(following())unfollowD();}},true);
 addEventListener('pointerup',()=>{down=null;},true);
 if(ML)mc.addEventListener('wheel',e=>{if(isMob()||!following())return;e.preventDefault();e.stopPropagation();
  const s=document.getElementById('dist');const nv=Math.max(+s.min||0,Math.min(+s.max||200,+s.value+(e.deltaY>0?1:-1)*Math.min(12,Math.max(2,Math.abs(e.deltaY)/25))));s.value=Math.round(nv);s.dispatchEvent(new Event('input',{bubbles:true}));window.__wheelDist=(window.__wheelDist||0)+1;},{capture:true,passive:false});
 F().addEventListener('change',()=>{if(F().checked&&!isMob())showRC(false);});
 const rc=RC();if(rc)rc.addEventListener('click',()=>{if(!isMob())showRC(false);});
})();

// ===== 鹰眼图：容器显示/改尺寸后重新计算尺寸并适配全程（隐藏时 fitBounds 会卡在最大缩放）=====
(()=>{const el=document.getElementById('mini');if(!el||typeof mini==='undefined')return;let lw=0,lh=0,lr=null;
 window.miniFit=force=>{try{const w=el.clientWidth,h=el.clientHeight;if(w<20||h<20)return;const r=typeof miniRoute!=='undefined'?miniRoute:null;
  if(!force&&w===lw&&h===lh&&r===lr)return;if(r!==lr){(window.__miniSE||[]).forEach(m=>m.remove());window.__miniSE=[];const ll=r&&r.getLatLngs();if(ll&&ll.length>1){window.__miniSE=[L.circleMarker(ll[0],{radius:4,color:'#fff',weight:1.5,fillColor:'#2e7d32',fillOpacity:1}).addTo(mini),L.circleMarker(ll[ll.length-1],{radius:4,color:'#fff',weight:1.5,fillColor:'#c62828',fillOpacity:1}).addTo(mini)];}}lw=w;lh=h;lr=r;mini.invalidateSize(false);
  if(r&&r.getLatLngs().length>1){mini.fitBounds(r.getBounds(),{padding:[10,10],maxZoom:12,animate:false});}
  else if(typeof coords!=='undefined'&&coords.length>1)mini.fitBounds(L.latLngBounds(coords),{padding:[10,10],maxZoom:12,animate:false});
  if(typeof miniCar!=='undefined'&&miniCar&&miniCar.bringToFront)miniCar.bringToFront();window.__miniFits=(window.__miniFits||0)+1;}catch(e){console.warn('miniFit',e);}};
 if(window.ResizeObserver)new ResizeObserver(()=>miniFit()).observe(el);
 setInterval(()=>miniFit(),700);addEventListener('resize',()=>setTimeout(()=>miniFit(true),120));
})();

// ===== 节点：拖动移动/吸附、拖到垃圾桶或屏幕边缘删除(可撤销)、路线内外样式区分、长按吸附预览、双击暂停/继续 =====
(()=>{const ML=!!window.maplibregl,B=document.body,mc=document.getElementById('map');if(!mc||typeof nodes==='undefined')return;
 const MAXOFF=typeof NODE_MAX_OFF!=='undefined'?NODE_MAX_OFF:3;
 const css=document.createElement('style');css.textContent=`
.nd-off svg>path:first-child{fill:#fff!important;stroke:#9aa0a6!important;stroke-width:2.6!important;stroke-dasharray:4 3}
.nd-off svg g{filter:grayscale(1) brightness(.55);opacity:.8}.nd-off{opacity:.92}
.nd-on svg>path:first-child{stroke:#fff;stroke-width:2.4}
.nd-drag{opacity:.95;transform-origin:50% 100%;filter:drop-shadow(0 8px 10px rgba(0,0,0,.35))}
.nd-mk{touch-action:none;cursor:grab}
#ndov{position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:1700;pointer-events:none;display:none;overflow:visible}#ndov.on{display:block}
#ndtrash{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 28px);z-index:1710;transform:translate(-50%,24px) scale(.9);opacity:0;display:flex;align-items:center;gap:8px;height:52px;padding:0 20px 0 16px;border-radius:26px;background:rgba(40,36,32,.82);color:#fff;font:600 15px/1 var(--font,-apple-system,"PingFang SC",sans-serif);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:0 8px 24px rgba(0,0,0,.25);transition:transform .2s cubic-bezier(.2,.9,.3,1.2),opacity .2s,background .15s;pointer-events:none}
#ndtrash svg{width:24px;height:24px}#ndtrash.on{opacity:1;transform:translate(-50%,0) scale(1)}#ndtrash.hot{background:#d93c3c;transform:translate(-50%,0) scale(1.12)}
#ndlens{position:fixed;z-index:1720;width:112px;height:112px;margin:-56px 0 0 -56px;border-radius:50%;border:3px solid #fff;box-shadow:0 6px 22px rgba(0,0,0,.4);background:#222;display:none;pointer-events:none;overflow:hidden;isolation:isolate}#ndlens .lm{position:absolute;inset:0;border-radius:50%;z-index:0}#ndlens .lm .leaflet-control-container{display:none}
#ndlens::before,#ndlens::after{content:'';position:absolute;z-index:5;left:50%;top:50%;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.45)}#ndlens::before{width:2px;height:30px;margin:-15px 0 0 -1px}#ndlens::after{width:30px;height:2px;margin:-1px 0 0 -15px}
#ndlens.on{display:block}#ndlens.snap{border-color:#43a047}#ndlens.far{border-color:#9aa0a6}
#ndlab{position:fixed;z-index:1721;transform:translate(-50%,-100%);padding:5px 10px;border-radius:12px;background:rgba(30,30,30,.82);color:#fff;font:600 12.5px/1.2 var(--font,-apple-system,sans-serif);white-space:nowrap;display:none;pointer-events:none}#ndlab.on{display:block}
#ntoast{position:fixed;left:50%;z-index:1760;bottom:calc(var(--peekpx,0px) + env(safe-area-inset-bottom) + 18px);transform:translate(-50%,16px);opacity:0;display:flex;align-items:center;gap:14px;min-height:44px;max-width:calc(100vw - 32px);padding:0 8px 0 16px;border-radius:22px;background:rgba(30,28,26,.88);color:#fff;font:500 14px/1.3 var(--font,-apple-system,"PingFang SC",sans-serif);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:0 8px 24px rgba(0,0,0,.25);transition:opacity .25s,transform .25s;pointer-events:none}
body:not(.mob) #ntoast{bottom:auto;top:20px;transform:translate(-50%,-16px)}#ntoast.on{opacity:1;transform:translate(-50%,0);pointer-events:auto}#ntoast .t{padding:10px 8px 10px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#ntoast.nobtn{padding-right:16px}
#ntoast button{height:36px;min-width:56px;border:0;border-radius:18px;background:rgba(255,255,255,.16);color:#ffd27a;font:600 14px/1 inherit;padding:0 14px}
#ntoast .dot{width:9px;height:9px;border-radius:50%;flex:none;margin-right:-6px}
#ppflash{position:fixed;left:50%;top:50%;z-index:1750;width:84px;height:84px;margin:-42px 0 0 -42px;border-radius:50%;background:rgba(20,20,20,.55);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;opacity:0;transform:scale(.7);pointer-events:none;transition:opacity .18s,transform .18s}
#ppflash svg{width:38px;height:38px;fill:#fff}#ppflash.on{opacity:1;transform:scale(1)}`;document.head.appendChild(css);
 const mk=(tag,id,html)=>{const e=document.createElement(tag);e.id=id;if(html)e.innerHTML=html;B.appendChild(e);return e;};
 const ov=mk('svg','ndov');ov.outerHTML='<svg id="ndov" xmlns="http://www.w3.org/2000/svg"><line id="ndln" stroke-width="2.5" stroke-linecap="round"/><circle id="ndpt" r="6" stroke="#fff" stroke-width="2.5"/></svg>';
 const OV=$('ndov'),LN=$('ndln'),PT=$('ndpt');
 const TR=mk('div','ndtrash','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3"/></svg><span>拖到这里删除</span>');
 const LS_=mk('div','ndlens','<div class="lm" id="ndlm"></div>'),LB=mk('div','ndlab'),TS=mk('div','ntoast'),PF=mk('div','ppflash');
 const buzz=ms=>{try{navigator.vibrate&&navigator.vibrate(ms);}catch(_){}};
 let tT=0;window.ntoast=(txt,opt={})=>{clearTimeout(tT);TS.innerHTML=(opt.color?'<span class="dot" style="background:'+opt.color+'"></span>':'')+'<span class="t">'+txt+'</span>'+(opt.undo?'<button id="nt_undo">撤销</button>':'');TS.classList.toggle('nobtn',!opt.undo);TS.classList.add('on');
  if(opt.undo)$('nt_undo').onclick=()=>{clearTimeout(tT);TS.classList.remove('on');opt.undo();};tT=setTimeout(()=>TS.classList.remove('on'),opt.ms||(opt.undo?4000:2400));window.__ntoast=txt;};
 const R=()=>mc.getBoundingClientRect();
 const proj=(la,lo)=>{const r=R();if(ML){const p=map.project([lo,la]);return [p.x+r.left,p.y+r.top];}const p=map.latLngToContainerPoint([la,lo]);return [p.x+r.left,p.y+r.top];};
 const unproj=(x,y)=>{const r=R();if(ML){const p=map.unproject([x-r.left,y-r.top]);return [p.lat,p.lng];}const p=map.containerPointToLatLng([x-r.left,y-r.top]);return [p.lat,p.lng];};
 const markers=()=>{if(ML)return nodeMk.map((m,i)=>({m,el:m.getElement(),n:nodes[i]}));const ms=[];nodeLayer.eachLayer(l=>{if(l instanceof L.Marker)ms.push(l);});return ms.map((m,i)=>({m,el:m.getElement(),n:nodes[i]}));};
 const setPos=(m,la,lo)=>ML?m.setLngLat([lo,la]):m.setLatLng([la,lo]);
 const onRoute=n=>n&&n.off!=null&&n.off<=MAXOFF;
 const kmTxt=a=>a>=100?a.toFixed(0):a.toFixed(1);
 // 路线内外样式
 const _rb=window.rebuildStops;window.rebuildStops=function(){const r=_rb.apply(this,arguments);try{markers().forEach(({el,n})=>{if(!el||!n)return;el.dataset.nid=n.id;el.classList.add('nd-mk');el.classList.toggle('nd-off',!onRoute(n));el.classList.toggle('nd-on',onRoute(n));});}catch(e){console.warn(e);}return r;};
 try{rebuildStops();}catch(_){}
 const fb=(n)=>{if(!coords.length)return;if(onRoute(n))ntoast('已加到路线 · 距起点 '+kmTxt(n.along||0)+' km',{color:'#43a047'});else ntoast('离路线较远，只显示不停靠',{color:'#9aa0a6'});};
 const _nn=window.newNode;window.newNode=function(){const n=_nn.apply(this,arguments);if(!window.__silentNode)setTimeout(()=>fb(n),30);return n;};
 // 放大镜：独立 Leaflet 小地图，主图缩放 +3（3D 的 512 瓦片再 +1），只在显示时更新
 let LM=null,LMr=null,LMk=null,LMroute=null,LMpt=null;
 const loupe=(la,lo,si,ok)=>{try{if(!LM){LM=L.map('ndlm',{zoomControl:false,attributionControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,boxZoom:false,keyboard:false,touchZoom:false,inertia:false,fadeAnimation:false,zoomAnimation:false});
   L.tileLayer(BM.U.esri,{maxNativeZoom:18,maxZoom:20}).addTo(LM);L.tileLayer(BM.U.eb,{maxNativeZoom:18,maxZoom:20}).addTo(LM);}
  if(LMr!==coords){LMr=coords;if(LMroute)LMroute.remove();LMroute=coords.length?L.polyline(coords,{color:'#ff9800',weight:5,opacity:.95}).addTo(LM):null;}
  const z=Math.min(19,Math.round(map.getZoom()+(ML?1:0)+3));LM.setView([la,lo],z,{animate:false});
  if(LMk)LMk.remove();LMk=null;if(si&&si.off<60){LMk=L.polyline([[la,lo],[si.lat,si.lon]],{color:ok?'#43a047':'#9aa0a6',weight:3,dashArray:ok?null:'6 6'}).addTo(LM);if(LMpt)LMpt.remove();LMpt=L.circleMarker([si.lat,si.lon],{radius:5,color:'#fff',weight:2,fillColor:ok?'#43a047':'#9aa0a6',fillOpacity:1}).addTo(LM);}
  window.__loupeZ=z;}catch(e){console.warn('loupe',e);}};
 let lpT=0;
 // 吸附预览
 const preview=(x,y,show)=>{if(!show){OV.classList.remove('on');LS_.classList.remove('on','snap','far');LB.classList.remove('on');return null;}
  const [la,lo]=unproj(x,y);const si=coords.length?snapInfo(la,lo):{off:1e9};const ok=si.off<=MAXOFF;
  LS_.style.left=x+'px';LS_.style.top=Math.max(60,y-96)+'px';const first=!LS_.classList.contains('on');if(B.classList.contains('mob'))LS_.classList.add('on');else LS_.classList.remove('on');if(first&&LM)LM.invalidateSize(false);const nw=performance.now();if(B.classList.contains('mob')&&(nw-lpT>40||first)){lpT=nw;loupe(la,lo,si,ok);}LS_.classList.toggle('snap',ok);LS_.classList.toggle('far',!ok);
  if(coords.length){const [sx,sy]=proj(si.lat,si.lon);OV.classList.add('on');LN.setAttribute('x1',x);LN.setAttribute('y1',y);LN.setAttribute('x2',sx);LN.setAttribute('y2',sy);
   const col=ok?'#43a047':'#9aa0a6';LN.setAttribute('stroke',col);LN.setAttribute('stroke-dasharray',ok?'':'5 5');PT.setAttribute('cx',sx);PT.setAttribute('cy',sy);PT.setAttribute('fill',col);PT.style.display=si.off<60?'':'none';LN.style.display=si.off<60?'':'none';}
  LB.textContent=!coords.length?'放开以放置':ok?'吸附到路线 · '+kmTxt(si.along)+' km':'离路线 '+(si.off<100?si.off.toFixed(1):si.off.toFixed(0))+' km · 不停靠';LB.style.left=x+'px';LB.style.top=(B.classList.contains('mob')?Math.max(4,Math.max(60,y-96)-72):y-34)+'px';LB.classList.add('on');
  window.__ndPrev={ok,off:si.off,along:si.along};return {la,lo,si,ok};};
 // 拖动节点
 let D=null;
 const delWithUndo=id=>{const i=nodes.findIndex(n=>n.id===id);if(i<0)return;const n=nodes[i];nodes.splice(i,1);rebuildStops();saveNodes();buzz([10,40,10]);window.__ndDeleted=n.id;try{$('ned').style.display='none';}catch(_){}
  ntoast('已删除“'+(n.title||'节点')+'”',{undo:()=>{nodes.splice(Math.min(i,nodes.length),0,n);rebuildStops();saveNodes();window.__ndDeleted=null;ntoast('已恢复',{});}});};window.delNodeUndo=delWithUndo;
 // 电脑：右键菜单（编辑/删除），悬停节点按 Delete 删除
 const cm=document.createElement('div');cm.id='ndcm';B.appendChild(cm);const cst=document.createElement('style');cst.textContent='#ndcm{position:fixed;z-index:1800;display:none;min-width:132px;padding:5px;border-radius:10px;background:rgba(252,250,246,.96);box-shadow:0 8px 28px rgba(0,0,0,.22);font:14px/1 var(--font,-apple-system,"PingFang SC",sans-serif)}#ndcm.on{display:block}#ndcm button{display:block;width:100%;text-align:left;border:0;background:none;padding:9px 12px;border-radius:7px;cursor:pointer;color:#2b2620;font:inherit}#ndcm button:hover{background:rgba(95,127,100,.12)}#ndcm button.d{color:#d93c3c}';document.head.appendChild(cst);
 let hov=null;document.addEventListener('mouseover',e=>{const el=e.target.closest&&e.target.closest('.nd-mk');hov=el?el.dataset.nid:null;},true);
 document.addEventListener('contextmenu',e=>{const el=e.target.closest&&e.target.closest('.nd-mk');if(!el||B.classList.contains('mob'))return;e.preventDefault();e.stopPropagation();const id=el.dataset.nid;cm.innerHTML='<button id="cm_ed">编辑节点</button><button class="d" id="cm_del">删除节点 <span style="float:right;opacity:.5">Delete</span></button>';cm.style.left=Math.min(e.clientX,innerWidth-150)+'px';cm.style.top=Math.min(e.clientY,innerHeight-90)+'px';cm.classList.add('on');$('cm_ed').onclick=()=>{cm.classList.remove('on');editNode(id);};$('cm_del').onclick=()=>{cm.classList.remove('on');delWithUndo(id);};},true);
 addEventListener('pointerdown',e=>{if(!cm.contains(e.target))cm.classList.remove('on');},true);
 addEventListener('keydown',e=>{if((e.key==='Delete'||e.key==='Backspace')&&hov&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();delWithUndo(hov);hov=null;}else if(e.key==='Escape')cm.classList.remove('on');});
 const hotAt=(x,y)=>{if(!B.classList.contains('mob'))return false;const t=TR.getBoundingClientRect();const inT=x>t.left-16&&x<t.right+16&&y>t.top-20&&y<t.bottom+16;const edge=x<10||x>innerWidth-10||y>innerHeight-8;return inT||edge;};
 const down=e=>{const el=e.target.closest&&e.target.closest('.nd-mk');if(!el||!mc.contains(el))return;const id=el.dataset.nid;const it=markers().find(o=>o.n&&o.n.id===id);if(!it)return;
  e.stopPropagation();window.__mapMoving=1;D={id,it,x0:e.clientX,y0:e.clientY,on:false,pid:e.pointerId,t0:performance.now(),lat0:it.n.lat,lon0:it.n.lon};};
 const move=e=>{if(!D||e.pointerId!==D.pid)return;const x=e.clientX,y=e.clientY;
  if(!D.on){if(Math.hypot(x-D.x0,y-D.y0)<7)return;if(B.classList.contains('mob')&&performance.now()-D.t0<350){D.dead=1;}if(D.dead)return;D.on=true;D.it.el.classList.add('nd-drag');if(B.classList.contains('mob'))TR.classList.add('on');else B.style.cursor='crosshair';B.classList.add('nd-dragging');buzz(8);}
  e.preventDefault();const [la,lo]=unproj(x,y+2);setPos(D.it.m,la,lo);const hot=hotAt(x,y);if(hot!==!!D.hot){D.hot=hot;TR.classList.toggle('hot',hot);if(hot)buzz(14);}
  if(hot)preview(0,0,false);else preview(x,y,true);D.last=[x,y];};
 const up=e=>{if(!D||e.pointerId!==D.pid)return;const d=D;D=null;B.style.cursor='';window.__mapMoving=0;TR.classList.remove('on','hot');B.classList.remove('nd-dragging');preview(0,0,false);
  if(!d.on)return;d.it.el.classList.remove('nd-drag');const sup=ev=>{ev.stopPropagation();ev.preventDefault();};d.it.el.addEventListener('click',sup,{capture:true,once:true});setTimeout(()=>d.it.el.removeEventListener('click',sup,true),400);
  const i=nodes.findIndex(n=>n.id===d.id);if(i<0)return;const n=nodes[i];
  if(d.hot){delWithUndo(n.id);return;}
  const [x,y]=d.last;const [la,lo]=unproj(x,y+2);
  if(!dropOk(x,y+2,la,lo)){setPos(d.it.m,d.lat0,d.lon0);rebuildStops();ntoast('放置点太靠近天际线，已取消移动',{color:'#9aa0a6'});window.__ndRejected=1;return;}
  const si=coords.length?snapInfo(la,lo):{off:1e9};const o0=[n.lat,n.lon];
  if(si.off<=MAXOFF){n.lat=si.lat;n.lon=si.lon;}else{n.lat=la;n.lon=lo;}rebuildStops();saveNodes();buzz(10);
  if(onRoute(n))fb(n);else ntoast('离路线较远，只显示不停靠',{color:'#9aa0a6',undo:()=>{n.lat=o0[0];n.lon=o0[1];rebuildStops();saveNodes();ntoast('已移回原处',{});}});};
 // 3D 倾斜视角下，靠近天际线的屏幕点反算出的经纬度会飞到几千公里外：拒绝这样的放置
 const dropOk=(x,y,la,lo)=>{if(!isFinite(la)||!isFinite(lo)||Math.abs(la)>85)return false;if(!ML)return true;try{const r=R();const [px,py]=proj(la,lo);if(Math.hypot(px-x,py-y)>4)return false;
  const c=map.getCenter(),bt=unproj(r.left+r.width/2,r.bottom-1);const ref=hav([c.lat,c.lng],bt);const d=hav([c.lat,c.lng],[la,lo]);return !(map.getPitch()>20&&d>Math.max(ref*4,30));}catch(_){return true;}};
 document.addEventListener('pointerdown',down,true);addEventListener('pointermove',move,{capture:true,passive:false});addEventListener('pointerup',up,true);addEventListener('pointercancel',up,true);
 // 拖动时阻止地图平移
 ['touchstart','mousedown'].forEach(k=>document.addEventListener(k,e=>{const el=e.target.closest&&e.target.closest('.nd-mk');if(el&&mc.contains(el))e.stopPropagation();},true));
 document.addEventListener('touchmove',e=>{if(D&&D.on)e.preventDefault();},{capture:true,passive:false});
 // 长按添加时的吸附预览（手机）
 let lp=null;document.addEventListener('touchstart',e=>{if(!B.classList.contains('mob')||e.touches.length!==1||!mc.contains(e.target)||e.target.closest('.nd-mk')){clearTimeout(lp);preview(0,0,false);return;}
  const x=e.touches[0].clientX,y=e.touches[0].clientY;clearTimeout(lp);lp=setTimeout(()=>{if(!window.__mapMoving)preview(x,y,true);setTimeout(()=>preview(0,0,false),900);},180);},{capture:true,passive:true});
 ['touchmove','touchend','touchcancel'].forEach(k=>document.addEventListener(k,e=>{if(k==='touchmove'&&e.touches[0]){return;}clearTimeout(lp);if(!D)setTimeout(()=>{if(!D)preview(0,0,false);},k==='touchend'?350:0);},{capture:true,passive:true}));
 document.addEventListener('touchmove',e=>{clearTimeout(lp);},{capture:true,passive:true});
 // 双击/双点 暂停/继续
 const sess=()=>coords.length&&(playing||(dist>0.01&&!arrived&&dist<total));
 const flash=pl=>{PF.innerHTML=pl?'<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>':'<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';PF.classList.remove('on');void PF.offsetWidth;PF.classList.add('on');clearTimeout(PF._t);PF._t=setTimeout(()=>PF.classList.remove('on'),550);};
 const toggle=()=>{if(playing){pause();flash(false);}else{play(true);flash(true);}window.__dblToggles=(window.__dblToggles||0)+1;buzz(8);};
 setInterval(()=>{try{const s=sess(),h=map.doubleClickZoom,en=ML?h.isEnabled():h.enabled();if(s&&en)h.disable();else if(!s&&!en)h.enable();}catch(_){}},250);
 mc.addEventListener('dblclick',e=>{if(!sess()||e.target.closest('.nd-mk,.leaflet-control,.maplibregl-ctrl'))return;e.preventDefault();e.stopPropagation();toggle();},true);
 let lt=0,lx=0,ly=0,ts=null;mc.addEventListener('touchstart',e=>{ts=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY,t:e.timeStamp,n:e.touches.length}:null;if(e.touches.length>1)lt=0;},{capture:true,passive:true});
 mc.addEventListener('touchend',e=>{if(!ts||e.touches.length||e.changedTouches.length!==1)return;const c=e.changedTouches[0];if(Math.hypot(c.clientX-ts.x,c.clientY-ts.y)>12||e.timeStamp-ts.t>350||e.target.closest('.nd-mk')){lt=0;return;}
  const now=e.timeStamp;if(now-lt<420&&Math.hypot(c.clientX-lx,c.clientY-ly)<36&&sess()){lt=0;e.preventDefault();toggle();return;}lt=now;lx=c.clientX;ly=c.clientY;},{capture:true,passive:false});
 window.__ndApi={markers,proj,unproj,D:()=>D};
})();

// ===== 节点照片：标记上显示首图缩略+数量角标；点击打开全屏看图（左右翻页、缩略条、双指/双击缩放、下滑关闭、编辑）=====
(()=>{const B=document.body,mc=document.getElementById('map');if(!mc||typeof nodes==='undefined')return;
 const css=document.createElement('style');css.textContent=`
.mk3.nd-hasph{position:relative}.nd-ph{position:absolute;left:4px;top:3px;width:24px;height:24px;border-radius:50%;background:#ddd center/cover no-repeat;box-shadow:0 0 0 2px #fff;pointer-events:none}
.nd-off .nd-ph{filter:grayscale(1);opacity:.75}
.nd-bd{position:absolute;right:-7px;top:-6px;min-width:18px;height:18px;padding:0 5px;box-sizing:border-box;border-radius:9px;background:#ff3b30;color:#fff;font:700 11px/18px -apple-system,"PingFang SC",sans-serif;text-align:center;box-shadow:0 0 0 1.5px #fff;pointer-events:none}
#phv{position:fixed;inset:0;z-index:4000;background:#000;display:none;touch-action:none;user-select:none;-webkit-user-select:none;color:#fff;font-family:var(--font,-apple-system,"PingFang SC",sans-serif)}
#phv.on{display:block}#phv .trk{position:absolute;inset:0;display:flex;will-change:transform}
#phv .sl{flex:none;width:100vw;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden}
#phv .sl img{max-width:100%;max-height:100%;object-fit:contain;transform-origin:0 0;will-change:transform;-webkit-user-drag:none;pointer-events:none}
#phv .top{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;justify-content:space-between;padding:calc(env(safe-area-inset-top) + 6px) 8px 8px;background:linear-gradient(rgba(0,0,0,.55),transparent);transition:opacity .2s}
#phv .top button{height:44px;min-width:44px;border:0;background:rgba(255,255,255,.14);color:#fff;border-radius:22px;font:600 15px/1 inherit;padding:0 14px;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
#phv .ttl{flex:1;text-align:center;font:600 15px/1.25 inherit;padding:0 8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#phv .ttl small{display:block;font-weight:500;font-size:12px;opacity:.75;margin-top:2px}
#phv .strip{position:absolute;left:0;right:0;bottom:0;display:flex;gap:6px;justify-content:center;overflow-x:auto;padding:10px 12px calc(env(safe-area-inset-bottom) + 12px);background:linear-gradient(transparent,rgba(0,0,0,.6));transition:opacity .2s}
#phv .strip img{flex:none;width:44px;height:44px;object-fit:cover;border-radius:6px;opacity:.55;border:2px solid transparent;cursor:pointer}#phv .strip img.cur{opacity:1;border-color:#fff}
#phv.ui-off .top,#phv.ui-off .strip{opacity:0;pointer-events:none}
#phv .nav{position:absolute;top:50%;width:48px;height:48px;margin-top:-24px;border:0;border-radius:24px;background:rgba(255,255,255,.14);color:#fff;font-size:24px;display:none}#phv .nav.l{left:16px}#phv .nav.r{right:16px}
body:not(.mob) #phv .nav{display:block}
#stopBody>img{cursor:zoom-in}`;document.head.appendChild(css);
 const pv=document.createElement('div');pv.id='phv';pv.setAttribute('role','dialog');pv.innerHTML='<div class="trk"></div><div class="top"><button id="pv_x" aria-label="关闭">✕</button><div class="ttl"><span id="pv_t"></span><small id="pv_i"></small></div><button id="pv_ed">编辑</button></div><button class="nav l" id="pv_l" aria-label="上一张">‹</button><button class="nav r" id="pv_r" aria-label="下一张">›</button><div class="strip"></div>';B.appendChild(pv);
 const TRK=pv.querySelector('.trk'),STR=pv.querySelector('.strip');
 let V=null;// {n,i,ph,wasPlaying}
 const W=()=>innerWidth;
 const zs=()=>V.z[V.i];
 const applyZ=()=>{const img=TRK.children[V.i]&&TRK.children[V.i].querySelector('img');if(!img)return;const z=zs();img.style.transform=`translate(${z.x}px,${z.y}px) scale(${z.s})`;};
 const clampZ=()=>{const z=zs(),img=TRK.children[V.i].querySelector('img');if(z.s<=1){z.s=1;z.x=0;z.y=0;return;}const r=img.offsetWidth*z.s,h=img.offsetHeight*z.s;const mx=Math.max(0,(r-img.offsetWidth)),my=Math.max(0,(h-img.offsetHeight));
  const ex=Math.max(0,(r-W())/2),ey=Math.max(0,(h-innerHeight)/2);z.x=Math.min(ex,Math.max(-mx-ex,z.x));z.y=Math.min(ey,Math.max(-my-ey,z.y));};
 const go=(i,anim=true)=>{V.i=Math.max(0,Math.min(V.ph.length-1,i));TRK.style.transition=anim?'transform .3s cubic-bezier(.2,.8,.2,1)':'none';TRK.style.transform=`translateX(${-V.i*W()}px)`;
  $('pv_i').textContent=(V.i+1)+' / '+V.ph.length;[...STR.children].forEach((e,j)=>e.classList.toggle('cur',j===V.i));const c=STR.children[V.i];c&&c.scrollIntoView({inline:'center',block:'nearest'});window.__pvIdx=V.i;};
 window.openPhotos=(n,i=0,fromStop)=>{if(!n||!n.photos||!n.photos.length)return false;V={n,i,ph:n.photos.slice(),z:n.photos.map(()=>({s:1,x:0,y:0})),wasPlaying:!!playing};if(playing)pause();
  TRK.innerHTML=V.ph.map(p=>'<div class="sl"><img src="'+p+'" alt=""></div>').join('');STR.innerHTML=V.ph.length>1?V.ph.map((p,j)=>'<img src="'+p+'" data-j="'+j+'">').join(''):'';STR.style.display=V.ph.length>1?'':'none';
  $('pv_t').textContent=n.title||'自定义节点';pv.classList.remove('ui-off');pv.style.opacity=1;pv.classList.add('on');B.classList.add('pv-on');go(i,false);window.__pvOpen=true;return true;};
 const close=(edit)=>{if(!V)return;const v=V;V=null;pv.classList.remove('on');B.classList.remove('pv-on');TRK.style.transform='';pv.style.opacity=1;window.__pvOpen=false;if(edit)editNode(v.n.id);else if(v.wasPlaying)play(true);};
 window.closePhotos=close;
 $('pv_x').onclick=()=>close();$('pv_ed').onclick=()=>close(true);$('pv_l').onclick=()=>V&&go(V.i-1);$('pv_r').onclick=()=>V&&go(V.i+1);
 STR.addEventListener('click',e=>{const j=e.target.dataset&&e.target.dataset.j;if(j!=null)go(+j);});
 addEventListener('keydown',e=>{if(!V)return;if(e.key==='ArrowRight'){go(V.i+1);e.preventDefault();e.stopPropagation();}else if(e.key==='ArrowLeft'){go(V.i-1);e.preventDefault();e.stopPropagation();}else if(e.key==='Escape'){close();e.stopPropagation();}},true);
 addEventListener('resize',()=>{if(V)go(V.i,false);});
 // 手势
 const P=new Map();let G=null,lastTap=0,lastTapXY=[0,0];
 pv.addEventListener('pointerdown',e=>{if(!V||e.target.closest('button,.strip'))return;pv.setPointerCapture&&pv.setPointerCapture(e.pointerId);P.set(e.pointerId,[e.clientX,e.clientY]);const z=zs();
  if(P.size===2){const [a,b]=[...P.values()];G={t:'pinch',d0:Math.hypot(a[0]-b[0],a[1]-b[1]),s0:z.s,x0:z.x,y0:z.y,cx:(a[0]+b[0])/2,cy:(a[1]+b[1])/2};}
  else if(P.size===1)G={t:'?',x0:e.clientX,y0:e.clientY,zx:z.x,zy:z.y,t0:Date.now()};});
 pv.addEventListener('pointermove',e=>{if(!V||!P.has(e.pointerId)||!G)return;P.set(e.pointerId,[e.clientX,e.clientY]);const z=zs();
  if(G.t==='pinch'&&P.size>=2){const [a,b]=[...P.values()];const d=Math.hypot(a[0]-b[0],a[1]-b[1]);const img=TRK.children[V.i].querySelector('img'),r=img.getBoundingClientRect();
   const ns=Math.max(1,Math.min(5,G.s0*d/G.d0));const ox=(G.cx-(r.left-z.x))/1,oy=(G.cy-(r.top-z.y));z.x=G.x0-(ox-G.x0)*(ns/G.s0-1)+0;z.y=G.y0-(oy-G.y0)*(ns/G.s0-1);z.x=G.x0+(G.cx-r.left+z.x-G.x0)*0-(G.cx-(r.left-z.x+G.x0)-G.x0)*0;
   // 以双指中心为缩放中心
   const bx=r.left-z.x,by=r.top-z.y;const px=(G.cx-bx-G.x0)/G.s0,py=(G.cy-by-G.y0)/G.s0;z.s=ns;z.x=G.cx-bx-px*ns;z.y=G.cy-by-py*ns;applyZ();return;}
  const dx=e.clientX-G.x0,dy=e.clientY-G.y0;
  if(G.t==='?'){if(Math.hypot(dx,dy)<8)return;G.t=z.s>1.01?'pan':Math.abs(dy)>Math.abs(dx)&&dy>0?'down':'page';}
  if(G.t==='pan'){z.x=G.zx+dx;z.y=G.zy+dy;applyZ();}
  else if(G.t==='page'){const edge=(V.i===0&&dx>0)||(V.i===V.ph.length-1&&dx<0);TRK.style.transition='none';TRK.style.transform=`translateX(${-V.i*W()+dx*(edge?0.35:1)}px)`;}
  else if(G.t==='down'){const k=Math.max(0,dy);TRK.style.transition='none';TRK.style.transform=`translate(${-V.i*W()}px,${k}px) scale(${1-Math.min(.25,k/1600)})`;pv.style.opacity=Math.max(.35,1-k/500);}});
 const end=e=>{if(!V||!P.has(e.pointerId))return;P.delete(e.pointerId);if(!G)return;const z=zs();
  if(G.t==='pinch'){if(P.size===0){clampZ();applyZ();G=null;}else if(P.size===1){const [a]=[...P.values()];G={t:'pan',x0:a[0],y0:a[1],zx:z.x,zy:z.y};}return;}
  const dx=e.clientX-G.x0,dy=e.clientY-G.y0,dt=Date.now()-(G.t0||0);
  if(G.t==='page'){const v=dx/Math.max(1,dt);go(V.i+(dx<-W()*0.18||v<-0.45?1:dx>W()*0.18||v>0.45?-1:0));}
  else if(G.t==='down'){if(dy>110||dy/Math.max(1,dt)>0.6)close();else{TRK.style.transition='transform .25s';TRK.style.transform=`translateX(${-V.i*W()}px)`;pv.style.opacity=1;}}
  else if(G.t==='pan'){clampZ();const img=TRK.children[V.i].querySelector('img');img.style.transition='transform .2s';applyZ();setTimeout(()=>img.style.transition='',220);}
  else if(G.t==='?'){const now=Date.now();if(now-lastTap<300&&Math.hypot(e.clientX-lastTapXY[0],e.clientY-lastTapXY[1])<30){lastTap=0;clearTimeout(G._t);const img=TRK.children[V.i].querySelector('img'),r=img.getBoundingClientRect();
     if(z.s>1.01){z.s=1;z.x=0;z.y=0;}else{const ns=2.5,bx=r.left-z.x,by=r.top-z.y,px=(e.clientX-bx-z.x)/z.s,py=(e.clientY-by-z.y)/z.s;z.s=ns;z.x=e.clientX-bx-px*ns;z.y=e.clientY-by-py*ns;clampZ();}
     img.style.transition='transform .25s';applyZ();setTimeout(()=>img.style.transition='',260);window.__pvZoom=z.s;}
   else{lastTap=now;lastTapXY=[e.clientX,e.clientY];setTimeout(()=>{if(lastTap===now&&V)pv.classList.toggle('ui-off');},310);}}
  G=null;};
 pv.addEventListener('pointerup',end);pv.addEventListener('pointercancel',end);
 pv.addEventListener('dblclick',e=>e.preventDefault());pv.addEventListener('wheel',e=>{if(!V)return;e.preventDefault();const z=zs();z.s=Math.max(1,Math.min(5,z.s*(e.deltaY<0?1.15:1/1.15)));if(z.s===1){z.x=0;z.y=0;}clampZ();applyZ();},{passive:false});
 // 标记：首图缩略 + 数量
 const _rb=window.rebuildStops;window.rebuildStops=function(){const r=_rb.apply(this,arguments);try{(window.__ndApi?__ndApi.markers():[]).forEach(({el,n})=>{if(!el||!n)return;el.querySelectorAll('.nd-ph,.nd-bd').forEach(x=>x.remove());el.classList.toggle('nd-hasph',!!n.photos.length);
  if(n.photos.length){const s=document.createElement('span');s.className='nd-ph';s.style.backgroundImage='url("'+n.photos[0]+'")';el.appendChild(s);if(n.photos.length>1){const b=document.createElement('b');b.className='nd-bd';b.textContent=n.photos.length;el.appendChild(b);}}});}catch(e){console.warn(e);}return r;};
 try{rebuildStops();}catch(_){}
 // 点击节点：有照片 → 看图；没有 → 编辑卡
 document.addEventListener('click',e=>{const el=e.target.closest&&e.target.closest('.nd-mk');if(!el||!mc.contains(el))return;const n=nodes.find(x=>x.id===el.dataset.nid);if(!n||!n.photos.length)return;e.stopPropagation();e.preventDefault();openPhotos(n,0);},true);
 // 播放时的停靠照片 → 看图
 document.addEventListener('click',e=>{const im=e.target.closest&&e.target.closest('#stopBody img');if(!im)return;const s=stops[nextStop-1];const n=s&&s.node;if(!n||!n.photos.length)return;e.stopPropagation();e.preventDefault();
  let i=n.photos.indexOf(im.getAttribute('src'));if(i<0)i=0;openPhotos(n,i,true);},true);
})();

// ===== 电脑端补齐：分享路线（复制链接 + 二维码）=====
(()=>{const sp=document.getElementById('sumpng');if(!sp||typeof qrcode!=='function')return;const qr=(g,url,x,y,sz)=>{const q=qrcode(0,'M');q.addData(url,'Byte');q.make();const n=q.getModuleCount(),c=sz/(n+4);g.fillStyle='#fff';g.fillRect(x,y,sz,sz);g.fillStyle='#1d1d1f';for(let r=0;r<n;r++)for(let k=0;k<n;k++)if(q.isDark(r,k))g.fillRect(x+(k+2)*c,y+(r+2)*c,Math.ceil(c),Math.ceil(c));};
 const b=document.createElement('button');b.className='btn';b.id='pc_share';b.innerHTML='<svg class="i" viewBox="0 0 24 24"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/></svg>分享路线';sp.after(b);
 const st=document.createElement('style');st.textContent=`body.mob #pc_share{display:none!important}
#shdlg{position:fixed;inset:0;z-index:3500;background:rgba(0,0,0,.35);display:none;align-items:center;justify-content:center}#shdlg.on{display:flex}
#shdlg .bx{width:300px;padding:20px;border-radius:18px;background:var(--paper,#faf8f4);box-shadow:0 20px 60px rgba(0,0,0,.3);text-align:center;font-family:var(--font,-apple-system,"PingFang SC",sans-serif);color:#2b2620}
#shdlg h4{margin:0 0 4px;font-size:16px}#shdlg p{margin:0 0 12px;font-size:12.5px;color:#7a7268}#shdlg canvas{width:220px;height:220px;border-radius:10px}
#shdlg .rw{display:flex;gap:8px;margin-top:14px}#shdlg button{flex:1;height:40px;border:0;border-radius:12px;font:600 14px/1 inherit;background:rgba(95,127,100,.12);color:#5f7f64;cursor:pointer}#shdlg button.p{background:#5f7f64;color:#fff}`;document.head.appendChild(st);
 const d=document.createElement('div');d.id='shdlg';d.innerHTML='<div class="bx"><h4>分享路线</h4><p id="sh_t"></p><canvas id="sh_qr" width="440" height="440"></canvas><div class="rw"><button id="sh_x">关闭</button><button class="p" id="sh_cp">复制链接</button></div></div>';document.body.appendChild(d);
 const close=()=>d.classList.remove('on');d.addEventListener('click',e=>{if(e.target===d)close();});$('sh_x').onclick=close;addEventListener('keydown',e=>{if(e.key==='Escape')close();});
 b.onclick=async()=>{const url=window.qrURL?qrURL():shareURL();window.__lastShare=url;$('sh_t').textContent=$('from').value+' → '+$('to').value+' · 扫码在手机上打开';const c=$('sh_qr'),g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,440,440);qr(g,url,0,0,440);d.classList.add('on');
  $('sh_cp').onclick=async()=>{try{await navigator.clipboard.writeText(shareURL());$('sh_cp').textContent='已复制 ✓';}catch(_){prompt('复制此链接分享：',shareURL());}setTimeout(()=>$('sh_cp').textContent='复制链接',1500);};};
})();
