/* The original recorded key sounds. Playback stays inside the user's key gesture. */
(() => {
  const soundFiles = {'*':'3','#':'7'};
  const sounds = new Map();
  const live = new Set();
  for (let i = 0; i < 10; i++) {
    const sound = new Audio(`assets/paid-keys/key-${i}.wav`);
    sound.preload = 'auto'; sound.volume = .65; sounds.set(String(i), sound);
  }
  window.addEventListener('phone:key', event => {
    const digit = String(event.detail?.digit ?? '');
    const source = sounds.get(soundFiles[digit] || digit);
    if (!source || document.hidden) return;
    const voice = source.cloneNode(); voice.volume = .65;
    live.add(voice); voice.onended = () => live.delete(voice);
    voice.play().catch(() => live.delete(voice));
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { for (const voice of live) voice.pause(); live.clear(); }
  });
})();
