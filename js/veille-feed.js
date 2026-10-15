/* ==========================================================================
   Veille — agrégation automatique d'articles (méthode « pull »)
   - API publique de Dev.to (JSON, CORS autorisé, sans clé ni proxy)
   - cache localStorage d'une heure
   - le contenu externe est inséré via textContent / attributs validés,
     jamais en HTML brut (protection contre l'injection de script)
   ========================================================================== */

const FEED_CACHE_KEY = 'veille_feed_cache_v3';
const FEED_CACHE_TTL = 60 * 60 * 1000;
const FEED_PAGE = 9;

const FEED_SOURCES = [
  { id: 'lowcode', name: 'Dev.to #lowcode', tag: 'lowcode' },
  { id: 'nocode', name: 'Dev.to #nocode', tag: 'nocode' },
  { id: 'powerplatform', name: 'Dev.to #powerplatform', tag: 'powerplatform' },
].map(s => ({ ...s, url: `https://dev.to/api/articles?tag=${s.tag}&per_page=20`, home: `https://dev.to/t/${s.tag}` }));

const feedState = { articles: [], source: 'all', limit: FEED_PAGE };

/* N'accepte que des URL http(s) absolues */
function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch (e) {
    return '';
  }
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function readCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(FEED_CACHE_KEY));
    if (cached && Date.now() - cached.time < FEED_CACHE_TTL && cached.articles?.length) return cached.articles;
  } catch (e) { /* cache illisible */ }
  return null;
}

function writeCache(articles) {
  try { localStorage.setItem(FEED_CACHE_KEY, JSON.stringify({ time: Date.now(), articles })); } catch (e) { /* stockage plein */ }
}

function normalize(item, source) {
  return {
    title: String(item.title || 'Sans titre').trim(),
    link: safeUrl(item.url),
    date: item.published_at || '',
    author: String(item.user?.name || '').trim(),
    image: safeUrl(item.cover_image || ''),
    sourceId: source.id,
    sourceName: source.name,
  };
}

async function fetchWithTimeout(url, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchSource(source) {
  const resp = await fetchWithTimeout(source.url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const items = await resp.json();
  if (!Array.isArray(items) || !items.length) throw new Error('Aucun article');
  return items.map(item => normalize(item, source));
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function buildCard(article) {
  const card = el('article', 'card card--link feed-card');
  const media = el('div', 'card__media');
  if (article.image) {
    const img = el('img');
    img.src = article.image;
    img.alt = '';
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => {
      media.classList.add('card__media--placeholder');
      media.replaceChildren(el('span', '', article.sourceName));
    });
    media.append(img);
  } else {
    media.classList.add('card__media--placeholder');
    media.append(el('span', '', article.sourceName));
  }

  const body = el('div', 'card__body');
  const kicker = el('p', 'card__kicker');
  kicker.append(el('span', '', article.sourceName), el('span', '', formatDate(article.date)));
  const title = el('h3');
  const link = el('a', 'card__stretch', article.title);
  link.href = article.link;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  title.append(link);
  body.append(kicker, title);
  if (article.author) body.append(el('p', 'small', `Par ${article.author}`));

  card.append(media, body);
  return card;
}

function setStatus(state, message) {
  const dot = document.getElementById('feed-dot');
  const text = document.getElementById('feed-status-text');
  if (dot) dot.className = `feed-status__dot is-${state}`;
  if (text) text.textContent = message;
}

function render() {
  const grid = document.getElementById('feed-grid');
  const more = document.getElementById('feed-more');
  const list = feedState.source === 'all'
    ? feedState.articles
    : feedState.articles.filter(a => a.sourceId === feedState.source);

  grid.replaceChildren();
  grid.setAttribute('aria-busy', 'false');
  if (!list.length) {
    const empty = el('p', 'muted', 'Aucun article pour cette source pour le moment.');
    empty.style.gridColumn = '1 / -1';
    grid.append(empty);
  } else {
    list.slice(0, feedState.limit).forEach(article => grid.append(buildCard(article)));
  }
  if (more) more.hidden = list.length <= feedState.limit;
}

function renderOffline() {
  const grid = document.getElementById('feed-grid');
  grid.replaceChildren();
  grid.setAttribute('aria-busy', 'false');
  FEED_SOURCES.forEach(source => {
    const card = el('article', 'card card--link');
    const body = el('div', 'card__body');
    const title = el('h3');
    const link = el('a', 'card__stretch', source.name);
    link.href = source.home;
    link.target = '_blank';
    link.rel = 'noopener';
    title.append(link);
    body.append(el('p', 'card__kicker', 'Source'), title, el('p', '', 'Consulter les derniers articles directement sur le site.'));
    card.append(body);
    grid.append(card);
  });
  document.getElementById('feed-more').hidden = true;
}

async function loadFeed(force = false) {
  setStatus('loading', 'Chargement des articles…');
  const cached = force ? null : readCache();
  if (cached) {
    feedState.articles = cached;
    setStatus('live', `${cached.length} articles (mis en cache il y a moins d'une heure)`);
    render();
    return;
  }

  const results = await Promise.allSettled(FEED_SOURCES.map(fetchSource));
  const articles = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .filter((a, i, all) => a.link && all.findIndex(b => b.link === a.link) === i)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (articles.length) {
    feedState.articles = articles;
    writeCache(articles);
    const failed = results.filter(r => r.status === 'rejected').length;
    setStatus('live', `${articles.length} articles chargés${failed ? ` (${failed} source indisponible)` : ''}`);
    render();
  } else {
    setStatus('error', 'Flux indisponibles pour le moment : accédez directement aux sources.');
    renderOffline();
  }
}

function initFeed() {
  if (!document.getElementById('feed-grid')) return;

  const buttons = document.querySelectorAll('#feed-filters [data-source]');
  buttons.forEach(btn => btn.addEventListener('click', () => {
    feedState.source = btn.dataset.source;
    feedState.limit = FEED_PAGE;
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    if (feedState.articles.length) render();
  }));

  document.getElementById('feed-more')?.addEventListener('click', () => {
    feedState.limit += FEED_PAGE;
    render();
  });
  document.getElementById('feed-refresh')?.addEventListener('click', () => loadFeed(true));

  loadFeed();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initFeed);
else initFeed();
