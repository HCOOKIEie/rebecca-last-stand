const {test}=require('node:test');
const assert=require('node:assert/strict');
const {World,FLOOR,DIFFICULTIES,makeConfig,segmentHitsBox}=require('../engine.js');
const advance=(w,s,input={})=>{for(let i=0;i<Math.round(s*120);i++)w.step(1/120,typeof input==='function'?input(w,i):input);};
const safe=()=>{const w=new World();Object.assign(w.boss,{x:700,y:FLOOR,prevX:700,prevY:FLOOR,phase:'recover',duration:999,opening:false});return w;};
const finishDownedBoss=w=>{
  assert.ok(w.downed,'armor depletion must first leave Smasher downed');
  advance(w,1);
  for(let i=0;i<600&&!w.canExecute();i++)w.step(1/120,{left:w.player.x>w.boss.x,right:w.player.x<w.boss.x});
  assert.ok(w.canExecute(),'Rebecca must be able to approach on foot');
  w.step(1/120,{interact:true});assert.ok(w.execution);advance(w,2.7);assert.equal(w.status,'won');
};
test('accelerated movement clamps to both arena boundaries',()=>{const w=safe();w.step(1/120,{right:true});assert.ok(w.player.vx>0&&w.player.vx<240);advance(w,8,{left:true});assert.equal(w.player.x,25);advance(w,8,{right:true});assert.equal(w.player.x,935);});
test('jump clears waves and returns to exact floor',()=>{const w=safe();w.step(1/120,{jump:true});advance(w,.3);assert.ok(w.player.y<FLOOR-50);w.waves=[{x:w.player.x,vx:0,life:.1,hit:false}];advance(w,.1);assert.equal(w.player.hp,4);advance(w,.7);assert.equal(w.player.y,FLOOR);});
test('dash is directional, invulnerable and cooldown limited',()=>{const w=safe(),x=w.player.x;w.step(1/120,{right:true,dash:true});assert.equal(w.hurt('impact'),false);advance(w,.3);assert.ok(w.player.x-x>100&&w.player.x-x<200);assert.equal(w.player.dash,0);w.dash(-1);assert.equal(w.player.dash,0);advance(w,1);w.dash(-1);assert.equal(w.player.dashDir,-1);});
test('locked target stays fixed while the player moves',()=>{const w=new World();advance(w,w.boss.duration-.4);assert.equal(w.boss.phase,'target');assert.equal(w.boss.locked,true);const x=w.boss.target;advance(w,.2,{right:true});assert.equal(w.boss.target,x);});
test('impact hurts grounded player and creates readable two-sided waves',()=>{const w=safe();w.boss.x=w.player.x;w.impact();assert.equal(w.player.hp,3);assert.equal(w.waves.length,2);assert.ok(w.waves[0].vx<0&&w.waves[1].vx>0);});
test('bullets consume ammo and only damage after physical travel',()=>{const w=safe(),hp=w.boss.hp;w.shoot();assert.equal(w.player.ammo,5);assert.equal(w.boss.hp,hp);assert.equal(w.shots.length,6);advance(w,.4);assert.ok(w.boss.hp<hp);assert.ok(w.score>0);});
test('airborne auto aim can hit the locked boss; landing is more vulnerable',()=>{const a=safe(),b=safe();Object.assign(a.boss,{phase:'target',duration:99,age:98.6,locked:true,y:207,hoverY:207,x:300,target:300});a.player.x=600;a.shoot();advance(a,.35);b.shoot();advance(b,.4);assert.ok(a.boss.hp<a.boss.maxHp);assert.ok(b.boss.maxHp-b.boss.hp>a.boss.maxHp-a.boss.hp);});
test('heavy shot costs two; manual and empty reload restore six rounds',()=>{const w=safe();w.shoot(true);assert.equal(w.player.ammo,4);w.reload();w.player.shotCd=0;w.shoot();assert.equal(w.player.ammo,4);advance(w,1.4);assert.equal(w.player.ammo,6);w.player.ammo=0;advance(w,1.5);assert.equal(w.player.ammo,6);});
test('perfect dodge empowers exactly one shot, even with multiple pellets',()=>{const w=safe();w.perfect();assert.ok(w.player.counter>0);w.shoot();assert.equal(w.player.counter,0);assert.ok(w.shots.every(s=>s.counter));const hp=w.boss.hp;advance(w,.4);assert.ok(hp-w.boss.hp>200);w.player.shotCd=0;w.shoot();assert.ok(w.shots.every(s=>!s.counter));});
test('ordinary damage invulnerability does not grant a perfect dodge',()=>{const w=safe();w.player.invulnerable=1;w.boss.x=w.player.x+100;w.impact();assert.equal(w.dodges,0);});
test('boss phases are driven by HP and unlock barrage and double stomp',()=>{const w=safe();assert.ok(!w.availableAttacks().includes('barrage'));w.damageBoss({damage:w.boss.maxHp*.35/2.4,x:700,y:400});assert.equal(w.phase,1);assert.ok(w.availableAttacks().includes('barrage'));w.damageBoss({damage:w.boss.maxHp*.35/2.4,x:700,y:400});assert.equal(w.phase,2);assert.ok(w.availableAttacks().includes('double'));});
test('waiting never wins; depleted armor requires an explicit nearby execution to finish',()=>{const w=safe();advance(w,61);assert.equal(w.status,'playing');assert.equal(w.boss.hp,w.boss.maxHp);w.damageBoss({damage:10000,x:700,y:400});assert.equal(w.status,'playing');assert.equal(w.boss.hp,0);assert.equal(w.boss.phase,'kneel');assert.equal(w.events.filter(e=>e.type==='won').length,0);const time=w.time;advance(w,5);assert.equal(w.time,time);assert.equal(w.status,'playing');finishDownedBoss(w);assert.equal(w.events.filter(e=>e.type==='won').length,1);assert.equal(w.time,time);});
test('loss is terminal, including projectiles already in flight',()=>{const w=new World('nightmare');w.hurt('impact');assert.equal(w.status,'lost');w.damageBoss({damage:10000,x:700,y:400});assert.equal(w.status,'lost');assert.equal(w.boss.hp,w.boss.maxHp);});
test('medical pickup heals once and hard mode has no automatic supplies',()=>{const w=safe();w.player.hp=1;w.pickups=[{x:w.player.x,life:12,age:0}];w.step(1/120);assert.equal(w.player.hp,2);assert.equal(w.pickups.length,0);const h=new World('hard');h.boss.duration=999;advance(h,25);assert.equal(h.pickups.length,0);});
test('standing still and holding fire cannot bypass the dodge fight',()=>{const w=new World();advance(w,60,{shoot:true});assert.equal(w.status,'lost');assert.ok(w.boss.hp>0);});
test('every opening places Rebecca below Smasher and reserves a full reaction window',()=>{
  for(const difficulty of Object.keys(DIFFICULTIES)){
    const w=new World(difficulty),b=w.boss,p=w.player;
    assert.equal(p.y,FLOOR);assert.equal(b.phase,'target');assert.equal(b.x,p.x);assert.ok(b.y<p.y-150);assert.ok(b.duration>=1.9);assert.ok(b.lockWindow>=.65);
    const duration=b.duration;advance(w,1.2,{right:true});assert.equal(w.player.hp,w.maxHp);assert.equal(w.boss.phase,'target');assert.ok(w.player.x>p.prevX);assert.ok(w.boss.age<duration);
  }
});
test('first locked drop still gives time to move aside and then sends two waves',()=>{
  const w=new World('normal'),warning=w.boss.duration;
  advance(w,warning-.25);const target=w.boss.target;assert.equal(w.boss.locked,true);
  advance(w,.7,{right:true,dash:true});assert.equal(w.player.hp,4);assert.equal(w.boss.opening,false);assert.equal(w.events.filter(e=>e.type==='impact').length,1);assert.equal(w.waves.length,2);assert.ok(w.waves.every(q=>Number.isFinite(q.seed)&&q.age>0&&q.origin===target));
});
test('nonlethal injury keeps the character; lethal damage creates one persistent death scene',()=>{
  const a=safe();a.hurt('wave');assert.equal(a.death,null);
  for(const source of ['impact','wave','cannon','missile','rush']){
    const w=new World('nightmare');w.hurt(source);assert.equal(w.status,'lost');assert.equal(w.player.hp,0);assert.equal(w.death.source,source);assert.ok(w.death.fragments.length>60);assert.ok(w.death.fragments.some(f=>f.kind==='guts'));
    const death=w.death;w.hurt(source);assert.equal(w.death,death);
    const time=w.time;for(let i=0;i<480;i++)w.updateEffects(1/120);
    assert.ok(w.death.fragments.every(f=>f.rest));assert.equal(w.death.stains.length,52);assert.equal(w.time,time);assert.ok(w.death.age>=3.9);assert.equal(w.status,'lost');
  }
});
test('terminal scene animation cannot damage, heal or resurrect the player; retry is clean',()=>{
  const w=new World('nightmare');w.pickups=[{x:w.player.x,life:12,age:0}];w.enemyShots=[{life:1}];w.hurt('impact');assert.equal(w.pickups.length,0);assert.equal(w.enemyShots.length,0);
  const hp=w.player.hp,time=w.time;advance(w,5,{shoot:true,jump:true});assert.equal(w.player.hp,hp);assert.equal(w.time,time);
  const fresh=new World('nightmare');assert.equal(fresh.death,null);assert.equal(fresh.player.hp,1);assert.equal(fresh.boss.opening,true);
});
test('four presets tune the boss as well as player survivability',()=>{
  assert.deepEqual(Object.keys(DIFFICULTIES),['easy','normal','hard','nightmare']);
  let hp=0,pace=0,warning=2;
  for(const difficulty of Object.keys(DIFFICULTIES)){const w=new World(difficulty);assert.ok(w.boss.maxHp>hp&&w.config.pace>pace&&w.config.warning<warning);hp=w.boss.maxHp;pace=w.config.pace;warning=w.config.warning;assert.equal(w.maxHp,w.config.playerHp);}
});
test('custom settings clamp unsafe values and actually change the simulation',()=>{
  const c=makeConfig('normal',{bossHp:Infinity,pace:8,warning:-4,arsenal:'invalid'});assert.equal(c.bossHp,4000);assert.equal(c.pace,1.6);assert.equal(c.warning,.65);assert.equal(c.arsenal,'full');
  assert.equal(makeConfig('normal',null).bossHp,4000);
  const w=new World('normal',7,{bossHp:1750,pace:1.5,warning:1.4,arsenal:'basic'});assert.equal(w.boss.hp,1750);assert.ok(w.boss.duration>=1.9);w.phase=2;assert.deepEqual(w.availableAttacks(),['stomp','cannon','rush']);
  w.boss.x=700;w.beginAttack('cannon');assert.equal(w.boss.duration,.9*1.4);
});
test('full-arsenal attack rotation includes all five moves without randomness',()=>{
  const a=new World('nightmare',1),b=new World('nightmare',99),seen=new Set();
  for(let i=0;i<8;i++){a.nextAttack();b.nextAttack();assert.equal(a.boss.attack,b.boss.attack);seen.add(a.boss.attack);}
  assert.deepEqual([...seen].sort(),['barrage','cannon','double','rush','stomp']);
});
test('cannon locks its aim and emits actual travel-time projectiles',()=>{
  const w=safe();w.beginAttack('cannon');advance(w,.65);assert.equal(w.boss.locked,true);const target=w.boss.aimX;advance(w,.12,{right:true});assert.equal(w.boss.aimX,target);advance(w,.18);assert.ok(w.enemyShots.length>0);assert.equal(w.player.hp,4);
});
test('ranged attacks first make space when the boss and player overlap',()=>{
  const w=safe();w.boss.x=w.player.x;w.beginAttack('cannon');assert.equal(w.boss.phase,'reposition');advance(w,.4);assert.equal(w.boss.phase,'cannonAim');assert.ok(Math.abs(w.boss.x-w.player.x)>=180);assert.equal(w.boss.y,FLOOR);
});
test('swept cannon rounds damage on contact, dash grants at most one counter per burst',()=>{
  assert.ok(segmentHitsBox(0,400,900,400,290,372,310,448));
  assert.equal(segmentHitsBox(0,300,900,300,290,372,310,448),false);
  const w=safe();w.enemyShots=[{x:270,y:FLOOR-40,prevX:270,prevY:FLOOR-40,vx:6000,vy:0,life:1}];w.step(1/120);assert.equal(w.player.hp,3);
  const d=safe();d.dash(1);for(let i=0;i<2;i++)d.enemyShots.push({x:280,y:FLOOR-40,prevX:280,prevY:FLOOR-40,vx:6000,vy:0,life:1});d.step(1/120);assert.equal(d.player.hp,4);assert.equal(d.dodges,1);
});
test('rush has windup and can be cleared by a reachable jump',()=>{
  const grounded=safe();Object.assign(grounded.boss,{x:400,phase:'rush',rushEnd:200,age:0,duration:1,rushHit:false});grounded.player.x=350;grounded.step(1/120);assert.equal(grounded.player.hp,3);
  const airborne=safe();airborne.player.x=350;airborne.jump();advance(airborne,.3);assert.ok(airborne.player.y<FLOOR-64);Object.assign(airborne.boss,{x:400,phase:'rush',rushEnd:200,age:0,duration:1,rushHit:false});airborne.step(1/120);assert.equal(airborne.player.hp,4);
  const warn=safe();warn.beginAttack('rush');assert.equal(warn.boss.phase,'rushWindup');const x=warn.boss.x;advance(warn,.7);assert.equal(warn.boss.x,x);advance(warn,.2);assert.notEqual(warn.boss.x,x);
});
test('barrage leaves real safe gaps and each marked missile explodes once',()=>{
  const w=safe();w.beginAttack('barrage');w.boss.target=480;advance(w,.7);assert.equal(w.missiles.length,3);const sorted=w.missiles.map(m=>m.x).sort((a,b)=>a-b);for(let i=1;i<sorted.length;i++)assert.ok(sorted[i]-sorted[i-1]>60);
  w.player.x=(sorted[0]+sorted[1])/2;advance(w,1.8);assert.equal(w.player.hp,4);assert.equal(w.events.filter(e=>e.type==='explosion').length,3);advance(w,.5);assert.equal(w.events.filter(e=>e.type==='explosion').length,3);
});
test('double stomp completes exactly two impacts before another move',()=>{
  const w=safe();w.player.invulnerable=20;w.beginAttack('double');advance(w,7.2);assert.equal(w.events.filter(e=>e.type==='impact').length,2);assert.equal(w.events.filter(e=>e.type==='combo').length,1);
});
test('downing Smasher cancels hostile projectiles immediately before the execution',()=>{
  const w=safe();w.enemyShots.push({life:3});w.missiles.push({life:3});w.waves.push({life:3});w.damageBoss({damage:10000,x:700,y:400});assert.equal(w.status,'playing');assert.ok(w.downed);assert.equal(w.enemyShots.length,0);assert.equal(w.missiles.length,0);assert.equal(w.waves.length,0);
});
for(const difficulty of ['easy','normal','hard'])test(`reactive player can beat ${difficulty} boss using ordinary movement and firing`,()=>{
  const w=new World(difficulty,2076);let travel=1;const injuries=[];
  for(let i=0;i<18000&&w.status==='playing'&&!w.downed;i++){
    const p=w.player,b=w.boss;if(p.x>800)travel=-1;if(p.x<160)travel=1;
    if((b.phase==='target'&&b.locked)||b.phase==='drop')travel=p.x>=b.target?1:-1;
    if(p.x>900)travel=-1;if(p.x<60)travel=1;
    const missile=w.missiles.find(m=>!m.exploded&&Math.abs(m.x-p.x)<85&&m.age>.55);
    if(missile)travel=p.x>=missile.x?1:-1;
    const threat=w.waves.some(q=>{const t=(p.x-q.x)/(q.vx-travel*240);return t>0&&t<.25;});
    const rushTime=(Math.abs(p.x-b.x)-52)/(850*w.config.pace-travel*b.facing*240);
    const rush=b.phase==='rush'&&rushTime>0&&rushTime<.3;
    const sandiContact=(Math.abs(p.x-b.x)-50)/(1280*Math.sqrt(w.config.pace)-travel*b.facing*240);
    const sandi=b.phase==='sandiWindup'&&b.locked&&b.duration-b.age+sandiContact<.29||b.phase==='sandiRush'&&sandiContact>0&&sandiContact<.29;
    const ahead=w.floorAt(p.x+travel*65),hole=ahead.state==='hole'||ahead.state==='warning'&&ahead.timer<.7;
    const cannon=w.enemyShots.some(s=>{const t=(p.x-s.x)/(s.vx-travel*240);return t>0&&t<.21&&s.y+s.vy*t>FLOOR-100;});
    const missileClose=w.missiles.some(m=>!m.exploded&&Math.abs(m.x-p.x)<55&&m.fuse-m.age<.32);
    w.step(1/120,{left:travel<0,right:travel>0,jump:(threat||rush||cannon||missileClose||sandi||hole)&&p.y===FLOOR,dash:b.phase==='drop'&&Math.abs(p.x-b.target)<105||['rush','sandiRush'].includes(b.phase)&&Math.abs(p.x-b.x)<130&&p.y>FLOOR-70||hole&&p.y<FLOOR-35,heavy:p.counter>0&&p.ammo>=2,shoot:true,target:!w.parts.legs.broken?'legs':!w.parts.launcher.broken?'launcher':'core'});
    for(const e of w.events.splice(0))if(e.type==='hurt')injuries.push({source:e.source,time:w.time,phase:b.phase,x:p.x});
  }
  assert.ok(w.downed,JSON.stringify({time:w.time,hp:w.player.hp,bossHp:w.boss.hp,injuries}));assert.equal(w.boss.hp,0);finishDownedBoss(w);
});

