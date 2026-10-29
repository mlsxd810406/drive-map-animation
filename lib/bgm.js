// ===== 电脑端 3D：背景音乐。独立开关；跟播放/暂停/重置联动；静音键一并静音；手机/2D 不显示 =====
(()=>{const B=document.body;if(typeof map==='undefined'||!window.maplibregl)return;
 const pc=()=>!B.classList.contains('mob')&&!matchMedia('(max-width:640px),(max-height:500px)').matches;
 if(!pc())return;
 const $=id=>document.getElementById(id);
 const row=$('bgmrow'),volRow=$('bgmvolrow'),tog=$('bgm'),vol=$('bgmvol'),vv=$('bgmv');
 if(row)row.style.display='';if(volRow)volRow.style.display='';
 const TRACKS=[
  {src:'lib/music/horizon-rise.mp3',title:'Horizon Rise'},
  {src:'lib/music/road-pulse.mp3',title:'Road Pulse'},
  {src:'lib/music/summit-drift.mp3',title:'Summit Drift'}];
 let i=Math.floor(Math.random()*TRACKS.length),a=null,b=null,cur=null,xfading=false,want=true,userMuted=false,unlocked=false;
 try{const v=localStorage.getItem('dm_bgm');if(v==='0'){if(tog)tog.checked=false;want=false;}if(v==='1'){if(tog)tog.checked=true;want=true;}
  const vv0=localStorage.getItem('dm_bgmvol');if(vv0!=null&&vol){vol.value=vv0;if(vv)vv.textContent=vv0;}}catch(_){}
 const level=()=>userMuted||(typeof muted!=='undefined'&&muted)?0:Math.max(0,Math.min(1,(+(vol&&vol.value||45))/100))*0.55;
 function mk(src){const el=new Audio(src);el.preload='auto';el.loop=false;el.volume=0;return el;}
 function unlock(){if(unlocked)return;unlocked=1;try{[a,b].forEach(x=>x&&x.play().then(()=>{x.pause();x.currentTime=0;}).catch(()=>{}));}catch(_){}}
 function ensure(){if(!a){a=mk(TRACKS[i].src);cur=a;a.addEventListener('ended',()=>next(true));}}
 function applyVol(){const v=level();if(cur&&!xfading)cur.volume=v;window.__bgmVol=v;}
 function play(){if(!want||!pc())return;unlock();ensure();applyVol();
  const p=cur.play();if(p&&p.catch)p.catch(()=>{window.__bgmBlocked=1;});
  window.__bgmTitle=TRACKS[i].title;window.__bgmPlaying=true;}
 function pause(){try{if(cur)cur.pause();}catch(_){}window.__bgmPlaying=false;}
 function stop(){pause();try{if(cur){cur.currentTime=0;}}catch(_){}window.__bgmPlaying=false;}
 function next(natural){i=(i+1)%TRACKS.length;
  if(!natural||!want){ensure();if(cur){cur.src=TRACKS[i].src;cur.load();}if(want&&B.classList.contains('playing'))play();return;}
  // crossfade ~1.2s
  const prev=cur;b=mk(TRACKS[i].src);cur=b;xfading=true;const v=level();b.volume=0;
  b.play().then(()=>{const t0=performance.now();const step=()=>{const u=Math.min(1,(performance.now()-t0)/1200);b.volume=v*u;if(prev)prev.volume=v*(1-u);
    if(u<1)requestAnimationFrame(step);else{try{prev.pause();prev.currentTime=0;}catch(_){}a=b;b=null;cur=a;a.onended=()=>next(true);xfading=false;applyVol();}};step();}).catch(()=>{xfading=false;a=b;cur=a;play();});
  window.__bgmTitle=TRACKS[i].title;}
 if(tog)tog.addEventListener('change',()=>{want=!!tog.checked;try{localStorage.setItem('dm_bgm',want?'1':'0');}catch(_){}
  window.__bgmOn=want;if(want&&B.classList.contains('playing'))play();else pause();});
 if(vol)vol.addEventListener('input',()=>{if(vv)vv.textContent=vol.value;try{localStorage.setItem('dm_bgmvol',vol.value);}catch(_){}applyVol();});
 // 跟 body.playing 联动；播放按钮点击解锁自动播放
 document.addEventListener('pointerdown',()=>unlock(),{once:false,passive:true});
 const mo=new MutationObserver(()=>{if(B.classList.contains('playing')){if(want)play();}else pause();});
 mo.observe(B,{attributes:true,attributeFilter:['class']});
 // resetAnim / arrived：停到开头
 const wrap=()=>{const ra=window.resetAnim;if(typeof ra==='function'&&!ra.__bgm){const f=function(){const r=ra.apply(this,arguments);stop();return r;};f.__bgm=1;window.resetAnim=f;}};
 setTimeout(wrap,0);addEventListener('load',wrap);
 window.BGM={play,pause,stop,next,setMuted:m=>{userMuted=!!m;applyVol();},get title(){return TRACKS[i].title;},get on(){return want;},TRACKS};
 window.__bgmOn=want;
})();
