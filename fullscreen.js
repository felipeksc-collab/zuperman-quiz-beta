'use strict';

(() => {
  const button = document.getElementById('fullscreen-toggle');
  if (!button) return;

  const root = document.documentElement;
  const standalone = matchMedia('(display-mode: standalone)');
  const isAppleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  const isIPhone = /iPhone|iPod/.test(navigator.userAgent) ||
    (isAppleMobile && Math.min(screen.width, screen.height) <= 600);
  const isMobile = isAppleMobile || /Android/.test(navigator.userAgent) ||
    navigator.userAgentData?.mobile === true || matchMedia('(pointer: coarse)').matches;
  const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
  const isStandalone = () => standalone.matches || navigator.standalone === true;
  const standardFullscreen = () => root.requestFullscreen && document.fullscreenEnabled !== false;
  const webkitFullscreen = () => root.webkitRequestFullscreen && document.webkitFullscreenEnabled !== false;
  let help;
  let startAttempted = false;
  let manualWebkitRequest = false;

  function syncDisplay() {
    const active = Boolean(fullscreenElement());
    const installed = isStandalone();
    const mode = active ? 'fullscreen' : installed ? 'standalone' : 'browser';
    const changed = root.dataset.display !== mode;
    root.dataset.display = mode;
    root.toggleAttribute('data-iphone-browser', isIPhone && mode === 'browser');
    button.hidden = installed && !active;
    button.textContent = active ? '退出全螢幕' :
      isAppleMobile && !standardFullscreen() && !webkitFullscreen() ? '隱藏網址列' : '全螢幕';
    button.setAttribute('aria-pressed', String(active));
    if (changed) requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }

  function showHelp() {
    if (!help) {
      help = document.createElement('dialog');
      help.id = 'fullscreen-help';
      help.setAttribute('aria-labelledby', 'fullscreen-help-title');
      help.addEventListener('keydown', event => event.stopPropagation());

      const heading = document.createElement('h2');
      heading.id = 'fullscreen-help-title';
      heading.textContent = isAppleMobile ? '隱藏 Safari 網址列' : '開啟全螢幕';
      const instructions = document.createElement('p');
      instructions.textContent = isAppleMobile
        ? '在 Safari 開啟試玩網址，點網址列旁的「頁面選單」→「更多」→「隱藏工具列」。點螢幕底部即可叫回工具列。'
        : '請用瀏覽器直接開啟試玩網址，再按「全螢幕」。電腦也可以從瀏覽器選單開啟全螢幕。';

      const close = document.createElement('button');
      close.type = 'button';
      close.textContent = '返回遊戲';
      close.addEventListener('click', () => help.close());
      help.append(heading, instructions, close);
      document.body.append(help);
    }
    if (!help.open) help.showModal();
  }

  async function enterFullscreen(manual) {
    try {
      if (standardFullscreen()) {
        await root.requestFullscreen({ navigationUI: 'hide' });
      } else if (webkitFullscreen()) {
        manualWebkitRequest = manual;
        await root.webkitRequestFullscreen();
      } else if (manual) {
        showHelp();
      }
    } catch {
      manualWebkitRequest = false;
      if (manual) showHelp();
    }
    syncDisplay();
  }

  function tryStartFullscreen() {
    if (!isMobile || startAttempted || isStandalone() ||
        document.body.dataset.phase !== 'title' || !(standardFullscreen() || webkitFullscreen())) return;
    startAttempted = true;
    if (!fullscreenElement()) void enterFullscreen(false);
  }

  // Let the start button request music in its own handler first.
  document.addEventListener('click', event => {
    if (event.isTrusted && event.target instanceof Element &&
        event.target.closest('#start-hash')) tryStartFullscreen();
  });

  window.addEventListener('keydown', event => {
    if (event.isTrusted && !event.repeat && !event.altKey && !event.ctrlKey && !event.metaKey &&
        (event.key === '#' || event.key === '＃') &&
        event.target instanceof Element && !event.target.closest('input, textarea, select, [contenteditable], dialog')) {
      tryStartFullscreen();
    }
  });

  button.addEventListener('click', async () => {
    startAttempted = true;
    if (!fullscreenElement()) {
      await enterFullscreen(true);
      return;
    }
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else await document.webkitExitFullscreen();
    } catch {
      // The browser can exit fullscreen before this request completes.
    }
    syncDisplay();
  });

  // 遊戲中點畫面最上緣可暫時叫回工具列（調音量/退出全螢幕用）
  document.addEventListener('click', event => {
    if (document.body.dataset.phase === 'title') return;
    const y = event.clientY ?? 0;
    if (y <= 16) {
      document.body.classList.add('show-toolbar');
    } else if (!(event.target instanceof Element && event.target.closest('.toolbar'))) {
      document.body.classList.remove('show-toolbar');
    }
  });

  document.addEventListener('fullscreenchange', syncDisplay);
  document.addEventListener('webkitfullscreenchange', () => {
    manualWebkitRequest = false;
    syncDisplay();
  });
  document.addEventListener('webkitfullscreenerror', () => {
    if (manualWebkitRequest) showHelp();
    manualWebkitRequest = false;
  });
  standalone.addEventListener('change', syncDisplay);
  syncDisplay();
})();
