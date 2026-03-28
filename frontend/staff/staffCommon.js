async function ensureStaff({ redirect = true } = {}) {
  try {
    const me = await VE.api('/api/auth/me');
    if (me?.user?.role !== 'staff') {
      if (redirect) location.href = './login.html';
      throw new Error('Not staff');
    }
    return me.user;
  } catch (e) {
    if (redirect) location.href = './login.html';
    throw e;
  }
}

function initialsFromName(name) {
  const parts = String(name || 'VE')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const initials = (parts[0]?.[0] || 'V') + (parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '');
  return initials.toUpperCase();
}

function initStaffAppBar({ title } = {}) {
  const dashAvatar = VE.$('#dashAvatar');
  const dashName = VE.$('#dashName');
  const dashDate = VE.$('#dashDate');
  const dashTime = VE.$('#dashTime');
  const pageTitle = VE.$('#pageTitle');

  if (title && pageTitle) pageTitle.textContent = String(title);

  function updateDateTime() {
    const d = new Date();
    if (dashDate) dashDate.textContent = d.toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' });
    if (dashTime) dashTime.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  updateDateTime();
  window.setInterval(updateDateTime, 15000);

  return {
    setUser(user) {
      if (dashName) dashName.textContent = user?.name || 'Staff';
      if (dashAvatar) dashAvatar.textContent = initialsFromName(user?.name);
    }
  };
}

function hookLogoutButton({ selector = '#logoutBtn' } = {}) {
  const btn = VE.$(selector);
  if (!btn) return;
  btn.addEventListener('click', async () => {
    await VE.api('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('ve_auth_token');
    location.href = './login.html';
  });
}

function getApiBaseForAssets() {
  const productionApiBase = 'https://ve-production.up.railway.app';
  try {
    const base = localStorage.getItem('ve_api_base') || '';
    if (base) return String(base).replace(/\/$/, '');
  } catch {
    // ignore storage issues
  }
  try {
    const explicit = window.VE_API_BASE;
    if (explicit) return String(explicit).replace(/\/$/, '');
  } catch {
    // ignore window access issues
  }
  return productionApiBase;
}

function assetUrl(p) {
  if (!p) return '';
  const apiBase = getApiBaseForAssets();
  let norm = String(p).replace(/^\/+/, '');
  if (!norm.startsWith('uploads/')) {
    if (norm.startsWith('profiles/') || norm.startsWith('checkin/') || norm.startsWith('checkout/') || norm.startsWith('work/')) {
      norm = `uploads/${norm}`;
    } else if (!norm.includes('/')) {
      norm = `uploads/profiles/${norm}`;
    }
  }
  return apiBase ? `${apiBase}/${norm}` : `/${norm}`;
}

function assetCandidates(p) {
  const raw = String(p || '').replace(/^\/+/, '');
  if (!raw) return [];
  const apiBase = getApiBaseForAssets();
  const candidates = [];

  const push = (value) => {
    const url = String(value || '').trim();
    if (!url || candidates.includes(url)) return;
    candidates.push(url);
  };

  push(assetUrl(raw));
  push(apiBase ? `${apiBase}/${raw}` : `/${raw}`);
  if (!raw.startsWith('uploads/')) {
    push(apiBase ? `${apiBase}/uploads/${raw}` : `/uploads/${raw}`);
  }
  if (!raw.includes('/')) {
    push(apiBase ? `${apiBase}/uploads/profiles/${raw}` : `/uploads/profiles/${raw}`);
  }
  return candidates;
}

function setImageWithFallback(imgEl, path, fallback) {
  if (!imgEl) return;
  const queue = assetCandidates(path);
  let index = 0;

  const next = () => {
    if (index >= queue.length) {
      imgEl.onerror = null;
      imgEl.src = fallback;
      return;
    }
    imgEl.src = queue[index++];
  };

  imgEl.onerror = next;
  if (queue.length > 0) {
    next();
  } else {
    imgEl.onerror = null;
    imgEl.src = fallback;
  }
}

window.VEStaff = { ensureStaff, initStaffAppBar, hookLogoutButton, getApiBaseForAssets, assetUrl, assetCandidates, setImageWithFallback };
