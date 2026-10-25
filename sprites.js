/* Original generated animation atlases. Hand-registered pivots keep feet and mass stable. */
window.PixelArt = (() => {
  const sheets = {};
  const echoes = new Map();
  // Cache recolored frames: preserve armor detail without recoloring the atlas.
  function smasherEcho(c,x,y,{facing=1,color='#99ffd0',alpha=.3,offset=0}={}){
    if(!sheets.smasher.ready)return;
    let canvas=echoes.get(color);
    if(!canvas){
      canvas=typeof document!=='undefined'?document.createElement('canvas'):new OffscreenCanvas(220,200);
      canvas.width=220;canvas.height=200;const g=canvas.getContext('2d');
      draw(g,'smasher',6,110,188,174,1,1,.12);
      g.globalCompositeOperation='source-atop';g.globalAlpha=.78;g.fillStyle=color;g.fillRect(0,0,220,200);
      echoes.set(color,canvas);
    }
    c.save();c.globalAlpha*=alpha;c.translate(Math.round(x+offset),Math.round(y));c.scale(facing,1);
    c.drawImage(canvas,-110,-188);c.restore();
  }
  const rebeccaFrames = [
    [40,20,360,410,175,420], [470,20,420,410,650,420],
    [930,20,390,410,1100,420], [1355,25,410,405,1535,414],
    [55,465,380,405,235,858], [480,455,400,335,650,780],
    [840,575,500,270,1100,838], [1340,475,425,390,1560,856]
  ];
  const smasherFrames = [
    [40,0,365,448,225,445], [435,0,450,445,660,440],
    [920,105,415,340,1125,440], [1390,0,380,425,1575,410],
    [10,435,405,450,230,875], [480,540,385,340,675,875],
    [935,460,390,420,1130,875], [1390,430,380,453,1575,875]
  ];
  // Generated articulated poses; hand registration keeps the knees/hips anchored.
  const smasherFinishFrames = [
    [106,134,448,564,355,694], [686,148,540,547,938,692],
    [26,803,653,380,300,1178], [683,1023,555,170,880,1189]
  ];
  function load(name, src, frames) {
    const image = new Image(); const sheet = sheets[name] = { image, frames, ready:false, failed:false };
    image.onload = () => { sheet.ready = true; };
    image.onerror = () => { sheet.failed = true; }; image.src = src;
  }
  load('rebecca', 'assets/rebecca-atlas-v2.png', rebeccaFrames);
  load('smasher', 'assets/smasher-atlas-v2.png', smasherFrames);
  load('smasherFinish', 'assets/smasher-finish-v6.png', smasherFinishFrames);
  function draw(c, name, frame, x, y, size, facing, alpha = 1, rotation = 0, squash = 1) {
    const sheet = sheets[name]; if (!sheet.ready) return;
    const [sx,sy,sw,sh,px,py] = sheet.frames[frame], scale = size / (name === 'rebecca' ? 390 : name === 'smasherFinish' ? 696 : 445);
    c.save(); c.globalAlpha *= alpha; c.translate(Math.round(x), Math.round(y)); c.scale(facing,1); c.rotate(rotation); c.scale(scale, scale*squash);
    c.imageSmoothingEnabled = false; c.drawImage(sheet.image,sx,sy,sw,sh,sx-px,sy-py,sw,sh); c.restore();
  }
  function rebecca(c,x,y,o={}) {
    const {size=99,facing=1,anim=0,moving=false,airborne=false,dash=false,shoot=false,alpha=1,reload=0,holster=0,recoil=0,heavy=false}=o;
    const kick=Math.pow(Math.min(1,recoil/(heavy?.24:.16)),2),back=kick*(heavy?12:7),lift=kick*(heavy?7:4);
    let frame = dash ? 6 : airborne ? 5 : moving ? [1,2,3,4][Math.floor(anim)%4] : shoot ? 7 : 0;
    const bob = moving && !dash && !airborne ? Math.sin(anim*Math.PI)*.8 : !airborne && !dash ? Math.sin(anim*2)*.7 : 0;
    if(holster>0){
      // Isolate the weapon arm so lowering the shotgun does not rotate her body.
      c.save();c.translate(x,y);c.scale(facing,1);c.beginPath();c.rect(-100,-160,125,180);c.rect(25,-160,100,87);c.rect(25,-42,100,60);c.clip();draw(c,'rebecca',0,0,0,size,1,alpha);c.restore();
      c.save();c.translate(x+facing*18,y-57);c.scale(facing,1);c.rotate(Math.min(1,holster)*1.2);
      c.fillStyle='#df5893';c.fillRect(-3,-4,13,9);c.fillStyle='#8bd8c1';c.fillRect(9,-3,31,6);c.fillStyle='#213645';c.fillRect(17,-1,26,2);c.fillStyle='#f6a6c6';c.fillRect(3,0,9,5);c.restore();
    }else if(kick>0&&!moving&&!airborne&&!dash){
      // Separate the existing weapon/forearm pixels around a shoulder pivot.
      c.save();c.translate(x-facing*back*.22,y+bob);c.scale(facing,1);
      c.save();c.beginPath();c.rect(-110,-180,132,200);c.rect(22,-180,110,104);c.rect(22,-35,110,60);c.clip();draw(c,'rebecca',0,0,0,size,1,alpha);c.restore();
      c.translate(-back,-lift);c.rotate(-kick*.055);c.beginPath();c.rect(22,-76,110,41);c.clip();draw(c,'rebecca',0,0,0,size,1,alpha);c.restore();
    }else draw(c,'rebecca',frame,x-facing*back*.5,y+bob-lift*.25,size,facing,alpha,reload>0?Math.sin(reload*16)*.025:-kick*(heavy?.075:.04));
  }
  function muzzlePoint(x,y,p){
    const kick=Math.pow(Math.min(1,p.recoil/(p.heavy?.24:.16)),2),back=kick*(p.heavy?12:7),lift=kick*(p.heavy?7:4);
    if(p.dash<=0&&p.y>=452-4&&Math.abs(p.vx)<=15){
      const a=-kick*.055;
      return{x:x+p.facing*(39*Math.cos(a)+63*Math.sin(a)-back*1.22),y:y+39*Math.sin(a)-63*Math.cos(a)-lift,angle:p.aim+p.facing*a};
    }
    return{x:x+p.facing*(39-back*.5),y:y-(p.dash>0?25:p.y<448?51:63)-lift*.25,angle:p.aim};
  }
  const unit=v=>Math.max(0,Math.min(1,v));
  const smooth=v=>{v=unit(v);return v*v*(3-2*v);};
  function smasherFinish(c,x,y,{size=174,facing=-1,phase,age=0,alpha=1}){
    const scale=size/174;
    const pose=(frame,opacity=1,offset=0,lift=0,angle=0,squash=1)=>
      draw(c,'smasherFinish',frame,x+facing*offset*scale,y+lift*scale,size,facing,alpha*opacity,angle,squash);
    if(phase==='kneel'){
      // Three crisp key poses: standing servos fail, knees buckle, then weight settles.
      // Foot-registered poses replace each other without a long translucent overlap.
      if(age<.14){
        const loseBalance=smooth(age/.14);
        draw(c,'smasher',1,x-facing*3*loseBalance*scale,y,size,facing,alpha,-.035*(1-loseBalance),1-.14*loseBalance);return;
      }
      if(age<.31){
        const buckle=smooth((age-.14)/.17);
        draw(c,'smasher',2,x+facing*3*(1-buckle)*scale,y,size,facing,alpha,0,1-.025*Math.sin(buckle*Math.PI));return;
      }
      const settle=1-smooth((age-.31)/.24),tremor=Math.sin(age*31)*Math.exp(-age*4);
      pose(0,1,-2*settle+tremor*.35,-3*settle,-.02*settle,1-.02*settle);
      return;
    }
    if(phase==='dead'){pose(3);return;}
    if(age<.65){pose(0);return;}
    const hit=age-.65,recoil=Math.sin(Math.min(1,hit/.24)*Math.PI)*4;
    if(age<1.02){
      const jerk=smooth(hit/.055);pose(0,1-jerk);pose(1,jerk,-recoil,-recoil*.35,-recoil*.007);return;
    }
    if(age<1.38){
      const bend=smooth((age-1.02)/.36),change=smooth((age-1.17)/.055);
      // The pose changes in a short animation beat; avoid a long, double-bodied dissolve.
      pose(1,1-change,5*bend,0,.1*bend,1-.18*bend);
      pose(2,change,2*bend,0,0,1);return;
    }
    if(age<1.86){
      const fall=smooth((age-1.38)/.48),contact=smooth((age-1.805)/.055);
      pose(2,1-contact,fall*5,0,0,1-fall*.2);
      pose(3,contact);return;
    }
    const rest=age-1.86,bounce=Math.sin(Math.min(1,rest/.24)*Math.PI)*2*Math.exp(-rest*6);
    pose(3,1,0,-bounce,0,1-bounce*.012);
  }
  function smasher(c,x,y,o={}) {
    const {size=174,facing=-1,phase='recover',age=0,hit=false,alpha=1}=o;
    if(['kneel','execute','dead'].includes(phase)){smasherFinish(c,x,y,{size,facing,phase,age,alpha});return;}
    let frame = phase==='windup'?2:phase==='leap'||phase==='target'?3:phase==='drop'?4:phase==='dead'?0:phase==='recover'?(age<.22?5:age<.55?6:0):0;
    if (hit && phase==='recover' && age>.5) frame=1;
    if (o.launch && phase==='recover' && age>.5) frame=7;
    if (['cannonAim','cannonFire','barrageWindup','barrageFire'].includes(phase)) frame=7;
    if (phase==='rushWindup') frame=2;
    if (phase==='rush') frame=6;
    if (phase==='reposition') frame=3;
    if(phase==='transform')frame=age<.65?2:age<1.35?1:7;
    if(phase==='sandiWindup')frame=2;if(phase==='sandiRush')frame=6;
    if(phase==='controlledIdle'&&o.moving){
      const step=Math.sin(age*7),bob=Math.abs(step)*1.3;
      draw(c,'smasher',Math.abs(step)>.7?6:0,x,y-bob,size,facing,alpha,step*.014);return;
    }
    draw(c,'smasher',frame,x,y,size,facing,alpha,phase==='rush'||phase==='sandiRush'?.12:0,phase==='recover'&&age<.12?.94:1);
  }
  return {rebecca,smasher,smasherEcho,muzzlePoint,get ready(){return Object.values(sheets).every(s=>s.ready);},get failed(){return Object.values(sheets).some(s=>s.failed);}};
})();
