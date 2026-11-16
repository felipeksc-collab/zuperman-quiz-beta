(() => {
  'use strict';

  const storyModule = new URL('story-export.mjs?v=58', document.currentScript.src);

  function mount({ showPage, restartQuiz }) {
    const get = id => document.getElementById(id);
    const stage = get('ending-stage');
    const photoInput = get('photo-input');
    const photoPreview = get('photo-preview');
    const placeholder = get('photo-placeholder');
    const makeButton = get('make-card');
    const photoStatus = get('photo-status');
    const dialog = get('hero-card-dialog');
    const canvas = get('card-canvas');
    const backImage = get('card-back-face');
    const flipButton = get('flip-card');
    const warning = get('card-warning');
    const storyStatus = get('story-status');
    const saveButton = get('save-hero-card');
    const shareButton = get('share-hero-card');
    const assetBase = new URL('card-preview-1110/', location.href);
    const renderer = window.HeroCard.create({ canvas, assetBase: assetBase.href });
    const privacyNote = '照片只在你的裝置處理';

    let result;
    let photo;
    let photoURL;
    let renderId = 0;
    let rendering = false;
    let storyAbort;
    let storyTimer;
    let storyFile;

    function storyControls(disabled, message) {
      saveButton.disabled = disabled;
      shareButton.disabled = disabled;
      storyStatus.textContent = message;
    }

    function cancelStory() {
      clearTimeout(storyTimer);
      storyAbort?.abort();
      storyFile = null;
    }

    function prepareStory() {
      cancelStory();
      if (!dialog.open || dialog.dataset.reveal !== 'ready' || document.hidden) return;
      const controller = new AbortController();
      storyAbort = controller;
      storyControls(true, '正在製作 9:16 有聲影片…');
      storyTimer = setTimeout(async () => {
        try {
          const { makeStory } = await import(storyModule.href);
          const file = await makeStory({ canvas, backImage, color: result.hero.swatch,
            name: result.hero.displayName, signal: controller.signal });
          if (controller.signal.aborted) return;
          storyFile = file;
          storyControls(false, '');
        } catch (error) {
          if (controller.signal.aborted) return;
          console.error('Story export failed.', error);
          storyControls(false, error.message || '影片製作失敗，請再試一次。');
        }
      }, 240);
    }

    function saveStory(file) {
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
    function updateMakeButton() {
      makeButton.hidden = !photo;
      get('choose-photo-footer').hidden = Boolean(photo);
      makeButton.disabled = !photo || rendering;
    }

    function cancelRender() {
      renderId += 1;
      if (rendering) {
        renderer.cancel();
        rendering = false;
        photoStatus.textContent = privacyNote;
        updateMakeButton();
      }
    }

    function setPhoto(file) {
      cancelRender();
      if (photoURL) URL.revokeObjectURL(photoURL);
      photo = file;
      photoURL = file ? URL.createObjectURL(file) : null;
      placeholder.hidden = Boolean(file);
      photoPreview.hidden = !file;
      if (photoURL) photoPreview.src = photoURL;
      else photoPreview.removeAttribute('src');
      photoStatus.textContent = privacyNote;
      updateMakeButton();
    }

    function show(nextResult) {
      result = nextResult;
      photoInput.value = '';
      setPhoto(null);

      const { hero } = nextResult;
      stage.style.setProperty('--ending-swatch', hero.swatch);
      stage.style.setProperty('--ending-deep', hero.deep);
      stage.style.setProperty('--ending-light', hero.hi);
      stage.style.setProperty('--ending-highlight', hero.ui);
      get('upload-hero-name').textContent = hero.displayName;
      window.ZuperResultV31.show(nextResult);
      showPage('result');
    }

    function openUpload(event) {
      event?.preventDefault();
      if (!result) return;
      const selected = result;
      showPage('upload');
      window.ZuperCardReveal?.prime(dialog);
      // The first turn shows the actual card back. Load it while the user is selecting a photo.
      renderer.getRecord(selected.heroKey).then(({ backFile }) => {
        if (result === selected && backFile && !dialog.open) {
          backImage.src = new URL(backFile, assetBase).href;
          backImage.decode?.().catch(() => {});
        }
      }).catch(() => {});
    }

    async function makeCard() {
      if (!result || !photo || rendering) return;
      const id = ++renderId;
      rendering = true;
      updateMakeButton();
      photoStatus.textContent = '正在製作英雄證…';
      try {
        const rendered = await renderer.render(result.heroKey, photo, {
          onStatus(message) {
            if (id === renderId) photoStatus.textContent = message;
          }
        });
        if (id !== renderId) return;
        canvas.hidden = false;
        backImage.hidden = true;
        flipButton.hidden = !rendered.backURL;
        flipButton.textContent = '查看背面';
        if (rendered.backURL) backImage.src = rendered.backURL;
        else backImage.removeAttribute('src');
        warning.textContent = (rendered.warnings || []).join(' ');
        warning.hidden = !warning.textContent;
        photoStatus.textContent = privacyNote;
        storyControls(true, '');
        window.ZuperCardReveal?.prepare(dialog);
        dialog.showModal();
      } catch (error) {
        if (id === renderId) {
          photoStatus.textContent = error.message || '製作失敗，請再試一次';
        }
      } finally {
        if (id === renderId) {
          rendering = false;
          updateMakeButton();
        }
      }
    }

    function useZero() {
      if (dialog.open) return;
      if (document.body.dataset.phase === 'result') openUpload();
      else if (photo) makeCard();
      else photoInput.click();
    }

    get('card-link').addEventListener('click', openUpload);
    get('back-result').addEventListener('click', () => showPage('result'));
    get('restart').addEventListener('click', restartQuiz);
    photoInput.addEventListener('change', () => {
      const file = photoInput.files[0];
      if (file) setPhoto(file);
    });
    photoPreview.addEventListener('error', () => {
      if (!photoURL) return;
      photoPreview.hidden = true;
      placeholder.hidden = false;
    });
    makeButton.addEventListener('click', makeCard);
    flipButton.addEventListener('click', () => {
      const frontVisible = !canvas.hidden;
      canvas.hidden = frontVisible;
      backImage.hidden = !frontVisible;
      flipButton.textContent = frontVisible ? '查看正面' : '查看背面';
    });
    dialog.addEventListener('cardrevealready', prepareStory);
    canvas.addEventListener('cardcropchange', prepareStory);
    dialog.addEventListener('close', () => { if (!dialog.open) cancelStory(); });
    document.addEventListener('visibilitychange', () => {
      if (dialog.open && !storyFile && dialog.dataset.reveal === 'ready') prepareStory();
    });
    saveButton.addEventListener('click', () => {
      if (storyFile) saveStory(storyFile);
      else prepareStory();
    });
    shareButton.addEventListener('click', async () => {
      if (!storyFile) { prepareStory(); return; }
      const data = { files: [storyFile] };
      try {
        if (navigator.share && navigator.canShare?.(data)) {
          await navigator.share(data);
          return;
        }
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
      storyStatus.textContent = '請下載影片，再到 Instagram 限時動態選取。';
    });
    get('close-hero-card').addEventListener('click', () => dialog.close());
    updateMakeButton();

    return {
      show,
      useZero,
      leaveUpload() {
        cancelRender();
        if (dialog.open) dialog.close();
      }
    };
  }

  window.ZuperEnding = { mount };
})();
