/* Music-only graph and additive keypad listeners. No quiz or click-audio changes. */
export async function createDJ({context, input, gain, audio, source, workletURL, allowed, changed}) {
  const beat=.4639, held=new Map(), removers=[], timers=new Set();
  let node, closed=false, owns=false, running=false, loadState='loading', telemetry={}, lastTime=0;
  let dry, send, filter, convolver, wet, limiter, media;
  let trigger5=0, epoch=0, active6Until=0, active7Until=0, release7=0, focused=true;
  const revisions={6:0,7:0};
  const upload=document.body.dataset.mode==='upload';
  const names={'5':'倒帶','6':'濾波','7':'空間殘響','8':'卡拍','9':'倒轉回旋'};
  const after=(ms,fn)=>{const id=setTimeout(()=>{timers.delete(id);if(!closed)fn();},ms);timers.add(id);return id;};
  function on(t,k,fn,opt) {t.addEventListener(k,fn,opt);removers.push(()=>t.removeEventListener(k,fn,opt));}
  function ramp(param,value,seconds=.012) {
    const now=context.currentTime;
    if(param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
    else {const v=param.value;param.cancelScheduledValues(now);param.setValueAtTime(v,now);}
    param.linearRampToValueAtTime(value,now+seconds);
  }
  function message(type,key) {if(node)node.port.postMessage({type,key,epoch});}
  function reset() {
    epoch++;revisions[6]++;revisions[7]++;
    timers.forEach(clearTimeout);timers.clear();held.clear();message('reset');
    active6Until=active7Until=release7=0;
    if(filter) {ramp(filter.frequency,19000);ramp(dry.gain,1);ramp(send.gain,1);ramp(wet.gain,0);}
    changed();
  }
  function down(key) {
    if(upload || !focused || loadState!=='ready' || !owns || !running || !allowed() || held.has(key))return;
    held.set(key,context.currentTime);message('down',key);
    if(key==='5')trigger5++;
    if(key==='6') {revisions[6]++;active6Until=Infinity;ramp(filter.frequency,260,1.5*beat);}
    if(key==='7') {
      revisions[7]++;active7Until=Infinity;release7=context.currentTime+beat/2;
      // The convolver has been primed by the preceding music. Stop all new
      // excitation and dry output at the press; only its finite IR can ring.
      ramp(wet.gain,.5,.01);ramp(send.gain,0,.01);ramp(dry.gain,0,.01);
    }
    changed();
  }
  function open7() {
    ramp(dry.gain,1,.01);ramp(send.gain,1,.01);ramp(wet.gain,0,.01);
    active7Until=context.currentTime+.01;
  }
  function up(key,cancel=false) {
    if(!held.has(key))return;
    if(cancel) {reset();return;}
    held.delete(key);message('up',key);
    if(key==='6') {ramp(filter.frequency,19000,.25);active6Until=context.currentTime+.25;}
    if(key==='7') {
      const remaining=Math.max(0,release7-context.currentTime),revision=revisions[7];
      if(remaining>0) {
        active7Until=release7+.01;
        after(remaining*1000,()=>{if(revision===revisions[7]&&!held.has('7'))open7();});
      } else open7();
    }
    changed();
  }
  function keyOf(e) {return e.target instanceof Element && e.target.closest('#keypad .phone-key')?.dataset.key;}
  const pointers=new Map();
  on(document,'pointerdown',e=>{
    const k=keyOf(e);if(!names[k] || !e.isTrusted || !e.isPrimary || (e.pointerType==='mouse'&&e.button!==0))return;
    pointers.set(e.pointerId,{key:k,x:e.clientX,y:e.clientY});down(k);
  },{capture:true,passive:true});
  on(document,'pointermove',e=>{const p=pointers.get(e.pointerId);if(p && Math.hypot(e.clientX-p.x,e.clientY-p.y)>10){up(p.key,true);pointers.delete(e.pointerId);}}, {capture:true,passive:true});
  for(const event of ['pointerup','pointercancel','lostpointercapture']) on(document,event,e=>{
    const p=pointers.get(e.pointerId);if(!p)return;pointers.delete(e.pointerId);up(p.key,event!=='pointerup');
  },{capture:true,passive:true});
  on(document,'pointerout',e=>{const p=pointers.get(e.pointerId);if(p && !e.target.contains(e.relatedTarget)){up(p.key,true);pointers.delete(e.pointerId);}}, {capture:true,passive:true});
  if(!window.PointerEvent) {
    let touch;
    on(document,'touchstart',e=>{const k=keyOf(e);if(e.isTrusted && e.touches.length===1 && names[k]) {touch={key:k,x:e.touches[0].clientX,y:e.touches[0].clientY};down(k);}}, {capture:true,passive:true});
    on(document,'touchmove',e=>{if(touch && (e.touches.length!==1 || Math.hypot(e.touches[0].clientX-touch.x,e.touches[0].clientY-touch.y)>10)){up(touch.key,true);touch=null;}}, {capture:true,passive:true});
    for(const event of ['touchend','touchcancel'])on(document,event,()=>{if(touch)up(touch.key,event==='touchcancel');touch=null;},{capture:true,passive:true});
  }
  on(window,'keydown',e=>{if(e.isTrusted && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && names[e.key])down(e.key);},{capture:true});
  on(window,'keyup',e=>{if(names[e.key])up(e.key);},{capture:true});
  on(document,'click',e=>{const k=keyOf(e);if(e.isTrusted && e.detail===0 && names[k]){down(k);up(k);}},{capture:true,passive:true});
  for(const e of ['blur','resize','pagehide'])on(window,e,()=>{if(e==='blur')focused=false;pointers.clear();reset();});
  on(window,'focus',()=>{focused=true;});
  on(document,'visibilitychange',()=>{if(document.hidden)reset();});
  const api={
    reset,
    get owns(){return owns;},
    get time(){return owns ? lastTime : audio.currentTime;},
    getState(){
      const now=context.currentTime,valid=!upload&&focused&&running&&loadState==='ready'&&allowed();
      const current=telemetry.epoch===epoch;
      let progress9=current&&telemetry.mode==='spin'?Math.min(1,telemetry.progress9+Math.max(0,now-telemetry.contextTime)/beat):0;
      const activeKeys=valid&&current?(telemetry.activeKeys||[]).filter(k=>k!=='9'||progress9<1):[];
      if(valid&&now<active6Until)activeKeys.push('6');
      if(valid&&now<active7Until)activeKeys.push('7');
      activeKeys.sort();if(!valid)progress9=0;
      return {status:loadState,enabled:!upload,mode:current?telemetry.mode||'forward':'forward',rate:current?telemetry.rate??1:1,
        held:[...held.keys()],pcmBytes:telemetry.pcmBytes||0,visual:{activeKeys,progress9,trigger5}};
    },
    pause(){if(Number.isFinite(telemetry.timelineTime))lastTime=telemetry.timelineTime;reset();running=false;message('pause');},
    start(){if(!owns)return false;running=true;message('start');return true;},
    destroy(){closed=true;reset();removers.forEach(f=>f());if(node){node.port.postMessage({type:'pause'});node.disconnect();node.port.close();}}
  };
  // Return synchronously usable lifecycle API; decoding continues without delaying first 0.
  (async()=>{
    try {
      if(upload){loadState='disabled';changed();return;}
      if(!context.audioWorklet || !window.AudioWorkletNode || !window.isSecureContext)throw new Error('unsupported');
      await context.audioWorklet.addModule(workletURL);
      const response=await fetch(source);if(!response.ok)throw new Error('music unavailable');
      let decoded=await context.decodeAudioData(await response.arrayBuffer());
      if(closed)return;
      // decodeAudioData resamples to context rate. Keep source rate when supported
      // by creating the music context at 48kHz in background-music.js.
      const channels=[];
      for(let c=0;c<decoded.numberOfChannels;c++) {const a=new Float32Array(decoded.length);decoded.copyFromChannel(a,c);channels.push(a);}
      decoded=null;
      node=new AudioWorkletNode(context,'cashflow-deck',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[channels.length]});
      filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=19000;filter.Q.value=4;
      dry=context.createGain();send=context.createGain();send.gain.value=0;
      wet=context.createGain();wet.gain.value=0;send.gain.value=1;
      convolver=context.createConvolver();convolver.normalize=false;
      // vis3: deterministic stereo noise, 3s finite IR, exp(-t/.9),
      // each channel normalized to unit energy. No feedback delay exists.
      const ir=context.createBuffer(2,Math.round(3*context.sampleRate),context.sampleRate);
      let seed=1;
      for(let c=0;c<2;c++) {
        const a=ir.getChannelData(c);let energy=0;
        for(let i=0;i<a.length;i++) {
          seed=(Math.imul(seed,1664525)+1013904223)>>>0;
          const v=(seed/2147483648-1)*Math.exp(-i/(.9*context.sampleRate));a[i]=v;energy+=v*v;
        }
        const norm=1/Math.sqrt(energy);for(let i=0;i<a.length;i++)a[i]*=norm;
      }
      convolver.buffer=ir;
      limiter=context.createDynamicsCompressor();Object.assign(limiter.threshold,{value:-8});limiter.knee.value=6;limiter.ratio.value=12;limiter.attack.value=.003;limiter.release.value=.25;
      node.connect(filter);filter.connect(dry);dry.connect(limiter);filter.connect(send);send.connect(convolver);convolver.connect(wet);wet.connect(limiter);limiter.connect(gain);
      media=context.createGain();media.gain.value=1;input.disconnect(gain);input.connect(media);media.connect(gain);
      node.port.onmessage=({data})=>{
        if(data.epoch!==epoch)return;
        telemetry=data;lastTime=data.time;
        if(!owns && loadState==='loading') {
          loadState='ready';
          // Handoff only from a currently playing element. Otherwise wait for retry.
          if(allowed() && !audio.paused)takeover();
          changed();
        }
      };
      function takeover() {
        if(owns || closed)return;
        owns=true;running=true;lastTime=audio.currentTime;
        node.port.postMessage({type:'start',time:lastTime});
        // Complementary gain fade prevents doubled level during the handoff.
        const now=context.currentTime;filter.disconnect();
        const deckGain=context.createGain();deckGain.gain.value=0;filter.connect(deckGain);deckGain.connect(dry);deckGain.connect(send);
        ramp(deckGain.gain,1,.02);ramp(media.gain,0,.02);
        setTimeout(()=>{if(!closed)audio.pause();},30);
        changed();
      }
      api.takeover=()=>{if(loadState==='ready' && allowed() && !audio.paused)takeover();};
      node.port.postMessage({type:'load',channels,time:audio.currentTime},channels.map(a=>a.buffer));
    } catch (_) {loadState='unavailable';changed();}
  })();
  return api;
}
