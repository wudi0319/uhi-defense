// 保卫UHI — 核心模拟 + 画面。状态全部在 G 里；玩家按 id 存在 G.players，方便以后加第二个联机玩家。
const REC_KEY='uhi-td-v1';
function loadRec(){try{return JSON.parse(localStorage.getItem(REC_KEY))||{best:0,wins:0}}catch(e){return{best:0,wins:0}}}
function saveRec(r){try{localStorage.setItem(REC_KEY,JSON.stringify(r))}catch(e){}}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let G=null,uid=1;
const hooks={toast:()=>{},end:()=>{},hud:()=>{}};

function newGame(o){const tal=new Set(o.talents||[]);
 const mods={gold:tal.has('vault')?1.3:1,troop:tal.has('drill')?1.35:1,hp:tal.has('armor')?1.6:1,stone:tal.has('castle')?1.5:1,ehp:DIFF*(tal.has('horde')?1.7:1),edmg:DIFF,drop:tal.has('horde')?1.5:1};
 G={phase:'day',night:0,gold:15+(tal.has('vault')?10:0),t:0,nightT:0,spawnQ:[],talents:[...tal],mods,
  home:{hp:300*mods.stone,max:300*mods.stone,cd:0,hurtT:0},players:{},me:o.hero,b:{},enemies:[],units:[],shots:[],fx:[],floats:[],
  input:{},armyLeader:null,dark:0,stats:{kills:0}};
 for(const s of SPOTS)G.b[s.id]={lv:0,hp:0,max:0,cd:0,dead:0};
 addPlayer(o.hero,o.hero,o.weapon);return G}
function addPlayer(id,hero,weapon){const max=100*G.mods.hp;
 G.players[id]={id,hero,weapon,x:HOME.x+1.6,y:HOME.y+3.2,dir:3,hp:max,max,cd:0,skillCd:0,storm:0,stormTick:0,spin:0,dead:0,respawn:0,ph:0,moving:false,swing:0,face:{x:0,y:1}};G.input[id]={x:0,y:0}}
const spotOf=id=>SPOTS.find(s=>s.id===id);
const bStat=(s,k,lv)=>BUILD[s.t][k][lv-1];
function bMax(s,lv){let h=bStat(s,'hp',lv);if(s.t==='wall')h*=G.mods.stone;return h}
function nextCost(s){const b=G.b[s.id];return b.lv>=3?null:BUILD[s.t].cost[b.lv]}
function nearSpot(p){let best=null,bd=1.7;for(const s of SPOTS){const d=Math.hypot(p.x-s.x,p.y-s.y);if(d<bd){bd=d;best=s}}return best}
function build(pid,sid){if(G.phase!=='day')return false;const p=G.players[pid],s=spotOf(sid)||nearSpot(p);if(!s)return false;
 const b=G.b[s.id],c=nextCost(s);if(c==null){hooks.toast(BUILD[s.t].name+'已经满级啦');return false}
 if(G.gold<c){hooks.toast('金币不够，还差 '+(c-G.gold)+' 💰');return false}
 G.gold-=c;b.lv++;b.max=bMax(s,b.lv);b.hp=b.max;b.dead=0;
 G.fx.push({k:'puff',x:s.x,y:s.y,t:0,life:.6});hooks.toast((b.lv===1?'建好了 ':'升级到 '+b.lv+' 级 ')+BUILD[s.t].name+'！');
 syncUnits();return true}
function startNight(){if(G.phase!=='day')return;G.phase='night';G.nightT=0;G.spawnQ=waveFor(G.night+1);
 hooks.toast('🌙 第 '+(G.night+1)+' 夜，敌人从'+nightDirs(G.night+1).map(d=>DIRS[d].cn).join('、')+'边来了！')}
function morning(){G.night++;G.phase='day';
 if(G.night>=NIGHTS){G.phase='win';endGame(true);return}
 let pay=4;for(const s of SPOTS){const b=G.b[s.id];if(s.t==='mine'&&b.lv&&!b.dead)pay+=bStat(s,'gold',b.lv)}
 pay=Math.round(pay*G.mods.gold);G.gold+=pay;
 for(const s of SPOTS){const b=G.b[s.id];if(b.lv){b.hp=b.max;b.dead=0}}
 G.home.hp=G.home.max;for(const p of Object.values(G.players)){p.hp=p.max;p.dead=0}
 for(const u of G.units){u.dead=0;u.hp=u.max}
 G.shots=[];hooks.toast('☀️ 天亮啦！金矿和城堡收入 +'+pay+' 💰')}
