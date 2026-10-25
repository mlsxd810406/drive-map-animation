// ===== 手机：底部面板通用（遮罩、下滑关闭、安全区、键盘避让）。只在 body.mob 生效 =====
window.MSHEET=el=>{const B=document.body,mob=()=>B.classList.contains('mob');
 if(!document.getElementById('msh_css')){const st=document.createElement('style');st.id='msh_css';st.textContent=`
.mshbd{position:fixed;inset:0;z-index:1735;background:rgba(20,18,16,.32);opacity:0;pointer-events:none;transition:opacity .22s}.mshbd.on{opacity:1;pointer-events:auto}
body.mob .msheet{position:fixed!important;left:0!important;right:0!important;top:auto!important;bottom:var(--kb,0px)!important;width:auto!important;max-width:none!important;max-height:min(72vh,calc(var(--vvh,100vh) - 60px))!important;z-index:1740!important;box-sizing:border-box;border-radius:20px 20px 0 0!important;padding:0 14px calc(12px + env(safe-area-inset-bottom))!important;background:#fbf9f5!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;box-shadow:0 -8px 30px rgba(0,0,0,.18)!important;font-size:16px!important;overflow:auto!important;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;animation:mshup .28s cubic-bezier(.2,.9,.3,1)!important;transform-origin:bottom center}
body.mob .msheet .mgrab{position:sticky;top:0;z-index:2;display:block;margin:0 -14px 2px;padding:8px 0 6px;background:#fbf9f5;touch-action:none}body.mob .msheet .mgrab::before{content:'';display:block;width:38px;height:5px;margin:0 auto;border-radius:3px;background:rgba(60,50,40,.22)}
.msheet .mgrab{display:none}@keyframes mshup{from{transform:translateY(100%)}to{transform:none}}`;document.head.appendChild(st);}
 el.classList.add('msheet');const bd=document.createElement('div');bd.className='mshbd';document.body.appendChild(bd);
 const sync=()=>bd.classList.toggle('on',mob()&&el.classList.contains('on'));new MutationObserver(sync).observe(el,{attributes:true,attributeFilter:['class']});
 bd.addEventListener('click',()=>el.classList.remove('on'));
 const vv=window.visualViewport;if(vv){const f=()=>{const kb=Math.max(0,innerHeight-vv.height-vv.offsetTop);el.style.setProperty('--kb',kb+'px');el.style.setProperty('--vvh',vv.height+'px');};vv.addEventListener('resize',f);vv.addEventListener('scroll',f);}
 // 下滑关闭：从抓手或顶部（内容未滚动时）向下拖
 let y0=null,dy=0;el.addEventListener('touchstart',e=>{if(!mob())return;const g=e.target.closest('.mgrab');if(!g&&el.scrollTop>0)return;if(e.target.closest('input,a,button,label,canvas')&&!g)return;y0=e.touches[0].clientY;dy=0;el.style.transition='none';},{passive:true});
 el.addEventListener('touchmove',e=>{if(y0==null)return;dy=Math.max(0,e.touches[0].clientY-y0);el.style.transform=dy?'translateY('+dy+'px)':'';},{passive:true});
 el.addEventListener('touchend',()=>{if(y0==null)return;y0=null;el.style.transition='transform .2s';if(dy>70){el.style.transform='translateY(100%)';setTimeout(()=>{el.classList.remove('on');el.style.transform='';el.style.transition='';},200);}else{el.style.transform='';}});
 return {grab:'<div class="mgrab"></div>',mob};};
