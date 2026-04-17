/* eslint-disable no-console */

/*
  Ce script alimente la section "Articles récents" de veille.html.
  - Récupère des flux RSS via rss2json.com (CORS friendly)
  - Cache les résultats 1h dans localStorage
  - Permet de filtrer par source et de charger plus d'articles
*/

const VEILLE_CACHE_KEY = 'veille_feed_cache_v1';
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 heure
const DEFAULT_RENDER_COUNT = 9;
const LOAD_MORE_STEP = 6;

const RSS2JSON_API = 'https://api.rss2json.com/v1/api.json?rss_url=';

const SOURCES = [
  {
    id: 'devto-low',
    name: 'Dev.to #lowcode',
    feedUrl: 'https://dev.to/feed/tag/lowcode',
  },
  {
    id: 'devto-no',
    name: 'Dev.to #nocode',
    feedUrl: 'https://dev.to/feed/tag/nocode',
  },
  {
    id: 'mendix',
    name: 'Mendix Blog',
    feedUrl: 'https://mendix.com/blog/feed/',
  },
];


const FALLBACK_ITEMS = [
  {
    title: 'Pourquoi le Low-Code stimule l’innovation en entreprise',
    link: 'https://example.com/article-veille-1',
    pubDate: '2026-03-18T00:00:00.000Z',
    author: 'Matéo G.',
    sourceId: 'fallback',
    sourceName: 'Veille (hors ligne)',
    description: 'Un article de secours affiché lorsque les flux RSS ne sont pas disponibles.',
  },
  {
    title: 'No-Code : outils à connaître en 2026',
    link: 'https://example.com/article-veille-2',
    pubDate: '2026-03-17T00:00:00.000Z',
    author: 'Matéo G.',
    sourceId: 'fallback',
    sourceName: 'Veille (hors ligne)',
    description: 'Une liste des principaux outils No-Code à suivre.',
  },
];

async function loadLocalFallback() {
  try {
    const resp = await fetch('data/veille-feed.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (!Array.isArray(data) || !data.length) throw new Error('Format fallback invalide');
    return data;
  } catch (err) {
    console.warn('Impossible de charger les données locales de fallback', err);
    return FALLBACK_ITEMS;
  }
}


function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  } catch (err) {
    return dateString;
  }
}

function getCache() {
  try {
    const raw = localStorage.getItem(VEILLE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.timestamp || !Array.isArray(parsed.articles) || !parsed.articles.length) return null;
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    return parsed.articles;
  } catch (err) {
    console.warn('Erreur lecture cache veille', err);
    return null;
  }
}

function setCache(articles) {
  try {
    localStorage.setItem(
      VEILLE_CACHE_KEY,
      JSON.stringify({ timestamp: Date.now(), articles })
    );
  } catch (err) {
    // Ignore les erreurs (ex: localStorage plein)
  }
}

function createArticleCard(item) {
  const card = document.createElement('a');
  card.className = 'feed-card visible';
  card.href = item.link || '#';
  card.target = '_blank';
  card.rel = 'noopener noreferrer';
  card.setAttribute('aria-label', `Ouvrir l’article ${item.title} (${item.sourceName})`);

  const thumbnail = item.thumbnail || item.enclosure?.link || '';
  const imageMarkup = thumbnail
    ? `<img src="${thumbnail}" alt="" loading="lazy" />`
    : '📰';

  const sourceLabel = item.sourceName || 'Source inconnue';
  const authorLabel = item.author ? `Auteur : ${item.author}` : '';

  card.innerHTML = `
    <div class="feed-card__img">${imageMarkup}</div>
    <div class="feed-card__body">
      <div class="feed-card__source"><span class="feed-card__source-dot"></span>${sourceLabel}</div>
      <h3 class="feed-card__title">${item.title || 'Sans titre'}</h3>
      ${authorLabel ? `<div class="feed-card__meta">${authorLabel}</div>` : ''}
      <div class="feed-card__footer">
        <span class="feed-card__date">${formatDate(item.pubDate)}</span>
        <span class="feed-card__cta">Lire</span>
      </div>
    </div>
  `;

  return card;
}

