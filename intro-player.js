(() => {
  'use strict';

  const assets = new URL('assets/intro/', document.currentScript.src);
  const videoSource = new URL('lori-opening-web.mp4', assets).href;
  const posterSource = new URL('opening-poster-perspective-v3.jpg', assets).href;
  const players = new WeakMap();

  function mount(title) {
    if (!title) return null;
    const current = players.get(title);
    if (current) return current;

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) return null;

    const controls = title.querySelector('.title-controls');
    const controlsWereInert = controls?.hasAttribute('inert');
    controls?.setAttribute('inert', '');

    const stage = document.createElement('section');
    stage.className = 'zi-intro';
    stage.setAttribute('aria-label', 'ZUPERMAN 開場動畫');

    const video = document.createElement('video');
    video.className = 'zi-intro-video';
    video.defaultMuted = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.preload = 'auto';
    video.disablePictureInPicture = true;
    video.disableRemotePlayback = true;
    video.poster = posterSource;
    video.setAttribute('aria-hidden', 'true');

    const playButton = document.createElement('button');
    playButton.type = 'button';
    playButton.className = 'zi-intro-play';
    playButton.disabled = true;
    playButton.textContent = '載入開場…';

    let closed = false;
    let deadline = 0;
    let videoURL;
    const preload = new AbortController();
    const controller = { destroy, get active() { return !closed; } };
    players.set(title, controller);
    stage.append(video, playButton);
    title.append(stage);

    function destroy() {
      if (closed) return;
      closed = true;
      const restoreFocus = stage.contains(document.activeElement);
      clearTimeout(deadline);
      preload.abort();
      window.removeEventListener('pagehide', destroy);
      reducedMotion.removeEventListener('change', handleMotion);
      video.pause();
      stage.remove();
      video.removeAttribute('src');
      video.load();
      if (videoURL) URL.revokeObjectURL(videoURL);
      if (!controlsWereInert) controls?.removeAttribute('inert');
      players.delete(title);
      if (restoreFocus && !title.hidden) {
        title.querySelector('#start-hash')?.focus({ preventScroll: true });
      }
    }

    function allowTime(ms) {
      clearTimeout(deadline);
      deadline = setTimeout(destroy, ms);
    }

    function handleMotion(event) {
      if (event.matches) destroy();
    }

    async function play(event) {
      playButton.disabled = true;
      playButton.textContent = '載入開場…';
      allowTime(12000);
      try {
        // Start the audible track on the click. Its play promise settles when
        // buffering finishes. The preloaded inline video can then start muted.
        await window.CashflowMusic?.start({ trusted: event.isTrusted });
        if (closed) return;
        await video.play();
        if (closed) return;
        playButton.hidden = true;
        const remaining = (video.duration - video.currentTime) * 1000;
        allowTime(Number.isFinite(remaining) ? Math.max(4000, remaining + 4000) : 10000);
      } catch (_) {
        destroy();
      }
    }

    video.addEventListener('ended', destroy, { once: true });
    video.addEventListener('error', destroy, { once: true });
    playButton.addEventListener('click', play);
    window.addEventListener('pagehide', destroy);
    reducedMotion.addEventListener('change', handleMotion);
    // Buffer the small video before offering the playback gesture.
    allowTime(20000);
    fetch(videoSource, { signal: preload.signal }).then(response => {
      if (!response.ok) throw new Error('Opening video is unavailable.');
      return response.blob();
    }).then(film => {
      if (closed) return;
      videoURL = URL.createObjectURL(film);
      video.src = videoURL;
      clearTimeout(deadline);
      playButton.disabled = false;
      playButton.textContent = '播放開場';
    }).catch(destroy);

    return controller;
  }

  window.ZuperIntroPlayer = { mount };
})();