test('half armor queues exactly one grounded transformation without cancelling an airborne drop',()=>{
  const w=new World();w.damageBoss({damage:2100,x:300,y:180});assert.equal(w.boss.transformPending,true);assert.equal(w.boss.overdrive,false);
  w.step(1/120);assert.equal(w.boss.phase,'target');w.boss.opening=false;Object.assign(w.boss,{phase:'recover',y:FLOOR,age:0,duration:99});
  w.waves.push({life:1});w.enemyShots.push({life:1});w.step(1/120);assert.equal(w.boss.phase,'transform');assert.equal(w.waves.length,0);assert.equal(w.enemyShots.length,0);
  w.player.invulnerable=10;advance(w,5.45);assert.equal(w.boss.attack,'sandevistan');assert.equal(w.boss.phase,'sandiWindup');
  w.damageBoss({damage:1,x:300,y:300});assert.equal(w.boss.transformPending,false);assert.equal(w.events.filter(e=>e.type==='overdrive').length,1);
});

test('Sandevistan has three separately telegraphed physical dashes then a punish window',()=>{
  const w=safe();w.player.invulnerable=20;w.boss.overdrive=true;w.beginAttack('sandevistan');
  let prior=w.boss.phase,windups=1,dashes=0,minWarning=99;
  for(let i=0;i<1200;i++){
    if(w.boss.phase==='sandiWindup')minWarning=Math.min(minWarning,w.boss.duration);
    w.step(1/120);
    if(w.boss.phase!==prior){if(w.boss.phase==='sandiWindup')windups++;if(w.boss.phase==='sandiRush')dashes++;prior=w.boss.phase;}
    if(w.boss.phase==='recover')break;
  }
  assert.equal(windups,3);assert.equal(dashes,3);assert.ok(minWarning>=.55);assert.equal(w.boss.phase,'recover');assert.ok(w.boss.duration>=1.75);
  const d=safe();d.boss.overdrive=true;d.beginAttack('sandevistan');advance(d,d.boss.duration-.13);d.jump();advance(d,.5);assert.equal(d.player.hp,4);assert.ok(d.bossTrails.some(t=>t.sandi));
});

