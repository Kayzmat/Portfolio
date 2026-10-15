/* ==========================================================================
   Portfolio — interactions communes
   Thème, menu mobile, header, animations, filtres, lightbox, copie, toast.
   Aucun framework : chaque module vérifie la présence de ses éléments.
   ========================================================================== */

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── Thème clair / sombre ── */
function currentTheme() {
  return root.dataset.theme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

function initTheme() {
  const buttons = document.querySelectorAll('[data-theme-toggle]');
  const sync = () => {
    const next = currentTheme() === 'dark' ? 'clair' : 'sombre';
    buttons.forEach(btn => btn.setAttribute('aria-label', `Activer le thème ${next}`));
  };
  buttons.forEach(btn => btn.addEventListener('click', () => {
    const theme = currentTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = theme;
    try { localStorage.setItem('theme', theme); } catch (e) { /* stockage indisponible */ }
    sync();
  }));
  sync();
}

/* ── Menu mobile ── */
function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('is-locked', open);
    if (open) nav.querySelector('a')?.focus();
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
  });
  document.addEventListener('click', e => {
    if (nav.classList.contains('is-open') && !e.target.closest('.site-header')) setOpen(false);
  });
  window.matchMedia('(min-width: 961px)').addEventListener('change', e => { if (e.matches) setOpen(false); });
}

/* ── Header : bordure au défilement ── */
function initHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const update = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  update();
  window.addEventListener('scroll', update, { passive: true });
}

/* ── Apparition au défilement ── */
function initReveal() {
  const items = document.querySelectorAll('[data-reveal]');
  if (!items.length) return;
  if (reduceMotion || !('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('is-visible'));
    return;
  }
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); obs.unobserve(entry.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  items.forEach(el => obs.observe(el));
}

/* ── Filtres de projets ── */
function initFilters() {
  document.querySelectorAll('[data-filters]').forEach(group => {
    const target = document.querySelector(group.dataset.filters);
    if (!target) return;
    const items = [...target.querySelectorAll('[data-filter-item]')];
    const buttons = [...group.querySelectorAll('[data-filter]')];
    const status = document.querySelector(group.dataset.filtersStatus || '');

    buttons.forEach(btn => {
      const key = btn.dataset.filter;
      const count = key === 'all' ? items.length : items.filter(i => i.dataset.filterItem.split(' ').includes(key)).length;
      const badge = document.createElement('span');
      badge.className = 'filter__count';
      badge.textContent = count;
      badge.setAttribute('aria-hidden', 'true');
      btn.append(badge);

      btn.addEventListener('click', () => {
        buttons.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
        let visible = 0;
        items.forEach(item => {
          const show = key === 'all' || item.dataset.filterItem.split(' ').includes(key);
          item.hidden = !show;
          if (show) { visible += 1; item.classList.add('is-visible'); }
        });
        if (status) status.textContent = `${visible} projet${visible > 1 ? 's' : ''} affiché${visible > 1 ? 's' : ''}`;
      });
    });
  });
}

/* ── Lightbox pour les captures ── */
function initLightbox() {
  const triggers = document.querySelectorAll('[data-zoom]');
  if (!triggers.length || typeof HTMLDialogElement !== 'function') return;

  const dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  dialog.setAttribute('aria-label', 'Aperçu de l’image');
  dialog.innerHTML = `
    <button class="icon-btn lightbox__close" type="button" aria-label="Fermer l’aperçu">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>
    <img alt="" />
    <p></p>`;
  document.body.append(dialog);
  const img = dialog.querySelector('img');
  const caption = dialog.querySelector('p');

  triggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const source = trigger.querySelector('img');
      img.src = trigger.dataset.zoom || source.currentSrc || source.src;
      img.alt = source.alt;
      caption.textContent = trigger.closest('figure')?.querySelector('figcaption')?.textContent || source.alt;
      dialog.showModal();
    });
  });
  dialog.querySelector('.lightbox__close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
}

/* ── Toast ── */
let toastTimer;
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

/* ── Copier l’e-mail ── */
function initCopy() {
  document.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        showToast('Adresse e-mail copiée');
      } catch (e) {
        showToast(btn.dataset.copy);
      }
    });
  });
}

/* ── Formulaire de contact ── */
function initContactForm() {
  const params = new URLSearchParams(window.location.search);
  const success = document.getElementById('form-success');
  if (success && params.get('envoye') === '1') {
    success.hidden = false;
    success.scrollIntoView({ block: 'center' });
  }
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;
  form.addEventListener('submit', () => {
    const btn = form.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Envoi en cours…'; }
  });
}

function init() {
  initTheme();
  initNav();
  initHeader();
  initReveal();
  initFilters();
  initLightbox();
  initCopy();
  initContactForm();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
