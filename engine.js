/* Deterministic combat simulation; coordinates 960 x 540. */
(function (root) {
  'use strict';
  const W = 960, H = 540, FLOOR = 452;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const DIFFICULTIES = Object.freeze({
    easy: Object.freeze({ name:'剧情', rank:0, playerHp:5, bossHp:2500, pace:.8, warning:1.3, arsenal:'basic', supplies:18 }),
    normal: Object.freeze({ name:'标准', rank:1, playerHp:4, bossHp:4000, pace:1, warning:1, arsenal:'full', supplies:22 }),
    hard: Object.freeze({ name:'高危', rank:2, playerHp:3, bossHp:5250, pace:1.15, warning:.85, arsenal:'full', supplies:0 }),
    nightmare: Object.freeze({ name:'噩梦', rank:3, playerHp:1, bossHp:6500, pace:1.3, warning:.72, arsenal:'full', supplies:0 })
  });
  const ATTACK_NAMES = Object.freeze({stomp:'锁定下砸',double:'二连下砸',cannon:'瞄准炮击',rush:'义体冲刺',barrage:'导弹齐射',sandevistan:'斯安威斯坦连击'});
  const TARGET_NAMES = Object.freeze({core:'躯干',launcher:'肩部导弹架',legs:'腿部装甲'});
  function makeConfig(difficulty='normal', tuning={}) {
    if(!tuning||typeof tuning!=='object')tuning={};
    const preset=DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
    const value=(key,min,max)=>Number.isFinite(tuning[key])?clamp(tuning[key],min,max):preset[key];
    return Object.freeze({...preset,bossHp:Math.round(value('bossHp',1000,10000)),pace:value('pace',.65,1.6),warning:value('warning',.65,1.6),arsenal:['basic','full'].includes(tuning.arsenal)?tuning.arsenal:preset.arsenal});
  }
  // Swept bullet collision prevents fast rounds skipping a narrow player hitbox.
  function segmentHitsBox(x1,y1,x2,y2,left,top,right,bottom) {
    let enter=0,exit=1;
    for(const [origin,delta,min,max] of [[x1,x2-x1,left,right],[y1,y2-y1,top,bottom]]){
      if(Math.abs(delta)<1e-8){if(origin<min||origin>max)return false;continue;}
      let a=(min-origin)/delta,b=(max-origin)/delta;if(a>b)[a,b]=[b,a];enter=Math.max(enter,a);exit=Math.min(exit,b);if(enter>exit)return false;
    }
    return true;
  }
  class World {
    constructor(difficulty = 'normal', seed = 2076, tuning = {}) {
      this.difficulty = Object.hasOwn(DIFFICULTIES,difficulty)?difficulty:'normal'; this.config=makeConfig(this.difficulty,tuning); this.seed = seed >>> 0;
      this.time = 0; this.status = 'playing'; this.score = 0; this.dodges = 0; this.combo = 0; this.phase = 0;
      this.maxHp = this.config.playerHp;
      this.player = { x: 300, y: FLOOR, prevX: 300, prevY: FLOOR, vy: 0, vx: 0, facing: 1, dashDir: 1, hp: this.maxHp, invulnerable: 0, dash: 0, dashCd: 0, shotCd: 0, anim: 0, recoil: 0, ammo: 6, maxAmmo: 6, reload: 0, counter: 0, muzzle: 0, aim: 0, heavy: false };
      const maxHp = this.config.bossHp;
      const openingDuration=Math.max(1.9,.8+1.35*this.config.warning);
      this.boss = { x: 300, y: 300, prevX: 300, prevY: 300, target: 300, phase: 'target', age: 0, duration: openingDuration, lockWindow:Math.max(.65,.55*this.config.warning), hoverY:300, opening:true, locked: false, stagger: 0, shotCount: 0, hp: maxHp, maxHp, attack:'stomp', attackIndex:1, facing:-1, comboLeft:0, comboTotal:1, volley:0, attackDodged:false };
      for (const key of ['waves','missiles','enemyShots','bossTrails','particles','trails','shots','pickups','cracks','events','rings','numbers']) this[key] = [];
      this.nextPickup = this.config.supplies || Infinity; this.camera = 0; this.flash = 0; this.hitStop = 0;
      this.death=null;this.victory=null;this.shotSerial=0;
      Object.assign(this.player,{target:'core',comboTimer:0,comboLabel:'',falling:0,kickVelocity:0});
      Object.assign(this.boss,{overdrive:false,transformPending:false,interruptCd:0,sandiLeft:0});
      this.parts={launcher:{hp:maxHp*.16,maxHp:maxHp*.16,broken:false},legs:{hp:maxHp*.2,maxHp:maxHp*.2,broken:false}};
      this.floor=Array.from({length:12},(_,i)=>({x:i*80+40,index:i,damage:0,state:'intact',timer:0,age:0,anchored:i===0||i===11}));
      this.scrap=[];this.arena='plaza';this.transition=null;this.hitSparks=[];this.lastHitShot=0;this.gunCamera=0;
      this.gameMode='rebecca';this.downed=null;this.execution=null;
    }
    random() { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296; }
    event(type, extra = {}) { this.events.push({ type, ...extra }); }
    burst(x, y, count, color, speed = 160) {
      for (let i = 0; i < count; i++) {
        const a = this.random() * Math.PI * 2, v = (.3 + this.random() * .7) * speed;
        this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 50, life: .25 + this.random() * .55, size: 1 + Math.floor(this.random() * 4), color });
      }
    }
    hurt(source) {
      const p = this.player;
      if (this.status !== 'playing' || this.transition || this.downed || p.invulnerable > 0 || p.dash > 0 || p.falling>0&&source!=='collapse') return false;
      p.hp--; p.invulnerable = 1.5; this.combo = 0; this.camera = 8; this.flash = .12;
      this.burst(p.x, p.y - 45, 24, '#ff4a68'); this.event('hurt', { source });
      if (p.hp <= 0) { this.status = 'lost'; this.crushDeath(source); this.event('lost'); }
      return true;
    }
    crushDeath(source) {
      if(this.death)return;
      const p=this.player;
      const d=this.death={x:p.x,y:FLOOR,age:0,source,fragments:[],stains:[],outline:[],rivulets:[]};
      p.hp=0;p.vx=0;p.vy=0;p.dash=0;p.muzzle=0;p.recoil=0;
      this.trails=[];this.shots=[];this.enemyShots=[];this.missiles=[];this.pickups=[];this.bossTrails=[];
      this.camera=Math.max(this.camera,14);this.flash=Math.max(this.flash,.12);
      for(let i=0;i<28;i++){
        const angle=i/28*Math.PI*2;
        d.outline.push({x:Math.cos(angle)*(48+this.random()*18),y:Math.sin(angle)*(10+this.random()*8)});
      }
      for(let i=0;i<11;i++){
        const dir=i%2?-1:1;
        d.rivulets.push({x:dir*(40+this.random()*57),y:3+this.random()*24,width:1+Math.floor(this.random()*3)});
      }
      const spawn=(kind,count,size,color)=>{
        for(let i=0;i<count;i++){
          const horizontal=(this.random()-.5)*(kind==='blood'?640:kind==='guts'?150:310);
          d.fragments.push({kind,x:p.x+(this.random()-.5)*20,y:p.y-25-this.random()*32,vx:horizontal,vy:-60-this.random()*220,ground:FLOOR+4+this.random()*18,size:size*(.7+this.random()*.65),color,angle:this.random()*6.28,spin:(this.random()-.5)*13,rest:false,bounced:false});
        }
      };
      spawn('blood',52,2.7,'#b82c47');spawn('flesh',18,7.5,'#a62a42');
      spawn('fabric',5,8,'#192536');spawn('hair',4,6,'#8fe5c7');
      spawn('chrome',2,8,'#df5893');spawn('chrome',2,7,'#73bdcf');spawn('guts',1,10,'#8cd9bd');
      this.event('crush');
    }
    updateDeath(dt) {
      const d=this.death;if(!d)return;
      d.age=Math.min(60,d.age+dt);
      for(const f of d.fragments){
        if(f.rest)continue;
        f.vy+=930*dt;f.x=clamp(f.x+f.vx*dt,-10,W+10);f.y+=f.vy*dt;f.angle+=f.spin*dt;
        if(f.y>=f.ground){
          f.y=f.ground;
          if(f.kind==='blood'){
            d.stains.push({x:f.x,y:f.ground,w:3+f.size*2,h:1+f.size*.6,color:f.color});f.rest=true;
          }else if(!f.bounced&&f.vy>170){f.vy=-f.vy*.16;f.vx*=.42;f.spin*=.25;f.bounced=true;}
          else{f.rest=true;f.vx=0;f.vy=0;f.angle=f.kind==='guts'?-.13:f.angle;}
        }
      }
    }
    perfect() {
      this.dodges++; this.combo++; this.score += 250 + Math.min(5, this.combo) * 50;
      this.player.counter = 2.4; this.event('perfect'); this.burst(this.player.x, this.player.y - 35, 20, '#59fff0');
    }
    jump() { const p = this.player; if (p.y === FLOOR) { p.vy = -440; this.event('jump'); this.burst(p.x, FLOOR, 7, '#8ca6c5', 65); } }
    dash(direction) {
      const p = this.player; if (p.dashCd > 0) return;
      p.dashDir = direction || p.facing; p.facing = p.dashDir; p.dash = .22; p.dashCd = 1.05;
      p.invulnerable = Math.max(p.invulnerable, .25); p.dashWindow = .34; this.event('dash');
    }
    reload() { const p = this.player; if (p.reload > 0 || p.ammo === p.maxAmmo) return; p.reload = 1.35; this.event('reload'); }
    selectTarget(target) {
      if(!Object.hasOwn(TARGET_NAMES,target)||this.parts[target]?.broken)return;
      this.player.target=target;this.event('target-part',{part:target});
    }
    cycleTarget() {
      const available=Object.keys(TARGET_NAMES).filter(k=>!this.parts[k]?.broken),i=available.indexOf(this.player.target);
      this.selectTarget(available[(i+1)%available.length]);
    }
    aimPoint(part=this.player.target) {
      const b=this.boss;
      return part==='launcher'&&!this.parts.launcher.broken?{x:b.x-b.facing*31,y:b.y-130}:part==='legs'&&!this.parts.legs.broken?{x:b.x+b.facing*13,y:b.y-31}:{x:b.x,y:b.y-82};
    }
    damagePart(part,damage) {
      const item=this.parts[part];if(!item||item.broken)return;
      item.hp=Math.max(0,item.hp-damage);
      if(item.hp>0)return;
      const b=this.boss,point=this.aimPoint(part);item.broken=true;
      this.score+=350;this.burst(point.x,point.y,32,'#ffbd66',220);
      this.scrap.push({part,x:point.x,y:point.y,vx:-b.facing*100,vy:-190,angle:0,spin:3,rest:false});
      if(this.player.target===part)this.player.target='core';
      if(part==='legs'&&b.phase==='recover')b.duration+=.65/this.config.pace;
      this.event('part-broken',{part});
    }
    damageFloor(x) {
      // The lower concrete foundation cracks cosmetically; it cannot fall into another level.
      if(this.arena==='undercroft')return;
      for(const tile of this.floor){
        if(tile.anchored||Math.abs(tile.x-x)>62||tile.state==='hole'||tile.state==='bridge'||tile.state==='warning')continue;
        tile.damage=Math.min(3,tile.damage+(this.boss.overdrive?2:1));tile.age=0;
        if(tile.damage>=3){tile.state='warning';tile.timer=1.15;this.event('floor-warning',{x:tile.x});}
        else tile.state='cracked';
      }
    }
    floorAt(x) { return this.floor[clamp(Math.floor(x/80),0,11)]; }
    updateFloor(dt) {
      for(const tile of this.floor){
        tile.age+=dt;
        if(!['warning','hole','bridge'].includes(tile.state))continue;
        tile.timer-=dt;if(tile.timer>0)continue;
        if(tile.state==='warning'){
          tile.state='hole';tile.timer=7;tile.age=0;this.event('floor-collapse',{x:tile.x});this.burst(tile.x,FLOOR,18,'#8fd8ea',160);
        }else if(tile.state==='hole'){tile.state='bridge';tile.timer=8;tile.age=0;this.event('floor-bridge',{x:tile.x});}
        else{tile.state='intact';tile.damage=0;tile.age=0;}
      }
    }
    updateFall(dt) {
      const p=this.player;p.falling+=dt;p.vy+=1180*dt;p.y+=p.vy*dt;
      if(p.falling<.4)return;
      p.invulnerable=0;p.dash=0;this.hurt('collapse');
      if(this.status==='playing'){
        const safe=this.floor.filter(t=>!['warning','hole'].includes(t.state)).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
        p.x=safe.x;p.y=FLOOR;p.prevX=p.x;p.prevY=FLOOR;p.vx=p.vy=0;p.falling=0;this.event('rescued');
      }
    }
    shoot(heavy = false) {
      const p = this.player, b = this.boss, cost = heavy ? 2 : 1;
      if (p.shotCd > 0 || p.reload > 0 || p.falling>0 || this.transition || this.downed || this.status !== 'playing') return;
      if (p.ammo < cost) { this.reload(); return; }
      p.facing = b.x >= p.x ? 1 : -1;
      const origin = { x: p.x + p.facing * 39, y: p.y - (p.dash > 0 ? 25 : p.y<FLOOR-4?51:63) };
      const aim=this.aimPoint();p.aim = Math.atan2(aim.y-origin.y,aim.x-origin.x);
      const slide=p.dash>0&&p.y===FLOOR,air=heavy&&p.y<FLOOR-5,style=air?'air':slide?'slide':'normal';
      const boost=air?1.5:slide?1.35:1,id=++this.shotSerial;
      if(style!=='normal'){
        p.comboLabel=air?'空中重霰弹 ×1.5':'滑铲射击 ×1.35';p.comboTimer=.85;this.event('combat-combo',{style});
        if(air){p.vy=Math.max(-350,p.vy-100);p.vx-=p.facing*65;}
      }
      const counter = p.counter > 0; p.counter = 0;
      p.ammo -= cost; p.shotCd = heavy ? .8 : .42; p.recoil = heavy ? .24 : .16; p.muzzle = .075; p.heavy = heavy;
      p.kickVelocity=-p.facing*(heavy?145:65);this.gunCamera=-p.facing*(heavy?5:2.5);
      this.camera = Math.max(this.camera, heavy ? 4 : 1.8); this.event(heavy ? 'heavy' : 'shoot', { counter });
      const pellets = heavy ? 9 : 6;
      for (let i = 0; i < pellets; i++) {
        const angle = p.aim + (i - (pellets - 1) / 2) * .018;
        this.shots.push({ x: origin.x, y: origin.y, prevX: origin.x, prevY: origin.y, vx: Math.cos(angle) * 1220, vy: Math.sin(angle) * 1220, life: .85, damage: (heavy ? 10 : 8)*boost, counter, heavy,style,id,originX:p.x,target:p.target });
      }
      this.particles.push({ x: p.x, y: p.y - 54, vx: -p.facing * 90, vy: -170, life: .7, size: 3, color: '#ffce69' });
      this.burst(origin.x, origin.y, heavy ? 12 : 7, counter ? '#6effec' : '#ffdc79', 110);
    }
    damageBoss(shot) {
      const b = this.boss; if (b.hp <= 0 || this.transition || this.status !== 'playing') return;
      const weak = b.phase === 'recover', damage = shot.damage * (weak ? 2.4 : 1) * (shot.counter ? 2.5 : 1);
      b.hp = Math.max(0, b.hp - damage); b.stagger = .1; this.score += damage * 2;
      this.damagePart(shot.part,damage);
      if(shot.heavy&&Math.abs((shot.originX??this.player.x)-b.x)<135&&b.interruptCd<=0&&['windup','cannonAim','rushWindup','barrageWindup','sandiWindup'].includes(b.phase)){
        b.interruptCd=4;b.comboLeft=0;b.sandiLeft=0;this.recover(1.4);this.score+=150;this.event('interrupt');this.burst(b.x,b.y-85,25,'#f6f237',180);
      }
      const existing = this.numbers.find(n => n.life > .43 && n.counter === shot.counter);
      if (existing) { existing.value += damage; existing.life = .65; }
      else this.numbers.push({ x: b.x, y: b.y - 143, value: damage, life: .65, counter: shot.counter });
      this.burst(shot.x, shot.y, 5, shot.counter ? '#62fff0' : '#ffcb6a', 170);
      // One contact accent per shell, not nine superimposed flashes/audio cues.
      if (this.hitStop <= 0 && (!shot.id||shot.id!==this.lastHitShot)) {
        this.lastHitShot=shot.id||0;this.event('hit',{heavy:!!shot.heavy,counter:!!shot.counter});this.hitStop=shot.heavy?.06:.035;
        this.hitSparks.push({x:shot.x,y:shot.y,age:0,life:shot.heavy?.18:.12,heavy:!!shot.heavy,counter:!!shot.counter});
        this.camera=Math.max(this.camera,shot.heavy?5:2);
      }
      if (weak && b.shotCount < 10) { b.duration += .012; b.shotCount++; }
      const phase = b.hp / b.maxHp <= .33 ? 2 : b.hp / b.maxHp <= .66 ? 1 : 0;
      if (phase !== this.phase && b.hp > 0) { this.phase = phase; this.event('phase', { phase }); }
      if(b.hp>0&&b.hp<=b.maxHp*.5&&!b.overdrive)b.transformPending=true;
      if (b.hp <= 0) this.defeatBoss();
    }
    defeatBoss(){
      if(this.downed||this.status!=='playing')return;
      const b=this.boss,p=this.player;
      b.hp=0;b.phase='kneel';b.age=0;b.transformPending=false;b.opening=false;b.comboLeft=0;b.sandiLeft=0;
      b.facing=p.x<b.x?-1:1;this.transition=null;
      this.downed={age:0,ready:false,vy:60};this.camera=6;
      this.waves=[];this.missiles=[];this.enemyShots=[];this.bossTrails=[];this.shots=[];this.pickups=[];
      this.floor.forEach(t=>{if(t.state==='hole'||t.state==='warning')Object.assign(t,{state:'bridge',timer:999});});
      if(p.falling>0){p.y=FLOOR;p.prevY=FLOOR;p.vy=0;p.falling=0;}
      this.burst(b.x,b.y-90,24,'#92d9df',150);this.event('boss-downed');
    }
    canExecute(){return !!this.downed?.ready&&!this.execution&&Math.abs(this.player.x-this.boss.x)<=105&&this.player.y>=FLOOR-6;}
    execute(){
      if(!this.canExecute())return false;
      const p=this.player,b=this.boss,side=p.x<b.x?-1:1;
      let targetX=b.x+side*80;if(targetX<35||targetX>W-35)targetX=b.x-side*80;
      this.execution={age:0,impactAt:.65,duration:2.6,hit:false,landed:false,fromX:p.x,toX:targetX};
      b.phase='execute';b.age=0;Object.assign(p,{vx:0,vy:0,dash:0,recoil:0,muzzle:0,reload:0,kickVelocity:0,y:FLOOR});
      p.facing=b.x>=targetX?1:-1;b.facing=-p.facing;this.event('execution-start');return true;
    }
    updateDowned(dt,input){
      const d=this.downed,p=this.player,b=this.boss;d.age+=dt;
      if(b.y<FLOOR){d.vy+=1000*dt;b.y=Math.min(FLOOR,b.y+d.vy*dt);}
      d.ready=d.age>=.9&&b.y===FLOOR;
      for(const key of ['dashCd','dash','invulnerable','recoil','muzzle'])p[key]=Math.max(0,p[key]-dt);
      if(!this.execution){
        b.age=d.age;const dir=(input.right?1:0)-(input.left?1:0);
        if(input.jump)this.jump();if(input.dash)this.dash(dir);
        p.vx=p.dash>0?p.dashDir*630:dir*240;if(dir)p.facing=dir;
        p.x=clamp(p.x+p.vx*dt,25,W-25);p.vy+=1180*dt;p.y=Math.min(FLOOR,p.y+p.vy*dt);if(p.y===FLOOR)p.vy=0;
        p.anim+=dt*(dir?11:2);if(input.interact)this.execute();
        return;
      }
      const e=this.execution;e.age+=dt;b.age=e.age;
      const k=clamp(e.age/.3,0,1);p.x=e.fromX+(e.toX-e.fromX)*(k*k*(3-2*k));p.facing=b.x>=p.x?1:-1;
      if(!e.hit&&e.age>=e.impactAt){
        e.hit=true;p.recoil=.24;p.muzzle=.1;p.heavy=true;
        const headX=b.x+b.facing*14,headY=b.y-107;
        p.aim=Math.atan2(headY-(p.y-63),headX-(p.x+p.facing*39));
        this.camera=9;this.gunCamera=-p.facing*5;
        this.burst(headX,headY,35,'#d7fff1',210);this.burst(headX,headY+8,24,'#ffbd75',140);
        this.hitSparks.push({x:headX,y:headY,age:0,life:.18,heavy:true,counter:true});this.event('execution-shot');
      }
      if(!e.landed&&e.age>=1.86){e.landed=true;this.camera=5;this.burst(b.x,FLOOR-3,24,'#a3afb3',110);this.event('execution-fall');}
      if(e.age>=e.duration)this.completeVictory();
    }
    completeVictory(){
      if(this.status!=='playing')return;
      const b=this.boss,p=this.player;this.downed=null;this.execution=null;this.status='won';b.phase='dead';
      this.waves=[];this.missiles=[];this.enemyShots=[];this.bossTrails=[];this.shots=[];
      this.score+=3000+p.hp*500;this.victory={age:0,pulse:0,commStage:-1};b.age=0;b.y=FLOOR;b.prevY=FLOOR;
      Object.assign(p,{vx:0,vy:Math.max(0,p.vy),dash:0,recoil:0,muzzle:0,reload:0,falling:0,kickVelocity:0});this.event('won');
    }
    impact() {
      const b = this.boss, p = this.player;
      this.camera = 13; this.flash = .045;
      this.burst(b.x, FLOOR, 65, '#9baec9', 270); this.burst(b.x, FLOOR - 8, 28, '#ffc273', 190);
      this.cracks.push({ x: b.x, seed: this.random(), life: 16 }); if (this.cracks.length > 12) this.cracks.shift();
      this.rings.push({ x: b.x, age: 0, life: .6 }); this.event('impact');
      this.damageFloor(b.x);
      const distance = Math.abs(p.x - b.x);
      if (distance < 67 && p.y > FLOOR - 150) { if (p.dash > 0) this.perfect(); else this.hurt('impact'); }
      else if (distance < 145 && p.dashWindow > 0) this.perfect();
      const speed = (180 + this.phase * 24) * Math.sqrt(this.config.pace);
      for (const dir of [-1, 1]) this.waves.push({ x: b.x + dir * 30, origin:b.x, age:0, seed:(this.seed^Math.round(b.x*31+dir*79))>>>0, vx: dir * speed, life: 5, hit: false });
      for(let i=0;i<22;i++){
        const angle=this.random()*Math.PI,speed=95+this.random()*180;
        this.particles.push({kind:'glass',x:b.x,y:FLOOR-3,vx:Math.cos(angle)*speed,vy:-Math.sin(angle)*speed,life:.35+this.random()*.5,size:3+this.random()*5,color:i%3?'#8ab8d8':'#dafbff',angle:this.random()*6.28,spin:(this.random()-.5)*13});
      }
      b.opening=false;
    }
    availableAttacks() {
      const attacks=['stomp','cannon','rush'];
      if(this.config.arsenal==='full'){
        if(this.phase>=1||this.config.rank>=2)attacks.push('barrage');
        if(this.phase>=2||this.config.rank>=3)attacks.push('double');
      }
      if(this.boss.overdrive)attacks.push('sandevistan');
      return attacks;
    }
    beginAttack(kind,positioned=false) {
      const b=this.boss,p=this.player,c=this.config;
      b.attack=kind;b.age=0;b.shotCount=0;b.locked=false;b.attackDodged=false;b.y=FLOOR;b.facing=p.x>=b.x?1:-1;
      b.comboTotal=kind==='double'?2:1;b.comboLeft=b.comboTotal-1;
      if(!positioned&&['cannon','barrage'].includes(kind)&&Math.abs(b.x-p.x)<180){
        b.phase='reposition';b.pendingAttack=kind;b.fromX=b.x;b.moveTo=clamp(b.x+(p.x<W/2?1:-1)*230,65,895);b.duration=.38/c.pace;this.event('reposition');return;
      }
      this.event('attack',{attack:kind});
      if(kind==='stomp'||kind==='double'){b.phase='windup';b.duration=.3/c.pace;}
      if(kind==='cannon'){b.phase='cannonAim';b.duration=.9*c.warning;b.aimX=p.x;b.aimY=p.y-40;b.volley=0;}
      if(kind==='rush'){b.phase='rushWindup';b.duration=.8*c.warning;b.rushEnd=clamp(p.x+b.facing*170,65,895);b.rushHit=false;}
      if(kind==='barrage'){b.phase='barrageWindup';b.duration=.65*c.warning;b.target=p.x;b.launch=.8;}
      if(kind==='sandevistan'){b.sandiLeft=3;this.sandiWindup(true);}
    }
    sandiWindup(first=false) {
      const b=this.boss,p=this.player;b.phase='sandiWindup';b.age=0;b.duration=Math.max(first?.85:.55,(first?1.15:.72)*this.config.warning);b.locked=false;b.attackDodged=false;
      b.facing=p.x>=b.x?1:-1;b.rushEnd=clamp(p.x+b.facing*155,65,895);b.trailClock=0;this.event('sandi-warning',{remaining:b.sandiLeft});
    }
    transform() {
      const b=this.boss,p=this.player;b.transformPending=false;b.overdrive=true;b.phase='transform';b.age=0;b.duration=5.4;b.y=FLOOR;b.comboLeft=0;
      const landBossX=clamp(b.x,200,760),side=p.x<b.x?-1:p.x>b.x?1:b.x<480?1:-1;
      let landPlayerX=clamp(landBossX+side*330,65,895);
      if(Math.abs(landPlayerX-landBossX)<250)landPlayerX=landBossX+(landBossX<480?330:-330);
      this.transition={age:0,duration:5.4,breakAt:1.15,landAt:2.75,bossX:b.x,playerX:p.x,playerY:p.y,landBossX,landPlayerX};
      Object.assign(p,{vx:0,vy:0,dash:0,falling:0,recoil:0,muzzle:0,kickVelocity:0});
      this.waves=[];this.missiles=[];this.enemyShots=[];this.shots=[];this.bossTrails=[];this.trails=[];this.camera=3;this.event('transform-charge');
    }
    updateTransition(dt){
      const t=this.transition,b=this.boss,p=this.player,prior=t.age;t.age+=dt;b.age=t.age;
      const crossed=when=>prior<when&&t.age>=when;
      if(crossed(t.breakAt)){
        t.broken=true;this.camera=17;this.event('floor-break');
        this.burst(b.x,FLOOR,40,'#a7c5cb',270);this.rings.push({x:b.x,age:0,life:.6});
      }
      const progress=clamp((t.age-t.breakAt)/(t.landAt-t.breakAt),0,1),ease=progress*progress*(3-2*progress);
      b.x=t.bossX+(t.landBossX-t.bossX)*ease;p.x=t.playerX+(t.landPlayerX-t.playerX)*ease;
      p.y=t.playerY+(FLOOR-t.playerY)*clamp(t.age/.8,0,1);
      if(crossed(t.landAt)){
        this.arena='undercroft';this.floor.forEach(tile=>Object.assign(tile,{damage:0,state:'intact',timer:0,age:0}));
        this.cracks=[];this.scrap=[];this.pickups=[];this.particles=[];this.rings=[];
        p.y=FLOOR;p.prevY=FLOOR;this.camera=9;this.event('underworld-land');
        this.burst(b.x,FLOOR,32,'#b8b5a7',160);this.burst(p.x,FLOOR,12,'#9daba8',80);
      }
      if(crossed(3.05))this.event('overdrive');
      if(t.age>=t.duration){
        this.transition=null;p.invulnerable=Math.max(p.invulnerable,.45);p.dashCd=0;p.shotCd=0;
        b.prevX=b.x;p.prevX=p.x;p.prevY=p.y;this.beginAttack('sandevistan');this.event('arena-ready');
      }
    }
    nextAttack() {
      const b=this.boss,sequence=['stomp','cannon','rush','stomp','barrage','rush','cannon','double'];
      let kind=sequence[b.attackIndex++%sequence.length];
      if(b.overdrive&&b.attackIndex%3===0)kind='sandevistan';
      if(!this.availableAttacks().includes(kind))kind=kind==='barrage'?'cannon':'stomp';
      this.beginAttack(kind);
    }
    recover(duration=1.4) { const b=this.boss;b.phase='recover';b.age=0;b.duration=(duration+(this.parts.legs.broken?.65:0))/this.config.pace;b.y=FLOOR;b.shotCount=0; }
    fireCannon() {
      const b=this.boss,c=this.config,x=b.x+b.facing*46,y=b.y-91;
      const angle=Math.atan2(b.aimY-y,b.aimX-x)+(b.volley%2?-.025:.025);
      const speed=420*Math.sqrt(c.pace);
      this.enemyShots.push({x,y,prevX:x,prevY:y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:2.8});
      b.volley++;b.launch=.12;this.burst(x,y,5,'#ff9a58',80);this.event('cannon');
    }
    launchBarrage() {
      const b=this.boss,count=this.parts.launcher.broken?1:this.config.rank>=2?5:3,centers=[];
      for(let i=0;i<count;i++){
        const x=clamp(b.target+(i-(count-1)/2)*110,45,915);
        if(centers.some(v=>Math.abs(v-x)<60))continue;centers.push(x);
        const fuse=1.15*this.config.warning+i*.12/this.config.pace;
        this.missiles.push({x,age:0,fuse,radius:30,life:fuse+.35,exploded:false});
      }
      b.launch=.6;this.event('missile');
    }
    updateBoss(dt) {
      const b = this.boss, p = this.player,c=this.config; b.age += dt; b.stagger = Math.max(0, b.stagger - dt); b.launch = Math.max(0, (b.launch || 0) - dt);
      b.interruptCd=Math.max(0,b.interruptCd-dt);
      if(b.transformPending&&!b.opening&&b.y>=FLOOR-1&&!['drop','target','leap'].includes(b.phase)){this.transform();return;}
      if(b.phase==='transform'){if(b.age>=b.duration)this.beginAttack('sandevistan');return;}
      if(b.phase==='sandiWindup'){
        if(b.age<b.duration-.32){b.facing=p.x>=b.x?1:-1;b.rushEnd=clamp(p.x+b.facing*155,65,895);}else if(!b.locked){b.locked=true;this.event('sandi-lock',{remaining:b.sandiLeft});}
        if(b.age>=b.duration){b.rushStart=b.x;b.phase='sandiRush';b.age=0;b.rushHit=false;b.duration=Math.abs(b.rushEnd-b.x)/(1280*Math.sqrt(c.pace));this.event('sandi-dash');}
        return;
      }
      if(b.phase==='sandiRush'){
        const from=b.x,step=1280*Math.sqrt(c.pace)*dt;b.x+=clamp(b.rushEnd-b.x,-step,step);
        b.trailClock+=dt;if(b.trailClock>=.05){b.trailClock-=.05;this.bossTrails.push({x:b.x,y:b.y,facing:b.facing,life:.36,sandi:true});}
        if(!b.rushHit&&p.x>Math.min(from,b.x)-50&&p.x<Math.max(from,b.x)+50&&p.y>FLOOR-64){b.rushHit=true;if(p.dash>0){this.perfect();b.attackDodged=true;}else this.hurt('rush');}
        if(b.age>=b.duration||Math.abs(b.x-b.rushEnd)<1){b.sandiLeft--;if(b.sandiLeft>0)this.sandiWindup();else this.recover(1.75);}
        return;
      }
      if (b.phase === 'recover' && b.age >= b.duration) {
        if(b.comboLeft>0){b.comboLeft--;b.phase='windup';b.age=0;b.duration=.22/c.pace;this.event('combo');}
        else this.nextAttack();
      }
      else if(b.phase==='reposition'){
        const t=clamp(b.age/b.duration,0,1);b.x=b.fromX+(b.moveTo-b.fromX)*(1-(1-t)**2);b.y=FLOOR-Math.sin(t*Math.PI)*36;
        if(b.age>=b.duration)this.beginAttack(b.pendingAttack,true);
      }
      else if (b.phase === 'windup' && b.age >= b.duration) {
        b.phase = 'leap'; b.age = 0; b.duration = .48/c.pace; b.fromX = b.x; b.target = p.x;
        this.burst(b.x, FLOOR, 20, '#a1c2d8'); this.event('leap');
      } else if (b.phase === 'leap') {
        const t = clamp(b.age / b.duration, 0, 1);
        b.y = FLOOR - 245 * (1 - (1 - t) ** 3); b.x = b.fromX + (b.target - b.fromX) * t;
        if (b.age >= b.duration) { b.phase = 'target'; b.age = 0;b.hoverY=207;b.lockWindow=.48*c.warning; b.duration = (.77-this.phase*.08)/c.pace+b.lockWindow; b.locked = false; b.shotCount = 0; this.event('target'); }
      } else if (b.phase === 'target') {
        if (b.age < b.duration - (b.lockWindow || .48*c.warning)) b.target += (p.x - b.target) * Math.min(1, dt * 7);
        else if (!b.locked) { b.locked = true; this.event('lock'); }
        b.x = b.target; b.y = (b.hoverY||207) + Math.sin(b.age * 5) * 4;
        if (b.age >= b.duration) { b.phase = 'drop'; b.age = 0;b.dropFrom=b.y; b.duration = (.3-this.phase*.015)/c.pace; this.event('drop'); }
      } else if (b.phase === 'drop') {
        const from=b.dropFrom||207;b.y = from + (FLOOR - from) * Math.min(1, b.age / b.duration) ** 2.3;
        if (b.age >= b.duration) { this.recover(b.comboLeft>0?.48:1.65-this.phase*.12); this.impact(); }
      } else if(b.phase==='cannonAim'){
        if(b.age<b.duration-.3*c.warning){b.aimX=p.x;b.aimY=p.y-40;b.facing=p.x>=b.x?1:-1;}
        else b.locked=true;
        if(b.age>=b.duration){b.phase='cannonFire';b.age=0;b.duration=.75/c.pace;this.fireCannon();}
      } else if(b.phase==='cannonFire'){
        const count=3+(c.rank>=2?1:0)+(this.phase===2?1:0);
        if(b.volley<count&&b.age>=b.volley*.15/c.pace)this.fireCannon();
        if(b.age>=b.duration)this.recover(1.25);
      } else if(b.phase==='rushWindup'){
        if(b.age<b.duration-.34*c.warning){b.facing=p.x>=b.x?1:-1;b.rushEnd=clamp(p.x+b.facing*170,65,895);}
        else b.locked=true;
        if(b.age>=b.duration){b.phase='rush';b.age=0;b.duration=Math.abs(b.rushEnd-b.x)/(850*c.pace);this.event('rush');}
      } else if(b.phase==='rush'){
        const from=b.x,step=850*c.pace*dt;
        b.x+=clamp(b.rushEnd-b.x,-step,step);
        this.bossTrails.push({x:b.x,y:b.y,facing:b.facing,life:.16});
        if(!b.rushHit&&p.x>Math.min(from,b.x)-52&&p.x<Math.max(from,b.x)+52&&p.y>FLOOR-64){
          b.rushHit=true;if(p.dash>0){this.perfect();b.attackDodged=true;}else this.hurt('rush');
        }
        if(b.age>=b.duration||Math.abs(b.x-b.rushEnd)<1)this.recover(1.4);
      } else if(b.phase==='barrageWindup'){
        if(b.age>=b.duration){b.phase='barrageFire';b.age=0;b.duration=1.15*c.warning+.6/c.pace;this.launchBarrage();}
      } else if(b.phase==='barrageFire'&&b.age>=b.duration){this.recover(1.1);}
    }
    updateEffects(dt) {
      this.updateDeath(dt);
      if(this.victory){
        const v=this.victory;v.age+=dt;this.boss.age=v.age;
        const p=this.player;if(p.y<FLOOR){p.vy+=1180*dt;p.y=Math.min(FLOOR,p.y+p.vy*dt);if(p.y===FLOOR)p.vy=0;}
        if(v.age<2.7){v.pulse+=dt;if(v.pulse>.11){v.pulse=0;this.burst(this.boss.x+this.boss.facing*22+(this.random()-.5)*65,FLOOR-14-this.random()*18,4,v.age<1.2?'#80fff0':'#ffab59',65);}}
        const stage=v.age<4?-1:v.age<7?0:v.age<10.5?1:v.age<13.5?2:3;
        if(stage!==v.commStage){v.commStage=stage;if(stage>=0)this.event('comm');}
      }
      for(const s of this.scrap){if(s.rest)continue;s.vy+=800*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.angle+=s.spin*dt;if(s.y>=FLOOR+9){s.y=FLOOR+9;s.rest=true;}}
      if(this.status!=='playing'){
        for(const w of this.waves){w.x+=w.vx*dt;w.age=(w.age||0)+dt;w.life-=dt;}
        this.waves=this.waves.filter(w=>w.life>0&&w.x>-80&&w.x<W+80);
      }
      for (const q of this.particles) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 450 * dt;if(q.kind==='glass')q.angle+=q.spin*dt; }
      this.particles = this.particles.filter(q => q.life > 0);
      for (const key of ['trails', 'bossTrails', 'cracks', 'rings', 'numbers','hitSparks']) {
        for (const item of this[key]) { item.life -= dt; if ('age' in item) item.age += dt; if (key === 'numbers') item.y -= dt * 20; }
        this[key] = this[key].filter(item => item.life > 0);
      }
      this.camera = Math.max(0, this.camera - dt * 36); this.flash = Math.max(0, this.flash - dt);
      this.gunCamera*=Math.exp(-dt*25);
    }
    step(dt, input = {}) {
      if (this.status !== 'playing') return;
      dt = clamp(dt, 0, 1 / 30); this.time += dt; this.hitStop = Math.max(0, this.hitStop - dt);
      const p = this.player, b = this.boss;
      p.prevX = p.x; p.prevY = p.y; b.prevX = b.x; b.prevY = b.y;
      if(this.downed){this.time-=dt;this.updateDowned(dt,input);this.updateEffects(dt);return;}
      if(this.transition){this.time-=dt;this.updateTransition(dt);this.updateEffects(dt);return;}
      this.updateFloor(dt);
      for (const key of ['dashCd', 'dash', 'invulnerable', 'shotCd', 'recoil', 'counter', 'muzzle','comboTimer']) p[key] = Math.max(0, p[key] - dt);
      p.dashWindow = Math.max(0, (p.dashWindow || 0) - dt);
      if (p.reload > 0) { p.reload = Math.max(0, p.reload - dt); if (p.reload === 0) { p.ammo = p.maxAmmo; this.event('loaded'); } }
      const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      if(input.target)this.selectTarget(input.target);if(input.cycleTarget)this.cycleTarget();
      if(p.falling>0)this.updateFall(dt);
      else{
      if (input.jump) this.jump(); if (input.dash) this.dash(dir); if (input.reload) this.reload();
      if (dir && p.dash <= 0 && p.recoil <= 0) p.facing = dir;
      if (p.dash > 0) p.vx = p.dashDir * 630;
      else { const target = dir * 240, step = (dir ? 2400 : 4200) * dt; p.vx += clamp(target - p.vx, -step, step); }
      p.x = clamp(p.x + (p.vx+p.kickVelocity) * dt, 25, W - 25);p.kickVelocity*=Math.exp(-dt*18); p.vy += dt * 1180; p.y = Math.min(FLOOR, p.y + p.vy * dt); if (p.y === FLOOR) p.vy = 0;
      p.anim += dt * (Math.abs(p.vx) > 10 ? 11 : 2);
      if (input.heavy) this.shoot(true); else if (input.shoot) this.shoot();
      if (p.ammo === 0 && p.shotCd === 0) this.reload();
      if (p.dash > 0 && Math.floor(this.time * 60) % 2 === 0) this.trails.push({ x: p.x, y: p.y, facing: p.dashDir, life: .22 });
      if(p.y>=FLOOR&&p.dash<=0&&this.floorAt(p.x).state==='hole'){p.falling=.001;p.vy=35;p.vx=0;this.event('fall');}
      }
      if(this.status!=='playing'){this.updateEffects(dt);return;}
      this.updateBoss(dt);
      if(this.transition){this.updateEffects(dt);return;}
      for (const s of this.shots) {
        s.prevX = s.x; s.prevY = s.y; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
        if(s.life<=0)continue;
        const aim=this.aimPoint(s.target),part=s.target!=='core'&&!this.parts[s.target]?.broken?s.target:'core';
        const hit=part==='core'?segmentHitsBox(s.prevX,s.prevY,s.x,s.y,b.x-43,b.y-144,b.x+43,b.y-10):segmentHitsBox(s.prevX,s.prevY,s.x,s.y,aim.x-24,aim.y-19,aim.x+24,aim.y+19);
        if(hit){s.part=part;this.damageBoss(s);s.life=0;}
      }
      this.shots = this.shots.filter(s => s.life > 0);
      if(this.downed){this.updateEffects(dt);return;}
      if (this.status !== 'playing') { this.updateEffects(dt); return; }
      for (const w of this.waves) {
        w.x += w.vx * dt; w.life -= dt;w.age=(w.age||0)+dt;
        if(this.floorAt(w.x).state==='hole'){w.life=0;continue;}
        if (!w.hit && Math.abs(w.x - p.x) < 23 && p.y > FLOOR - 30) {
          if (p.dash > 0) { w.hit = true; this.score += 35; this.burst(p.x, FLOOR - 6, 5, '#a6ffdf'); }
          else if (this.hurt('wave')) w.hit = true;
        }
      }
      this.waves = this.waves.filter(w => w.x > -50 && w.x < W + 50 && w.life > 0);
      for(const s of this.enemyShots){
        s.prevX=s.x;s.prevY=s.y;s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;
        if(segmentHitsBox(s.prevX,s.prevY,s.x,s.y,p.x-17,p.y-80,p.x+17,p.y-4)){
          s.life=0;
          if(p.dash>0&&!b.attackDodged){this.perfect();b.attackDodged=true;}else this.hurt('cannon');
        }
      }
      this.enemyShots=this.enemyShots.filter(s=>s.life>0&&s.x>-40&&s.x<W+40&&s.y>-40&&s.y<H+30);
      if(this.status!=='playing'){this.updateEffects(dt);return;}
      for (const m of this.missiles) {
        m.age += dt;
        if (m.age >= (m.fuse || 1.2) && !m.exploded) {
          m.exploded = true; this.burst(m.x, FLOOR, 26, '#ff9a6e', 180); this.rings.push({ x: m.x, age: 0, life: .4 });
          this.event('explosion'); this.camera = Math.max(this.camera, 5);
          if (Math.abs(m.x - p.x) < (m.radius || 38) && p.y > FLOOR - 65) this.hurt('missile');
        }
      }
      this.missiles = this.missiles.filter(m => m.age < m.life);
      if(this.status!=='playing'){this.updateEffects(dt);return;}
      if (this.time >= this.nextPickup) { this.pickups.push({ x: p.x < 480 ? 765 : 195, life: 12, age: 0 }); this.nextPickup += this.config.supplies; this.event('pickup-spawn'); }
      for (const item of this.pickups) {
        item.life -= dt; item.age += dt;
        if (Math.abs(item.x - p.x) < 25 && p.y > FLOOR - 60) { p.hp = Math.min(this.maxHp, p.hp + 1); item.life = 0; this.burst(p.x, p.y - 20, 16, '#9fffd2'); this.event('heal'); }
      }
      this.pickups = this.pickups.filter(p => p.life > 0); this.updateEffects(dt);
    }
  }
  const api = { World, W, H, FLOOR, clamp, DIFFICULTIES, ATTACK_NAMES,TARGET_NAMES, makeConfig, segmentHitsBox };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LastStand = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