test('targeted pellets physically damage one chosen armor part and destroyed launcher weakens the next barrage',()=>{
  const w=safe();w.selectTarget('launcher');w.shoot(true);assert.equal(w.parts.launcher.hp,w.parts.launcher.maxHp);advance(w,.45);
  assert.ok(w.parts.launcher.hp<w.parts.launcher.maxHp);assert.equal(w.parts.legs.hp,w.parts.legs.maxHp);
  for(let i=0;i<6&&!w.parts.launcher.broken;i++){w.player.shotCd=0;w.player.ammo=6;w.shoot(true);advance(w,.45);}
  assert.equal(w.parts.launcher.broken,true);assert.equal(w.player.target,'core');assert.equal(w.events.filter(e=>e.type==='part-broken').length,1);
  w.boss.target=480;w.launchBarrage();assert.equal(w.missiles.length,1);const score=w.score;w.damagePart('launcher',999);assert.equal(w.score,score);
  w.cycleTarget();assert.equal(w.player.target,'legs');w.selectTarget('launcher');assert.equal(w.player.target,'legs');
});

test('Sandevistan keeps the locked endpoint and full warning origin during the dash',()=>{
  const w=safe();w.player.invulnerable=20;w.boss.overdrive=true;w.beginAttack('sandevistan');
  advance(w,w.boss.duration-.25);assert.equal(w.boss.locked,true);
  const start=w.boss.x,end=w.boss.rushEnd;
  w.player.x=900;
  for(let i=0;i<60&&w.boss.phase==='sandiWindup';i++)w.step(1/120);
  assert.equal(w.boss.phase,'sandiRush');assert.equal(w.boss.rushStart,start);assert.equal(w.boss.rushEnd,end);
  advance(w,.15);assert.equal(w.boss.phase,'sandiRush');assert.notEqual(w.boss.x,start);
  assert.equal(w.boss.rushStart,start);assert.equal(w.boss.rushEnd,end);assert.ok(w.bossTrails.length>1);
});

