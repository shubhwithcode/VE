async function ensureAdmin({ redirect = true } = {}) {
  try {
    const me = await VE.api('/api/auth/me');
    if (me?.user?.role !== 'admin') {
      if (redirect) location.href = './login.html';
      throw new Error('Not admin');
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

function initAdminAppBar({ title } = {}) {
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
      if (dashName) dashName.textContent = user?.name || 'Admin';
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

window.VEAdmin = { ensureAdmin, initAdminAppBar, hookLogoutButton };

