function uniq(items) {
  return [...new Set(items.filter(Boolean))];
}

function normalize(s) {
  return String(s || '').trim().toLowerCase();
}

async function fetchJson(url) {
  const res = await fetch(url, { credentials: 'include' });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : await res.text();
  if (!res.ok) throw new Error(body?.error || res.statusText);
  return body;
}

function mediaUrl(base, relPath) {
  const clean = String(relPath || '').replace(/^\/+/, '');
  if (!clean) return '';
  if (!base) return `/${clean}`;
  return `${String(base).replace(/\/+$/, '')}/${clean}`;
}

async function loadGallery() {
  const statusEl = VE.$('#status');
  const gridEl = VE.$('#grid');
  const qEl = VE.$('#q');
  const catsEl = VE.$('#cats');

  const yearEl = VE.$('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  let gallery = [];
  let mediaBase = '';
  const candidates = ['/api/gallery', 'http://localhost:3000/api/gallery'];

  VE.setStatus(statusEl, 'Loading gallery...');
  for (const url of candidates) {
    try {
      const out = await fetchJson(url);
      gallery = out.gallery || [];
      mediaBase = url.startsWith('http') ? new URL(url).origin : '';
      break;
    } catch (e) {
      // try next candidate
    }
  }

  if (!gallery.length) {
    VE.setStatus(
      statusEl,
      'Gallery not loaded. Start backend (`cd backend; node server.js`) then refresh.',
      false
    );
    gridEl.innerHTML = '';
    if (catsEl) {
      catsEl.innerHTML = '<span class="muted">Start backend to load categories</span>';
    }
    return;
  }

  const categories = uniq(gallery.map((g) => g.category)).slice(0, 12);
  let activeCategory = '';

  function renderCategories() {
    catsEl.innerHTML =
      `<button class="chip ${activeCategory === '' ? 'active' : ''}" data-cat="">All</button>` +
      categories
        .map((c) => `<button class="chip ${activeCategory === c ? 'active' : ''}" data-cat="${c}">${c}</button>`)
        .join('');

    catsEl.querySelectorAll('button[data-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeCategory = btn.getAttribute('data-cat') || '';
        renderCategories();
        render();
      });
    });
  }

  function matches(g, q) {
    if (activeCategory && g.category !== activeCategory) return false;
    if (!q) return true;
    const hay = `${g.category || ''} ${g.description || ''}`.toLowerCase();
    return hay.includes(q);
  }

  function card(g) {
    const img = mediaUrl(mediaBase, g.image_path);
    return `<div class="product-card reveal">
      <div class="product-img-wrapper">
        <img src="${img}" alt="${g.description || 'Furniture'}" loading="lazy" />
      </div>
      <div class="product-info">
        <span class="product-category">${g.category || 'Special Piece'}</span>
        <h3 class="product-title">${g.description || 'Bespoke Masterpiece'}</h3>
        <div class="product-price">Premium Craftsmanship</div>
      </div>
    </div>`;
  }

  function render() {
    const q = normalize(qEl.value);
    const isGalleryPage = String(location.pathname || '').toLowerCase().includes('gallery.html');
    const limit = isGalleryPage ? 48 : 12;
    const shown = gallery.filter((g) => matches(g, q)).slice(0, limit);
    gridEl.innerHTML = shown.map(card).join('');
    VE.setStatus(statusEl, `Showing ${shown.length} of ${gallery.length}`, true);
  }

  qEl.addEventListener('input', render);
  renderCategories();
  render();
}

async function loadHeroImages() {
  const heroImg = document.getElementById('heroImage');
  if (!heroImg) return;

  const candidates = ['/api/hero', 'http://localhost:3000/api/hero'];
  let mediaBase = '';
  let hero = [];
  for (const url of candidates) {
    try {
      const out = await fetchJson(url);
      hero = out.hero || [];
      mediaBase = url.startsWith('http') ? new URL(url).origin : '';
      break;
    } catch {
      // try next candidate
    }
  }

  if (!hero.length) return;

  const items = hero
    .map((h) => ({
      title: h.title ? String(h.title) : '',
      subtitle: h.subtitle ? String(h.subtitle) : '',
      src: mediaUrl(mediaBase, h.image_path)
    }))
    .filter((x) => x.src);

  if (!items.length) return;

  let i = 0;
  function setItem(idx) {
    const it = items[idx];
    heroImg.style.opacity = '0';
    window.setTimeout(() => {
      heroImg.src = it.src;
      heroImg.alt = it.title || 'Hero';
      heroImg.style.opacity = '1';
    }, 120);
  }

  heroImg.style.transition = 'opacity 250ms ease';
  setItem(0);

  if (items.length > 1) {
    window.setInterval(() => {
      i = (i + 1) % items.length;
      setItem(i);
    }, 6500);
  }
}

(async function initPublic() {
  await loadHeroImages();
  await loadGallery();
})();
