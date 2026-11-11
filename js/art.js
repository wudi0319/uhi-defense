// 保卫UHI 卡通画法：单位格 0..1，描边，脚在 .95 附近
const OL='#3b2a20';
function rr(c,x,y,w,h,r,fill,ol=true){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(ol){c.lineWidth=.065;c.lineJoin='round';c.strokeStyle=OL;c.stroke()}}
function circ(c,x,y,r,fill,ol=true){c.beginPath();c.arc(x,y,r,0,7);c.fillStyle=fill;c.fill();if(ol){c.lineWidth=.065;c.lineJoin='round';c.strokeStyle=OL;c.stroke()}}
function shadow(c,x,y,rx,ry){c.beginPath();c.ellipse(x,y,rx,ry,0,0,7);c.fillStyle='rgba(60,40,20,.22)';c.fill()}
const S={};
S.tree=c=>{shadow(c,.5,.92,.32,.09);rr(c,.42,.55,.16,.38,.06,'#c08a5a');circ(c,.5,.4,.33,'#8fc96b');circ(c,.36,.36,.14,'#b5dd8a',false)};
S.flower=c=>{c.strokeStyle='#3f9a3a';c.lineWidth=.06;c.beginPath();c.moveTo(.5,.85);c.lineTo(.5,.5);c.stroke();[[0,-1],[1,0],[0,1],[-1,0],[.7,.7]].forEach(([dx,dy])=>circ(c,.5+dx*.12,.42+dy*.12,.1,'#f7b2c0'));circ(c,.5,.42,.08,'#ffd84a')};
S.rock=c=>{shadow(c,.5,.85,.3,.07);c.beginPath();c.ellipse(.5,.66,.3,.22,0,0,7);c.fillStyle='#b9bfc8';c.fill();c.lineWidth=.065;c.strokeStyle=OL;c.stroke();circ(c,.42,.6,.06,'#d8dde3',false)};
// 工人：安全帽 + 反光背心；k='rebar' 钢筋工（挥钢筋）/ 'mech' 机修工（扔扳手）；swing=正在攻击
S.worker=(c,dir,ph,mv,k,swing)=>{const f=dir===2?-1:1,b=mv?Math.abs(Math.sin(ph))*.04:0,l=mv?Math.sin(ph)*.06:0;c.save();c.translate(.5,0);c.scale(f,1);c.translate(-.5,0);
 shadow(c,.5,.95,.24,.06);rr(c,.36+l,.76,.12,.18,.05,'#3f5f8f');rr(c,.52-l,.76,.12,.18,.05,'#3f5f8f');rr(c,.34+l,.9,.15,.06,.02,'#6b4a32');rr(c,.5-l,.9,.15,.06,.02,'#6b4a32');
 rr(c,.28,.46-b,.44,.36,.14,'#5a7fb8');
 const vest=k==='mech'?'#c6f031':'#ff8a1f';rr(c,.31,.47-b,.38,.3,.1,vest);c.fillStyle='#e8eef5';c.fillRect(.31,.6-b,.38,.035);c.fillRect(.31,.68-b,.38,.035);
 circ(c,.5,.33-b,.2,'#ffe0c2');
 const hat=k==='mech'?'#ffffff':'#ffd23f';c.beginPath();c.arc(.5,.29-b,.21,Math.PI,0);c.closePath();c.fillStyle=hat;c.fill();c.lineWidth=.05;c.strokeStyle=OL;c.stroke();
 rr(c,.25,.27-b,.52,.05,.02,hat);rr(c,.47,.1-b,.06,.12,.02,hat,false);
 if(dir!==1){const ox=dir>=2?.06:0;circ(c,.44+ox,.38-b,.025,OL,false);circ(c,.56+ox,.38-b,.025,OL,false);circ(c,.39+ox,.44-b,.03,'#ffaaaa',false);circ(c,.61+ox,.44-b,.03,'#ffaaaa',false)}
 if(k==='rebar'){c.save();c.translate(.68,.58-b);c.rotate(swing?-.2:-1.1);rr(c,-.025,-.5,.05,.55,.02,'#8a5a4a');c.strokeStyle='#5a3a2a';c.lineWidth=.012;for(let y=-.45;y<0;y+=.07){c.beginPath();c.moveTo(-.025,y);c.lineTo(.025,y+.03);c.stroke()}c.restore()}
 else{c.save();c.translate(.72,.6-b);c.rotate(.6);rr(c,-.02,-.16,.04,.2,.01,'#b9c4cf');circ(c,0,-.18,.05,'#b9c4cf');c.restore()}
 c.restore()};