function endGame(win){const r=loadRec();const was=Object.assign({},r);r.best=Math.max(r.best,G.night);if(win)r.wins++;saveRec(r);hooks.end(win,was,r)}
// ---- 工人（钢筋工 / 机修工） ----
function syncUnits(){for(const s of SPOTS){if(s.t!=='inf'&&s.t!=='arch')continue;const b=G.b[s.id];if(!b.lv)continue;const n=bStat(s,'n',b.lv),U=UNITS[BUILD[s.t].unit];
 const mine=G.units.filter(u=>u.home===s.id);
 for(let i=mine.length;i<n;i++){const max=U.hp*G.mods.troop*(1+.25*(b.lv-1));G.units.push({id:uid++,home:s.id,k:BUILD[s.t].unit,slot:i,x:s.x,y:s.y+.8,hp:max,max,cd:0,dead:0,respawn:0,dir:0,ph:0,moving:false})}
 for(const u of mine){u.max=U.hp*G.mods.troop*(1+.25*(b.lv-1))}}}
function toggleArmy(pid){if(!G.units.length){hooks.toast('先建钢筋工棚或机修车间吧');return}G.armyLeader=G.armyLeader===pid?null:pid;
 hooks.toast(G.armyLeader?'工人们跟着'+HEROES[G.players[pid].hero].name+'走！':'工人们回工棚守着')}
// ---- 战斗 ----
function hurtEnemy(e,d,stun){if(e.dead)return;e.hp-=d;e.flash=.12;if(stun)e.stun=Math.max(e.stun||0,stun);
 if(e.hp<=0){e.dead=1;const g=Math.round(ENEMIES[e.k].gold*G.mods.drop);G.gold+=g;G.stats.kills++;G.floats.push({x:e.x,y:e.y-.8,txt:'+'+g+'💰',t:0,col:'#ffd23f'});G.fx.push({k:'poof',x:e.x,y:e.y,t:0,life:.4,r:ENEMIES[e.k].r})}}
function enemiesNear(x,y,r){return G.enemies.filter(e=>!e.dead&&Math.hypot(e.x-x,e.y-y)<=r+ENEMIES[e.k].r)}
function nearestEnemy(x,y,r){let best=null,bd=1e9;for(const e of G.enemies){if(e.dead)continue;const d=Math.hypot(e.x-x,e.y-y)-ENEMIES[e.k].r;if(d<=r&&d<bd){bd=d;best=e}}return best}
function shoot(from,tgt,dmg,kind,spd=10){G.shots.push({x:from.x,y:from.y-.5,tgt,tx:tgt.x,ty:tgt.y,dmg,kind,spd,t:0})}
function skill(pid){const p=G.players[pid];if(!p||p.dead||p.skillCd>0||G.phase!=='night')return false;const W=WEAPONS[p.weapon];p.skillCd=W.skill.cd;
 p.storm=W.skill.dur;p.stormTick=0; // 动力头加压：像剑刃风暴，持续旋转伤害
 hooks.toast(W.skill.name+'！');return true}
function playerAttack(p,dt){const W=WEAPONS[p.weapon];p.cd-=dt;p.skillCd=Math.max(0,p.skillCd-dt);p.swing=Math.max(0,p.swing-dt);
 if(p.storm>0){const K=W.skill;p.storm-=dt;p.spin+=dt*14;p.stormTick-=dt;if(p.stormTick<=0){p.stormTick=.25;for(const e of enemiesNear(p.x,p.y,K.r))hurtEnemy(e,K.dps*.25,K.stun)}return}
 if(p.cd>0)return;
 const tg=nearestEnemy(p.x,p.y,W.range);if(!tg)return;p.cd=W.cd;p.swing=.25;p.face={x:tg.x-p.x,y:tg.y-p.y};
 if(W.kind==='melee'){enemiesNear(p.x,p.y,W.range).sort((a,b)=>dist(a,p)-dist(b,p)).slice(0,W.maxHit).forEach(e=>hurtEnemy(e,W.dmg));const a=Math.atan2(tg.y-p.y,tg.x-p.x);G.fx.push({k:'slam',x:p.x+Math.cos(a)*.8,y:p.y+Math.sin(a)*.6+.3,t:0,life:.3,r:1})}
 else if(W.kind==='ranged')shoot({x:p.x,y:p.y-.6},tg,W.dmg,'pile',13);
 else{enemiesNear(p.x,p.y,W.range).forEach(e=>hurtEnemy(e,W.dmg,.3));G.fx.push({k:'slam',x:p.x,y:p.y,t:0,life:.35,r:W.range})}}
// 敌人能撞上的东西：建筑（墙是长条），UHI 房子
function blocker(e,nx,ny){const r=ENEMIES[e.k].r;
 for(const s of SPOTS){const b=G.b[s.id];if(!b.lv||b.dead)continue;
  if(s.t==='wall'){const hl=2.7,ht=.35,dx=Math.abs(nx-s.x),dy=Math.abs(ny-s.y);if(s.v?(dx<ht+r&&dy<hl+r):(dy<ht+r&&dx<hl+r))return s}
  else if(Math.hypot(nx-s.x,ny-s.y)<.75+r)return s}
 return null}
