(() => {
  'use strict';
  const { World,W,H,FLOOR,clamp,DIFFICULTIES,ATTACK_NAMES,makeConfig } = LastStand, $ = id => document.getElementById(id);
  const {SmasherWorld,SMASHER_ABILITIES}=LastStandSmasher;
  const canvas = $('game'), ctx = canvas.getContext('2d',{alpha:false}), audio = new ArcadeAudio();
  const keys = new Set(), touch = new Set();
  const ARROW = '<svg class="ui-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M5 19 19 5M6 5h13v13"/></svg>';
  let jumpQueued=false,dashQueued=false,reloadQueued=false,cycleQueued=false,interactQueued=false,abilityQueued=null,targetQueued=null,mode='intro',difficulty='normal',playMode='rebecca';
  let world=new World(),elapsed=0,lastFrame=0,accumulator=0,endingAt=0,messageUntil=0,hitHold=0,readyAnnounced=false;
  let tuning={},settingsDraft=null,settingsReturn='intro',settingsOpener=null;
  let reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const storage={get(k,f='0'){try{return localStorage.getItem('one-more-shot-v2-'+k)??f;}catch{return f;}},set(k,v){try{localStorage.setItem('one-more-shot-v2-'+k,String(v));}catch{}}};
  difficulty=Object.hasOwn(DIFFICULTIES,storage.get('difficulty','normal'))?storage.get('difficulty','normal'):'normal';
  playMode=storage.get('play-mode','rebecca')==='smasher'?'smasher':'rebecca';
  try{const saved=JSON.parse(storage.get('boss-tuning','{}'));if(saved&&typeof saved==='object'&&!Array.isArray(saved))tuning=saved;}catch{}
  reducedMotion=storage.get('motion',String(reducedMotion))==='true';
  const backdrop=new Image(),undercroft=new Image();let artReady=false,artFailed=false,lowerReady=false;
  backdrop.onload=()=>{artReady=true;};backdrop.onerror=()=>{artFailed=true;};backdrop.src='assets/corpo-plaza-v2.png';
  undercroft.onload=()=>{lowerReady=true;};undercroft.onerror=()=>{artFailed=true;};undercroft.src='assets/corpo-undercroft-v5.png';
  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
  function line(x,y,x2,y2,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();}
  function text(str,x,y,size=10,color='#dfcbd5',align='left'){ctx.fillStyle=color;ctx.font=`600 ${size}px Rajdhani, "Microsoft YaHei", sans-serif`;ctx.textAlign=align;ctx.fillText(str,Math.round(x),Math.round(y));}
  function visibility(id,show){$(id).classList.toggle('hidden',!show);}
  function clearInput(){keys.clear();touch.clear();jumpQueued=dashQueued=reloadQueued=cycleQueued=interactQueued=false;targetQueued=abilityQueued=null;document.querySelectorAll('.touch-controls .active').forEach(b=>b.classList.remove('active'));}
  function showMessage(message,seconds=2){$('game-message').textContent=message;messageUntil=elapsed+seconds;visibility('game-message',true);}
  function customConfig(c,key=difficulty){return ['bossHp','pace','warning','arsenal'].some(k=>c[k]!==DIFFICULTIES[key][k]);}
  function bestKey(){const c=makeConfig(difficulty,tuning);return 'best-v6-'+playMode+'-'+difficulty+(customConfig(c)?'-'+[c.bossHp,c.pace,c.warning,c.arsenal].join('_'):'');}
  function updateBest(){const c=makeConfig(difficulty,tuning);$('best-score').textContent=String(storage.get(bestKey())).padStart(6,'0');$('best-mode').textContent=(playMode==='smasher'?'重锤·':'丽贝卡·')+c.name+(customConfig(c)?'·自定义':'');$('difficulty-toggle').disabled=!['intro','playing','paused'].includes(mode);}
  const normalCopy={guide:$('controls-guide').innerHTML,tips:$('tips-copy').innerHTML,caption:$('character-caption').innerHTML,mission:$('intro-mission').innerHTML};
  function selectMode(value){
    playMode=value==='smasher'?'smasher':'rebecca';storage.set('play-mode',playMode);const sm=playMode==='smasher';
    document.body.classList.toggle('smasher-mode',sm);
    document.querySelectorAll('[data-mode]').forEach(b=>{const selected=b.dataset.mode===playMode;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',selected);});
    $('intro-line').textContent=sm?'全武装上线。接管战场。':'这次，换你倒下。';
    $('intro-mission').innerHTML=sm?'操纵亚当·重锤，对战 AI 丽贝卡。<br>轮换臂炮、导弹、下砸和斯安威斯坦，压制她的走位。':normalCopy.mission;
    $('intro-objective').textContent=sm?'击败 AI 丽贝卡，维持义体运作':'击败亚当·重锤，互动处决';
    $('character-caption').innerHTML=sm?'亚当·重锤 <span>ADAM SMASHER / FULL BORG</span><small>六种武装 · 手动控制</small>':normalCopy.caption;
    $('controls-guide').innerHTML=sm?'<div><kbd>A</kbd><kbd>D</kbd><span>移动</span></div>'+SMASHER_ABILITIES.map(a=>`<div><kbd>${a.key}</kbd><span>${a.name}</span></div>`).join('')+'<div><kbd>P</kbd><span>暂停</span></div>':normalCopy.guide;
    $('tips-title').textContent=sm?'武装接管':'进攻连招';
    $('tips-copy').innerHTML=sm?'先用 <em>J 臂炮 / K 导弹</em> 逼迫走位，再用 <em>SPACE 下砸 / Q 斯安威斯坦</em> 追击。<em>R 防御</em> 短暂减伤 80%；技能分别冷却，攻击期间无法同时启动其他武装。AI 丽贝卡会开枪、跳跃和闪避，难度越高反应越快。':normalCopy.tips;
    $('player-name').textContent=sm?'ADAM SMASHER':'REBECCA';$('boss-name-label').innerHTML=sm?'丽贝卡 <b>REBECCA / AI</b>':'亚当·重锤 <b>ADAM SMASHER</b>';
    document.querySelector('.weapon-hud').classList.toggle('hidden',sm);
    $('pause-settings').textContent=sm?'调整对战难度':'调整重锤难度';$('settings-title').textContent=sm?'对战难度':'重锤难度';
    $('result-dodges').previousElementSibling.textContent=sm?'命中次数':'完美闪避';
    const names=sm?{reload:'防御',shoot:'臂炮',heavy:'导弹',jump:'下砸',dash:'冲刺'}:{reload:'换弹',shoot:'射击',heavy:'重霰弹',jump:'跳跃',dash:'闪避'};
    document.querySelectorAll('.touch-controls button').forEach(b=>{const key=b.dataset.action||b.dataset.hold;if(names[key])b.textContent=names[key];});
    document.querySelectorAll('[data-difficulty]').forEach((b,i)=>{b.querySelector('small').textContent=sm?['AI 8 格生命','AI 10 格生命','AI 12 格生命','AI 14 格生命'][i]:['5 格生命','4 格生命','3 格生命','一击致命'][i];});
    const hints=[$('boss-hp').nextElementSibling,$('boss-pace').nextElementSibling,$('boss-warning').nextElementSibling];
    hints[0].textContent=sm?'操纵重锤时，这是你的装甲总量':'数值越高，需要更多次反击';
    hints[1].textContent=sm?'影响你的移动、冲刺与弹丸速度':'影响攻击间隔、冲刺与弹丸速度';
    hints[2].textContent=sm?'你的攻击蓄力时长；越长，AI 越容易躲避':'数值越高，留给你的反应时间越长';
    $('boss-arsenal').disabled=sm;$('boss-arsenal').parentElement.classList.toggle('hidden',sm);
    canvas.setAttribute('aria-label',sm?'操纵重锤：A D 移动，J 臂炮，K 导弹，空格下砸，Shift 冲刺，Q 斯安威斯坦，R 防御，P 暂停。':'操纵丽贝卡：A D 移动，空格跳跃，Shift 闪避，J 射击，K 重霰弹，R 换弹。重锤跪倒后靠近按 E 处决。');
    if(mode==='intro')$('mission-status').textContent=sm?'目标：击败 AI 丽贝卡 / 全武装手动控制':'目标：击败亚当·重锤，改写结局';
    if(readyAnnounced)$('start-hint').textContent=sm?'ENTER 开始 / 技能键也可点击屏幕武装栏':'ENTER 开始 / 重锤跪倒后靠近按 E 处决';
    selectDifficulty(difficulty,false);
  }
  function selectDifficulty(value,reset=true){
    difficulty=Object.hasOwn(DIFFICULTIES,value)?value:'normal';if(reset)tuning={};
    storage.set('difficulty',difficulty);storage.set('boss-tuning',JSON.stringify(tuning));updateBest();
    const c=makeConfig(difficulty,tuning);$('difficulty-summary').textContent=`${c.name}${customConfig(c)?'·自定义':''} / ${playMode==='smasher'?'自身装甲':'重锤装甲'} ${c.bossHp} · 速度 ${Math.round(c.pace*100)}%`;
    document.querySelectorAll('[data-difficulty]').forEach(b=>{const yes=b.dataset.difficulty===difficulty;b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',yes);});
  }
  function updateSettings(syncInputs=false){
    const c=makeConfig(settingsDraft.difficulty,settingsDraft.tuning);
    if(syncInputs){$('boss-hp').value=c.bossHp;$('boss-pace').value=Math.round(c.pace*100);$('boss-warning').value=Math.round(c.warning*100);$('boss-arsenal').checked=c.arsenal==='full';}
    $('boss-hp-value').textContent=c.bossHp;$('boss-pace-value').textContent=Math.round(c.pace*100)+'%';$('boss-warning-value').textContent=Math.round(c.warning*100)+'%';
    $('settings-summary').textContent=playMode==='smasher'?`${c.name} / AI 丽贝卡 ${[8,10,12,14][c.rank]} 格生命 · ${['较慢','标准','快速','极快'][c.rank]}反应 · 六种武装均开放`:`${c.name}${customConfig(c,settingsDraft.difficulty)?' · 自定义':''} / 丽贝卡 ${c.playerHp===1?'一击致命':c.playerHp+' 格生命'} · ${c.supplies?'有医疗补给':'无医疗补给'}`;
    document.querySelectorAll('[data-setting-preset]').forEach(b=>{const yes=b.dataset.settingPreset===settingsDraft.difficulty;b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',yes);});
  }
  function openSettings(){
    if(!['intro','playing','paused'].includes(mode))return;
    settingsOpener=document.activeElement;if(mode==='playing')pause();settingsReturn=mode==='paused'?'paused':'intro';
    settingsDraft={difficulty,tuning:{...tuning}};mode='settings';clearInput();visibility('pause-screen',false);visibility('game-message',false);visibility('settings-screen',true);
    $('settings-context').textContent=settingsReturn==='paused'?'修改后会重新开局；取消可继续当前战斗。':playMode==='smasher'?'预设影响 AI 强度；下方可调整你的装甲和武装参数。':'选择预设，或单独调整重锤的战斗参数。';
    $('settings-apply').textContent=settingsReturn==='paused'?'应用并重新挑战':'应用设置';updateSettings(true);$('settings-close').focus({preventScroll:true});
  }
  function closeSettings(){
    if(mode!=='settings')return;
    visibility('settings-screen',false);mode=settingsReturn;settingsDraft=null;updateBest();
    if(mode==='paused'){visibility('pause-screen',true);$('resume').focus({preventScroll:true});}
    else if(settingsOpener instanceof HTMLElement)settingsOpener.focus({preventScroll:true});
  }
  function readSettings(){return {bossHp:Number($('boss-hp').value),pace:Number($('boss-pace').value)/100,warning:Number($('boss-warning').value)/100,arsenal:$('boss-arsenal').checked?'full':'basic'};}
  function applySettings(){const restart=settingsReturn==='paused';tuning=readSettings();selectDifficulty(settingsDraft.difficulty,false);closeSettings();if(restart)start();}
  function setMotion(){document.body.classList.toggle('reduced-motion',reducedMotion);$('motion-toggle').setAttribute('aria-pressed',reducedMotion);$('motion-label').textContent=reducedMotion?'弱':'开';storage.set('motion',reducedMotion);}
  function start(){
    if(!artReady||!lowerReady||!PixelArt.ready)return;
    clearInput();world=playMode==='smasher'?new SmasherWorld(difficulty,Date.now(),tuning):new World(difficulty,Date.now(),tuning);mode='playing';accumulator=0;hitHold=0;audio.resetScene();audio.setPaused(false);audio.active=true;
    for(const id of ['intro','pause-screen','result-screen','settings-screen','ending-controls'])visibility(id,false);
    visibility('hud',true);visibility('pause-button',true);$('system-state').textContent='战斗连接';
    $('mission-status').textContent=playMode==='smasher'?'目标：击败 AI 丽贝卡 / Q 斯安威斯坦 · R 装甲防御':'目标：击败重锤 / 装甲归零后靠近按 E 处决';
    canvas.focus({preventScroll:true});showMessage(playMode==='smasher'?'义体接管 / A D 移动，选择武装发动攻击':'重锤就在上方 / 等落点锁定，再按 SHIFT 闪避！',playMode==='smasher'?3:world.boss.duration);updateHud();
  }
  function pause(){if(mode!=='playing')return;mode='paused';clearInput();audio.active=false;audio.setPaused(true);visibility('execute-button',false);visibility('pause-screen',true);visibility('game-message',false);$('system-state').textContent='连接挂起';$('resume').focus({preventScroll:true});}
  function resume(){if(mode!=='paused')return;mode='playing';clearInput();accumulator=0;audio.setPaused(false);audio.active=true;visibility('pause-screen',false);$('system-state').textContent='战斗连接';canvas.focus({preventScroll:true});}
  function home(){mode='intro';clearInput();audio.active=false;audio.resetScene();audio.setPaused(false);for(const id of ['hud','pause-button','pause-screen','result-screen','game-message','ending-controls','execute-button'])visibility(id,false);visibility('intro',true);$('system-state').textContent='神经连接待命';selectMode(playMode);$('start').focus({preventScroll:true});}
  function completeEnding(){mode='result';visibility('ending-controls',false);visibility('result-screen',true);visibility('hud',false);$('retry').focus({preventScroll:true});}
  function replayEnding(){if(!world.victory)return;world.victory={age:0,pulse:0,commStage:-1};world.boss.age=0;endingAt=elapsed;mode='ending';visibility('result-screen',false);visibility('ending-controls',true);$('skip-ending').disabled=true;}
  function updateCinematic(){
    const t=world.victory?.age||0;
    const caption=t<2.5?'神经链接中断 / 目标已清除':t<4?'丽贝卡：生命信号稳定':t<7?'露西：丽贝卡？……听得到吗？你的生命信号还在。':t<10.5?'丽贝卡：听得到，露西。这回，我们一起离开。':t<13.5?'露西：撤离路线已打开。别回头，我在出口等你。':'彩蛋结局 / 月球不是一个人的终点';
    if($('ending-caption').textContent!==caption)$('ending-caption').textContent=caption;
    $('skip-ending').disabled=t<2.5;
  }
  function finish(){
    mode='ending';endingAt=elapsed;clearInput();audio.active=false;visibility('pause-button',false);visibility('game-message',false);visibility('execute-button',false);
    const won=world.status==='won',sm=world.gameMode==='smasher',score=Math.floor(world.score),best=Number(storage.get(bestKey()));
    visibility('ending-controls',!!world.victory);visibility('replay-ending',!!world.victory);if(world.victory){visibility('hud',false);updateCinematic();}
    if(score>best)storage.set(bestKey(),score);
    $('result-tag').textContent=won?'TARGET ELIMINATED / 结局改写':'FLATLINE / 连接中断';
    $('result-screen').classList.toggle('scene-result',sm||!won);
    $('result-screen').classList.toggle('scene-on-right',(sm?world.boss.x:world.death?.x)>W/2);
    $('result-title').textContent=sm?(won?'目标已清除。':'义体离线。'):won?'重锤，倒下了。':'再给她一次机会。';
    $('result-description').textContent=sm?(won?`丽贝卡已被击败。重锤剩余装甲 ${Math.ceil(world.boss.hp)}。武装控制记录已保存。`:'丽贝卡击穿了你的装甲。轮换远近武器，保留 R 防御来抵挡霰弹反击。'):won?'装甲归零。丽贝卡扣下了最后一次扳机。这条时间线，她活着离开。':'等落点锁定再闪避。落地的那一瞬间，把霰弹还给他。';
    $('result-time').textContent=world.time.toFixed(1)+'s';$('result-score').textContent=String(score).padStart(4,'0');$('result-dodges').textContent=String(sm?world.maxHp-world.player.hp:world.dodges).padStart(2,'0');
    $('record-message').textContent=score>best?'↑ 新的街头纪录 / NEW RECORD':`本模式最高纪录 ${String(best).padStart(6,'0')}`;
    $('retry').innerHTML=(won?'再战夜之城':'重新接入')+' '+ARROW;
    $('system-state').textContent=won?'威胁已清除':sm?'义体连接中断':'生命信号中断';$('mission-status').textContent=won?(sm?'任务完成：AI 丽贝卡已被击败':'任务完成：亚当·重锤已被击败'):'任务失败 / ENTER 重新尝试';updateBest();
  }
  function updateHud(){
    const p=world.player,b=world.boss;
    const sm=world.gameMode==='smasher';visibility('smasher-abilities',sm);visibility('execute-button',mode==='playing'&&!sm&&world.canExecute());
    if(sm){
      const armor=clamp(b.hp/b.maxHp,0,1),enemy=clamp(p.hp/world.maxHp,0,1),cd=world.abilityCooldowns;
      $('timer').textContent=world.time.toFixed(1);$('life-text').textContent=`${Math.ceil(b.hp)} / ${b.maxHp}`;
      [...$('health').children].forEach((el,i)=>{el.style.display='';el.classList.toggle('empty',i>=Math.ceil(armor*5));});
      $('dash-fill').style.width=(1-cd.rush/4)*100+'%';$('dash-label').textContent=cd.rush>0?`冲刺冷却 ${cd.rush.toFixed(1)}s`:'义体冲刺就绪 / SHIFT';
      $('score').textContent=String(Math.floor(world.score)).padStart(6,'0');$('boss-fill').style.width=enemy*100+'%';$('boss-percent').textContent=`${p.hp} / ${world.maxHp}`;$('boss-percent').title='AI 丽贝卡生命';
      $('phase-label').textContent=world.status==='won'?'目标已清除':world.status==='lost'?'自身装甲归零':world.guardRemaining>0?'装甲防御 / 减伤 80%':b.phase==='controlledIdle'?'手动控制 / 选择武装':b.phase==='recover'?'义体恢复中 / R 可防御':`${ATTACK_NAMES[b.attack]||'武装'} / 正在执行`;
      $('counter-hud').classList.toggle('ready',world.guardRemaining>0);$('combo').textContent=world.guardRemaining>0?'装甲防御已展开':'全武装手动接管';$('counter-label').textContent=world.guardRemaining>0?`减伤 80% / ${world.guardRemaining.toFixed(1)}s`:cd.guard>0?`防御冷却 ${cd.guard.toFixed(1)}s`:'R / 短暂装甲防御';
      document.querySelectorAll('[data-smasher-ability]').forEach(button=>{const id=button.dataset.smasherAbility,cooldown=cd[id],active=id==='guard'?world.guardRemaining>0:b.attack===id&&!['controlledIdle','recover','controlledVictory','kneel'].includes(b.phase),busy=id==='guard'?!['controlledIdle','recover'].includes(b.phase):b.phase!=='controlledIdle'||world.guardRemaining>0;button.disabled=mode!=='playing'||cooldown>0||busy;button.classList.toggle('cooling',cooldown>0);button.classList.toggle('active',active);button.querySelector('.ability-state').textContent=active?'执行中':cooldown>0?cooldown.toFixed(1)+'s':busy?'待命':'就绪';});
      return;
    }
    $('timer').textContent=world.time.toFixed(1);$('life-text').textContent=`0${p.hp} / 0${world.maxHp}`;
    [...$('health').children].forEach((el,i)=>{el.classList.toggle('empty',i>=p.hp);el.style.display=i<world.maxHp?'':'none';});
    $('dash-fill').style.width=clamp(1-p.dashCd/1.05,0,1)*100+'%';$('dash-label').textContent=p.dashCd>0?`冷却 ${p.dashCd.toFixed(1)}s`:'闪避就绪 / SHIFT';
    $('score').textContent=String(Math.floor(world.score)).padStart(6,'0');$('boss-fill').style.width=b.hp/b.maxHp*100+'%';$('boss-percent').textContent=Math.ceil(b.hp/b.maxHp*100)+'%';
    $('boss-percent').title=`装甲 ${Math.ceil(b.hp)} / ${b.maxHp}`;
    const telegraph=['windup','target','drop','cannonAim','cannonFire','rushWindup','rush','barrageWindup','barrageFire','sandiWindup','sandiRush'].includes(b.phase);
    $('phase-label').textContent=world.downed?(world.execution?'最后一枪 / 处决演出':'义体瘫痪 / 靠近按 E 处决'):b.opening?`首次下砸 / 预警 ${Math.max(0,b.duration-b.age).toFixed(1)}s`:b.phase==='transform'?(world.arena==='plaza'?'二阶段 / 地板崩塌转场':'二阶段 / 斯安威斯坦启动'):b.phase==='recover'?`装甲破绽 ×2.4${world.parts.legs.broken?' / 腿甲破坏：硬直延长':''}`:telegraph?`${ATTACK_NAMES[b.attack]}${b.attack==='double'?' · 连击':''} / ${world.config.name}`:b.overdrive?'二阶段 / 义体超频':['01 / 装甲完整','02 / 火力压制','03 / 超载暴走'][world.phase];
    for(const button of document.querySelectorAll('[data-target]')){
      const part=button.dataset.target,item=world.parts[part],name=part==='core'?'躯干':part==='launcher'?'导弹架':'腿甲';
      button.textContent=name+(item?(item.broken?' 已毁':` ${Math.ceil(item.hp/item.maxHp*100)}%`):'');button.classList.toggle('selected',p.target===part);button.setAttribute('aria-pressed',p.target===part);button.disabled=!!item?.broken||!!world.transition||!!world.downed;
    }
    $('difficulty-toggle').disabled=!['intro','playing','paused'].includes(mode);
    $('ammo').textContent=String(p.ammo).padStart(2,'0');$('weapon-state').textContent=p.reload>0?`换弹 ${p.reload.toFixed(1)}s`:p.counter>0?'反击强化':'已就绪';
    [...$('ammo-track').children].forEach((el,i)=>el.classList.toggle('empty',i>=p.ammo));
    $('counter-hud').classList.toggle('ready',p.counter>0);$('combo').textContent=world.combo>0?`完美闪避 × ${world.combo}`:'反击系统待命';
    $('counter-label').textContent=p.counter>0?`下一枪 ×2.5 / ${p.counter.toFixed(1)}s`:'闪避 → 反击';
  }
  function handleEvents(){
    for(const e of world.events.splice(0)){
      audio.play(e.type==='hit'?(e.counter?'counter-hit':e.heavy?'heavy-hit':'hit'):e.type);
      if(e.type==='hit'&&!reducedMotion)hitHold=Math.max(hitHold,e.heavy?.045:.022);
      if(world.gameMode==='smasher'){
        if(e.type==='smasher-guard')showMessage('装甲防御 / 0.85 秒内减伤 80%',.85);
        if(e.type==='smasher-hit'){if(!reducedMotion)hitHold=Math.max(hitHold,.045);showMessage('命中目标 / 轮换武装继续压制',.8);}
        if(e.type==='ai-perfect')showMessage('丽贝卡完美闪避 / 注意强化反击',1.1);
        if(e.type==='part-broken')showMessage(e.part==='launcher'?'肩部导弹架损毁 / 齐射削弱':'腿部装甲损毁 / 恢复变慢',2);
        if(e.type==='interrupt')showMessage('蓄力被丽贝卡打断 / 等待义体恢复',1.4);
        if(e.type==='smasher-ability')showMessage(SMASHER_ABILITIES.find(a=>a.id===e.ability).name+' / 武装执行',.9);
        if(e.type==='lost'||e.type==='won')finish();
        continue;
      }
      if(e.type==='boss-downed'){hitHold=0;showMessage('重锤义体瘫痪 / 靠近后按 E 互动处决',4);$('mission-status').textContent='最后一枪 / 靠近跪倒的重锤，按 E 处决';}
      if(e.type==='execution-start'){hitHold=0;visibility('game-message',false);}
      if(e.type==='execution-shot'&&!reducedMotion)hitHold=Math.max(hitHold,.045);
      if(e.type==='perfect')showMessage('完美闪避 / 下一枪 2.5 倍伤害！',1.4);
      if(e.type==='phase')showMessage(e.phase===1?'装甲破损 / 注意远程火力':'装甲濒毁 / 抓住反击机会',2);
      if(e.type==='transform-charge'){hitHold=0;showMessage('重锤正在蓄力 / 广场承重结构即将崩溃',1.15);}
      if(e.type==='floor-break')showMessage('地面崩塌 / 正在坠入下层空间',1.6);
      if(e.type==='underworld-land')showMessage('抵达下层 / 准备迎战二阶段',1.1);
      if(e.type==='overdrive')showMessage('斯安威斯坦上线 / 锁定提示音后跳跃或闪避',2.2);
      if(e.type==='arena-ready')showMessage('二阶段开始 / 三次连击，每次都有锁定预警',1.4);
      if(e.type==='part-broken')showMessage(e.part==='launcher'?'导弹架摧毁 / 齐射削弱至 1 枚':'腿甲击穿 / 落地与攻击硬直延长',2.6);
      if(e.type==='interrupt')showMessage('蓄力打断 / 趁现在继续反击！',1.4);
      if(e.type==='floor-warning')showMessage('玻璃即将塌陷 / 离开橙色裂纹区域',1.3);
      if(e.type==='rescued')showMessage('应急牵引完成 / 留意脚下缺口',1.5);
      if(e.type==='pickup-spawn')showMessage('医疗补给已投放 / 拾取绿色医疗包',2);
      if(e.type==='heal')showMessage('生命恢复 / KEEP GOING',1.2);
      if(e.type==='attack')showMessage(({stomp:'锁定下砸 / 红框固定后闪避',double:'二连下砸 / 第一击后继续移动',cannon:'瞄准炮击 / 炮线锁定后再躲',rush:'义体冲刺 / 跳起或迎面闪避',barrage:'导弹齐射 / 离开标记，寻找间隙',sandevistan:'斯安威斯坦 / 三次路径锁定连击'})[e.attack],1.4);
      if(e.type==='combo')showMessage('第二次下砸 / 继续躲开落点！',1.2);
      if(e.type==='lost'||e.type==='won')finish();
    }
  }
  function background(){
    if(artReady)DescentFX.background(ctx,(mode==='intro'||mode==='settings'&&settingsReturn==='intro')?{arena:'plaza'}:world,backdrop,undercroft,{reducedMotion,time:elapsed});else rect(0,0,W,H,'#15172b');
    const fog=ctx.createLinearGradient(0,400,0,H);fog.addColorStop(0,'#0b102100');fog.addColorStop(1,'#0b10216b');ctx.fillStyle=fog;ctx.fillRect(0,400,W,140);
    for(let i=0;i<22;i++){const x=(i*131+elapsed*(2+i%4))%W,y=120+((i*67-elapsed*(2+i%3))%310+310)%310;rect(x,y,1,1,i%3?'#c3beed55':'#d8c78d88');}
  }
  function shadow(x,size=30,alpha=.4){ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#090a1c';ctx.beginPath();ctx.ellipse(x,FLOOR+1,size,5,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  function introArt(){
    if(playMode==='smasher'){
      shadow(673,72,.65);PixelArt.smasher(ctx,673,450,{size:295,facing:-1,phase:'controlledIdle',age:elapsed});
      line(576,454,788,454,'#f4ed72',2);text('ADAM SMASHER // FULL BORG',681,122,11,'#f4ed72','center');
      PixelArt.rebecca(ctx,835,448,{size:92,facing:-1,anim:elapsed});text('REBECCA / AI',834,470,9,'#8cf6d5','center');return;
    }
    const by=245+Math.sin(elapsed*1.4)*5;
    ctx.save();ctx.globalAlpha=.35;line(644,25,644,410,'#ff4e69');for(let y=60;y<400;y+=35){line(634,y,644,y+7,'#ff4e69');line(654,y,644,y+7,'#ff4e69');}ctx.restore();
    PixelArt.smasher(ctx,640,by,{size:247,facing:-1,phase:'drop',age:elapsed,alpha:.94});
    text('ARASAKA // ADAM SMASHER',801,by+10,10,'#ff728b','center');
    shadow(639,50,.6);PixelArt.rebecca(ctx,628,445,{size:184,anim:elapsed, facing:1});
    line(568,454,728,454,'#6affdf');rect(566,450,3,9,'#6affdf');
  }
  function drawTarget(){
    const b=world.boss;if(b.phase!=='target'&&b.phase!=='drop')return;
    const x=b.target,locked=b.locked,color=locked?'#ff526c':'#f9b371';
    ctx.save();ctx.globalAlpha=reducedMotion?.75:.6+Math.sin(elapsed*(locked?25:6))*.15;
    rect(x-67,224,134,FLOOR-224,locked?'#ff344a1c':'#ffa4510d');line(x-67,224,x-67,FLOOR,color);line(x+67,224,x+67,FLOOR,color);
    rect(x-67,FLOOR-4,134,4,color);for(let xx=x-60;xx<x+60;xx+=16)line(xx,FLOOR+5,xx+8,FLOOR+12,color,2);ctx.restore();
    const labelY=b.opening?Math.min(FLOOR-116,b.y+25):255;
    text(locked?(b.controlled?'落点锁定 / 下砸执行':'!! 落点锁定 !!'):b.opening?'重锤正在头顶 / 准备闪避':b.controlled?'追踪丽贝卡 / 落点即将锁定':'目标追踪',x,labelY,11,color,'center');
    if(b.phase==='target'){rect(x-30,labelY+9,60,3,'#251522');rect(x-30,labelY+9,60*Math.max(0,1-b.age/b.duration),3,color);}
    if(locked)text('▼',x,FLOOR-20,16,color,'center');
  }
  function muzzle(p,x,y){
    if(p.muzzle<=0)return;
    const tip=PixelArt.muzzlePoint(x,y,p);
    ctx.save();ctx.translate(tip.x,tip.y);ctx.rotate(tip.angle);
    ctx.scale(p.heavy?1.35:1,p.heavy?1.2:1);
    ctx.fillStyle='#ff9b3d';ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(14,-4);ctx.lineTo(25,-11);ctx.lineTo(21,0);ctx.lineTo(37,2);ctx.lineTo(20,5);ctx.lineTo(24,13);ctx.lineTo(11,6);ctx.lineTo(0,8);ctx.fill();
    rect(0,-3,p.heavy?31:23,6,'#fffac4');ctx.restore();
  }
  function drawAttackWarnings(){
    const b=world.boss;
    if(b.phase==='cannonAim'){
      const x=b.x+b.facing*46,y=b.y-91,angle=Math.atan2(b.aimY-y,b.aimX-x),color=b.locked?'#ff5366':'#ffc776';
      ctx.save();ctx.globalAlpha=b.locked?.85:.55;ctx.setLineDash([8,6]);line(x,y,x+Math.cos(angle)*1100,y+Math.sin(angle)*1100,color,b.locked?2:1);ctx.setLineDash([]);
      for(const dir of [-1,1]){line(b.aimX+dir*14,b.aimY-12,b.aimX+dir*14,b.aimY+12,color);line(b.aimX-12,b.aimY+dir*14,b.aimX+12,b.aimY+dir*14,color);}
      ctx.restore();text(b.locked?(b.controlled?'射线锁定 / 臂炮发射':'炮击已锁定 / 躲开射线'):b.controlled?'正在瞄准丽贝卡':'炮击瞄准中',clamp(b.aimX,120,840),b.aimY-26,11,color,'center');
    }
    if(b.phase==='rushWindup'||b.phase==='rush'){
      const left=Math.min(b.x,b.rushEnd)-35,right=Math.max(b.x,b.rushEnd)+35,color=b.locked?'#ff5366':'#ffb972';
      rect(left,FLOOR-64,right-left,64,'#ff475318');line(left,FLOOR-2,right,FLOOR-2,color,3);
      for(let x=left+22;x<right-15;x+=45){const tip=x+b.facing*10;line(x-b.facing*6,FLOOR-41,tip,FLOOR-32,color,2);line(tip,FLOOR-32,x-b.facing*6,FLOOR-23,color,2);}
      if(b.phase==='rushWindup')text(b.controlled?'冲刺路径 / 锁定后自动突进':'冲刺路径 / 跳跃或闪避',clamp((left+right)/2,130,830),FLOOR-95,11,color,'center');
    }
  }
  function drawWorld(alpha){
    const p=world.player,b=world.boss,tr=world.transition,pose=tr?DescentFX.characterOffsets(world,reducedMotion):null,falling=tr&&tr.age>=tr.breakAt&&tr.age<tr.landAt;
    const px=pose?pose.player.x:p.prevX+(p.x-p.prevX)*alpha,py=pose?pose.player.y:p.prevY+(p.y-p.prevY)*alpha,bx=pose?pose.boss.x:b.prevX+(b.x-b.prevX)*alpha,by=pose?pose.boss.y:b.prevY+(b.y-b.prevY)*alpha;
    const visualBoss=tr?{...b,x:bx,y:by,age:clamp(tr.age-3.05,0,2.35),duration:2.35}:b,activation=!tr||tr.age>=3.6;
    if(!falling)ExpansionFX.arena(ctx,world.floor,FLOOR,elapsed,reducedMotion);
    if(!falling)for(const cr of world.cracks){if(world.floorAt(cr.x).state==='hole')continue;ctx.save();ctx.globalAlpha=Math.min(.6,cr.life/4);for(let i=0;i<8;i++){const a=i*Math.PI/4+cr.seed;const xx=cr.x+Math.cos(a)*(35+i*6),yy=FLOOR+Math.sin(a)*(7+i*2);line(cr.x,FLOOR,xx,yy,'#a2c1e7');line(xx,yy,xx+Math.cos(a+.5)*17,yy+Math.sin(a)*7,'#6d82b0');}ctx.restore();}
    drawTarget();
    drawAttackWarnings();
    if(activation)ExpansionFX.sandi(ctx,visualBoss,FLOOR,elapsed,reducedMotion);
    CombatFX.deathGround(ctx,world.death,FLOOR);
    for(const m of world.missiles){
      if(m.exploded)continue;const remaining=(m.fuse||1.2)-m.age,r=m.radius||38;
      ctx.fillStyle='#ff614322';ctx.strokeStyle='#ff9e6d';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(m.x,FLOOR,r,9,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      text('+',m.x,FLOOR-12,21,'#ff9e6d','center');
      if(remaining>.35)text(`导弹 ${Math.max(0,remaining).toFixed(1)}s`,m.x,FLOOR-37,10,'#ffba8e','center');
      else{const y=FLOOR-remaining/.35*400;line(m.x,y-55,m.x,y-15,'#ff9d4e',3);rect(m.x-3,y-15,6,17,'#aeb5c7');rect(m.x-2,y-32,4,18,'#ffaf4c');rect(m.x-1,y-29,2,11,'#fff2b2');}
    }
    if(!falling)for(const item of world.pickups){const y=FLOOR-18+Math.sin(item.age*4)*3;shadow(item.x,15,.3);rect(item.x-9,y-9,18,18,'#162839');rect(item.x-7,y-7,14,14,'#66eabb');rect(item.x-2,y-5,4,10,'#112a28');rect(item.x-5,y-2,10,4,'#112a28');text('HP',item.x,y-18,10,'#95ffd4','center');}
    if(!world.death)for(const t of world.trails)PixelArt.rebecca(ctx,t.x,t.y,{facing:t.facing,dash:true,alpha:t.life/.22*.28});
    ExpansionFX.sandiTrails(ctx,world.bossTrails,b,PixelArt,reducedMotion);
    if(!falling)shadow(bx,56,b.phase==='recover'?.6:.2);
    if(b.phase==='drop'&&!reducedMotion){for(let i=1;i<4;i++)PixelArt.smasher(ctx,bx,by-i*28,{phase:'drop',facing:p.x<b.x?-1:1,alpha:.1/i});for(let i=0;i<6;i++)line(bx-55+i*22,by-200,bx-55+i*22,by-90,'#f56a7b55',2);}
    const bossFacing=['cannonAim','cannonFire','rushWindup','rush','barrageWindup','barrageFire','sandiWindup','sandiRush','kneel','execute','dead','controlledIdle','controlledVictory'].includes(b.phase)?b.facing:p.x<b.x?-1:1;
    PixelArt.smasher(ctx,bx,by,{phase:pose?.boss.phase||b.phase,age:pose?.boss.age??b.age,facing:bossFacing,hit:b.stagger>0,launch:b.launch>0,moving:Math.abs(b.vx||0)>5});
    if(!['dead','kneel','execute'].includes(b.phase)&&(!tr||tr.age>=tr.landAt))ExpansionFX.armor(ctx,{...b,facing:bossFacing},world.parts,bx,by,elapsed,reducedMotion);
    if(!tr&&!world.downed&&world.gameMode!=='smasher')ExpansionFX.target(ctx,world,elapsed);if(!falling)ExpansionFX.scrap(ctx,world.scrap);
    if(b.guard>0){ctx.save();ctx.globalAlpha=.6;ctx.strokeStyle='#8cebdc';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(bx,by-80,70,91,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;text('ARMOR GUARD / 80%',bx,by-185,10,'#c1fff2','center');ctx.restore();}
    if(world.gameMode==='smasher'&&mode==='playing'){text('▼ YOU',bx,by-201,10,'#f4ed72','center');text('AI',px,py-105,9,'#82f4d2','center');}
    if(b.phase==='cannonAim'||b.phase==='cannonFire'){
      rect(bx+bossFacing*35-(bossFacing<0?23:0),by-96,23,11,'#131c2b');rect(bx+bossFacing*39-(bossFacing<0?16:0),by-94,16,5,'#526379');
      if(b.launch>0&&b.phase==='cannonFire')line(bx+bossFacing*48,by-91,bx+bossFacing*74,by-91,'#ffe2a1',5);
    }
    if(b.phase==='recover'&&mode==='playing'){text(b.controlled?'义体恢复 / R 可防御':'装甲破绽 ×2.4',bx,FLOOR-181,10,'#fff093','center');line(bx-24,FLOOR-174,bx+24,FLOOR-174,'#fff093');}
    if(!world.death){
      if(!falling)shadow(px,26,Math.max(.12,.45-(FLOOR-py)/250));
      const blink=p.invulnerable>.26&&!reducedMotion&&Math.floor(elapsed*18)%2;
      PixelArt.rebecca(ctx,px,py,{facing:p.dash>0?p.dashDir:p.facing,anim:p.anim,moving:Math.abs(p.vx)>15,airborne:falling||p.y<FLOOR-4,dash:p.dash>0,shoot:p.recoil>.03,recoil:p.recoil,heavy:p.heavy,reload:p.reload,alpha:blink?.45:1,holster:world.victory?clamp((world.victory.age-2.7)/1.1,0,1):0});muzzle(p,px,py);
      if(p.falling>0){line(px,py-70,px+(px<480?-70:70),FLOOR-110,'#78f7ef',2);text('应急牵引',px,FLOOR-95,10,'#91f8df','center');}
      if(p.dash>0){line(px-p.dashDir*90,py-20,px-p.dashDir*30,py-20,'#6effec',2);line(px-p.dashDir*65,py-36,px-p.dashDir*26,py-36,'#9dfff4');}
    }
    for(const s of world.shots)line(s.x,s.y,s.x-s.vx*.018,s.y-s.vy*.018,s.counter?'#80ffee':'#fff0ac',s.heavy?2:1.4);
    for(const s of world.enemyShots){line(s.x,s.y,s.x-s.vx*.035,s.y-s.vy*.035,'#ff7a5c',4);line(s.x,s.y,s.x-s.vx*.02,s.y-s.vy*.02,'#fff0a4',2);}
    if(!falling)for(const ring of world.rings)CombatFX.impactRing(ctx,ring,FLOOR,reducedMotion);
    for(const w of world.waves)CombatFX.shockwave(ctx,w,FLOOR,reducedMotion);
    for(const q of world.particles){if(q.kind==='glass')CombatFX.glassParticle(ctx,q);else{ctx.globalAlpha=Math.min(1,q.life*3);rect(q.x,q.y,q.size,q.size,q.color);}}ctx.globalAlpha=1;
    CombatFX.deathFragments(ctx,world.death,reducedMotion);
    ExpansionFX.contact(ctx,world.hitSparks,reducedMotion);
    ExpansionFX.combo(ctx,p);
    for(const n of world.numbers){ctx.globalAlpha=Math.min(1,n.life*3);text((n.counter?'CRIT ':'')+Math.round(n.value),n.x,n.y,18,n.counter?'#69fff2':'#fff38d','center');}ctx.globalAlpha=1;
    DescentFX.foreground(ctx,world,{reducedMotion,time:elapsed});
    if(activation)ExpansionFX.sandi(ctx,visualBoss,FLOOR,elapsed,reducedMotion,true);
    ExecutionFX.foreground(ctx,world,reducedMotion);
    text(world.arena==='undercroft'?'CORPO PLAZA // LOWER LEVEL':'CORPO PLAZA // MEMORIAL PARK',24,521,8,'#c7bad5');
    if(world.victory)ExpansionFX.victory(ctx,world,reducedMotion);
  }
  function render(){
    ctx.save();ctx.imageSmoothingEnabled=false;rect(0,0,W,H,'#0c0e1b');
    if(!reducedMotion&&(mode==='playing'||mode==='ending'))ctx.translate(Math.sin(elapsed*107)*world.camera*.5+world.gunCamera,Math.cos(elapsed*93)*world.camera*.32);
    background();if(mode==='intro'||mode==='settings'&&settingsReturn==='intro')introArt();else drawWorld(mode==='playing'?clamp(accumulator*120,0,1):1);ctx.restore();
    if(!reducedMotion&&world.flash>0&&(mode==='playing'||mode==='ending')){ctx.globalAlpha=world.flash*.75;rect(0,0,W,H,'#ff607d');ctx.globalAlpha=1;}
  }
  function frame(time){
    const delta=Math.min(.1,(time-(lastFrame||time))/1000);lastFrame=time;elapsed+=delta;
    if(!readyAnnounced){if(artReady&&lowerReady&&PixelArt.ready){readyAnnounced=true;$('start').disabled=false;$('start').innerHTML='接入战斗 '+ARROW;$('start-hint').textContent=playMode==='smasher'?'ENTER 开始 / 技能键也可点击屏幕武装栏':'ENTER 开始 / 重锤跪倒后靠近按 E 处决';}else if(artFailed||PixelArt.failed){$('start').textContent='素材加载失败';$('start-hint').textContent='请重新打开完整游戏文件，或刷新重试。';}}
    if(mode==='playing'){
      const paused=Math.min(hitHold,delta);hitHold-=paused;accumulator+=delta-paused;
      while(accumulator>=1/120&&mode==='playing'){
        const input={left:keys.has('KeyA')||keys.has('ArrowLeft')||touch.has('left'),right:keys.has('KeyD')||keys.has('ArrowRight')||touch.has('right'),jump:jumpQueued,dash:dashQueued,reload:reloadQueued,shoot:keys.has('KeyJ')||touch.has('shoot'),heavy:keys.has('KeyK')||touch.has('heavy'),target:targetQueued,cycleTarget:cycleQueued,interact:interactQueued};
        if(abilityQueued)input[SMASHER_ABILITIES.find(a=>a.id===abilityQueued).input]=true;
        world.step(1/120,input);
        jumpQueued=dashQueued=reloadQueued=cycleQueued=interactQueued=false;targetQueued=abilityQueued=null;accumulator-=1/120;handleEvents();
      }updateHud();
    }else if(mode==='ending'||mode==='result'){
      world.updateEffects(delta);
      for(const e of world.events.splice(0))audio.play(e.type);
      if(mode==='ending'&&world.victory)updateCinematic();
      if(mode==='ending'&&(world.victory?world.victory.age>=17:elapsed-endingAt>1.85))completeEnding();
    }
    if(elapsed>messageUntil)visibility('game-message',false);render();requestAnimationFrame(frame);
  }
  $('start').addEventListener('click',start);$('retry').addEventListener('click',start);$('resume').addEventListener('click',resume);$('pause-button').addEventListener('click',pause);$('pause-home').addEventListener('click',home);$('result-home').addEventListener('click',home);
  $('skip-ending').addEventListener('click',completeEnding);$('replay-ending').addEventListener('click',replayEnding);
  document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{if(mode==='intro')selectMode(button.dataset.mode);}));
  document.querySelectorAll('[data-smasher-ability]').forEach(button=>button.addEventListener('click',()=>{if(mode==='playing'&&playMode==='smasher'){abilityQueued=button.dataset.smasherAbility;canvas.focus({preventScroll:true});}}));
  $('execute-button').addEventListener('click',()=>{if(mode==='playing'&&world.canExecute()){interactQueued=true;canvas.focus({preventScroll:true});}});
  document.querySelectorAll('[data-target]').forEach(button=>button.addEventListener('click',()=>{if(mode==='playing'){targetQueued=button.dataset.target;canvas.focus({preventScroll:true});}}));
  document.querySelectorAll('[data-difficulty]').forEach(b=>b.addEventListener('click',()=>selectDifficulty(b.dataset.difficulty)));
  $('difficulty-toggle').addEventListener('click',openSettings);$('customize-difficulty').addEventListener('click',openSettings);$('pause-settings').addEventListener('click',openSettings);
  $('settings-close').addEventListener('click',closeSettings);$('settings-cancel').addEventListener('click',closeSettings);$('settings-apply').addEventListener('click',applySettings);
  document.querySelectorAll('[data-setting-preset]').forEach(b=>b.addEventListener('click',()=>{settingsDraft={difficulty:b.dataset.settingPreset,tuning:{}};updateSettings(true);}));
  for(const id of ['boss-hp','boss-pace','boss-warning','boss-arsenal'])$(id).addEventListener('input',()=>{settingsDraft.tuning=readSettings();updateSettings();});
  $('audio-toggle').addEventListener('click',async()=>{const enabled=await audio.enable(!audio.enabled);$('audio-toggle').setAttribute('aria-pressed',enabled);$('audio-toggle').setAttribute('aria-label',enabled?'关闭声音':'开启声音');$('audio-label').textContent=enabled?'声音开':'声音关';});
  $('motion-toggle').addEventListener('click',()=>{reducedMotion=!reducedMotion;setMotion();});
  $('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('viewport').requestFullscreen();}catch{showMessage('当前浏览器不支持全屏',2);}});
  document.addEventListener('keydown',e=>{
    if(mode==='settings'){
      if(e.code==='Escape'){e.preventDefault();closeSettings();}
      else if(e.code==='Tab'){
        const items=[...$('settings-screen').querySelectorAll('button,input')].filter(el=>!el.disabled);
        if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1).focus();}
        else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0].focus();}
      }
      return;
    }
    if(e.ctrlKey||e.metaKey||e.altKey)return;
    if(!['ArrowLeft','ArrowRight','ArrowUp','Space','ShiftLeft','ShiftRight','KeyA','KeyD','KeyW','KeyJ','KeyK','KeyP','Escape','Enter','KeyM','KeyR','KeyQ','KeyE','Digit1','Digit2','Digit3'].includes(e.code))return;
    if(document.activeElement?.tagName==='BUTTON'&&['Space','Enter'].includes(e.code)&&mode!=='playing')return;
    e.preventDefault();keys.add(e.code);if(e.repeat)return;
    if(e.code==='KeyM'){$('audio-toggle').click();return;}
    if(e.code==='Enter'){if(mode==='intro'||mode==='result')start();else if(mode==='paused')resume();else if(mode==='ending'&&world.victory?.age>=2.5)completeEnding();return;}
    if(e.code==='KeyR'&&mode==='result'){start();return;}
    if(e.code==='KeyP'||e.code==='Escape'){if(mode==='playing')pause();else if(mode==='paused')resume();return;}
    if(mode!=='playing')return;
    if(['Space','KeyW','ArrowUp'].includes(e.code))jumpQueued=true;if(e.code.startsWith('Shift'))dashQueued=true;if(e.code==='KeyR')reloadQueued=true;
    if(e.code==='KeyQ')cycleQueued=true;if(e.code.startsWith('Digit'))targetQueued=({Digit1:'core',Digit2:'launcher',Digit3:'legs'})[e.code];
    if(e.code==='KeyE')interactQueued=true;
  });
  document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{clearInput();pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();pause();}});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{if(mode!=='playing'||e.pointerType==='touch')return;e.preventDefault();canvas.setPointerCapture(e.pointerId);touch.add(e.button===2?'heavy':'shoot');});
  const releaseMouse=()=>{touch.delete('shoot');touch.delete('heavy');};canvas.addEventListener('pointerup',releaseMouse);canvas.addEventListener('pointercancel',releaseMouse);canvas.addEventListener('lostpointercapture',releaseMouse);
  for(const button of document.querySelectorAll('.touch-controls button')){
    button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);button.classList.add('active');if(mode!=='playing')return;if(button.dataset.hold)touch.add(button.dataset.hold);if(button.dataset.action==='jump')jumpQueued=true;if(button.dataset.action==='dash')dashQueued=true;if(button.dataset.action==='reload')reloadQueued=true;});
    const release=()=>{button.classList.remove('active');if(button.dataset.hold)touch.delete(button.dataset.hold);};button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
  }
  selectMode(playMode);setMotion();requestAnimationFrame(frame);
  window.gameSnapshot=()=>({mode,gameMode:playMode,difficulty,config:world.config,time:world.time,status:world.status,hp:world.player.hp,x:world.player.x,y:world.player.y,vx:world.player.vx,ammo:world.player.ammo,reload:world.player.reload,counter:world.player.counter,dashCd:world.player.dashCd,bossHp:world.boss.hp,bossMaxHp:world.boss.maxHp,bossPhase:world.boss.phase,attack:world.boss.attack,bossX:world.boss.x,target:world.boss.target,locked:world.boss.locked,phase:world.phase,overdrive:world.boss.overdrive,arena:world.arena,transitionAge:world.transition?.age,downed:!!world.downed,canExecute:world.canExecute(),executionAge:world.execution?.age,abilityCooldowns:world.abilityCooldowns?{...world.abilityCooldowns}:undefined,guard:world.guardRemaining,parts:world.parts,aimTarget:world.player.target,floor:world.floor.map(t=>({x:t.x,state:t.state,damage:t.damage,timer:t.timer})),victoryAge:world.victory?.age,shots:world.shots.length,enemyShots:world.enemyShots.length,waves:world.waves.map(w=>({x:w.x,vx:w.vx})),score:Math.floor(world.score),artReady:artReady&&lowerReady&&PixelArt.ready,audio:audio.enabled,reducedMotion});
})();