// 要保护的房子（招牌 UHI CIVIL 的文字在画面层另外写，保证清晰）
const HOUSE_SIGN={x:.18,y:.44,w:.64,h:.13};
S.house=(c)=>{shadow(c,.5,.95,.46,.07);
 rr(c,.73,.05,.09,.2,.02,'#c0504a');rr(c,.71,.03,.13,.05,.02,'#9a3a34');
 rr(c,.12,.4,.76,.54,.05,'#fff6e0');
 c.beginPath();c.moveTo(.03,.44);c.lineTo(.5,.07);c.lineTo(.97,.44);c.closePath();c.fillStyle='#f08a5a';c.fill();c.lineWidth=.04;c.lineJoin='round';c.strokeStyle=OL;c.stroke();
 c.beginPath();c.arc(.5,.27,.06,0,7);c.fillStyle='#ffe6a8';c.fill();c.lineWidth=.025;c.stroke();
 rr(c,HOUSE_SIGN.x,HOUSE_SIGN.y,HOUSE_SIGN.w,HOUSE_SIGN.h,.03,'#2f5fb3');
 rr(c,.42,.66,.16,.28,.07,'#b98257');circ(c,.55,.8,.015,'#ffd23f',false);
 rr(c,.17,.64,.17,.15,.03,'#bfe6ff');rr(c,.66,.64,.17,.15,.03,'#bfe6ff');
 c.lineWidth=.015;c.strokeStyle=OL;[[.255,.64,.255,.79],[.745,.64,.745,.79]].forEach(([x1,y1,x2,y2])=>{c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()});
};
// 徐工 240 桩机：履带 + 车身 + 高桅杆 + 桩锤；slam 0..1 桩锤下落
S.rig=(c,dir,ph,mv,col,slam)=>{const f=dir===2?-1:1,b=mv?Math.abs(Math.sin(ph))*.015:0;c.save();c.translate(.5,0);c.scale(f,1);c.translate(-.5,0);
 shadow(c,.5,.95,.4,.06);
 rr(c,.1,.8,.8,.15,.07,'#3d3d42');for(let i=0;i<5;i++)circ(c,.18+i*.16,.875,.04,'#8a8f99',false);
 c.lineWidth=.02;c.strokeStyle='#8a8f99';for(let i=0;i<9;i++){const x=.12+((i*.09+(mv?ph*.03:0))%.76);c.beginPath();c.moveTo(x,.8);c.lineTo(x,.82);c.stroke()}
 rr(c,.08,.6-b,.2,.2,.04,'#55585f');
 rr(c,.24,.52-b,.5,.3,.05,col);
 rr(c,.46,.4-b,.26,.24,.05,col);rr(c,.5,.43-b,.18,.14,.03,'#bfe6ff');
 circ(c,.56,.5-b,.018,OL,false);circ(c,.64,.5-b,.018,OL,false);c.beginPath();c.arc(.6,.53-b,.025,.2,Math.PI-.2);c.lineWidth=.012;c.strokeStyle=OL;c.stroke();
 rr(c,.28,.6-b,.16,.05,.01,'#3d3d42',false);
 // 桅杆
 const mx=.8;rr(c,mx-.035,-.95,.07,1.75,.02,col);c.lineWidth=.012;c.strokeStyle=OL;for(let y=-.9;y<.75;y+=.12){c.beginPath();c.moveTo(mx-.035,y);c.lineTo(mx+.035,y+.12);c.stroke()}
 c.beginPath();c.moveTo(.6,.52-b);c.lineTo(mx,-.2);c.lineWidth=.03;c.strokeStyle='#55585f';c.stroke();
 rr(c,mx-.07,-1,.14,.07,.02,'#55585f');
 const hy=-.75+slam*1.05;c.beginPath();c.moveTo(mx,-.95);c.lineTo(mx,hy);c.lineWidth=.008;c.strokeStyle=OL;c.stroke();
 rr(c,mx-.075,hy,.15,.26,.03,'#d0423a');rr(c,mx-.05,hy+.26,.1,.08,.02,'#55585f');
 c.restore()};