function hitTarget(e,tg,d){if(tg.kind==='home'){G.home.hp-=d;G.home.hurtT=1}else if(tg.kind==='b'){const b=G.b[tg.s.id];b.hp-=d;if(b.hp<=0){b.hp=0;b.dead=1;hooks.toast(BUILD[tg.s.t].name+'被打坏了！明早会修好');G.fx.push({k:'puff',x:tg.s.x,y:tg.s.y,t:0,life:.6})}}
 else{const o=tg.o;o.hp-=d;o.flash=.15;if(o.hp<=0){o.hp=0;o.dead=1;o.respawn=tg.kind==='p'?6:12;if(tg.kind==='p')hooks.toast(HEROES[o.hero].name+'被打倒了… 6 秒后在 UHI 旁复活')}}}
function stepEnemy(e,dt){const E=ENEMIES[e.k];e.cd-=dt;e.flash=Math.max(0,(e.flash||0)-dt);if(e.stun>0){e.stun-=dt;return}
 e.rt-=dt;if(e.rt<=0){e.rt=.4;e.tg=null;let bd=E.aggro;
  for(const p of Object.values(G.players))if(!p.dead){const d=dist(p,e);if(d<bd){bd=d;e.tg={kind:'p',o:p}}}
  for(const u of G.units)if(!u.dead){const d=dist(u,e);if(d<bd){bd=d;e.tg={kind:'u',o:u}}}}
 if(e.tg&&e.tg.o.dead)e.tg=null;
 const tg=e.tg||{kind:'home'},tx=tg.kind==='home'?HOME.x:tg.o.x,ty=tg.kind==='home'?HOME.y:tg.o.y,tr=tg.kind==='home'?HOME.r:.3;
 const dx=tx-e.x,dy=ty-e.y,d=Math.hypot(dx,dy);e.moving=false;
 if(d<=E.r+tr+.15){if(e.cd<=0){e.cd=E.cd;e.atk=.2;hitTarget(e,tg,E.dmg*G.mods.edmg)}return}
 const sp=E.spd*dt,nx=e.x+dx/d*sp,ny=e.y+dy/d*sp,bl=blocker(e,nx,ny);
 if(bl){if(e.cd<=0){e.cd=E.cd;e.atk=.2;hitTarget(e,{kind:'b',s:bl},E.dmg*G.mods.edmg*(E.smash?1.6:1))}return}
 e.x=nx;e.y=ny;e.moving=true;e.ph+=dt*9;if(Math.abs(dx)>.05)e.dir=dx<0?2:3}
function unitAnchor(u){const L=G.armyLeader&&G.players[G.armyLeader];const a=u.slot*2.4+(u.k==='mech'?1.2:0);
 if(L&&!L.dead)return{x:L.x+Math.cos(a)*1.3,y:L.y+Math.sin(a)*1.1};const s=spotOf(u.home);return{x:s.x+Math.cos(a)*1.1,y:s.y+.6+Math.sin(a)*.7}}
function stepUnit(u,dt){const U=UNITS[u.k],s=spotOf(u.home),b=G.b[s.id];u.flash=Math.max(0,(u.flash||0)-dt);u.atk=Math.max(0,(u.atk||0)-dt);
 if(u.dead){if(G.phase==='night'&&!b.dead){u.respawn-=dt;if(u.respawn<=0){u.dead=0;u.hp=u.max;u.x=s.x;u.y=s.y+.6}}return}
 u.cd-=dt;const an=unitAnchor(u);let goal=an,tg=null;
 if(G.phase==='night'){tg=nearestEnemy(u.x,u.y,3.4);if(tg&&dist(tg,an)>5.5)tg=null}
 const dmg=U.dmg*G.mods.troop*(1+.3*(b.lv-1));
 if(tg){const d=dist(tg,u)-ENEMIES[tg.k].r;if(d<=U.range){u.moving=false;if(u.cd<=0){u.cd=U.cd;u.atk=.2;if(u.k==='mech')shoot(u,tg,dmg,'wrench',10);else hurtEnemy(tg,dmg)}u.dir=tg.x<u.x?2:3;return}goal=tg}
 const dx=goal.x-u.x,dy=goal.y-u.y,d=Math.hypot(dx,dy);if(d<.15){u.moving=false;return}
 const sp=Math.min(d,U.spd*dt*(d>3?1.4:1));u.x+=dx/d*sp;u.y+=dy/d*sp;u.moving=true;u.ph+=dt*12;if(Math.abs(dx)>.05)u.dir=dx<0?2:3}
