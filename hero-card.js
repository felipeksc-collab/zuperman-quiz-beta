/* Render ZUPERMAN cards with the selected photo and its original background. */
(() => {
  'use strict';

  const resources = new Map();
  const faceModels = new Map();
  let faceQueue = Promise.resolve();
  const cardWidth = 1062;
  const cardHeight = 1482;
  const photoArea = { x: 53, y: 189, width: 956, height: 510 };
  const stockColors = {
    shield: ['#935B3F', '#452316'], weave: ['#C2B7FF', '#9B9DF0'],
    bolt: ['#6030BE', '#2E126D'], forge: ['#FDB7D0', '#E981AB'],
    barrier: ['#007B46', '#003D29'], blaze: ['#D91A20', '#A10813'],
    verdict: ['#464851', '#191B20'], dawn: ['#193CC3', '#071A5A'],
    ascend: ['#FFBC63', '#F2962B']
  };
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const wordSegmenter = typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter('zh-Hant', { granularity: 'word' }) : null;

  function printFoil(context, strength, blend) {
    const bands = context.createLinearGradient(145, -100, 910, 1450);
    for (const [position, color] of [
      [0, '#fff0'], [.10, '#9882ff93'], [.17, '#57d9ffc2'], [.25, '#a1ffe6a3'],
      [.31, '#fff0bfa6'], [.37, '#ff87b3ac'], [.46, '#dab0ff57'], [.52, '#93acff00'],
      [.58, '#7799ffb6'], [.65, '#4ff2d5be'], [.72, '#b7ffaf9b'], [.78, '#ffe5a7a6'],
      [.86, '#ff98d4bd'], [.93, '#a991ffa3'], [1, '#fff0']
    ]) bands.addColorStop(position, color);
    context.save();
    context.globalCompositeOperation = blend;
    context.globalAlpha = strength;
    context.fillStyle = bands;
    context.fillRect(0, 0, cardWidth, cardHeight);
    context.restore();
  }

  function loadResource(url, element) {
    if (resources.has(url)) return resources.get(url);
    const promise = new Promise((resolve, reject) => {
      element.onload = resolve;
      element.onerror = () => {
        element.remove();
        reject(new Error(`無法載入 ${url}`));
      };
      document.head.append(element);
    });
    resources.set(url, promise);
    promise.catch(() => resources.delete(url));
    return promise;
  }

  async function loadFonts(base, heroName) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${base}fonts.css?v=35`;
    await loadResource(link.href, link);
    const faces = await Promise.all([
      document.fonts.load('900 45px CardTC'),
      document.fonts.load('900 78px CardTitle'),
      document.fonts.load('34px CardDigits'),
      document.fonts.load('48px CardPixel', heroName),
    ]);
    if (faces.some(fonts => fonts.length === 0)) throw new Error('卡片字型載入失敗。');
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const source = new URL(url, document.baseURI);
      if (/^https?:$/.test(source.protocol) && source.origin !== location.origin) {
        image.crossOrigin = 'anonymous';
      }
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('圖片無法讀取。'));
      image.src = source.href;
    });
  }

  async function decodePhoto(file) {
    const url = URL.createObjectURL(file);
    try {
      const image = await loadImage(url);
      if (!image.naturalWidth || !image.naturalHeight) throw new Error('圖片尺寸無效。');
      return image;
    } catch (error) {
      throw new Error('無法讀取這張照片，請重新選擇照片再試。', { cause: error });
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function findFace(photo, base) {
    async function detect() {
      const directory = new URL('vendor/face/', base).href;
      if (!faceModels.has(directory)) {
        const script = document.createElement('script');
        script.src = `${directory}face_detection.js`;
        const model = loadResource(script.src, script).then(() => {
          const detector = new window.FaceDetection({ locateFile: file => `${directory}${file}` });
          detector.setOptions({ model: 'short', minDetectionConfidence: .48 });
          return detector;
        });
        faceModels.set(directory, model);
        model.catch(() => faceModels.delete(directory));
      }
      const detector = await faceModels.get(directory);
      const sample = document.createElement('canvas');
      const scale = Math.min(1, 768 / Math.max(photo.naturalWidth, photo.naturalHeight));
      sample.width = Math.max(1, Math.round(photo.naturalWidth * scale));
      sample.height = Math.max(1, Math.round(photo.naturalHeight * scale));
      sample.getContext('2d').drawImage(photo, 0, 0, sample.width, sample.height);
      let face = null;
      detector.onResults(({ detections = [] }) => {
        const boxes = detections.map(detection => detection.boundingBox).filter(Boolean);
        const box = boxes.sort((left, right) => right.width * right.height - left.width * left.height)[0];
        if (box) {
          const x = clamp(box.xCenter - box.width / 2, 0, 1);
          const y = clamp(box.yCenter - box.height / 2, 0, 1);
          face = { x, y, w: clamp(box.width, 0, 1 - x), h: clamp(box.height, 0, 1 - y) };
        }
      });
      await detector.send({ image: sample });
      return face && face.w > .02 && face.h > .02 ? face : null;
    }

    const detection = faceQueue.then(detect).catch(() => null);
    faceQueue = detection;
    let timeout;
    return Promise.race([detection, new Promise(resolve => { timeout = setTimeout(resolve, 3500, null); })])
      .finally(() => clearTimeout(timeout));
  }

  function photoLayout(photo, face) {
    const { width, height } = photoArea;
    const scale = Math.max(width / photo.naturalWidth, height / photo.naturalHeight);
    const imageWidth = photo.naturalWidth * scale;
    const imageHeight = photo.naturalHeight * scale;
    const overflowX = Math.max(0, imageWidth - width);
    const overflowY = Math.max(0, imageHeight - height);
    const x = face ? clamp((face.x + face.w / 2) * imageWidth - width * .5, 0, overflowX) : overflowX / 2;
    let y = overflowY * .22;
    if (face) {
      const ideal = (face.y + face.h / 2) * imageHeight - height * .39;
      const top = Math.min(overflowY, face.y * imageHeight - height * .075);
      const bottom = Math.max(0, (face.y + face.h) * imageHeight - height * .59);
      y = clamp(bottom <= top ? clamp(ideal, bottom, top) : ideal, 0, overflowY);
    }
    return { x, y, imageWidth, imageHeight, overflowX, overflowY, scale, mode: 'cover' };
  }

  function paintCard(canvas, art, photo, record, palette, face, fit) {
    canvas.width = cardWidth;
    canvas.height = cardHeight;
    const context = canvas.getContext('2d');
    context.imageSmoothingQuality = 'high';
    const isLight = contrastLuminance(record.hex) > .31;
    const ink = isLight ? '#211729' : '#fff5e7';
    const hairline = isLight ? '#30223580' : '#fff4e4a8';
    const [stockTop, stockBottom] = stockColors[record.id] || [record.hex, record.hex];

    function rounded(x, y, width, height, radius) {
      context.beginPath();
      context.moveTo(x + radius, y);
      context.arcTo(x + width, y, x + width, y + height, radius);
      context.arcTo(x + width, y + height, x, y + height, radius);
      context.arcTo(x, y + height, x, y, radius);
      context.arcTo(x, y, x + width, y, radius);
      context.closePath();
    }

    function fillRounded(x, y, width, height, radius, fill) {
      rounded(x, y, width, height, radius);
      context.fillStyle = fill;
      context.fill();
    }

    function outline(x, y, width, height, radius, color, lineWidth = 1) {
      rounded(x, y, width, height, radius);
      context.strokeStyle = color;
      context.lineWidth = lineWidth;
      context.stroke();
    }

    function line(x1, y1, x2, y2, color = hairline, width = 1) {
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.strokeStyle = color;
      context.lineWidth = width;
      context.stroke();
    }

    function text(value, x, y, size, options = {}) {
      const { color = ink, weight = 500, align = 'left', maxWidth = 940, family = 'CardTC', italic = false,
        alignInk = false, centerInkY = false } = options;
      context.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${family},sans-serif`;
      context.textBaseline = 'top';
      context.textAlign = align;
      context.fillStyle = color;
      let drawWidth = maxWidth;
      if (alignInk || centerInkY) {
        const bounds = context.measureText(value);
        if (centerInkY) y += (bounds.actualBoundingBoxAscent - bounds.actualBoundingBoxDescent) / 2;
        if (alignInk) {
          const scale = Math.min(1, maxWidth / (bounds.actualBoundingBoxLeft + bounds.actualBoundingBoxRight));
          x += bounds.actualBoundingBoxLeft * scale;
          drawWidth = bounds.width * scale;
        }
      }
      context.fillText(value, x, y, drawWidth);
    }

    function wrappedLines(value, width, size, weight = 550) {
      context.font = `${weight} ${size}px CardTC,sans-serif`;
      const parts = wordSegmenter ? Array.from(wordSegmenter.segment(value), item => item.segment)
        : value.match(/[A-Za-z0-9]+(?:[’'-][A-Za-z0-9]+)*|./gu) || [];
      const tokens = [];
      for (const part of parts) {
        if (tokens.length && /^[，。！？、；：）」』]/u.test(part)) tokens[tokens.length - 1] += part;
        else tokens.push(part);
      }
      const measure = row => {
        const bounds = context.measureText(row.join('').trim());
        return bounds.actualBoundingBoxLeft + bounds.actualBoundingBoxRight;
      };
      const rows = [[]];
      for (const token of tokens) {
        const current = rows[rows.length - 1];
        if (current.length && measure([...current, token]) > width) rows.push([token]);
        else current.push(token);
      }
      if (rows.length > 1) {
        const last = rows[rows.length - 1];
        const previous = rows[rows.length - 2];
        while (previous.length > 1 && measure(last) < width * .25) {
          last.unshift(previous.pop());
        }
      }
      return rows.map(row => row.join('').trim());
    }

    function contain(image, x, y, width, height) {
      const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
      const imageWidth = image.naturalWidth * scale;
      const imageHeight = image.naturalHeight * scale;
      const left = x + (width - imageWidth) / 2;
      const top = y + (height - imageHeight) / 2;
      context.drawImage(image, left, top, imageWidth, imageHeight);
      return { x: left, y: top, width: imageWidth, height: imageHeight, scale, mode: 'contain' };
    }

    function silverPlate(x, y, width, height) {
      const radius = height / 2;
      const gradient = context.createLinearGradient(0, y, 0, y + height);
      for (const [stop, color] of [[0, '#727079'], [.07, '#f8f7ef'], [.26, '#d1d3d5'],
        [.46, '#dee1e1'], [.67, '#a5a9ad'], [.83, '#d7dadd'], [.94, '#b3b8bd'], [1, '#33343e']]) {
        gradient.addColorStop(stop, color);
      }
      fillRounded(x, y, width, height, radius, gradient);
      context.save();
      rounded(x + 4, y + 4, width - 8, height - 8, radius - 4);
      context.clip();
      context.globalAlpha = .13;
      context.drawImage(art.foil, x, y, width, height);
      context.restore();
      outline(x, y, width, height, radius, '#232329', 2);
      outline(x + 2.2, y + 2.2, width - 4.4, height - 4.4, radius - 2.2, '#f1f0e5', 1.2);
    }

    function polygon(points, fill, stroke, lineWidth = 1) {
      context.beginPath();
      context.moveTo(points[0][0], points[0][1]);
      for (const [x, y] of points.slice(1)) context.lineTo(x, y);
      context.closePath();
      if (fill) { context.fillStyle = fill; context.fill(); }
      if (stroke) { context.strokeStyle = stroke; context.lineWidth = lineWidth; context.stroke(); }
    }

    function radar(stats) {
      const centerX = 283;
      const centerY = 1205;
      const radius = 65;
      const vectors = stats.map((_, i) => {
        const angle = -Math.PI / 2 + i * Math.PI / 3;
        return [Math.cos(angle), Math.sin(angle)];
      });
      const pointsAt = scaleAt => vectors.map(([x, y], i) => [
        centerX + x * radius * scaleAt(i),
        centerY + y * radius * scaleAt(i)
      ]);
      for (const scale of [.2, .4, .6, .8, 1]) polygon(pointsAt(() => scale), null, hairline);
      for (const [x, y] of pointsAt(() => 1)) line(centerX, centerY, x, y);
      const actual = pointsAt(i => stats[i][1] / 100);
      polygon(actual, isLight ? '#2f245644' : '#fff3e85a', ink, 2.5);
      for (const [x, y] of actual) {
        context.beginPath();
        context.arc(x, y, 3.7, 0, 2 * Math.PI);
        context.fillStyle = ink;
        context.fill();
      }
      const labels = [[283, 1091], [387, 1157], [387, 1250], [283, 1300], [179, 1250], [179, 1157]];
      stats.forEach(([name, value], i) => {
        const [x, y] = labels[i];
        text(name, x, y, 24, { align: 'center', weight: 700, centerInkY: true });
        text(String(value), x, y + 26, 30, { align: 'center', weight: 850, centerInkY: true });
      });
    }

    function teammateRow(teammate, y) {
      const color = palette.get(teammate.name) || record.hex;
      const x = 466;
      const width = 474;
      const height = 127;
      const cut = 8;
      const shape = [[x + cut, y], [x + width - cut, y], [x + width, y + cut],
        [x + width, y + height - cut], [x + width - cut, y + height],
        [x + cut, y + height], [x, y + height - cut], [x, y + cut]];
      polygon(shape, isLight ? '#fff7ec59' : '#08071864', hairline, 1.4);
      const bodySize = 27;
      const bodyWidth = 428;
      const lineHeight = 32;
      const rows = wrappedLines(teammate.description, bodyWidth, bodySize);
      const stackHeight = 62 + (rows.length - 1) * lineHeight;
      const top = y + (height - stackHeight) / 2;
      const swatchY = top + 13;
      context.beginPath();
      context.arc(x + 32, swatchY, 12, 0, 2 * Math.PI);
      const swatch = context.createRadialGradient(x + 28, swatchY - 5, 1, x + 32, swatchY, 13);
      swatch.addColorStop(0, '#fff1d5');
      swatch.addColorStop(.49, color);
      swatch.addColorStop(1, color);
      context.fillStyle = swatch;
      context.fill();
      context.strokeStyle = '#e2d4ca';
      context.lineWidth = 2;
      context.stroke();
      text(`${teammate.name} ｜ ${teammate.label}`, x + 54, swatchY, 28,
        { weight: 760, maxWidth: 397, alignInk: true, centerInkY: true });
      rows.forEach((row, index) => text(row, x + 24, top + 36 + index * lineHeight, bodySize,
        { weight: 550, maxWidth: bodyWidth, alignInk: true }));
    }

    context.clearRect(0, 0, cardWidth, cardHeight);
    context.save();
    rounded(10, 11, 1042, 1460, 43);
    context.clip();
    const stock = context.createLinearGradient(0, 0, 420, cardHeight);
    stock.addColorStop(0, record.hex);
    stock.addColorStop(.46, record.hex);
    stock.addColorStop(.64, stockTop);
    stock.addColorStop(1, stockBottom);
    context.fillStyle = stock;
    context.fillRect(0, 0, cardWidth, cardHeight);
    context.globalAlpha = .22;
    context.globalCompositeOperation = 'soft-light';
    context.filter = 'grayscale(1) contrast(1.28)';
    context.drawImage(art.foil, 0, 0, cardWidth, cardHeight);
    context.filter = 'none';
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
    const stockLight = context.createRadialGradient(290, 650, 20, 290, 650, 650);
    stockLight.addColorStop(0, '#ffe3b336');
    stockLight.addColorStop(1, '#ffe3b300');
    context.fillStyle = stockLight;
    context.fillRect(0, 0, cardWidth, cardHeight);
    printFoil(context, .8, 'soft-light');
    printFoil(context, isLight ? .45 : .43, 'screen');
    context.restore();

    silverPlate(106, 119, 392, 60);
    text(record.name, 302, 128, 48, { color: '#16161b', weight: 400, family: 'CardPixel', align: 'center', maxWidth: 352 });
    text('ZUPERMAN MODE', 525, 124, 23, { weight: 900, family: 'CardTitle', maxWidth: 230 });
    text(`◦ 代表色・${record.color}`, 525, 149, 22, { weight: 700, maxWidth: 236 });
    contain(art.stars, 782, 118, 201, 61);

    const { x: px, y: py, width: pw, height: ph } = photoArea;
    const photoBorder = context.createLinearGradient(px, py, px + pw, py + ph);
    for (const [stop, color] of [[0, '#dedbd2'], [.17, '#727b82'], [.44, '#22252d'], [.76, '#b7b8b9'], [1, '#41434c']]) {
      photoBorder.addColorStop(stop, color);
    }
    fillRounded(px - 6, py - 6, pw + 12, ph + 12, 27, photoBorder);
    outline(px - 6, py - 6, pw + 12, ph + 12, 27, '#21191e', 2);
    context.save();
    rounded(px, py, pw, ph, 21);
    context.clip();
    context.drawImage(photo, px - fit.x, py - fit.y, fit.imageWidth, fit.imageHeight);
    const shade = context.createLinearGradient(0, py + ph * .6, 0, py + ph);
    shade.addColorStop(0, '#10081900');
    shade.addColorStop(1, '#07040b75');
    context.fillStyle = shade;
    context.fillRect(px, py, pw, ph);
    canvas.dataset.portraitLayout = JSON.stringify({ ...fit, faceAligned: Boolean(face) });
    let markWidth = pw * .91;
    const rotation = Math.PI / 36;
    const markRatio = art.mark.naturalHeight / art.mark.naturalWidth;
    if (face) {
      const faceBottom = (face.y + face.h) * fit.imageHeight - fit.y;
      const available = ph * .946 - faceBottom;
      markWidth = clamp(available / (Math.sin(rotation) + Math.cos(rotation) * markRatio), pw * .46, markWidth);
    }
    const markHeight = markWidth * markRatio;
    context.translate(cardWidth / 2, py + ph - 37 - markHeight / 2);
    context.rotate(-rotation);
    context.shadowColor = '#05030a';
    context.shadowBlur = 8;
    context.shadowOffsetY = 4;
    context.drawImage(art.mark, -markWidth / 2, -markHeight / 2, markWidth, markHeight);
    context.restore();
    outline(px, py, pw, ph, 21, '#f2e9d185', 1.3);

    const readingGround = isLight ? '#fff7ec67' : '#100a1d72';
    const railLeft = 122;
    const railWidth = cardWidth - 2 * railLeft;
    const centeredPlate = { color: '#18191e', align: 'center', centerInkY: true };
    silverPlate(railLeft, 712, 248, 70);
    text('ACTIVATE YOUR', 246, 735, 20, { ...centeredPlate, weight: 900, family: 'CardTitle' });
    text('ZUPERMAN MODE', 246, 759, 21, { ...centeredPlate, weight: 900, family: 'CardTitle' });
    fillRounded(386, 712, 554, 70, 12, readingGround);
    outline(386, 712, 554, 70, 12, hairline, 1.3);
    text(`技能解放  ${record.gear}`, 406, 735, 29,
      { weight: 760, maxWidth: 514, alignInk: true, centerInkY: true });
    text(`封印本體  ${record.obj}`, 406, 760, 24,
      { weight: 650, maxWidth: 514, alignInk: true, centerInkY: true });

    const copyLeft = railLeft + 20;
    const copyWidth = railWidth - 40;
    const copyBodySize = 31;
    const copyLineHeight = 37;
    const copyRows = wrappedLines(record.description, copyWidth, copyBodySize);
    const copyOffset = Math.max(0, (3 - copyRows.length) * copyLineHeight / 2);
    const bodyTop = 853 + copyOffset;
    fillRounded(railLeft, 792, railWidth, 211, 16, readingGround);
    text(`「${record.quote}」`, copyLeft, 822 + copyOffset, 40,
      { weight: 770, maxWidth: copyWidth, alignInk: true, centerInkY: true });
    copyRows.forEach((row, index) => text(row, copyLeft, bodyTop + index * copyLineHeight, copyBodySize,
      { weight: 550, maxWidth: copyWidth, alignInk: true }));
    const descriptionBottom = bodyTop + copyRows.length * copyLineHeight;
    line(copyLeft, 965, copyLeft + copyWidth, 965);
    text(record.hashtags.map(tag => `#${tag}`).join('   '), copyLeft, 982, 23,
      { weight: 650, maxWidth: copyWidth, alignInk: true, centerInkY: true });

    silverPlate(railLeft, 1013, 322, 48);
    text('STATS 能力值', 283, 1037, 28, { ...centeredPlate, weight: 800, maxWidth: 280 });
    line(455, 1022, 455, 1339, hairline, 1.4);
    radar(Object.entries(record.stats));

    silverPlate(466, 1013, 474, 48);
    text('戰力爆棚組隊', 703, 1037, 28, { ...centeredPlate, weight: 800, maxWidth: 430 });
    record.team.forEach((teammate, i) => teammateRow(teammate, 1074 + i * 138));

    silverPlate(213, 1346, 636, 34);
    text('REAL ME    MULTI DIMENSION    BRIGHTER ME', 531, 1363, 21,
      { ...centeredPlate, weight: 900, family: 'CardTitle', maxWidth: 598 });
    context.font = '900 21px CardTitle,sans-serif';
    const footerParts = ['REAL ME', 'MULTI DIMENSION', 'BRIGHTER ME'];
    const fullFooterWidth = context.measureText(footerParts.join('    ')).width;
    const gapWidth = context.measureText('    ').width;
    let separatorX = 531 - fullFooterWidth / 2;
    for (const part of footerParts.slice(0, -1)) {
      separatorX += context.measureText(part).width + gapWidth / 2;
      const y = 1363;
      polygon([[separatorX, y - 5], [separatorX + 1.5, y - 1.5], [separatorX + 5, y],
        [separatorX + 1.5, y + 1.5], [separatorX, y + 5], [separatorX - 1.5, y + 1.5],
        [separatorX - 5, y], [separatorX - 1.5, y - 1.5]], '#16161b', null);
      separatorX += gapWidth / 2;
    }
    context.drawImage(art.rim, 0, 0, cardWidth, cardHeight);
    canvas.dataset.type = record.id;
    canvas.dataset.designVersion = 'v40';
    canvas.dataset.stats = JSON.stringify(record.stats);
    canvas.dataset.descriptionBottom = String(descriptionBottom);
  }

  function contrastLuminance(hex) {
    const channels = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255);
    const weights = [.2126, .7152, .0722];
    return channels.reduce((sum, value, i) => sum + weights[i] *
      (value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4), 0);
  }

  async function loadFrontArt(base) {
    const [foil, mark, stars, silverRim] = await Promise.all([
      loadImage(`${base}v8-silver-foil.png`),
      loadImage(`${base}v31-zuperman-chrome.png`),
      loadImage(`${base}art-v8/gold-stars.png`),
      loadImage(`${base}v31-mercury-rim.png`)
    ]);
    const rim = document.createElement('canvas');
    rim.width = cardWidth;
    rim.height = cardHeight;
    const context = rim.getContext('2d');
    context.drawImage(silverRim, 0, 0, cardWidth, cardHeight);
    printFoil(context, .56, 'source-atop');
    return { foil, mark, stars, rim };
  }

  function create({ canvas, assetBase = 'card-preview-1110/' } = {}) {
    if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError('需要英雄證畫布。');
    const directory = new URL(assetBase, document.baseURI);
    if (!directory.pathname.endsWith('/')) directory.pathname += '/';
    directory.hash = '';
    directory.search = '';
    const base = directory.href;
    let records;
    let artPromise;
    let generation = 0;
    let current;
    let drag;

    function redraw() {
      if (!current) return;
      const { art, photo, record, palette, face, fit } = current;
      paintCard(canvas, art, photo, record, palette, face, fit);
    }

    function setPhotoOffset(x, y) {
      if (!current) return;
      const { fit } = current;
      const nextX = clamp(x, 0, fit.overflowX);
      const nextY = clamp(y, 0, fit.overflowY);
      if (nextX === fit.x && nextY === fit.y) return;
      fit.x = nextX;
      fit.y = nextY;
      redraw();
      canvas.dispatchEvent(new Event('cardcropchange'));
    }

    canvas.addEventListener('pointerdown', event => {
      if (!current || event.button !== 0 || canvas.hidden) return;
      const bounds = canvas.getBoundingClientRect();
      const scale = cardWidth / bounds.width;
      const y = (event.clientY - bounds.top) * scale;
      if (y < photoArea.y || y > photoArea.y + photoArea.height) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, scale, fit: { ...current.fit } };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
      if (drag?.id !== event.pointerId) return;
      setPhotoOffset(drag.fit.x + (drag.x - event.clientX) * drag.scale,
        drag.fit.y + (drag.y - event.clientY) * drag.scale);
    });
    canvas.addEventListener('lostpointercapture', () => { drag = null; });
    canvas.addEventListener('keydown', event => {
      if (!current) return;
      const move = { ArrowLeft: [24, 0], ArrowRight: [-24, 0], ArrowUp: [0, 24], ArrowDown: [0, -24] }[event.key];
      if (!move) return;
      event.preventDefault();
      setPhotoOffset(current.fit.x + move[0], current.fit.y + move[1]);
    });

    async function getRecord(heroKey) {
      if (!records) {
        records = fetch(`${base}fronts-data.json?v=33`).then(response => {
          if (!response.ok) throw new Error('英雄證資料載入失敗，請再試一次。');
          return response.json();
        });
        records.catch(() => { records = null; });
      }
      const entries = await records;
      const record = entries.find(entry => entry.id === heroKey);
      if (!record) throw new Error('找不到對應的英雄證卡面。');
      return record;
    }

    function getArt() {
      if (!artPromise) {
        artPromise = loadFrontArt(base);
        artPromise.catch(() => { artPromise = null; });
      }
      return artPromise;
    }

    async function render(heroKey, file, { onStatus } = {}) {
      const token = ++generation;
      current = null;
      const checkCurrent = () => {
        if (token !== generation) throw new DOMException('照片處理已取消。', 'AbortError');
      };
      onStatus?.('卡片素材載入中…', 'loading');
      const [record, photo] = await Promise.all([getRecord(heroKey), decodePhoto(file)]);
      checkCurrent();
      const [art, entries, face] = await Promise.all([getArt(), records, findFace(photo, base), loadFonts(base, record.name)]);
      checkCurrent();
      const palette = new Map(entries.map(entry => [entry.name, entry.hex]));
      current = { art, photo, record, palette, face, fit: photoLayout(photo, face) };
      redraw();
      onStatus?.('英雄證已完成', 'ready');
      return { record, warnings: [], canvas, backURL: `${base}${record.backFile}` };
    }

    function cancel() {
      generation++;
      current = null;
      drag = null;
    }

    return Object.freeze({ getRecord, render, cancel });
  }

  window.HeroCard = Object.freeze({ create });
})();
