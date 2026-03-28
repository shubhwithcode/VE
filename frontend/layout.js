/**
 * Vishwakarma Enterprises Layout Management
 * Restored Global Header, Footer, and Navigation
 */

function pathPrefix() {
  const p = String(location.pathname || '').toLowerCase();
  if (p.includes('/admin/') || p.includes('/staff/')) return '../';
  return '';
}

function normalizePathForMatch(path) {
  const normalized = String(path || '')
    .toLowerCase()
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\.\.\//, '/')
    .replace(/^\.\//, '/')
    .replace(/\/index\.html$/, '/')
    .replace(/\/$/, '');

  const adminIdx = normalized.lastIndexOf('/admin/');
  if (adminIdx >= 0) return normalized.slice(adminIdx);

  const staffIdx = normalized.lastIndexOf('/staff/');
  if (staffIdx >= 0) return normalized.slice(staffIdx);

  return normalized;
}

function isCurrentPath(targetHref) {
  const current = normalizePathForMatch(window.location.pathname || '');
  let target = normalizePathForMatch(targetHref || '');

  if (!target.startsWith('/')) {
    target = normalizePathForMatch(`/admin/${target.replace(/^admin\//, '')}`);
  }

  return current === target || current.endsWith(target);
}

function getAdminHubConfig(prefix = '') {
  const lowerPath = String(window.location.pathname || '').toLowerCase();
  let savedHub = '';
  try {
    const stored = localStorage.getItem('ve_admin_hub');
    if (stored === 'website' || stored === 'staff') savedHub = stored;
  } catch {}

  const brandPages = [
    '/admin/manage-gallery.html',
    '/admin/manage-customers.html',
    '/admin/manage-queries.html',
    '/admin/manage-quotations.html',
    '/admin/manage-feedback.html',
    '/admin/manage-content.html'
  ];
  const staffPages = [
    '/admin/dashboard.html',
    '/admin/attendance.html',
    '/admin/payroll.html',
    '/admin/reports.html',
    '/admin/leaves.html',
    '/admin/manage-staff.html',
    '/admin/setting.html',
    '/admin/settings.html'
  ];

  const brandQuickActions = [
    { href: 'admin/manage-gallery.html', icon: 'photo_library', label: 'Gallery' },
    { href: 'admin/manage-customers.html', icon: 'groups', label: 'Customers' },
    { href: 'admin/manage-queries.html', icon: 'chat_bubble', label: 'Queries' },
    { href: 'admin/manage-content.html', icon: 'edit_note', label: 'Content' }
  ];
  const staffQuickActions = [
    { href: 'admin/dashboard.html', icon: 'dashboard', label: 'Home' },
    { href: 'admin/attendance.html', icon: 'person_pin_circle', label: 'Attendance' },
    { href: 'admin/payroll.html', icon: 'payments', label: 'Payroll' },
    { href: 'admin/reports.html', icon: 'assessment', label: 'Reports' }
  ];

  let hub = 'staff';
  if (brandPages.some((p) => lowerPath.includes(p))) hub = 'website';
  else if (lowerPath.includes('/admin/dashboard.html') && savedHub) hub = savedHub;
  else if (staffPages.some((p) => lowerPath.includes(p))) hub = 'staff';
  else if (savedHub) hub = savedHub;

  const items = hub === 'website' ? brandQuickActions : staffQuickActions;
  const normalizedItems = items.map((item) => ({
    ...item,
    href: `${prefix}${item.href}`
  }));

  return { hub, items: normalizedItems };
}

function buildLogoBadge(prefix = '') {
  return `<span class="logoBadge"><img src="${prefix}assets/ve-logo.png" alt="Vishwakarma Enterprises logo" class="logoBadgeImg"></span>`;
}

function buildMobileMenuBrand(prefix = '', sub = 'Premium Furniture') {
  return `
    <div class="mobileMenuBrand">
      ${buildLogoBadge(prefix)}
      <div class="mobileMenuBrandText">
        <span class="mobileMenuBrandTitle">Vishwakarma Enterprises</span>
        <span class="mobileMenuBrandSub">${sub}</span>
      </div>
    </div>`;
}

function buildHeader(prefix) {
  const homeHref = `${prefix}index.html`;
  const galleryHref = `${prefix}gallery.html`;
  const adminHref = `${prefix}admin/login.html`;
  const staffHref = `${prefix}staff/login.html`;
  const portalHref = `${prefix}portal.html`;
  const adminHomeHref = `${prefix}admin/dashboard.html`;
  const adminAttendanceHref = `${prefix}admin/attendance.html`;
  const adminPayrollHref = `${prefix}admin/payroll.html`;
  const adminReportsHref = `${prefix}admin/reports.html`;
  const currentPath = window.location.pathname;
  const lowerPath = currentPath.toLowerCase();
  const isAdminPage = lowerPath.includes('/admin/');
  const adminHubConfig = isAdminPage ? getAdminHubConfig(prefix) : null;

  if (isAdminPage) {
    return `
  <header class="siteHeader adminHeader">
    <div class="navContainer adminNavContainer">
      <a href="${adminHomeHref}" class="logo adminLogo">
        ${buildLogoBadge(prefix)}
        <div class="logoTextContainer">
          <span class="logoMain">Vishwakarma Enterprises</span>
          <span class="logoSub">Executive Control Suite</span>
        </div>
      </a>

      <nav class="navLinks adminNavLinks">
        <a href="${adminHomeHref}" class="navLink ${lowerPath.includes('/admin/dashboard.html') ? 'active' : ''}">Dashboard</a>
        <a href="${adminAttendanceHref}" class="navLink ${lowerPath.includes('/admin/attendance.html') ? 'active' : ''}">Attendance</a>
        <a href="${adminPayrollHref}" class="navLink ${lowerPath.includes('/admin/payroll.html') ? 'active' : ''}">Payroll</a>
        <a href="${adminReportsHref}" class="navLink ${lowerPath.includes('/admin/reports.html') ? 'active' : ''}">Reports</a>
      </nav>

      <div class="navActions desktopOnly adminHeaderActions">
        <a href="${homeHref}" class="adminHeaderChip">Public Site</a>
      </div>

      <div class="navActionsMobile adminHeaderMobile">
        <a href="${homeHref}" class="adminHeaderChip">Site</a>
        <button class="mobileToggle" onclick="toggleMenu(true)">
          <span class="material-symbols-rounded">menu</span>
        </button>
      </div>
    </div>

      <div id="mobileMenu" class="mobileOverlay adminMobileOverlay">
      <div class="mobileMenuHeader">
        ${buildMobileMenuBrand(prefix, 'Executive Control Suite')}
        <span class="material-symbols-rounded closeBtn" onclick="toggleMenu(false)">close</span>
      </div>
      <div class="mobileMenuContent">
        <a href="${adminHomeHref}" class="mobileMenuLink" onclick="toggleMenu(false)">
          <div class="mLinkInfo">
            <span class="mLinkTitle">Dashboard</span>
            <span class="mLinkSub">Executive Overview</span>
          </div>
          <span class="material-symbols-rounded">chevron_right</span>
        </a>
        <a href="${adminAttendanceHref}" class="mobileMenuLink" onclick="toggleMenu(false)">
          <div class="mLinkInfo">
            <span class="mLinkTitle">Attendance</span>
            <span class="mLinkSub">Track Workforce Live</span>
          </div>
          <span class="material-symbols-rounded">chevron_right</span>
        </a>
        <a href="${adminPayrollHref}" class="mobileMenuLink" onclick="toggleMenu(false)">
          <div class="mLinkInfo">
            <span class="mLinkTitle">Payroll</span>
            <span class="mLinkSub">Salary Operations</span>
          </div>
          <span class="material-symbols-rounded">chevron_right</span>
        </a>
        <a href="${adminReportsHref}" class="mobileMenuLink" onclick="toggleMenu(false)">
          <div class="mLinkInfo">
            <span class="mLinkTitle">Reports</span>
            <span class="mLinkSub">Daily Performance</span>
          </div>
          <span class="material-symbols-rounded">chevron_right</span>
        </a>
        <a href="${homeHref}" class="mobileMenuLink" onclick="toggleMenu(false)">
          <div class="mLinkInfo">
            <span class="mLinkTitle">Public Site</span>
            <span class="mLinkSub">Customer Experience</span>
          </div>
          <span class="material-symbols-rounded">chevron_right</span>
        </a>
      </div>
      <div class="mobileMenuFooter">
        <p>Vishwakarma Enterprises Workspace</p>
        <p style="color: var(--gold-accent); letter-spacing: 2px; font-size: 0.6rem; font-weight: 800;">ADMIN ACCESS</p>
      </div>
    </div>

    <nav class="adminQuickActions" aria-label="Admin quick actions">
      ${adminHubConfig.items.map((item) => `
      <a href="${item.href}" class="adminQuickAction ${isCurrentPath(item.href) ? 'active' : ''}">
        <span class="material-symbols-rounded">${item.icon}</span>
        <span>${item.label}</span>
      </a>`).join('')}
    </nav>
  </header>
`;
  }

  return `
  <header class="siteHeader">
    <div class="navContainer">
      <a href="${homeHref}" class="logo">
        ${buildLogoBadge(prefix)}
        <div class="logoTextContainer">
          <span class="logoMain">Vishwakarma Enterprises</span>
          <span class="logoSub">Premium Furniture</span>
        </div>
      </a>
      
      <nav class="navLinks">
        <a href="${homeHref}" class="navLink ${currentPath.endsWith('index.html') || currentPath.endsWith('/') || currentPath === '/' ? 'active' : ''}">Home</a>
        <a href="${galleryHref}" class="navLink ${currentPath.includes('gallery.html') ? 'active' : ''}">Collections</a>
        <a href="${portalHref}" class="navLink ${currentPath.includes('portal.html') || currentPath.includes('customer-portal.html') ? 'active' : ''}">Portal</a>
      </nav>

      <div class="navActions desktopOnly">
        <span class="material-symbols-rounded" onclick="focusSearch()">search</span>
        <span class="material-symbols-rounded">shopping_bag</span>
      </div>

      <div class="navActionsMobile">
        <span class="material-symbols-rounded" onclick="focusSearch()">search</span>
        <button class="mobileToggle" onclick="toggleMenu(true)">
          <span class="material-symbols-rounded">menu</span>
        </button>
      </div>
    </div>

    <!-- Mobile Menu Overlay -->
    <div id="mobileMenu" class="mobileOverlay">
      <div class="mobileMenuHeader">
        ${buildMobileMenuBrand(prefix, 'Premium Furniture')}
        <span class="material-symbols-rounded closeBtn" onclick="toggleMenu(false)">close</span>
      </div>
      <div class="mobileMenuContent">
        <a href="${homeHref}" class="mobileMenuLink" onclick="toggleMenu(false)">
          <div class="mLinkInfo">
            <span class="mLinkTitle">Home</span>
            <span class="mLinkSub">Our Artisanal Story</span>
          </div>
          <span class="material-symbols-rounded">chevron_right</span>
        </a>
        <a href="${galleryHref}" class="mobileMenuLink" onclick="toggleMenu(false)">
          <div class="mLinkInfo">
            <span class="mLinkTitle">Collections</span>
            <span class="mLinkSub">Explore Masterpieces</span>
          </div>
          <span class="material-symbols-rounded">chevron_right</span>
        </a>
        <a href="${portalHref}" class="mobileMenuLink" onclick="toggleMenu(false)">
          <div class="mLinkInfo">
            <span class="mLinkTitle">Portal Access</span>
            <span class="mLinkSub">Staff or Customer</span>
          </div>
          <span class="material-symbols-rounded">chevron_right</span>
        </a>
      </div>
      <div class="mobileMenuFooter">
        <a href="${adminHref}" class="mobileMenuAdminCta" onclick="toggleMenu(false)">
          <span class="material-symbols-rounded">admin_panel_settings</span>
          <span>Admin Login</span>
        </a>
        <p>© Vishwakarma Enterprises</p>
        <p style="color: var(--gold-accent); letter-spacing: 2px; font-size: 0.6rem; font-weight: 800;">EST. 1998</p>
      </div>
    </div>

    <!-- Mobile Bottom Navigation Bar -->
    <nav class="mobileBottomNav">
      <a href="${homeHref}" class="mobileNavItem ${currentPath.endsWith('index.html') || currentPath.endsWith('/') || currentPath === '/' ? 'active' : ''}">
        <span class="material-symbols-rounded">roofing</span>
        <div>Home</div>
      </a>
      <a href="${galleryHref}" class="mobileNavItem ${currentPath.includes('gallery.html') ? 'active' : ''}">
        <span class="material-symbols-rounded">chair</span>
        <div>Gallery</div>
      </a>
      <a href="${portalHref}" class="mobileNavItem ${currentPath.includes('portal.html') || currentPath.includes('customer-portal.html') || currentPath.includes('staff/login.html') ? 'active' : ''}">
        <span class="material-symbols-rounded">account_circle</span>
        <div>Portal</div>
      </a>
    </nav>
  </header>
`;
}

function buildFooter(prefix) {
  const homeHref = `${prefix}index.html`;
  const galleryHref = `${prefix}gallery.html`;
  const adminHomeHref = `${prefix}admin/dashboard.html`;
  const adminReportsHref = `${prefix}admin/reports.html`;
  const adminSettingsHref = `${prefix}admin/setting.html`;
  const isAdminPage = window.location.pathname.toLowerCase().includes('/admin/');

  if (isAdminPage) {
    return `
  <footer class="siteFooter adminFooter">
    <div class="container adminFooterGrid">
      <div class="adminFooterBrand">
        <span class="adminFooterLabel">Executive Console</span>
        <h2>Vishwakarma Enterprises</h2>
        <p>Monitor operations, content, teams, and reporting from one refined control layer built for daily decisions.</p>
      </div>

      <div class="adminFooterBlock">
        <h4>Quick Access</h4>
        <div class="adminFooterLinks">
          <a href="${adminHomeHref}">Dashboard</a>
          <a href="${adminReportsHref}">Reports</a>
          <a href="${adminSettingsHref}">Settings</a>
        </div>
      </div>

      <div class="adminFooterBlock">
        <h4>Workspace</h4>
        <div class="adminFooterLinks">
          <a href="${homeHref}">Public Website</a>
          <a href="${galleryHref}">Collections</a>
          <span class="adminFooterNote">Secure admin environment</span>
        </div>
      </div>
    </div>

    <div class="container adminFooterBottom">
      <div>&copy; <span id="year"></span> Vishwakarma Enterprises</div>
      <div>Operations. Insights. Control.</div>
    </div>
  </footer>
`;
  }

  return `
  <footer class="siteFooter">
    <div class="container footerGrid">
      <div class="footerBrand">
        <h2 style="font-family: 'Playfair Display'; color: var(--gold-accent); font-size: 2.2rem; margin-bottom: 24px;">Vishwakarma Enterprises</h2>
        <p style="color: rgba(255,255,255,0.6); max-width: 320px; font-size: 1rem;">Bringing generations of craftsmanship into the modern home. Defining luxury through wood.</p>
        <div style="display: flex; gap: 16px; margin-top: 32px; color: var(--gold-accent); font-size: 1.5rem; cursor: pointer;">
          <span class="material-symbols-rounded">public</span>
          <span class="material-symbols-rounded">chat_bubble</span>
          <span class="material-symbols-rounded">alternate_email</span>
        </div>
      </div>
      
      <div class="footerCol">
        <h4 style="font-size: 0.9rem; text-transform: uppercase; color: var(--gold-accent); letter-spacing: 2.5px; margin-bottom: 32px;">Explore</h4>
        <ul class="footerLinks">
          <li><a href="${homeHref}">Home Story</a></li>
          <li><a href="${galleryHref}">Current Collections</a></li>
          <li><a href="#">The Craftsmen</a></li>
          <li><a href="#">Sustainability</a></li>
        </ul>
      </div>

      <div class="footerCol">
        <h4 style="font-size: 0.9rem; text-transform: uppercase; color: var(--gold-accent); letter-spacing: 2.5px; margin-bottom: 32px;">Business</h4>
        <ul class="footerLinks">
          <li><a href="#">Interior Projects</a></li>
          <li><a href="#">Bulk Orders</a></li>
          <li><a href="${prefix}portal.html">Staff / Customer Portal</a></li>
          <li><a href="${prefix}admin/login.html">Admin Login</a></li>
          <li><a href="#">Terms & Privacy</a></li>
        </ul>
      </div>

      <div class="footerCol">
        <h4 style="font-size: 0.9rem; text-transform: uppercase; color: var(--gold-accent); letter-spacing: 2.5px; margin-bottom: 32px;">Stay in Touch</h4>
        <p style="font-size: 0.95rem; line-height: 1.8; color: rgba(255,255,255,0.6);">Studio 42, Marble Ave <br> Bandra West, Mumbai <br> +91 961 888 2000</p>
      </div>
    </div>

    <div class="container footerBottom" style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 40px; display: flex; justify-content: space-between; color: rgba(255,255,255,0.4); font-size: 0.85rem;">
      <div>&copy; <span id="year"></span> Vishwakarma Enterprises. Handcrafted with pride.</div>
      <div>Designed with Precision</div>
    </div>
  </footer>
`;
}

function initLayout() {
  const mountHeader = document.getElementById('veHeaderMount');
  const mountFooter = document.getElementById('veFooterMount');
  const prefix = pathPrefix();
  const lowerPath = window.location.pathname.toLowerCase();
  const isAdminPage = lowerPath.includes('/admin/');
  const isStaffPage = lowerPath.includes('/staff/');
  const isPublicPage = !isAdminPage && !isStaffPage;

  if (mountHeader) mountHeader.innerHTML = buildHeader(prefix);
  if (mountFooter) mountFooter.innerHTML = buildFooter(prefix);

  const floatingMobileNav = document.querySelector('.mobileBottomNav');
  if (floatingMobileNav && floatingMobileNav.parentElement !== document.body) {
    document.body.appendChild(floatingMobileNav);
  }

  if (isAdminPage) document.body.classList.add('admin-shell-page');
  if (isPublicPage) document.body.classList.add('public-site');

  // Set the year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Global interactions
  let lockedScrollY = 0;
  window.toggleMenu = (show) => {
    const menu = document.getElementById('mobileMenu');
    if (menu) menu.classList.toggle('active', show);
    if (show) {
      lockedScrollY = window.scrollY || window.pageYOffset || 0;
      document.body.classList.add('menu-open');
      document.body.style.position = 'fixed';
      document.body.style.top = `-${lockedScrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    } else {
      document.body.classList.remove('menu-open');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      window.scrollTo(0, lockedScrollY);
    }
  };

  window.focusSearch = () => {
    const q = document.getElementById('q');
    if (q) {
      q.focus();
      q.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      window.location.href = `${prefix}gallery.html`;
    }
  };
}

// Auto-run on load
(function() {
  initLayout();
  
  // Header scroll effect
  window.addEventListener("scroll", () => {
    const header = document.querySelector(".siteHeader");
    if (header) {
      if (window.scrollY > 50) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    }
  });
})();


