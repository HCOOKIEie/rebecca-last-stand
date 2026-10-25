const {test}=require('node:test');
const assert=require('node:assert/strict');
const {FLOOR}=require('../engine.js');
const {SmasherWorld,SMASHER_ABILITIES}=require('../smasher-mode.js');
const advance=(w,s,input={})=>{for(let i=0;i<Math.round(s*120);i++)w.step(1/120,typeof input==='function'?input(w,i):input);};
class StationaryOpponent extends SmasherWorld { makeAIInput(){return {};} }

test('Smasher starts under human control, with full arsenal and clean input separation',()=>{
  const w=new SmasherWorld('normal'),x=w.boss.x,p=w.player.x;
  assert.equal(w.gameMode,'smasher');assert.equal(w.boss.phase,'controlledIdle');assert.equal(w.boss.y,FLOOR);
  assert.equal(w.boss.opening,false);assert.equal(w.boss.transformPending,false);
  assert.equal(w.player.hp,10);assert.equal(w.boss.hp,4000);
  advance(w,.4,{left:true});assert.ok(w.boss.x<x-40);assert.equal(w.player.x,p);
  assert.deepEqual(w.availableAttacks(),['cannon','barrage','stomp','rush','sandevistan']);
  assert.equal(w.events.filter(e=>e.type==='attack').length,0);
});

test('idle and recovery never start autonomous attacks, even after a long wait',()=>{
  const w=new StationaryOpponent();advance(w,30);
  assert.equal(w.boss.phase,'controlledIdle');assert.equal(w.events.filter(e=>e.type==='attack').length,0);
  w.recover(.2);advance(w,1);assert.equal(w.boss.phase,'controlledIdle');
  assert.equal(w.events.filter(e=>e.type==='attack').length,0);
});

test('each action input activates its real attack and has an independent cooldown',()=>{
  const phases={cannon:'cannonAim',barrage:'barrageWindup',stomp:'windup',rush:'rushWindup',sandevistan:'sandiWindup'};
  for(const a of SMASHER_ABILITIES.filter(a=>a.id!=='guard')){
    const w=new StationaryOpponent();w.step(1/120,{[a.input]:true});
    assert.equal(w.boss.phase,phases[a.id]);assert.equal(w.boss.attack,a.id);
    assert.ok(w.abilityCooldowns[a.id]>0);assert.equal(w.activateAbility(a.id),false);
    assert.ok(Object.entries(w.abilityCooldowns).every(([key,cd])=>key===a.id||cd===0));
  }
});

test('cannon deals damage only after its warning and actual projectile travel',()=>{
  const w=new StationaryOpponent();w.boss.x=400;w.player.x=620;
  w.step(1/120,{shoot:true});advance(w,.8);
  assert.equal(w.player.hp,10);assert.equal(w.enemyShots.length,0);
  advance(w,.18);assert.ok(w.enemyShots.length>0);assert.equal(w.player.hp,10);
  advance(w,.6);assert.ok(w.player.hp<10);assert.ok(w.score>=600);
});

test('held action cannot bypass recovery or its cooldown',()=>{
  const w=new StationaryOpponent();w.player.invulnerable=100;
  advance(w,2.5,{shoot:true});assert.equal(w.events.filter(e=>e.type==='attack'&&e.attack==='cannon').length,1);
  advance(w,1,{shoot:true});assert.equal(w.events.filter(e=>e.type==='attack'&&e.attack==='cannon').length,2);
  assert.ok(w.abilityCooldowns.cannon>0);
});

test('AI has startup grace, then moves, reloads and damages armor through real shots',()=>{
  const w=new SmasherWorld(),hp=w.boss.hp,p=w.player.x;
  advance(w,1.5);assert.equal(w.boss.hp,hp);assert.equal(w.player.x,p);assert.equal(w.shots.length,0);
  advance(w,8);assert.ok(w.boss.hp<hp);assert.ok(w.events.some(e=>e.type==='shoot'||e.type==='heavy'));
  assert.ok(w.events.some(e=>e.type==='reload'));assert.ok(w.player.x!==p);
  assert.equal(w.score,0);
});

test('AI sees visible windup after a reaction delay, and cannot read human input in advance',()=>{
  const w=new SmasherWorld('normal',11);w.time=2;w.boss.x=450;w.player.x=500;
  w.ai.evade=true;w.ai.phase='controlledIdle';w.humanInput={dash:true};
  const before=w.makeAIInput(1/120);assert.equal(before.jump,false);assert.equal(before.dash,false);
  w.activateAbility('rush');w.ai.think=0;
  const observed=w.makeAIInput(1/120);assert.equal(observed.jump,false);assert.equal(observed.dash,false);
  assert.ok(w.ai.notice<w.aiConfig.reaction);
});

