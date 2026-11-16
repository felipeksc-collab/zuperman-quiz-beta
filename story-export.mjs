import {
  BlobSource, BufferTarget, CanvasSource, EncodedAudioPacketSource, EncodedPacketSink,
  EncodedVideoPacketSource, Input, MP4, Mp4OutputFormat, Output, canEncodeVideo,
} from './vendor/mediabunny/mediabunny-1.66.0.min.mjs';

const width = 1080;
const height = 1920;
const fps = 30;
const seconds = 8;
const bitrate = 5_000_000;
const soundtrack = new URL('assets/zuperman-story-audio.m4a', import.meta.url);
const foilAssets = [
  'card-preview-1110/v31-mercury-rim.png',
  'card-preview-1110/v33-back-mercury-mask.png',
  'assets/ui/result-foil-flakes.png',
];
let musicRequest;

function loadMusic() {
  if (!musicRequest) {
    musicRequest = fetch(soundtrack).then(response => {
      if (!response.ok) throw new Error('無法載入配樂，請再試一次。');
      return response.blob();
    }).catch(error => {
      musicRequest = null;
      throw error;
    });
  }
  return musicRequest;
}

function surface(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function snapshot(source) {
  const copy = surface(source.width, source.height);
  copy.getContext('2d').drawImage(source, 0, 0);
  return copy;
}

function loadArt(path) {
  const image = new Image();
  image.src = new URL(path, import.meta.url).href;
  return image.decode().then(() => image).catch(() => null);
}

const eased = (t, from, to) => {
  const position = Math.max(0, Math.min(1, (t - from) / (to - from)));
  return position * position * (3 - 2 * position);
};

function opticalMask(w, h, rim, front) {
  const layer = surface(w, h);
  const mask = layer.getContext('2d');
  const stock = mask.createLinearGradient(0, 0, 0, h);
  const exposure = front
    ? [[0, .49], [.065, .25], [.13, .17], [.54, .17], [.58, .13], [.93, .14], [1, .58]]
    : [[0, .55], [.14, .31], [.43, .24], [.58, .24], [.88, .36], [1, .55]];
  for (const [position, alpha] of exposure) stock.addColorStop(position, `rgba(255,255,255,${alpha})`);
  mask.fillStyle = stock;
  mask.fillRect(0, 0, w, h);

  const edges = mask.createLinearGradient(0, 0, w, 0);
  for (const [position, alpha] of [[0, .68], [.05, .55], [.14, .36], [.29, 0], [.71, 0], [.86, .36], [.95, .55], [1, .68]]) {
    edges.addColorStop(position, `rgba(255,255,255,${alpha})`);
  }
  mask.fillStyle = edges;
  mask.fillRect(0, 0, w, h);
  if (front) {
    // Hold the center of the portrait clear while the sides of its glass catch light.
    mask.save();
    mask.translate(w * .5, h * .32);
    mask.scale(w * .4, h * .205);
    const exclusion = mask.createRadialGradient(0, 0, 0, 0, 0, 1);
    exclusion.addColorStop(0, '#fff');
    exclusion.addColorStop(.63, '#fff');
    exclusion.addColorStop(1, '#fff0');
    mask.globalCompositeOperation = 'destination-out';
    mask.fillStyle = exclusion;
    mask.fillRect(-1, -1, 2, 2);
    mask.restore();
  }
  if (rim) mask.drawImage(rim, 0, 0, w, h);
  return layer;
}

const prismStops = [
  [0, '#fff0'], [.19, '#9b55fa00'], [.29, '#8426f34a'], [.36, '#2e9bff9b'],
  [.43, '#38ffffce'], [.48, '#b6fff1e5'], [.505, '#fffef9f2'], [.535, '#fff29bdf'],
  [.58, '#ff9f43af'], [.64, '#ff3d878b'], [.72, '#e776e443'], [.86, '#fff0'], [1, '#fff0'],
];

function prismBand(ink, w, h, position, y, half, tilt, intensity) {
  const center = w * position;
  const band = ink.createLinearGradient(center - half, y - half * tilt, center + half, y + half * tilt);
  for (const [offset, color] of prismStops) band.addColorStop(offset, color);
  ink.globalAlpha = intensity;
  ink.fillStyle = band;
  ink.fillRect(0, 0, w, h);
}

const arcColors = ['#aa79ffb0', '#5999ffd6', '#49ffffdd', '#faffffd6', '#ffff8dd8', '#ffae65ce', '#ff70a8b8'];

function prismArc(ink, x, y, rx, ry, start, end, lean, intensity) {
  function arc(offset) {
    ink.beginPath();
    ink.ellipse(x, y, rx + offset, ry + offset, lean, start, end);
    ink.stroke();
  }
  ink.globalAlpha = intensity * .21;
  ink.strokeStyle = '#f2f8ff';
  ink.lineWidth = 23;
  arc(0);
  ink.globalAlpha = intensity;
  ink.lineWidth = 2.15;
  arcColors.forEach((shade, index) => {
    ink.strokeStyle = shade;
    arc((index - 3) * 2.25);
  });
}

function opticsPainter(w, h, [frontRim, backRim, flakes]) {
  const layer = surface(w, h);
  const ink = layer.getContext('2d');
  const faces = [opticalMask(w, h, frontRim, true), opticalMask(w, h, backRim, false)];
  const grain = surface(w, h);
  const grainInk = grain.getContext('2d');
  return (time, front, angle) => {
    const turnGlow = .8 + .2 * Math.abs(Math.sin(angle));
    const sweep = .5 + .38 * Math.sin(time * 1.07 - .8);
    ink.clearRect(0, 0, w, h);
    prismBand(ink, w, h, sweep, h * .4, w * .20, -.64, .85 * turnGlow);
    prismBand(ink, w, h, .95 - sweep * .74, h * .48, w * .098, .48, .69 * turnGlow);
    const wave = Math.sin(time * 1.44);
    prismArc(ink, -w * .29, h * (.28 + wave * .057), w * .52, h * .327, -1.16, 1.11,
      -.21, .68 + .23 * Math.sin(time * 1.38 + 1));
    prismArc(ink, w * 1.26, h * (.61 + wave * .052), w * .55, h * .315, 2.03, 4.34,
      .24, .7 + .22 * Math.cos(time * 1.47));

    if (flakes) {
      grainInk.globalCompositeOperation = 'source-over';
      grainInk.clearRect(0, 0, w, h);
      grainInk.drawImage(flakes, 0, 0, w, h);
      const reflection = grainInk.createLinearGradient(w * (sweep - .28), 0, w * (sweep + .27), h * .25);
      reflection.addColorStop(0, '#fff2');
      reflection.addColorStop(.4, '#ffff');
      reflection.addColorStop(.6, '#ffff');
      reflection.addColorStop(1, '#fff2');
      grainInk.globalCompositeOperation = 'destination-in';
      grainInk.fillStyle = reflection;
      grainInk.fillRect(0, 0, w, h);
      ink.globalAlpha = .9;
      ink.drawImage(grain, 0, 0);
    }
    ink.globalAlpha = 1;
    ink.globalCompositeOperation = 'destination-in';
    ink.drawImage(faces[front ? 0 : 1], 0, 0);
    ink.globalCompositeOperation = 'source-over';
    return layer;
  };
}

function glintSprite(color) {
  const sprite = surface(128, 128);
  const light = sprite.getContext('2d');
  const glow = light.createRadialGradient(64, 64, 0, 64, 64, 40);
  glow.addColorStop(0, '#fffffffa');
  glow.addColorStop(.14, color);
  glow.addColorStop(.57, `${color.slice(0, 7)}38`);
  glow.addColorStop(1, '#fff0');
  light.fillStyle = glow;
  light.fillRect(0, 0, 128, 128);
  light.translate(64, 64);
  for (let axis = 0; axis < 4; axis++) {
    const length = [61, 31, 55, 34][axis];
    const streak = light.createLinearGradient(-length, 0, length, 0);
    streak.addColorStop(0, '#fff0');
    streak.addColorStop(.25, color);
    streak.addColorStop(.47, '#fffddd');
    streak.addColorStop(.5, '#fff');
    streak.addColorStop(.53, '#f6fcff');
    streak.addColorStop(.75, color);
    streak.addColorStop(1, '#fff0');
    light.fillStyle = streak;
    light.beginPath();
    light.moveTo(-length, 0);
    light.lineTo(0, -2.9);
    light.lineTo(length, 0);
    light.lineTo(0, 2.9);
    light.closePath();
    light.fill();
    light.rotate(Math.PI / 4);
  }
  return sprite;
}

const frontGlints = [[.086, .04], [.32, .033], [.714, .024], [.953, .077], [.096, .241],
  [.929, .265], [.102, .415], [.949, .51], [.083, .705], [.967, .71], [.218, .967], [.894, .941]];
const backGlints = [[.082, .059], [.302, .12], [.724, .038], [.955, .085], [.103, .29],
  [.926, .311], [.157, .478], [.849, .521], [.113, .712], [.923, .739], [.275, .95], [.895, .907]];

function createScene(canvas, front, back, color, foilArt) {
  const context = canvas.getContext('2d', { alpha: false });
  const background = surface(width, height);
  const backdrop = background.getContext('2d');
  backdrop.fillStyle = '#050712';
  backdrop.fillRect(0, 0, width, height);
  const light = backdrop.createRadialGradient(550, 1030, 80, 550, 1030, 900);
  light.addColorStop(0, `${color}5c`);
  light.addColorStop(.65, '#18234a85');
  light.addColorStop(1, '#05071200');
  backdrop.fillStyle = light;
  backdrop.fillRect(0, 0, width, height);

  const cardWidth = 928;
  const cardHeight = cardWidth * front.height / front.width;
  const cardLayer = surface(cardWidth, Math.round(cardHeight));
  const card = cardLayer.getContext('2d');
  const reflect = opticsPainter(cardWidth / 2, Math.round(cardHeight / 2), foilArt);
  const glints = ['#ffa8cbcc', '#b4efffcc', '#ffc686d6'].map(glintSprite);

  return time => {
    context.drawImage(background, 0, 0);
    const angle = back ? Math.PI * (eased(time, 3.2, 3.84) + eased(time, 5.23, 5.87)) : 0;
    const side = Math.cos(angle) < 0 ? back : front;
    const isFront = side === front;
    const horizontal = Math.max(.014, Math.abs(Math.cos(angle)));
    const lift = Math.sin(time * Math.PI / 4);

    card.globalCompositeOperation = 'source-over';
    card.clearRect(0, 0, cardWidth, cardLayer.height);
    card.drawImage(side, 0, 0, cardWidth, cardLayer.height);
    card.globalCompositeOperation = 'source-atop';
    card.drawImage(reflect(time, isFront, angle), 0, 0, cardWidth, cardLayer.height);

    context.save();
    context.translate(width / 2, height / 2 + lift * 11);
    context.rotate(lift * .012);
    context.scale(horizontal, 1);
    context.shadowBlur = 36;
    context.shadowColor = '#01020bdc';
    context.shadowOffsetY = 16;
    context.drawImage(cardLayer, -cardWidth / 2, -cardHeight / 2);
    context.shadowBlur = 0;
    context.shadowOffsetY = 0;
    context.globalCompositeOperation = 'screen';
    const anchorPoints = isFront ? frontGlints : backGlints;
    anchorPoints.forEach(([x, y], i) => {
      const pulse = Math.max(0, Math.cos(time * (2.05 + (i % 3) * .22) + i * 2.37)) ** 12;
      const strength = .12 + .88 * pulse;
      const size = (55 + (i % 4) * 8) * (.64 + strength * .36);
      context.globalAlpha = strength * (.56 + .44 * horizontal);
      const gx = (x - .5) * cardWidth - size / 2;
      const gy = (y - .5) * cardHeight - size / 2;
      context.drawImage(glints[i % glints.length], gx, gy, size, size);
    });
    context.restore();
  };
}

function openMedia(blob) {
  return new Input({ formats: [MP4], source: new BlobSource(blob) });
}

async function copyPackets(track, outputTrack, signal, limit = Infinity) {
  const config = await track?.getDecoderConfig();
  if (!config) throw new Error('無法讀取影片音軌或畫面。');
  let start;
  for await (const packet of new EncodedPacketSink(track).packets()) {
    signal.throwIfAborted();
    start ??= packet.timestamp;
    const timestamp = packet.timestamp - start;
    if (timestamp >= limit) break;
    await outputTrack.add(packet.clone({ timestamp, duration: Math.min(packet.duration, limit - timestamp) }),
      { decoderConfig: config });
  }
  if (start === undefined) throw new Error('影片音軌或畫面為空。');
}

async function encode(videoTrack, music, signal, writeFrames) {
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target });
  const audioTrack = new EncodedAudioPacketSource('aac');
  output.addVideoTrack(videoTrack, { frameRate: fps });
  output.addAudioTrack(audioTrack);
  const input = openMedia(music);
  try {
    await output.start();
    await copyPackets(await input.getPrimaryAudioTrack(), audioTrack, signal, seconds);
    audioTrack.close();
    await writeFrames(videoTrack);
    videoTrack.close();
    await output.finalize();
    signal.throwIfAborted();
    return target.buffer;
  } catch (error) {
    await output.cancel().catch(() => {});
    throw error;
  } finally {
    input.dispose();
  }
}

