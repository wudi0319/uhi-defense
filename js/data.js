// 保卫UHI — 游戏数据（武器 / 天赋 / 建筑 / 敌人 / 地图 / 每晚的敌人）
const MAP_W=34,MAP_H=34,HOME={x:17,y:17,r:1.4};
// 玩家：徐工 240 桩机（两种颜色，以后双人各开一台）
const HEROES={yellow:{name:'楚剑',ic:'🏗️',col:'#f2b705'},blue:{name:'John',ic:'🏗️',col:'#3a8fd9'}};
const DIFF=1.15; // 难度：敌人血量和攻击 ×1.15
const WEAPONS={
 pile:{name:'桩锤',ic:'🔨',desc:'锤人！近身连续砸',kind:'melee',range:1.6,dmg:21,cd:.5,maxHit:4,
  skill:{name:'动力头加压',cd:12,dur:4,r:2.3,dps:30,desc:'像剑刃风暴：原地/边走边高速旋转几秒，持续伤害身边所有敌人'}},
 shot:{name:'打桩',ic:'📌',desc:'远程把桩打出去',kind:'ranged',range:5.5,dmg:15,cd:.6,
  skill:{name:'动力头加压',cd:12,dur:4,r:2.3,dps:30,desc:'像剑刃风暴：原地/边走边高速旋转几秒，持续伤害身边所有敌人'}},
 vibro:{name:'振动锤',ic:'〰️',desc:'慢，一下震一片还会晕',kind:'area',range:2.1,dmg:42,cd:1.2,
  skill:{name:'动力头加压',cd:12,dur:4,r:2.3,dps:30,stun:.3,desc:'像剑刃风暴：原地/边走边高速旋转几秒，持续伤害身边所有敌人'},unlock:'win'}};
const TALENTS={
 vault:{name:'金库',ic:'💰',desc:'开局 +10 金币，早上收入 +30%'},
 drill:{name:'工人强化',ic:'💪',desc:'工人血量和攻击 +35%'},
 armor:{name:'坚韧体魄',ic:'❤️',desc:'自己血量 +60%'},
 castle:{name:'坚固城堡',ic:'🏰',desc:'UHI 房子和城墙血量 +50%',unlock:'n3'},
 horde:{name:'挑战：机械大军',ic:'🚜',desc:'敌人血量 +70%，掉落金币 ×1.5',challenge:1,unlock:'n3'}};
// 建筑每级数值（下标 0 = 1级）
const BUILD={
 wall:{name:'城墙',ic:'🧱',cost:[4,8,14],hp:[150,300,520]},
 tower:{name:'弹弓塔',ic:'🏹',cost:[8,14,22],hp:[80,140,220],dmg:[8,13,20],range:[5,5.6,6.2],cd:[.9,.75,.6]},
 inf:{name:'钢筋工棚',ic:'🦺',cost:[8,14,22],hp:[120,200,300],n:[2,3,4],unit:'rebar'},
 arch:{name:'机修车间',ic:'🔧',cost:[8,14,22],hp:[120,200,300],n:[2,3,4],unit:'mech'},
 mine:{name:'金矿',ic:'⛏️',cost:[5,10,16],hp:[60,90,130],gold:[3,5,8]}};
const UNITS={
 rebar:{name:'钢筋工',hp:45,dmg:7,range:.8,cd:.7,spd:3.2,r:.3},
 mech:{name:'机修工',hp:30,dmg:6,range:3.5,cd:1,spd:3,r:.28}};
const ENEMIES={
 digger:{name:'小挖机',hp:20,spd:1.5,dmg:4,cd:.8,gold:1,r:.35,aggro:2},
 dozer:{name:'推土机',hp:46,spd:1.8,dmg:8,cd:1,gold:2,r:.45,aggro:2.6},
 roller:{name:'压路机',hp:170,spd:.8,dmg:20,cd:1.4,gold:6,r:.65,aggro:1.6,smash:1},
 tbm:{name:'大型盾构机',hp:1000,spd:.7,dmg:34,cd:1.5,gold:30,r:.95,aggro:2,smash:1}};
// 固定建造点：type 固定（像王权陨落）；wall 带方向 v=竖
const SPOTS=[
 {id:'wN',t:'wall',x:17,y:11,v:0},{id:'wS',t:'wall',x:17,y:23,v:0},{id:'wW',t:'wall',x:11,y:17,v:1},{id:'wE',t:'wall',x:23,y:17,v:1},
 {id:'t1',t:'tower',x:15,y:13},{id:'t2',t:'tower',x:19,y:21},{id:'t3',t:'tower',x:13,y:19},{id:'t4',t:'tower',x:21,y:15},
 {id:'bC',t:'inf',x:19.6,y:13.6},{id:'bD',t:'arch',x:14.4,y:20.4},
 {id:'f1',t:'mine',x:13.6,y:15},{id:'f2',t:'mine',x:20.4,y:19},{id:'f3',t:'mine',x:8,y:26},{id:'f4',t:'mine',x:26,y:8}];
const DIRS={N:{x:17,y:-.5,cn:'北'},S:{x:17,y:MAP_H+.5,cn:'南'},W:{x:-.5,y:17,cn:'西'},E:{x:MAP_W+.5,y:17,cn:'东'}};
const NIGHTS=7;
function nightDirs(n){return[['S'],['S','E'],['S','E','W'],['N','S','E','W'],['N','S','E','W'],['N','S','E','W'],['N','S','E','W']][n-1]}
// 第 n 晚的出怪表：[{t 秒, dir, k}]
function waveFor(n){const dirs=nightDirs(n),out=[],dur=22+n*5;
 const add=(k,cnt,t0=0,t1=dur)=>{for(let i=0;i<cnt;i++)out.push({t:t0+(t1-t0)*(cnt>1?i/(cnt-1):.5)+Math.random()*1.5,dir:dirs[(i+out.length)%dirs.length],k})};
 add('digger',4+n*2);if(n>=2)add('dozer',n*2-1,4);if(n>=3)add('roller',n-2,8);if(n===NIGHTS)add('tbm',1,dur*.6,dur*.6);
 return out.sort((a,b)=>a.t-b.t)}
