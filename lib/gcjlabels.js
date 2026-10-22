// Google 注记(lyrs=h)在中国境内为 GCJ-02 坐标，而 Google 影像(lyrs=s)与 OSM/GPS 为 WGS84。
// 这里把注记瓦片按瓦片中心的 GCJ 偏移量重新拼接平移，使注记与影像/路线对齐。
(function(){
const U=(x,y,z)=>`https://mt${(x+y)%4}.google.com/vt/lyrs=h&hl=zh-CN&x=${x}&y=${y}&z=${z}`;
const cache=new Map();
function img(x,y,z){const n=2**z;if(y<0||y>=n)return Promise.resolve(null);x=((x%n)+n)%n;const k=z+'/'+x+'/'+y;if(cache.has(k))return cache.get(k);
 const p=new Promise(r=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>r(i);i.onerror=()=>r(null);i.src=U(x,y,z);});cache.set(k,p);if(cache.size>600)cache.delete(cache.keys().next().value);return p;}
const merc=(lat,lon,z)=>{const s=256*2**z,r=lat*Math.PI/180;return [(lon+180)/360*s,(1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*s];};
const unm=(px,py,z)=>{const s=256*2**z;return [Math.atan(Math.sinh(Math.PI*(1-2*py/s)))*180/Math.PI,px/s*360-180];};
async function tile(x,y,z,cv){cv=cv||document.createElement('canvas');cv.width=cv.height=256;const g=cv.getContext('2d');
 const c=unm((x+.5)*256,(y+.5)*256,z),G=GCJ.w2g(c[0],c[1]),a=merc(c[0],c[1],z),b=merc(G[0],G[1],z),dx=b[0]-a[0],dy=b[1]-a[1];
 // 输出像素 P 取源像素 P+d
 const sx=x*256+dx,sy=y*256+dy,tx0=Math.floor(sx/256),ty0=Math.floor(sy/256);const jobs=[];
 for(let tx=tx0;tx<=tx0+1;tx++)for(let ty=ty0;ty<=ty0+1;ty++)jobs.push(img(tx,ty,z).then(i=>i&&g.drawImage(i,Math.round(tx*256-sx),Math.round(ty*256-sy))));
 await Promise.all(jobs);return cv;}
window.GCJLBL={tile};
})();
