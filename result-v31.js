(() => {
  'use strict';

  const get = id => document.getElementById(id);
  const root = get('result-page');
  const scroll = get('v31-result-scroll');
  const team = get('hero-team');
  const fullTeam = get('v31-full-team');
  const radar = get('result-radar');
  const heroesByName = new Map(Object.values(window.QuizEngine.heroes).map(hero => [hero.displayName, hero]));
  const stockTones = {
    shield: ['#ae6647', '#3a1d15', '#fff3e4'],
    weave: ['#c7ceff', '#6c76bf', '#191933'],
    bolt: ['#8256d7', '#260e57', '#f9edff'],
    forge: ['#ffbed5', '#bb668e', '#381a2a'],
    barrier: ['#24a263', '#003c27', '#efffed'],
    blaze: ['#ff4b38', '#8e0610', '#fff0e2'],
    verdict: ['#5a5e69', '#101116', '#f6f4ee'],
    dawn: ['#315dcf', '#080f42', '#e9f1ff'],
    ascend: ['#ffc170', '#c7651c', '#351b08'],
  };
  let current;

  function node(tag, content) {
    const element = document.createElement(tag);
    if (content !== undefined) element.textContent = content;
    return element;
  }

  function drawRadar(values, ink) {
    const context = radar.getContext('2d');
    const centerX = radar.width / 2;
    const centerY = radar.height / 2;
    const radius = 47;
    const points = values.map((_, index) => {
      const angle = index * Math.PI / 3 - Math.PI / 2;
      return [Math.cos(angle), Math.sin(angle)];
    });
    const place = (point, scale) => [centerX + point[0] * radius * scale, centerY + point[1] * radius * scale];
    function polygon(levels) {
      context.beginPath();
      points.forEach((point, index) => {
        const destination = place(point, levels[index]);
        if (index) context.lineTo(...destination);
        else context.moveTo(...destination);
      });
      context.closePath();
    }
    context.clearRect(0, 0, radar.width, radar.height);
    context.strokeStyle = ink + '87';
    context.lineWidth = 1.2;
    for (const level of [.25, .5, .75, 1]) {
      polygon(values.map(() => level));
      context.stroke();
    }
    for (const point of points) {
      context.beginPath();
      context.moveTo(centerX, centerY);
      context.lineTo(...place(point, 1));
      context.stroke();
    }
    polygon(values.map(value => value / 100));
    context.fillStyle = ink + '39';
    context.fill();
    context.strokeStyle = ink;
    context.lineWidth = 2.8;
    context.stroke();
    context.fillStyle = ink;
    context.font = '750 23px V31CardTC, system-ui, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    points.forEach((point, index) => {
      context.beginPath();
      context.arc(...place(point, values[index] / 100), 2.7, 0, Math.PI * 2);
      context.fill();
      context.fillText(String(values[index]), ...place(point, 1.28));
    });
  }

  function jumpTo(heading) {
    const top = scroll.scrollTop + heading.getBoundingClientRect().top - scroll.getBoundingClientRect().top;
    heading.focus({ preventScroll: true });
    scroll.scrollTop = Math.max(0, top - 6);
  }

  function teammate({ name, label, description }, index, fallbackColor) {
    const colorValue = heroesByName.get(name)?.swatch || fallbackColor;
    const summary = node('li');
    const full = node('li');
    const heading = node('h3');
    const copy = node('p', description);
    const button = node('button');
    const color = node('i');
    color.setAttribute('aria-hidden', 'true');
    full.id = `v31-full-teammate-${index + 1}`;
    full.className = 'v31-full-teammate';
    full.style.setProperty('--team-color', colorValue);
    heading.tabIndex = -1;
    heading.append(node('strong', name), node('span', label));
    copy.className = 'v31-teammate-description';
    full.append(heading, copy);
    button.type = 'button';
    button.className = 'v31-teammate';
    button.style.setProperty('--team-color', colorValue);
    button.setAttribute('aria-controls', full.id);
    button.append(color, node('strong', name), node('span', label));
    button.addEventListener('click', () => jumpTo(heading));
    summary.append(button);
    return { summary, full };
  }

  function show(nextResult) {
    current = nextResult;
    const { heroKey, hero, axes, stats } = nextResult;
    const [highlight, shade, ink] = stockTones[heroKey];
    root.style.setProperty('--hero-hex', hero.swatch);
    root.style.setProperty('--hero-highlight', highlight);
    root.style.setProperty('--hero-shade', shade);
    root.style.setProperty('--hero-ink', ink);
    get('hero-name').textContent = hero.displayName;
    get('hero-color-name').textContent = hero.colorName;
    get('hero-gear').textContent = hero.gear;
    get('hero-item').textContent = hero.obj;
    get('hero-quote').textContent = `「${hero.quote}」`;
    get('v31-profile-copy').textContent = hero.sketch;
    get('v31-traits').replaceChildren(...hero.traits.map(([trait]) => {
      const item = node('li');
      item.append(node('span', `#${trait}`));
      return item;
    }));
    get('v31-full-stats').replaceChildren(...axes.map((axis, index) => {
      const row = node('div');
      row.append(node('dt', axis), node('dd', stats[index]));
      return row;
    }));
    const teammates = nextResult.team.map((member, index) => teammate(member, index, hero.swatch));
    team.replaceChildren(...teammates.map(entry => entry.summary));
    fullTeam.replaceChildren(...teammates.map(entry => entry.full));
    scroll.scrollTop = 0;
    if (root.hidden) requestAnimationFrame(() => {
      if (current === nextResult) scroll.scrollTop = 0;
    });
    drawRadar(stats, ink);
    document.fonts?.load('750 23px V31CardTC').then(() => {
      if (current === nextResult) drawRadar(stats, ink);
    }).catch(() => {});
  }

  const scrollCue = get('v31-scroll-cue');
  const cardLink = get('card-link');
  const actions = node('div');
  const cueLabel = node('span', scrollCue.firstChild.textContent.trim());
  const compactLabel = node('span', '完整結果');
  actions.className = 'v31-actions';
  cueLabel.className = 'v31-cue-label';
  compactLabel.className = 'v31-cue-compact';
  scrollCue.firstChild.replaceWith(cueLabel, compactLabel);
  cardLink.before(actions);
  actions.append(scrollCue, cardLink);
  scrollCue.addEventListener('click', () => jumpTo(get('v31-profile-heading')));
  get('v31-abilities').addEventListener('click', () => jumpTo(get('v31-abilities-heading')));

  const clamp = value => Math.min(1, Math.max(0, value));

  function ornament(className) {
    const node = document.createElement('span');
    node.className = className;
    node.setAttribute('aria-hidden', 'true');
    return node;
  }

  function spark(x, y, alpha, elevated = false) {
    const glint = ornament(elevated ? 'v10-foil-glint v10-foil-corner' : 'v10-foil-glint');
    glint.style.setProperty('--v10-glint-x', `${x}%`);
    glint.style.setProperty('--v10-glint-y', `${y}%`);
    glint.style.setProperty('--v10-glint-alpha', alpha);
    return glint;
  }

  function addFilm(root) {
    const stock = root.querySelector('.v31-stock');
    stock.prepend(ornament('v20-stock-foil'));

    const panel = root.querySelector('.v31-visual');
    panel.classList.add('v10-foil-art');
    const depth = ornament('v10-foil-depth');
    depth.append(ornament('v10-foil-diffraction'), ornament('v10-foil-reflection'), ornament('v10-foil-grain'));
    for (const [x, y, alpha] of [[8, 14, .87], [88, 14, .75], [13, 75, .84], [91, 77, .86], [27, 29, .42]]) depth.append(spark(x, y, alpha));
    panel.prepend(depth);
    panel.append(ornament('v10-foil-panel-edge'), spark(7.5, 7, .75, true),
      spark(94, 92, .82, true), ornament('v10-foil-glint v10-foil-follow'));
    root.append(
      ornament('v31-autonomous-light v38-result-foil'),
      ornament('v31-autonomous-light v36-result-metal-light'),
    );
  }

  function enableFilm(root) {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const options = { passive: true };
    const variables = ['angle', 'x', 'y', 'light-x', 'light-y', 'glint-x', 'glint-y'];
    let frame = 0;
    let releaseTimer;
    let point;
    let inView = typeof IntersectionObserver !== 'function';
    let suspended = false;
    root.dataset.v10Foil = '';
    addFilm(root);

    function setPosition(normalizedX, normalizedY) {
      const x = clamp(normalizedX);
      const y = clamp(normalizedY);
      const values = [
        `${(126 + (x - .5) * 56 + (y - .5) * 31).toFixed(2)}deg`,
        `${(3 + 94 * (1 - x)).toFixed(2)}%`,
        `${(4 + 92 * (1 - y)).toFixed(2)}%`,
        `${(10 + 78 * x).toFixed(2)}%`,
        `${(9 + 81 * y).toFixed(2)}%`,
        `${(x < .5 ? 4.5 + 17 * x : 87 + 17 * (x - .5)).toFixed(2)}%`,
        `${y < .55 ? 5.5 : 94.5}%`,
      ];
      values.forEach((value, index) => root.style.setProperty(`--v10-foil-${variables[index]}`, value));
      root.dataset.v10FoilActive = 'true';
    }

    function position() {
      frame = 0;
      if (!point || !root.dataset.v31FoilRunning) return;
      const bounds = root.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      setPosition((point.x - bounds.left) / bounds.width, (point.y - bounds.top) / bounds.height);
    }

    function move(event) {
      if (event.pointerType === 'touch' || event.isPrimary === false || !root.dataset.v31FoilRunning) return;
      point = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(position);
      clearTimeout(releaseTimer);
      releaseTimer = setTimeout(reset, 1100);
    }

    function reset() {
      if (frame) cancelAnimationFrame(frame);
      clearTimeout(releaseTimer);
      frame = 0;
      point = null;
      delete root.dataset.v10FoilActive;
      variables.forEach(name => root.style.removeProperty(`--v10-foil-${name}`));
    }

    function syncAutoplay() {
      const playing = inView && !root.hidden && !document.hidden && !suspended && !motion.matches;
      if (playing) root.dataset.v31FoilRunning = 'true';
      else {
        delete root.dataset.v31FoilRunning;
        reset();
      }
    }

    if (typeof IntersectionObserver === 'function') {
      const observer = new IntersectionObserver(entries => {
        inView = entries[entries.length - 1].isIntersecting;
        syncAutoplay();
      });
      observer.observe(root);
    }
    new MutationObserver(syncAutoplay).observe(root, { attributes: true, attributeFilter: ['hidden'] });
    document.addEventListener('visibilitychange', syncAutoplay);
    window.addEventListener('pagehide', () => { suspended = true; syncAutoplay(); });
    window.addEventListener('pageshow', () => { suspended = false; syncAutoplay(); });
    motion.addEventListener?.('change', syncAutoplay);
    syncAutoplay();

    root.addEventListener('pointermove', move, options);
    root.addEventListener('pointerdown', move, options);
    root.addEventListener('pointerleave', reset, options);
    root.addEventListener('pointercancel', reset, options);
    root.addEventListener('pointerup', event => { if (event.pointerType !== 'mouse') reset(); }, options);
  }

  enableFilm(root);

  window.ZuperResultV31 = Object.freeze({ show });
})();
