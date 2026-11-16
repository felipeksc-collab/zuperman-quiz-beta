/* One forward PCM store; reverse reads interpolate this same store. */
class CashflowDeck extends AudioWorkletProcessor {
  constructor() {
    super();
    this.pcm=null; this.p=0; this.running=false; this.mode='forward';
    this.held={}; this.frame=0; this.fade=1e9; this.oldP=0; this.oldRate=1;
    this.beat=.4639; this.rate=1; this.epoch=0;
    this.port.onmessage=({data})=>this.command(data);
  }
  wrap(p) {return (p%this.length+this.length)%this.length;}
  sample(c,p) {
    p=this.wrap(p); const i=Math.floor(p), f=p-i, a=this.pcm[c];
    return a[i]+(a[(i+1)%this.length]-a[i])*f;
  }
  cross() {this.oldP=this.p;this.oldRate=this.rate;this.fade=0;}
  state() {
    const activeKeys=[];
    if(this.mode==='reverse')activeKeys.push('5');
    if(this.mode==='stutter')activeKeys.push('8');
    if(this.mode==='spin')activeKeys.push('9');
    return {type:'state',epoch:this.epoch,time:this.wrap(this.p)/sampleRate,running:this.running,
      timelineTime:this.wrap(this.mode==='stutter'||this.mode==='spin'?this.liveP:this.p)/sampleRate,
      mode:this.mode,rate:this.rate,activeKeys,progress9:this.mode==='spin'?Math.min(1,this.spinAge/this.spinFrames):0,
      contextTime:currentTime,pcmBytes:this.pcm?this.pcm.length*this.length*4:0};
  }
  command(d) {
    if(d.type==='load') {
      this.pcm=d.channels;this.length=this.pcm[0].length;this.p=this.wrap(d.time*sampleRate);
      this.port.postMessage(this.state());return;
    }
    if(!this.pcm)return;
    if(d.type==='start') {this.running=true;if(Number.isFinite(d.time))this.p=this.wrap(d.time*sampleRate);}
    if(d.type==='pause'||d.type==='reset') {
      this.epoch=d.epoch;this.cross();
      if(this.mode==='stutter'||this.mode==='spin')this.p=this.liveP;
      this.mode='forward';this.held={};this.rate=1;
      if(d.type==='pause')this.running=false;
    }
    if(d.type==='down') {
      const k=d.key;if(this.held[k]!==undefined)return;
      this.held[k]=this.frame;
      if(k==='5') {
        this.cross();
        if(this.frame-(this.lastReverse??-1e9)>sampleRate*.5)this.floor=this.p-3*sampleRate;
        this.floor??=this.p-3*sampleRate;
        this.mode='reverse';this.reverseStart=this.p;this.reverseAge=0;
        this.reverseEnd=Math.max(this.floor,this.p-this.beat*.5*sampleRate);
        this.lastReverse=this.frame;
      }
      if(k==='8') {
        this.cross();this.mode='stutter';this.loopAge=0;this.longLoop=false;
        this.loopSize=Math.round(this.beat/16*sampleRate);this.loopStart=this.p-this.loopSize;this.liveP=this.p;
      }
      if(k==='9'&&this.mode!=='spin') {
        this.cross();this.mode='spin';this.spinAge=0;this.spinFrames=Math.round(this.beat*sampleRate);this.liveP=this.p;
      }
    }
    if(d.type==='up') {
      const k=d.key,age=(this.frame-this.held[k])/sampleRate;delete this.held[k];
      if(k==='5'&&this.mode==='reverse'&&age>=.18) {this.cross();this.mode='forward';this.rate=1;}
      if(k==='8'&&this.mode==='stutter'&&age>=.18)this.endLoop();
      // 9 is a one-shot: neither early release nor a long hold extends it.
    }
    this.port.postMessage(this.state());
  }
  endLoop() {this.cross();this.p=this.liveP;this.mode='forward';this.rate=1;}
  process(inputs,outputs) {
    const out=outputs[0];if(!this.pcm||!out.length)return true;
    const fadeFrames=Math.round(.012*sampleRate);
    for(let i=0;i<out[0].length;i++) {
      if(!this.running) {for(const a of out)a[i]=0;continue;}
      let amp=1,loopAmp=1,returnMix=0;
      if(this.mode==='spin') {
        const u=this.spinAge/Math.max(1,this.spinFrames-1);
        this.rate=-(.6+4.4*Math.pow(u,1.5));this.p+=this.rate;this.liveP++;
        amp=1-.85*u;
        // Last 12ms cross directly to the live song; there is no silent hold.
        returnMix=Math.max(0,1-(this.spinFrames-1-this.spinAge)/fadeFrames);
        this.spinAge++;
      } else if(this.mode==='reverse') {
        const age=this.reverseAge++/sampleRate,D=this.beat*.25;
        if(age<D) {
          const u=age/D;this.rate=-2*(this.reverseStart-this.reverseEnd)*(1-u)/(D*sampleRate);
          this.p=this.reverseStart-(this.reverseStart-this.reverseEnd)*(1-(1-u)**2);
        } else if(this.held['5']!==undefined) {
          this.rate=age<.18?0:-1;this.p=age<.18?this.reverseEnd:Math.max(this.floor,this.p-1);
        } else {this.cross();this.p=this.reverseEnd;this.mode='forward';this.rate=1;}
        if(this.p<=this.floor) {this.cross();this.mode='forward';this.rate=1;}
        this.lastReverse=this.frame;
      } else if(this.mode==='stutter') {
        this.rate=1;this.liveP++;
        const age=(this.frame-this.held['8'])/sampleRate;
        if(age>=.18&&!this.longLoop) {
          this.longLoop=true;this.loopSize=Math.round(this.beat/8*sampleRate);this.loopStart=this.liveP-this.loopSize;
        }
        const n=this.loopAge++%this.loopSize;this.p=this.loopStart+n;
        loopAmp=Math.min(1,n/(.003*sampleRate),(this.loopSize-n)/(.003*sampleRate));
        if(this.held['8']===undefined&&(this.longLoop||this.loopAge>=4*this.loopSize))this.endLoop();
      } else this.rate=1;
      for(let c=0;c<out.length;c++) {
        const ch=Math.min(c,this.pcm.length-1);
        let v=this.sample(ch,this.p)*loopAmp*amp;
        if(this.fade<fadeFrames) {
          const u=this.fade/fadeFrames;v=this.sample(ch,this.oldP)*(1-u)+v*u;
        }
        if(returnMix>0)v=v*(1-returnMix)+this.sample(ch,this.liveP)*returnMix;
        out[c][i]=v;
      }
      if(this.fade<fadeFrames) {this.fade++;this.oldP+=this.oldRate;}
      if(this.mode==='spin'&&this.spinAge>=this.spinFrames) {
        this.p=this.liveP;this.mode='forward';this.rate=1;this.fade=fadeFrames;
      } else if(this.mode==='forward')this.p++;
      if(this.mode==='forward')this.p=this.wrap(this.p);
      this.frame++;
    }
    if(this.frame-(this.reportFrame||0)>=sampleRate/50) {
      this.reportFrame=this.frame;this.port.postMessage(this.state());
    }
    return true;
  }
}
registerProcessor('cashflow-deck',CashflowDeck);
