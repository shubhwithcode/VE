(function initVECamera() {
  if (!window.VE) window.VE = {};
  if (window.VE.startCamera && window.VE.captureSelfieBlob) return;

  async function startCamera(videoEl) {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    videoEl.srcObject = stream;
    await videoEl.play();
    return stream;
  }

  function stopStream(stream) {
    if (!stream) return;
    for (const track of stream.getTracks()) track.stop();
  }

  async function captureSelfieBlob(videoEl) {
    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth || 640;
    canvas.height = videoEl.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  }

  window.VE.startCamera = startCamera;
  window.VE.stopStream = stopStream;
  window.VE.captureSelfieBlob = captureSelfieBlob;
})();