test('destroyed legs extend real recovery time and preserve the boss health objective',()=>{
  const a=safe(),b=safe();b.damagePart('legs',9999);a.recover(1.4);b.recover(1.4);assert.ok(b.boss.duration-a.boss.duration>=.64);assert.equal(b.boss.hp,b.boss.maxHp);
  advance(a,1.5);advance(b,1.5);assert.notEqual(a.boss.phase,'recover');assert.equal(b.boss.phase,'recover');
});

test('slide and airborne heavy combos increase projectile damage with the same ammo cost',()=>{
  const normal=safe(),slide=safe(),air=safe();normal.shoot();slide.dash(1);slide.shoot();air.jump();advance(air,.1);air.shoot(true);
  assert.equal(slide.player.ammo,5);assert.equal(air.player.ammo,4);assert.ok(slide.shots.every(s=>s.style==='slide'&&s.damage>normal.shots[0].damage));assert.ok(air.shots.every(s=>s.style==='air'&&s.damage===15));assert.ok(air.player.vy<0);assert.ok(air.player.comboTimer>0);
});

test('close heavy hit interrupts a windup once per cooldown but cannot cancel the opening lock',()=>{
  const w=safe();w.boss.x=400;w.beginAttack('cannon');w.boss.phase='cannonAim';w.damageBoss({damage:10,heavy:true,originX:300,x:400,y:360});
  assert.equal(w.boss.phase,'recover');assert.equal(w.events.filter(e=>e.type==='interrupt').length,1);
  w.boss.phase='rushWindup';w.damageBoss({damage:10,heavy:true,originX:300,x:400,y:360});assert.equal(w.boss.phase,'rushWindup');
  const opening=new World();opening.damageBoss({damage:10,heavy:true,originX:300,x:300,y:160});assert.equal(opening.boss.phase,'target');
});

