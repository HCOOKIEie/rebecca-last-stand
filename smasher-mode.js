/* Playable Adam Smasher. The existing combat simulation still owns every hit. */
(function (root) {
  'use strict';
  const base = typeof module !== 'undefined' && module.exports ? require('./engine.js') : root.LastStand;
  const {World, FLOOR, clamp} = base;
  const SMASHER_ABILITIES = Object.freeze([
    Object.freeze({id:'cannon',key:'J',input:'shoot',name:'臂炮连射',cooldown:2.6}),
    Object.freeze({id:'barrage',key:'K',input:'heavy',name:'导弹齐射',cooldown:6.2}),
    Object.freeze({id:'stomp',key:'SPACE',input:'jump',name:'跃起下砸',cooldown:5.4}),
    Object.freeze({id:'rush',key:'SHIFT',input:'dash',name:'义体冲刺',cooldown:4}),
    Object.freeze({id:'sandevistan',key:'Q',input:'cycleTarget',name:'斯安威斯坦',cooldown:11}),
    Object.freeze({id:'guard',key:'R',input:'reload',name:'装甲防御',cooldown:5})
  ]);
  const AI_PRESETS = Object.freeze([
    {hp:8,reaction:.3,dodge:.38,shot:.82,damage:.5},
    {hp:10,reaction:.23,dodge:.56,shot:.64,damage:.7},
    {hp:12,reaction:.17,dodge:.7,shot:.51,damage:.95},
    {hp:14,reaction:.12,dodge:.82,shot:.43,damage:1.2}
  ]);

  class SmasherWorld extends World {
    constructor(difficulty='normal',seed=2076,tuning={}) {
      super(difficulty,seed,tuning);
      this.gameMode='smasher';
      this.aiConfig=AI_PRESETS[this.config.rank];
      this.maxHp=this.aiConfig.hp;
      Object.assign(this.player,{x:245,prevX:245,y:FLOOR,prevY:FLOOR,hp:this.maxHp,facing:1});
      Object.assign(this.boss,{x:715,prevX:715,y:FLOOR,prevY:FLOOR,target:245,phase:'controlledIdle',opening:false,age:0,duration:0,locked:false,overdrive:true,transformPending:false,controlled:true,vx:0,walk:0,guard:0});
      this.abilityCooldowns=Object.fromEntries(SMASHER_ABILITIES.map(a=>[a.id,0]));
      this.guardRemaining=0;
      this.smasherVictory=null;
      this.controlledWinner=false;
      this.controlledScore=0;
      this.terminalFall=null;
      this.lastBlockShot=0;this.nextBlockSound=0;
      this.humanInput={};
      this.nextPickup=Infinity;
      this.ai={think:0,input:{},dir:1,moveTime:0,shotTime:1.5,phase:'',notice:0,evade:false,targetTime:6};
    }

    nextAttack() {
      const b=this.boss;
      b.phase='controlledIdle';b.age=0;b.duration=0;b.y=FLOOR;b.vx=0;b.comboLeft=0;
    }

    availableAttacks() { return SMASHER_ABILITIES.filter(a=>a.id!=='guard').map(a=>a.id); }

    activateAbility(id) {
      const a=SMASHER_ABILITIES.find(item=>item.id===id),b=this.boss;
      if(!a||this.status!=='playing'||this.transition||this.abilityCooldowns[id]>0)return false;
      if(id==='guard'){
        if(!['controlledIdle','recover'].includes(b.phase)||this.guardRemaining>0)return false;
        this.guardRemaining=.85;b.guard=this.guardRemaining;
        this.abilityCooldowns[id]=a.cooldown;
        this.event('smasher-guard');
        this.burst(b.x,b.y-80,12,'#75e7ee',95);
        return true;
      }
      if(b.phase!=='controlledIdle'||this.guardRemaining>0)return false;
      this.abilityCooldowns[id]=a.cooldown;
      b.vx=0;
      this.beginAttack(id,true);
      this.event('smasher-ability',{ability:id});
      return true;
    }

    updateBoss(dt) {
      const b=this.boss;
      for(const id of Object.keys(this.abilityCooldowns))this.abilityCooldowns[id]=Math.max(0,this.abilityCooldowns[id]-dt);
      this.guardRemaining=Math.max(0,this.guardRemaining-dt);b.guard=this.guardRemaining;
      // Every strike needs an input. Recovering never starts the base AI rotation.
      if(b.phase==='controlledIdle'){
        b.age+=dt;b.stagger=Math.max(0,b.stagger-dt);b.interruptCd=Math.max(0,b.interruptCd-dt);
        const dir=(this.humanInput.right?1:0)-(this.humanInput.left?1:0);
        const target=dir*220*Math.sqrt(this.config.pace)*(this.guardRemaining>0?.35:1);
        b.vx+=clamp(target-b.vx,-1700*dt,1700*dt);
        b.x=clamp(b.x+b.vx*dt,65,895);b.y=FLOOR;b.walk+=Math.abs(b.vx)*dt/24;
        if(dir)b.facing=dir;
      }else super.updateBoss(dt);
      if(this.status!=='playing')return;
      // One requested ability per frame, with guard taking precedence.
      const order=['guard','sandevistan','stomp','barrage','rush','cannon'];
      for(const id of order){const a=SMASHER_ABILITIES.find(item=>item.id===id);if(this.humanInput[a.input]&&this.activateAbility(id))break;}
    }

    makeAIInput(dt) {
      const ai=this.ai,p=this.player,b=this.boss,c=this.aiConfig;
      if(this.time<1.5)return {};
      if(ai.phase!==b.phase){
        ai.phase=b.phase;ai.notice=0;ai.evade=this.random()<c.dodge;
      }
      ai.notice+=dt;ai.think-=dt;
      if(ai.think>0)return ai.input;
      ai.think=.065+this.random()*.045;
      ai.moveTime-=.09;
      const away=p.x<b.x?-1:1,distance=Math.abs(p.x-b.x);
      if(ai.moveTime<=0){
        ai.dir=distance<270?away:distance>440?-away:this.random()<.38?0:this.random()<.5?1:-1;
        ai.moveTime=.45+this.random()*.65;
      }
      if(p.x<85)ai.dir=1;if(p.x>875)ai.dir=-1;
      let jump=false,dash=false;
      const reacting=ai.notice>=c.reaction&&ai.evade;
      if(reacting){
        if(['target','drop'].includes(b.phase)&&Math.abs(p.x-b.target)<150){
          ai.dir=p.x>=b.target?1:-1;
          if(p.x<80)ai.dir=1;if(p.x>880)ai.dir=-1;
          dash=b.phase==='drop'||b.locked&&b.duration-b.age<.18;
        }
        if(['rushWindup','sandiWindup','rush','sandiRush'].includes(b.phase)){
          const winding=b.phase.endsWith('Windup'),speed=b.phase.startsWith('sandi')?1280*Math.sqrt(this.config.pace):850*this.config.pace;
          const contact=Math.max(0,(distance-50)/speed)+(winding?Math.max(0,b.duration-b.age):0);
          const crosses=p.x>=Math.min(b.x,b.rushEnd)-50&&p.x<=Math.max(b.x,b.rushEnd)+50;
          jump=crosses&&contact<.31;dash=crosses&&contact<.12&&p.y>FLOOR-60;
        }
        jump||=this.waves.some(q=>{const t=(p.x-q.x)/(q.vx-ai.dir*240);return t>0&&t<.29;});
        jump||=this.enemyShots.some(s=>{const t=(p.x-s.x)/(s.vx-ai.dir*240);return t>0&&t<.25&&s.y+s.vy*t>FLOOR-100;});
        for(const m of this.missiles){
          if(m.exploded||Math.abs(m.x-p.x)>70)continue;
          const time=m.fuse-m.age;if(time<.55)ai.dir=p.x>=m.x?1:-1;if(time<.27)jump=true;
        }
      }
      const ground=this.floorAt(p.x),ahead=this.floorAt(p.x+ai.dir*65);
      if(ground.state==='warning'&&ground.timer<.8){ai.dir=p.x>=ground.x?1:-1;jump=true;}
      if(ahead.state==='hole'||ahead.state==='warning'&&ahead.timer<.6)jump=true;
      if(p.x<55&&ai.dir<0)ai.dir=1;if(p.x>905&&ai.dir>0)ai.dir=-1;
      const fire=this.time>=ai.shotTime;
      let heavy=false;
      if(fire){
        heavy=p.ammo>=2&&(p.counter>0||p.y<FLOOR-30&&this.random()<.48||distance<135&&['windup','cannonAim','rushWindup'].includes(b.phase));
        ai.shotTime=this.time+(heavy?.88:c.shot)+this.random()*.13;
      }
      let target;
      if(this.time>=ai.targetTime){
        ai.targetTime=this.time+5+this.random()*4;
        target=this.config.rank>0&&!this.parts.launcher.broken&&this.random()<.45?'launcher':this.config.rank>1&&!this.parts.legs.broken?'legs':'core';
      }
      ai.input={left:ai.dir<0,right:ai.dir>0,jump:jump&&p.y===FLOOR,dash:dash&&p.dashCd<=0,shoot:fire,heavy,reload:p.ammo<2&&p.reload===0,target};
      return ai.input;
    }

    step(dt,input={}) {
      if(this.status!=='playing')return;
      this.humanInput=input;
      super.step(dt,this.makeAIInput(clamp(dt,0,1/30)));
      this.score=this.controlledScore;
      if(this.status!=='playing'){
        this.waves=[];this.missiles=[];this.enemyShots=[];this.shots=[];this.bossTrails=[];
        if(this.status==='won'&&!this.terminalFall)this.boss.phase='controlledVictory';
      }
    }

    damageBoss(shot) {
      if(this.status!=='playing')return;
      const score=this.score,guard=this.guardRemaining>0;
      super.damageBoss({...shot,damage:shot.damage*this.aiConfig.damage*(guard?.2:1)});
      this.score=score;
      if(guard&&this.time>=this.nextBlockSound&&(!shot.id||shot.id!==this.lastBlockShot)){
        this.lastBlockShot=shot.id||0;this.nextBlockSound=this.time+.08;this.event('armor-block');
      }
      // Also supports an older base build while the finisher API is being upgraded.
      if(this.boss.hp<=0&&this.status!=='lost')this.defeatBoss();
    }

    defeatBoss() {
      if(this.status==='lost')return;
      this.status='lost';this.boss.hp=0;this.boss.phase=this.boss.y<FLOOR?'leap':'kneel';this.boss.age=0;this.boss.vx=0;
      this.boss.prevY=this.boss.y;this.terminalFall=this.boss.y<FLOOR?{vy:60}:null;
      this.victory=null;this.downed=null;this.execution=null;this.smasherVictory=null;this.guardRemaining=0;this.boss.guard=0;
      this.waves=[];this.missiles=[];this.enemyShots=[];this.shots=[];this.bossTrails=[];
      this.events=this.events.filter(e=>e.type!=='won'&&e.type!=='boss-downed');
      Object.assign(this.player,{vx:0,dash:0,recoil:0,muzzle:0,reload:0});
      this.camera=8;this.burst(this.boss.x,FLOOR-55,35,'#ffb76a',180);this.event('lost',{mode:'smasher'});
    }

    hurt(source) {
      if(this.status!=='playing')return false;
      const hit=super.hurt(source);
      if(hit){
        this.controlledScore+=600;this.score=this.controlledScore;this.camera=Math.max(this.camera,10);this.hitStop=Math.max(this.hitStop,.065);
        this.event('smasher-hit',{source});
      }
      if(hit&&this.player.hp<=0){
        this.status='won';this.controlledWinner=true;this.smasherVictory={age:0};this.victory=null;
        this.boss.phase=this.boss.y<FLOOR?'leap':'controlledVictory';this.boss.age=0;this.boss.vx=0;
        this.boss.prevY=this.boss.y;this.terminalFall=this.boss.y<FLOOR?{vy:60}:null;
        this.guardRemaining=0;this.boss.guard=0;
        this.waves=[];this.missiles=[];this.enemyShots=[];this.shots=[];this.bossTrails=[];
        this.controlledScore+=3000+Math.round(this.boss.hp/this.boss.maxHp*2500);this.score=this.controlledScore;
        this.events=this.events.filter(e=>e.type!=='lost');this.event('won',{mode:'smasher'});
      }
      return hit;
    }

    perfect() {
      const score=this.score,dodges=this.dodges;
      super.perfect();
      this.score=score;this.dodges=dodges;
      const e=this.events[this.events.length-1];if(e?.type==='perfect')e.type='ai-perfect';
    }

    updateEffects(dt) {
      super.updateEffects(dt);
      if(this.smasherVictory)this.smasherVictory.age+=dt;
      if(this.status==='playing')return;
      const b=this.boss,p=this.player;
      // A killing round can arrive during either fighter's jump. Finish the fall
      // continuously before settling the human's kneel or victory stance.
      if(this.terminalFall){
        b.prevY=b.y;this.terminalFall.vy+=1000*dt;b.y=Math.min(FLOOR,b.y+this.terminalFall.vy*dt);
        if(b.y===FLOOR){
          this.terminalFall=null;b.phase=this.status==='lost'?'kneel':'controlledVictory';b.age=0;
          this.burst(b.x,FLOOR-3,14,'#9babb4',95);
        }
      }else b.age+=dt;
      if(this.status==='lost'&&p.y<FLOOR){p.prevY=p.y;p.vy+=1180*dt;p.y=Math.min(FLOOR,p.y+p.vy*dt);if(p.y===FLOOR)p.vy=0;}
    }
  }
  const api={SmasherWorld,SMASHER_ABILITIES};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LastStandSmasher=api;
})(typeof globalThis!=='undefined'?globalThis:this);
