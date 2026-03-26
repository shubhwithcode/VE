(() => {
  const KEY = "ve_theme"; // 'light' | 'dark' | 'system'

  function safeGetTheme() {
    try {
      const t = String(localStorage.getItem(KEY) || "system");
      if (t === "light" || t === "dark" || t === "system") return t;
    } catch (e) {}
    return "system";
  }

  function safeSetTheme(t) {
    try {
      localStorage.setItem(KEY, t);
    } catch (e) {}
  }

  function prefersDark() {
    try {
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch (e) {
      return false;
    }
  }

  function isDarkNow(theme) {
    return theme === "dark" || (theme === "system" && prefersDark());
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    root.dataset.veTheme = theme;
    root.classList.toggle("ve-dark", isDarkNow(theme));
  }

  // Apply ASAP (prevents flash if included in <head>)
  const initial = safeGetTheme();
  applyTheme(initial);

  function mountToggle() {
    if (document.getElementById("veThemeToggle")) return;

    const topBar = document.querySelector(".app-bar-top") || document.querySelector(".app-header");

    const wrap = document.createElement("div");
    wrap.className = "ve-theme-wrap";
    wrap.innerHTML =
      '<label class="ve-switch" title="Dark mode">' +
      '<input id="veThemeToggle" type="checkbox" aria-label="Dark mode">' +
      '<span class="ve-slider"></span>' +
      "</label>";

    if (topBar) {
      const logout = topBar.querySelector("#logoutBtn, .logout-btn");
      if (logout && logout.parentNode) logout.parentNode.insertBefore(wrap, logout);
      else topBar.appendChild(wrap);
    } else {
      const fab = document.createElement("div");
      fab.className = "ve-theme-fab";
      fab.appendChild(wrap);
      document.body.appendChild(fab);
    }

    const input = wrap.querySelector("#veThemeToggle");
    const theme = safeGetTheme();
    input.checked = isDarkNow(theme);

    input.addEventListener("change", () => {
      const next = input.checked ? "dark" : "light";
      safeSetTheme(next);
      applyTheme(next);
    });
  }

  function hookSystemChanges() {
    try {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      if (!mq || !mq.addEventListener) return;
      mq.addEventListener("change", () => {
        const t = safeGetTheme();
        if (t === "system") applyTheme("system");
      });
    } catch (e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      applyTheme(safeGetTheme());
      mountToggle();
      hookSystemChanges();
    });
  } else {
    applyTheme(safeGetTheme());
    mountToggle();
    hookSystemChanges();
  }

  window.VETheme = {
    get() {
      return safeGetTheme();
    },
    set(theme) {
      const t = theme === "light" || theme === "dark" || theme === "system" ? theme : "system";
      safeSetTheme(t);
      applyTheme(t);
      // Sync switch if present
      const input = document.getElementById("veThemeToggle");
      if (input) input.checked = isDarkNow(t);
    },
  };
})();
