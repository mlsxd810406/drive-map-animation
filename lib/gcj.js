// WGS84 <-> GCJ-02（中国大陆境内偏移，境外不变）
(function(){const a=6378245,ee=0.00669342162296594323,PI=Math.PI;
function out(lat,lon){return lon<72.004||lon>137.8347||lat<0.8293||lat>55.8271;}
function tl(x,y){let r=-100+2*x+3*y+0.2*y*y+0.1*x*y+0.2*Math.sqrt(Math.abs(x));r+=(20*Math.sin(6*x*PI)+20*Math.sin(2*x*PI))*2/3;r+=(20*Math.sin(y*PI)+40*Math.sin(y/3*PI))*2/3;r+=(160*Math.sin(y/12*PI)+320*Math.sin(y*PI/30))*2/3;return r;}
function tn(x,y){let r=300+x+2*y+0.1*x*x+0.1*x*y+0.1*Math.sqrt(Math.abs(x));r+=(20*Math.sin(6*x*PI)+20*Math.sin(2*x*PI))*2/3;r+=(20*Math.sin(x*PI)+40*Math.sin(x/3*PI))*2/3;r+=(150*Math.sin(x/12*PI)+300*Math.sin(x/30*PI))*2/3;return r;}
function w2g(lat,lon){if(out(lat,lon))return [lat,lon];let dl=tl(lon-105,lat-35),dn=tn(lon-105,lat-35);const rl=lat/180*PI;let m=Math.sin(rl);m=1-ee*m*m;const sm=Math.sqrt(m);dl=dl*180/((a*(1-ee))/(m*sm)*PI);dn=dn*180/(a/sm*Math.cos(rl)*PI);return [lat+dl,lon+dn];}
function g2w(lat,lon){let w=[lat,lon];for(let i=0;i<3;i++){const g=w2g(w[0],w[1]);w=[w[0]-(g[0]-lat),w[1]-(g[1]-lon)];}return w;}
window.GCJ={w2g,g2w};})();
