(() => {
  function cp(hex) {
    return String.fromCodePoint(hex);
  }

  function currentFile() {
    const raw = String(window.location.pathname || "");
    const file = raw.split("/").pop() || "";
    return (file.split("?")[0].split("#")[0] || "dashboard.html").toLowerCase();
  }

  function ensureContainer() {
    let el = document.querySelector(".bottom-nav");
    if (el) return el;
    el = document.createElement("div");
    el.className = "bottom-nav";
    document.body.appendChild(el);
    return el;
  }

  function build(container) {
    const items = [
      { href: "dashboard.html", label: "Home", icon: cp(0x1f4ca) },
      { href: "attendance.html", label: "Attendance", icon: cp(0x1f4f8) },
      { href: "work.html", label: "Work", icon: cp(0x1f4dd) },
      { href: "myprofile.html", label: "Profile", icon: cp(0x1f464) },
    ];

    const cur = currentFile();
    container.innerHTML = "";

    for (const item of items) {
      const a = document.createElement("a");
      a.href = item.href;
      a.className = "nav-item";
      if (cur === item.href.toLowerCase()) a.classList.add("active");

      const icon = document.createElement("span");
      icon.className = "icon";
      icon.textContent = item.icon;

      const text = document.createElement("span");
      text.textContent = item.label;

      a.appendChild(icon);
      a.appendChild(text);
      container.appendChild(a);
    }
  }

  function init() {
    try {
      build(ensureContainer());
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