function recordVideo(canvas, paint, mimeType, signal) {
  const stream = canvas.captureStream(fps);
  return new Promise((resolve, reject) => {
    let frame;
    let recorder;
    const chunks = [];
    const cleanup = () => {
      cancelAnimationFrame(frame);
      signal.removeEventListener('abort', abort);
      stream.getTracks().forEach(track => track.stop());
    };
    const abort = () => {
      if (recorder?.state === 'recording') recorder.stop();
      cleanup();
      reject(signal.reason);
    };
    try {
      signal.throwIfAborted();
      recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => { cleanup(); reject(new Error('瀏覽器無法錄製影片。')); };
      recorder.onstop = () => { cleanup(); resolve(new Blob(chunks, { type: 'video/mp4' })); };
      signal.addEventListener('abort', abort, { once: true });
      paint(0);
      recorder.start();
      const begun = performance.now();
      function tick(now) {
        const elapsed = (now - begun) / 1000;
        if (elapsed >= seconds) { recorder.stop(); return; }
        paint(elapsed);
        frame = requestAnimationFrame(tick);
      }
      frame = requestAnimationFrame(tick);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

export async function makeStory({ canvas, backImage, color, name, signal }) {
  signal.throwIfAborted();
  const front = snapshot(canvas);
  const [music, back, foilArt] = await Promise.all([
    loadMusic(),
    backImage.getAttribute('src') ? backImage.decode().then(() => backImage).catch(() => null) : null,
    Promise.all(foilAssets.map(loadArt)),
  ]);
  signal.throwIfAborted();
  const scene = surface(width, height);
  const paint = createScene(scene, front, back, /^#[\da-f]{6}$/i.test(color) ? color : '#4865ad', foilArt);
  let buffer;
  try {
    if (await canEncodeVideo('avc', { width, height, bitrate })) {
      const videoTrack = new CanvasSource(scene, { codec: 'avc', bitrate, keyFrameInterval: 1 });
      buffer = await encode(videoTrack, music, signal, async track => {
        for (let frame = 0; frame < seconds * fps; frame++) {
          signal.throwIfAborted();
          paint(frame / fps);
          await track.add(frame / fps, 1 / fps);
        }
      });
    }
  } catch (error) {
    signal.throwIfAborted();
    console.warn('Story video encoder could not start.', error);
  }
  if (!buffer) {
    const mime = ['video/mp4;codecs=avc1.420028', 'video/mp4;codecs=avc1']
      .find(type => canvas.captureStream && window.MediaRecorder?.isTypeSupported(type));
    if (!mime) throw new Error('這個瀏覽器無法製作 MP4，請用 Safari 或 Chrome 開啟這個連結。');
    const input = openMedia(await recordVideo(scene, paint, mime, signal));
    try {
      const videoTrack = new EncodedVideoPacketSource('avc');
      buffer = await encode(videoTrack, music, signal, async outputTrack => {
        const track = await input.getPrimaryVideoTrack();
        await copyPackets(track, outputTrack, signal);
      });
    } finally {
      input.dispose();
    }
  }
  return new File([buffer], `ZUPERMAN-${name}-限時動態.mp4`, { type: 'video/mp4' });
}
