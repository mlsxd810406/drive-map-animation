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
setInterval(()=>{if(window.__arrived&&!tA&&!TS.classList.contains('on')&&!TS.classList.contains('pre')&&!B.classList.contains('rec')){tA=setTimeout(()=>{tA=0;if(window.__arrived)showSum();},3000);}if(!window.__arrived&&(tA||TS.classList.contains('pre'))){clearTimeout(tA);tA=0;hideSum();}},200);
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