test('armor guard reduces physical shot damage, expires and cannot be refreshed early',()=>{
  const w=new StationaryOpponent(),plain=new StationaryOpponent();
  const shot={damage:100,x:715,y:380,id:1};
  w.step(1/120,{reload:true});assert.ok(w.guardRemaining>.8);assert.equal(w.activateAbility('guard'),false);
  const hp=w.boss.hp;w.damageBoss(shot);plain.damageBoss(shot);
  assert.ok(Math.abs((hp-w.boss.hp)/(plain.boss.maxHp-plain.boss.hp)-.2)<1e-8);
  advance(w,1);assert.equal(w.guardRemaining,0);assert.ok(w.abilityCooldowns.guard>0);
  assert.equal(w.activateAbility('guard'),false);advance(w,4.1);assert.equal(w.activateAbility('guard'),true);
});

test('guard blocks attack startup then releases held attacks without resetting cooldowns',()=>{
  const w=new StationaryOpponent();w.step(1/120,{reload:true});
  advance(w,.7,{shoot:true});assert.equal(w.boss.phase,'controlledIdle');assert.equal(w.abilityCooldowns.cannon,0);
  advance(w,.2,{shoot:true});assert.equal(w.guardRemaining,0);assert.equal(w.boss.phase,'cannonAim');
  assert.ok(w.abilityCooldowns.guard>4);assert.ok(w.abilityCooldowns.cannon>2.5);
  assert.equal(w.events.filter(e=>e.type==='attack').length,1);
});

test('guard contact audio is once per shell and rate-limited for overlapping shells',()=>{
  const w=new StationaryOpponent();w.activateAbility('guard');
  for(let i=0;i<9;i++)w.damageBoss({damage:10,x:715,y:350,id:1});
  assert.equal(w.events.filter(e=>e.type==='armor-block').length,1);
  w.damageBoss({damage:10,x:715,y:350,id:2});assert.equal(w.events.filter(e=>e.type==='armor-block').length,1);
  advance(w,.1);w.damageBoss({damage:10,x:715,y:350,id:3});assert.equal(w.events.filter(e=>e.type==='armor-block').length,2);
});

test('controlled movement respects both bounds, facing and attack recovery',()=>{
  const w=new StationaryOpponent();advance(w,5,{left:true});assert.equal(w.boss.x,65);assert.equal(w.boss.facing,-1);
  advance(w,5,{right:true});assert.equal(w.boss.x,895);assert.equal(w.boss.facing,1);assert.ok(w.boss.walk>0);
  w.recover(.2);advance(w,.15,{left:true});assert.equal(w.boss.x,895);
  advance(w,.3,{left:true});assert.equal(w.boss.phase,'controlledIdle');assert.ok(w.boss.x<895);assert.equal(w.boss.facing,-1);
});

test('human victory is a terminal Rebecca defeat without Lucy or duplicate loss events',()=>{
  const w=new StationaryOpponent();w.player.hp=1;w.player.x=520;w.boss.x=400;
  advance(w,2,{shoot:true});assert.equal(w.status,'won');assert.equal(w.player.hp,0);
  assert.ok(w.death);assert.ok(w.smasherVictory);assert.equal(w.victory,null);
  assert.equal(w.boss.phase,'controlledVictory');assert.equal(w.events.filter(e=>e.type==='won').length,1);
  assert.equal(w.events.filter(e=>e.type==='lost').length,0);
  assert.equal(w.waves.length+w.missiles.length+w.enemyShots.length+w.shots.length,0);
  const time=w.time,hp=w.boss.hp,score=w.score;advance(w,3,{shoot:true});w.updateEffects(2);
  assert.equal(w.time,time);assert.equal(w.boss.hp,hp);assert.equal(w.score,score);assert.ok(w.smasherVictory.age>=2);
});

test('empty human armor loses with a kneeling Smasher; no Rebecca finisher is armed',()=>{
  const w=new StationaryOpponent();w.damageBoss({damage:100000,x:715,y:350});
  assert.equal(w.status,'lost');assert.equal(w.boss.hp,0);assert.equal(w.boss.phase,'kneel');
  assert.equal(w.victory,null);assert.equal(w.downed,null);assert.equal(w.execution,null);
  assert.equal(w.events.filter(e=>e.type==='lost').length,1);assert.equal(w.events.filter(e=>e.type==='won').length,0);
  const age=w.boss.age;w.updateEffects(.5);assert.ok(w.boss.age>age);
  w.damageBoss({damage:100,x:715,y:350});assert.equal(w.events.filter(e=>e.type==='lost').length,1);
});