// 敌方机械（小挖机 / 推土机 / 压路机 / 盾构机）
S.machine=(c,k,dir,ph,mv,flash)=>{const f=dir===2?-1:1,b=mv?Math.abs(Math.sin(ph))*.02:0;c.save();c.translate(.5,0);c.scale(f,1);c.translate(-.5,0);
 const col=flash?'#ffffff':{digger:'#ffb347',dozer:'#e86a5a',roller:'#6cc24a',tbm:'#7b8be8'}[k],dk='#3d3d42',gy='#9aa3ae';
 shadow(c,.5,.95,.42,.06);
 const eyes=(x,y,angry)=>{rr(c,x-.1,y-.07,.2,.14,.03,'#e8f6ff');circ(c,x-.04,y,.02,OL,false);circ(c,x+.05,y,.02,OL,false);if(angry){c.beginPath();c.moveTo(x-.08,y-.05);c.lineTo(x-.01,y-.025);c.moveTo(x+.09,y-.05);c.lineTo(x+.02,y-.025);c.lineWidth=.018;c.strokeStyle=OL;c.stroke()}};
 if(k==='digger'){rr(c,.12,.78,.6,.15,.07,dk);rr(c,.15,.55-b,.5,.25,.05,col);rr(c,.3,.36-b,.26,.24,.05,col);eyes(.45,.47-b,0);
  const a=Math.sin(ph*.6)*.1;c.save();c.translate(.6,.5-b);c.rotate(-.5+a);rr(c,0,-.03,.3,.06,.02,col);c.translate(.3,0);c.rotate(1.4);rr(c,0,-.03,.22,.06,.02,col);c.translate(.22,0);
  c.beginPath();c.moveTo(0,-.06);c.lineTo(.1,0);c.lineTo(0,.08);c.closePath();c.fillStyle=gy;c.fill();c.lineWidth=.03;c.strokeStyle=OL;c.stroke();c.restore()}
 else if(k==='dozer'){rr(c,.14,.76,.62,.17,.07,dk);rr(c,.16,.52-b,.52,.27,.05,col);rr(c,.24,.32-b,.3,.24,.05,col);eyes(.4,.43-b,1);
  rr(c,.76,.5-b,.1,.42,.03,gy);c.beginPath();c.moveTo(.66,.62-b);c.lineTo(.77,.66-b);c.lineWidth=.04;c.strokeStyle=dk;c.stroke()}
 else if(k==='roller'){circ(c,.3,.8,.13,dk);circ(c,.3,.8,.05,gy,false);rr(c,.14,.46-b,.52,.3,.06,col);rr(c,.2,.26-b,.3,.24,.05,col);eyes(.35,.37-b,1);
  rr(c,.6,.62,.32,.32,.12,gy);c.lineWidth=.015;c.strokeStyle=OL;for(let i=0;i<3;i++){const x=.66+((i*.1+(mv?ph*.02:0))%.24);c.beginPath();c.moveTo(x,.64);c.lineTo(x,.92);c.stroke()}}
 else{rr(c,.04,.42-b,.66,.48,.2,col);rr(c,.08,.82,.6,.12,.05,dk);eyes(.38,.56-b,1);
  c.beginPath();c.moveTo(.2,.42-b);c.lineTo(.24,.3-b);c.lineTo(.3,.38-b);c.lineTo(.36,.28-b);c.lineTo(.42,.38-b);c.lineTo(.48,.3-b);c.lineTo(.52,.42-b);c.closePath();c.fillStyle='#ffd23f';c.fill();c.lineWidth=.025;c.strokeStyle=OL;c.stroke();
  c.save();c.translate(.78,.62-b);c.beginPath();c.ellipse(0,0,.12,.3,0,0,7);c.fillStyle=gy;c.fill();c.lineWidth=.03;c.stroke();c.rotate(ph*.5);
  for(let i=0;i<6;i++){c.save();c.scale(.4,1);c.rotate(i*Math.PI/3);c.beginPath();c.moveTo(0,0);c.lineTo(0,-.27);c.lineWidth=.04;c.strokeStyle=dk;c.stroke();c.restore()}c.restore()}
 c.restore()};
S.goldNugget=c=>{c.beginPath();c.moveTo(.2,.8);c.lineTo(.35,.45);c.lineTo(.65,.4);c.lineTo(.82,.78);c.closePath();c.fillStyle='#ffd23f';c.fill();c.lineWidth=.06;c.strokeStyle=OL;c.stroke();circ(c,.45,.55,.06,'#fff3a0',false)};
window.S=S;
