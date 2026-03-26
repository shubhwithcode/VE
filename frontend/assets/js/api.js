(function initVEApi() {
  if (!window.VE) window.VE = {};
  if (window.VE.api) return;

  async function api(path, options = {}) {
    const isApiPath = typeof path === 'string' && path.startsWith('/api/');
    const candidates = isApiPath ? ['', 'http://localhost:3000'] : [''];
    const tokenKey = 've_auth_token';

    let lastErr = null;
    for (const base of candidates) {
      try {
        const { headers: optHeaders, ...rest } = options || {};
        const headers = new Headers(optHeaders || undefined);
        try {
          const token = localStorage.getItem(tokenKey);
          if (token && !headers.has('authorization')) headers.set('authorization', `Bearer ${token}`);
        } catch {
          // ignore storage access issues
        }

        const res = await fetch(`${base}${path}`, { credentials: 'include', ...rest, headers });
        const isJson = res.headers.get('content-type')?.includes('application/json');
        const body = isJson ? await res.json() : await res.text();

        if (base === '' && isApiPath && res.ok && !isJson) {
          lastErr = new Error('API not reachable from this origin. Open the app from http://localhost:3000');
          continue;
        }

        if (res.ok) return body;

        if (base === '' && isApiPath && (res.status === 404 || res.status === 405)) {
          lastErr = new Error(body?.error || res.statusText || 'API error');
          continue;
        }

        throw new Error(body?.error || res.statusText || 'API error');
      } catch (e) {
        lastErr = e;
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
    if (!el) return;
    el.textContent = msg;
    el.className = ok ? 'muted ok' : 'muted err';
  }

  function formatDateTime(value) {
    if (!value) return '-';
    const d = new Date(value);
    return d.toLocaleString();
  }

  window.VE.api = api;
  window.VE.$ = $;
  window.VE.setStatus = setStatus;
  window.VE.formatDateTime = formatDateTime;
})();

