// 保卫UHI — 界面：开始选择、HUD、按钮、摇杆和键盘
const $=id=>document.getElementById(id);
const sel={hero:'yellow',weapon:'pile',talents:[]};
const unlocked=(u,r)=>$('unlockAll').checked||!u||(u==='win'?r.wins>0:u==='n3'?r.best>=3:true);
const unlockText=u=>u==='win'?'通关后解锁':'守过第 3 夜解锁';
function drawHeroIcons(){document.querySelectorAll('#pickHero canvas').forEach(c=>{const x=c.getContext('2d'),H=HEROES[c.parentNode.dataset.hero];x.clearRect(0,0,96,96);x.save();x.scale(96,96);x.translate(.22,.4);x.scale(.55,.55);S.rig(x,3,0,false,H.col,0);x.restore()})}
function renderStart(){const r=Game.loadRec();
 $('pickWeapon').innerHTML=Object.entries(WEAPONS).map(([k,w])=>{const ok=unlocked(w.unlock,r);if(!ok&&sel.weapon===k)sel.weapon='pile';
  return`<button data-w="${k}" class="${sel.weapon===k?'on':''} ${ok?'':'lock'}">${w.ic} ${w.name}<small>${ok?w.desc:'🔒 '+unlockText(w.unlock)}</small></button>`}).join('');
 sel.talents=sel.talents.filter(k=>unlocked(TALENTS[k].unlock,r));
 $('pickTalent').innerHTML=Object.entries(TALENTS).map(([k,t])=>{const ok=unlocked(t.unlock,r);
  return`<button data-t="${k}" class="${sel.talents.includes(k)?'on':''} ${ok?'':'lock'} ${t.challenge?'ch':''}">${t.ic} ${t.name}<small>${ok?t.desc:'🔒 '+unlockText(t.unlock)}</small></button>`}).join('');
 document.querySelectorAll('#pickHero button').forEach(b=>b.classList.toggle('on',b.dataset.hero===sel.hero));
 $('rec').textContent=r.best||r.wins?`最好成绩：守住 ${r.best} 夜 · 通关 ${r.wins} 次`:'';drawHeroIcons()}
$('pickHero').onclick=e=>{const b=e.target.closest('button');if(!b)return;sel.hero=b.dataset.hero;renderStart()};
$('pickWeapon').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.classList.contains('lock'))return toast('还没解锁哦');sel.weapon=b.dataset.w;renderStart()};
$('pickTalent').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.classList.contains('lock'))return toast('还没解锁哦');const k=b.dataset.t,i=sel.talents.indexOf(k);
 if(i>=0)sel.talents.splice(i,1);else{if(sel.talents.length>=2)sel.talents.shift();sel.talents.push(k)}renderStart()};
$('unlockAll').onchange=renderStart;
$('goBtn').onclick=()=>{Game.newGame(sel);$('start').classList.add('hidden');$('end').classList.add('hidden');$('hMe').textContent=HEROES[sel.hero].ic+' '+HEROES[sel.hero].name;toast('天亮了，走到虚线框旁边建造，保护 UHI！')};
$('againBtn').onclick=()=>{$('end').classList.add('hidden');renderStart();$('start').classList.remove('hidden')};
let toastT;function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2200)}
Game.hooks.toast=toast;
Game.hooks.end=(win,was,r)=>{const G=Game.G;$('endIcon').textContent=win?'🏆':'😭';$('endTitle').textContent=win?'UHI保住啦！':'UHI被攻破了…';
 $('endText').textContent=win?`守住了全部 ${NIGHTS} 个晚上，打倒 ${G.stats.kills} 个敌人！`:`守住了 ${G.night} 夜，打倒 ${G.stats.kills} 个敌人。再试一次吧！`;
 const nu=[];if(r.wins>0&&!(was.wins>0))nu.push('〰️ 振动锤');if(r.best>=3&&!(was.best>=3))nu.push('🏰 坚固城堡','🚜 挑战：机械大军');
 $('endUnlock').textContent=nu.length?'新解锁：'+nu.join('、'):'';setTimeout(()=>$('end').classList.remove('hidden'),600)};