test('repeated stomps fracture glass, warn before collapsing, then deploy a temporary light bridge',()=>{
  const w=safe(),tile=w.floorAt(440);w.damageFloor(440);assert.equal(tile.state,'cracked');w.damageFloor(440);assert.equal(tile.damage,2);w.damageFloor(440);assert.equal(tile.state,'warning');assert.ok(tile.timer>=1);
  w.updateFloor(1);assert.equal(tile.state,'warning');w.updateFloor(.2);assert.equal(tile.state,'hole');w.updateFloor(7.01);assert.equal(tile.state,'bridge');w.updateFloor(8.01);assert.equal(tile.state,'intact');
  for(let i=0;i<6;i++)w.damageFloor(10);assert.equal(w.floor[0].state,'intact');
});

test('falling into a collapsed tile costs one life and rescues onto intact ground; jump and dash can cross',()=>{
  const w=safe();w.player.x=440;Object.assign(w.floorAt(440),{state:'hole',timer:7});advance(w,.5);assert.equal(w.player.hp,3);assert.equal(w.player.y,FLOOR);assert.notEqual(w.floorAt(w.player.x).state,'hole');
  for(const maneuver of ['jump','dash']){
    const d=safe();d.player.x=360;Object.assign(d.floorAt(440),{state:'hole',timer:7});d.step(1/120,{right:true,[maneuver]:true});advance(d,.7,{right:true});assert.equal(d.player.hp,4);assert.equal(d.player.falling,0);assert.ok(d.player.x>480);
  }
  const n=new World('nightmare');n.boss.duration=999;n.player.x=440;Object.assign(n.floorAt(440),{state:'hole',timer:7});advance(n,.5);assert.equal(n.status,'lost');assert.equal(n.death.source,'collapse');
});

