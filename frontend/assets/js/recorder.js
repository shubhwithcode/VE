(function initVERecorder() {
  if (!window.VE) window.VE = {};
  if (window.VE.createAudioRecorder) return;

  function createAudioRecorder() {
    if (!('MediaRecorder' in window)) throw new Error('Recording not supported in this browser');
    let recorder = null;
    let stream = null;
    let chunks = [];

    return {
      async start() {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chunks = [];
        recorder = new MediaRecorder(stream);
        recorder.addEventListener('dataavailable', (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        });
        recorder.start();
      },
      async stop() {
        if (!recorder) return null;
        return await new Promise((resolve) => {
          recorder.addEventListener(
            'stop',
            () => {
              try {
                for (const track of stream?.getTracks?.() || []) track.stop();
              } catch {}
              const blob = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' });
              resolve(blob);
            },
            { once: true }
          );
          recorder.stop();
        });
      },
      get state() {
        return recorder?.state || 'inactive';
      }
    };
  }

  window.VE.createAudioRecorder = createAudioRecorder;
})();

