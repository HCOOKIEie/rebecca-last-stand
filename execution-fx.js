/* V6 execution cues and local mechanical failure. No simulation state is mutated. */
window.ExecutionFX=(()=>{
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const unit=v=>clamp(v,0,1);
  const noise=n=>{const v=Math.sin(n*78.233+3.37)*43758.5453;return v-Math.floor(v);};
  function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  function line(c,x,y,u,v,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(Math.round(x),Math.round(y));c.lineTo(Math.round(u),Math.round(v));c.stroke();}
  function label(c,s,x,y,size=12,color='#e7f3ee',align='center'){
    c.fillStyle=color;c.font=`600 ${size}px Rajdhani,"Microsoft YaHei",sans-serif`;c.textAlign=align;c.fillText(s,Math.round(x),Math.round(y));
  }
  function sparks(c,x,y,age,reduced){
    if(age<0||age>.8)return;
    const fade=1-unit(age/.8);c.save();c.globalAlpha=fade;
    for(let i=0;i<(reduced?5:19);i++){
      const angle=-Math.PI*.9+noise(i)*Math.PI*1.8,speed=36+noise(i+70)*125;
      const vx=Math.cos(angle)*speed,vy=Math.sin(angle)*speed-42;
      const xx=x+vx*age,yy=y+vy*age+110*age*age,length=(reduced?2:6)*(1-age);
      line(c,xx,yy,xx-vx/speed*length,yy-(vy+220*age)/speed*length,i%4?'#ffcd7b':'#e3fff1',i%3?1:2);
    }
    if(age<.12){const r=(1-age/.12)*(reduced?8:14);line(c,x-r,y,x+r,y,'#fff4c5',2);line(c,x,y-r,x,y+r,'#fff4c5',2);rect(c,x-2,y-2,4,4,'#fffceb');}
    c.restore();
  }
  function impact(c,b,age,reduced){
    if(age<0||age>.75)return;
    c.save();const fade=1-unit(age/.75);c.globalAlpha=fade*(reduced?.3:.6);
    const center=b.x+b.facing*25;
    for(let i=0;i<(reduced?5:13);i++){
      const side=i%2?1:-1,xx=center+side*(10+age*(35+noise(i)*85)),yy=b.y-1-age*(10+noise(i+20)*16)+age*age*18;
      const width=5+noise(i+11)*13+age*10,height=3+noise(i+30)*5;
      rect(c,xx-width/2,yy-height,width,height,i%3?'#9babb4':'#cfcbc1');
      if(!reduced&&i%3===0){rect(c,xx,yy-6,3,2,'#c5d6dd');rect(c,xx+side*6,yy+2,2,2,'#5e7986');}
    }
    const spread=30+age*95;
    line(c,center-spread,b.y+1,center-11,b.y+1,'#b8c5c56b',2);
    line(c,center+11,b.y+1,center+spread,b.y+1,'#b8c5c56b',2);c.restore();
  }
  function prompt(c,w){
    const b=w.boss,p=w.player,d=w.downed;
    if(!d||w.execution||w.victory)return;
    const near=typeof w.canExecute==='function'?w.canExecute():Math.abs(p.x-b.x)<=105&&p.y>=452-6&&d.ready;
    const x=clamp(b.x,166,794),y=b.y-194;
    c.save();rect(c,x-144,y,288,43,'#09121eed');line(c,x-144,y,x+144,y,near?'#f4ee70':'#86b8c3',2);
    if(near){
      rect(c,x-129,y+9,26,25,'#f4ee70');label(c,'E',x-116,y+28,19,'#101d23');
      label(c,'互动处决',x-87,y+27,16,'#f8f3ad','left');
      label(c,'最后一枪',x+128,y+27,11,'#a8c9ca','right');
    }else{
      label(c,d.ready?'靠近重锤':'目标失能 · 正在跪倒',x,y+20,14,d.ready?'#c8e9e9':'#9bb9c2');
      label(c,d.ready?'靠近后按 E 互动处决':'义体驱动离线',x,y+35,10,'#91abb7');
    }
    if(d.ready){
      line(c,b.x-27,b.y+3,b.x+27,b.y+3,near?'#f4ee70':'#7d9ba9',2);
      for(const s of [-1,1]){line(c,b.x+s*52,b.y-58,b.x+s*52,b.y-45,'#b5b88e',2);line(c,b.x+s*52,b.y-58,b.x+s*43,b.y-58,'#b5b88e',2);}
    }
    c.restore();
  }
  function foreground(c,w,reduced=false){
    const b=w.boss,p=w.player,e=w.execution;
    if(w.downed&&!e){
      prompt(c,w);
      // Sparse hardware sparks keep the defeated cyborg readable and visually alive.
      const cycle=(w.downed.age||0)%1.1;
      if(cycle<.25)sparks(c,b.x-b.facing*17,b.y-86,cycle,reduced);
      return;
    }
    if(!e)return;
    const t=e.age,shot=t-(e.impactAt??.65),head={x:b.x+b.facing*14,y:b.y-107};
    c.save();const bars=unit(t/.18);rect(c,0,0,960,22*bars,'#060b13');rect(c,0,540-24*bars,960,24*bars,'#060b13');
    label(c,t<.65?'FINAL SHOT // 终结目标':t<1.86?'NEURAL LINK // 强制断开':'TARGET NEUTRALIZED // 目标已清除',480,16,11,t<.65?'#f7f29c':'#b1d5d4');
    if(shot>=0&&shot<.08){
      const muzzle=window.PixelArt?.muzzlePoint?window.PixelArt.muzzlePoint(p.x,p.y,p):{x:p.x+p.facing*39,y:p.y-63};
      c.globalAlpha=(1-shot/.08)*(reduced?.55:1);
      line(c,muzzle.x,muzzle.y,head.x,head.y,'#ffe1a288',3);
      line(c,muzzle.x,muzzle.y,head.x,head.y,'#fff2cc',1);c.globalAlpha=1;
    }
    sparks(c,head.x,head.y,shot,reduced);
    impact(c,b,t-1.86,reduced);
    if(t>1.1){
      const opacity=unit((t-1.1)/.4)*.18;
      for(let i=0;i<(reduced?2:5);i++){
        const a=(t-1.1+i*.15)%.95,xx=b.x+b.facing*(17+i*7),yy=b.y-27-a*33;
        c.globalAlpha=opacity*(1-a);rect(c,xx,yy,7+a*10,4+a*7,'#9fb2b4');
      }
    }
    c.restore();
  }
  return{foreground};
})();