function updateStatus(status, message) {
  const dot = document.getElementById('feed-dot');
  const text = document.getElementById('feed-status-text');
  if (!dot || !text) return;

  dot.classList.toggle('loading', status === 'loading');
  dot.classList.toggle('live', status === 'live');
  dot.classList.toggle('error', status === 'error');
  text.textContent = message;
}

function sortArticles(articles) {
  return [...articles].sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
}

async function fetchFeed(source) {
  const parseXmlItems = (xmlText) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

    const items = Array.from(xmlDoc.querySelectorAll('item'));
    if (!items.length) throw new Error('Aucun <item> trouvé dans le flux RSS');

    return items.map(item => {
      const getText = (tag) => {
        const el = item.querySelector(tag);
        return el ? el.textContent.trim() : '';
      };

      const thumbnail = (item.querySelector('media\:thumbnail') || item.querySelector('media\:content') || item.querySelector('enclosure'))?.getAttribute('url') || '';

      return {
        title: getText('title') || 'Sans titre',
        link: getText('link') || '#',
        pubDate: getText('pubDate') || new Date().toISOString(),
        description: getText('description') || getText('content\:encoded') || '',
        thumbnail,
        sourceId: source.id,
        sourceName: source.name,
      };
    });
  };

  const rss2jsonUrl = `${RSS2JSON_API}${encodeURIComponent(source.feedUrl)}`;

  try {
    const resp = await fetch(rss2jsonUrl);
    if (resp.ok) {
      const json = await resp.json();
      if (json.status === 'ok' && Array.isArray(json.items) && json.items.length > 0) {
        return json.items.map(item => ({
          title: item.title || 'Sans titre',
          link: item.link || '#',
          pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
          description: item.description || item.content || item.contentSnippet || '',
          thumbnail: item.thumbnail || item.enclosure?.link || '',
          sourceId: source.id,
          sourceName: source.name,
        }));
      }
      throw new Error(`Service rss2json renvoyé statut ${json.status}`);
    }
    throw new Error(`RSS2JSON HTTP ${resp.status}`);
  } catch (rssErr) {
    console.warn(`Échec rss2json pour ${source.name}:`, rssErr);
  }

  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(source.feedUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(source.feedUrl)}`,
    `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(source.feedUrl)}`,
  ];

  let lastError;
  for (const proxyUrl of proxies) {
    try {
      const resp = await fetch(proxyUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const xmlText = await resp.text();
      return parseXmlItems(xmlText);
    } catch (err) {
      lastError = err;
      console.warn(`Proxy échoue pour ${source.name} (${proxyUrl}):`, err);
    }
  }

  throw lastError || new Error('Échec récupération du flux RSS');
}

async function loadArticles({ forceRefresh = false } = {}) {
  const grid = document.getElementById('feed-grid');
  const loadMoreWrap = document.getElementById('load-more-wrap');
  if (!grid) return;

  updateStatus('loading', 'Chargement des articles en cours…');

  let articles = null;

  if (!forceRefresh) {
    articles = getCache();
    if (articles && articles.length > 0) {
      updateStatus('live', 'Articles chargés depuis le cache (1h).');
      renderArticles(articles);
      setupFilters(articles);
      return;
    }
  }

  try {
    const all = [];
    const promises = SOURCES.map(src => 
      fetchFeed(src)
        .then(items => {
          console.log(`✓ ${src.name}: ${items.length} articles`);
          return items;
        })
        .catch(err => {
          console.warn(`✗ ${src.name}: ${err.message}`);
          return [];
        })
    );
    
    const results = await Promise.all(promises);
    results.forEach(arr => all.push(...arr));

    if (all.length === 0) {
      throw new Error('Aucun article récupéré des sources principales.');
    }

    articles = sortArticles(all);
    setCache(articles);
    updateStatus('live', `✓ ${all.length} articles chargés. Cliquer sur "Rafraîchir" pour recharger.`);
    console.log(`Veille: ${all.length} articles au total`);
  } catch (err) {
    console.error('Erreur RSS:', err);
    updateStatus('error', `Mode hors ligne. Affichage des articles de secours (${err.message})`);
    articles = await loadLocalFallback();
  }

  renderArticles(articles);
  setupFilters(articles);
}

function renderArticles(articles, { source = 'all', limit = DEFAULT_RENDER_COUNT } = {}) {
  const grid = document.getElementById('feed-grid');
  const loadMoreWrap = document.getElementById('load-more-wrap');
  if (!grid) return;

  grid.innerHTML = '';

  const isFallback = articles.length > 0 && articles.every(a => a.sourceId === 'fallback');
  let filtered;
  
  if (isFallback) {
    filtered = articles;
  } else if (source === 'all') {
    filtered = articles;
  } else {
    filtered = articles.filter(a => a.sourceId === source);
  }
  
  const toRender = filtered.slice(0, limit);

  if (!toRender.length) {
    grid.innerHTML = '<div style="grid-column: 1/-1; padding: 3rem; text-align: center;"><p style="color:var(--muted);font-style:italic;">Aucun article trouvé pour ce filtre.</p></div>';
    if (loadMoreWrap) loadMoreWrap.style.display = 'none';
    return;
  }

  toRender.forEach((item, idx) => {
    const card = createArticleCard(item);
    if (idx < 3) card.classList.add(`delay-${idx}`);
    grid.appendChild(card);
  });

  if (grid.children.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1/-1; padding: 3rem; text-align: center;"><p style="color:var(--muted);font-style:italic;">Aucun article visible. Vérifiez la connexion ou rechargez la page.</p></div>';
  }

  const hasMore = filtered.length > limit;
  if (loadMoreWrap) {
    loadMoreWrap.style.display = hasMore ? 'block' : 'none';
  }
}

function setupFilters(articles) {
  const buttons = Array.from(document.querySelectorAll('.filter-btn'));
  if (!buttons.length) return;

  let current = { source: 'all', limit: DEFAULT_RENDER_COUNT };

  const update = () => {
    renderArticles(articles, current);
    buttons.forEach(btn => btn.classList.toggle('active', btn.dataset.source === current.source));
  };

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      current.source = btn.dataset.source || 'all';
      current.limit = DEFAULT_RENDER_COUNT;
      update();
    });
  });

  const loadMore = document.getElementById('load-more');
  if (loadMore) {
    loadMore.addEventListener('click', () => {
      current.limit += LOAD_MORE_STEP;
      renderArticles(articles, current);
    });
  }

  // Initial render + button state
  update();
}

function attachRefresh() {
  const refreshBtn = document.getElementById('refresh-feed');
  if (!refreshBtn) return;
  refreshBtn.addEventListener('click', () => {
    loadArticles({ forceRefresh: true });
  });
}

function initVeilleFeed() {
  if (!document.getElementById('feed-grid')) return;
  
  // Charge et affiche les articles immédiatement
  loadArticles();
  
  // Attache le bouton refresh s'il existe
  attachRefresh();
  
  // Si les articles ne se chargent pas (cas edge), affiche le fallback
  setTimeout(() => {
    const grid = document.getElementById('feed-grid');
    if (grid && grid.children.length === 0) {
      console.warn('Aucun article affiché après 5s, affichage du fallback');
      loadLocalFallback().then(fallback => {
        if (fallback.length > 0) {
          updateStatus('error', 'Mode hors ligne (timeout réseau)');
          renderArticles(fallback);
          setupFilters(fallback);
        }
      });
    }
  }, 5000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVeilleFeed);
} else {
  initVeilleFeed();
}
