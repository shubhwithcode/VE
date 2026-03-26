function portalPrefix() {
  const p = String(location.pathname || '').toLowerCase();
  if (p.includes('/staff/')) return './';
  if (p.includes('/admin/')) return './';
  return './';
}

function currentPage() {
  const parts = String(location.pathname || '').split('/').filter(Boolean);
  const last = parts[parts.length - 1] || '';
  return last.toLowerCase() || 'index.html';
}

function buildPortalNav(area) {
  const prefix = portalPrefix();
  const page = currentPage();

  const staffLinks = [
    { href: `${prefix}index.html`, icon: '🏠', label: 'Dashboard', key: 'index.html' },
    { href: `${prefix}attendance.html`, icon: '📅', label: 'Attendance', key: 'attendance.html' },
    { href: `${prefix}work.html`, icon: '🧾', label: 'Work Detail', key: 'work.html' },
    { href: `${prefix}employees.html`, icon: '👷', label: 'Employees', key: 'employees.html' },
    { href: `${prefix}leave.html`, icon: '📝', label: 'Leave', key: 'leave.html' },
    { href: `${prefix}schedules.html`, icon: '📋', label: 'Schedules', key: 'schedules.html' },
    { href: `${prefix}assets.html`, icon: '🧰', label: 'Assets', key: 'assets.html' },
    { href: `${prefix}salary.html`, icon: '💰', label: 'Salary', key: 'salary.html' }
  ];

  const adminLinks = [
    { href: `${prefix}index.html`, icon: '🏠', label: 'Home', key: 'index.html' },
    { href: `${prefix}dashboard.html`, icon: '📊', label: 'Dashboard', key: 'dashboard.html' },
    { href: `${prefix}manage-staff.html`, icon: '👥', label: 'Manage Staff', key: 'manage-staff.html' },
    { href: `${prefix}attendance.html`, icon: '📆', label: 'Attendance', key: 'attendance.html' },
    { href: `${prefix}reports.html`, icon: '📋', label: 'Reports', key: 'reports.html' },
    { href: `${prefix}payroll.html`, icon: '💰', label: 'Payroll', key: 'payroll.html' },
    { href: `${prefix}leaves.html`, icon: '📝', label: 'Leaves', key: 'leaves.html' },
    { href: `${prefix}setting.html`, icon: '⚙️', label: 'Settings', key: 'setting.html' }
  ];

  const links = area === 'staff' ? staffLinks : area === 'admin' ? adminLinks : [];

  const list = links
    .map((l) => {
      const active = page === l.key;
      return `<a class="portalLink ${active ? 'active' : ''}" href="${l.href}">
        <span class="portalIco" aria-hidden="true">${l.icon}</span>
        <span class="portalLbl">${l.label}</span>
      </a>`;
    })
    .join('');

  return `
    <div class="portalNavShell" aria-label="Sidebar">
      <div class="portalNavHead">
        <div class="portalBrand">
          <div class="portalBrandMark" aria-hidden="true">VE</div>
          <div class="portalBrandMeta">
            <div class="portalBrandTitle">${area === 'admin' ? 'Admin Portal' : 'Staff Portal'}</div>
            <div class="portalBrandSub">Quick navigation</div>
          </div>
        </div>
      </div>
      <nav class="portalNavLinks" aria-label="Portal navigation">
        ${list}
      </nav>
      <div class="portalNavFoot">
        <button class="secondary portalLogoutBtn" id="portalLogoutBtn" type="button">Logout</button>
      </div>
    </div>
  `;
}

function buildPortalBottom(area) {
  const prefix = portalPrefix();
  const page = currentPage();

  const items =
    area === 'staff'
      ? [
          { href: `${prefix}index.html`, icon: '🏠', label: 'Home', key: 'index.html' },
          { href: `${prefix}attendance.html`, icon: '📅', label: 'Attend', key: 'attendance.html' },
          { href: `${prefix}work.html`, icon: '🧾', label: 'Work', key: 'work.html' },
          { href: `${prefix}salary.html`, icon: '💰', label: 'Salary', key: 'salary.html' }
        ]
      : area === 'admin'
      ? [
          { href: `${prefix}index.html`, icon: '🏠', label: 'Home', key: 'index.html' },
          { href: `${prefix}dashboard.html`, icon: '📊', label: 'Dash', key: 'dashboard.html' },
          { href: `${prefix}manage-staff.html`, icon: '👥', label: 'Staff', key: 'manage-staff.html' },
          { href: `${prefix}payroll.html`, icon: '💰', label: 'Payroll', key: 'payroll.html' }
        ]
      : [];

  const out = items
    .map((it) => {
      const active = page === it.key;
      return `<a class="portalBottomItem ${active ? 'active' : ''}" href="${it.href}">
        <span class="portalBottomIco" aria-hidden="true">${it.icon}</span>
        <span class="portalBottomLbl">${it.label}</span>
      </a>`;
    })
    .join('');

  return `<nav class="portalBottom" aria-label="Quick actions">${out}</nav>`;
}

(function mountPortalNav() {
  const p = String(location.pathname || '').toLowerCase();
  const isStaff = p.includes('/staff/');
  const isAdmin = p.includes('/admin/');
  if (!isStaff && !isAdmin) return;

  const navMount = document.getElementById('vePortalNavMount');
  const bottomMount = document.getElementById('vePortalBottomMount');
  const area = isAdmin ? 'admin' : 'staff';
  if (navMount) navMount.innerHTML = buildPortalNav(area);
  if (bottomMount) bottomMount.innerHTML = buildPortalBottom(area);

  const portalLogoutBtn = document.getElementById('portalLogoutBtn');
  if (portalLogoutBtn && window.VE?.api) {
    portalLogoutBtn.addEventListener('click', async () => {
      await VE.api('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('ve_auth_token');
      location.href = './login.html';
    });
  }
})();