function stepPlayer(p,dt){const inp=G.input[p.id]||{x:0,y:0};p.flash=Math.max(0,(p.flash||0)-dt);
 if(p.dead){p.storm=0;p.respawn-=dt;if(p.respawn<=0){p.dead=0;p.hp=p.max;p.x=HOME.x+1.6;p.y=HOME.y+3.2}return}
 const m=Math.hypot(inp.x,inp.y);p.moving=m>.1;
 if(p.moving){const sp=4.2*dt*Math.min(1,m);p.x=clamp(p.x+inp.x/Math.max(1,m)*sp,.5,MAP_W-.5);p.y=clamp(p.y+inp.y/Math.max(1,m)*sp,.5,MAP_H-.5);p.ph+=dt*11;
  p.dir=Math.abs(inp.x)>Math.abs(inp.y)?(inp.x<0?2:3):(inp.y<0?1:0);p.face={x:inp.x,y:inp.y};
  if(Math.hypot(p.x-HOME.x,p.y-HOME.y)<HOME.r){const a=Math.atan2(p.y-HOME.y,p.x-HOME.x);p.x=HOME.x+Math.cos(a)*HOME.r;p.y=HOME.y+Math.sin(a)*HOME.r}}
 if(G.phase==='night')playerAttack(p,dt);else{p.skillCd=0}}
function step(dt){if(!G||G.phase==='win'||G.phase==='lose')return;G.t+=dt;G.dark+=((G.phase==='night'?1:0)-G.dark)*Math.min(1,dt*1.5);
 for(const p of Object.values(G.players))stepPlayer(p,dt);
 if(G.phase==='night'){G.nightT+=dt;const n=G.night+1,mul=(1+.16*(n-1))*G.mods.ehp;
  while(G.spawnQ.length&&G.spawnQ[0].t<=G.nightT){const q=G.spawnQ.shift(),D=DIRS[q.dir],E=ENEMIES[q.k],j=(Math.random()-.5)*3;
   G.enemies.push({id:uid++,k:q.k,x:D.x+(q.dir==='N'||q.dir==='S'?j:0),y:D.y+(q.dir==='W'||q.dir==='E'?j:0),hp:E.hp*mul,max:E.hp*mul,cd:0,rt:0,dir:2,ph:Math.random()*6,moving:true})}
  for(const e of G.enemies)if(!e.dead)stepEnemy(e,dt);
  // 互相挤开
  const es=G.enemies;for(let i=0;i<es.length;i++)for(let k=i+1;k<es.length;k++){const a=es[i],b=es[k],rr=ENEMIES[a.k].r+ENEMIES[b.k].r,dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>0&&d<rr){const o=(rr-d)/2*.5;a.x-=dx/d*o;a.y-=dy/d*o;b.x+=dx/d*o;b.y+=dy/d*o}}
  // 弹弓塔 + UHI 房子（射箭）
  for(const s of SPOTS){const b=G.b[s.id];if(s.t!=='tower'||!b.lv||b.dead)continue;b.cd-=dt;if(b.cd>0)continue;const tg=nearestEnemy(s.x,s.y,bStat(s,'range',b.lv));if(tg){b.cd=bStat(s,'cd',b.lv);shoot({x:s.x,y:s.y-.6},tg,bStat(s,'dmg',b.lv),'pebble',12)}}
  G.home.cd-=dt;if(G.home.cd<=0){const tg=nearestEnemy(HOME.x,HOME.y,4);if(tg){G.home.cd=1.1;shoot({x:HOME.x,y:HOME.y-1.2},tg,6,'arrow',11)}}
  if(G.home.hp<=0){G.home.hp=0;G.phase='lose';endGame(false)}}
 G.home.hurtT=Math.max(0,G.home.hurtT-dt);
 for(const u of G.units)stepUnit(u,dt);
 // 子弹
 for(const s of G.shots){s.t+=dt;if(s.vx!=null){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;for(const e of enemiesNear(s.x,s.y,.35))if(!s.hit.has(e.id)){s.hit.add(e.id);hurtEnemy(e,s.dmg)}if(s.life<=0)s.done=1;continue}
  if(s.tgt&&!s.tgt.dead){s.tx=s.tgt.x;s.ty=s.tgt.y-.3}const dx=s.tx-s.x,dy=s.ty-s.y,d=Math.hypot(dx,dy),mv=s.spd*dt;
  if(d<=mv+.1){s.done=1;if(s.tgt&&!s.tgt.dead)hurtEnemy(s.tgt,s.dmg)}else{s.x+=dx/d*mv;s.y+=dy/d*mv}}
 G.shots=G.shots.filter(s=>!s.done);G.enemies=G.enemies.filter(e=>!e.dead);
 for(const f of G.fx)f.t+=dt;G.fx=G.fx.filter(f=>f.t<f.life);for(const f of G.floats)f.t+=dt;G.floats=G.floats.filter(f=>f.t<1.1);
 if(G.phase==='night'&&!G.spawnQ.length&&!G.enemies.length)morning()}
