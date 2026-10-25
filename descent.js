/* V5: original pixel geometry for the plaza breach and descent into the undercroft. */
window.DescentFX=(()=>{
  const W=960,H=540,FLOOR=452;
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
  const mix=(a,b,t)=>a+(b-a)*t;
  const noise=n=>{const x=Math.sin(n*73.17+9.4)*4309.57;return x-Math.floor(x);};
  const rect=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  const line=(c,x,y,u,v,col,width=1)=>{c.strokeStyle=col;c.lineWidth=width;c.beginPath();c.moveTo(Math.round(x),Math.round(y));c.lineTo(Math.round(u),Math.round(v));c.stroke();};
  function poly(c,points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.fill();}
  function text(c,s,x,y,size,color){c.fillStyle=color;c.font=`600 ${size}px Rajdhani,"Microsoft YaHei",sans-serif`;c.textAlign='center';c.fillText(s,Math.round(x),Math.round(y));}
  function timings(world){
    const tr=world.transition;if(!tr)return null;
    const age=Math.max(0,tr.age||0),breakAt=tr.breakAt??1.15,landAt=tr.landAt??2.75;
    const progress=clamp((age-breakAt)/Math.max(.1,landAt-breakAt));
    // A gentle camera pickup, near-linear descent, then a short braking ease.
    const scroll=ease(progress)*H;
    return {tr,age,breakAt,landAt,progress,scroll};
  }
  function fallback(c,y,lower){
    rect(c,0,y,W,H,lower?'#101720':'#15172b');
    if(lower){
      for(let i=0;i<9;i++){rect(c,i*120-28,y+40,28,407,'#29373d');rect(c,i*120-23,y+40,3,407,'#446068');}
      line(c,0,y+112,W,y+112,'#74564b',7);line(c,0,y+118,W,y+118,'#171f29',4);
      for(let i=0;i<6;i++)rect(c,50+i*173,y+205,42,3,'#e2a764');
      rect(c,0,y+FLOOR,W,H-FLOOR,'#26313a');line(c,0,y+FLOOR,W,y+FLOOR,'#8b9ca4',2);
    }
  }
  function plate(c,img,y,lower){
    if(img&&(img.naturalWidth||img.width)>0)c.drawImage(img,0,Math.round(y),W,H);else fallback(c,y,lower);
  }
  function slab(c,d){
    const y=FLOOR-d.scroll;
    if(y<-116||y>H+30)return;
    // The floor underside bridges the image seam and reveals fractured glass,
    // concrete aggregate, steel reinforcement, and severed hanging cables.
    const top=[];for(let x=0;x<=W;x+=32)top.push([x,y+noise(x+4)*9]);
    const bottom=[];for(let x=W;x>=0;x-=32)bottom.push([x,y+58+noise(x+31)*34]);
    poly(c,[...top,...bottom],'#111d28');
    for(let i=0;i<31;i++){
      const x=i*32,h=10+noise(i+10)*19;
      poly(c,[[x,y+5],[x+29,y+8],[x+23,y+h],[x+7,y+h+4]],i%3?'#3b4b56':'#58656c');
      line(c,x+2,y+3,x+26,y+5,i%2?'#a5ccd4':'#70a4b2',2);
      if(i%3===0){line(c,x+13,y+29,x+9,y+61,'#657777',2);line(c,x+9,y+61,x+17,y+72,'#657777',2);}
      for(let j=0;j<3;j++)rect(c,x+noise(i*9+j)*27,y+20+noise(i*13+j)*29,3,2,'#738086');
    }
    for(let i=0;i<9;i++){
      const x=i*119+13,len=30+noise(i+37)*46;
      line(c,x,y+51,x+5,y+len+45,'#060d15',3);
      line(c,x+5,y+len+45,x+12,y+len+52,'#41606a',2);
      if(i%3===1)rect(c,x+11,y+len+51,3,3,'#9bddd7');
    }
  }
  function background(c,world,plazaImage,lowerImage,{reducedMotion=false,time=0}={}){
    const d=timings(world);c.save();c.imageSmoothingEnabled=false;
    if(!d){plate(c,world.arena==='undercroft'?lowerImage:plazaImage,0,world.arena==='undercroft');c.restore();return;}
    if(reducedMotion){
      plate(c,plazaImage,0,false);
      const blend=ease((d.age-d.breakAt-.12)/Math.max(.2,d.landAt-d.breakAt-.24));
      if(blend>0){c.globalAlpha=blend;plate(c,lowerImage,0,true);c.globalAlpha=1;}
      // No displaced camera, flashing, or moving debris in reduced motion.
      rect(c,0,0,W,H,`rgba(4,12,19,${Math.sin(blend*Math.PI)*.08})`);
    }else if(d.age<d.breakAt){
      plate(c,plazaImage,0,false);
    }else if(d.progress<1){
      plate(c,plazaImage,-d.scroll,false);plate(c,lowerImage,H-d.scroll,true);slab(c,d);
      // Recesses and tiny distant fragments stay behind both fighters.
      const fade=Math.sin(d.progress*Math.PI);
      c.globalAlpha=fade*.42;
      for(let i=0;i<25;i++){
        const x=18+noise(i+73)*924;
        const y=((i*79+d.progress*(95+i%4*29)-d.scroll*.45)%610+610)%610-40;
        rect(c,x,y,2+i%3,3+i%4,i%3?'#8da8b1':'#bad5d8');
      }
      c.globalAlpha=1;
      // Soft darkness on the outside walls leaves the playable centre clear.
      rect(c,0,0,48,H,`rgba(3,11,18,${fade*.19})`);rect(c,W-48,0,48,H,`rgba(3,11,18,${fade*.19})`);
    }else plate(c,lowerImage,0,true);
    c.restore();
  }
  function characterOffsets(world,reducedMotion=false){
    const p=world.player,b=world.boss,d=timings(world);
    const result={player:{x:p.x,y:p.y},boss:{x:b.x,y:b.y,phase:b.phase,age:b.age}};
    if(!d||reducedMotion)return result;
    const {age,breakAt,landAt,progress}=d;
    if(age<breakAt*.36){
      result.boss.y=FLOOR+ease(age/(breakAt*.36))*8;
      result.boss.phase='windup';result.boss.age=age;
      result.player.y=mix(d.tr.playerY??FLOOR,FLOOR,ease(age/.35));
    }else if(age<breakAt*.76){
      const k=ease((age-breakAt*.36)/(breakAt*.4));
      result.boss.y=mix(FLOOR+8,FLOOR-104,k);result.boss.phase='drop';result.boss.age=age;
      result.player.y=FLOOR;
    }else if(age<breakAt){
      const k=clamp((age-breakAt*.76)/(breakAt*.24));
      result.boss.y=mix(FLOOR-104,FLOOR,k*k);result.boss.phase='drop';result.boss.age=age;
      result.player.y=FLOOR;
    }else if(age<landAt){
      // The camera catches the falling bodies before following them down.
      // Their logical positions stay on the safe landing plane throughout.
      const arc=Math.sin(progress*Math.PI);
      result.boss.y=FLOOR-arc*51+Math.sin(progress*Math.PI*2)*12;
      result.player.y=FLOOR-arc*93;
      result.boss.phase='drop';result.boss.age=age-breakAt;
    }else if(age<landAt+.46){
      const k=clamp((age-landAt)/.46);
      result.boss.y=FLOOR+Math.sin(k*Math.PI)*8;result.boss.phase='recover';result.boss.age=age-landAt;
      result.player.y=FLOOR-Math.sin(k*Math.PI)*9;
    }else{
      result.boss.y=FLOOR;result.boss.phase='transform';result.boss.age=age-landAt-.46;
    }
    return result;
  }
  function cracks(c,d){
    const t=d.age-d.breakAt;if(t<-.18||t>.56)return;
    const spread=clamp((t+.18)/.25),opacity=1-clamp((t-.12)/.44),x=d.tr.bossX??480,y=FLOOR-d.scroll;
    c.save();c.globalAlpha=opacity;
    // Branched fracture lines travel to the screen edges instead of a flash.
    for(let i=0;i<19;i++){
      const side=i%2?1:-1,dist=(78+noise(i+90)*530)*spread;
      const endX=clamp(x+dist*side,0,W),endY=y+(noise(i+21)-.5)*65;
      const midX=mix(x,endX,.42),midY=mix(y,endY,.45)+(i%3-1)*11;
      line(c,x,y,midX,midY,'#172c35',4);line(c,midX,midY,endX,endY,'#172c35',3);
      line(c,x,y,midX,midY,i%2?'#c1e1e3':'#88becb',1);line(c,midX,midY,endX,endY,'#8ac3cd',1);
      line(c,midX,midY,midX+side*30,midY-13,'#729fba',1);
    }
    c.restore();
  }
  function rubble(c,d){
    const t=d.age-d.breakAt;if(t<0||t>2.8)return;
    const alpha=clamp(1-(t-1.3)/1.5);
    c.save();
    for(let i=0;i<31;i++){
      const startX=18+noise(i+103)*924,dx=(noise(i+58)-.5)*105;
      const y=FLOOR+noise(i+87)*19-(56+noise(i+97)*170)*t+156*t*t-d.scroll;
      const x=startX+dx*t;if(y<-30||y>H+28)continue;
      c.globalAlpha=alpha*(i%3===0?.85:.48);
      const size=i%3===0?8+noise(i)*9:3+noise(i)*5;
      c.save();c.translate(Math.round(x),Math.round(y));c.rotate((noise(i+4)-.5)*t*5);
      poly(c,[[-size,-size*.45],[size*.65,-size*.7],[size,size*.28],[-size*.4,size*.65]],i%3?'#7394a3':'#3e535e');
      line(c,-size,-size*.45,size*.65,-size*.7,i%3?'#bfe5e2':'#b7c1bb',1);
      c.restore();
    }
    c.restore();
  }
  function landingDust(c,world,d){
    const t=d.age-d.landAt;if(t<0||t>1.15)return;
    const alpha=clamp(1-t/1.15);
    c.save();
    for(const [origin,power] of [[world.boss.x,1],[world.player.x,.48]]){
      for(let side of [-1,1])for(let i=0;i<9;i++){
        const x=origin+side*(13+i*9+t*(85+i*17)*power);
        const height=(10+noise(i+27)*16)*power;
        // Dust remains below the knees; body silhouettes remain readable.
        c.globalAlpha=alpha*(.34-i*.021);
        rect(c,x,FLOOR-height*(1-t*.35),17+noise(i+19)*19,height, i%2?'#9fa994':'#637678');
        if(i<5){c.globalAlpha=alpha*.65;rect(c,x,FLOOR-3,5+i,2,'#abc5bd');}
      }
    }
    c.restore();
  }
  function foreground(c,world,{reducedMotion=false,time=0}={}){
    const d=timings(world);if(!d)return;
    c.save();
    if(!reducedMotion){cracks(c,d);rubble(c,d);landingDust(c,world,d);}
    if(d.age>.56&&d.age<d.landAt+.84){
      const landed=d.age>=d.landAt,opacity=Math.min(clamp((d.age-.56)/.16),clamp((d.landAt+.84-d.age)/.3));
      c.globalAlpha=opacity;
      rect(c,365,181,230,35,'#08141ee8');line(c,365,181,595,181,landed?'#7ce3d4':'#ffba78',2);
      text(c,landed?'下层空间 // LOWER LEVEL':'承重层断裂 // FLOOR BREACH',480,201,12,landed?'#aaf9e4':'#ffe0b2');
      rect(c,365,214,230*(landed?1:d.progress),2,landed?'#7ce3d4':'#ffba78');
    }
    c.restore();
  }
  return {background,characterOffsets,foreground};
})();
