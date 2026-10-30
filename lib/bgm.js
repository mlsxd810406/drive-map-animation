// ===== 电脑端 3D：背景音乐。独立于电影镜头；跟播放/暂停/重置；静音键同步 =====
(()=>{const B=document.body;if(typeof map==='undefined'||!window.maplibregl)return;
 const pc=()=>!B.classList.contains('mob')&&!matchMedia('(max-width:640px),(max-height:500px)').matches;
 if(!pc())return;
 const $=id=>document.getElementById(id);
 const row=$('bgmrow'),volRow=$('bgmvolrow'),tog=$('bgm'),vol=$('bgmvol'),vv=$('bgmv');
 if(row)row.style.display='';if(volRow)volRow.style.display='';
 // 相对当前页面解析，兼容 CloudBase 子路径
 const TRACKS=[
  {src:'lib/music/horizon-rise.mp3',title:'Horizon Rise'},
  {src:'lib/music/road-pulse.mp3',title:'Road Pulse'},
  {src:'lib/music/summit-drift.mp3',title:'Summit Drift'}].map(t=>({...t,src:new URL(t.src,location.href).href}));
 let i=Math.floor(Math.random()*TRACKS.length),a=null,b=null,cur=null,xfading=false,want=true,userMuted=false,unlocked=false,hinted=false;
 try{const v=localStorage.getItem('dm_bgm');if(v==='0'){if(tog)tog.checked=false;want=false;}if(v==='1'){if(tog)tog.checked=true;want=true;}
  const vv0=localStorage.getItem('dm_bgmvol');if(vv0!=null&&vol){vol.value=vv0;if(vv)vv.textContent=vv0;}}catch(_){}
 // 默认滑条 45 → 实际约 0.32；略抬高乘数，避免“开了却像没声”
 const level=()=>{if(userMuted||(typeof muted!=='undefined'&&muted))return 0;
  const raw=vol?+vol.value:55;return Math.max(0,Math.min(1,(isFinite(raw)?raw:55)/100))*0.72;};
 function mk(src){const el=new Audio(src);el.preload='auto';el.loop=false;el.crossOrigin='anonymous';el.volume=0;return el;}
 function ensure(){if(!a){a=mk(TRACKS[i].src);cur=a;a.addEventListener('ended',()=>next(true));}
  // 预创建下一轨，方便解锁
  if(!b)b=mk(TRACKS[(i+1)%TRACKS.length].src);}
 function toast(msg){try{let h=$('ahint');if(!h){h=document.createElement('div');h.id='ahint';document.body.appendChild(h);}
  h.textContent=msg;h.style.display='';clearTimeout(toast.t);toast.t=setTimeout(()=>{if(h)h.style.display='none';},3200);}catch(_){}}
 function unlock(){ensure();if(unlocked)return;
  // 用手势播一个独立静音元素解锁；绝不能 pause/rewind 正在播的曲目（曾导致 currentTime≈0）
  unlocked=1;window.__bgmUnlocked=1;
  try{const u=new Audio(TRACKS[i].src);u.preload='auto';u.volume=0;const p=u.play();
   if(p&&p.then)p.then(()=>{try{u.pause();u.src='';}catch(_){}}).catch(()=>{unlocked=0;});
  }catch(_){unlocked=0;}}
 function applyVol(){const v=level();if(cur&&!xfading)cur.volume=v;window.__bgmVol=v;}
 function start(){if(!want||!pc())return;ensure();applyVol();
  const p=cur.play();
  if(p&&p.catch)p.catch(err=>{window.__bgmBlocked=1;window.__bgmPlaying=false;
   if(!hinted){hinted=1;toast('浏览器拦截了音乐，请再点一次「开始」');}
   console.warn('[BGM] play blocked',err&&err.message);});
  else{window.__bgmBlocked=0;}
  window.__bgmTitle=TRACKS[i].title;window.__bgmPlaying=true;
  // 确认 currentTime 前进；否则再试一次
  setTimeout(()=>{try{if(want&&B.classList.contains('playing')&&cur&&(cur.paused||cur.currentTime<0.05)&&!userMuted){
    cur.play().catch(()=>{});}}catch(_){}},400);}
 function pauseMusic(){try{if(cur)cur.pause();}catch(_){}window.__bgmPlaying=false;}
 function stop(){pauseMusic();try{if(cur)cur.currentTime=0;}catch(_){}window.__bgmPlaying=false;}
 function next(natural){i=(i+1)%TRACKS.length;
  if(!natural||!want){ensure();if(cur){cur.src=TRACKS[i].src;cur.load();}if(want&&B.classList.contains('playing'))start();return;}
  const prev=cur;const nxt=mk(TRACKS[i].src);b=nxt;cur=nxt;xfading=true;const v=level();nxt.volume=0;
  nxt.play().then(()=>{const t0=performance.now();const step=()=>{const u=Math.min(1,(performance.now()-t0)/1200);nxt.volume=v*u;if(prev)prev.volume=v*(1-u);
    if(u<1)requestAnimationFrame(step);else{try{prev.pause();prev.currentTime=0;}catch(_){}a=nxt;b=mk(TRACKS[(i+1)%TRACKS.length].src);cur=a;a.onended=()=>next(true);xfading=false;applyVol();}};step();
  }).catch(()=>{xfading=false;a=nxt;cur=a;start();});
  window.__bgmTitle=TRACKS[i].title;}
 if(tog)tog.addEventListener('change',()=>{want=!!tog.checked;try{localStorage.setItem('dm_bgm',want?'1':'0');}catch(_){}
  window.__bgmOn=want;if(want&&B.classList.contains('playing')){unlock();start();}else pauseMusic();});
 if(vol){if(!vol.value)vol.value='55';vol.addEventListener('input',()=>{if(vv)vv.textContent=vol.value;try{localStorage.setItem('dm_bgmvol',vol.value);}catch(_){}applyVol();});}
 // 手势解锁：任意指针 + 明确绑到开始/播放键（同一手势内）
 const arm=()=>unlock();
 document.addEventListener('pointerdown',arm,{passive:true});
 document.addEventListener('keydown',e=>{if(e.code==='Space'||e.key===' ')arm();},{passive:true});
 ['play','bplay','mplay'].forEach(id=>{const el=$(id);if(el)el.addEventListener('click',arm,true);});
 // 直接包一层 play/pause，保证跟用户点击同栈启动（MutationObserver 太晚，常被浏览器拦截）
 function hook(){try{
  if(typeof play==='function'&&!play.__bgm){const o=play;const f=function(){arm();const r=o.apply(this,arguments);if(playing&&want)start();return r;};f.__bgm=1;window.play=f;}
  if(typeof pause==='function'&&!pause.__bgm){const o=pause;const f=function(){const r=o.apply(this,arguments);pauseMusic();return r;};f.__bgm=1;window.pause=f;}
  if(typeof resetAnim==='function'&&!resetAnim.__bgm){const o=resetAnim;const f=function(){const r=o.apply(this,arguments);stop();return r;};f.__bgm=1;window.resetAnim=f;}
 }catch(_){}}
 hook();setTimeout(hook,0);addEventListener('load',hook);
 // 备份：class 变化时再跟一次（异步规划完成后的二次 play）
 const mo=new MutationObserver(()=>{if(B.classList.contains('playing')){if(want)start();}else pauseMusic();});
 mo.observe(B,{attributes:true,attributeFilter:['class']});
 // 与顶部「声音开/关」对齐
 if(typeof muted!=='undefined'&&muted){userMuted=true;applyVol();}
 window.BGM={play:()=>{unlock();start();},pause:pauseMusic,stop,next,setMuted:m=>{userMuted=!!m;applyVol();if(!m&&want&&B.classList.contains('playing'))start();},
  get title(){return TRACKS[i].title;},get on(){return want;},get audio(){return cur;},TRACKS};
 window.__bgmOn=want;
})();