// ================= 画面 =================
const cv=document.getElementById('map'),ctx=cv.getContext('2d');let VW=0,VH=0,T=36,DPR=1;const cam={x:HOME.x,y:HOME.y};
function resize(){DPR=Math.min(2,window.devicePixelRatio||1);VW=cv.clientWidth||innerWidth;VH=cv.clientHeight||innerHeight;cv.width=VW*DPR;cv.height=VH*DPR;T=Math.max(26,Math.min(48,Math.min(VW,VH)/11))}
addEventListener('resize',resize);resize();
const sx=x=>(x-cam.x)*T+VW/2,sy=y=>(y-cam.y)*T+VH/2;
function spr(fn,x,y,size,...a){ctx.save();ctx.translate(sx(x)-size*T/2,sy(y)-size*T*.95);ctx.scale(size*T,size*T);fn(ctx,...a);ctx.restore()}
let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
const DECOR=[];(()=>{for(let i=0;i<260&&DECOR.length<95;i++){const x=1+rnd()*(MAP_W-2),y=1+rnd()*(MAP_H-2);
 if(Math.hypot(x-HOME.x,y-HOME.y)<7.5||Math.abs(x-17)<2||Math.abs(y-17)<2)continue;if(SPOTS.some(s=>Math.hypot(s.x-x,s.y-y)<2.2))continue;if(DECOR.some(d=>Math.hypot(d.x-x,d.y-y)<1.3))continue;
 DECOR.push({x,y,k:rnd()<.62?'tree':rnd()<.5?'rock':'flower'})}})();
// ---- 敌人画法见 art.js S.machine ----
function drawStorm(p){if(!(p.storm>0))return;const X=sx(p.x),Y=sy(p.y)-T*.3,R=WEAPONS[p.weapon].skill.r*T,t=p.spin;ctx.save();
 ctx.globalAlpha=.25;ctx.fillStyle='#ffd23f';ctx.beginPath();ctx.ellipse(X,Y,R,R*.62,0,0,7);ctx.fill();ctx.globalAlpha=.9;
 for(let i=0;i<3;i++){ctx.strokeStyle=i%2?'#fff':'#ffb347';ctx.lineWidth=5-i;ctx.beginPath();ctx.ellipse(X,Y,R*(.55+i*.2),R*(.55+i*.2)*.62,0,t+i*2,t+i*2+2.2);ctx.stroke()}
 ctx.fillStyle='#fff';for(let i=0;i<8;i++){const a=t*1.3+i*Math.PI/4;ctx.beginPath();ctx.arc(X+Math.cos(a)*R*.85,Y+Math.sin(a)*R*.53,3,0,7);ctx.fill()}ctx.restore()}
