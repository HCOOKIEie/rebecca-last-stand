/* Original Web Audio synthesis. No music, voice, or effects sampled from the show. */
window.ArcadeAudio = class {
  constructor(){this.enabled=false;this.paused=false;this.ctx=null;this.nextBeat=0;this.beat=0;this.musicTimer=null;this.lastCue={};this.voices=new Map();this.contextTask=Promise.resolve();}
  async enable(value){
    this.enabled=value;
    if(value){try{
      this.ctx ||= new (window.AudioContext||window.webkitAudioContext)();
      this.setupMix();await this.syncPlayback();this.nextBeat=this.ctx.currentTime+.03;
      this.musicTimer ||= setInterval(()=>this.music(),100);
    }catch{this.enabled=false;}}
    else if(this.ctx)await this.syncPlayback();
    return this.enabled;
  }
  syncPlayback(){
    // Serialize asynchronous changes and read the latest preference when they run.
    this.contextTask=this.contextTask.catch(()=>{}).then(async()=>{
      if(!this.ctx||this.ctx.state==='closed')return;
      if(this.enabled&&!this.paused)await this.ctx.resume();else await this.ctx.suspend();
    });
    return this.contextTask;
  }
  async setPaused(value){
    this.paused=Boolean(value);
    try{await this.syncPlayback();}catch{/* Keep the user's sound preference on a failed context transition. */}
    return this.paused;
  }
  trackVoice(source,cleanup){
    this.voices.set(source,cleanup);
    source.onended=()=>{this.voices.delete(source);source.onended=null;cleanup();};
  }
  resetScene(){
    // Cancel future starts as well as playing tails, before a suspended context resumes.
    for(const [source,cleanup] of this.voices){
      source.onended=null;try{source.stop(this.ctx?.currentTime??0);}catch{}
      cleanup();
    }
    this.voices.clear();this.lastCue={};this.beat=0;this.nextBeat=(this.ctx?.currentTime??0)+.03;
    if(this.musicBus){const t=this.ctx.currentTime,g=this.musicBus.gain;g.cancelScheduledValues(t);g.setValueAtTime(.72,t);}
  }
  setupMix(){
    if(this.fxBus)return;
    const c=this.ctx;this.fxBus=c.createGain();this.musicBus=c.createGain();this.musicBus.gain.value=.72;
    const limiter=c.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=8;
    limiter.ratio.value=8;limiter.attack.value=.003;limiter.release.value=.14;
    const master=c.createGain();master.gain.value=.88;
    this.fxBus.connect(limiter);this.musicBus.connect(limiter);limiter.connect(master);master.connect(c.destination);
  }
  duckMusic(duration=.3,level=.24){
    if(!this.musicBus)return;const t=this.ctx.currentTime,g=this.musicBus.gain;
    const current=g.value;g.cancelScheduledValues(t);g.setValueAtTime(current,t);
    g.linearRampToValueAtTime(level,t+.012);g.setValueAtTime(level,t+duration*.65);g.linearRampToValueAtTime(.72,t+duration);
  }
  tone(freq,duration=.1,type='square',volume=.035,slide=0,when=null,bus='fx',attack=.003,hold=0){
    if(!this.enabled||this.paused||!this.ctx)return;const c=this.ctx,t=when??c.currentTime,o=c.createOscillator(),g=c.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),t+duration);
    g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(volume,t+Math.min(attack,duration*.4));
    if(hold>attack)g.gain.setValueAtTime(volume,t+Math.min(hold,duration-.005));
    g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(bus==='music'?this.musicBus:this.fxBus);
    this.trackVoice(o,()=>{o.disconnect();g.disconnect();});o.start(t);o.stop(t+duration+.02);
  }
  noise(duration=.15,volume=.08,low=1400,when=null,filter='lowpass',slide=0,attack=.002,hold=0){
    if(!this.enabled||this.paused||!this.ctx)return;const c=this.ctx,t=when??c.currentTime,n=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),d=n.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    const src=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();src.buffer=n;f.type=filter;f.Q.value=.72;
    f.frequency.setValueAtTime(low,t);if(slide)f.frequency.exponentialRampToValueAtTime(slide,t+duration);
    g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(volume,t+Math.min(attack,duration*.4));
    if(hold>attack)g.gain.setValueAtTime(volume,t+Math.min(hold,duration-.005));
    g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    src.connect(f);f.connect(g);g.connect(this.fxBus);this.trackVoice(src,()=>{src.disconnect();f.disconnect();g.disconnect();});src.start(t);
  }
  // Steel resonances use inharmonic partials, separate from the low recoil pulse.
  metal(t,strength=1){
    this.noise(.045,.055*strength,6100,t,'highpass');
    [[680,.055],[1117,.035],[1843,.022]].forEach(([f,v],i)=>this.tone(f,.09+i*.025,'sine',v*strength,0,t));
  }
  play(type){
    if(!this.enabled||this.paused||!this.ctx)return;
    const t=this.ctx.currentTime;
    // A shotgun's pellets and simultaneous pane fractures share one audible impact.
    const cooldown={'hit':.04,'heavy-hit':.04,'counter-hit':.04,'floor-collapse':.075,'part-broken':.06}[type];
    if(cooldown&&t-(this.lastCue[type]??-Infinity)<cooldown)return;this.lastCue[type]=t;
    switch(type){
      case 'jump':this.tone(180,.14,'triangle',.045,490);break;
      case 'dash':this.noise(.14,.06,2200);this.tone(350,.14,'sawtooth',.025,80);break;
      case 'shoot':
        this.duckMusic(.2,.36);this.noise(.045,.2,5600);this.noise(.19,.1,1550,t+.007,'lowpass',340);
        this.tone(155,.145,'triangle',.15,43);this.tone(72,.18,'sine',.12,35);
        this.metal(t+.115,.32);this.noise(.04,.035,4000,t+.165,'bandpass');break;
      case 'heavy':
        this.duckMusic(.36,.2);this.noise(.055,.25,4900);this.noise(.3,.16,1700,t+.01,'lowpass',240);
        this.tone(125,.19,'triangle',.19,36);this.tone(66,.32,'sine',.2,26);
        this.metal(t+.16,.55);this.noise(.07,.06,2900,t+.23,'bandpass');this.tone(195,.07,'triangle',.045,90,t+.23);break;
      case 'reload':this.noise(.07,.04,5000);this.tone(260,.06,'square',.025,160);break;
      case 'loaded':this.noise(.05,.06,4800);this.tone(520,.05,'square',.03,280);break;
      case 'target':this.tone(330,.08,'square',.02);break;
      case 'lock':this.tone(880,.12,'square',.035);break;
      case 'cannon':this.noise(.14,.14,2300);this.tone(95,.16,'sawtooth',.07,38);break;
      case 'rush':this.noise(.3,.12,1900);this.tone(190,.28,'sawtooth',.045,45);break;
      case 'combo':this.tone(740,.09,'square',.03);this.tone(990,.09,'square',.03,0,t+.12);break;
      case 'missile':this.tone(560,.12,'square',.025);this.noise(.22,.06,1600);break;
      case 'drop':this.tone(180,.25,'sawtooth',.03,40);break;
      case 'impact':this.noise(.4,.22,1100);this.tone(85,.4,'sine',.25,28);break;
      case 'explosion':this.noise(.22,.1,900);this.tone(80,.2,'sine',.1,25);break;
      case 'hurt':this.tone(145,.3,'sawtooth',.07,40);this.noise(.2,.06);break;
      case 'perfect':this.tone(659,.16,'triangle',.07);this.tone(988,.3,'triangle',.06,0,t+.08);break;
      case 'heal':this.tone(523,.1,'triangle',.06);this.tone(784,.2,'triangle',.06,0,t+.1);break;
      case 'hit':this.metal(t,.65);this.tone(112,.085,'triangle',.06,52);break;
      case 'heavy-hit':
        this.metal(t,1);this.noise(.11,.075,1700,t,'bandpass',590);this.tone(146,.13,'triangle',.1,41);this.tone(67,.15,'sine',.07,32);break;
      case 'counter-hit':
        this.metal(t,1);this.noise(.12,.07,2100,t,'bandpass',650);this.tone(128,.14,'triangle',.11,38);
        this.tone(1480,.1,'sine',.04,990);break;
      case 'boss-downed':this.duckMusic(.9,.18);this.metal(t,.8);this.tone(180,.7,'sawtooth',.065,28);this.noise(.4,.055,1100,t,'bandpass',280);break;
      case 'execution-start':this.duckMusic(2.6,.08);this.metal(t,.35);this.noise(.08,.065,4800,t+.18);this.tone(360,.08,'square',.03,140,t+.2);break;
      case 'execution-shot':this.noise(.08,.2,5200);this.noise(.25,.13,1100,t+.01,'lowpass');this.tone(105,.32,'sine',.21,28);this.metal(t+.035,1);this.tone(1580,.3,'sine',.035,160);break;
      case 'execution-fall':this.metal(t,.85);this.metal(t+.09,.4);this.noise(.38,.12,1200,t,'lowpass',260);this.tone(65,.36,'sine',.17,24);break;
      case 'smasher-guard':this.metal(t,.55);this.tone(240,.2,'triangle',.05,660);break;
      case 'armor-block':this.metal(t,.3);break;
      case 'won':[440,554,659,880].forEach((f,i)=>this.tone(f,.5,'triangle',.06,0,t+i*.15));break;
      case 'lost':this.tone(220,.7,'triangle',.08,55);break;
      case 'crush':this.noise(.32,.15,850);this.noise(.12,.06,3200);this.tone(62,.3,'sine',.12,24);break;
      case 'overdrive':
        this.duckMusic(1.7,.13);
        // Latches release, servos engage in sequence, then the drive climbs in pitch.
        [0,.14,.29,.43].forEach((delay,i)=>{this.metal(t+delay,.6-i*.08);this.tone(105+i*28,.18,'sawtooth',.055,62,t+delay);});
        this.tone(47,1.5,'sawtooth',.065,290,t+.08,'fx',.13,1.05);
        this.tone(91,1.35,'triangle',.05,520,t+.22,'fx',.16,.9);
        this.noise(.8,.075,650,t+.35,'bandpass',4200,.12,.55);
        [0,.16,.3,.42,.52,.6].forEach((delay,i)=>this.tone(270+i*75,.06,'square',.025,0,t+.73+delay));
        this.tone(1160,.18,'sine',.045,720,t+1.43);break;
      case 'transform-charge':
        this.duckMusic(1.14,.16);this.tone(65,1.1,'sawtooth',.065,480,t,'fx',.32,.9);
        this.noise(1.08,.11,500,t,'bandpass',5200,.32,.86);this.metal(t+.08,.45);this.metal(t+.76,.35);break;
      case 'sandi-warning':
        this.duckMusic(.3,.31);this.tone(660,.095,'triangle',.055,880);this.tone(990,.11,'triangle',.05,1174,t+.13);
        this.noise(.19,.028,2000,t,'bandpass',3700,.03);break;
      case 'sandi-lock':
        // The final pulse ends before the minimum 320 ms lock-to-dash window.
        this.duckMusic(.32,.1);
        [1320,1320,1760].forEach((f,i)=>{this.tone(f,i===2?.09:.055,'square',.043,0,t+i*.075);this.tone(f/2,.06,'sine',.026,0,t+i*.075);});break;
      case 'sandi-dash':
        this.duckMusic(.3,.24);
        this.noise(.235,.2,6100,t,'bandpass',430,.012);this.noise(.16,.075,2100,t+.018,'highpass',700,.008);
        this.tone(1040,.13,'triangle',.065,90);this.tone(122,.2,'sine',.075,34);
        this.noise(.11,.035,3200,t+.11,'bandpass',900);break;
      case 'part-broken':this.noise(.3,.12,2800);this.tone(190,.25,'sawtooth',.06,35);this.metal(t+.06,.8);break;
      case 'interrupt':this.tone(420,.15,'square',.06,110);this.noise(.15,.08,3200);this.metal(t,.7);break;
      case 'floor-warning':this.tone(520,.12,'triangle',.025,330);break;
      case 'floor-collapse':this.noise(.45,.11,3800);break;
      case 'floor-break':
        this.duckMusic(1,.12);this.noise(.06,.22,6200);this.noise(.72,.18,2400,t+.015,'lowpass',250);
        this.tone(102,.48,'triangle',.16,30);this.tone(61,.75,'sine',.18,24);
        [0,.045,.105,.19,.29,.41].forEach((delay,i)=>{this.noise(.12,.065-i*.006,5200,t+.04+delay,'highpass');this.tone(1490+i*317,.18,'sine',.026-i*.003,0,t+.055+delay);});break;
      case 'underworld-land':
        this.duckMusic(.65,.2);this.noise(.38,.16,1300,t,'lowpass',240);this.tone(92,.32,'triangle',.13,28);
        this.tone(52,.53,'sine',.16,24);this.noise(.3,.045,1100,t+.105,'bandpass',420);this.metal(t+.075,.35);break;
      case 'floor-bridge':this.tone(620,.18,'triangle',.025,990);break;
      case 'comm':this.tone(784,.08,'sine',.035);this.tone(1174,.1,'sine',.03,0,t+.1);break;
    }
  }
  music(){
    if(!this.enabled||this.paused||!this.ctx||!this.active)return;
    const c=this.ctx;if(this.nextBeat<c.currentTime)this.nextBeat=c.currentTime+.01;
    while(this.nextBeat<c.currentTime+.16){const t=this.nextBeat,i=this.beat++%32,notes=[55,55,65.41,55,73.42,55,82.41,65.41];
      if(i%2===0)this.tone(notes[Math.floor(i/4)%8],.18,'sawtooth',.018,0,t,'music');
      if(i%4===0)this.tone(110,.13,'sine',.08,35,t,'music');
      if(i%4===2)this.tone(1800,.025,'triangle',.01,500,t,'music');
      if(i%8===7)this.tone([440,523.25,587.33,659.25][Math.floor(i/8)],.24,'triangle',.018,0,t,'music');
      this.nextBeat+=.15;
    }
  }
};
