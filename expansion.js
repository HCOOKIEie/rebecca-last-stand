/* V4 scene effects: all geometry is original and rendered on the pixel canvas. */
window.ExpansionFX=(()=>{
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  function line(c,x,y,u,v,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(Math.round(x),Math.round(y));c.lineTo(Math.round(u),Math.round(v));c.stroke();}
  function poly(c,p,color){c.fillStyle=color;c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.fill();}
  function label(c,s,x,y,size=11,color='#a7eff6',align='center'){c.fillStyle=color;c.font=`600 ${size}px Rajdhani,"Microsoft YaHei",sans-serif`;c.textAlign=align;c.fillText(s,Math.round(x),Math.round(y));}
  const noise=(n)=>{const x=Math.sin(n*71.37)*4331.2;return x-Math.floor(x);};
  // Advected heat on a two-pixel grid: connected hot roots, torn tips and
  // cooling wisps, rather than identical solid flame silhouettes.
  function heatNoise(x,y){
    const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
    const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
    const a=noise(ix+iy*139),b=noise(ix+1+iy*139),d=noise(ix+(iy+1)*139),e=noise(ix+1+(iy+1)*139);
    return (a+(b-a)*u)*(1-v)+(d+(e-d)*u)*v;
  }
  function thermalLeaks(c,b,time,reduced,damage){
    const rush=['rush','sandiRush'].includes(b.phase),wind=rush?-11:Math.abs(b.vx||0)>25?-4:0;
    const clock=reduced?2.4:time;
    for(const [i,vent] of [[-27,-106,1],[13,-88,.76]].entries()){
      const [sx,sy,power]=vent,seed=i*47+12;
      const breath=.84+Math.sin(clock*5.7+seed)*.1+Math.sin(clock*9.2+seed)*.06;
      const height=(15+damage*14)*power*breath,width=4.2+damage*1.8;
      // A recessed, sooty breach gives the fire a physical origin in the armor.
      c.globalAlpha=.85;poly(c,[[sx-5,sy-2],[sx,sy-5],[sx+5,sy-1],[sx+4,sy+5],[sx-3,sy+6]],'#090e16');
      c.globalAlpha=.18;rect(c,sx-7,sy-5,13,12,'#a84723');
      c.globalAlpha=.4;line(c,sx-3,sy+3,sx+3,sy+1,'#dd6e35',1);
      // Smoke breaks into low-contrast clusters; it never covers the face.
      for(let j=0;j<(reduced?1:4);j++){
        const age=(clock*.54+j*.27+i*.31)%1,drift=Math.sin(age*5+seed)*3+wind*age;
        const xx=sx+drift,yy=sy-height-4-age*21,r=3+age*5;
        c.globalAlpha=(1-age)*.14;
        rect(c,xx-r,yy,r*1.8,4+age*4,'#626971');rect(c,xx-r+2,yy-3,r*1.2,3,'#414952');
      }
      for(let rise=0;rise<height;rise+=2){
        const q=rise/height,drift=wind*q+Math.sin(clock*6.1-q*5+seed)*q*3;
        const half=width*Math.pow(1-q,.72);
        for(let dx=-8;dx<=8;dx+=2){
          const n=heatNoise(dx*.29+seed,rise*.21+clock*5.8);
          const edge=1-Math.abs(dx-drift)/(half+.8);
          const heat=edge*(1-q*.55)+(n-.5)*.7;
          if(heat<.2)continue;
          c.globalAlpha=clamp((heat-.15)*1.1,0,.88)*(1-q*.7);
          const color=heat>.86&&q<.23?'#ffe3aa':heat>.67?'#ffc16b':heat>.44?'#ec8a3d':'#b94a29';
          rect(c,sx+dx,sy-rise,2,2,color);
        }
      }
      if(!reduced)for(let j=0;j<3;j++){
        const age=(clock*(.8+j*.08)+i*.37+j*.33)%1;
        if(age>.72)continue;
        const xx=sx+wind*age+Math.sin(seed+j*7+age*5)*(2+age*4),yy=sy-3-age*(height+17);
        c.globalAlpha=(1-age)*.7;rect(c,xx,yy,1,age<.15?2:1,j%2?'#eea35d':'#f7ca80');
      }
    }
    c.globalAlpha=1;
  }
  function arena(c,tiles,floor,time,reduced){
    c.save();
    for(const t of tiles){
      if(t.state==='intact')continue;
      const left=t.x-35,right=t.x+35;
      if(t.state==='hole'){
        poly(c,[[left,floor-1],[right,floor-1],[right+6,floor+30],[left-6,floor+30]],'#080d20');
        poly(c,[[left+4,floor+5],[right-5,floor+5],[right-1,floor+27],[left-1,floor+27]],'#030711');
        line(c,left+7,floor+8,right-7,floor+8,'#1e3351',3);line(c,left+9,floor+10,left+4,floor+25,'#203c57',2);
        line(c,right-11,floor+10,right-6,floor+25,'#203c57',2);
        for(let i=0;i<5;i++){const x=left+4+i*13;poly(c,[[x,floor],[x+8,floor+1],[x+3,floor+7+i%3]],i%2?'#6d8dab':'#b0e6ef');}
        line(c,left,floor,right,floor,'#79b6ce',2);line(c,left-4,floor+30,right+4,floor+30,'#de6e67');
        label(c,`塌陷 / ${Math.ceil(t.timer)}s`,t.x,floor+46,9,'#e48b8f');continue;
      }
      if(t.state==='bridge'){
        poly(c,[[left,floor],[right,floor],[right+5,floor+24],[left-5,floor+24]],'#0e656e55');
        for(let x=left;x<right;x+=9)line(c,x,floor+2,x+5,floor+22,'#70ede86b');
        line(c,left,floor,right,floor,'#9cfff2',2);label(c,'应急光桥',t.x,floor+36,9,'#7de9df');continue;
      }
      const warn=t.state==='warning',pulse=reduced?1:.7+Math.sin(time*17)*.3;
      c.globalAlpha=warn?pulse:.7;
      poly(c,[[left,floor],[right,floor],[right+5,floor+25],[left-5,floor+25]],warn?'#ed5d372b':'#0c142038');
      const center=t.x+(noise(t.index+5)-.5)*17,cy=floor+9;
      for(let i=0;i<(t.damage>1?11:6);i++){
        const a=i*2.4+t.index,xx=center+Math.cos(a)*(18+noise(i+t.index)*22),yy=cy+Math.sin(a)*14;
        line(c,center,cy,xx,yy,warn?'#ffbf86':'#c0e3ee',1);
        line(c,xx,yy,xx+Math.cos(a+.7)*9,yy+Math.sin(a)*5,'#6285a7');
      }
      if(warn){line(c,left,floor-3,right,floor-3,'#ffb26d',2);label(c,`玻璃塌陷 ${Math.max(0,t.timer).toFixed(1)}`,t.x,floor+42,10,'#ffcc90');}
      c.globalAlpha=1;
    }
    c.restore();
  }
  function armor(c,b,parts,x,y,time,reduced){
    c.save();c.translate(Math.round(x),Math.round(y));c.scale(b.facing,1);
    const damage=clamp(1-b.hp/b.maxHp,0,1);
    if((b.overdrive&&(!b.controlled||damage>.2))||b.phase==='transform'){
      c.globalAlpha=.9;
      // Small exposed seams retain the material and silhouette of the armor.
      for(const [sx,sy] of [[-26,-105],[12,-88],[-5,-64]]){
        poly(c,[[sx-6,sy],[sx+1,sy-3],[sx+6,sy+4],[sx+2,sy+9],[sx+7,sy+15]],'#0c121c');
        line(c,sx,sy,sx+1,sy+6,'#ff965c',2);line(c,sx+1,sy+6,sx+5,sy+13,'#f3d28a');
      }
      thermalLeaks(c,b,time,reduced,damage);
      c.globalAlpha=1;line(c,-7,-116,5,-114,'#f5ff83',2);
    }
    if(parts.launcher.broken){
      poly(c,[[-51,-147],[-25,-147],[-14,-127],[-21,-114],[-47,-122]],'#111a27');
      line(c,-45,-142,-29,-125,'#677789',3);line(c,-29,-140,-41,-124,'#ff715b',2);
      line(c,-37,-122,-33,-111,'#e1ba78');rect(c,-25,-133,6,4,'#ffad72');
    }
    if(parts.legs.broken){
      for(const sx of [-25,24]){
        poly(c,[[sx-7,-53],[sx+6,-48],[sx+8,-27],[sx-4,-20],[sx-9,-34]],'#14202d');
        line(c,sx-2,-46,sx+1,-25,'#adbfc4',3);line(c,sx+4,-43,sx+5,-30,'#ff9b64',2);
      }
    }
    c.restore();
  }
  function target(c,world,time){
    const p=world.player,b=world.boss;if(world.status!=='playing'||p.target==='core')return;
    const a=world.aimPoint(),color=p.target==='launcher'?'#f6f237':'#7cf4e2';
    const r=21;c.save();c.globalAlpha=.8;
    for(const d of [-1,1]){line(c,a.x+d*r,a.y-11,a.x+d*r,a.y+11,color);line(c,a.x+d*r,a.y-11,a.x+d*(r-7),a.y-11,color);line(c,a.x+d*r,a.y+11,a.x+d*(r-7),a.y+11,color);}
    label(c,p.target==='launcher'?'拆除导弹架':'击穿腿甲',a.x,b.y-187,10,color);c.restore();
  }
  const echoColors=['#c8ff75','#66ffd0','#55dcff','#7b9dff','#b991f3'];
  function sandiTrails(c,trails,b,art,reduced){
    const echoes=trails.filter(t=>t.sandi).slice(-6);
    c.save();
    if(!reduced)for(const t of trails)if(!t.sandi)art.smasher(c,t.x,t.y,{phase:'rush',facing:t.facing,alpha:t.life/.16*.18});
    // Oldest figures are cooler; discrete silhouettes read as successive positions.
    for(const t of echoes){
      const age=1-clamp(t.life/.36,0,1),color=echoColors[Math.min(4,Math.floor(age*5))];
      if(reduced)continue;
      art.smasherEcho(c,t.x,t.y,{facing:t.facing,color,alpha:Math.pow(1-age,.75)*.46});
      for(let j=0;j<3;j++){
        const yy=t.y-133+j*31+Math.floor(noise(j+t.x)*7);
        line(c,t.x-t.facing*(18+age*36),yy,t.x-t.facing*(58+age*70),yy,color+'50',j===1?2:1);
      }
    }
    if(b.phase==='sandiRush'){
      const length=reduced?32:105;
      // Tight speed strokes stay behind the real, opaque body and above the danger rail.
      for(let i=0;i<(reduced?3:9);i++){
        const yy=b.y-159+i*12,n=noise(i+Math.floor(b.age*24));
        line(c,b.x-b.facing*(29+n*24),yy,b.x-b.facing*(length+n*65),yy,i%3?'#78ffd477':'#e8ffb0aa',i%3?1:2);
      }
    }
    c.restore();
  }
  function transformation(c,b,reduced,front){
    const k=clamp(b.age/b.duration,0,1),release=clamp((k-.28)/.36,0,1),activation=clamp((k-.62)/.38,0,1);
    c.save();c.translate(Math.round(b.x),Math.round(b.y));
    if(!front){
      // Local backlight, never a full-screen flash. Pixel steps keep the atlas style.
      for(let i=3;i>=0;i--){c.globalAlpha=(.025+k*.018)*(1-activation*.6);rect(c,-54-i*12,-174-i*5,108+i*24,169+i*5,i%2?'#74ffcc':'#ceff80');}
      c.globalAlpha=1;
      for(const d of [-1,1])for(let j=0;j<5;j++){
        const y=-26-j*29,x=d*(45+j%2*7),inset=8+release*35;
        line(c,x+d*inset,y-14,x+d*(inset+7),y-14,'#8bffb355',2);
        line(c,x+d*(inset+7),y-14,x+d*(inset+7),y-2,'#74ffe866');
      }
      if(release>0&&release<1){
        c.globalAlpha=(1-release)*.6;
        const r=35+release*125;
        for(let j=0;j<16;j++){
          const a=j*Math.PI/8;
          line(c,Math.cos(a)*r,Math.sin(a)*r*.24-4,Math.cos(a+.16)*r,Math.sin(a+.16)*r*.24-4,j%2?'#d8ff9b':'#69ffdd',2);
        }
      }
    }else{
      // Short stepped arcs connect shoulder and spinal hardware, not the whole screen.
      const tick=reduced?3:Math.floor(b.age*10);
      for(let j=0;j<4;j++){
        c.globalAlpha=(.35+release*.5)*(1-activation*.6);
        const x=-33+j*22,y=-135+j%2*32,dx=(noise(tick+j)-.5)*(reduced?8:22);
        line(c,x,y,x+dx,y+10,'#d9ffc6',2);line(c,x+dx,y+10,x-4,y+16,'#80ffdf',2);line(c,x-4,y+16,x+6,y+27,'#62e4ff');
      }
      for(let j=0;j<7;j++){c.globalAlpha=clamp(k*2-j*.1,0,.9);rect(c,-3,-119+j*8,5,3,j%2?'#dfff9d':'#71ffd5');}
      if(k>.28&&!reduced){
        const t=(k-.28)*2.2;
        for(let j=0;j<10;j++){
          const d=j%2?1:-1,v=30+noise(j+9)*95,xx=d*(29+v*t),yy=-110-j%3*16-65*t+80*t*t;
          c.globalAlpha=clamp(1-t*.65,0,1);c.save();c.translate(xx,yy);c.rotate(d*t*(2+noise(j)));
          poly(c,[[-5,-3],[4,-5],[7,2],[-3,5]],'#41555f');line(c,-4,-3,4,-4,'#c0d2b2',2);rect(c,1,0,3,2,'#ffae65');c.restore();
        }
      }
      if(activation>0){c.globalAlpha=(1-activation)*.6;for(const d of [-1,1])line(c,d*12,-118,d*(25+activation*55),-118,'#deffb1',2);}
    }
    c.restore();
  }
  function sandi(c,b,floor,time,reduced,front=false){
    if(b.phase==='transform'){
      transformation(c,b,reduced,front);
      if(front){
        const k=clamp(b.age/b.duration,0,1),x=clamp(b.x,190,770),stage=k<.28?'装甲过载':k<.62?'限制器解除':'斯安威斯坦上线';
        rect(c,x-164,b.y-226,328,49,'#081522ec');line(c,x-164,b.y-226,x+164,b.y-226,'#97f7c4',2);
        label(c,'SANDEVISTAN // '+stage,x,b.y-208,14,'#e2ffb0');
        label(c,'连冲三次 · 看清地面锁定线',x,b.y-190,11,'#c5e9de');
        rect(c,x-164,b.y-179,328*k,2,'#baff87');
      }return;
    }
    if(!['sandiWindup','sandiRush'].includes(b.phase))return;
    const rushing=b.phase==='sandiRush',start=rushing?(b.rushStart??b.x):b.x;
    // Matches the physical swept collision envelope (50 px each end, 64 px high).
    const l=Math.max(0,Math.min(start,b.rushEnd)-50),r=Math.min(960,Math.max(start,b.rushEnd)+50);
    const locked=rushing||b.locked,color=locked?'#ffd579':'#90e9fa';
    c.save();
    if(!front){
      rect(c,l,floor-64,r-l,64,locked?'#f6b44e1c':'#65d4ec13');
      const shift=reduced||locked?0:Math.floor(b.age*35)%40;
      for(let x=l+20+shift;x<r-15;x+=40){line(c,x-b.facing*6,floor-43,x+b.facing*6,floor-33,color+'90',2);line(c,x+b.facing*6,floor-33,x-b.facing*6,floor-23,color+'90',2);}
    }else{
      // Render critical rails and labels AFTER effects, without obscuring character interiors.
      line(c,l,floor-2,r,floor-2,'#071019',7);line(c,l,floor-2,r,floor-2,color,3);
      if(!locked)c.setLineDash([8,6]);line(c,l,floor-64,r,floor-64,'#06121f',4);line(c,l,floor-64,r,floor-64,color,1);c.setLineDash([]);
      for(const x of [l,r]){line(c,x,floor-64,x,floor-50,color,2);line(c,x,floor-15,x,floor,color,2);}
      const x=clamp((l+r)/2,165,795),remain=Math.max(0,b.duration-b.age);
      rect(c,x-153,floor-214,306,42,'#081321f2');line(c,x-153,floor-214,x+153,floor-214,color,2);
      label(c,`${4-b.sandiLeft} / 3  ${rushing?'冲刺中':locked?'路径已锁定':b.controlled?'追踪目标':'追踪中'}${rushing?'':`  ${remain.toFixed(1)}s`}`,x,floor-197,13,color);
      label(c,b.controlled?(rushing?'正在冲刺 · 撞中丽贝卡可造成伤害':'锁定后自动冲刺 · 共三次'):'跳过冲刺 · 或迎面闪避',x,floor-180,10,'#e5f0ec');
      if(!rushing)rect(c,x-153,floor-173,306*clamp(remain/b.duration,0,1),2,color);
    }
    c.restore();
  }
  function scrap(c,pieces){
    for(const s of pieces){c.save();c.translate(Math.round(s.x),Math.round(s.y));c.rotate(s.angle);
      if(s.part==='launcher'){poly(c,[[-14,-8],[9,-11],[16,6],[-9,10]],'#485749');rect(c,-9,-5,18,9,'#151f27');for(let i=0;i<3;i++)rect(c,-7+i*6,-4,3,5,'#f0af6e');}
      else{poly(c,[[-10,-8],[5,-11],[11,4],[-4,9]],'#526378');line(c,-7,-5,6,3,'#acbabf',3);}
      c.restore();}
  }
  function combo(c,p){if(p.comboTimer<=0)return;c.save();c.globalAlpha=Math.min(1,p.comboTimer*3);label(c,p.comboLabel,clamp(p.x,115,845),p.y-109,12,'#e9ff9f');c.restore();}
  function contact(c,hits,reduced){
    c.save();
    for(const h of hits){
      const k=clamp(h.age/(h.heavy?.18:.12),0,1),radius=(h.heavy?26:17)*(1-k),color=h.counter?'#7ffff0':'#ffe2a2';
      c.globalAlpha=(1-k)*(reduced?.55:.9);
      for(let i=0;i<6;i++){
        const a=i*Math.PI/3+.3,inside=radius*.24;
        line(c,h.x+Math.cos(a)*inside,h.y+Math.sin(a)*inside,h.x+Math.cos(a)*radius,h.y+Math.sin(a)*radius,color,i%2?1:2);
      }
      rect(c,h.x-2,h.y-2,4,4,'#fff8dc');
      if(h.heavy&&!reduced){c.globalAlpha=(1-k)*.4;c.strokeStyle=color;c.lineWidth=1;c.beginPath();c.ellipse(h.x,h.y,5+k*25,3+k*15,0,0,Math.PI*2);c.stroke();}
    }c.restore();
  }
  function lucy(c,x,y,size=64){
    // Original pixel portrait: white asymmetric bob, cyan-pink edge light, pale face.
    c.save();c.translate(x,y);c.scale(size/32,size/32);
    rect(c,0,0,32,32,'#0e2233');poly(c,[[5,32],[8,25],[21,24],[28,32]],'#151b28');rect(c,12,22,7,7,'#d9c5d4');
    poly(c,[[7,7],[12,3],[22,4],[25,10],[23,22],[18,26],[12,23],[8,17]],'#e4cddb');
    poly(c,[[4,12],[6,4],[14,1],[23,3],[28,9],[27,21],[22,24],[23,11],[18,7],[14,15],[10,17],[8,25],[4,21]],'#e6f4f2');
    poly(c,[[4,12],[6,5],[10,3],[9,14],[7,23],[4,21]],'#a1d5df');poly(c,[[23,4],[28,9],[27,21],[24,23],[25,11]],'#e3b8d7');
    rect(c,11,16,4,1,'#47405d');rect(c,19,15,3,1,'#47405d');rect(c,12,16,2,1,'#f4b2c4');rect(c,19,15,2,1,'#86deed');rect(c,16,21,3,1,'#9f6a84');
    rect(c,10,5,10,2,'#fbfffa');line(c,8,27,12,30,'#79e8ec');line(c,23,27,22,32,'#d3a7cc');c.restore();
  }
  function victory(c,world,reduced){
    const v=world.victory;if(!v)return;const t=v.age;
    const bars=clamp(t/1.2,0,1);rect(c,0,0,960,32*bars,'#060a14');rect(c,0,540-34*bars,960,34*bars,'#060a14');
    if(t<3.8){label(c,t<1.6?'ARASAKA // SYSTEM FAILURE':'目标已清除 · 生命信号：丽贝卡 / 稳定',480,25,12,t<1.6?'#ff8993':'#88f3d8');return;}
    c.save();c.globalAlpha=clamp((t-3.8)*2,0,1);
    const stage=t<7?0:t<10.5?1:t<13.5?2:3;
    if(stage<3){
      rect(c,58,67,400,116,'#101824ed');line(c,58,67,458,67,'#72e9df',2);rect(c,58,67,3,116,'#72e9df');
      lucy(c,73,85,65);label(c,'加密通讯 / LUCY',154,91,12,'#7dece4','left');
      const text=stage===0?['丽贝卡？听得到吗？','我看到你的生命信号了。']:stage===1?['听着呢，露西。','走吧，这回一起出去。']:['撤离的路通了。','别回头，我在出口等你。'];
      label(c,stage===1?'REBECCA → LUCY':'LUCY → REBECCA',154,111,10,'#9aaebe','left');
      text.forEach((s,i)=>label(c,s,154,137+i*21,14,stage===1?'#f6f3a4':'#e8f4f5','left'));
      for(let i=0;i<10;i++)rect(c,74+i*6,159,3,reduced?6:3+noise(i+Math.floor(t*9))*9,'#6adfd6');
    }else{
      const k=clamp((t-13.5)/2,0,1);c.globalAlpha=k*.7;rect(c,0,32,960,474,'#101634');c.globalAlpha=k;
      c.fillStyle='#dce7e5';c.beginPath();c.arc(753,128,47,0,Math.PI*2);c.fill();
      rect(c,726,107,14,5,'#b5c9d0');rect(c,761,140,21,5,'#aebfcb');rect(c,741,156,9,3,'#aebfcb');
      label(c,'ANOTHER TOMORROW_',480,206,35,'#efffbe');
      label(c,'丽贝卡活着走出了公司广场。',480,240,17,'#e1edf2');
      label(c,'彩蛋结局 / 月球，也可以一起去',480,272,12,'#80dbdf');
    }
    c.restore();label(c,'ONE MORE SHOT // ALTERNATE TIMELINE',480,527,11,'#8ba6bd');
  }
  return{arena,armor,target,sandi,sandiTrails,scrap,combo,contact,victory,lucy};
})();
