function initAdminShellSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const toggleBtn = document.querySelector('.sidebar-toggle');
  const overlay = document.querySelector('.sidebar-overlay');

  if (!sidebar || !toggleBtn || !overlay) return;

  function setOpen(open) {
    sidebar.classList.toggle('open', open);
    overlay.classList.toggle('open', open);
    toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) sidebar.setAttribute('aria-hidden', 'false');
    else sidebar.setAttribute('aria-hidden', 'true');
  }

  toggleBtn.addEventListener('click', () => setOpen(!sidebar.classList.contains('open')));
  overlay.addEventListener('click', () => setOpen(false));

  sidebar.addEventListener('click', (e) => {
    const a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a) return;
    // Close drawer after navigation on mobile.
    setOpen(false);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });

  window.addEventListener('resize', () => {
    // If user rotates to desktop sizes, ensure drawer isn't stuck open.
    if (window.innerWidth > 900) setOpen(false);
  });

  // Default closed on load for mobile.
  setOpen(false);
}

document.addEventListener('DOMContentLoaded', initAdminShellSidebar);

