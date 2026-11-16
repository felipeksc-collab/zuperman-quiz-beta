(() => {
  'use strict';

  const scriptURL = document.currentScript.src;
  const asset = path => new URL(path, scriptURL).href;
  const preludeMs = 680;
  const launchDelayMs = 520;
  const turnMs = 1540;
  const portalMs = launchDelayMs + turnMs;
  const sessions = new WeakMap();
  // Front and back positions are sampled from their respective silver artwork.
  const glintSites = [
    [9.9, 4.3, 10, 4.5, 7.8, 0],
    [32, 3, 42.2, 41.6, 6.1, .82],
    [71.2, 2.2, 71.8, 3, 5.4, 1.53],
    [95.8, 6.7, 95.1, 7.2, 6.9, 2.25],
    [96, 35, 96.4, 33.6, 5.2, 3.06],
    [96.2, 63, 94, 61.8, 5.9, 3.88],
    [93.5, 92.8, 92.3, 89.3, 7.1, 4.61],
    [62.9, 97.4, 63.7, 96.9, 6.4, 5.32],
    [6.7, 77.3, 3.8, 73, 5.5, 6.1],
    [4.4, 41.8, 3.4, 43.3, 5.1, 6.65],
  ];

  function element(tag, className, decoration = false) {
    const node = document.createElement(tag);
    node.className = className;
    if (decoration) {
      node.setAttribute('aria-hidden', 'true');
      if (tag === 'img') node.alt = '';
    }
    return node;
  }

  function mount(dialog) {
    const front = dialog.querySelector('#card-canvas');
    const back = dialog.querySelector('#card-back-face');
    if (!front || !back) return null;

    const stage = element('div', 'v9-r-stage');
    stage.style.setProperty('--phone-push-duration', `${preludeMs}ms`);
    stage.style.setProperty('--card-launch-delay', `${launchDelayMs}ms`);
    stage.style.setProperty('--card-turn-duration', `${turnMs}ms`);
    stage.style.setProperty('--metal-portal-duration', `${portalMs}ms`);
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const phone = element('div', 'v43-r-phone', true);
    const body = element('img', 'v43-r-body', true);
    body.src = asset('assets/ui/phone-b.png');
    const glass = element('span', 'v43-r-glass', true);
    phone.append(body, glass);
    const beam = element('span', 'v43-r-beam', true);
    const logo = element('img', 'v43-r-logo', true);
    logo.src = asset('card-preview-1110/art-v8/chrome-hur.png');

    const badge = element('span', 'v9-r-license', true);
    badge.textContent = 'HERO LICENSE';
    const flight = element('div', 'v9-r-card-flight');
    const face = element('div', 'hero-reveal-v31-face');
    const foilTint = element('span', 'hero-reveal-v40-foil hero-reveal-v42-foil-tint', true);
    const foilStock = element('span', 'hero-reveal-v40-foil hero-reveal-v40-foil-stock', true);
    const foilMetal = element('span', 'hero-reveal-v40-foil hero-reveal-v40-foil-metal', true);
    const glints = element('span', 'hero-reveal-v40-glints', true);
    for (const [x, y, backX, backY, size, phase] of glintSites) {
      const glint = element('i', 'hero-reveal-v40-glint');
      glint.style.setProperty('--glint-x', `${x}%`);
      glint.style.setProperty('--glint-y', `${y}%`);
      glint.style.setProperty('--back-glint-x', `${backX}%`);
      glint.style.setProperty('--back-glint-y', `${backY}%`);
      glint.style.setProperty('--glint-size', `${size}%`);
      glint.style.setProperty('--glint-delay', `-${phase}s`);
      glints.append(glint);
    }
    const turn = element('div', 'hero-reveal-v32-turn', true);
    const turnFront = element('div', 'hero-reveal-v32-turn-front');
    const turnCanvas = element('canvas', 'hero-reveal-v32-turn-canvas');
    const turnBack = element('div', 'hero-reveal-v32-turn-back');
    const turnImage = element('img', 'hero-reveal-v32-turn-image', true);
    const landingCatch = element('span', 'v40-r-catch', true);
    turnFront.append(turnCanvas);
    turnBack.append(turnImage);
    turn.append(turnFront, turnBack);

    const skipButton = element('button', 'hero-reveal-v31-skip');
    skipButton.type = 'button';
    skipButton.textContent = '略過動畫';
    const status = element('span', 'hero-reveal-v31-status');
    status.setAttribute('role', 'status');

    front.before(stage);
    face.append(front, back, foilTint, foilStock, foilMetal, glints);
    flight.append(face, turn, landingCatch);
    stage.append(phone, beam, logo, flight, badge, status);
    stage.after(skipButton);
    dialog.classList.add('hero-card-reveal-v31');

    let frame = 0;
    let timer = 0;

    function show(next, crt = '') {
      stage.dataset.revealPhase = next;
      dialog.dataset.reveal = next;
      if (crt) stage.dataset.crt = crt;
      else delete stage.dataset.crt;
      skipButton.hidden = next === 'ready' || next === 'idle';
    }

    function stop() {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    }

    function reset() {
      stop();
      delete stage.dataset.settled;
      delete dialog.dataset.settled;
      face.removeAttribute('data-card-dragging');
      status.textContent = '';
      show('idle');
    }

    function finish() {
      if (!dialog.open || ['idle', 'ready'].includes(dialog.dataset.reveal)) return;
      const restoreFocus = document.activeElement === skipButton;
      stop();
      stage.dataset.settled = '';
      dialog.dataset.settled = '';
      show('ready');
      status.textContent = '英雄證已亮相';
      if (restoreFocus) dialog.querySelector('#flip-card')?.focus({ preventScroll: true });
      dialog.dispatchEvent(new Event('cardrevealready'));
    }

    function beginPortal() {
      if (!dialog.open || dialog.dataset.reveal !== 'prelude') return;
      show('portal');
      timer = setTimeout(finish, portalMs);
    }

    function syncFaces() {
      turnCanvas.width = front.width;
      turnCanvas.height = front.height;
      turnCanvas.getContext('2d')?.drawImage(front, 0, 0);
      if (back.hasAttribute('src')) {
        turnImage.src = back.src;
        turnImage.hidden = !(turnImage.complete && turnImage.naturalWidth);
      } else {
        turnImage.hidden = true;
        turnImage.removeAttribute('src');
      }
    }

    function play() {
      reset();
      show('loading');
      status.textContent = '英雄證出場動畫播放中';
      // The caller opens the dialog immediately after preparing it.
      frame = requestAnimationFrame(() => {
        if (!dialog.open) return;
        skipButton.focus({ preventScroll: true });
        if (reducedMotion.matches) {
          finish();
          return;
        }
        syncFaces();
        show('prelude', 'metal');
        timer = setTimeout(beginPortal, preludeMs);
      });
    }

    skipButton.addEventListener('click', finish);
    front.addEventListener('gotpointercapture', () => { face.setAttribute('data-card-dragging', ''); });
    front.addEventListener('lostpointercapture', () => { face.removeAttribute('data-card-dragging'); });
    const updateVisibility = () => stage.toggleAttribute('data-motion-paused', document.hidden);
    document.addEventListener('visibilitychange', updateVisibility);
    updateVisibility();
    turnImage.addEventListener('load', () => { turnImage.hidden = false; });
    turnImage.addEventListener('error', () => { turnImage.hidden = true; });
    dialog.addEventListener('close', () => { if (!dialog.open) reset(); });
    reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) finish(); });
    show('idle');

    return { play, skip: finish, reset };
  }

  function prime(dialog) {
    let session = sessions.get(dialog);
    if (!session) {
      session = mount(dialog);
      if (!session) return null;
      sessions.set(dialog, session);
    }
    return session;
  }

  function prepare(dialog) { prime(dialog)?.play(); }

  window.ZuperCardReveal = {
    prime,
    prepare,
    play: prepare,
    skip(dialog) { sessions.get(dialog)?.skip(); },
    reset(dialog) { sessions.get(dialog)?.reset(); },
  };
})();