function bar(x,y,w,frac,col){const X=sx(x)-w*T/2,Y=sy(y);ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.roundRect(X-1,Y-1,w*T+2,6,3);ctx.fill();ctx.fillStyle=col||(frac<.3?'#ff5a5a':frac<.6?'#ffb347':'#6fd07a');ctx.fillRect(X,Y,w*T*clamp(frac,0,1),4)}
function stars(x,y,n){ctx.font=`900 ${T*.32}px sans-serif`;ctx.textAlign='center';ctx.fillStyle='#ffd23f';ctx.strokeStyle='#6b4a32';ctx.lineWidth=2.5;const t='★'.repeat(n);ctx.strokeText(t,sx(x),sy(y));ctx.fillText(t,sx(x),sy(y))}
function drawBuilding(s,b){const X=sx(s.x),Y=sy(s.y),u=T;ctx.save();if(b.dead)ctx.globalAlpha=.45;ctx.lineWidth=2;ctx.strokeStyle='#3b2a20';ctx.lineJoin='round';
 if(s.t==='wall'){const L=5.4,n=b.lv===1?9:7;for(let i=0;i<n;i++){const o=-L/2+L*(i+.5)/n;const px=s.v?X:X+o*u,py=s.v?Y+o*u:Y;
   if(b.lv===1){ctx.fillStyle='#c98b52';ctx.beginPath();ctx.roundRect(px-u*.12,py-u*.55,u*.24,u*.7,u*.08);ctx.fill();ctx.stroke()}
   else{ctx.fillStyle=b.lv===2?'#b9bfc8':'#9aa3ae';const w=s.v?u*.7:u*L/n*.92,h=s.v?u*L/n*.92:u*.7;ctx.beginPath();ctx.roundRect(px-w/2,py-h/2-u*.25,w,h,u*.1);ctx.fill();ctx.stroke()}}
  if(b.lv===3){ctx.fillStyle='#ff8c5a';[-1,1].forEach(q=>{const fx=s.v?X:X+q*L/2*u*.8,fy=s.v?Y+q*L/2*u*.8:Y;ctx.fillRect(fx-1,fy-u*1.1,2,u*.6);ctx.beginPath();ctx.moveTo(fx+1,fy-u*1.1);ctx.lineTo(fx+u*.35,fy-u*.95);ctx.lineTo(fx+1,fy-u*.8);ctx.fill()})}}
 else if(s.t==='tower'){const h=u*(1.3+b.lv*.25);ctx.fillStyle='rgba(60,40,20,.25)';ctx.beginPath();ctx.ellipse(X,Y+u*.15,u*.55,u*.16,0,0,7);ctx.fill();
  ctx.fillStyle='#b98257';[-1,1].forEach(q=>{ctx.beginPath();ctx.moveTo(X+q*u*.4,Y+u*.15);ctx.lineTo(X+q*u*.25,Y-h+u*.3);ctx.lineTo(X+q*u*.12,Y-h+u*.3);ctx.lineTo(X+q*u*.25,Y+u*.15);ctx.closePath();ctx.fill();ctx.stroke()});
  ctx.fillStyle=b.lv>=2?'#d8dde3':'#e0a96d';ctx.beginPath();ctx.roundRect(X-u*.5,Y-h,u,u*.4,u*.08);ctx.fill();ctx.stroke();
  ctx.fillStyle=b.lv===3?'#7b8be8':'#f08a7a';ctx.beginPath();ctx.moveTo(X-u*.6,Y-h);ctx.lineTo(X,Y-h-u*.6);ctx.lineTo(X+u*.6,Y-h);ctx.closePath();ctx.fill();ctx.stroke();stars(s.x,s.y+.55,b.lv)}
 else if(s.t==='inf'||s.t==='arch'){const roof=s.t==='inf'?'#e86a5a':'#6cc24a';ctx.fillStyle='rgba(60,40,20,.25)';ctx.beginPath();ctx.ellipse(X,Y+u*.2,u*.85,u*.2,0,0,7);ctx.fill();
  ctx.fillStyle='#fff6e0';ctx.beginPath();ctx.roundRect(X-u*.7,Y-u*.6,u*1.4,u*.8,u*.08);ctx.fill();ctx.stroke();
  ctx.fillStyle=roof;ctx.beginPath();ctx.moveTo(X-u*.9,Y-u*.5);ctx.lineTo(X,Y-u*1.35);ctx.lineTo(X+u*.9,Y-u*.5);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#6b4a32';ctx.fillRect(X-1,Y-u*1.9,2.5,u*.6);ctx.fillStyle=roof;ctx.beginPath();ctx.moveTo(X+1.5,Y-u*1.9);ctx.lineTo(X+u*.45,Y-u*1.75);ctx.lineTo(X+1.5,Y-u*1.6);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#b98257';ctx.beginPath();ctx.roundRect(X-u*.18,Y-u*.35,u*.36,u*.55,u*.15);ctx.fill();ctx.stroke();stars(s.x,s.y+.6,b.lv)}
 else if(s.t==='mine'){ctx.fillStyle='#9aa3ae';ctx.beginPath();ctx.roundRect(X-u*.85,Y-u*.6,u*1.7,u*1.1,u*.18);ctx.fill();ctx.stroke();ctx.restore();
  const n=b.lv*2;for(let i=0;i<n;i++){const cx=s.x-.55+(i%3)*.55,cy=s.y-.35+Math.floor(i/3)*.45;spr(S.goldNugget,cx,cy+.25,.5)}ctx.save();stars(s.x,s.y+.85,b.lv)}
 ctx.restore()}
function drawEmptySpot(s,near){const X=sx(s.x),Y=sy(s.y);ctx.save();ctx.setLineDash([5,4]);ctx.lineWidth=2.5;ctx.strokeStyle=near?'#ff8c42':'rgba(255,248,231,.9)';ctx.fillStyle=near?'rgba(255,200,120,.35)':'rgba(255,248,231,.22)';
 ctx.beginPath();if(s.t==='wall'){const L=5.4*T,h=.6*T;s.v?ctx.roundRect(X-h/2,Y-L/2,h,L,8):ctx.roundRect(X-L/2,Y-h/2,L,h,8)}else ctx.ellipse(X,Y,T*.8,T*.55,0,0,7);ctx.fill();ctx.stroke();ctx.setLineDash([]);
 ctx.font=`900 ${T*.34}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#7a4b1d';ctx.fillText(BUILD[s.t].name,X,Y);ctx.restore()}
function drawWarn(d){const D=DIRS[d],x=clamp(D.x,1,MAP_W-1),y=clamp(D.y,1,MAP_H-1),X=sx(x),Y=sy(y),p=1+Math.sin(performance.now()/200)*.08;
 ctx.save();ctx.translate(X,Y);ctx.scale(p,p);ctx.fillStyle='#f06464';ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,T*.5,0,7);ctx.fill();ctx.stroke();
 ctx.fillStyle='#fff';ctx.font=`900 ${T*.6}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('!',0,2);ctx.restore()}
function render(){const W=VW,H=VH;ctx.setTransform(DPR,0,0,DPR,0,0);const me=G&&G.players[G.me];
 if(me){const hw=W/2/T,hh=H/2/T;cam.x=MAP_W<hw*2?MAP_W/2:clamp(me.x,hw,MAP_W-hw);cam.y=MAP_H<hh*2?MAP_H/2:clamp(me.y,hh-1,MAP_H-hh+1.5)}
 ctx.fillStyle='#5fae58';ctx.fillRect(0,0,W,H);
 const x0=Math.max(0,Math.floor(cam.x-W/2/T)),x1=Math.min(MAP_W,Math.ceil(cam.x+W/2/T)),y0=Math.max(0,Math.floor(cam.y-H/2/T)),y1=Math.min(MAP_H,Math.ceil(cam.y+H/2/T));
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){ctx.fillStyle=(x+y)%2?'#8fd27a':'#86cb71';ctx.fillRect(sx(x),sy(y),T+1,T+1)}
 // 路
 ctx.fillStyle='#ecd29a';ctx.fillRect(sx(16),sy(0),T*2,T*MAP_H);ctx.fillRect(sx(0),sy(16),T*MAP_W,T*2);ctx.beginPath();ctx.arc(sx(HOME.x),sy(HOME.y),T*3.2,0,7);ctx.fill();
 ctx.strokeStyle='#6b4a32';ctx.lineWidth=3;ctx.strokeRect(sx(0),sy(0),MAP_W*T,MAP_H*T);
 if(!G)return;
 const ns=G.phase==='day'&&me&&!me.dead?nearSpot(me):null;
 for(const s of SPOTS)if(!G.b[s.id].lv)drawEmptySpot(s,ns===s);
 const L=[];
 for(const d of DECOR)L.push({y:d.y,f:()=>spr(S[d.k],d.x,d.y+.4,d.k==='tree'?1.5:.8)});
 for(const s of SPOTS){const b=G.b[s.id];if(b.lv)L.push({y:s.y+(s.t==='wall'&&s.v?2.7:0),f:()=>{drawBuilding(s,b);if(ns===s){ctx.save();ctx.strokeStyle='#ff8c42';ctx.lineWidth=3;ctx.setLineDash([5,4]);ctx.beginPath();ctx.ellipse(sx(s.x),sy(s.y)+T*.2,T*.95,T*.4,0,0,7);ctx.stroke();ctx.restore()}}})}
 L.push({y:HOME.y+.6,f:()=>{const sh=G.home.hurtT>0?Math.sin(performance.now()/30)*.05:0,hx=HOME.x+sh,hy=HOME.y+.9,sz=3.6;spr(S.house,hx,hy,sz);const L0=sx(hx)-sz*T/2,T0=sy(hy)-sz*T*.95,u=sz*T;ctx.save();ctx.font=`900 ${u*.085}px -apple-system,'PingFang SC',sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.fillText('UHI CIVIL',L0+u*(HOUSE_SIGN.x+HOUSE_SIGN.w/2),T0+u*(HOUSE_SIGN.y+HOUSE_SIGN.h/2)+1,u*HOUSE_SIGN.w*.92);ctx.restore()}});
 for(const p of Object.values(G.players))if(!p.dead)L.push({y:p.y,f:()=>{if(p.flash){ctx.save();ctx.globalAlpha=.6}drawStorm(p);const sp=p.storm>0,dd=sp?(Math.floor(p.spin/1.6)%2?2:3):p.dir===2?2:p.dir===3?3:(p.face&&p.face.x<0?2:3);spr(S.rig,p.x,p.y,1.9,dd,p.ph,p.moving,HEROES[p.hero].col,sp?(Math.sin(p.spin*2)*.5+.5):(p.swing>0?Math.sin(p.swing/.25*Math.PI):0));if(p.flash)ctx.restore()}});
 for(const u of G.units)if(!u.dead)L.push({y:u.y,f:()=>spr(S.worker,u.x,u.y,.85,u.dir,u.ph,u.moving,u.k,u.atk>0)});
 for(const e of G.enemies)L.push({y:e.y,f:()=>spr(S.machine,e.x,e.y,ENEMIES[e.k].r*2.4,e.k,e.dir,e.ph,e.moving,e.flash>0)});
 L.sort((a,b)=>a.y-b.y).forEach(o=>o.f());
 for(const s of G.shots){const X=sx(s.x),Y=sy(s.y);ctx.save();ctx.translate(X,Y);ctx.lineWidth=2;ctx.strokeStyle='#3b2a20';ctx.beginPath();
  if(s.kind==='wrench'){ctx.rotate(s.t*14);ctx.rect(-T*.04,-T*.16,T*.08,T*.26);ctx.fillStyle='#b9c4cf';ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(0,-T*.17,T*.08,0,7);ctx.fillStyle='#b9c4cf'}
  else if(s.kind==='pile'){const a=Math.atan2(s.ty-s.y,s.tx-s.x);ctx.rotate(a);ctx.rect(-T*.22,-T*.06,T*.36,T*.12);ctx.fillStyle='#9aa3ae';ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(T*.14,-T*.06);ctx.lineTo(T*.26,0);ctx.lineTo(T*.14,T*.06);ctx.closePath();ctx.fillStyle='#55585f'}
  else if(s.kind==='arrow'){const a=s.vx!=null?Math.atan2(s.vy,s.vx):Math.atan2(s.ty-s.y,s.tx-s.x);ctx.rotate(a);ctx.moveTo(-T*.25,0);ctx.lineTo(T*.2,0);ctx.lineWidth=2.5;ctx.strokeStyle='#8a5a30';ctx.stroke();ctx.beginPath();ctx.moveTo(T*.28,0);ctx.lineTo(T*.16,-T*.07);ctx.lineTo(T*.16,T*.07);ctx.closePath();ctx.fillStyle='#dfe6ee';ctx.lineWidth=1.5;ctx.strokeStyle='#3b2a20'}else{ctx.arc(0,0,T*.09,0,7);ctx.fillStyle='#8a8f99'}ctx.fill();ctx.stroke();ctx.restore()}
 for(const f of G.fx){const k=f.t/f.life,X=sx(f.x),Y=sy(f.y)-T*.4;ctx.save();ctx.globalAlpha=1-k;ctx.lineWidth=4;ctx.strokeStyle='#fff';
  if(f.k==='arc'){ctx.beginPath();ctx.arc(X,Y,f.r*T*.8,f.a-1+k*.6,f.a+1+k*.6);ctx.stroke()}else if(f.k==='spin'){ctx.beginPath();ctx.arc(X,Y,f.r*T*(.4+k*.6),0,7);ctx.stroke();ctx.strokeStyle='#ffd23f';ctx.beginPath();ctx.arc(X,Y,f.r*T*(.3+k*.5),k*9,k*9+4);ctx.stroke()}
  else if(f.k==='slam'||f.k==='quake'){ctx.strokeStyle=f.k==='quake'?'#ffb347':'#fff';ctx.lineWidth=f.k==='quake'?7:4;ctx.beginPath();ctx.ellipse(X,Y+T*.4,f.r*T*(.3+k*.7),f.r*T*(.3+k*.7)*.6,0,0,7);ctx.stroke()}
  else{ctx.fillStyle='#fff';for(let i=0;i<6;i++){const a=i*1.05;ctx.beginPath();ctx.arc(X+Math.cos(a)*T*(.3+k*.6),Y+Math.sin(a)*T*(.2+k*.4),T*.18*(1-k),0,7);ctx.fill()}}ctx.restore()}
 if(G.dark>.01){ctx.fillStyle=`rgba(25,30,85,${.42*G.dark})`;ctx.fillRect(0,0,W,H)}
 // 血条 / 飘字 / 警告（在夜色上面）
 for(const s of SPOTS){const b=G.b[s.id];if(b.lv&&!b.dead&&b.hp<b.max)bar(s.x,s.y-(s.t==='tower'?2.4:s.t==='wall'?1.2:1.7),1.2,b.hp/b.max)}
 if(G.home.hp<G.home.max)bar(HOME.x,HOME.y-2.6,2,G.home.hp/G.home.max);
 for(const e of G.enemies)if(e.hp<e.max)bar(e.x,e.y-ENEMIES[e.k].r*2.4-.15,ENEMIES[e.k].r*1.6,e.hp/e.max,'#ff5a5a');
 for(const u of G.units)if(!u.dead&&u.hp<u.max)bar(u.x,u.y-.85,.6,u.hp/u.max);
 for(const p of Object.values(G.players))if(!p.dead){ctx.font=`900 ${T*.3}px sans-serif`;ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#fff';ctx.fillStyle='#7a4b1d';ctx.strokeText(HEROES[p.hero].name,sx(p.x),sy(p.y-3.5));ctx.fillText(HEROES[p.hero].name,sx(p.x),sy(p.y-3.5));if(p.hp<p.max)bar(p.x,p.y-3.4,.9,p.hp/p.max)}
 if(G.phase==='day')for(const d of nightDirs(G.night+1))drawWarn(d);
 for(const f of G.floats){ctx.save();ctx.globalAlpha=1-f.t/1.1;ctx.font=`900 ${T*.4}px sans-serif`;ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#6b4a32';ctx.fillStyle=f.col;ctx.strokeText(f.txt,sx(f.x),sy(f.y-f.t*.8));ctx.fillText(f.txt,sx(f.x),sy(f.y-f.t*.8));ctx.restore()}}
window.Game={newGame,step,render,build,startNight,skill,toggleArmy,nearSpot,nextCost,hooks,loadRec,saveRec,get G(){return G},resize,addPlayer};
