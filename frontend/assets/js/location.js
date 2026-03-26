(function initVELocation() {
  if (!window.VE) window.VE = {};
  if (window.VE.getLocation) return;

  async function getLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(new Error(err.message)),
        { enableHighAccuracy: true, timeout: 15000 }
      );
    });
  }

  window.VE.getLocation = getLocation;
})();

