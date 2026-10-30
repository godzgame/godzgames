import './style.css';
import latestNewsData from './data/latest_news.json';
import allArticlesData from './data/all_articles.json';
import fallbackGamesData from './data/games.json';
import fallbackAffiliateSuggestions from './data/affiliate-suggestions.json';
import fallbackAffiliatesData from './data/affiliates.json';
import fallbackHardwareSuggestions from './data/hardware-suggestions.json';
import gameGuidesData from './data/game_guides.json';

document.addEventListener('DOMContentLoaded', async () => {
  let savedAffiliates = Array.isArray(fallbackAffiliatesData) ? fallbackAffiliatesData : [];
  let hardwareSuggestions = Array.isArray(fallbackHardwareSuggestions) ? fallbackHardwareSuggestions : [];
  let gameGuides = Array.isArray(gameGuidesData) ? gameGuidesData : [];
  window.setCanonical = (url) => {
    let link = document.querySelector("link[rel='canonical']");
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", url);
  };

  window.navigateTo = (e, path) => {
    if (e) e.preventDefault();
    window.history.pushState(null, '', path);
    window.dispatchEvent(new Event('popstate'));
  };
  let consoles = fallbackGamesData.consoles;
  let games = fallbackGamesData.games;
  const news = latestNewsData;
  
  // DOM Elements
  const navLinks = document.getElementById('nav-links');
  const tagsList = document.getElementById('tags-list');
  const tickerContent = document.getElementById('ticker-content');
  const featuredGrid = document.getElementById('featured-grid');
  const heroLayout = document.getElementById('hero-layout');
  const heroMainCard = document.getElementById('hero-main-card');
  const trendingList = document.getElementById('trending-list');
  const topGamesSection = document.getElementById('top-games-section');
  const topGamesGrid = document.getElementById('top-games-grid');
  const gamesGrid = document.getElementById('games-grid');
  const homeView = document.getElementById('home-view');
  const gameView = document.getElementById('game-view');
  const guideView = document.getElementById('guide-view');
  const logo = document.querySelector('.logo');
  const navHome = document.querySelector('.nav-home');
  const headerSearchInput = document.getElementById('header-search-input');
  const headerSearchClear = document.getElementById('header-search-clear');
  const paginationControls = document.getElementById('pagination-controls');

  // Admin View DOM Elements
  const adminView = document.getElementById('admin-view');
  const adminLoginForm = document.getElementById('admin-login-form');
  const adminPasswordInput = document.getElementById('admin-password-input');
  const adminLoginBtn = document.getElementById('admin-login-btn');
  const adminLoginError = document.getElementById('admin-login-error');
  const adminDashboard = document.getElementById('admin-dashboard');
  const adminLogoutBtn = document.getElementById('admin-logout-btn');
  const adminSearchInput = document.getElementById('admin-search-input');
  const adminGamesTbody = document.getElementById('admin-games-tbody');
  const adminEditor = document.getElementById('admin-editor');
  const adminEditorBack = document.getElementById('admin-editor-back');
  const adminEditorTitle = document.getElementById('admin-editor-title');
  const adminEditForm = document.getElementById('admin-edit-form');
  const adminSaveBtn = document.getElementById('admin-save-btn');
  const adminEditStatus = document.getElementById('admin-edit-status');


  let currentCategory = 'ALL';
  let currentLang = 'en';
  let shuffledGames = [];
  let searchQuery = '';
  let currentPage = 1;
  let newsForceVisible = false;
  const gamesPerPage = 20;

  const toggleNewsBtn = document.getElementById('toggle-news-btn');
  if (toggleNewsBtn) {
    toggleNewsBtn.addEventListener('click', () => {
      newsForceVisible = !newsForceVisible;
      renderGames();
    });
  }
  let adminSelectedConsole = '';
  let adminSelectedLetter = 'ALL';
  // No backend needed — all data comes from bundled JSON, Pollinations.ai and RSS2JSON API


  // Fisher-Yates Shuffle Algorithm
  const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Translations dictionary
  const translations = {
    en: {
      newsFlash: "News Flash",
      popularGames: "Popular Games",
      getLink: "View Game",
      popularConsoles: "Popular Consoles:",
      about: "About",
      contact: "Contact",
      terms: "Terms & Conditions",
      all: "ALL",
      footer: "© 2026 GodZGames. All Rights Reserved.",
      bannerTitle: "GodZGames - Best Deals",
      bannerBtn: "Explore Now",
      tagNews: "NEWS",
      // Game Page specific keys
      backToHome: "Back to Home",
      technicalSpecs: "Technical Specifications",
      synopsis: "Synopsis",
      screenshots: "Screenshots",
      fileFormat: "File Format",
      action: "Action",
      format: "Format",
      developer: "Developer",
      publisher: "Publisher",
      releaseDate: "Release Date",
      genre: "Genre",
      fileSize: "Estimated Size",
      searchPlaceholder: "Search games..."
    },
    es: {
      newsFlash: "Última Hora",
      popularGames: "Juegos Populares",
      getLink: "Ver Juego",
      popularConsoles: "Consolas Populares:",
      about: "Acerca de",
      contact: "Contacto",
      terms: "Términos y Condiciones",
      all: "TODO",
      footer: "© 2026 GodZGames. Todos los derechos reservados.",
      bannerTitle: "GodZGames - Las Mejores Ofertas",
      bannerBtn: "Explorar Ahora",
      tagNews: "NOTICIA",
      // Game Page specific keys
      backToHome: "Volver al Inicio",
      technicalSpecs: "Especificaciones Técnicas",
      synopsis: "Sinopsis",
      screenshots: "Capturas de Pantalla",
      fileFormat: "Formato de Archivo",
      action: "Acción",
      format: "Formato",
      developer: "Desarrollador",
      publisher: "Distribuidor",
      releaseDate: "Fecha de Lanzamiento",
      genre: "Género",
      fileSize: "Tamaño Estimado",
      searchPlaceholder: "Buscar videojuegos..."
    }
  };

  // Localized helper for news item texts
  const getLocalizedNews = (newsItem) => {
    if (newsItem[currentLang]) {
      return {
        title: newsItem[currentLang].title,
        description: newsItem[currentLang].description,
        fullContent: newsItem[currentLang].fullContent,
        tag: translations[currentLang].tagNews
      };
    }
    return {
      title: newsItem.title || '',
      description: newsItem.description || '',
      fullContent: newsItem.fullContent || newsItem.description || '',
      tag: translations[currentLang].tagNews
    };
  };





  // Render Navigation (Content Types)
  const renderNav = () => {
    const categories = [
      { id: 'ALL', label: 'TODO' },
      { id: 'NOTICIAS', label: 'NOTICIAS' },
      { id: 'ANALISIS', label: 'ANÁLISIS' },
      { id: 'GUIAS', label: 'GUÍAS' },
      { id: 'OFERTAS', label: 'OFERTAS' },
      { id: 'HARDWARE', label: 'HARDWARE' }
    ];

    navLinks.innerHTML = categories.map(cat => `
      <li><a href="#" class="nav-item ${currentCategory === cat.id ? 'active' : ''}" data-cat="${cat.id}">${cat.label}</a></li>
    `).join('');

    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();

        // Scroll to top INSTANTLY before any view switch or content render.
        // Doing this first avoids the sticky-nav cut-off caused by content
        // height changes triggering layout during a smooth-scroll animation.
        window.scrollTo({ top: 0, behavior: 'instant' });

        // Always ensure home-view is visible and sub-views are hidden
        const newsView = document.getElementById('news-view');
        const guideViewEl = document.getElementById('guide-view');
        if (newsView) newsView.style.display = 'none';
        if (guideViewEl) guideViewEl.style.display = 'none';
        if (gameView) gameView.style.display = 'none';
        if (adminView) adminView.style.display = 'none';
        if (homeView) homeView.style.display = 'block';

        // Update URL to '/' if we are on a sub-path or have stale params/hash
        if (window.location.pathname !== '/' || window.location.search || window.location.hash) {
          window.history.pushState(null, '', '/');
        }

        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        e.target.classList.add('active');
        currentCategory = e.target.dataset.cat;
        currentPage = 1;
        newsForceVisible = false;
        renderGames();
      });
    });
  };

  // Render Tags
  const renderTags = () => {
    const topConsoles = consoles.slice(0, 8);
    tagsList.innerHTML = topConsoles.map(c => `<span>#${c.toLowerCase()}</span>`).join('');
  };

  // ============================================================
  // NEWS SYSTEM
  // ============================================================
  let allArticles = Array.isArray(allArticlesData) ? allArticlesData : [];
  let aiNews = allArticles.filter(a => a.category === 'NOTICIAS' || a.type === 'news');

  // Archived news from GitHub (loaded on demand, 5 at a time)
  let archivedNewsCache = [];
  let archivedNewsPage = 0;
  let archivedNewsLoaded = false;
  const ARCHIVED_PER_PAGE = 5;

  // Render News Flash (Using AI News)
  const renderTicker = () => {
    if (aiNews.length === 0) return;
    const items = [...aiNews, ...aiNews, ...aiNews];
    tickerContent.innerHTML = items.map(news => {
      const loc = getLocalizedNews(news);
      return `
        <div class="ticker-item">
          <span style="color:var(--color-secondary); font-weight:bold;">[${loc.tag}]</span> ${loc.title}
        </div>
      `;
    }).join('');
  };

  // Modal DOM Elements
  const modal = document.getElementById('news-modal');
  const modalBackdrop = document.getElementById('modal-backdrop');
  const modalClose = document.getElementById('modal-close');
  const modalImage = document.getElementById('modal-image');
  const modalTag = document.getElementById('modal-tag');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');

  // Slugify helper for clean URLs
  const slugify = (text) => text.toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

  // Helper to clean image URLs (convert github raw urls to local uploads paths)
  const getCleanImageUrl = (url) => {
    if (!url) return '/logo.png';
    if (typeof url === 'string' && url.includes('raw.githubusercontent.com/godzgame/godzgames/main/public')) {
      return url.replace('https://raw.githubusercontent.com/godzgame/godzgames/main/public', '');
    }
    return url;
  };

  // Helper to generate static article URL
  const getArticleUrl = (article) => {
    if (!article) return '#';
    let cat = 'noticias';
    if (article.category === 'ANALISIS' || article.type === 'review') cat = 'analisis';
    if (article.category === 'GUIAS' || article.type === 'guide') cat = 'guias';
    const title = article.es?.title || article.en?.title || article.title || '';
    const slug = article.slug || slugify(title);
    return `/${cat}/${slug}/`;
  };

  // Helper to classify hardware news
  const isHardwareNews = (article) => {
    if (!article) return false;
    if (article.category === 'hardware' || article.isHardware) return true;
    const text = ((article.es?.title || '') + ' ' + (article.es?.description || '') + ' ' + (article.es?.fullContent || '') + ' ' + (article.en?.title || '') + ' ' + (article.en?.description || '')).toLowerCase();
    const kw = ['hardware', 'consola', 'consolas', 'game boy', 'sega genesis', 'sega saturn', 'dreamcast', 'playstation 2', 'playstation 5', 'nintendo switch', 'nvidia', 'amd', 'intel', 'rtx', 'gpu', 'cpu', 'handheld', 'periférico', 'pantalla', 'dual sense', 'dualsense'];
    return kw.some(k => text.includes(k));
  };

  // Helper to generate static offer URL
  const getOfferUrl = (offer) => {
    if (!offer) return '#';
    const title = offer.title || '';
    const slug = slugify(title);
    return `/ofertas/${slug}/`;
  };

  // Render Standalone Offer Page
  const renderOfertaPage = (oferta) => {
    const newsView = document.getElementById('news-view');
    if (!newsView) return;

    homeView.style.display = 'none';
    gameView.style.display = 'none';
    adminView.style.display = 'none';
    newsView.style.display = 'block';

    const offerUrl = getOfferUrl(oferta);
    if (typeof window.setCanonical === 'function') window.setCanonical(`https://godzgames.com${offerUrl}`);

    const formattedPrice = oferta.price ? `$${Number(oferta.price).toLocaleString('es-MX')} MXN` : 'Consultar en tienda';

    const relatedOffers = savedAffiliates.filter(a => (a.productId || a.id) !== (oferta.productId || oferta.id)).slice(0, 3);
    let relatedHtml = '';
    if (relatedOffers.length > 0) {
      relatedHtml = `
        <div class="related-news-section" style="margin-top: 50px;">
          <h3 class="related-news-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-primary)"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>
            Otras Ofertas Destacadas
          </h3>
          <div class="related-news-grid">
            ${relatedOffers.map(rel => {
              const relUrl = getOfferUrl(rel);
              const relPrice = rel.price ? `$${Number(rel.price).toLocaleString('es-MX')} MXN` : '';
              return `
                <a href="${relUrl}" class="related-news-card" onclick="window.navigateTo(event, '${relUrl}')">
                  <div class="related-news-thumb" style="background:#fff; padding:10px; text-align:center;">
                    <img src="${rel.thumbnail || '/logo.png'}" alt="${rel.title}" onerror="this.src='/logo.png'" loading="lazy" style="max-height:140px; object-fit:contain;"/>
                  </div>
                  <div class="related-news-info">
                    <span class="trending-tag" style="background:var(--color-primary); color:#000; font-weight:bold;">${relPrice}</span>
                    <h4 class="related-news-card-title">${rel.title}</h4>
                  </div>
                </a>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    newsView.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
        <button class="back-btn" onclick="if (document.referrer && window.history.length > 1) { window.history.back(); } else { window.navigateTo(event, '/'); }">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          <span>← Regresar</span>
        </button>
        <div class="breadcrumb" style="margin-bottom:0;">
          <a href="/" onclick="window.navigateTo(event, '/')">Home</a> &gt; <a href="#" onclick="event.preventDefault(); window.history.pushState(null,'','/'); window.dispatchEvent(new Event('popstate'));">Ofertas</a> &gt; <span style="color:#fff;">${oferta.title}</span>
        </div>
      </div>
      <article class="news-article-wrap">
        <div class="news-article-header">
          <span class="news-article-tag" style="background: var(--color-primary); color: #000; font-weight: bold; font-size: 0.95rem; padding: 4px 12px; border-radius: 6px;">🏷️ OFERTA EXCLUSIVA</span>
          <h1 class="news-article-title" style="margin-top: 15px;">${oferta.title}</h1>
          <div style="margin: 15px 0 25px; display: inline-flex; flex-direction: column; gap: 4px; background: rgba(0,255,170,0.08); border: 1px solid var(--color-primary); border-radius: 12px; padding: 15px 20px;">
            <span style="font-size: 1.8rem; font-weight: 800; color: var(--color-primary);">${formattedPrice}</span>
            <span style="font-size: 0.82rem; color: #a0a0a0; font-style: italic;">* Precio de referencia al momento de publicar, verifique el precio actual en Mercado Libre</span>
          </div>
        </div>
        
        <div class="news-article-image" style="background: #ffffff; padding: 25px; border-radius: 16px; text-align: center; margin-bottom: 30px;">
          <img src="${oferta.thumbnail || '/logo.png'}" alt="${oferta.title}" onerror="this.src='/logo.png'" style="max-height: 380px; width: auto; object-fit: contain; margin: 0 auto;"/>
        </div>
        
        <div class="news-article-body" style="font-size: 1.1rem; line-height: 1.8;">
          <p>${oferta.generatedText || ''}</p>
          
          <div style="margin-top: 35px; text-align: center; padding: 30px 20px; background: rgba(255,255,255,0.03); border-radius: 16px; border: 1px solid var(--border-color);">
            <h3 style="margin-bottom: 12px; color: #fff;">¿Te interesa este producto?</h3>
            <p style="color: #aaa; margin-bottom: 20px; font-size: 0.95rem;">Consulta stock disponible, precio actualizado y opciones de envío directo en la tienda oficial.</p>
            <a href="${oferta.link || oferta.permalink || '#'}" target="_blank" rel="nofollow noopener" class="admin-btn" style="display: inline-flex; align-items: center; gap: 10px; font-size: 1.15rem; font-weight: bold; padding: 14px 32px; background: linear-gradient(135deg, #ffe600, #ffb700); color: #000; border-radius: 10px; text-decoration: none; box-shadow: 0 4px 15px rgba(255, 230, 0, 0.3);">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="black"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
              Abrir en Mercado Libre
            </a>
          </div>
        </div>
        
        ${relatedHtml}
      </article>
    `;
  };

  // Helper to format markdown body content into clean HTML
  const formatArticleContent = (text) => {
    if (!text) return '';
    let html = text;
    // CTA links
    html = html.replace(/\[CTA-COMPRA:\s*([^\]]+)\]/g, (match, p1) => {
      return `<div style="margin: 25px 0; text-align: center;">
        <a href="/?search=${encodeURIComponent(p1)}" class="admin-btn" onclick="window.navigateTo(event, '/?search=${encodeURIComponent(p1)}')" style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; background: linear-gradient(135deg, var(--color-primary), #00cc88); color: #000; font-weight: bold; border-radius: 10px; text-decoration: none; box-shadow: 0 4px 12px rgba(0,255,170,0.3);">
          🎮 Buscar "${p1}" en catálogo
        </a>
      </div>`;
    });
    // Headings
    html = html.replace(/^### (.*$)/gim, '<h3 style="color:#fff; margin-top:28px; margin-bottom:12px; font-size:1.3rem;">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 style="color:var(--color-primary); margin-top:35px; margin-bottom:15px; font-size:1.5rem; border-bottom:1px solid var(--border-color); padding-bottom:8px;">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 style="color:#fff; margin-top:35px; margin-bottom:15px; font-size:1.8rem;">$1</h1>');
    // Blockquotes
    html = html.replace(/^>\s*(.*$)/gim, '<blockquote style="border-left: 4px solid var(--color-primary); padding: 12px 18px; margin: 20px 0; color: #eee; font-style: italic; background: rgba(255,255,255,0.03); border-radius: 0 8px 8px 0;">$1</blockquote>');
    // Bold & Italics
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Lists
    html = html.replace(/^\-\s+(.*$)/gim, '<li style="margin-left: 20px; margin-bottom: 6px; color: #ccc;">$1</li>');

    const blocks = html.split(/\n\n+/);
    return blocks.map(block => {
      const trimmed = block.trim();
      if (trimmed.startsWith('<h') || trimmed.startsWith('<div') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<li')) {
        return trimmed;
      }
      return `<p style="margin-bottom: 18px; line-height: 1.8; color: #d0d0d0; font-size: 1.05rem;">${trimmed.replace(/\n/g, '<br>')}</p>`;
    }).join('');
  };

  // Render Standalone News Article Page
  const renderNewsArticlePage = (article) => {
    const newsView = document.getElementById('news-view');
    if (!newsView) return;

    homeView.style.display = 'none';
    gameView.style.display = 'none';
    adminView.style.display = 'none';
    newsView.style.display = 'block';

    const loc = getLocalizedNews(article);
    const articleUrl = getArticleUrl(article);

    const categoryLabel = article.category === 'ANALISIS' || article.type === 'review' ? 'Análisis' : (article.category === 'GUIAS' || article.type === 'guide' ? 'Guías' : 'Noticias');
    const tagLabel = article.category === 'ANALISIS' || article.type === 'review' ? '🔬 ANÁLISIS' : (article.category === 'GUIAS' || article.type === 'guide' ? '📚 GUÍA' : `🔥 ${loc.tag || 'NOTICIA'}`);

    const formattedBody = loc.fullContent ? formatArticleContent(loc.fullContent) : `<p>${loc.description}</p>`;

    let prosConsHtml = '';
    if ((article.pros && article.pros.length > 0) || (article.cons && article.cons.length > 0)) {
      prosConsHtml = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; margin: 30px 0; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 16px; padding: 20px;">
          ${article.pros && article.pros.length > 0 ? `
            <div>
              <h4 style="color: #00ffaa; margin-bottom: 12px; font-size: 1.1rem; display: flex; align-items: center; gap: 6px;">
                <span>👍 Lo Bueno</span>
              </h4>
              <ul style="list-style: none; padding: 0;">
                ${article.pros.map(p => `<li style="margin-bottom: 8px; color: #ddd; font-size: 0.95rem; display: flex; gap: 8px;"><span>✔</span> <span>${p}</span></li>`).join('')}
              </ul>
            </div>
          ` : ''}
          ${article.cons && article.cons.length > 0 ? `
            <div>
              <h4 style="color: #ff5555; margin-bottom: 12px; font-size: 1.1rem; display: flex; align-items: center; gap: 6px;">
                <span>👎 Lo Malo</span>
              </h4>
              <ul style="list-style: none; padding: 0;">
                ${article.cons.map(c => `<li style="margin-bottom: 8px; color: #ddd; font-size: 0.95rem; display: flex; gap: 8px;"><span>✖</span> <span>${c}</span></li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `;
    }

    let verdictHtml = '';
    if (article.verdict) {
      verdictHtml = `
        <div style="margin: 30px 0; padding: 20px 24px; background: linear-gradient(135deg, rgba(0,255,170,0.1), rgba(0,0,0,0.4)); border: 1px solid var(--color-primary); border-radius: 16px;">
          <h4 style="color: var(--color-primary); font-size: 1.1rem; margin-bottom: 8px;">🏁 Veredicto Editor</h4>
          <p style="color: #fff; font-size: 1.1rem; font-style: italic; line-height: 1.6; margin: 0;">"${article.verdict}"</p>
        </div>
      `;
    }

    const scoreBadge = article.score ? `<span style="background: linear-gradient(135deg, #00ffaa, #00b377); color: #000; font-weight: 800; font-size: 1rem; padding: 4px 12px; border-radius: 8px; margin-left: 12px; display: inline-block;">⭐ ${article.score} / 10</span>` : '';

    // Filter related articles (same category or type, excluding current)
    const relatedArticles = allArticles.filter(n => n.id !== article.id && (n.category === article.category || n.type === article.type)).slice(0, 3);
    let relatedHtml = '';
    if (relatedArticles.length > 0) {
      relatedHtml = `
        <div class="related-news-section" style="margin-top: 50px;">
          <h3 class="related-news-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-secondary)"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
            ${currentLang === 'es' ? 'Contenido Relacionado' : 'Related Content'}
          </h3>
          <div class="related-news-grid">
            ${relatedArticles.map(rel => {
              const relLoc = getLocalizedNews(rel);
              const relUrl = getArticleUrl(rel);
              const relImg = getCleanImageUrl(rel.image);
              return `
                <a href="${relUrl}" class="related-news-card" onclick="window.navigateTo(event, '${relUrl}')">
                  <div class="related-news-thumb">
                    <img src="${relImg}" alt="${relLoc.title}" onerror="if(!this.dataset.tried){this.dataset.tried='1';if(this.src.includes('raw.githubusercontent.com/godzgame/godzgames/main/public')){this.src=this.src.replace('https://raw.githubusercontent.com/godzgame/godzgames/main/public','');}else{this.src='/logo.png';}}" loading="lazy"/>
                  </div>
                  <div class="related-news-info">
                    <span class="trending-tag">${rel.category || relLoc.tag}</span>
                    <h4 class="related-news-card-title">${relLoc.title}</h4>
                  </div>
                </a>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    const dateFormatted = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString(currentLang === 'es' ? 'es-ES' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString();
    const mainImgUrl = getCleanImageUrl(article.image);

    newsView.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
        <button class="back-btn" onclick="if (document.referrer && window.history.length > 1) { window.history.back(); } else { window.navigateTo(event, '/'); }">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          <span>${currentLang === 'es' ? '← Regresar' : '← Go Back'}</span>
        </button>
        <div class="breadcrumb" style="margin-bottom:0;">
          <a href="/" onclick="window.navigateTo(event, '/')">Home</a> &gt; <span>${categoryLabel}</span> &gt; <span style="color:#fff;">${loc.title}</span>
        </div>
      </div>
      <article class="news-article-wrap">
        <div class="news-article-header">
          <span class="news-article-tag">${tagLabel}</span>
          ${scoreBadge}
          <h1 class="news-article-title" style="margin-top: 15px;">${loc.title}</h1>
          <div class="news-article-meta">
            <span>📅 ${dateFormatted}</span>
            ${article.author ? `<span>✍️ ${article.author}</span>` : ''}
            <span>⏱️ ${currentLang === 'es' ? '4 min de lectura' : '4 min read'}</span>
          </div>
        </div>
        <div class="news-article-image">
          <img src="${mainImgUrl}" alt="${loc.title}" onerror="if(!this.dataset.tried){this.dataset.tried='1';if(this.src.includes('raw.githubusercontent.com/godzgame/godzgames/main/public')){this.src=this.src.replace('https://raw.githubusercontent.com/godzgame/godzgames/main/public','');}else{this.src='/logo.png';}}"/>
        </div>
        <div class="news-article-body">
          ${formattedBody}
          ${prosConsHtml}
          ${verdictHtml}
        </div>
        ${relatedHtml}
        <div class="game-comments-section" style="margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--border-color);">
          <h3 style="margin-bottom: 20px;">${currentLang === 'es' ? 'Comentarios' : 'Comments'}</h3>
          <div id="disqus_thread"></div>
        </div>
      </article>
    `;

    const disqus_shortname = 'godzgames';
    const pageUrl = window.location.origin + articleUrl;
    const pageIdentifier = 'news_' + article.id;

    if (window.DISQUS) {
      window.DISQUS.reset({
        reload: true,
        config: function () {  
          this.page.identifier = pageIdentifier;  
          this.page.url = pageUrl;
        }
      });
    } else {
      window.disqus_config = function () {
        this.page.url = pageUrl;
        this.page.identifier = pageIdentifier;
      };
      const d = document, s = d.createElement('script');
      s.src = `https://${disqus_shortname}.disqus.com/embed.js`;
      s.setAttribute('data-timestamp', +new Date());
      (d.head || d.body).appendChild(s);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Render Standalone Game Guide Page with Lateral Menu
  const renderGameGuidePage = (guide, targetSectionId) => {
    const guideViewEl = document.getElementById('guide-view');
    const newsView = document.getElementById('news-view');
    const legalView = document.getElementById('legal-view');

    if (homeView) homeView.style.display = 'none';
    if (gameView) gameView.style.display = 'none';
    if (newsView) newsView.style.display = 'none';
    if (adminView) adminView.style.display = 'none';
    if (legalView) legalView.style.display = 'none';
    if (guideViewEl) guideViewEl.style.display = 'block';

    const publishedSections = (guide.sections || []).filter(s => {
      if (!s.published) return false;
      // Sections without a lang tag (ficha, mi-experiencia) always show
      if (!s.lang) return true;
      return s.lang === currentLang;
    });
    // Use localized label if available
    publishedSections.forEach(s => {
      if (currentLang === 'es' && s.label_es) s._displayLabel = s.label_es;
      else if (currentLang === 'en' && s.label_en) s._displayLabel = s.label_en;
      else s._displayLabel = s.label;
    });
    let currentSection = publishedSections.find(s => s.id === targetSectionId);
    if (!currentSection && publishedSections.length > 0) {
      currentSection = publishedSections.find(s => s.id === 'inicio') || publishedSections[0];
    }
    if (!currentSection) {
      currentSection = { id: 'inicio', label: 'Inicio', html: '<p class="guide-p">Sección en desarrollo.</p>' };
    }

    const cleanLabel = (currentSection._displayLabel || currentSection.label).replace(/^[^\w\s]+/, '').trim();
    document.title = `${cleanLabel} - Guía de ${guide.gameTitle} (${guide.gameConsole}) | GodZGames`;
    if (typeof window.setCanonical === 'function') {
      window.setCanonical(`https://godzgames.com/guias/${guide.slug}/${currentSection.id}/`);
    }

    const affiliateHtml = guide.affiliate ? `
      <div class="guide-affiliate-box" style="margin-top: 20px;">
        <div class="guide-affiliate-badge">🔥 OFERTA</div>
        <div class="guide-affiliate-info">
          <h4 style="font-size: 0.95rem;">${guide.affiliate.title}</h4>
          ${guide.affiliate.price ? `<div class="guide-affiliate-price" style="font-size: 1.1rem;">$${guide.affiliate.price} MXN</div>` : ''}
          <a href="${guide.affiliate.permalink}" target="_blank" rel="noopener noreferrer nofollow" class="guide-buy-btn" style="padding: 8px 14px; font-size: 0.85rem;">
            🛒 Comprar
          </a>
        </div>
      </div>
    ` : '';

    if (guideViewEl) {
      guideViewEl.innerHTML = `
        <div class="breadcrumb">
          <a href="/" onclick="window.navigateTo(event, '/')">Inicio</a> &gt;
          <a href="/guias/" onclick="window.navigateTo(event, '/guias/')">Guías</a> &gt;
          <a href="/guias/${guide.slug}/" onclick="window.navigateTo(event, '/guias/${guide.slug}/')">${guide.gameTitle}</a> &gt;
          <span>${currentSection._displayLabel || currentSection.label}</span>
        </div>
        <div class="guide-layout">
          <aside class="guide-sidebar">
            <div class="guide-sidebar-header">
              <img src="${guide.cover}" alt="${guide.gameTitle}" class="guide-sidebar-thumb" onerror="this.src='/logo.png';" />
              <div class="guide-sidebar-info">
                <h2 class="guide-sidebar-title">${guide.gameTitle}</h2>
                <span class="guide-sidebar-badge">${guide.gameConsole}</span>
              </div>
            </div>
            <button class="guide-sidebar-toggle" id="guide-sidebar-toggle" aria-expanded="false" onclick="const n=this.nextElementSibling;if(n)n.classList.toggle('open');">
              <span>${currentLang === 'es' ? 'Índice de la Guía' : 'Guide Index'}</span>
              <span>▼</span>
            </button>
            <nav class="guide-sidebar-nav">
              ${publishedSections.map(s => `
                <a href="/guias/${guide.slug}/${s.id}/" 
                   class="guide-nav-item ${s.id === currentSection.id ? 'active' : ''}" 
                   onclick="window.navigateTo(event, '/guias/${guide.slug}/${s.id}/')">
                  ${s._displayLabel || s.label}
                </a>
              `).join('')}
            </nav>
            ${affiliateHtml}
          </aside>
          <article class="guide-content">
            <h1 class="guide-section-title">${currentSection._displayLabel || currentSection.label}</h1>
            <div class="guide-section-body">
              ${currentSection.html || '<p class="guide-p">Sección en desarrollo.</p>'}
            </div>
          </article>
        </div>
      `;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper function to create an AI News card
  const createNewsCard = (news, isPrimary) => {
    const loc = getLocalizedNews(news);
    return `
      <div class="featured-item" data-id="${news.id}">
        <img src="${news.image || ''}" alt="${loc.title}" loading="lazy" onerror="if(!this.dataset.tried){this.dataset.tried='1';this.src=this.src.replace('https://raw.githubusercontent.com/godzgame/godzgames/main/public','');}" />
        <div class="featured-overlay">
          <span class="featured-category">${loc.tag}</span>
          <h3 class="featured-title" style="margin-bottom: 5px;">${loc.title}</h3>
          <p style="color: #ccc; font-size: 0.85rem; line-height: 1.3; ${isPrimary ? 'display:block;' : 'display:none;'}">${loc.description}</p>
        </div>
      </div>
    `;
  };

  // Helper function to create a game card layout
  const createGameCard = (game) => {
    // Check if the game has a real cover from games.json, otherwise fallback to Bing image search for the real cover
    const defaultCoverUrl = game.cover ? game.cover : `https://tse2.mm.bing.net/th?q=${encodeURIComponent(game.title + ' ' + game.console + ' official retail cover front')}&w=300`;
    const coverUrl = game.customCover || defaultCoverUrl;
    
    const imageHtml = `<img src="${coverUrl}" alt="${game.title}" loading="lazy"/>`;

    const btnText = translations[currentLang].getLink;
    return `
      <div class="game-card">
        <div class="card-img-wrap" onclick="window.navigateTo(event, '/?game=${game.id}')">
          <span class="card-category">${game.console}</span>
          ${imageHtml}
        </div>
        <div class="card-content">
          <h3 class="card-title" onclick="window.navigateTo(event, '/?game=${game.id}')" style="cursor:pointer;">${game.title}</h3>
          <a href="/?game=${game.id}" class="card-btn" onclick="window.navigateTo(event, '/?game=${game.id}')">${btnText}</a>
        </div>
      </div>
    `;
  };

  // Render Games and News
  const renderGames = () => {
    trackAnalyticsPageView();
    if (currentCategory === 'OFERTAS') {
      if (heroLayout) heroLayout.style.display = 'none';
      if (topGamesSection) topGamesSection.style.display = 'none';
      if (featuredGrid) featuredGrid.style.display = 'none';
      const newsTicker = document.querySelector('.news-flash');
      if (newsTicker) newsTicker.style.display = 'none';
      if (paginationControls) paginationControls.innerHTML = '';

      const popularGamesSection = document.querySelector('.popular-games');
      if (popularGamesSection) popularGamesSection.style.display = '';
      const catalogTitle = document.getElementById('catalog-section-title');
      if (catalogTitle) catalogTitle.textContent = '🏷️ Ofertas y Descuentos Destacados';

      if (savedAffiliates.length === 0) {
        gamesGrid.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px; color: var(--color-text-muted);">
            <h3>No hay ofertas activas en este momento</h3>
            <p>Visita nuestro catálogo de juegos o vuelve pronto para ver nuevas promociones de hardware y tecnología.</p>
          </div>
        `;
      } else {
        gamesGrid.innerHTML = savedAffiliates.map(item => {
          const offerUrl = getOfferUrl(item);
          const priceText = item.price ? `$${Number(item.price).toLocaleString('es-MX')} MXN` : 'Consultar precio';
          return `
            <div class="game-card" style="display:flex; flex-direction:column; background:var(--color-surface); border-radius:16px; overflow:hidden; border:1px solid var(--border-color); box-shadow:var(--shadow-sm); transition:transform 0.2s, box-shadow 0.2s;">
              <div style="background:#fff; padding:15px; text-align:center; height:180px; display:flex; align-items:center; justify-content:center;">
                <img src="${item.thumbnail || '/logo.png'}" alt="${item.title}" onerror="this.src='/logo.png'" style="max-height:150px; max-width:100%; object-fit:contain;" />
              </div>
              <div style="padding:18px; display:flex; flex-direction:column; flex:1;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; gap:10px;">
                  <span style="font-size:1.2rem; font-weight:800; color:var(--color-primary);">${priceText}</span>
                  <span style="font-size:0.75rem; color:#888; background:rgba(255,255,255,0.05); padding:3px 8px; border-radius:4px;">Verificar actual</span>
                </div>
                <h3 style="font-size:1rem; margin-bottom:10px; line-height:1.4; color:#fff;">${item.title}</h3>
                <p style="font-size:0.85rem; color:#bbb; line-height:1.5; margin-bottom:15px; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; flex:1;">${item.generatedText || ''}</p>
                <div style="display:flex; gap:10px; margin-top:auto;">
                  <a href="${offerUrl}" class="admin-btn-secondary" style="flex:1; text-align:center; text-decoration:none; padding:8px 12px; font-size:0.85rem; border-radius:8px;" onclick="window.navigateTo(event, '${offerUrl}')">Ver Detalle</a>
                  <a href="${item.link || item.permalink || '#'}" target="_blank" rel="nofollow noopener" class="admin-btn" style="flex:1; text-align:center; text-decoration:none; padding:8px 12px; font-size:0.85rem; border-radius:8px; background:linear-gradient(135deg, #ffe600, #ffb700); color:#000; font-weight:bold;">Ir a Oferta ↗</a>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
      return;
    }

    if (currentCategory === 'HARDWARE') {
      if (heroLayout) heroLayout.style.display = 'none';
      if (topGamesSection) topGamesSection.style.display = 'none';
      if (featuredGrid) featuredGrid.style.display = 'none';
      const newsTicker = document.querySelector('.news-flash');
      if (newsTicker) newsTicker.style.display = 'none';
      if (paginationControls) paginationControls.innerHTML = '';

      const popularGamesSection = document.querySelector('.popular-games');
      if (popularGamesSection) popularGamesSection.style.display = '';
      const catalogTitle = document.getElementById('catalog-section-title');
      if (catalogTitle) catalogTitle.textContent = '🎧 Reseñas de Periféricos & Noticias de Hardware';

      // 2A. Reseñas de productos de Hardware (Arriba - Solo ítems guardados con link de afiliado real)
      const savedHardwareOffers = savedAffiliates.filter(item => {
        const kw = (item.keyword || item.category || '').toLowerCase();
        const title = (item.title || '').toLowerCase();
        return item.type === 'hardware' || kw.includes('hardware') || kw.includes('control') || kw.includes('audífonos') || kw.includes('silla') || kw.includes('teclado') || kw.includes('mouse') || kw.includes('micrófono') || kw.includes('webcam') || title.includes('gamepad') || title.includes('teclado') || title.includes('silla') || title.includes('auriculares') || title.includes('webcam');
      });

      let hardwareProductsHtml = '';
      if (savedHardwareOffers.length > 0) {
        hardwareProductsHtml = `
          <div style="grid-column: 1/-1; margin-bottom: 20px;">
            <h3 style="font-size: 1.3rem; color: var(--color-primary); margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
              <span>🕹️ Reseñas de Periféricos y Accesorios</span>
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
              ${savedHardwareOffers.map(item => {
                const offerUrl = getOfferUrl(item);
                const priceText = item.price ? `$${Number(item.price).toLocaleString('es-MX')} MXN` : 'Consultar precio';
                return `
                  <div class="game-card" style="display:flex; flex-direction:column; background:var(--color-surface); border-radius:16px; overflow:hidden; border:1px solid var(--border-color); box-shadow:var(--shadow-sm);">
                    <div style="background:#fff; padding:15px; text-align:center; height:180px; display:flex; align-items:center; justify-content:center;">
                      <img src="${item.thumbnail || '/logo.png'}" alt="${item.title}" onerror="this.src='/logo.png'" style="max-height:150px; max-width:100%; object-fit:contain;" />
                    </div>
                    <div style="padding:18px; display:flex; flex-direction:column; flex:1;">
                      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; gap:10px;">
                        <span style="font-size:1.15rem; font-weight:800; color:var(--color-primary);">${priceText}</span>
                        <span style="font-size:0.72rem; color:#888; background:rgba(255,255,255,0.05); padding:3px 8px; border-radius:4px;">Verificar actual</span>
                      </div>
                      <h4 style="font-size:0.95rem; margin-bottom:10px; line-height:1.4; color:#fff;">${item.title}</h4>
                      <p style="font-size:0.85rem; color:#bbb; line-height:1.5; margin-bottom:15px; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; flex:1;">${item.generatedText || ''}</p>
                      <div style="display:flex; gap:10px; margin-top:auto;">
                        <a href="${offerUrl}" class="admin-btn-secondary" style="flex:1; text-align:center; text-decoration:none; padding:8px 12px; font-size:0.85rem; border-radius:8px;" onclick="window.navigateTo(event, '${offerUrl}')">Ver Detalle</a>
                        <a href="${item.link || item.permalink || '#'}" target="_blank" rel="nofollow noopener" class="admin-btn" style="flex:1; text-align:center; text-decoration:none; padding:8px 12px; font-size:0.85rem; border-radius:8px; background:linear-gradient(135deg, #ffe600, #ffb700); color:#000; font-weight:bold;">Ir a Oferta ↗</a>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      } else {
        // FIX 4: Clear empty state for hardware section (no reviews yet)
        hardwareProductsHtml = `
          <div style="grid-column: 1/-1; margin-bottom: 20px; display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 40px 30px; background: rgba(255,255,255,0.02); border: 1px dashed var(--border-color); border-radius: 16px; text-align: center;">
            <span style="font-size: 2.5rem;">🎧</span>
            <h4 style="color: #fff; font-size: 1.1rem; margin: 0;">No hay reseñas de periféricos publicadas aún</h4>
            <p style="color: #aaa; font-size: 0.9rem; max-width: 480px; line-height: 1.6; margin: 0;">Cuando guardes un link de afiliado real desde el <strong style="color: var(--color-primary)">Panel de Administración</strong> → Sugerencias Afiliados, aparecerá aquí automáticamente.</p>
          </div>
        `;
      }

      // 2B. Noticias de Hardware (Abajo)
      const hardwareNewsArticles = aiNews.filter(isHardwareNews);
      let hardwareNewsHtml = '';
      if (hardwareNewsArticles.length > 0) {
        hardwareNewsHtml = `
          <div style="grid-column: 1/-1; margin-top: 30px;">
            <h3 style="font-size: 1.3rem; color: #fff; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; border-top: 1px solid var(--border-color); padding-top: 25px;">
              <span>💻 Noticias y Anuncios de Hardware</span>
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
              ${hardwareNewsArticles.map(article => {
                const loc = getLocalizedNews(article);
                const articleUrl = getArticleUrl(article);
                return `
                  <div class="game-card" style="display:flex; flex-direction:column; background:var(--color-surface); border-radius:16px; overflow:hidden; border:1px solid var(--border-color);">
                    <div style="height:160px; overflow:hidden;">
                      <img src="${article.image || '/logo.png'}" alt="${loc.title}" onerror="this.src='/logo.png'" style="width:100%; height:100%; object-fit:cover;" />
                    </div>
                    <div style="padding:18px; display:flex; flex-direction:column; flex:1;">
                      <span class="trending-tag" style="align-self:flex-start; margin-bottom:8px;">💻 HARDWARE</span>
                      <h4 style="font-size:0.95rem; margin-bottom:10px; line-height:1.4; color:#fff;">${loc.title}</h4>
                      <p style="font-size:0.85rem; color:#bbb; line-height:1.5; margin-bottom:15px; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; flex:1;">${loc.description || ''}</p>
                      <a href="${articleUrl}" class="hero-btn" style="text-align:center; font-size:0.85rem; padding:8px 12px; margin-top:auto;" onclick="window.navigateTo(event, '${articleUrl}')">Leer Noticia →</a>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      } else {
        hardwareNewsHtml = `
          <div style="grid-column: 1/-1; text-align: center; padding: 30px; color: var(--color-text-muted);">
            <p>No se encontraron noticias adicionales clasificadas sobre hardware en este lote.</p>
          </div>
        `;
      }

      gamesGrid.innerHTML = hardwareProductsHtml + hardwareNewsHtml;
      return;
    }

    if (currentCategory === 'NOTICIAS') {
      if (heroLayout) heroLayout.style.display = 'none';
      if (topGamesSection) topGamesSection.style.display = 'none';
      if (featuredGrid) featuredGrid.style.display = 'none';
      const newsTicker = document.querySelector('.news-flash');
      if (newsTicker) newsTicker.style.display = 'none';
      if (paginationControls) paginationControls.innerHTML = '';

      const popularGamesSection = document.querySelector('.popular-games');
      if (popularGamesSection) popularGamesSection.style.display = '';
      const catalogTitle = document.getElementById('catalog-section-title');
      if (catalogTitle) catalogTitle.textContent = '📰 Últimas Noticias de Videojuegos';

      const newsArticles = allArticles.filter(a => (a.category === 'NOTICIAS' || a.type === 'news') && !a.isArchived);

      // ── SEARCH BAR ──────────────────────────────────────────────────────
      // Insert search bar above the grid (once per tab visit)
      const parentEl = gamesGrid.parentElement;
      let searchBarEl = document.getElementById('news-search-bar');
      if (!searchBarEl) {
        searchBarEl = document.createElement('div');
        searchBarEl.id = 'news-search-bar';
        parentEl.insertBefore(searchBarEl, gamesGrid);
      }
      searchBarEl.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px; padding:14px 18px; background:var(--color-surface); border-radius:14px; border:1px solid var(--border-color);">
          <span style="font-size:1.2rem;">🔍</span>
          <input id="news-search-input" type="text" placeholder="Buscar noticias..."
            style="flex:1; background:transparent; border:none; outline:none; color:var(--color-text); font-size:0.95rem; font-family:inherit;"
          />
          <button id="news-search-clear" style="background:none;border:none;color:var(--color-text-muted);cursor:pointer;font-size:1.1rem;display:none;">✕</button>
        </div>
        <div id="news-search-status" style="font-size:0.85rem; color:var(--color-text-muted); margin-bottom:12px; display:none;"></div>
      `;

      // Search filter function — applied to ALL visible cards
      const applySearch = (q) => {
        const query = q.trim().toLowerCase();
        const cards = gamesGrid.querySelectorAll('.news-card-item');
        let visible = 0;
        cards.forEach(card => {
          const text = (card.dataset.search || '').toLowerCase();
          const show = !query || text.includes(query);
          card.style.display = show ? '' : 'none';
          if (show) visible++;
        });
        // Hide load-all button during active search
        const loadMoreBtn = document.getElementById('archived-load-all-btn');
        if (loadMoreBtn) loadMoreBtn.style.display = query ? 'none' : 'inline-block';
        // Status message
        const statusEl = document.getElementById('news-search-status');
        if (statusEl) {
          if (query) {
            statusEl.textContent = visible === 0 ? 'No se encontraron noticias para "' + q + '".' : visible + ' noticia(s) encontrada(s)';
            statusEl.style.display = 'block';
          } else {
            statusEl.style.display = 'none';
          }
        }
        // Clear button
        const clearBtn = document.getElementById('news-search-clear');
        if (clearBtn) clearBtn.style.display = query ? 'inline-block' : 'none';
      };

      // Attach search listeners (after DOM is ready, use event delegation)
      requestAnimationFrame(() => {
        const inp = document.getElementById('news-search-input');
        const clr = document.getElementById('news-search-clear');
        if (inp) inp.addEventListener('input', () => applySearch(inp.value));
        if (clr) clr.addEventListener('click', () => { inp.value = ''; applySearch(''); inp.focus(); });
      });

      // Helper: render a single news card HTML
      const newsCardHtml = (article) => {
        const loc = getLocalizedNews(article);
        const articleUrl = getArticleUrl(article);
        // Archived articles: keep raw GitHub URL so browser loads from GitHub CDN.
        // Current articles: use getCleanImageUrl (converts GitHub URL to local /uploads/ path).
        const imgUrl = article.isArchived
          ? (article.image || '/logo.png')
          : getCleanImageUrl(article.image);
        const dateStr = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
        const badge = article.isArchived ? '🗂️ ARCHIVO' : '🔥 NOTICIA';
        const searchText = ((loc.title || '') + ' ' + (loc.description || '')).replace(/"/g, '');
        return `
          <div class="game-card news-card-item" data-search="${searchText}" style="display:flex; flex-direction:column; background:var(--color-surface); border-radius:16px; overflow:hidden; border:1px solid var(--border-color); box-shadow:var(--shadow-sm); transition:transform 0.2s;">
            <div style="height:170px; overflow:hidden; position:relative; cursor:pointer;" onclick="window.navigateTo(event, '${articleUrl}')">
              <img src="${imgUrl}" alt="${loc.title}" onerror="if(!this.dataset.tried){this.dataset.tried='1';this.src='/logo.png';}" style="width:100%; height:100%; object-fit:cover;" />
              <span class="trending-tag" style="position:absolute; top:10px; left:10px; margin:0; background:rgba(0,0,0,0.75); backdrop-filter:blur(4px);">${badge}</span>
            </div>
            <div style="padding:18px; display:flex; flex-direction:column; flex:1;">
              <div style="font-size:0.78rem; color:var(--color-text-muted); margin-bottom:8px;">
                <span>📅 ${dateStr}</span>
              </div>
              <h3 style="font-size:1rem; margin-bottom:10px; line-height:1.4; color:#fff; cursor:pointer;" onclick="window.navigateTo(event, '${articleUrl}')">${loc.title}</h3>
              <p style="font-size:0.85rem; color:#bbb; line-height:1.5; margin-bottom:15px; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; flex:1;">${loc.description || ''}</p>
              <a href="${articleUrl}" class="hero-btn" style="text-align:center; font-size:0.85rem; padding:8px 12px; margin-top:auto;" onclick="window.navigateTo(event, '${articleUrl}')">Leer Noticia →</a>
            </div>
          </div>
        `;
      };


      if (newsArticles.length === 0) {
        gamesGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:50px 20px;color:var(--color-text-muted);"><h3>No hay noticias activas en este momento</h3></div>`;
      } else {
        gamesGrid.innerHTML = newsArticles.map(newsCardHtml).join('');
      }

      // ── NOTICIAS ANTERIORES ─────────────────────────────────────────────
      // IDs of articles CURRENTLY SHOWN in the main grid — only these are excluded from archive
      const visibleNewsIds  = new Set(newsArticles.map(a => a.id).filter(Boolean));
      const visibleNewsTitles = new Set(
        newsArticles.map(a => (a.es?.title || a.en?.title || a.title || '').toLowerCase().slice(0, 40)).filter(Boolean)
      );

      const archivedSectionId = 'archived-news-section';
      const archivedContainer = document.createElement('div');
      archivedContainer.id = archivedSectionId;
      archivedContainer.style.cssText = 'grid-column:1/-1; margin-top:48px;';
      archivedContainer.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px; padding-bottom:14px; border-bottom:1px solid var(--border-color);">
          <span style="font-size:1.5rem;">🗂️</span>
          <h2 style="font-size:1.2rem; color:var(--color-text); margin:0;">Noticias Anteriores</h2>
          <span style="font-size:0.78rem; color:var(--color-text-muted); margin-left:auto;">Archivo histórico</span>
        </div>
        <div style="text-align:center; margin-bottom:24px;">
          <button id="archived-load-all-btn" style="
            background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
            border: none; color: #000; padding: 12px 32px; border-radius: 12px;
            font-size: 0.95rem; font-weight: 700; cursor: pointer;
            font-family: inherit; letter-spacing: 0.3px;
            box-shadow: 0 4px 20px rgba(0,255,170,0.3);
            transition: transform 0.15s, box-shadow 0.15s;
          "
          onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 28px rgba(0,255,170,0.45)';"
          onmouseout="this.style.transform='';this.style.boxShadow='0 4px 20px rgba(0,255,170,0.3)';"
          >📂 Ver todas las noticias anteriores</button>
          <div id="archived-loading" style="display:none; margin-top:14px; color:var(--color-text-muted); font-size:0.9rem;">
            <span style="display:inline-block; animation:spin 1s linear infinite; margin-right:6px;">⏳</span> Cargando noticias anteriores...
          </div>
          <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
        </div>
        <div id="archived-news-grid" style="display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:20px;"></div>
        <div id="archived-news-empty" style="display:none; text-align:center; padding:30px; color:var(--color-text-muted); font-size:0.9rem;">
          <p style="margin:0;">No hay noticias anteriores disponibles en este momento.</p>
        </div>
        <div id="archived-news-count" style="display:none; text-align:center; margin-top:16px; font-size:0.82rem; color:var(--color-text-muted);"></div>
      `;
      gamesGrid.appendChild(archivedContainer);

      // Load-all handler
      document.getElementById('archived-load-all-btn').addEventListener('click', async () => {
        const loadBtn   = document.getElementById('archived-load-all-btn');
        const loadingEl = document.getElementById('archived-loading');
        const grid      = document.getElementById('archived-news-grid');
        const emptyMsg  = document.getElementById('archived-news-empty');
        const countMsg  = document.getElementById('archived-news-count');

        // If already loaded, just toggle visibility
        if (archivedNewsLoaded && archivedNewsCache.length > 0) {
          grid.innerHTML = archivedNewsCache.map(newsCardHtml).join('');
          countMsg.textContent = `Se cargaron ${archivedNewsCache.length} noticias anteriores.`;
          countMsg.style.display = 'block';
          loadBtn.style.display = 'none';
          archivedNewsCache.forEach(art => {
            if (!allArticles.find(a => a.id === art.id)) allArticles.push(art);
          });
          return;
        }

        loadBtn.style.display = 'none';
        loadingEl.style.display = 'block';

        try {
          const REPO_BASE = 'https://raw.githubusercontent.com/godzgame/godzgames/main/src/data/';
          const ts = Date.now();
          // Fetch BOTH: permanent archive + current latest batch
          const [archiveData, liveData] = await Promise.all([
            safeFetchJSON(REPO_BASE + 'news_archive.json?t=' + ts),
            safeFetchJSON(REPO_BASE + 'latest_news.json?t=' + ts)
          ]);

          // Merge articles from both sources, deduplicating by id
          const archiveArts = (archiveData?.articles || []);
          const liveArts    = (liveData?.articles   || (Array.isArray(liveData) ? liveData : []));
          const seenIds = new Set();
          const allFetched = [];
          for (const a of [...archiveArts, ...liveArts]) {
            if (!a.id || seenIds.has(a.id)) continue;
            seenIds.add(a.id);
            allFetched.push(a);
          }

          // Sort by date descending (newest first)
          allFetched.sort((a, b) => {
            const da = a.publishedAt || a.date || '';
            const db = b.publishedAt || b.date || '';
            return db.localeCompare(da);
          });

          // Filter: exclude ONLY articles currently shown in the main grid
          const newArchived = allFetched
            .filter(a => {
              if (visibleNewsIds.has(a.id)) return false;
              const title = (a.es?.title || a.en?.title || a.title || '').toLowerCase().slice(0, 40);
              if (visibleNewsTitles.has(title)) return false;
              return true;
            })
            .map(a => ({
              id: a.id,
              type: 'news',
              category: 'NOTICIAS',
              isArchived: true,
              slug: a.slug || slugify(a.es?.title || a.en?.title || a.title || ''),
              title: a.es?.title || a.en?.title || a.title || '',
              description: a.es?.description || a.en?.description || a.description || '',
              fullContent: a.es?.fullContent || a.en?.fullContent || a.fullContent || '',
              es: a.es || { title: a.title || '', description: a.description || '', fullContent: a.fullContent || '' },
              en: a.en || { title: a.title || '', description: a.description || '', fullContent: a.fullContent || '' },
              image: a.image || '/logo.png',
              publishedAt: a.publishedAt || a.date || '',
              link: a.link || ''
            }));

          archivedNewsCache = newArchived;
          archivedNewsLoaded = true;
          loadingEl.style.display = 'none';

          if (archivedNewsCache.length === 0) {
            emptyMsg.innerHTML = '<p style="margin:0;">No hay noticias anteriores disponibles aún.<br><span style="font-size:0.8rem;opacity:0.7;">Se irán acumulando aquí conforme Make.com publique nuevas noticias.</span></p>';
            emptyMsg.style.display = 'block';
          } else {
            grid.innerHTML = archivedNewsCache.map(newsCardHtml).join('');
            countMsg.textContent = `${archivedNewsCache.length} noticias anteriores cargadas.`;
            countMsg.style.display = 'block';
            loadBtn.style.display = 'none';
            archivedNewsCache.forEach(art => {
              if (!allArticles.find(a => a.id === art.id)) allArticles.push(art);
            });
          }
        } catch (err) {
          loadingEl.style.display = 'none';
          loadBtn.textContent = '❌ Error al cargar — Click para reintentar';
          loadBtn.style.display = 'inline-block';
          archivedNewsLoaded = false;
        }



      return;
    }


    if (currentCategory === 'ANALISIS') {
      if (heroLayout) heroLayout.style.display = 'none';
      if (topGamesSection) topGamesSection.style.display = 'none';
      if (featuredGrid) featuredGrid.style.display = 'none';
      const newsTicker = document.querySelector('.news-flash');
      if (newsTicker) newsTicker.style.display = 'none';
      if (paginationControls) paginationControls.innerHTML = '';

      const popularGamesSection = document.querySelector('.popular-games');
      if (popularGamesSection) popularGamesSection.style.display = '';
      const catalogTitle = document.getElementById('catalog-section-title');
      if (catalogTitle) catalogTitle.textContent = '🔬 Análisis y Reviews Editoriales';

      const analysisArticles = allArticles.filter(a => a.category === 'ANALISIS' || a.type === 'review');
      if (analysisArticles.length === 0) {
        gamesGrid.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px; color: var(--color-text-muted);">
            <h3>No hay análisis publicados en este momento</h3>
            <p>Nuestros editores están analizando nuevos títulos. ¡Vuelve pronto!</p>
          </div>
        `;
      } else {
        gamesGrid.innerHTML = analysisArticles.map(article => {
          const loc = getLocalizedNews(article);
          const articleUrl = getArticleUrl(article);
          const imgUrl = getCleanImageUrl(article.image);
          const dateStr = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
          const scoreBadge = article.score ? `<span style="position:absolute; top:10px; right:10px; background:linear-gradient(135deg, #00ffaa, #00b377); color:#000; font-weight:800; font-size:0.85rem; padding:4px 10px; border-radius:8px; box-shadow:0 2px 8px rgba(0,255,170,0.4);">⭐ ${article.score}</span>` : '';
          return `
            <div class="game-card" style="display:flex; flex-direction:column; background:var(--color-surface); border-radius:16px; overflow:hidden; border:1px solid var(--border-color); box-shadow:var(--shadow-sm); transition:transform 0.2s;">
              <div style="height:170px; overflow:hidden; position:relative; cursor:pointer;" onclick="window.navigateTo(event, '${articleUrl}')">
                <img src="${imgUrl}" alt="${loc.title}" onerror="if(!this.dataset.tried){this.dataset.tried='1';if(this.src.includes('raw.githubusercontent.com/godzgame/godzgames/main/public')){this.src=this.src.replace('https://raw.githubusercontent.com/godzgame/godzgames/main/public','');}else{this.src='/logo.png';}}" style="width:100%; height:100%; object-fit:cover;" />
                <span class="trending-tag" style="position:absolute; top:10px; left:10px; margin:0; background:rgba(0,0,0,0.75); backdrop-filter:blur(4px); color:var(--color-primary);">🔬 ANÁLISIS</span>
                ${scoreBadge}
              </div>
              <div style="padding:18px; display:flex; flex-direction:column; flex:1;">
                <div style="font-size:0.78rem; color:var(--color-text-muted); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
                  <span>📅 ${dateStr}</span>
                  ${article.author ? `<span>• Por ${article.author}</span>` : ''}
                </div>
                <h3 style="font-size:1rem; margin-bottom:10px; line-height:1.4; color:#fff; cursor:pointer;" onclick="window.navigateTo(event, '${articleUrl}')">${loc.title}</h3>
                <p style="font-size:0.85rem; color:#bbb; line-height:1.5; margin-bottom:15px; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; flex:1;">${article.verdict || loc.description || ''}</p>
                <a href="${articleUrl}" class="hero-btn" style="text-align:center; font-size:0.85rem; padding:8px 12px; margin-top:auto;" onclick="window.navigateTo(event, '${articleUrl}')">Leer Análisis Completo →</a>
              </div>
            </div>
          `;
        }).join('');
      }
      return;
    }

    if (currentCategory === 'GUIAS') {
      if (heroLayout) heroLayout.style.display = 'none';
      if (topGamesSection) topGamesSection.style.display = 'none';
      if (featuredGrid) featuredGrid.style.display = 'none';
      const newsTicker = document.querySelector('.news-flash');
      if (newsTicker) newsTicker.style.display = 'none';
      if (paginationControls) paginationControls.innerHTML = '';

      const popularGamesSection = document.querySelector('.popular-games');
      if (popularGamesSection) popularGamesSection.style.display = '';
      const catalogTitle = document.getElementById('catalog-section-title');
      if (catalogTitle) catalogTitle.textContent = '📚 Centro de Guías GodZGames';

      const guideArticles = allArticles.filter(a => a.category === 'GUIAS' || a.type === 'guide');

      let gameGuidesCardsHtml = '';
      if (gameGuides.length > 0) {
        gameGuidesCardsHtml = `
          <div style="grid-column: 1/-1; margin-bottom: 35px;">
            <div class="guides-subheading">
              <span>📖 Guías por Juego Paso a Paso</span>
              <span class="line"></span>
            </div>
            <div class="games-grid">
              ${gameGuides.map(guide => {
                const publishedSecs = (guide.sections || []).filter(s => s.published);
                return `
                  <div class="game-card" style="display:flex; flex-direction:column; background:var(--color-bg-surface); border-radius:16px; overflow:hidden; border:1px solid rgba(255,255,255,0.08); box-shadow:var(--shadow-sm); transition:transform 0.2s;">
                    <div style="height:170px; overflow:hidden; position:relative; cursor:pointer;" onclick="window.navigateTo(event, '/guias/${guide.slug}/')">
                      <img src="${guide.cover}" alt="${guide.gameTitle}" onerror="this.src='/logo.png';" style="width:100%; height:100%; object-fit:cover;" />
                      <span class="trending-tag" style="position:absolute; top:10px; left:10px; margin:0; background:rgba(0,0,0,0.8); backdrop-filter:blur(4px); color:var(--color-secondary); font-weight:800;">📖 GUÍA COMPLETA</span>
                      <span style="position:absolute; bottom:10px; right:10px; background:var(--color-primary); color:#fff; font-size:0.75rem; font-weight:700; padding:2px 8px; border-radius:4px;">${guide.gameConsole}</span>
                    </div>
                    <div style="padding:18px; display:flex; flex-direction:column; flex:1;">
                      <h3 style="font-size:1.1rem; margin-bottom:8px; line-height:1.3; color:#fff; cursor:pointer;" onclick="window.navigateTo(event, '/guias/${guide.slug}/')">${guide.gameTitle}</h3>
                      <p style="font-size:0.85rem; color:#bbb; line-height:1.5; margin-bottom:12px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${guide.description || ''}</p>
                      <div class="guide-sections-pills">
                        ${publishedSecs.map(s => `<span class="guide-section-pill">${s.label}</span>`).join('')}
                      </div>
                      <a href="/guias/${guide.slug}/" class="hero-btn" style="text-align:center; font-size:0.85rem; padding:8px 12px; margin-top:auto;" onclick="window.navigateTo(event, '/guias/${guide.slug}/')">Ver Guía Completa →</a>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }

      let topArticlesCardsHtml = '';
      if (guideArticles.length > 0) {
        topArticlesCardsHtml = `
          <div style="grid-column: 1/-1;">
            <div class="guides-subheading">
              <span>🏆 Listas y Tops 5 de Videojuegos</span>
              <span class="line"></span>
            </div>
            <div class="games-grid">
              ${guideArticles.map(article => {
                const loc = getLocalizedNews(article);
                const articleUrl = getArticleUrl(article);
                const imgUrl = getCleanImageUrl(article.image);
                const dateStr = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
                return `
                  <div class="game-card" style="display:flex; flex-direction:column; background:var(--color-bg-surface); border-radius:16px; overflow:hidden; border:1px solid rgba(255,255,255,0.08); box-shadow:var(--shadow-sm); transition:transform 0.2s;">
                    <div style="height:170px; overflow:hidden; position:relative; cursor:pointer;" onclick="window.navigateTo(event, '${articleUrl}')">
                      <img src="${imgUrl}" alt="${loc.title}" onerror="if(!this.dataset.tried){this.dataset.tried='1';if(this.src.includes('raw.githubusercontent.com/godzgame/godzgames/main/public')){this.src=this.src.replace('https://raw.githubusercontent.com/godzgame/godzgames/main/public','');}else{this.src='/logo.png';}}" style="width:100%; height:100%; object-fit:cover;" />
                      <span class="trending-tag" style="position:absolute; top:10px; left:10px; margin:0; background:rgba(0,0,0,0.75); backdrop-filter:blur(4px); color:#ffe600;">📚 TOP 5</span>
                    </div>
                    <div style="padding:18px; display:flex; flex-direction:column; flex:1;">
                      <div style="font-size:0.78rem; color:var(--color-text-muted); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
                        <span>📅 ${dateStr}</span>
                      </div>
                      <h3 style="font-size:1rem; margin-bottom:10px; line-height:1.4; color:#fff; cursor:pointer;" onclick="window.navigateTo(event, '${articleUrl}')">${loc.title}</h3>
                      <p style="font-size:0.85rem; color:#bbb; line-height:1.5; margin-bottom:15px; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; flex:1;">${loc.description || ''}</p>
                      <a href="${articleUrl}" class="hero-btn" style="text-align:center; font-size:0.85rem; padding:8px 12px; margin-top:auto;" onclick="window.navigateTo(event, '${articleUrl}')">Ver Artículo →</a>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }

      if (!gameGuidesCardsHtml && !topArticlesCardsHtml) {
        gamesGrid.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px; color: var(--color-text-muted);">
            <h3>No hay guías publicadas en este momento</h3>
            <p>Pronto publicaremos nuevas guías de compra y listados recomendados.</p>
          </div>
        `;
      } else {
        gamesGrid.innerHTML = `${gameGuidesCardsHtml}${topArticlesCardsHtml}`;
      }
      return;
    }

    let filteredGames = currentCategory === 'ALL' 
      ? shuffledGames 
      : shuffledGames.filter(g => g.console === currentCategory);

    // Apply search filter if query is not empty
    if (searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase().trim();
      filteredGames = filteredGames.filter(g => 
        g.title.toLowerCase().includes(query) || 
        g.console.toLowerCase().includes(query)
      );
    }

    // Toggle news sections visibility depending on search query and category
    const newsTicker = document.querySelector('.news-flash');
    const shouldHideNews = (searchQuery.trim().length > 0) || (currentCategory !== 'ALL' && !newsForceVisible);

    if (shouldHideNews) {
      if (heroLayout) heroLayout.style.display = 'none';
      if (topGamesSection && searchQuery.trim().length > 0) topGamesSection.style.display = 'none';
      if (featuredGrid) featuredGrid.style.display = 'none';
      if (newsTicker) newsTicker.style.display = 'none';
      if (toggleNewsBtn && searchQuery.trim().length === 0) {
        toggleNewsBtn.style.display = 'inline-block';
        toggleNewsBtn.textContent = 'Mostrar Noticias';
      } else if (toggleNewsBtn) {
        toggleNewsBtn.style.display = 'none';
      }
    } else {
      if (heroLayout) heroLayout.style.display = 'grid';
      if (topGamesSection) topGamesSection.style.display = 'block';
      if (featuredGrid) featuredGrid.style.display = 'grid';
      if (newsTicker) newsTicker.style.display = 'flex';
      if (toggleNewsBtn) {
        if (currentCategory !== 'ALL' && newsForceVisible) {
          toggleNewsBtn.style.display = 'inline-block';
          toggleNewsBtn.textContent = 'Ocultar Noticias';
        } else {
          toggleNewsBtn.style.display = 'none';
        }
      }

      // Render Hero Main & Trending List (IMGAMER Style)
      if (aiNews.length > 0) {
        if (heroMainCard) {
          const mainLoc = getLocalizedNews(aiNews[0]);
          const mainArticleUrl = getArticleUrl(aiNews[0]);
          heroMainCard.innerHTML = `
            <img src="${aiNews[0].image || '/logo.png'}" alt="${mainLoc.title}" onerror="this.src='/logo.png'"/>
            <div class="hero-main-overlay">
              <span class="hero-badge">🔥 ${mainLoc.tag}</span>
              <h2 class="hero-title">${mainLoc.title}</h2>
              <p class="hero-excerpt">${mainLoc.description || ''}</p>
              <a href="${mainArticleUrl}" class="hero-btn" onclick="window.navigateTo(event, '${mainArticleUrl}')">Leer Artículo →</a>
            </div>
          `;
          heroMainCard.onclick = (e) => {
            if (!e.target.closest('.hero-btn')) {
              window.navigateTo(e, mainArticleUrl);
            }
          };
        }

        if (trendingList) {
          const trendingNews = aiNews.slice(1, 5);
          trendingList.innerHTML = trendingNews.map(item => {
            const loc = getLocalizedNews(item);
            const articleUrl = getArticleUrl(item);
            return `
              <a href="${articleUrl}" class="trending-item" data-id="${item.id}" onclick="window.navigateTo(event, '${articleUrl}')">
                <div class="trending-thumb">
                  <img src="${item.image || '/logo.png'}" alt="${loc.title}" onerror="this.src='/logo.png'"/>
                </div>
                <div class="trending-info">
                  <span class="trending-tag">${loc.tag}</span>
                  <h4 class="trending-item-title">${loc.title}</h4>
                </div>
              </a>
            `;
          }).join('');
        }
      }

      // Render Top Games of the Week (Rotated weekly over all games with confirmed real cover images)
      if (topGamesGrid && games.length > 0) {
        const validCoverGames = games.filter(g => 
          (g.customCover && g.customCover.startsWith('http')) || 
          (g.cover && g.cover.startsWith('http'))
        );
        
        // Calculate weekly seed rotation offset
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const weekNumber = Math.floor((now - startOfYear) / (7 * 24 * 3600 * 1000));
        const totalWeeks = now.getFullYear() * 52 + weekNumber;
        const offset = (totalWeeks * 6) % (validCoverGames.length || 1);

        let topGames = validCoverGames.slice(offset, offset + 6);
        if (topGames.length < 6 && validCoverGames.length >= 6) {
          topGames = topGames.concat(validCoverGames.slice(0, 6 - topGames.length));
        }

        if (topGames.length === 0) {
          if (topGamesSection) topGamesSection.style.display = 'none';
        } else {
          if (topGamesSection && searchQuery.trim().length === 0) topGamesSection.style.display = 'block';
          topGamesGrid.innerHTML = topGames.map(g => {
            const score = g.rating || '9.5';
            const cover = g.customCover || g.cover;
            return `
              <div class="top-game-card" data-id="${g.id}">
                <div class="top-game-thumb">
                  <img src="${cover}" alt="${g.title}" onerror="this.closest('.top-game-card')?.remove();"/>
                  <span class="top-game-score">⭐ ${score}</span>
                </div>
                <div class="top-game-info">
                  <div class="top-game-title">${g.title}</div>
                  <div class="top-game-console">${g.console || 'PC / Consolas'}</div>
                </div>
              </div>
            `;
          }).join('');

          topGamesGrid.querySelectorAll('.top-game-card').forEach(el => {
            el.addEventListener('click', () => {
              window.history.pushState(null, '', `?game=${el.dataset.id}`);
              window.dispatchEvent(new Event('popstate'));
            });
          });
        }
      }
    }

    // Render Popular / Rest of games
    const totalGames = filteredGames.length;
    const totalPages = Math.ceil(totalGames / gamesPerPage);

    // Bound currentPage
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;

    if (totalGames === 0) {
      gamesGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--color-text-muted); font-size: 1.2rem; font-family: var(--font-heading);">
          ${currentLang === 'es' ? 'No se encontraron videojuegos que coincidan con tu búsqueda.' : 'No video games found matching your search.'}
        </div>
      `;
      if (paginationControls) paginationControls.innerHTML = '';
    } else {
      const startIndex = (currentPage - 1) * gamesPerPage;
      const endIndex = startIndex + gamesPerPage;
      const gamesToShow = filteredGames.slice(startIndex, endIndex);
      
      gamesGrid.innerHTML = gamesToShow.map(g => createGameCard(g)).join('');
      renderPagination(totalPages);
    }
  };

  // Helper to render pagination controls
  const renderPagination = (totalPages) => {
    if (!paginationControls) return;
    if (totalPages <= 1) {
      paginationControls.innerHTML = '';
      return;
    }

    let html = '';

    // Previous Button
    const prevDisabled = currentPage === 1 ? 'disabled' : '';
    html += `<button class="pagination-btn prev-btn" ${prevDisabled} data-page="${currentPage - 1}">&laquo;</button>`;

    // Page range logic
    const range = [];
    const maxVisible = 2; // Show 2 pages on either side of currentPage

    let startPage = Math.max(1, currentPage - maxVisible);
    let endPage = Math.min(totalPages, currentPage + maxVisible);

    // Always include page 1
    if (startPage > 1) {
      range.push(1);
      if (startPage > 2) {
        range.push('...');
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      range.push(i);
    }

    // Always include last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        range.push('...');
      }
      range.push(totalPages);
    }

    range.forEach(item => {
      if (item === '...') {
        html += `<span class="pagination-ellipsis">...</span>`;
      } else {
        const activeClass = item === currentPage ? 'active' : '';
        html += `<button class="pagination-btn page-num-btn ${activeClass}" data-page="${item}">${item}</button>`;
      }
    });

    // Next Button
    const nextDisabled = currentPage === totalPages ? 'disabled' : '';
    html += `<button class="pagination-btn next-btn" ${nextDisabled} data-page="${currentPage + 1}">&raquo;</button>`;

    paginationControls.innerHTML = html;

    // Attach event listeners to buttons
    paginationControls.querySelectorAll('.pagination-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const page = parseInt(e.currentTarget.dataset.page);
        if (!isNaN(page) && page >= 1 && page <= totalPages) {
          currentPage = page;
          renderGames();
          
          // Scroll to the popular games section top smoothly
          const section = document.querySelector('.popular-games');
          if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      });
    });
  };

  // Returns static fallback data for a game — live AI generation has been
  // disabled to prevent unvalidated content from appearing in the browser.
  const fetchGameDetails = (gameTitle, gameConsole, gameId) => {
    return {
      genre: { en: 'N/A', es: 'N/A' },
      releaseDate: { en: 'N/A', es: 'N/A' },
      publisher: { en: 'N/A', es: 'N/A' },
      developer: { en: 'N/A', es: 'N/A' },
      size: { en: 'N/A', es: 'N/A' },
      description: { en: '', es: '' }
    };
  };

  // Render Game Details View
  const renderGamePage = (game) => {
    homeView.style.display = 'none';
    gameView.style.display = 'block';
    
    // Set loading skeletons
    const t = translations[currentLang];
    const coverUrl = game.cover ? game.cover : `https://tse2.mm.bing.net/th?q=${encodeURIComponent(game.title + ' ' + game.console + ' official retail cover front')}&w=400`;
    


    gameView.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
        <button class="back-btn" onclick="if (document.referrer && window.history.length > 1) { window.history.back(); } else { window.navigateTo(event, '/'); }">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          <span>${t.backToHome || '← Regresar'}</span>
        </button>
        <div class="breadcrumb" style="margin-bottom:0;">
          <a href="/" onclick="window.navigateTo(event, '/')">Home</a> &gt; <span>${game.console}</span> &gt; <span style="color:#fff;">${game.title}</span>
        </div>
      </div>
      <div class="game-detail-wrap">
        <div class="game-sidebar">
          <div class="game-cover-box">
            <img src="${coverUrl}" alt="${game.title}" />
          </div>
          <table class="game-meta-table">
            <tr><td>Console:</td><td>${game.console}</td></tr>
            <tr><td>${t.genre}:</td><td class="skeleton skeleton-text" style="width: 80px;"></td></tr>
            <tr><td>${t.releaseDate}:</td><td class="skeleton skeleton-text" style="width: 50px;"></td></tr>
            <tr><td>${t.developer}:</td><td class="skeleton skeleton-text" style="width: 70px;"></td></tr>
            <tr><td>${t.publisher}:</td><td class="skeleton skeleton-text" style="width: 70px;"></td></tr>
          </table>
        </div>
        <div class="game-main-content">
          <div class="game-title-wrap">
            <span class="game-badge">${game.console}</span>
            <h1 class="game-title-main">${game.title}</h1>
          </div>
          <div class="game-synopsis">
            <h3>${t.synopsis}</h3>
            <div class="skeleton-wrapper">
              <div class="skeleton skeleton-text" style="width:100%;"></div>
              <div class="skeleton skeleton-text" style="width:95%;"></div>
              <div class="skeleton skeleton-text" style="width:90%;"></div>
            </div>
          </div>
          <!-- Screenshots section rendered after data loads if customScreens exist -->
          <div class="game-screenshots" id="game-screenshots-section" style="display:none;"></div>



          <!-- Comments Section -->
          <div class="game-comments-section" style="margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--border-color);">
            <h3 style="margin-bottom: 20px;">${currentLang === 'es' ? 'Comentarios' : 'Comments'}</h3>
            <div id="disqus_thread"></div>
          </div>
        </div>
      </div>
    `;

    // Initialize or reset Disqus for the current game
    const disqus_shortname = 'godzgames'; // The user MUST use this shortname!
    const pageUrl = window.location.href;
    const pageIdentifier = game.id;

    if (window.DISQUS) {
      window.DISQUS.reset({
        reload: true,
        config: function () {  
          this.page.identifier = pageIdentifier;  
          this.page.url = pageUrl;
        }
      });
    } else {
      window.disqus_config = function () {
        this.page.url = pageUrl;
        this.page.identifier = pageIdentifier;
      };
      const d = document, s = d.createElement('script');
      s.src = `https://${disqus_shortname}.disqus.com/embed.js`;
      s.setAttribute('data-timestamp', +new Date());
      (d.head || d.body).appendChild(s);
    }
    // Fetch static fallback details (live AI generation disabled)
    const details = fetchGameDetails(game.title, game.console, game.id);
    
    // Extract localized values safely
    const getField = (fieldVal) => {
      if (!fieldVal) return 'N/A';
      if (typeof fieldVal === 'object') {
        return fieldVal[currentLang] || fieldVal['en'] || fieldVal['es'] || 'N/A';
      }
      return fieldVal;
    };

    const genre = getField(game.genre || details.genre);
    const releaseDate = getField(game.releaseDate || details.releaseDate);
    const developer = getField(game.developer || details.developer);
    const publisher = getField(game.publisher || details.publisher);
    const size = getField(game.size || details.size);
    let description = getField(game.description || details.description);

    if (game.sinopsis && game.sinopsis.trim() !== '') {
      description = game.sinopsis;
    }

    // Apply custom overrides if defined globally in game or locally in details
    const finalCoverUrl = game.customCover || details.customCover || coverUrl;
    const finalScreenUrl1 = (game.customScreens && game.customScreens[0]) || (details.customScreens && details.customScreens[0]) || null;
    const finalScreenUrl2 = (game.customScreens && game.customScreens[1]) || (details.customScreens && details.customScreens[1]) || null;


    // Inject retrieved details into page and remove skeletons
    const sidebar = gameView.querySelector('.game-sidebar');
    const synopsisContainer = gameView.querySelector('.game-synopsis');
    
    sidebar.innerHTML = `
      <div class="game-cover-box">
        <img src="${finalCoverUrl}" alt="${game.title}" />
      </div>
      <table class="game-meta-table">
        <tr><td>Console:</td><td>${game.console}</td></tr>
        <tr><td>${t.genre}:</td><td>${genre}</td></tr>
        <tr><td>${t.releaseDate}:</td><td>${releaseDate}</td></tr>
        <tr><td>${t.developer}:</td><td>${developer}</td></tr>
        <tr><td>${t.publisher}:</td><td>${publisher}</td></tr>
      </table>
    `;


    synopsisContainer.innerHTML = `
      <h3>${t.synopsis}</h3>
      <p>${description}</p>
    `;

    
    // Render screenshots only if real URLs exist (no AI-generated images)
    const screensSection = gameView.querySelector('#game-screenshots-section');
    if (screensSection && (finalScreenUrl1 || finalScreenUrl2)) {
      screensSection.style.display = '';
      screensSection.innerHTML = `
        <h3>${t.screenshots}</h3>
        <div class="screenshots-grid">
          ${finalScreenUrl1 ? `<div class="screenshot-item"><img src="${finalScreenUrl1}" alt="${game.title} Screenshot 1" /></div>` : ''}
          ${finalScreenUrl2 ? `<div class="screenshot-item"><img src="${finalScreenUrl2}" alt="${game.title} Screenshot 2" /></div>` : ''}
        </div>
      `;
    }


  };

  // Reset state to show home view and reset category to ALL
  const goToHome = (e) => {
    if (e) e.preventDefault();
    currentCategory = 'ALL';
    currentPage = 1;
    searchQuery = '';
    if (headerSearchInput) headerSearchInput.value = '';
    if (headerSearchClear) headerSearchClear.style.display = 'none';

    document.querySelectorAll('.nav-item').forEach(nav => {
      if (nav.dataset.cat === 'ALL') {
        nav.classList.add('active');
      } else {
        nav.classList.remove('active');
      }
    });

    const newsView = document.getElementById('news-view');
    if (newsView) newsView.style.display = 'none';
    if (gameView) gameView.style.display = 'none';
    if (adminView) adminView.style.display = 'none';
    if (homeView) homeView.style.display = 'block';

    window.history.pushState(null, '', '/');
    renderGames();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  let activeEditingGame = null;

  const showAdminLogin = () => {
    adminLoginForm.style.display = 'block';
    adminDashboard.style.display = 'none';
    adminEditor.style.display = 'none';
    adminPasswordInput.value = '';
    adminLoginError.style.display = 'none';
  };

  // In static mode, game edit status comes from localStorage
  const fetchGamesStatus = () => {
    // nothing to fetch — status is inferred from localStorage keys
  };

  const showAdminDashboard = async () => {
    adminLoginForm.style.display = 'none';
    adminDashboard.style.display = 'block';
    adminEditor.style.display = 'none';
    
    // Reset selection states
    adminSelectedConsole = '';
    adminSelectedLetter = 'ALL';
    
    const consoleSelectView = document.getElementById('admin-console-select-view');
    const gamesListView = document.getElementById('admin-games-list-view');
    
    if (consoleSelectView) consoleSelectView.style.display = 'block';
    if (gamesListView) gamesListView.style.display = 'none';
    
    // Reset tabs to Games Manager
    ['tab-btn-games', 'tab-btn-calendar', 'tab-btn-affiliates'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.classList.remove('active');
        btn.className = id === 'tab-btn-games' ? 'admin-btn active' : 'admin-btn-secondary';
      }
    });
    ['admin-tab-games', 'admin-tab-calendar', 'admin-tab-affiliates'].forEach(id => {
      const v = document.getElementById(id);
      if (v) v.style.display = id === 'admin-tab-games' ? 'block' : 'none';
    });
    
    await fetchGamesStatus();
    renderAdminConsoleGrid();
  };

  const renderAdminConsoleGrid = () => {
    const grid = document.getElementById('admin-console-grid');
    if (!grid) return;
    
    const sortedConsoles = [...consoles].sort();
    
    grid.innerHTML = sortedConsoles.map(c => {
      const count = games.filter(g => g.console === c).length;
      return `
        <button class="admin-btn" style="width: 100%; text-align: center; display: flex; flex-direction: column; gap: 5px; padding: 15px 10px; font-family: var(--font-heading);" data-console="${c}">
          <span style="font-size: 1.2rem; font-weight: 800; color: var(--color-secondary);">${c}</span>
          <span style="font-size: 0.8rem; color: var(--color-text-muted); font-weight: normal;">${count} juegos</span>
        </button>
      `;
    }).join('');
    
    grid.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const consoleName = e.currentTarget.dataset.console;
        selectAdminConsole(consoleName);
      });
    });
  };

  const selectAdminConsole = (consoleName) => {
    adminSelectedConsole = consoleName;
    adminSelectedLetter = 'ALL';
    
    const consoleSelectView = document.getElementById('admin-console-select-view');
    const gamesListView = document.getElementById('admin-games-list-view');
    const label = document.getElementById('admin-selected-console-label');
    
    if (consoleSelectView) consoleSelectView.style.display = 'none';
    if (gamesListView) gamesListView.style.display = 'block';
    if (label) label.textContent = consoleName;
    
    if (adminSearchInput) adminSearchInput.value = '';
    
    renderAdminAlphabetBar();
    renderAdminGamesList('');
  };

  const renderAdminAlphabetBar = () => {
    const bar = document.getElementById('admin-alphabet-bar');
    if (!bar) return;
    
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    let html = `<button class="pagination-btn ${adminSelectedLetter === 'ALL' ? 'active' : ''}" style="padding: 4px 10px; font-size: 0.8rem;" data-letter="ALL">${currentLang === 'es' ? 'Todos' : 'All'}</button>`;
    html += `<button class="pagination-btn ${adminSelectedLetter === '#' ? 'active' : ''}" style="padding: 4px 10px; font-size: 0.8rem;" data-letter="#">#</button>`;
    
    alphabet.forEach(letter => {
      const activeClass = adminSelectedLetter === letter ? 'active' : '';
      html += `<button class="pagination-btn ${activeClass}" style="padding: 4px 10px; font-size: 0.8rem;" data-letter="${letter}">${letter}</button>`;
    });
    
    bar.innerHTML = html;
    
    bar.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        adminSelectedLetter = e.currentTarget.dataset.letter;
        bar.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        renderAdminGamesList(adminSearchInput ? adminSearchInput.value : '');
      });
    });
  };

  // Static admin: verify token locally against a hashed password stored in the build
  // Admin password is hardcoded here — change it before deploying!
  const ADMIN_PASSWORD_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'; // sha256 of 'admin123'

  const hashString = async (str) => {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const renderAdminPage = async () => {
    const token = localStorage.getItem('godzgames-admin-token');
    if (token === ADMIN_PASSWORD_HASH) {
      await showAdminDashboard();
    } else {
      localStorage.removeItem('godzgames-admin-token');
      showAdminLogin();
    }
  };

  const renderAdminGamesList = (filterText) => {
    if (!adminSelectedConsole) return;

    const query = filterText.toLowerCase().trim();
    
    // 1. Filter games by selected console
    let filtered = games.filter(g => g.console === adminSelectedConsole);
    
    // 2. Filter by alphabetical letter
    if (adminSelectedLetter !== 'ALL') {
      if (adminSelectedLetter === '#') {
        filtered = filtered.filter(g => {
          const firstChar = (g.title || '').trim().charAt(0);
          return /[^a-zA-Z]/.test(firstChar);
        });
      } else {
        const letter = adminSelectedLetter.toLowerCase();
        filtered = filtered.filter(g => (g.title || '').trim().toLowerCase().startsWith(letter));
      }
    }

    // 3. Filter by search input
    if (query) {
      filtered = filtered.filter(g => 
        g.title.toLowerCase().includes(query)
      );
    }
    
    // Slice to 250 to ensure page doesn't lag if there are too many matching elements
    const listToShow = filtered.slice(0, 250);
    
    if (listToShow.length === 0) {
      adminGamesTbody.innerHTML = `
        <tr>
          <td colspan="3" style="text-align: center; color: var(--color-text-muted); padding: 20px;">
            ${currentLang === 'es' ? 'No se encontraron juegos' : 'No games found'}
          </td>
        </tr>
      `;
      return;
    }

    adminGamesTbody.innerHTML = listToShow.map(game => {
      const hasLocalEdit = !!localStorage.getItem(`game-details-${game.id}`);
      let badgeHtml = '';
      if (hasLocalEdit) {
        badgeHtml = `<span class="status-badge status-manual">Local</span>`;
      }

      return `
        <tr>
          <td>
            <span style="font-weight: 600; color: #fff;">${game.title}</span>
            ${badgeHtml}
          </td>
          <td><span class="game-badge" style="margin: 0; font-size: 0.75rem;">${game.console}</span></td>
          <td style="text-align: center;">
            <button class="admin-btn-edit" data-id="${game.id}">Editar</button>
          </td>
        </tr>
      `;
    }).join('');

    adminGamesTbody.querySelectorAll('.admin-btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const gameId = btn.dataset.id;
        const game = games.find(g => g.id === gameId);
        if (game) {
          openAdminEditor(game);
        }
      });
    });
  };

  const openAdminEditor = async (game) => {
    activeEditingGame = game;
    adminEditorTitle.textContent = `${currentLang === 'es' ? 'Editar Detalles - ' : 'Edit Details - '} ${game.title}`;
    
    adminEditStatus.style.display = 'none';
    adminEditStatus.className = 'admin-status-message';
    
    const safeSetVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };
    const safeGetVal = (id, defaultVal = '') => {
      const el = document.getElementById(id);
      return el ? el.value.trim() : defaultVal;
    };

    const details = await fetchGameDetails(game.title, game.console, game.id);
    
    safeSetVal('admin-edit-cover', details.customCover || '');
    safeSetVal('admin-edit-screen1', (details.customScreens && details.customScreens[0]) || '');
    safeSetVal('admin-edit-screen2', (details.customScreens && details.customScreens[1]) || '');
    
    const getVal = (obj, langKey) => {
      if (!obj) return '';
      if (typeof obj === 'object') return obj[langKey] || obj['en'] || obj['es'] || '';
      return obj;
    };
    
    safeSetVal('admin-edit-genre-en', getVal(details.genre, 'en'));
    safeSetVal('admin-edit-genre-es', getVal(details.genre, 'es'));
    safeSetVal('admin-edit-size-en', getVal(details.size, 'en'));
    safeSetVal('admin-edit-size-es', getVal(details.size, 'es'));
    safeSetVal('admin-edit-dev-en', getVal(details.developer, 'en'));
    safeSetVal('admin-edit-dev-es', getVal(details.developer, 'es'));
    safeSetVal('admin-edit-pub-en', getVal(details.publisher, 'en'));
    safeSetVal('admin-edit-pub-es', getVal(details.publisher, 'es'));
    safeSetVal('admin-edit-date-en', getVal(details.releaseDate, 'en'));
    safeSetVal('admin-edit-date-es', getVal(details.releaseDate, 'es'));
    
    safeSetVal('admin-edit-desc-en', getVal(details.description, 'en'));
    safeSetVal('admin-edit-desc-es', getVal(details.description, 'es'));
    
    safeSetVal('admin-edit-tiktok-feature', details.tiktokFeature || '');
    safeSetVal('admin-edit-tiktok-script', details.tiktokScript || '');
    


    // Show existing image previews
    [
      { urlId: 'admin-edit-cover',   previewId: 'preview-cover' },
      { urlId: 'admin-edit-screen1', previewId: 'preview-screen1' },
      { urlId: 'admin-edit-screen2', previewId: 'preview-screen2' }
    ].forEach(({ urlId, previewId }) => {
      const url = document.getElementById(urlId)?.value?.trim();
      const previewWrap = document.getElementById(previewId);
      if (previewWrap) {
        previewWrap.innerHTML = url
          ? `<img src="${url}" alt="Preview" onerror="this.style.display='none'" />`
          : '';
      }
    });
    
    if (adminDashboard) adminDashboard.style.display = 'none';
    if (adminEditor) adminEditor.style.display = 'block';
  };

  // Save admin game edits directly to localStorage or GitHub
  const saveAdminGameEdits = async () => {
    if (!activeEditingGame) return;

    const safeGetVal = (id, defaultVal = '') => {
      const el = document.getElementById(id);
      return el ? el.value.trim() : defaultVal;
    };

    const customCover = safeGetVal('admin-edit-cover');
    const customScreens = [
      safeGetVal('admin-edit-screen1'),
      safeGetVal('admin-edit-screen2')
    ].filter(url => url.length > 0);



    const savedData = {
      genre: {
        en: safeGetVal('admin-edit-genre-en'),
        es: safeGetVal('admin-edit-genre-es')
      },
      size: {
        en: safeGetVal('admin-edit-size-en'),
        es: safeGetVal('admin-edit-size-es')
      },
      developer: {
        en: safeGetVal('admin-edit-dev-en'),
        es: safeGetVal('admin-edit-dev-es')
      },
      publisher: {
        en: safeGetVal('admin-edit-pub-en'),
        es: safeGetVal('admin-edit-pub-es')
      },
      releaseDate: {
        en: safeGetVal('admin-edit-date-en'),
        es: safeGetVal('admin-edit-date-es')
      },
      description: {
        en: safeGetVal('admin-edit-desc-en'),
        es: safeGetVal('admin-edit-desc-es')
      },
      tiktokFeature: safeGetVal('admin-edit-tiktok-feature'),
      tiktokScript: safeGetVal('admin-edit-tiktok-script'),
      customCover: customCover || undefined,
      customScreens: customScreens.length > 0 ? customScreens : undefined
    };

    // 1. Save to LocalStorage as fallback/cache
    const cacheKey = `gamedb_v2_${activeEditingGame.title}_${activeEditingGame.console}`;
    localStorage.setItem(cacheKey, JSON.stringify(savedData));

    // 2. Try to save to GitHub globally
    const tokenInput = document.getElementById('admin-github-token-input');
    const githubToken = (tokenInput && tokenInput.value.trim()) ? tokenInput.value.trim() : localStorage.getItem('godzgames-github-token') || '';
    
    if (githubToken) {
      adminEditStatus.textContent = currentLang === 'es' ? 'Guardando en GitHub...' : 'Saving to GitHub...';
      adminEditStatus.className = 'admin-status-message';
      adminEditStatus.style.display = 'block';
      
      try {
        // Update the active game in the games array
        const gameIndex = games.findIndex(g => g.id === activeEditingGame.id);
        if (gameIndex !== -1) {
          games[gameIndex] = { ...games[gameIndex], ...savedData };
        }

        const repoUrl = 'https://api.github.com/repos/godzgame/godzgames/contents/src/data/games.json';
        
        // 1. Get current file sha
        const getRes = await fetch(repoUrl);
        const getJson = await getRes.json();
        const fileSha = getJson.sha;

        // 2. Upload new content
        const newContent = JSON.stringify({ consoles, games }, null, 2);
        // Encode to base64 safely (utf-8 compatible)
        const base64Content = btoa(unescape(encodeURIComponent(newContent)));

        const putRes = await fetch(repoUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: `Admin: Update game details for ${activeEditingGame.title}`,
            content: base64Content,
            sha: fileSha
          })
        });

        if (!putRes.ok) {
          const errJson2 = await putRes.json().catch(() => ({}));
          const ghMsg2 = errJson2.message || '';
          let friendlyMsg2 = '';
          if (putRes.status === 401) {
            friendlyMsg2 = 'Token inválido o expirado. Genera uno nuevo en github.com/settings/tokens.';
          } else if (putRes.status === 403 || ghMsg2.toLowerCase().includes('resource not accessible')) {
            friendlyMsg2 = 'Sin permisos de escritura. Crea un token CLÁSICO con scope ✅ "repo" en github.com/settings/tokens/new.';
          } else if (putRes.status === 409) {
            friendlyMsg2 = 'Conflicto de versión. Recarga la página e intenta de nuevo.';
          } else {
            friendlyMsg2 = `Error GitHub ${putRes.status}: ${ghMsg2 || 'Error desconocido'}`;
          }
          throw new Error(friendlyMsg2);
        }

        adminEditStatus.textContent = currentLang === 'es' ? 'Cambios guardados globalmente en GitHub!' : 'Changes saved globally to GitHub!';
        adminEditStatus.className = 'admin-status-message success';
      } catch (e) {
        console.error(e);
        adminEditStatus.textContent = currentLang === 'es' ? 'Error al guardar en GitHub (Revisa tu Token)' : 'Error saving to GitHub (Check Token)';
        adminEditStatus.className = 'admin-status-message error';
        setTimeout(() => adminEditStatus.style.display = 'none', 3000);
        return;
      }
    } else {
      adminEditStatus.textContent = currentLang === 'es' ? 'Guardado LOCAL (Falta GitHub Token para global)' : 'Saved LOCALLY (Missing GitHub Token)';
      adminEditStatus.className = 'admin-status-message success';
    }

    adminEditStatus.style.display = 'block';
    setTimeout(() => showAdminDashboard(), 2000);
  };

  // Static admin login: hash password client-side and compare
  const handleAdminLogin = async () => {
    const adminPasswordInput = document.getElementById('admin-password-input');
    const githubTokenInput = document.getElementById('admin-github-token-input');
    const groqKeyInput = document.getElementById('admin-groq-key-input');
    
    const password = adminPasswordInput.value.trim();
    if (!password) {
      adminLoginError.textContent = currentLang === 'es' ? 'Por favor ingrese la contrasena' : 'Please enter the password';
      adminLoginError.style.display = 'block';
      return;
    }

    const hash = await hashString(password);
    if (hash === ADMIN_PASSWORD_HASH) {
      localStorage.setItem('godzgames-admin-token', hash);
      if (githubTokenInput && githubTokenInput.value.trim()) {
        localStorage.setItem('godzgames-github-token', githubTokenInput.value.trim());
      }
      if (groqKeyInput && groqKeyInput.value.trim()) {
        localStorage.setItem('godzgames-groq-key', groqKeyInput.value.trim());
      }
      showAdminDashboard();
    } else {
      adminLoginError.textContent = currentLang === 'es' ? 'Contrasena incorrecta' : 'Incorrect password';
      adminLoginError.style.display = 'block';
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('godzgames-admin-token');
    showAdminLogin();
  };


  const showHomePage = () => {
    const guideViewEl = document.getElementById('guide-view');
    if (guideViewEl) guideViewEl.style.display = 'none';
    const newsView = document.getElementById('news-view');
    if (newsView) newsView.style.display = 'none';
    gameView.style.display = 'none';
    homeView.style.display = 'block';
    adminView.style.display = 'none';
  };

  // Basic client-side router
  const handleRouting = () => {
    const pathname = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('game');
    const articleIdParam = urlParams.get('article');
    const initialArticleId = window.INITIAL_ARTICLE_ID;
    const hash = window.location.hash;

    // Backward compatibility for old hash links
    if (hash.startsWith('#/game/')) {
      const oldGameId = hash.replace('#/game/', '');
      window.location.replace(`/?game=${oldGameId}`);
      return;
    }

    // Match static article URL or params
    let matchedArticle = null;
    let matchedOffer = null;

    if (pathname.includes('/ofertas/')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        const slug = parts[1];
        matchedOffer = savedAffiliates.find(a => slugify(a.title || '') === slug);
      }
    }

    if (!matchedOffer && window.INITIAL_OFFER_ID) {
      matchedOffer = savedAffiliates.find(a => (a.productId || a.id) === window.INITIAL_OFFER_ID);
    }

    if (matchedOffer) {
      renderOfertaPage(matchedOffer);
      return;
    }

    if (pathname === '/noticias/' || pathname === '/noticias') {
      currentCategory = 'NOTICIAS';
      renderNav();
    } else if (pathname === '/analisis/' || pathname === '/analisis') {
      currentCategory = 'ANALISIS';
      renderNav();
    } else if (pathname === '/guias/' || pathname === '/guias') {
      currentCategory = 'GUIAS';
      renderNav();
    } else if (pathname === '/ofertas/' || pathname === '/ofertas') {
      currentCategory = 'OFERTAS';
      renderNav();
    } else if (pathname === '/hardware/' || pathname === '/hardware') {
      currentCategory = 'HARDWARE';
      renderNav();
    }

    if (window.INITIAL_GUIDE && window.INITIAL_GUIDE.slug) {
      const guide = gameGuides.find(g => g.slug === window.INITIAL_GUIDE.slug);
      if (guide) {
        renderGameGuidePage(guide, window.INITIAL_GUIDE.sectionId);
        return;
      }
    }

    if (pathname.includes('/guias/')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        const potentialGuideSlug = parts[1];
        const matchedGuide = gameGuides.find(g => g.slug === potentialGuideSlug);
        if (matchedGuide) {
          const sectionId = parts[2] || null;
          renderGameGuidePage(matchedGuide, sectionId);
          return;
        }
      }
    }

    if (pathname.includes('/noticias/') || pathname.includes('/analisis/') || pathname.includes('/guias/')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        const slug = parts[1];
        matchedArticle = allArticles.find(n => (n.slug || slugify(n.es?.title || n.en?.title || n.title || '')) === slug);
      }
    }

    if (!matchedArticle && (articleIdParam || initialArticleId)) {
      const targetId = articleIdParam || initialArticleId;
      matchedArticle = allArticles.find(n => n.id === targetId || n.slug === targetId);
    }

    if (matchedArticle) {
      const articleUrl = getArticleUrl(matchedArticle);
      if (typeof window.setCanonical === 'function') window.setCanonical(`https://godzgames.com${articleUrl}`);
      renderNewsArticlePage(matchedArticle);
    } else if (gameId) {
      const newsView = document.getElementById('news-view');
      if (newsView) newsView.style.display = 'none';
      adminView.style.display = 'none';
      homeView.style.display = 'none';
      gameView.style.display = 'block';
      const game = games.find(g => g.id === gameId);
      if (game) {
        if (typeof window.setCanonical === 'function') window.setCanonical(`https://godzgames.com/?game=${gameId}`);
        renderGamePage(game);
      } else {
        window.history.pushState(null, '', '/');
        window.dispatchEvent(new Event('popstate'));
      }
    } else if (hash === '#/admin' || hash === '#admin') {
      const newsView = document.getElementById('news-view');
      if (newsView) newsView.style.display = 'none';
      homeView.style.display = 'none';
      gameView.style.display = 'none';
      adminView.style.display = 'block';
      renderAdminPage();
    } else {
      const newsView = document.getElementById('news-view');
      if (newsView) newsView.style.display = 'none';
      if (typeof window.setCanonical === 'function') window.setCanonical('https://godzgames.com/');
      adminView.style.display = 'none';
      // FIX 3: Handle ?search= URL param (from CTA-COMPRA buttons in guides)
      const searchParam = urlParams.get('search');
      if (searchParam && searchParam.trim().length > 0) {
        searchQuery = searchParam.trim();
        if (headerSearchInput) headerSearchInput.value = searchQuery;
        if (headerSearchClear) headerSearchClear.style.display = 'flex';
        currentCategory = 'ALL';
        renderNav();
        showHomePage();
        renderGames();
        // Scroll to content (games grid) showing filtered results
        setTimeout(() => {
          const navEl = document.querySelector('.main-nav');
          const targetY = navEl ? navEl.getBoundingClientRect().bottom + window.scrollY : 0;
          window.scrollTo({ top: targetY, behavior: 'smooth' });
        }, 100);
      } else {
        showHomePage();
        renderGames();
      }
    }
  };

  window.addEventListener('popstate', handleRouting);
  window.addEventListener('hashchange', handleRouting);

  // Translate all DOM elements and re-render
  const updateLanguage = (lang) => {
    currentLang = lang;
    localStorage.setItem('godzgames-lang', lang);
    
    // Format current date in the correct locale if element exists
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const locale = lang === 'es' ? 'es-ES' : 'en-US';
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString(locale, dateOptions);
    }

    // Update static HTML elements with translation attributes
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (translations[lang] && translations[lang][key]) {
        el.innerHTML = translations[lang][key];
      }
    });

    // Update search input placeholder
    if (headerSearchInput && translations[lang] && translations[lang].searchPlaceholder) {
      headerSearchInput.placeholder = translations[lang].searchPlaceholder;
    }

    // Toggle active state on language switcher buttons
    const btnEn = document.getElementById('lang-en');
    const btnEs = document.getElementById('lang-es');
    if (btnEn) btnEn.classList.toggle('active', lang === 'en');
    if (btnEs) btnEs.classList.toggle('active', lang === 'es');

    // Always re-render nav and ticker
    renderNav();
    renderTicker();

    // If currently viewing a guide section, re-render with the new language
    const guideViewEl = document.getElementById('guide-view');
    if (guideViewEl && guideViewEl.style.display !== 'none') {
      const pathname = window.location.pathname;
      if (pathname.includes('/guias/')) {
        const parts = pathname.split('/').filter(Boolean);
        if (parts.length >= 2) {
          const guideSlug = parts[1];
          const matchedGuide = gameGuides.find(g => g.slug === guideSlug);
          if (matchedGuide) {
            let sectionId = parts[2] || null;
            // Swap language suffix: -en ↔ -es
            if (sectionId) {
              const newSectionId = sectionId.replace(/-en$/, `-${lang}`).replace(/-es$/, `-${lang}`);
              const targetSection = (matchedGuide.sections || []).find(s => s.id === newSectionId && s.published);
              sectionId = targetSection ? newSectionId : sectionId;
              if (targetSection && newSectionId !== sectionId) {
                window.history.replaceState(null, '', `/guias/${guideSlug}/${newSectionId}/`);
              }
            }
            renderGameGuidePage(matchedGuide, sectionId);
            return;
          }
        }
      }
    }

    const hash = window.location.hash;
    if (hash.startsWith('#/game/')) {
      const gameId = hash.replace('#/game/', '');
      const game = games.find(g => g.id === gameId);
      if (game) {
        renderGamePage(game);
      }
    } else if (hash === '#/admin' || hash === '#admin') {
      renderAdminPage();
    } else {
      renderGames();
    }
  };

  const safeFetchJSON = async (url) => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const text = await res.text();
      const trimmed = text.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        return JSON.parse(trimmed);
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const loadSavedAffiliates = async () => {
    const tbody = document.getElementById('admin-saved-affiliates-tbody');
    if (!tbody) return;
    
    try {
      let data = await safeFetchJSON('https://raw.githubusercontent.com/godzgame/godzgames/main/src/data/affiliates.json?t=' + Date.now());
      if (!Array.isArray(data) || data.length === 0) {
        data = await safeFetchJSON('/src/data/affiliates.json?t=' + Date.now());
      }
      
      if (!Array.isArray(data) || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No hay enlaces guardados.</td></tr>';
        return;
      }
      
      tbody.innerHTML = [...data].reverse().map(item => `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:10px;">
              ${item.thumbnail ? `<img src="${item.thumbnail}" width="40" height="40" style="object-fit:cover; border-radius:4px;"/>` : ''}
              <div>
                <strong>${item.title}</strong><br>
                <small style="color:var(--color-text-muted);">$${item.price}</small>
              </div>
            </div>
          </td>
          <td><a href="${item.link}" target="_blank" style="color:var(--color-primary); text-decoration:underline;">Ver Enlace</a></td>
          <td>${item.savedAt ? new Date(item.savedAt).toLocaleDateString() : 'N/A'}</td>
        </tr>
      `).join('');
    } catch (err) {
      console.error(err);
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:red;">Error al cargar historial.</td></tr>';
    }
  };

  const setupAffiliatesTab = () => {
    const btn = document.getElementById('admin-generate-affiliates-btn');
    if (!btn) return;
    
    const loadSuggestions = async () => {
      const statusEl = document.getElementById('admin-affiliates-status');
      const gridEl = document.getElementById('admin-affiliates-grid');
      
      statusEl.className = 'admin-status-message';
      statusEl.textContent = '⏳ Cargando sugerencias del día...';
      statusEl.style.display = 'block';
      gridEl.innerHTML = '';
      
      try {
        let generalData = await safeFetchJSON('/src/data/affiliate-suggestions.json?t=' + Date.now()).catch(() => []);
        if (!Array.isArray(generalData) || generalData.length === 0) generalData = fallbackAffiliateSuggestions || [];

        let hardwareData = await safeFetchJSON('/src/data/hardware-suggestions.json?t=' + Date.now()).catch(() => []);
        if (!Array.isArray(hardwareData) || hardwareData.length === 0) hardwareData = fallbackHardwareSuggestions || [];

        let data = [...generalData, ...hardwareData];
        
        if (!Array.isArray(data) || data.length === 0) {
          statusEl.className = 'admin-status-message error';
          statusEl.textContent = 'No hay sugerencias disponibles. Se actualizarán en la próxima ejecución del workflow.';
          return;
        }
        
        statusEl.className = 'admin-status-message success';
        statusEl.textContent = `✅ ¡${data.length} sugerencias cargadas (${generalData.length} generales + ${hardwareData.length} hardware)!`;
        
        gridEl.innerHTML = data.map(item => `
          <div class="admin-card" style="display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; gap:10px; align-items:flex-start;">
              ${item.thumbnail ? `<img src="${item.thumbnail}" width="60" height="60" style="object-fit:cover; border-radius:4px;"/>` : ''}
              <div>
                <span style="font-size:0.7rem; font-weight:bold; padding:2px 6px; border-radius:4px; background:${item.keyword?.includes('control') || item.keyword?.includes('gamer') || item.keyword?.includes('teclado') || item.keyword?.includes('webcam') ? 'var(--color-primary)' : 'var(--color-secondary)'}; color:#000; margin-bottom:4px; display:inline-block;">
                  ${item.keyword?.includes('control') || item.keyword?.includes('gamer') || item.keyword?.includes('teclado') || item.keyword?.includes('webcam') ? '🕹️ HARDWARE' : '🛒 GENERAL'}
                </span>
                <h4 style="margin:0; font-size:1rem;">${item.title}</h4>
                <div style="color:var(--color-primary); font-weight:bold;">$${item.price} MXN</div>
                <div style="font-size:0.75rem; color:#aaa; margin-top:2px; line-height:1.2;">Precio al generar sugerencia — verifica actual en Mercado Libre.</div>
              </div>
            </div>
            
            <div style="background:rgba(0,0,0,0.2); padding:10px; border-radius:4px; font-size:0.9rem; font-style:italic;">
              "${item.generatedText}"
            </div>
            
            <a href="${item.permalink}" target="_blank" class="admin-btn-secondary" style="text-align:center; text-decoration:none;">🛍️ Abrir en Mercado Libre</a>
            
            <div style="margin-top:auto; display:flex; gap:5px;">
              <input type="text" id="affiliate-link-${item.id}" placeholder="Pega tu link de afiliado aquí..." style="flex:1; padding:8px; border-radius:4px; border:1px solid var(--border-color); background:rgba(0,0,0,0.2); color:#fff;" />
              <button class="admin-btn save-affiliate-btn" data-id="${item.id}">Guardar</button>
            </div>
          </div>
        `).join('');
        
        // Add save listeners (commits directly to GitHub API using personal access token)
        document.querySelectorAll('.save-affiliate-btn').forEach(saveBtn => {
          saveBtn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            const linkInput = document.getElementById(`affiliate-link-${id}`);
            const link = linkInput ? linkInput.value.trim() : '';
            if (!link) return alert('Pega un enlace de afiliado primero');
            if (!link.startsWith('http://') && !link.startsWith('https://')) {
              return alert(
                'El enlace no es válido.\n\n' +
                'Debes pegar la URL COMPLETA del producto en Mercado Libre con tu código de afiliado, por ejemplo:\n\n' +
                'https://www.mercadolibre.com.mx/producto-xyz/p/MLM123456?matt_tool=TU_ID\n\n' +
                'No pegues solo tu ID de afiliado (ej: e20260307145827), pega la URL completa.'
              );
            }
            
            const tokenInput = document.getElementById('admin-github-token-input');
            const githubToken = (tokenInput && tokenInput.value.trim()) ? tokenInput.value.trim() : localStorage.getItem('godzgames-github-token') || '';
            
            if (!githubToken) {
              return alert('Para guardar enlaces globalmente, necesitas ingresar tu "GitHub Token" en la pantalla de acceso del administrador.');
            }
            
            const item = data.find(d => d.id === id);
            e.target.textContent = 'Guardando...';
            e.target.disabled = true;
            
            try {
              const repoUrl = 'https://api.github.com/repos/godzgame/godzgames/contents/src/data/affiliates.json';
              
              // 1. Get current file and sha from GitHub
              let currentAffiliates = [];
              let fileSha = null;
              
              try {
                const getRes = await fetch(repoUrl, {
                  headers: { 'Authorization': `token ${githubToken}` }
                });
                if (getRes.ok) {
                  const getJson = await getRes.json();
                  fileSha = getJson.sha;
                  const decodedText = decodeURIComponent(escape(atob(getJson.content.replace(/\n/g, ''))));
                  currentAffiliates = JSON.parse(decodedText);
                }
              } catch (getErr) {
                console.warn('No se pudo obtener affiliates.json existente de GitHub:', getErr);
              }
              
              // 2. Add new item
              currentAffiliates.push({
                productId: item.id,
                title: item.title,
                link,
                generatedText: item.generatedText,
                price: item.price,
                thumbnail: item.thumbnail,
                savedAt: new Date().toISOString()
              });
              
              // 3. Commit new content to GitHub
              const newContent = JSON.stringify(currentAffiliates, null, 2);
              const base64Content = btoa(unescape(encodeURIComponent(newContent)));
              
              const putRes = await fetch(repoUrl, {
                method: 'PUT',
                headers: {
                  'Authorization': `token ${githubToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  message: `Admin: Guardar enlace de afiliado para ${item.title}`,
                  content: base64Content,
                  sha: fileSha || undefined
                })
              });
              
              if (!putRes.ok) {
                const errJson = await putRes.json().catch(() => ({}));
                const ghMsg = errJson.message || '';
                let friendlyMsg = '';
                if (putRes.status === 401) {
                  friendlyMsg = 'Token inválido o expirado. Genera un nuevo token en github.com/settings/tokens y vuelve a iniciar sesión en el panel admin.';
                } else if (putRes.status === 403 || ghMsg.toLowerCase().includes('resource not accessible')) {
                  friendlyMsg = 'El token no tiene permisos de escritura.\n\nSolución:\n1. Ve a github.com/settings/tokens/new\n2. Selecciona token CLÁSICO\n3. Marca el scope ✅ "repo" (completo)\n4. Genera el token (ghp_...) y vuelve a ingresarlo en el panel admin.';
                } else if (putRes.status === 404) {
                  friendlyMsg = 'No se encontró el archivo en el repositorio. Verifica que el repo sea "godzgame/godzgames".';
                } else if (putRes.status === 409) {
                  friendlyMsg = 'Conflicto de versión. El archivo fue modificado por otro proceso. Recarga la página e intenta de nuevo.';
                } else {
                  friendlyMsg = `Error GitHub ${putRes.status}: ${ghMsg || 'Error desconocido'}`;
                }
                throw new Error(friendlyMsg);
              }
              
              e.target.textContent = '¡Guardado!';
              e.target.className = 'admin-btn-save';
              setTimeout(() => loadSavedAffiliates(), 500);
            } catch (err) {
              console.error(err);
              alert('Error al guardar el enlace:\n\n' + err.message);
              e.target.textContent = 'Guardar';
              e.target.disabled = false;
            }
          });
        });
        
      } catch (err) {
        statusEl.className = 'admin-status-message error';
        statusEl.textContent = '❌ ' + err.message;
      }
    };
    
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      loadSuggestions();
    });
  };

  // ═══════════════════════════════════════════════════════════════
  // AUTO-ANALYTICS TRACKER (client-side, localStorage)
  // ═══════════════════════════════════════════════════════════════
  const ANALYTICS_KEY = 'gzg_analytics_v2';
  const KPI_STORAGE_KEY = 'gzg_kpis';

  // Detect traffic source from referrer and UTM params
  const detectTrafficSource = () => {
    const ref = document.referrer;
    const params = new URLSearchParams(window.location.search);
    const utm = (params.get('utm_source') || params.get('utm_medium') || '').toLowerCase();
    if (utm) {
      if (['cpc','paid','ads','ppc'].some(k => utm.includes(k))) return 'paid';
      if (['facebook','instagram','twitter','tiktok','youtube','pinterest','social','ig','fb'].some(k => utm.includes(k))) return 'social';
      if (['google','bing','yahoo','seo','organic','search'].some(k => utm.includes(k))) return 'seo';
    }
    if (!ref) return 'direct';
    try {
      const h = new URL(ref).hostname.toLowerCase();
      if (['facebook','instagram','twitter','x.com','tiktok','youtube','pinterest','linkedin','reddit'].some(k => h.includes(k))) return 'social';
      if (['google','bing','yahoo','duckduckgo','baidu','yandex','ecosia','brave'].some(k => h.includes(k))) return 'seo';
      if (h === window.location.hostname) return 'direct';
    } catch {}
    return 'direct';
  };

  // Load / save raw analytics data
  const getAnalyticsData = () => {
    try { const r = localStorage.getItem(ANALYTICS_KEY); return r ? JSON.parse(r) : { sessions: [] }; }
    catch { return { sessions: [] }; }
  };
  const saveAnalyticsData = (data) => {
    // Retain only last 90 days
    const cut = Date.now() - 90 * 864e5;
    data.sessions = (data.sessions || []).filter(s => s.startTime > cut);
    try { localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data)); } catch {}
  };

  // Compute KPI metrics from raw session data
  const computeAutoKPIs = (data) => {
    const today = new Date().toISOString().slice(0, 10);
    const thisMonth = today.slice(0, 7);
    const thisYear = today.slice(0, 4);
    const sess = data.sessions || [];
    const todaySess = sess.filter(s => s.date === today);
    const monthSess = sess.filter(s => s.date.startsWith(thisMonth));
    const yearSess  = sess.filter(s => s.date.startsWith(thisYear));
    const uniqueBy = (arr) => new Set(arr.map(s => s.sessionId)).size;
    const srcCnt = { seo: 0, social: 0, direct: 0, paid: 0 };
    monthSess.forEach(s => { if (srcCnt.hasOwnProperty(s.source)) srcCnt[s.source]++; });
    const srcTot = Object.values(srcCnt).reduce((a, b) => a + b, 0) || 1;
    const completed = sess.filter(s => s.endTime && s.endTime > s.startTime);
    const bounced = completed.filter(s => (s.pagesViewed || 1) <= 1);
    const bounceRate = completed.length ? Math.round((bounced.length / completed.length) * 100) : 0;
    const avgSessionSec = completed.length
      ? Math.round(completed.reduce((a, s) => a + (s.endTime - s.startTime) / 1000, 0) / completed.length) : 0;
    const pagesPerSession = completed.length
      ? parseFloat((completed.reduce((a, s) => a + (s.pagesViewed || 1), 0) / completed.length).toFixed(1)) : 0;
    return {
      visitorsToday: uniqueBy(todaySess),
      visitorsMonth: uniqueBy(monthSess),
      visitorsYear: uniqueBy(yearSess),
      sources: {
        seo: Math.round(srcCnt.seo / srcTot * 100),
        social: Math.round(srcCnt.social / srcTot * 100),
        direct: Math.round(srcCnt.direct / srcTot * 100),
        paid: Math.round(srcCnt.paid / srcTot * 100)
      },
      bounceRate, avgSessionSec, pagesPerSession,
      totalSessions: sess.length
    };
  };

  // ── SESSION TRACKING ─────────────────────────────────────────────
  let _sessionId = null;
  let _sessionStart = null;
  let _sessionPages = 1;

  const initAnalyticsTracking = () => {
    const data = getAnalyticsData();
    const today = new Date().toISOString().slice(0, 10);
    _sessionId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    _sessionStart = Date.now();
    _sessionPages = 1;
    const src = detectTrafficSource();
    data.sessions.push({ sessionId: _sessionId, source: src, date: today, startTime: _sessionStart, endTime: null, pagesViewed: 1 });
    saveAnalyticsData(data);
    // Save on exit
    window.addEventListener('beforeunload', () => {
      const d = getAnalyticsData();
      const i = d.sessions.findIndex(s => s.sessionId === _sessionId);
      if (i !== -1) { d.sessions[i].endTime = Date.now(); d.sessions[i].pagesViewed = _sessionPages; }
      try { localStorage.setItem(ANALYTICS_KEY, JSON.stringify(d)); } catch {}
    });
    // Heartbeat every 30s
    setInterval(() => {
      const d = getAnalyticsData();
      const i = d.sessions.findIndex(s => s.sessionId === _sessionId);
      if (i !== -1) { d.sessions[i].pagesViewed = _sessionPages; d.sessions[i].lastSeen = Date.now(); }
      saveAnalyticsData(d);
    }, 30000);
  };

  const trackAnalyticsPageView = () => {
    if (!_sessionId) return;
    _sessionPages++;
    const d = getAnalyticsData();
    const i = d.sessions.findIndex(s => s.sessionId === _sessionId);
    if (i !== -1) d.sessions[i].pagesViewed = _sessionPages;
    saveAnalyticsData(d);
  };

  // ── KPI MANUAL OVERRIDES (goals + monetization only) ────────────
  const defaultKPIs = () => ({
    updated: new Date().toISOString().slice(0, 10),
    traffic: { impressions: 0, ctr: 0, goalMonthlyVisitors: 1000 },
    monetization: { conversionRate: 1.5, arpu: 0.50, ltv: 10, cac: 2, monthlyRevenue: 0, goalMonthlyRevenue: 500 }
  });

  const loadKPIs = () => {
    try { const r = localStorage.getItem(KPI_STORAGE_KEY); return r ? { ...defaultKPIs(), ...JSON.parse(r) } : defaultKPIs(); }
    catch { return defaultKPIs(); }
  };

  const saveKPIs = (data) => {
    data.updated = new Date().toISOString().slice(0, 10);
    localStorage.setItem(KPI_STORAGE_KEY, JSON.stringify(data));
  };

  const generateSuggestions = (auto, manual) => {
    const s = []; const m = manual.monetization;
    const pct = manual.traffic.goalMonthlyVisitors > 0 ? Math.round((auto.visitorsMonth / manual.traffic.goalMonthlyVisitors) * 100) : 0;
    const revPct = m.goalMonthlyRevenue > 0 ? Math.round((m.monthlyRevenue / m.goalMonthlyRevenue) * 100) : 0;
    const ltvcac = m.cac > 0 ? (m.ltv / m.cac).toFixed(1) : '∞';
    const ctr = manual.traffic.ctr;
    if (pct < 30) s.push({ icon: '🚀', color: '#ff4d6d', title: 'Tráfico crítico', body: `Llevas solo el ${pct}% de tu meta mensual de ${manual.traffic.goalMonthlyVisitors.toLocaleString()} visitas. Publica 4+ artículos SEO por semana y comparte en redes.` });
    else if (pct < 60) s.push({ icon: '📈', color: '#f9c74f', title: 'En camino a la meta', body: `Estás al ${pct}% de tu meta mensual. Optimiza los artículos más visitados y mejora el posicionamiento en Google.` });
    else s.push({ icon: '✅', color: '#06d6a0', title: '¡Buen ritmo!', body: `Vas al ${pct}% de tu meta. Mantén el ritmo y mejora el engagement para convertir más visitantes.` });
    if (auto.bounceRate > 70) s.push({ icon: '⚠️', color: '#ff6b35', title: 'Tasa de rebote alta', body: `Tasa de rebote del ${auto.bounceRate}%. Optimiza velocidad de carga, diseño móvil y agrega llamadas a la acción al inicio de cada artículo.` });
    else if (auto.bounceRate > 50 && auto.bounceRate > 0) s.push({ icon: '🔍', color: '#f9c74f', title: 'Mejora el engagement', body: `Con ${auto.bounceRate}% de rebote hay margen. Agrega artículos relacionados al final de cada noticia.` });
    if (ctr < 2 && ctr > 0) s.push({ icon: '🎯', color: '#ff4d6d', title: 'CTR muy bajo en Google', body: `CTR del ${ctr}%. Usa números, preguntas y palabras de alto impacto en tus meta títulos.` });
    else if (ctr >= 2 && ctr < 5) s.push({ icon: '✏️', color: '#4cc9f0', title: 'Mejora tus títulos', body: `CTR del ${ctr}% mejorable. Prueba títulos A/B en tus artículos más vistos y analiza con Search Console.` });
    if (auto.avgSessionSec > 0 && auto.avgSessionSec < 60) s.push({ icon: '⏱️', color: '#ff6b35', title: 'Sesiones muy cortas', body: `Usuarios se quedan ${auto.avgSessionSec}s. Agrega videos, infografías y secciones 'Leer después'.` });
    if (parseFloat(ltvcac) < 3 && m.cac > 0) s.push({ icon: '💸', color: '#ff4d6d', title: 'LTV/CAC desfavorable', body: `Ratio LTV/CAC de ${ltvcac}x (meta ≥ 3x). Reduce el CAC con SEO orgánico y aumenta retención.` });
    if (auto.sources.seo < 30 && auto.visitorsMonth > 0) s.push({ icon: '🔎', color: '#4cc9f0', title: 'Potencia el SEO', body: `Solo el ${auto.sources.seo}% de tu tráfico es orgánico. Publica guías evergreen con palabras clave de cola larga.` });
    if (revPct < 50 && m.goalMonthlyRevenue > 0) s.push({ icon: '💰', color: '#f9c74f', title: 'Impulsa los ingresos', body: `Llevas el ${revPct}% de tu meta ($${m.goalMonthlyRevenue}). Agrega banners de afiliados en artículos más visitados.` });
    if (s.length === 0) s.push({ icon: '🏆', color: '#06d6a0', title: '¡Todo en orden!', body: 'Tus métricas se ven saludables. Continúa publicando contenido de calidad y revisa semanalmente.' });
    return s;
  };

  let _kpiRefreshInterval = null;
  let _kpiTimerInterval = null;

  const renderKPIDashboard = () => {
    const container = document.getElementById('admin-tab-kpis');
    if (!container) return;
    if (_kpiRefreshInterval) { clearInterval(_kpiRefreshInterval); _kpiRefreshInterval = null; }
    if (_kpiTimerInterval) { clearInterval(_kpiTimerInterval); _kpiTimerInterval = null; }

    const manual = loadKPIs();
    const auto = computeAutoKPIs(getAnalyticsData());
    const m = manual.monetization;
    const imp = manual.traffic.impressions || 0;
    const ctr = manual.traffic.ctr || 0;
    const goal = manual.traffic.goalMonthlyVisitors || 1000;
    const pct = Math.min(100, Math.round((auto.visitorsMonth / goal) * 100)) || 0;
    const revPct = m.goalMonthlyRevenue > 0 ? Math.min(100, Math.round((m.monthlyRevenue / m.goalMonthlyRevenue) * 100)) : 0;
    const sugs = generateSuggestions(auto, manual);
    const sp = (k) => auto.sources[k] || 0;
    const pgColor = (p) => p >= 80 ? 'linear-gradient(90deg,#06d6a0,#00cc88)' : p >= 50 ? 'linear-gradient(90deg,#f9c74f,#ffb700)' : 'linear-gradient(90deg,#ff4d6d,#cc3355)';
    const sColor = (p) => p >= 80 ? '#06d6a0' : p >= 50 ? '#f9c74f' : '#ff4d6d';
    const donut = `conic-gradient(#06d6a0 0% ${sp('seo')}%,#4cc9f0 ${sp('seo')}% ${sp('seo')+sp('social')}%,#f9c74f ${sp('seo')+sp('social')}% ${sp('seo')+sp('social')+sp('direct')}%,#ff4d6d ${sp('seo')+sp('social')+sp('direct')}% 100%)`;
    const fmtSec = (s) => `${Math.floor(s/60)}m ${s%60}s`;
    const liveSec = _sessionStart ? Math.round((Date.now() - _sessionStart) / 1000) : 0;

    const card = (icon, label, value, sub, color = '#00ffaa', badge = '') => `
      <div style="background:var(--color-surface);border:1px solid var(--border-color);border-radius:14px;padding:18px;position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:${color};"></div>
        <div style="font-size:1.4rem;margin-bottom:4px;">${icon}</div>
        <div style="font-size:0.7rem;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:0.5px;">${label}</div>
        <div style="font-size:1.65rem;font-weight:800;font-family:var(--font-heading);color:#fff;line-height:1.1;">${value}</div>
        ${sub ? `<div style="font-size:0.72rem;color:var(--color-text-muted);margin-top:4px;">${sub}</div>` : ''}
        ${badge ? `<div style="position:absolute;top:12px;right:12px;font-size:0.68rem;padding:2px 7px;border-radius:20px;background:rgba(0,0,0,0.35);color:${color};">${badge}</div>` : ''}
      </div>`;

    const editF = (id, label, val, step = '1') => `
      <div style="display:flex;flex-direction:column;gap:4px;">
        <label style="font-size:0.72rem;color:var(--color-text-muted);">${label}</label>
        <input id="kpi-${id}" type="number" step="${step}" value="${val}" style="background:rgba(0,0,0,0.3);border:1px solid var(--border-color);border-radius:8px;color:#fff;padding:8px 10px;font-size:0.88rem;width:100%;" />
      </div>`;
    const sec = (label) => `<div style="grid-column:1/-1;font-size:0.7rem;color:var(--color-primary);text-transform:uppercase;letter-spacing:0.5px;margin-top:8px;">${label}</div>`;

    container.innerHTML = `
      <div>
        <style>@keyframes kpi-pulse{0%,100%{opacity:1}50%{opacity:0.25}}</style>

        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;flex-wrap:wrap;gap:12px;">
          <div>
            <h3 style="font-size:1.3rem;margin:0 0 5px;font-family:var(--font-heading);">📊 Indicadores Clave de Rendimiento</h3>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:0.78rem;color:var(--color-text-muted);">
              <span style="display:flex;align-items:center;gap:5px;color:#06d6a0;">
                <span style="width:7px;height:7px;border-radius:50%;background:#06d6a0;display:inline-block;animation:kpi-pulse 1.5s infinite;"></span>
                LIVE · se actualiza cada 30s
              </span>
              <span>${auto.totalSessions} sesiones registradas en este navegador</span>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button id="kpi-reset-btn" style="background:transparent;border:1px solid #ff4d6d44;color:#ff4d6d;padding:7px 12px;border-radius:10px;cursor:pointer;font-size:0.78rem;">🗑️ Resetear</button>
            <button id="kpi-edit-btn" style="background:transparent;border:1px solid var(--color-primary);color:var(--color-primary);padding:7px 14px;border-radius:10px;cursor:pointer;font-size:0.8rem;">✏️ Configurar metas</button>
          </div>
        </div>

        <!-- LIVE session card -->
        <div style="background:linear-gradient(135deg,rgba(0,255,170,0.08),rgba(76,201,240,0.04));border:1px solid rgba(0,255,170,0.25);border-radius:14px;padding:14px 20px;margin-bottom:22px;display:flex;align-items:center;gap:24px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:7px;">
            <span style="width:9px;height:9px;border-radius:50%;background:#06d6a0;display:inline-block;animation:kpi-pulse 1s infinite;"></span>
            <span style="font-size:0.82rem;font-weight:600;color:#06d6a0;">Sesión Actual</span>
          </div>
          <div style="display:flex;gap:24px;flex-wrap:wrap;">
            <div style="text-align:center;"><div id="kpi-live-timer" style="font-size:1.25rem;font-weight:800;font-family:var(--font-heading);color:#fff;">${fmtSec(liveSec)}</div><div style="font-size:0.68rem;color:var(--color-text-muted);">Tiempo activo</div></div>
            <div style="text-align:center;"><div style="font-size:1.25rem;font-weight:800;font-family:var(--font-heading);color:#fff;">${_sessionPages}</div><div style="font-size:0.68rem;color:var(--color-text-muted);">Páginas vistas</div></div>
            <div style="text-align:center;"><div style="font-size:1.25rem;font-weight:800;font-family:var(--font-heading);color:#4cc9f0;">${detectTrafficSource().toUpperCase()}</div><div style="font-size:0.68rem;color:var(--color-text-muted);">Origen de entrada</div></div>
          </div>
        </div>

        <!-- Period totals -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:22px;">
          <div style="background:linear-gradient(135deg,rgba(0,255,170,0.14),rgba(0,255,170,0.03));border:1px solid rgba(0,255,170,0.22);border-radius:14px;padding:18px;text-align:center;">
            <div style="font-size:1.9rem;font-weight:800;font-family:var(--font-heading);color:#00ffaa;">${auto.visitorsToday.toLocaleString()}</div>
            <div style="font-size:0.78rem;color:var(--color-text-muted);margin-top:4px;">📅 Visitas Hoy</div>
          </div>
          <div style="background:linear-gradient(135deg,rgba(76,201,240,0.14),rgba(76,201,240,0.03));border:1px solid rgba(76,201,240,0.22);border-radius:14px;padding:18px;text-align:center;">
            <div style="font-size:1.9rem;font-weight:800;font-family:var(--font-heading);color:#4cc9f0;">${auto.visitorsMonth.toLocaleString()}</div>
            <div style="font-size:0.78rem;color:var(--color-text-muted);margin-top:4px;">📆 Visitas este Mes</div>
          </div>
          <div style="background:linear-gradient(135deg,rgba(249,199,79,0.14),rgba(249,199,79,0.03));border:1px solid rgba(249,199,79,0.22);border-radius:14px;padding:18px;text-align:center;">
            <div style="font-size:1.9rem;font-weight:800;font-family:var(--font-heading);color:#f9c74f;">${auto.visitorsYear.toLocaleString()}</div>
            <div style="font-size:0.78rem;color:var(--color-text-muted);margin-top:4px;">📊 Visitas este Año</div>
          </div>
        </div>

        <!-- Goal Progress -->
        <div style="background:var(--color-surface);border:1px solid var(--border-color);border-radius:14px;padding:18px;margin-bottom:22px;">
          <h4 style="margin:0 0 14px;font-size:0.82rem;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:0.5px;">🎯 Progreso a Objetivos Mensuales</h4>
          <div style="margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;font-size:0.83rem;margin-bottom:6px;">
              <span>Visitas: <b>${auto.visitorsMonth.toLocaleString()}</b> / ${goal.toLocaleString()}</span>
              <span style="color:${sColor(pct)};font-weight:700;">${pct}%</span>
            </div>
            <div style="background:rgba(255,255,255,0.07);border-radius:20px;height:9px;overflow:hidden;">
              <div style="height:100%;width:${pct}%;background:${pgColor(pct)};border-radius:20px;transition:width 0.8s;"></div>
            </div>
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;font-size:0.83rem;margin-bottom:6px;">
              <span>Ingresos: <b>$${m.monthlyRevenue.toFixed(2)}</b> / $${m.goalMonthlyRevenue.toFixed(2)}</span>
              <span style="color:${sColor(revPct)};font-weight:700;">${revPct}%</span>
            </div>
            <div style="background:rgba(255,255,255,0.07);border-radius:20px;height:9px;overflow:hidden;">
              <div style="height:100%;width:${revPct}%;background:${pgColor(revPct)};border-radius:20px;transition:width 0.8s;"></div>
            </div>
          </div>
        </div>

        <!-- Traffic (AUTO) -->
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:11px;">
          <span style="font-size:0.75rem;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:1px;">📈 Tráfico</span>
          <span style="font-size:0.65rem;padding:1px 6px;border-radius:10px;background:rgba(0,255,170,0.1);color:#06d6a0;">⚡ AUTO</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(165px,1fr));gap:11px;margin-bottom:22px;">
          ${card('👁️','Impresiones Google',imp.toLocaleString(),'manual · Search Console','#4cc9f0')}
          ${card('🖱️','CTR',ctr+'%','manual · Search Console',ctr>=5?'#06d6a0':ctr>=2?'#f9c74f':'#ff4d6d',ctr>=5?'✅ Bueno':ctr>=2?'⚠️ Mejorable':'🔴 Bajo')}
          ${card('🔍','SEO Orgánico',sp('seo')+'%','del tráfico del mes','#06d6a0')}
          ${card('📱','Redes Sociales',sp('social')+'%','del tráfico del mes','#4cc9f0')}
        </div>

        <!-- Behavior (AUTO) -->
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:11px;">
          <span style="font-size:0.75rem;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:1px;">👥 Comportamiento</span>
          <span style="font-size:0.65rem;padding:1px 6px;border-radius:10px;background:rgba(0,255,170,0.1);color:#06d6a0;">⚡ AUTO</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(165px,1fr));gap:11px;margin-bottom:22px;">
          ${card('📉','Tasa de Rebote',auto.bounceRate+'%','salen sin interactuar',auto.bounceRate<40?'#06d6a0':auto.bounceRate<70?'#f9c74f':'#ff4d6d',auto.bounceRate<40?'✅ Excelente':auto.bounceRate<70?'⚠️ Mejorable':'🔴 Alta')}
          ${card('⏱️','Duración Media',auto.avgSessionSec>0?fmtSec(auto.avgSessionSec):'—','promedio de sesiones',auto.avgSessionSec>180?'#06d6a0':auto.avgSessionSec>60?'#f9c74f':'#ff4d6d')}
          ${card('📄','Páginas / Sesión',auto.pagesPerSession>0?auto.pagesPerSession.toFixed(1):'—','secciones por visita',auto.pagesPerSession>3?'#06d6a0':auto.pagesPerSession>1.5?'#f9c74f':'#ff4d6d')}
        </div>

        <!-- Monetization -->
        <div style="font-size:0.75rem;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:11px;">💰 Monetización</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(165px,1fr));gap:11px;margin-bottom:22px;">
          ${card('🎯','Conversión',m.conversionRate+'%','visitantes → ingreso',m.conversionRate>3?'#06d6a0':m.conversionRate>1?'#f9c74f':'#ff4d6d')}
          ${card('💵','ARPU','$'+m.arpu.toFixed(2),'ingreso / usuario','#4cc9f0')}
          ${card('♾️','LTV','$'+m.ltv.toFixed(2),'valor de vida','#06d6a0')}
          ${card('📣','CAC','$'+m.cac.toFixed(2),'costo / nuevo cliente',m.cac<m.ltv/3?'#06d6a0':'#f9c74f')}
        </div>

        <!-- Source Chart + LTV/CAC -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:22px;">
          <div style="background:var(--color-surface);border:1px solid var(--border-color);border-radius:14px;padding:18px;">
            <h4 style="margin:0 0 12px;font-size:0.88rem;">🌐 Fuentes de Tráfico <span style="font-size:0.62rem;color:#06d6a0;font-weight:normal;">⚡ AUTO</span></h4>
            <div style="display:flex;align-items:center;gap:16px;">
              <div style="width:85px;height:85px;border-radius:50%;background:${donut};flex-shrink:0;"></div>
              <div style="display:flex;flex-direction:column;gap:6px;">
                <div style="display:flex;gap:6px;align-items:center;font-size:0.78rem;"><span style="width:8px;height:8px;border-radius:50%;background:#06d6a0;display:inline-block;"></span>SEO <b>${sp('seo')}%</b></div>
                <div style="display:flex;gap:6px;align-items:center;font-size:0.78rem;"><span style="width:8px;height:8px;border-radius:50%;background:#4cc9f0;display:inline-block;"></span>Social <b>${sp('social')}%</b></div>
                <div style="display:flex;gap:6px;align-items:center;font-size:0.78rem;"><span style="width:8px;height:8px;border-radius:50%;background:#f9c74f;display:inline-block;"></span>Directo <b>${sp('direct')}%</b></div>
                <div style="display:flex;gap:6px;align-items:center;font-size:0.78rem;"><span style="width:8px;height:8px;border-radius:50%;background:#ff4d6d;display:inline-block;"></span>Pagado <b>${sp('paid')}%</b></div>
              </div>
            </div>
          </div>
          <div style="background:var(--color-surface);border:1px solid var(--border-color);border-radius:14px;padding:18px;">
            <h4 style="margin:0 0 8px;font-size:0.88rem;">📊 LTV / CAC</h4>
            <div style="font-size:2.6rem;font-weight:800;font-family:var(--font-heading);color:${m.cac>0&&m.ltv/m.cac>=3?'#06d6a0':'#f9c74f'};">${m.cac>0?(m.ltv/m.cac).toFixed(1):'—'}x</div>
            <div style="font-size:0.76rem;color:var(--color-text-muted);">Meta: ≥ 3x</div>
            <div style="font-size:0.78rem;margin-top:8px;padding:7px 10px;border-radius:8px;background:rgba(255,255,255,0.05);">
              ${m.cac>0&&m.ltv/m.cac>=3?'✅ Rentable — LTV supera al CAC.':'⚠️ Reduce el CAC con SEO orgánico.'}
            </div>
          </div>
        </div>

        <!-- Suggestions -->
        <div style="font-size:0.75rem;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:11px;">💡 Sugerencias para Alcanzar tus Objetivos</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:11px;margin-bottom:26px;">
          ${sugs.map(sg=>`
            <div style="background:var(--color-surface);border:1px solid ${sg.color}33;border-left:4px solid ${sg.color};border-radius:14px;padding:14px;">
              <div style="display:flex;align-items:center;gap:7px;margin-bottom:7px;">
                <span style="font-size:1rem;">${sg.icon}</span>
                <strong style="color:${sg.color};font-size:0.85rem;">${sg.title}</strong>
              </div>
              <p style="font-size:0.78rem;color:#ccc;line-height:1.5;margin:0;">${sg.body}</p>
            </div>
          `).join('')}
        </div>

        <!-- Edit Form -->
        <div id="kpi-edit-form" style="display:none;background:var(--color-surface);border:1px solid var(--border-color);border-radius:14px;padding:20px;">
          <h4 style="margin:0 0 5px;font-size:0.92rem;">✏️ Configurar Metas y Datos Externos</h4>
          <p style="font-size:0.76rem;color:var(--color-text-muted);margin:0 0 16px;">Visitas, fuentes y comportamiento se rastrean automáticamente. Solo configura metas y datos de Search Console.</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:11px;margin-bottom:16px;">
            ${sec('🎯 Metas Mensuales')}
            ${editF('goalMonthlyVisitors','Meta de Visitas (mes)',goal)}
            ${editF('goalMonthlyRevenue','Meta de Ingresos $ (mes)',m.goalMonthlyRevenue,'0.01')}
            ${sec('📊 Google Search Console (manual)')}
            ${editF('impressions','Impresiones Google',imp)}
            ${editF('ctr','CTR (%)',ctr,'0.1')}
            ${sec('💰 Monetización')}
            ${editF('conversionRate','Conversión (%)',m.conversionRate,'0.1')}
            ${editF('arpu','ARPU ($)',m.arpu,'0.01')}
            ${editF('ltv','LTV ($)',m.ltv,'0.01')}
            ${editF('cac','CAC ($)',m.cac,'0.01')}
            ${editF('monthlyRevenue','Ingresos del Mes ($)',m.monthlyRevenue,'0.01')}
          </div>
          <div style="display:flex;gap:10px;">
            <button id="kpi-save-btn" class="admin-btn">💾 Guardar</button>
            <button id="kpi-cancel-btn" class="admin-btn-secondary">Cancelar</button>
          </div>
          <div id="kpi-save-status" style="display:none;margin-top:10px;padding:9px 13px;border-radius:8px;font-size:0.82rem;"></div>
        </div>
      </div>
    `;

    // Live timer — tick every second
    _kpiTimerInterval = setInterval(() => {
      const el = document.getElementById('kpi-live-timer');
      if (!el) { clearInterval(_kpiTimerInterval); return; }
      const s = _sessionStart ? Math.round((Date.now() - _sessionStart) / 1000) : 0;
      el.textContent = `${Math.floor(s/60)}m ${s%60}s`;
    }, 1000);

    // Auto-refresh every 30s
    _kpiRefreshInterval = setInterval(() => {
      if (document.getElementById('admin-tab-kpis')?.style.display !== 'none') renderKPIDashboard();
      else clearInterval(_kpiRefreshInterval);
    }, 30000);

    // Buttons
    document.getElementById('kpi-edit-btn').addEventListener('click', () => {
      const f = document.getElementById('kpi-edit-form');
      f.style.display = f.style.display === 'none' ? 'block' : 'none';
      if (f.style.display === 'block') f.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    document.getElementById('kpi-cancel-btn').addEventListener('click', () => {
      document.getElementById('kpi-edit-form').style.display = 'none';
    });
    document.getElementById('kpi-reset-btn').addEventListener('click', () => {
      if (confirm('¿Resetear todos los datos de analíticas? Esta acción no se puede deshacer.')) {
        localStorage.removeItem(ANALYTICS_KEY);
        renderKPIDashboard();
      }
    });
    document.getElementById('kpi-save-btn').addEventListener('click', () => {
      const v = (id) => parseFloat(document.getElementById('kpi-'+id)?.value || '0') || 0;
      saveKPIs({
        ...manual,
        traffic: { impressions: v('impressions'), ctr: v('ctr'), goalMonthlyVisitors: v('goalMonthlyVisitors') },
        monetization: { conversionRate: v('conversionRate'), arpu: v('arpu'), ltv: v('ltv'), cac: v('cac'), monthlyRevenue: v('monthlyRevenue'), goalMonthlyRevenue: v('goalMonthlyRevenue') }
      });
      const st = document.getElementById('kpi-save-status');
      st.textContent = '✅ Guardado. Recargando...';
      st.style.cssText = 'display:block;background:rgba(6,214,160,0.15);color:#06d6a0;padding:9px 13px;border-radius:8px;font-size:0.82rem;margin-top:10px;';
      setTimeout(() => renderKPIDashboard(), 800);
    });
  };


  const initAdminTabs = () => {
    const tabBtns = [
      { id: 'tab-btn-games', target: 'admin-tab-games' },
      { id: 'tab-btn-calendar', target: 'admin-tab-calendar' },
      { id: 'tab-btn-affiliates', target: 'admin-tab-affiliates' },
      { id: 'tab-btn-kpis', target: 'admin-tab-kpis' }
    ];

    tabBtns.forEach(tab => {
      const btn = document.getElementById(tab.id);
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          // Update buttons
          tabBtns.forEach(t => {
            const b = document.getElementById(t.id);
            if (b) {
              b.classList.remove('active');
              b.className = t.id === tab.id ? 'admin-btn active' : 'admin-btn-secondary';
            }
            // Update views
            const v = document.getElementById(t.target);
            if (v) v.style.display = t.id === tab.id ? 'block' : 'none';
          });
          
          // Custom triggers
          if (tab.id === 'tab-btn-affiliates') {
            loadSavedAffiliates();
            const genBtn = document.getElementById('admin-generate-affiliates-btn');
            if (genBtn) genBtn.click();
          }
          if (tab.id === 'tab-btn-kpis') {
            renderKPIDashboard();
          }
        });
      }
    });
  };

  // Fetch News and Initialize
  const initializeApp = async () => {
    // Balanced round-robin shuffle of games across all consoles to ensure all consoles are shown on the home page
    const gamesByConsole = {};
    consoles.forEach(c => {
      const cUpper = c.trim().toUpperCase();
      gamesByConsole[cUpper] = games.filter(g => (g.console || '').trim().toUpperCase() === cUpper);
      gamesByConsole[cUpper] = shuffleArray(gamesByConsole[cUpper]);
    });


    const balancedGames = [];
    let hasGamesLeft = true;
    let index = 0;
    while (hasGamesLeft) {
      hasGamesLeft = false;
      consoles.forEach(c => {
        const cUpper = c.trim().toUpperCase();
        if (index < gamesByConsole[cUpper].length) {
          balancedGames.push(gamesByConsole[cUpper][index]);
          hasGamesLeft = true;
        }
      });
      index++;
    }
    shuffledGames = balancedGames;

    // Detect language preference
    const savedLang = localStorage.getItem('godzgames-lang');
    if (savedLang) {
      currentLang = savedLang;
    } else {
      const userLang = navigator.language || navigator.userLanguage || 'en';
      currentLang = userLang.startsWith('es') ? 'es' : 'en';
    }

    // Render UI and attach listeners immediately with bundled data
    updateLanguage(currentLang);
    renderTags();
    handleRouting();
    initAdminTabs();
    setupAffiliatesTab();
    initAnalyticsTracking();

    // Fetch latest news asynchronously — only use if articles match the deployed bundle
    safeFetchJSON('https://raw.githubusercontent.com/godzgame/godzgames/main/src/data/latest_news.json?t=' + Date.now()).then(liveNewsData => {
      if (liveNewsData && liveNewsData.articles && liveNewsData.articles.length > 0) {
        // Build a set of slugs from compiled allArticles (the source of truth for deployed pages)
        const localSlugs = new Set(allArticles.map(a => a.slug).filter(Boolean));
        // Only keep live articles that have a matching static page in the bundle
        const matchedLive = liveNewsData.articles.filter(a => {
          const liveSlug = a.slug || slugify((a.es?.title || a.en?.title || a.title || ''));
          return localSlugs.has(liveSlug);
        });
        if (matchedLive.length > 0) {
          // Live data matches deployed pages — safe to use
          aiNews = matchedLive;
          renderGames();
        }
        // If no match (stale GitHub data), keep aiNews from compiled bundle — no action needed
      }
    }).catch(() => {});

    safeFetchJSON('https://raw.githubusercontent.com/godzgame/godzgames/main/src/data/games.json?t=' + Date.now()).then(liveGamesData => {
      if (liveGamesData && liveGamesData.games) {
        games = liveGamesData.games;
        consoles = liveGamesData.consoles;
        renderGames();
      }
    }).catch(() => {});

    // Load live affiliates from GitHub so OFERTAS section shows without rebuild
    safeFetchJSON('https://raw.githubusercontent.com/godzgame/godzgames/main/src/data/affiliates.json?t=' + Date.now()).then(liveAffiliatesData => {
      if (Array.isArray(liveAffiliatesData) && liveAffiliatesData.length > 0) {
        savedAffiliates = liveAffiliatesData;
        // Re-render the current view to reflect updated offers
        const offersTab = document.getElementById('offers-view');
        if (offersTab && offersTab.style.display !== 'none') {
          renderGames();
        }
      }
    }).catch(() => {});

    // Attach switch language listeners
    const langEnBtn = document.getElementById('lang-en');
    if (langEnBtn) {
      langEnBtn.addEventListener('click', (e) => {
        e.preventDefault();
        updateLanguage('en');
      });
    }
    const langEsBtn = document.getElementById('lang-es');
    if (langEsBtn) {
      langEsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        updateLanguage('es');
      });
    }

    // Attach click listeners to return home
    if (logo) logo.addEventListener('click', goToHome);
    if (navHome) navHome.addEventListener('click', goToHome);
    document.querySelectorAll('.logo, .logo img, .nav-home').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', goToHome);
    });

    // Attach header search event listeners & Live Autocomplete Dropdown
    const searchDropdown = document.getElementById('search-autocomplete-dropdown') || (() => {
      const el = document.createElement('div');
      el.id = 'search-autocomplete-dropdown';
      el.className = 'search-dropdown';
      el.style.display = 'none';
      const headerSearch = document.querySelector('.header-search');
      if (headerSearch) headerSearch.appendChild(el);
      return el;
    })();

    const safeStr = (val) => {
      if (!val) return '';
      if (typeof val === 'string') return val.toLowerCase();
      if (Array.isArray(val)) return val.join(' ').toLowerCase();
      if (typeof val === 'object') return JSON.stringify(val).toLowerCase();
      return String(val).toLowerCase();
    };

    const renderLiveSearchResults = (query) => {
      if (!searchDropdown) return;
      const qClean = query.trim().toLowerCase();
      if (qClean.length === 0) {
        searchDropdown.style.display = 'none';
        searchDropdown.innerHTML = '';
        return;
      }

      const matches = [];

      // 1. Search Games ([JUEGO])
      if (Array.isArray(games)) {
        games.forEach(g => {
          const titleMatch = safeStr(g.title).includes(qClean);
          const consoleMatch = safeStr(g.console).includes(qClean);
          const genreMatch = safeStr(g.genre).includes(qClean);
          const tagMatch = safeStr(g.tags).includes(qClean);
          const descMatch = safeStr(g.sinopsis || g.description).includes(qClean);

          if (titleMatch || consoleMatch || genreMatch || tagMatch || descMatch) {
            const priority = safeStr(g.title).startsWith(qClean) ? 3 : (titleMatch ? 2 : 1);
            matches.push({
              id: g.id,
              title: g.title,
              badgeText: 'JUEGO',
              badgeClass: 'search-badge-game',
              subtitle: g.console || 'PC / Consolas',
              image: g.customCover || g.cover || '/logo.png',
              url: `/?game=${g.id}`,
              isGame: true,
              priority
            });
          }
        });
      }

      // 2. Search Articles ([NOTICIA], [ANÁLISIS], [GUÍA])
      if (Array.isArray(allArticlesData)) {
        allArticlesData.forEach(a => {
          const titleMatch = safeStr(a.title).includes(qClean);
          const summaryMatch = safeStr(a.summary || a.description || a.fullContent).includes(qClean);
          const catMatch = safeStr(a.category).includes(qClean);

          if (titleMatch || summaryMatch || catMatch) {
            let badgeText = 'ARTÍCULO';
            let badgeClass = 'search-badge-news';
            const catUpper = safeStr(a.category).toUpperCase();
            if (catUpper.includes('NOTICIAS')) {
              badgeText = 'NOTICIA';
              badgeClass = 'search-badge-news';
            } else if (catUpper.includes('ANALISIS')) {
              badgeText = 'ANÁLISIS';
              badgeClass = 'search-badge-review';
            } else if (catUpper.includes('GUIAS')) {
              badgeText = 'GUÍA';
              badgeClass = 'search-badge-guide';
            }

            const priority = safeStr(a.title).startsWith(qClean) ? 3 : (titleMatch ? 2 : 1);
            matches.push({
              id: a.id || a.slug,
              title: a.title,
              badgeText,
              badgeClass,
              subtitle: a.date || a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : 'Artículo GODZGAMES',
              image: a.image || '/logo.png',
              url: a.url,
              isArticle: true,
              priority
            });
          }
        });
      }

      // 3. Search Offers / Deals ([OFERTA])
      if (Array.isArray(savedAffiliates)) {
        savedAffiliates.forEach(off => {
          const titleMatch = safeStr(off.title).includes(qClean);
          const storeMatch = safeStr(off.store).includes(qClean);
          const descMatch = safeStr(off.description || off.generatedText).includes(qClean);

          if (titleMatch || storeMatch || descMatch) {
            const priority = safeStr(off.title).startsWith(qClean) ? 3 : (titleMatch ? 2 : 1);
            matches.push({
              id: off.productId || off.id,
              title: off.title,
              badgeText: 'OFERTA',
              badgeClass: 'search-badge-offer',
              subtitle: off.price ? `$${off.price} MXN — ${off.store || 'GodZDeals'}` : (off.store || 'Oferta GODZDEALS'),
              image: off.thumbnail || off.image || '/logo.png',
              url: off.affiliateUrl || `/?oferta=${off.productId || off.id}`,
              isOffer: true,
              priority
            });
          }
        });
      }

      // Sort by priority, then title length
      matches.sort((a, b) => b.priority - a.priority || a.title.length - b.title.length);

      // Limit to max 8 items
      const topMatches = matches.slice(0, 8);

      if (topMatches.length === 0) {
        searchDropdown.innerHTML = `
          <div class="search-dropdown-empty">
            No se encontraron resultados para "<strong style="color: var(--color-secondary);">${query}</strong>"
          </div>
        `;
      } else {
        searchDropdown.innerHTML = topMatches.map(item => `
          <div class="search-dropdown-item" data-url="${item.url}" data-is-game="${item.isGame ? 'true' : 'false'}" data-game-id="${item.isGame ? item.id : ''}">
            <img class="search-dropdown-thumb" src="${item.image}" alt="${item.title}" onerror="this.src='/logo.png';" />
            <div class="search-dropdown-details">
              <div class="search-dropdown-header">
                <span class="search-dropdown-title">${item.title}</span>
                <span class="search-badge ${item.badgeClass}">${item.badgeText}</span>
              </div>
              <div class="search-dropdown-sub">${item.subtitle}</div>
            </div>
          </div>
        `).join('');

        // Add click listeners to items
        searchDropdown.querySelectorAll('.search-dropdown-item').forEach(el => {
          el.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const url = el.dataset.url;
            const isGame = el.dataset.isGame === 'true';
            const gameId = el.dataset.gameId;

            searchDropdown.style.display = 'none';

            if (isGame && gameId) {
              window.history.pushState(null, '', `?game=${gameId}`);
              window.dispatchEvent(new Event('popstate'));
            } else if (url) {
              window.navigateTo(e, url);
            }
          });
        });
      }

      searchDropdown.style.display = 'block';
    };

    if (headerSearchInput) {
      headerSearchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        currentPage = 1; // Reset to page 1 on search input
        
        // Show/hide clear button
        if (searchQuery.length > 0) {
          if (headerSearchClear) headerSearchClear.style.display = 'block';
        } else {
          if (headerSearchClear) headerSearchClear.style.display = 'none';
        }

        renderLiveSearchResults(searchQuery);

        // Return to home if on a game details page or admin page
        if ((window.location.search.includes('?game=') || window.location.hash.startsWith('#/game/') || window.location.hash === '#/admin') && searchQuery.trim().length > 0) {
          window.history.pushState(null, '', '/');
          window.dispatchEvent(new Event('popstate'));
        } else {
          renderGames();
        }
      });

      headerSearchInput.addEventListener('focus', () => {
        if (headerSearchInput.value.trim().length > 0) {
          renderLiveSearchResults(headerSearchInput.value);
        }
      });
    }

    if (headerSearchClear) {
      headerSearchClear.addEventListener('click', () => {
        if (headerSearchInput) headerSearchInput.value = '';
        searchQuery = '';
        currentPage = 1;
        headerSearchClear.style.display = 'none';
        if (searchDropdown) searchDropdown.style.display = 'none';
        renderGames();
      });
    }

    // Close search dropdown on click outside or Escape key
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.header-search')) {
        if (searchDropdown) searchDropdown.style.display = 'none';
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (searchDropdown) searchDropdown.style.display = 'none';
      }
    });

    // Attach admin event listeners
    if (adminLoginBtn) {
      adminLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleAdminLogin();
      });
    }
    if (adminPasswordInput) {
      adminPasswordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAdminLogin();
        }
      });
    }
    if (adminLogoutBtn) {
      adminLogoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleAdminLogout();
      });
    }
    if (adminSearchInput) {
      adminSearchInput.addEventListener('input', (e) => {
        renderAdminGamesList(e.target.value);
      });
    }
    if (adminEditorBack) {
      adminEditorBack.addEventListener('click', (e) => {
        e.preventDefault();
        showAdminDashboard();
      });
    }
    if (adminSaveBtn) {
      adminSaveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        saveAdminGameEdits();
      });
    }

    const adminChangeConsoleBtn = document.getElementById('admin-change-console-btn');
    if (adminChangeConsoleBtn) {
      adminChangeConsoleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showAdminDashboard();
      });
    }

    const adminGenerateTiktokBtn = document.getElementById('admin-generate-tiktok-btn');
    if (adminGenerateTiktokBtn) {
      adminGenerateTiktokBtn.addEventListener('click', async (e) => {
        const feature = document.getElementById('admin-edit-tiktok-feature')?.value?.trim() || '';
        const statusEl = document.getElementById('admin-tiktok-status');
        const scriptEl = document.getElementById('admin-edit-tiktok-script');
        
        if (!activeEditingGame) return;
        
        if (statusEl) {
          statusEl.style.display = 'block';
          statusEl.className = 'admin-status-message';
          statusEl.textContent = '⏳ Generando guion viral con IA... (Esto puede tomar 10-20 segundos)';
        }
        
        const aiPrompt = `Actúa como un creador de contenido experto en videos verticales virales (TikTok/Shorts) sobre videojuegos. Escribe un guión de 15 a 20 segundos optimizado para retención total sobre el juego "${activeEditingGame.title}".

El juego se destaca principalmente por: "${feature || 'ser increíblemente entretenido'}".

RESTRICCIONES Y ESTILO ANTI-IA (¡MUY IMPORTANTE!):
* PROHIBIDO USAR las siguientes palabras o frases de IA: "adéntrate en", "sumérgete", "en conclusión", "descubre un mundo", "revolucionario", "es importante destacar", "épica aventura", "paisaje digital", "sin embargo", "además".
* No uses introducciones de bienvenida (como 'Hola a todos').
* Habla como un streamer de Twitch, tiktoker gamer o youtuber irreverente. Lenguaje coloquial, frases cortas, dinámico y muy directo al punto. Cero lenguaje corporativo.

FORMATO ESTRICTO:
Debes devolver la respuesta EXACTAMENTE con este formato, sin añadir texto extra al principio ni al final. Solo rellena los textos:

[Gancho 0-3s]
Voz en off: "(Escribe aquí una frase muy llamativa que detenga el scroll sin decir el nombre del juego)"
Texto en pantalla: "(Orden visual CapCut style)"

[Desarrollo 3-12s]
Voz en off: "(Explica por qué es increíble con tono enérgico)"
Texto en pantalla: "(Texto corto para pantalla)"

[CTA 12-15s]
Voz en off: "Consíguelo buscando ${activeEditingGame.title} en el link de mi perfil."
Texto en pantalla: "DESCARGA EN EL LINK DEL PERFIL 📥"

[Entonación de Voz]
- Tono: (Tu instrucción)
- Velocidad: (Tu instrucción)
- Emoción: (Tu instrucción)

[Ideas de B-Roll / Video]
1. (Idea 1 de qué clip de YouTube buscar)
2. (Idea 2)
3. (Idea 3)`;

        try {
          const groqKey = localStorage.getItem('godzgames-groq-key');
          if (!groqKey) {
             throw new Error('No se encontró la clave de Groq API. Inicia sesión en el panel admin nuevamente e ingrésala.');
          }

          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${groqKey}`
            },
            body: JSON.stringify({
              messages: [{ role: 'user', content: aiPrompt }],
              model: 'llama3-8b-8192',
              temperature: 0.7
            })
          });
          
          if (!res.ok) throw new Error('Error de conexión o token inválido con Groq');
          const data = await res.json();
          const aiResponseText = data.choices[0].message.content;
          
          scriptEl.value = aiResponseText;
          statusEl.className = 'admin-status-message success';
          statusEl.textContent = '✅ ¡Guion generado exitosamente!';
        } catch (err) {
          statusEl.className = 'admin-status-message error';
          statusEl.textContent = '❌ ' + (err.message || 'Hubo un error al generar el guion.');
          console.error(err);
        }
      });
    }

    // === Image URL preview & GitHub Upload ===
    ['admin-edit-cover', 'admin-edit-screen1', 'admin-edit-screen2'].forEach((id, i) => {
      const input = document.getElementById(id);
      const previewId = ['preview-cover', 'preview-screen1', 'preview-screen2'][i];
      const fileId = ['admin-upload-cover', 'admin-upload-screen1', 'admin-upload-screen2'][i];
      const fileInput = document.getElementById(fileId);
      const uploadLabel = document.querySelector(`label[for="${fileId}"]`);
      
      // Make sure the upload label is visible now!
      if (uploadLabel) uploadLabel.style.display = 'inline-flex';

      // Handle preview on text input change
      if (input) {
        input.addEventListener('input', () => {
          const previewWrap = document.getElementById(previewId);
          if (previewWrap && input.value.trim()) {
            previewWrap.innerHTML = `<img src="${input.value.trim()}" alt="Preview" onerror="this.style.display='none'" />`;
          } else if (previewWrap) {
            previewWrap.innerHTML = '';
          }
        });
      }

      // Handle file upload via GitHub API
      if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (!file) return;

          const githubToken = document.getElementById('admin-github-token-input')?.value.trim();
          if (!githubToken) {
            alert('Para subir imágenes directamente, necesitas ingresar tu "GitHub Token" en la pantalla de acceso del administrador.');
            fileInput.value = '';
            return;
          }

          const originalText = uploadLabel.innerHTML;
          uploadLabel.innerHTML = 'Subiendo...';
          uploadLabel.style.opacity = '0.7';
          uploadLabel.style.pointerEvents = 'none';

          try {
            // Convert to Base64
            const reader = new FileReader();
            reader.readAsDataURL(file);
            await new Promise((resolve) => reader.onload = () => resolve());
            const base64Content = reader.result.split(',')[1];

            // Clean filename and add timestamp
            const ext = file.name.split('.').pop();
            const safeName = file.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            const filename = `img_${Date.now()}_${safeName}.${ext}`;
            const path = `public/uploads/games/${filename}`;

            const res = await fetch(`https://api.github.com/repos/godzgame/godzgames/contents/${path}`, {
              method: 'PUT',
              headers: {
                'Authorization': `token ${githubToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                message: `Upload game image: ${filename}`,
                content: base64Content
              })
            });

            if (!res.ok) {
              const errData = await res.json();
              throw new Error(errData.message || 'Error al subir a GitHub');
            }

            // Successfully uploaded, set the URL to raw.githubusercontent
            const rawUrl = `https://raw.githubusercontent.com/godzgame/godzgames/main/${path}`;
            if (input) {
              input.value = rawUrl;
              // Trigger preview
              input.dispatchEvent(new Event('input'));
            }
          } catch (err) {
            alert(`Hubo un error al subir la imagen: ${err.message}`);
          } finally {
            uploadLabel.innerHTML = originalText;
            uploadLabel.style.opacity = '1';
            uploadLabel.style.pointerEvents = 'auto';
            fileInput.value = '';
          }
        });
      }
    });

    // Hide scraping panel (no backend)
    const scrapePanel = document.getElementById('scrape-panel');
    if (scrapePanel) scrapePanel.style.display = 'none';

    // Hide Excel import (no backend)
    const excelImportLabel = document.querySelector('label[for="admin-import-excel"]');
    if (excelImportLabel) excelImportLabel.style.display = 'none';

    // Add Game modal — static version: just shows instruction
    const addGameOpenBtn = document.getElementById('admin-add-game-btn');
    if (addGameOpenBtn) {
      addGameOpenBtn.addEventListener('click', () => {
        alert(currentLang === 'es'
          ? 'Para agregar juegos, edita el archivo src/data/games.json y sube los cambios al servidor via FTP.'
          : 'To add games, edit src/data/games.json and upload the updated file to your server via FTP.');
      });
    }

    // Check for deep link to open a specific news article
    const urlParams = new URLSearchParams(window.location.search);
    const newsIdParam = urlParams.get('newsId');
    if (newsIdParam) {
      const targetNews = aiNews.find(n => n.id === newsIdParam);
      if (targetNews) {
        // Use a slight delay to ensure modal transitions smoothly on page load
        setTimeout(() => {
          openModal(targetNews);
        }, 300);
      }
    }
  };

  initializeApp();
});
