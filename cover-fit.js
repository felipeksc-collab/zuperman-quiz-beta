'use strict';
/* v5（11/16）：電話亭放大到貼滿螢幕。
   原圖最下面 6% 是深色留白 → 裁掉；寬度貼滿左右；
   螢幕比較矮（Safari／Telegram 內開）時橫向最多拉寬 15%，其餘才露出金屬牆。 */
(() => {
  const VISIBLE = 0.94;
  const MAX_STRETCH = 1.15;
  const ids = ['title-page', 'phone-holder', 'ending-stage'];
  let queued = false;
  let observer;

  function viewport() {
    const vv = window.visualViewport;
    const h = vv && vv.height > 0 && Math.abs(vv.scale - 1) < 0.01 ? vv.height : innerHeight;
    return { W: document.documentElement.clientWidth || innerWidth, H: Math.floor(h) };
  }

  function apply() {
    queued = false;
    observer?.disconnect();
    const { W, H } = viewport();
    const zoom = document.body.classList.contains('screen-zoom');
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.style.transform = '';
      if (el.hidden || el.closest('[hidden]') || (zoom && id === 'phone-holder')) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      let sx = W / r.width;
      let sy = H / (r.height * VISIBLE);
      const cap = W <= 600 ? MAX_STRETCH : 1;
      if (sy >= sx) sy = sx;                    // 螢幕夠高：等比例貼滿左右
      else if (sx > sy * cap) sx = sy * cap;    // 螢幕矮：貼滿上下，橫向微拉
      const tx = (W - r.width * sx) / 2 - r.left;
      const ty = -r.top;
      el.style.transformOrigin = '0 0';
      el.style.transform = `translate(${tx.toFixed(2)}px,${ty.toFixed(2)}px) scale(${sx.toFixed(5)},${sy.toFixed(5)})`;
    }
    observe();
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => requestAnimationFrame(apply));
  }

  function observe() {
    observer ??= new MutationObserver(schedule);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-phase', 'class'] });
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el, { attributes: true, attributeFilter: ['hidden', 'style'] });
    }
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-display', 'data-iphone-browser'] });
  }

  addEventListener('resize', schedule);
  addEventListener('orientationchange', schedule);
  addEventListener('pageshow', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  document.querySelectorAll('#title-page > img, #phone-body').forEach(img => img.addEventListener('load', schedule));
  schedule();
})();
