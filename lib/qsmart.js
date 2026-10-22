// 本地“智能”查询理解：行政区解析（省/市/县 + 天地图国标码）、拼音首字母、编辑距离纠错、同义词。纯前端，无外部模型/密钥。
(function(){
const RAW=(window.ADMIN_RAW||'').split(';').map(r=>{const [c,n,i]=r.split(',');return {c,n,i,lv:/0000$/.test(c)?1:/00$/.test(c)?2:3};});
const SUF=/(特别行政区|维吾尔自治区|壮族自治区|回族自治区|自治区|省|市|地区|盟|自治州|自治县|自治旗|林区|区|县|旗)$/;
const ETH=/(各族|蒙古族|藏族|回族|满族|苗族|彝族|壮族|布依族|侗族|瑶族|白族|土家族|哈尼族|傣族|黎族|傈僳族|佤族|畲族|拉祜族|水族|东乡族|纳西族|景颇族|土族|达斡尔族|仫佬族|羌族|仡佬族|锡伯族|朝鲜族|哈萨克族|塔吉克族|裕固族|保安族|撒拉族|鄂温克族|鄂伦春族|毛南族|独龙族|怒族|普米族|门巴族|珞巴族|基诺族|德昂族|京族|赫哲族|俄罗斯族|乌孜别克族|塔塔尔族)+$/;
const short=n=>{let s=n.replace(SUF,'');s=s.replace(ETH,'');return s.length>=2?s:n;};
const FULL=new Map(),SHORT=new Map();
for(const e of RAW){e.s=short(e.n);(FULL.get(e.n)||FULL.set(e.n,[]).get(e.n)).push(e);if(e.s!==e.n)(SHORT.get(e.s)||SHORT.set(e.s,[]).get(e.s)).push(e);}
const within=(e,p)=>!p||(p.lv===1?e.c.slice(0,2)===p.c.slice(0,2):e.c.slice(0,4)===p.c.slice(0,4));
function pick(cands,prev){const ok=cands.filter(e=>within(e,prev)&&(!prev||e.lv>prev.lv));if(ok.length)return ok.sort((a,b)=>a.lv-b.lv)[0];return prev?null:cands.slice().sort((a,b)=>(a.lv===2?0:a.lv)-(b.lv===2?0:b.lv))[0];}
function lev(a,b){const m=a.length,n=b.length;if(Math.abs(m-n)>2)return 9;let p=Array.from({length:n+1},(_,j)=>j);for(let i=1;i<=m;i++){const c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c;}return p[n];}
// 解析：从左到右贪心匹配行政区（全称优先，其次简称；简称县名在开头时需后接空格或为市级），支持一字之差纠错
function parse(q){q=(q||'').trim().replace(/\s+/g,' ');let pos=0,prev=null,chain=[],fixed=null;
 for(let k=0;k<3;k++){if(q[pos]===' ')pos++;let hit=null,len=0;
  for(let L=Math.min(12,q.length-pos);L>=2;L--){const t=q.substr(pos,L);let c=FULL.get(t),isShort=false;if(!c){c=SHORT.get(t);isShort=!!c;}if(!c)continue;
   const e=pick(c,prev);if(!e)continue;const after=q[pos+L];
   if(isShort&&!prev&&e.lv===3&&after!==' '&&q.length>pos+L)continue;// 避免“新城小区”误判为新城区
   hit=e;len=L;break;}
  if(!hit&&k===0){const sp=q.indexOf(' ');const t=sp>1?q.slice(0,sp):'';if(t.length>=2){let best=null,bd=2;for(const e of RAW){for(const nm of [e.n,e.s]){if(Math.abs(nm.length-t.length)>1)continue;const d=lev(t,nm);if(d<bd||(d===bd&&best&&e.lv<best.lv)){bd=d;best=e;}}}if(best&&bd===1){hit=best;len=t.length;fixed={from:t,to:best.n};}}}
  if(!hit)break;chain.push(hit);prev=hit;pos+=len;}
 const kw=q.slice(pos).trim();const last=chain[chain.length-1]||null;
 return {region:q.slice(0,pos).trim(),kw:kw||(last?'':q),admin:last,chain,code:last?'156'+last.c:null,rc:last?last.s:'',fixed,regionOnly:!!last&&!kw};}
// 拼音首字母：利用浏览器 zh 排序规则（Intl.Collator）按声母边界字定位，零字典体积
const B='阿八嚓哒妸发旮哈讥咔垃妈拏噢妑七呥扨它穵夕丫帀'.split(''),L='abcdefghjklmnopqrstwxyz'.split('');const col=new Intl.Collator('zh-Hans-CN-u-co-pinyin');
function ini1(ch){if(/[a-z0-9]/i.test(ch))return ch.toLowerCase();if(!/[\u4e00-\u9fa5]/.test(ch))return '';let r='';for(let i=0;i<B.length;i++){if(col.compare(ch,B[i])>=0)r=L[i];else break;}return r;}
const IC=new Map();const initials=s=>{if(IC.has(s))return IC.get(s);const r=[...(s||'')].map(ini1).join('');IC.set(s,r);return r;};
function adminByInitials(p,limit=6){p=p.toLowerCase();return RAW.filter(e=>e.i.startsWith(p)).sort((a,b)=>(a.i.length-b.i.length)||(a.lv===2?-1:0)-(b.lv===2?-1:0)).slice(0,limit);}
window.QS={parse,initials,lev,adminByInitials,short,get size(){return RAW.length;}};
})();