test('collapsed floor stops a pressure wave instead of carrying damage across the gap',()=>{
  const w=safe();Object.assign(w.floorAt(440),{state:'hole',timer:7});w.waves=[{x:399,vx:180,life:3,age:0,hit:false}];advance(w,.02);assert.equal(w.waves.length,0);
});

test('completed execution enters communication stages with frozen combat and a living Rebecca',()=>{
  const w=safe();w.damageBoss({damage:9999,x:700,y:350});finishDownedBoss(w);const time=w.time,score=w.score,hp=w.player.hp;
  for(let i=0;i<2100;i++)w.updateEffects(1/120);
  assert.equal(w.status,'won');assert.equal(w.player.hp,hp);assert.equal(w.time,time);assert.equal(w.score,score);assert.ok(w.victory.age>=17);assert.equal(w.victory.commStage,3);assert.equal(w.events.filter(e=>e.type==='comm').length,4);assert.equal(w.death,null);
});

test('downed boss stays vulnerable to interaction only: no damage, firing, pickups or dangerous floor',()=>{
  const w=safe();w.player.hp=2;w.pickups.push({x:w.player.x,life:10,age:0});w.shots.push({life:1});w.bossTrails.push({life:1});
  Object.assign(w.floorAt(440),{state:'hole',timer:7});Object.assign(w.floorAt(520),{state:'warning',timer:.1});
  w.damageBoss({damage:9999,x:700,y:350});const time=w.time,score=w.score,ammo=w.player.ammo;
  assert.equal(w.pickups.length+w.shots.length+w.bossTrails.length,0);
  assert.equal(w.floorAt(440).state,'bridge');assert.equal(w.floorAt(520).state,'bridge');
  advance(w,8,{shoot:true,heavy:true,reload:true});
  assert.equal(w.hurt('impact'),false);assert.equal(w.hurt('collapse'),false);
  w.damageBoss({damage:9999,x:700,y:350});w.defeatBoss();
  assert.equal(w.player.hp,2);assert.equal(w.player.ammo,ammo);assert.equal(w.boss.hp,0);
  assert.equal(w.time,time);assert.equal(w.score,score);assert.equal(w.boss.phase,'kneel');
  assert.equal(w.events.filter(e=>e.type==='boss-downed').length,1);assert.equal(w.events.filter(e=>e.type==='won').length,0);
  finishDownedBoss(w);assert.equal(w.player.hp,2);
});

