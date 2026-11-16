'use strict';
/* v5（11/16）：電話亭放大到貼滿螢幕。
   原圖最下面 6% 是深色留白 → 裁掉；寬度貼滿左右；
   螢幕比較矮（Safari／Telegram 內開）時橫向最多拉寬 15%，其餘才露出金屬牆。 */
(() => {
  const VISIBLE = 0.94;
  const TOP_CROP = 0.022;
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
      let sy, tx, ty;
      if (id === 'title-page' && el.querySelector('.zi-intro')) {
        // 開場動畫：等比例放大蓋滿整個畫面，上下多的裁掉（天空與地面倒影）
        sx = sy = Math.max(W / r.width, H / r.height);
        tx = (W - r.width * sx) / 2 - r.left;
        ty = (H - r.height * sy) / 2 - r.top;
      } else {
        sy = H / (r.height * (VISIBLE - TOP_CROP));
        if (sy >= sx) {                         // 螢幕夠高：等比例貼滿左右
          sy = sx;
          ty = -r.top;
        } else {                                // 螢幕矮：上緣鉚釘邊框裁掉一點，左右一律貼滿
          if (W > 600) sx = sy;
          ty = -r.top - r.height * TOP_CROP * sy;
        }
        tx = (W - r.width * sx) / 2 - r.left;
      }
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
    const title = document.getElementById('title-page');
    if (title) observer.observe(title, { childList: true });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-display', 'data-iphone-browser'] });
  }

  addEventListener('resize', schedule);
  addEventListener('orientationchange', schedule);
  addEventListener('pageshow', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  document.querySelectorAll('#title-page > img, #phone-body').forEach(img => img.addEventListener('load', schedule));
  schedule();
})();
