const nav = document.getElementById('site-navigation');
const toggle = document.querySelector('.nav-toggle');

function initMenu() {
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => {
    const open = nav.getAttribute('data-open') === 'true';
    const isOpening = !open;
    nav.setAttribute('data-open', String(isOpening));
    toggle.setAttribute('aria-expanded', String(isOpening));
    document.body.classList.toggle('menu-open', isOpening);
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.setAttribute('data-open', 'false');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  }));
}

function initScrollAnimations() {
  const els = document.querySelectorAll('.fade-up');
  if (!els.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => obs.observe(el));
}

function initSkillBars() {
  const bars = document.querySelectorAll('.skill__fill');
  if (!bars.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('animated'); obs.unobserve(e.target); } });
  }, { threshold: 0.3 });
  bars.forEach(bar => obs.observe(bar));
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.pushState(null, '', href);
      }
    });
  });
}

function initAccessibility() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      nav.setAttribute('data-open', 'false');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-open');
    }
  });
}

function checkSuccessMessage() {
  if (window.location.search.includes('success=true')) {
    const msg = document.getElementById('success-message');
    if (msg) msg.style.display = 'block';
  }
}

function init() {
  initMenu();
  initScrollAnimations();
  initSkillBars();
  initSmoothScroll();
  initAccessibility();
  checkSuccessMessage();
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();
