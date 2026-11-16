/* Cashflow background music. Load once with a classic <script src="…">. */
(() => {
  'use strict';
  if (window.CashflowMusic) return;
  const script = document.currentScript;
  if (!script || !script.src) return;
  const source = new URL('assets/2026-10-25-Zuperman-DEMO.mp3', script.src).href;
  const storageKey = 'cashflow.background-music.v1';
  let saved = {};
  try { saved = JSON.parse(sessionStorage.getItem(storageKey)) || {}; } catch (_) {}
  const audio = new Audio(source);
  audio.loop = true;
  audio.preload = 'metadata';
  audio.volume = 0.3;
  let muted = saved.muted === true;
  audio.muted = muted;
  let position = Number.isFinite(saved.time) && saved.time >= 0 ? saved.time : 0;
  let activated = saved.activated === true;
  let status = muted ? 'muted' : 'idle';
  let button, context, gain, graphReady = false, pending = null, generation = 0;
  let lastSave = 0;
  let fx, fxStatus = 'waiting', hint, saveTimer, destroyed = false;
  const upload = document.body.dataset.mode === 'upload';
  function musicTime() { return fx && fx.owns ? fx.time : audio.currentTime; }
  function fxChanged() { update(); }
  function loadFX(input) {
    fxStatus = 'loading'; update();
    import(new URL('dj-effects.js?v=djfx3', script.src).href).then(m => m.createDJ({
      context, input, gain, audio, source,
      workletURL: new URL('dj-transport.js?v=djfx3', script.src).href,
      allowed: () => !destroyed && activated && !muted && !document.hidden && status === 'playing',
      changed: fxChanged
    })).then(api => { if(destroyed)api.destroy(); else {fx=api;fx.takeover?.();update();} }).catch(() => {fxStatus='unavailable';update();});
  }
  const listeners = [];
  function listen(target, type, fn, options) {
    target.addEventListener(type, fn, options);
    listeners.push(() => target.removeEventListener(type, fn, options));
  }
  function persist() {
    if (fx && fx.owns) position = fx.time;
    else if (Number.isFinite(audio.currentTime) && audio.readyState >= 1) position = audio.currentTime;
    try { sessionStorage.setItem(storageKey, JSON.stringify({ time: position, muted, activated })); } catch (_) {}
  }
  function update() {
    if (!button) return;
    button.textContent = muted ? '音樂：關' : status === 'playing' ? '音樂：開' : '音樂：等待播放';
    button.setAttribute('aria-pressed', String(!muted));
    button.setAttribute('aria-label', muted ? '開啟背景音樂' : '關閉背景音樂');
    button.dataset.state = status;
    if(hint) {
      const state = fx ? fx.getState().status : fxStatus;
      hint.textContent = state==='ready' ? '5倒帶 6濾波 7殘響 8卡拍 9回旋' : state==='loading' ? 'DJ 載入中' : state==='unavailable' ? 'DJ 受限' : 'DJ 等待啟動';
      hint.dataset.state=state;
    }
  }
  function pause() {
    generation++;
    pending = null;
    if (fx) fx.pause();
    audio.pause();
    persist();
  }
  function resumeGraph() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return Promise.resolve();
    try {
      if (!context) context = new AudioContext({sampleRate:48000});
      // Keep the media element audible until the Web Audio context is running.
      return context.resume().then(() => {
        if (graphReady || destroyed) return;
        gain = context.createGain();
        gain.gain.value = 0.3;
        gain.connect(context.destination);
        const input = context.createMediaElementSource(audio);
        input.connect(gain);
        graphReady = true;
        audio.volume = 1;
        if (!upload) loadFX(input);
      });
    } catch (error) { return Promise.reject(error); }
  }
  function attempt({ trusted = false } = {}) {
    if (muted) return Promise.resolve(true);
    if (destroyed || !activated || document.hidden) return Promise.resolve(false);
    // Keep the same audio session when the native player hands off to Web Audio.
    if (trusted && navigator.audioSession) {
      try { navigator.audioSession.type = 'playback'; } catch (_) {}
    }
    const resume = trusted || graphReady ? resumeGraph() : Promise.resolve();
    resume.catch(() => {});
    if ((fx && fx.owns || !audio.paused) && status === 'playing') {
      return graphReady ? resume.then(() => true, () => false) : Promise.resolve(true);
    }
    if (pending && !trusted) return pending;
    const token = ++generation;
    let play;
    try {
      play = fx && fx.start() ? Promise.resolve() : audio.play();
    } catch (error) { play = Promise.reject(error); }
    const audible = graphReady ? Promise.all([resume, play]) : Promise.resolve(play);
    pending = audible.then(() => {
      if (token !== generation) return muted || status === 'playing';
      pending = null;
      if (muted || document.hidden) { pause(); return muted; }
      status = 'playing';
      if(fx)fx.takeover?.();
      update();
      return true;
    }).catch(() => {
      if (token !== generation) return muted || status === 'playing';
      pending = null;
      audio.pause();
      if(fx)fx.pause();
      status = 'blocked';
      update(); // Keep gesture listeners: mobile denial is retryable.
      return false;
    });
    return pending;
  }
  function start(options) {
    activated = true;
    audio.preload = 'auto';
    persist();
    return attempt(options);
  }
  function gesture(event) {
    if (!event.isTrusted) return;
    if (event.type === 'keydown') {
      if (event.key !== '0' || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    } else {
      const key = event.target instanceof Element && event.target.closest('#keypad .phone-key[data-key="0"], [data-music-start]');
      if (!key) return;
      if (event.type === 'click' && event.detail !== 0) return; // Pointer/touch already handled this press.
      if (event.type === 'pointerup' && (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0))) return;
    }
    start({ trusted: true }); // Keep the keypad event available to the quiz.
  }
  function setMuted(value, { trusted = false } = {}) {
    muted = Boolean(value);
    audio.muted = muted;
    if (muted) { pause(); status = 'muted'; }
    else { status = 'idle'; if (trusted) start({ trusted }); else attempt(); }
    persist();
    update();
  }
  function mount() {
    const host = document.createElement('span');
    host.id = 'cashflow-music-control';
    // Normal document flow avoids overlaying game/telephone controls.
    host.style.cssText = 'display:inline-flex;max-width:100%;margin:6px;vertical-align:middle;';
    button = document.createElement('button');
    button.type = 'button';
    button.style.cssText = 'min-height:44px;padding:8px 12px;border:1px solid currentColor;border-radius:999px;font:inherit;font-size:14px;color:inherit;background:transparent;cursor:pointer;touch-action:manipulation;';
    listen(button, 'click', event => {
      if (!event.isTrusted) return;
      if (!muted && status !== 'playing') start({ trusted: true });
      else setMuted(!muted, { trusted: true });
    });
    host.style.flexDirection='column';
    host.appendChild(button);
    if(!upload) {
      hint=document.createElement('small');hint.id='cashflow-dj-hint';
      hint.style.cssText='display:block;font-size:10px;line-height:1.4;white-space:normal;overflow-wrap:anywhere;margin-top:4px;';
      hint.setAttribute('role','status');host.appendChild(hint);
      document.querySelectorAll('#keypad .phone-key').forEach(k=>{
        const names={'5':'倒帶','6':'濾波','7':'空間殘響','8':'卡拍','9':'倒轉回旋'};
        if(names[k.dataset.key])k.setAttribute('aria-label',k.dataset.key+' '+names[k.dataset.key]+'，音樂啟動後可用');
      });
    }
    let target;
    try { target = script.dataset.controls ? document.querySelector(script.dataset.controls) : null; } catch (_) {}
    (target || document.body).appendChild(host);
    update();
  }
  listen(audio, 'loadedmetadata', () => {
    if(fx && fx.owns)return;
    if (position && Number.isFinite(audio.duration) && audio.duration > 0) {
      try { audio.currentTime = position % audio.duration; } catch (_) {}
    }
  });
  listen(audio, 'timeupdate', () => {
    if (Date.now() - lastSave > 2000) { persist(); lastSave = Date.now(); }
  });
  listen(audio, 'error', () => { pause(); status = 'blocked'; update(); });
  // Capture before the quiz's target pointerup and window keydown handlers.
  // Touch pointerup is a browser activation event; pointerdown is not on mobile.
  listen(document, 'pointerup', gesture, { capture: true, passive: true });
  if (!window.PointerEvent) listen(document, 'touchend', gesture, { capture: true, passive: true });
  listen(document, 'click', gesture, { capture: true, passive: true });
  listen(window, 'keydown', gesture, { capture: true });
  listen(document, 'visibilitychange', () => {
    if (document.hidden) { pause(); status = muted ? 'muted' : 'paused'; update(); }
    else attempt();
  });
  listen(window, 'pagehide', () => { pause(); status = muted ? 'muted' : 'paused'; update(); });
  listen(window, 'pageshow', event => { if (event.persisted) attempt(); });
  if (document.readyState === 'loading') listen(document, 'DOMContentLoaded', mount, { once: true });
  else mount();
  saveTimer=setInterval(()=>{if(status==='playing')persist();},2000);
  window.CashflowMusic = Object.freeze({
    start,
    setMuted,
    retry() {
      attempt();
    },
    getState() { return { status, muted, activated, time: musicTime(), volume: gain ? gain.gain.value : audio.volume, effects: fx ? fx.getState() : {status:upload?'disabled':fxStatus,enabled:!upload,visual:{activeKeys:[],progress9:0}} }; },
    destroy() {
      destroyed=true;
      pause();
      clearInterval(saveTimer);
      if(fx)fx.destroy();
      listeners.forEach(remove => remove());
      if (button) button.parentNode.remove();
      if (context) context.close().catch(() => {});
      audio.removeAttribute('src');
      audio.load();
      delete window.CashflowMusic;
    }
  });
})();
