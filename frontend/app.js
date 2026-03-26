function uniq(list) {
  return [...new Set(list.filter(Boolean))];
}

function getApiCandidates() {
  const candidates = [];

  let preferBackend = false;
  try {
    // If opened via a static dev server (e.g. Live Server :5500), prefer the backend API first.
    const port = String(location?.port ?? '');
    if (port && port !== '3000') preferBackend = true;
  } catch {}

  // 1) Explicit override (useful when hosting frontend separately).
  try {
    if (window.VE_API_BASE) candidates.push(String(window.VE_API_BASE).replace(/\/$/, ''));
  } catch {}

  // 2) Stored override.
  try {
    const stored = localStorage.getItem('ve_api_base');
    if (stored) candidates.push(String(stored).replace(/\/$/, ''));
  } catch {}

  // 3) Same-origin (works when served by backend).
  if (!preferBackend) candidates.push('');

  // 4) Common local dev fallbacks (backend default :3000).
  try {
    const proto = typeof location !== 'undefined' ? location.protocol : 'http:';
    const host = typeof location !== 'undefined' ? location.hostname : 'localhost';
    if (proto === 'http:' || proto === 'https:') {
      candidates.push(`${proto}//${host}:3000`);
    }
  } catch {}

  // 5) Absolute fallback.
  candidates.push('http://localhost:3000');

  // If we preferred backend first, try same-origin last (some dev servers may proxy /api).
  if (preferBackend) candidates.push('');

  return uniq(candidates);
}

async function api(path, options = {}) {
  const isApiPath = typeof path === 'string' && path.startsWith('/api/');
  const candidates = isApiPath ? getApiCandidates() : [''];
  const tokenKey = 've_auth_token';
  const timeoutMs = Number(options?.timeoutMs ?? 10000);

  let lastErr = null;
  for (const base of candidates) {
    try {
      const { headers: optHeaders, ...rest } = options || {};
      const headers = new Headers(optHeaders || undefined);
      try {
        const token = localStorage.getItem(tokenKey);
        if (token && !headers.has('authorization')) headers.set('authorization', `Bearer ${token}`);
      } catch {
        // ignore storage access issues (private mode / blocked)
      }

      const controller = new AbortController();
      const timer = Number.isFinite(timeoutMs) && timeoutMs > 0 ? window.setTimeout(() => controller.abort(), timeoutMs) : null;
      let res;
      try {
        res = await fetch(`${base}${path}`, { credentials: 'include', ...rest, headers, signal: controller.signal });
      } finally {
        if (timer) window.clearTimeout(timer);
      }
      const isJson = res.headers.get('content-type')?.includes('application/json');
      const body = isJson ? await res.json() : await res.text();

      // When running the frontend from a static server or an SPA dev server,
      // `/api/*` might be handled by that server and return HTML with 200.
      // In that case, try the next candidate base.
      if (base === '' && isApiPath && res.ok && !isJson) {
        lastErr = new Error('API not reachable from this origin. Open via the backend server (e.g. http://localhost:3000).');
        continue;
      }

      if (res.ok) {
        // Cache working base for cross-origin setups.
        if (isApiPath && base && base !== '') {
          try {
            localStorage.setItem('ve_api_base', base);
          } catch {}
        }
        return body;
      }

      // When the frontend is opened from a static server (e.g. Live Server),
      // `/api/*` may be handled by that server and return 404/405. Try backend next.
      if (base === '' && isApiPath && (res.status === 404 || res.status === 405)) {
        lastErr = new Error(body?.error || res.statusText || 'API error');
        continue;
      }

      throw new Error(body?.error || res.statusText || 'API error');
    } catch (e) {
      lastErr = e;
      if (e && e.name === 'AbortError') {
        // Try next base if request timed out.
        if (base === '' && isApiPath) continue;
        continue;
      }
      // If first attempt (same-origin) failed, try localhost backend next.
      if (base === '' && isApiPath) continue;
      break;
    }
  }

  throw lastErr || new Error('API error');
}

function $(sel) {
  return document.querySelector(sel);
}

function setStatus(el, msg, ok = true) {
  el.textContent = msg;
  el.className = ok ? 'muted ok' : 'muted err';
}

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

function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  return d.toLocaleString();
}

window.VE = { api, $, setStatus, getLocation, startCamera, stopStream, captureSelfieBlob, formatDateTime };