test('airborne human defeat falls continuously and the living AI lands before settling',()=>{
  const w=new StationaryOpponent();w.boss.y=207;w.player.y=FLOOR-80;w.player.vy=-100;
  w.damageBoss({damage:100000,x:715,y:120});assert.equal(w.status,'lost');assert.equal(w.boss.y,207);assert.ok(w.terminalFall);
  const time=w.time,score=w.score;w.updateEffects(.1);assert.ok(w.boss.y>207&&w.boss.y<FLOOR);assert.equal(w.boss.age,0);
  for(let i=0;i<180;i++)w.updateEffects(1/120);
  assert.equal(w.boss.y,FLOOR);assert.equal(w.boss.phase,'kneel');assert.equal(w.terminalFall,null);
  assert.equal(w.player.y,FLOOR);assert.ok(w.boss.age>.6);assert.equal(w.time,time);assert.equal(w.score,score);
});

test('a projectile victory during a leap keeps Smasher airborne until his natural landing',()=>{
  const w=new StationaryOpponent();w.boss.y=260;w.player.hp=1;w.hurt('cannon');
  assert.equal(w.status,'won');assert.equal(w.boss.y,260);assert.ok(w.terminalFall);
  for(let i=0;i<120;i++)w.updateEffects(1/120);
  assert.equal(w.boss.y,FLOOR);assert.equal(w.boss.phase,'controlledVictory');assert.equal(w.victory,null);
  assert.equal(w.events.filter(e=>e.type==='won').length,1);
});

test('an AI wave dodge never adds points to the human Smasher score',()=>{
  const w=new StationaryOpponent();w.player.dash=.1;w.player.dashDir=1;
  w.waves.push({x:w.player.x+7,vx:0,life:1,age:0,hit:false});w.step(1/120);
  assert.equal(w.waves[0].hit,true);assert.equal(w.player.hp,w.maxHp);assert.equal(w.score,0);
});

test('difficulty strengthens AI; custom armor, pace and warnings remain effective',()=>{
  let hp=0,reaction=1,damage=0;
  for(const d of ['easy','normal','hard','nightmare']){
    const w=new SmasherWorld(d);assert.ok(w.player.hp>hp);assert.ok(w.aiConfig.reaction<reaction);assert.ok(w.aiConfig.damage>damage);
    hp=w.player.hp;reaction=w.aiConfig.reaction;damage=w.aiConfig.damage;
  }
  const w=new SmasherWorld('normal',8,{bossHp:1800,pace:1.4,warning:1.5,arsenal:'basic'});
  assert.equal(w.boss.hp,1800);assert.equal(w.config.pace,1.4);w.activateAbility('cannon');assert.equal(w.boss.duration,1.35);
  assert.ok(w.availableAttacks().includes('barrage'));assert.ok(w.availableAttacks().includes('sandevistan'));
});

test('seeded opponent behavior is repeatable and retry resets resources and endings',()=>{
  const a=new SmasherWorld('normal',12),b=new SmasherWorld('normal',12);
  for(let i=0;i<1800;i++){const input={shoot:i%600===0,dash:i%600===300};a.step(1/120,input);b.step(1/120,input);}
  assert.equal(a.player.x,b.player.x);assert.equal(a.boss.hp,b.boss.hp);assert.equal(a.player.hp,b.player.hp);
  a.defeatBoss();const fresh=new SmasherWorld('normal',12);
  assert.equal(fresh.status,'playing');assert.equal(fresh.boss.hp,4000);assert.equal(fresh.player.hp,10);
  assert.equal(fresh.death,null);assert.equal(fresh.smasherVictory,null);assert.ok(Object.values(fresh.abilityCooldowns).every(cd=>cd===0));
});

test('standard human Smasher can defeat the live AI through actual controlled abilities',()=>{
  const w=new SmasherWorld('normal',2076),used=new Set();
  for(let i=0;i<120*100&&w.status==='playing';i++){
    w.step(1/120,{shoot:true,heavy:true,jump:true,dash:true,cycleTarget:true,reload:w.boss.phase==='recover',left:w.boss.x>w.player.x+300,right:w.boss.x<w.player.x-300});
    for(const e of w.events.splice(0))if(e.type==='smasher-ability')used.add(e.ability);
  }
  assert.equal(w.status,'won',JSON.stringify({time:w.time,armor:w.boss.hp,opponent:w.player.hp}));
  assert.ok(w.boss.hp>0&&w.boss.hp<w.boss.maxHp);assert.ok(w.time>20&&w.time<100);
  assert.ok(used.size>=3);assert.equal(w.player.hp,0);assert.ok(w.death);
});