test('execution requires settled knees, nearby grounded Rebecca and a fresh interaction',()=>{
  const w=safe();w.damageBoss({damage:9999,x:700,y:350});
  assert.equal(w.execute(),false);advance(w,1,{interact:true});assert.equal(w.execution,null);
  assert.equal(w.canExecute(),false);assert.equal(w.execute(),false);
  advance(w,1.4,{right:true});assert.ok(Math.abs(w.player.x-w.boss.x)<105);
  w.step(1/120,{jump:true});advance(w,.15);assert.ok(w.player.y<FLOOR-6);assert.equal(w.execute(),false);
  advance(w,1);assert.equal(w.canExecute(),true);assert.equal(w.execution,null);
  w.step(1/120,{interact:true});assert.ok(w.execution);assert.equal(w.boss.phase,'execute');
  assert.equal(w.execute(),false);assert.equal(w.events.filter(e=>e.type==='execution-start').length,1);
});

test('airborne armor depletion falls to the floor before the kneeling interaction is enabled',()=>{
  const w=safe();Object.assign(w.boss,{y:207,phase:'target'});w.player.x=650;
  w.damageBoss({damage:9999,x:700,y:120});assert.equal(w.boss.phase,'kneel');
  advance(w,.3);assert.ok(w.boss.y<FLOOR);assert.equal(w.canExecute(),false);
  advance(w,.65);assert.equal(w.boss.y,FLOOR);assert.equal(w.canExecute(),true);
  assert.equal(w.events.filter(e=>e.type==='boss-downed').length,1);
});