// ---- 按钮 ----
const me=()=>Game.G&&Game.G.players[Game.G.me];
$('buildBtn').onclick=()=>{const p=me();if(p)Game.build(p.id)};
$('nightBtn').onclick=()=>Game.startNight();
$('skillBtn').onclick=()=>{const p=me();if(p&&p.skillCd<=0)Game.skill(p.id)};
$('armyBtn').onclick=()=>{const p=me();if(p)Game.toggleArmy(p.id)};
// ---- 摇杆 + 键盘 ----
const joy=$('joy'),knob=$('knob');let jv={x:0,y:0},jid=null;const keys=new Set();
function joyMove(e){const r=joy.getBoundingClientRect();let dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);const m=Math.hypot(dx,dy),R=r.width/2-12;
 if(m>R){dx=dx/m*R;dy=dy/m*R}knob.style.transform=`translate(${dx}px,${dy}px)`;jv={x:dx/R,y:dy/R}}
joy.addEventListener('pointerdown',e=>{jid=e.pointerId;joy.setPointerCapture(jid);joyMove(e)});
joy.addEventListener('pointermove',e=>{if(e.pointerId===jid)joyMove(e)});
const joyEnd=e=>{if(e.pointerId!==jid)return;jid=null;jv={x:0,y:0};knob.style.transform=''};
joy.addEventListener('pointerup',joyEnd);joy.addEventListener('pointercancel',joyEnd);
addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys.add(k);if(e.repeat)return;
 if(k==='e'||k==='enter')$('buildBtn').classList.contains('hidden')||$('buildBtn').click();
 if(k===' '){e.preventDefault();$('skillBtn').classList.contains('hidden')||$('skillBtn').click()}
 if(k==='n')$('nightBtn').classList.contains('hidden')||$('nightBtn').click();if(k==='f')$('armyBtn').classList.contains('hidden')||$('armyBtn').click()});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>keys.clear());
function readInput(){let x=jv.x,y=jv.y;if(keys.has('a')||keys.has('arrowleft'))x-=1;if(keys.has('d')||keys.has('arrowright'))x+=1;if(keys.has('w')||keys.has('arrowup'))y-=1;if(keys.has('s')||keys.has('arrowdown'))y+=1;
 const m=Math.hypot(x,y);return m>1?{x:x/m,y:y/m}:{x,y}}
// ---- HUD ----
let hudKey='';
function hud(){const G=Game.G,p=me();if(!G||!p)return;const day=G.phase==='day';
 $('hGold').textContent='💰 '+G.gold;$('hNight').textContent=day?`☀️ 第 ${G.night+1} 天 · 共 ${NIGHTS} 夜`:G.phase==='night'?`🌙 第 ${G.night+1} 夜 / ${NIGHTS}`:G.phase==='win'?'🏆 通关啦':'💔 失败';
 $('hHome').style.width=(100*G.home.hp/G.home.max)+'%';$('hHp').style.width=(p.dead?0:100*p.hp/p.max)+'%';
 const s=day&&!p.dead?Game.nearSpot(p):null,bb=$('buildBtn');
 if(s){const b=G.b[s.id],c=Game.nextCost(s);bb.classList.remove('hidden');bb.textContent=c==null?`${BUILD[s.t].ic} ${BUILD[s.t].name} 已满级`:`${BUILD[s.t].ic} ${b.lv?'升级':'建造'}${BUILD[s.t].name}${b.lv?' → '+(b.lv+1)+'级':''} 💰${c}`;bb.classList.toggle('poor',c==null||G.gold<c)}else bb.classList.add('hidden');
 $('nightBtn').classList.toggle('hidden',!day);
 const W=WEAPONS[p.weapon],sk=$('skillBtn');sk.classList.toggle('hidden',G.phase!=='night');$('skillName').textContent=W.skill.name;$('skillCd').textContent=p.skillCd>0?Math.ceil(p.skillCd):'';
 const ab=$('armyBtn');ab.classList.toggle('hidden',!G.units.length);ab.textContent=G.armyLeader===p.id?'🏕️ 回工棚':'👷 跟我来';
 let h='';if(day)h=s?'点右下角按钮建造 / 升级':'今晚敌人从'+nightDirs(G.night+1).map(d=>DIRS[d].cn).join('、')+'边来 · 准备好就入夜';
 else if(G.phase==='night')h=p.dead?`${HEROES[p.hero].name}复活中… ${Math.ceil(p.respawn)}`:`敌人还剩 ${G.enemies.length+G.spawnQ.length} 个 · 靠近敌人会自动攻击`;
 $('hint').textContent=h}
// ---- 主循环 ----
let last=performance.now();
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;const G=Game.G;
 if(G&&G.phase!=='win'&&G.phase!=='lose'&&$('start').classList.contains('hidden')){G.input[G.me]=readInput();Game.step(dt)}
 Game.render();hud();requestAnimationFrame(frame)}
renderStart();requestAnimationFrame(frame);
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
