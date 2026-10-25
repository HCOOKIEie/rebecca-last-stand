/* Layered procedural pixel VFX. Cosmetic hashes never consume simulation RNG. */
window.CombatFX=(()=>{
  const hash=(i,seed=0)=>{const v=Math.sin(i*127.1+(seed%997)*.019)*43758.5453;return v-Math.floor(v);};
  const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
  function poly(c,points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.fill();}
  function stroke(c,points,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.stroke();}
  function pixelEllipse(c,x,y,rx,ry,color,alpha=1){
    c.save();c.globalAlpha*=alpha;c.fillStyle=color;
    for(let row=-Math.ceil(ry);row<=ry;row+=2){const width=rx*Math.sqrt(Math.max(0,1-(row/Math.max(ry,1))**2));c.fillRect(Math.round(x-width),Math.round(y+row),Math.max(1,Math.round(width*2)),2);}
    c.restore();
  }
  function shockwave(c,w,floor,reduced=false){
    const age=w.age||0,seed=w.seed||0,dir=Math.sign(w.vx)||1,phase=reduced?0:Math.floor(age*20);
    c.save();c.translate(Math.round(w.x),floor);c.scale(dir,1);
    // Reflected light stays below the contact edge, visually separate from the hitbox.
    pixelEllipse(c,-9,8,35,8,'#8bc9f5',.14);
    for(let i=0;i<7;i++){
      const x=-18-i*9,spread=5+hash(i,seed)*10;
      c.globalAlpha=.07+(1-i/7)*.09;
      rect(c,x-spread,2+i%3,spread*2,3,'#a4bdcf');rect(c,x-spread*.7,-2-i%2,spread,4,'#8294b4');
    }
    c.globalAlpha=.8;
    for(let i=0;i<5;i++)rect(c,-18-i*11,5+i%2*3,6+hash(i+9,seed)*9,1,'#8abbd8');
    c.globalAlpha=1;
    // Hollow, refracted pressure front. The plaza remains visible through the air shell.
    c.globalAlpha=.16;
    poly(c,[[-24,1],[-20,-11],[-13,-24],[-4,-30],[5,-28],[15,-19],[22,-6],[24,2]],'#8dcce9');
    c.globalAlpha=.55;
    poly(c,[[-23,1],[-20,-10],[-14,-23],[-5,-30],[4,-29],[14,-19],[22,-6],[24,1],[19,0],[15,-8],[9,-18],[2,-24],[-4,-24],[-10,-19],[-15,-9],[-18,1]],'#74d4e4');
    c.globalAlpha=.95;
    stroke(c,[[-5,-29],[4,-28],[12,-20],[18,-10],[22,-1]],'#cefff5',2);
    stroke(c,[[3,-27],[11,-19],[16,-10]],'#fffbe5',1);
    c.globalAlpha=.55;
    stroke(c,[[-21,-2],[-17,-12],[-11,-22],[-5,-26]],'#a2dfef',1);
    stroke(c,[[-17,-1],[-13,-10],[-7,-18],[1,-21],[9,-14],[14,-3]],'#78b8d8',1);
    for(let ripple=1;ripple<=2;ripple++){
      const offset=ripple*17,height=23-ripple*6;
      c.globalAlpha=.32-ripple*.07;
      stroke(c,[[-offset-18,0],[-offset-14,-height*.5],[-offset-6,-height],[-offset+2,-height*.9],[-offset+11,-height*.45],[-offset+15,0]],'#a0d8eb',1);
    }
    c.globalAlpha=.75;
    stroke(c,[[-65,2],[-48,0],[-35,3],[-20,-1],[0,1],[23,0]],'#8ed6df',1);
    rect(c,-8,-1,31,2,'#c6f6e9');rect(c,10,-1,11,1,'#fff3c3');c.globalAlpha=1;
    // Individually tumbling glass chips, with two faces rather than square confetti.
    for(let i=0;i<(reduced?8:19);i++){
      const t=(age*(1.6+hash(i+31,seed)) +i*.137)%1;
      const x=8-t*(34+hash(i+44,seed)*40),y=-4-Math.sin(t*Math.PI)*(6+hash(i+57,seed)*24);
      const size=2+hash(i+69,seed)*4;
      c.globalAlpha=(1-t)*.8;
      poly(c,[[x,y-size],[x+size,y-1],[x+size*.3,y+2],[x-size*.8,y+1]],i%4===0?'#ffcf94':'#a6d9ef');
      stroke(c,[[x,y-size],[x+size,y-1]],'#ecffff',1);
    }
    c.globalAlpha=reduced?.55:.72;
    for(let arc=0;arc<2;arc++){
      const pts=[];
      for(let i=0;i<6;i++)pts.push([-46+i*11,-4-arc*5-(i%2?hash(i+phase+arc*13,seed)*8:1)]);
      stroke(c,pts,arc?'#e3fcff':'#6fceec',1);
    }
    c.restore();
  }
  function impactRing(c,ring,floor,reduced=false){
    const age=ring.age||0,duration=ring.maxLife||.6,fade=Math.min(1,Math.max(0,ring.life/duration));
    c.save();
    for(let layer=0;layer<3;layer++){
      const radius=13+Math.max(0,age-layer*.045)*220,ry=3+radius*.125;
      const pts=[];
      for(let i=0;i<=72;i++){
        const a=i/72*Math.PI*2,jitter=reduced?0:Math.sin(i*2.7+layer)*1.6;
        pts.push([Math.round((ring.x+Math.cos(a)*(radius+jitter))/2)*2,Math.round((floor+Math.sin(a)*ry)/2)*2]);
      }
      c.globalAlpha=fade*(layer===0?.75:.25);stroke(c,pts,layer===0?'#d5f1fc':'#83b3d5',layer===0?2:1);
    }
    if(age<.25){c.globalAlpha=(1-age/.25)*.45;pixelEllipse(c,ring.x,floor+2,24+age*90,4+age*10,'#d3e8ef');}
    c.restore();
  }
  function glassParticle(c,q){
    c.save();c.globalAlpha=Math.min(1,q.life*2.4);c.translate(Math.round(q.x),Math.round(q.y));c.rotate(q.angle||0);
    const r=q.size;
    poly(c,[[0,-r],[r*.6,0],[0,r*.45],[-r*.5,1]],q.color);
    poly(c,[[0,-r],[0,r*.45],[-r*.5,1]],'#3e617f');stroke(c,[[0,-r],[r*.6,0]],'#d3f6ff',1);
    c.restore();
  }
  function deathGround(c,d,floor){
    if(!d)return;
    const growth=.15+.85*(1-Math.exp(-d.age*4.5));
    c.save();
    pixelEllipse(c,d.x+4,floor+22,58*growth,13*growth,'#5b1533',.23);
    for(const s of d.stains){
      rect(c,s.x-s.w*.5,s.y,s.w,s.h,'#4d1027');rect(c,s.x-s.w*.35,s.y,s.w*.65,Math.max(1,s.h-1),s.color);
    }
    c.translate(d.x,floor+11);
    for(const r of d.rivulets){
      const end=[r.x*growth,r.y*growth],dir=Math.sign(r.x);
      stroke(c,[[dir*23,4],[end[0]*.55,2],[end[0]*.73,end[1]-3],end],'#631429',r.width+2);
      stroke(c,[[dir*23,4],[end[0]*.55,2],[end[0]*.73,end[1]-3],end],'#a72940',r.width);
    }
    poly(c,d.outline.map(p=>[p.x*growth*1.08,p.y*growth*1.13]),'#310d20');
    poly(c,d.outline.map(p=>[p.x*growth,p.y*growth]),'#791b32');
    poly(c,d.outline.map((p,i)=>[p.x*growth*.85,p.y*growth*.7+(i%3===0?2:0)]),'#a52a42');
    for(let i=0;i<22;i++){
      const x=(hash(i,41)-.5)*88*growth,y=(hash(i,67)-.5)*16*growth;
      rect(c,x,y,4+hash(i,99)*9,2+i%3,i%3===0?'#d34b59':i%3===1?'#6b152c':'#8a1d34');
    }
    stroke(c,[[-35*growth,-3],[-24*growth,-5],[-13*growth,-4]],'#df7374',1);
    stroke(c,[[10*growth,7],[22*growth,8],[33*growth,6]],'#bf5164',1);
    c.restore();
  }
  function deathFragments(c,d,reduced=false){
    if(!d)return;
    for(const f of d.fragments){
      if(f.kind==='blood'&&f.rest)continue;
      if(f.kind==='blood'){
        if(reduced)continue;
        c.save();c.globalAlpha=.85;stroke(c,[[f.x-f.vx*.012,f.y-f.vy*.012],[f.x,f.y]],'#75162e',Math.max(1,f.size*.65));rect(c,f.x,f.y,f.size,f.size*.8,'#d64c5d');c.restore();continue;
      }
      c.save();c.translate(Math.round(f.x),Math.round(f.y));
      if(!f.rest&&!reduced)c.rotate(f.angle);
      const r=f.size;
      if(f.kind==='flesh'){
        poly(c,[[-r,-2],[-r*.65,-r*.55],[0,-r*.7],[r*.8,-r*.25],[r,2],[r*.4,r*.38],[-r*.6,r*.3]],'#4e1024');
        poly(c,[[-r*.7,-2],[-r*.4,-r*.45],[r*.25,-r*.5],[r*.7,0],[r*.3,r*.24],[-r*.5,r*.15]],'#b3384c');
        rect(c,-r*.4,-r*.4,r*.65,2,'#e28a84');rect(c,1,-1,r*.35,2,'#7d2036');
      }else if(f.kind==='fabric'){
        poly(c,[[-r,-3],[-r*.4,-r*.4],[r*.8,-2],[r*.6,4],[-r*.5,3]],'#101824');
        rect(c,-r*.5,-2,r,3,'#2d3a4d');stroke(c,[[-r,0],[-r*.4,3],[r*.6,2]],'#b5c64f',1);
      }else if(f.kind==='hair'){
        poly(c,[[-r*1.2,-2],[r*.2,-4],[r,0],[r*.3,2],[-r,2]],'#3d8d83');
        stroke(c,[[-r,-1],[r*.1,-2],[r*.8,0]],'#a5eed1',2);rect(c,-2,-3,4,3,'#162532');
      }else if(f.kind==='chrome'){
        poly(c,[[-r,-3],[-r*.3,-5],[r*.7,-3],[r,2],[r*.4,4],[-r*.7,3]],'#182336');
        rect(c,-r*.7,-3,r*1.2,5,f.color);rect(c,-r*.4,-3,r*.6,1,'#e6bfce');rect(c,r*.45,-1,3,3,'#4e233f');
      }else if(f.kind==='guts'){
        c.rotate(f.rest?-.13:0);rect(c,-16,-5,37,9,'#101724');rect(c,-15,-4,12,6,'#d65c96');rect(c,-4,-4,17,6,'#9be0c5');rect(c,13,-4,13,5,'#34465e');rect(c,24,-5,4,8,'#0d1726');rect(c,0,2,5,6,'#294052');rect(c,-2,-4,14,2,'#d8f5da');
      }
      c.restore();
    }
  }
  return {shockwave,impactRing,glassParticle,deathGround,deathFragments};
})();