test('execution fires and lands once, freezes combat time, and settles victory after 2.6 seconds',()=>{
  const w=safe();w.player.x=620;w.damageBoss({damage:9999,x:700,y:350});advance(w,1);
  const time=w.time,hp=w.player.hp,score=w.score;w.step(1/120,{interact:true});
  assert.ok(w.execution);assert.equal(w.execution.age,0);
  advance(w,.64,{interact:true,shoot:true,jump:true});assert.equal(w.events.filter(e=>e.type==='execution-shot').length,0);
  advance(w,.02,{interact:true});assert.equal(w.events.filter(e=>e.type==='execution-shot').length,1);
  advance(w,1.18,{interact:true});assert.equal(w.events.filter(e=>e.type==='execution-fall').length,0);
  advance(w,.04,{interact:true});assert.equal(w.events.filter(e=>e.type==='execution-fall').length,1);
  advance(w,.7,{interact:true});assert.equal(w.status,'playing');assert.ok(w.execution.age<2.6);
  advance(w,.04,{interact:true});assert.equal(w.status,'won');assert.equal(w.execution,null);assert.equal(w.downed,null);
  assert.equal(w.player.hp,hp);assert.equal(w.time,time);assert.equal(w.score,score+3000+hp*500);
  for(const type of ['execution-start','execution-shot','execution-fall','won'])assert.equal(w.events.filter(e=>e.type===type).length,1,type);
  advance(w,4,{interact:true});w.completeVictory();assert.equal(w.events.filter(e=>e.type==='won').length,1);
  assert.equal(w.score,score+3000+hp*500);
});

test('floor breach protects both fighters, preserves resources and resumes in the lower arena',()=>{
  const w=safe();w.damagePart('launcher',9999);w.damageBoss({damage:900,x:700,y:360});w.step(1/120);
  assert.ok(w.transition);const hp=w.player.hp,bossHp=w.boss.hp,ammo=w.player.ammo,score=w.score,time=w.time;
  advance(w,2,{shoot:true,heavy:true,dash:true,jump:true,right:true});
  assert.equal(w.hurt('impact'),false);w.damageBoss({damage:99999,x:700,y:350});
  assert.equal(w.player.hp,hp);assert.equal(w.boss.hp,bossHp);assert.equal(w.player.ammo,ammo);assert.equal(w.score,score);assert.ok(Math.abs(w.time-time)<1e-8);
  assert.equal(w.arena,'plaza');assert.equal(w.events.filter(e=>e.type==='floor-break').length,1);
  advance(w,3.45);assert.equal(w.transition,null);assert.equal(w.arena,'undercroft');assert.equal(w.boss.phase,'sandiWindup');
  assert.ok(w.boss.duration>=.85);assert.ok(Math.abs(w.boss.x-w.player.x)>=250);assert.equal(w.player.y,FLOOR);assert.equal(w.parts.launcher.broken,true);
  for(const type of ['transform-charge','floor-break','underworld-land','overdrive','arena-ready'])assert.equal(w.events.filter(e=>e.type===type).length,1,type);
  assert.ok(w.floor.every(t=>t.state==='intact'));for(let i=0;i<5;i++)w.damageFloor(w.player.x);assert.ok(w.floor.every(t=>t.state==='intact'));
  assert.equal(new World().arena,'plaza');assert.equal(new World().transition,null);
});

test('each Sandevistan lock sounds once before its dash with the full lock interval',()=>{
  const w=safe();w.player.invulnerable=20;w.boss.overdrive=true;w.beginAttack('sandevistan');
  const locks=[],dashes=[];
  for(let i=0;i<1600;i++){
    w.step(1/120);
    for(const e of w.events.splice(0)){if(e.type==='sandi-lock')locks.push(i/120);if(e.type==='sandi-dash')dashes.push(i/120);}
    if(w.boss.phase==='recover')break;
  }
  assert.equal(locks.length,3);assert.equal(dashes.length,3);
  dashes.forEach((time,i)=>assert.ok(time-locks[i]>=.30&&time-locks[i]<=.33));
});

test('shotgun recoil pushes against the aim, settles, and heavy recoil is stronger',()=>{
  const normal=safe(),heavy=safe(),left=safe();left.boss.x=100;
  normal.shoot();heavy.shoot(true);left.shoot();
  advance(normal,.3);advance(heavy,.3);advance(left,.3);
  assert.ok(normal.player.x<300);assert.ok(heavy.player.x<normal.player.x);assert.ok(left.player.x>300);
  assert.ok(Math.abs(heavy.player.kickVelocity)<1);assert.equal(heavy.player.recoil,0);
  assert.equal(normal.player.ammo,5);assert.equal(heavy.player.ammo,4);
});

test('multi-pellet heavy shells generate one contact accent instead of stacked hit stops',()=>{
  const w=safe();w.shoot(true);advance(w,.45);
  const hits=w.events.filter(e=>e.type==='hit');assert.equal(hits.length,1);assert.equal(hits[0].heavy,true);assert.ok(w.boss.hp<w.boss.maxHp);
});
