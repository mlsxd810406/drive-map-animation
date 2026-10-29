// ===== 电脑端 3D：电影镜头导演。桌面 + MapLibre + 开关开启时接管跟随相机；手机/2D 不介入 =====
(()=>{const B=document.body;if(typeof map==='undefined'||!window.maplibregl)return;
 const pc=()=>!B.classList.contains('mob')&&!matchMedia('(max-width:640px),(max-height:500px)').matches;
 const rm=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const $=id=>document.getElementById(id);
 const row=$('cinerow'),tog=$('cine');if(row&&pc())row.style.display='';
 if(tog){try{const v=localStorage.getItem('dm_cine');if(v==='0')tog.checked=false;if(v==='1')tog.checked=true;}catch(_){}
  tog.addEventListener('change',()=>{try{localStorage.setItem('dm_cine',tog.checked?'1':'0');}catch(_){}window.__cineOn=!!tog.checked;if(tog.checked)begin(null,true);});}
 const NAMES={follow:'跟随拍',dolly:'远近推进',orbit:'环绕',overhead:'俯拍',low:'低角度跟拍',side:'侧前方跟拍',aerial:'航拍掠过'};
 const KEYS=['follow','dolly','orbit','overhead','low','side','aerial'];
 let shot=null,prevShot=null,t0=0,dur=6,seed=1,uIdle=0,lastTip=0,prevCam=null;
 const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return (seed&0xffff)/0xffff;};
 const lerp=(a,b,u)=>a+(b-a)*u,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const ease=u=>{u=clamp(u,0,1);return u*u*(3-2*u);};
 const angLerp=(a,b,u)=>a+(((b-a+540)%360)-180)*u;
 const dest=(lat,lon,brg,km)=>{const R=6371,r=Math.PI/180,φ1=lat*r,λ1=lon*r,δ=km/R,θ=brg*r;
  const φ2=Math.asin(Math.sin(φ1)*Math.cos(δ)+Math.cos(φ1)*Math.sin(δ)*Math.cos(θ));
  const λ2=λ1+Math.atan2(Math.sin(θ)*Math.sin(δ)*Math.cos(φ1),Math.cos(δ)-Math.sin(φ1)*Math.sin(φ2));
  return [φ2/r,((λ2/r+540)%360)-180];};
 function begin(prefer,force){let pool=KEYS.slice();if(prefer&&prefer.length)pool=prefer.filter(k=>KEYS.includes(k));
  if(prevShot&&pool.length>1)pool=pool.filter(k=>k!==prevShot);if(!pool.length)pool=KEYS.filter(k=>k!==prevShot);
  prevShot=shot;shot=pool[Math.floor(rnd()*pool.length)]||'follow';
  const sp=Math.max(5,+(document.getElementById('speed')||{}).value||25);
  dur=clamp((4.5+rnd()*3.5)*Math.sqrt(25/sp),3.2,10);t0=performance.now();prevCam=null;
  window.__cineShot=NAMES[shot];window.__cineDur=dur;
  if(force||(shot!=='follow'&&performance.now()-lastTip>2500)){lastTip=performance.now();if(window.ntoast&&shot!=='follow')ntoast(NAMES[shot],{ms:1300});}
  return shot;}
 try{['dragstart','rotatestart','pitchstart'].forEach(ev=>map.on(ev,e=>{if(e&&e.originalEvent&&pc())uIdle=performance.now()+4500;}));}catch(_){}
 function active(){return !!(pc()&&tog&&tog.checked&&!rm()&&$('follow')&&$('follow').checked&&performance.now()>=uIdle&&typeof playing!=='undefined'&&playing);}
 function apply(ctx){if(!active()){shot=null;prevCam=null;return null;}
  const now=performance.now();if(!shot||now-t0>dur*1000)begin(ctx.stopTimer?['overhead','orbit']:null,false);
  const u=ease((now-t0)/(dur*1000)),lat=ctx.carLL[0],lon=ctx.carLL[1],H=ctx.heading,baseZ=ctx.camZ,baseP=ctx.pitchBase;
  const ahead=(km)=>{try{return pointAt(ctx.dist+km);}catch(_){return ctx.carLL;}};
  let out={center:[lon,lat],zoom:baseZ,bearing:H,pitch:baseP};
  switch(shot){
   case 'follow':
    out.bearing=H+1.8*Math.sin(now*0.00025);out.pitch=clamp(baseP+3*Math.sin(now*0.0003),18,82);break;
   case 'dolly':{
    const far=baseZ-1.6,near=baseZ+0.9,goIn=seed&1;
    out.zoom=goIn?lerp(far,near,u):lerp(near,far,u);
    out.bearing=H;out.pitch=clamp(baseP+(goIn?-4:6),22,78);
    const la=ahead(0.35);out.center=[la[1],la[0]];break;}
   case 'orbit':{
    const turns=0.55+0.55*(seed%3)/2,ang=H+(seed&2?-1:1)*turns*360*u;
    const r=clamp(0.55-(baseZ-10)*0.04,0.18,0.7),[la,lo]=dest(lat,lon,ang+180,r);
    out.center=[lo,la];out.bearing=ang;out.pitch=clamp(baseP+8,35,75);out.zoom=baseZ-0.3;break;}
   case 'overhead':
    out.pitch=lerp(baseP,82,ease(Math.min(1,u*1.4)));out.zoom=baseZ-0.5+0.15*Math.sin(u*Math.PI);
    out.bearing=H+u*25*(seed&1?1:-1);break;
   case 'low':{
    out.pitch=lerp(baseP,28,ease(Math.min(1,u*1.2)));out.zoom=baseZ+0.7;
    out.bearing=H+3*Math.sin(now*0.0004);const la=ahead(0.3);out.center=[la[1],la[0]];break;}
   case 'side':{
    const side=(seed&1?1:-1),aheadKm=0.35+0.55*(1-u),[la,lo]=dest(lat,lon,H+side*25,aheadKm);
    out.center=[lo,la];
    out.bearing=Math.atan2((lon-lo)*Math.cos(lat*Math.PI/180),lat-la)*180/Math.PI;
    out.pitch=clamp(baseP-5,30,70);out.zoom=baseZ+0.15;break;}
   case 'aerial':{
    const up=u<0.55?ease(u/0.55):ease((1-u)/0.45);
    out.pitch=lerp(baseP,62,up);out.zoom=lerp(baseZ,baseZ-1.8,up);
    const la=ahead(lerp(0.2,2.2,up));out.center=[la[1],la[0]];out.bearing=H+lerp(0,18*(seed&1?1:-1),up);break;}
  }
  if(prevCam){const k=Math.min(1,ctx.dt*2.4);
   out.center=[lerp(prevCam.center[0],out.center[0],k),lerp(prevCam.center[1],out.center[1],k)];
   out.zoom=lerp(prevCam.zoom,out.zoom,k);out.pitch=lerp(prevCam.pitch,out.pitch,k);out.bearing=angLerp(prevCam.bearing,out.bearing,k);}
  prevCam=out;window.__cineU=+u.toFixed(3);return out;}
 window.CINE={active,apply,begin,get shot(){return shot;},get name(){return NAMES[shot];},NAMES};
 window.__cineOn=!!(tog&&tog.checked);
})();
