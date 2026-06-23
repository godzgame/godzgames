import './style.css';
import data from './data/games.json';

document.addEventListener('DOMContentLoaded', () => {
  const { consoles, games } = data;
  
  // DOM Elements
  const navLinks = document.getElementById('nav-links');
  const tagsList = document.getElementById('tags-list');
  const tickerContent = document.getElementById('ticker-content');
  const featuredGrid = document.getElementById('featured-grid');
  const gamesGrid = document.getElementById('games-grid');
  const homeView = document.getElementById('home-view');
  const gameView = document.getElementById('game-view');
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
  const gamesPerPage = 20;
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
      bannerBtn: "Download Now",
      tagNews: "NEWS",
      // Game Page specific keys
      backToHome: "Back to Home",
      technicalSpecs: "Technical Specifications",
      synopsis: "Synopsis",
      screenshots: "Screenshots",
      downloadLinks: "Download Links",
      downloadServer: "Download Server",
      fileFormat: "File Format",
      action: "Action",
      downloadBtn: "Download",
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
      bannerBtn: "Descargar Ahora",
      tagNews: "NOTICIA",
      // Game Page specific keys
      backToHome: "Volver al Inicio",
      technicalSpecs: "Especificaciones Técnicas",
      synopsis: "Sinopsis",
      screenshots: "Capturas de Pantalla",
      downloadLinks: "Enlaces de Descarga",
      downloadServer: "Servidor de Descarga",
      fileFormat: "Formato de Archivo",
      action: "Acción",
      downloadBtn: "Descargar",
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

  // Helper function to guess file format
  const getFileFormat = (consoleName) => {
    const name = consoleName.toUpperCase();
    if (name.includes('SWITCH')) return 'NSP / XCI / NSZ';
    if (name.includes('3DS')) return 'CIA / 3DS';
    if (name.includes('DS')) return 'NDS';
    if (name.includes('WII U')) return 'WUX / WUA / Loadiine';
    if (name.includes('WII')) return 'ISO / WBFS';
    if (name.includes('PSP')) return 'ISO / CSO';
    if (name.includes('PSVITA')) return 'VPK / NoNpDRM';
    if (name.includes('PS2') || name.includes('PS3') || name.includes('PSX')) return 'ISO / PKG';
    if (name.includes('PS4') || name.includes('PS5')) return 'PKG';
    if (name.includes('PC')) return 'ZIP / ISO / EXE';
    if (name.includes('XBOX')) return 'ISO';
    return 'ROM / ISO';
  };

  // Render Navigation
  const renderNav = () => {
    const allText = translations[currentLang].all;
    navLinks.innerHTML = `<li><a href="#" class="nav-item ${currentCategory === 'ALL' ? 'active' : ''}" data-cat="ALL">${allText}</a></li>`;
    consoles.forEach(c => {
      navLinks.innerHTML += `<li><a href="#" class="nav-item ${currentCategory === c ? 'active' : ''}" data-cat="${c}">${c}</a></li>`;
    });

    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = ''; // Return to home on category click
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        e.target.classList.add('active');
        currentCategory = e.target.dataset.cat;
        currentPage = 1;
        renderGames();
      });
    });
  };

  // Render Tags
  const renderTags = () => {
    const topConsoles = consoles.slice(0, 8);
    tagsList.innerHTML = topConsoles.map(c => `<span>#${c.toLowerCase()}</span>`).join('');
  };

  // AI News Data (Will be fetched from backend)
  let aiNews = [];

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

  const openModal = (newsItem) => {
    const loc = getLocalizedNews(newsItem);
    
    modalImage.src = newsItem.image || '';
    modalTag.textContent = loc.tag;
    modalTitle.textContent = loc.title;
    
    const paragraphs = loc.fullContent
      ? loc.fullContent.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
      : `<p>${loc.description}</p>`;
    modalBody.innerHTML = paragraphs;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  };

  modalClose.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Helper function to create an AI News card
  const createNewsCard = (news, isPrimary) => {
    const loc = getLocalizedNews(news);
    return `
      <div class="featured-item" data-id="${news.id}">
        <img src="${news.image || ''}" alt="${loc.title}" loading="lazy" />
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
    const coverUrl = game.cover ? game.cover : `https://tse2.mm.bing.net/th?q=${encodeURIComponent(game.title + ' ' + game.console + ' official retail cover front')}&w=300`;
    
    const imageHtml = `<img src="${coverUrl}" alt="${game.title}" loading="lazy"/>`;

    const btnText = translations[currentLang].getLink;
    return `
      <div class="game-card">
        <div class="card-img-wrap" onclick="window.location.hash='#/game/${game.id}'">
          <span class="card-category">${game.console}</span>
          ${imageHtml}
        </div>
        <div class="card-content">
          <h3 class="card-title" onclick="window.location.hash='#/game/${game.id}'" style="cursor:pointer;">${game.title}</h3>
          <a href="#/game/${game.id}" class="card-btn">${btnText}</a>
        </div>
      </div>
    `;
  };

  // Render Games and News
  const renderGames = () => {
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

    // Toggle news sections visibility depending on search query
    const newsTicker = document.querySelector('.news-flash');
    if (searchQuery.trim().length > 0) {
      if (featuredGrid) featuredGrid.style.display = 'none';
      if (newsTicker) newsTicker.style.display = 'none';
    } else {
      if (featuredGrid) featuredGrid.style.display = 'grid';
      if (newsTicker) newsTicker.style.display = 'flex';

      // Render Featured News (Fetched from backend)
      if (aiNews.length >= 3) {
        featuredGrid.innerHTML = `
          ${createNewsCard(aiNews[0], true)}
          ${createNewsCard(aiNews[1], false)}
          ${createNewsCard(aiNews[2], false)}
        `;

        // Attach click event listeners to open the modal
        featuredGrid.querySelectorAll('.featured-item').forEach(el => {
          el.addEventListener('click', () => {
            const id = el.dataset.id;
            const newsItem = aiNews.find(n => n.id === id);
            if (newsItem) {
              openModal(newsItem);
            }
          });
        });
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

  // Fetch Game Details directly from Pollinations.ai (no backend needed)
  const fetchGameDetails = async (gameTitle, gameConsole, gameId) => {
    const cacheKey = `game-details-${gameId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);

    const fallback = {
      genre: { en: 'Action / Adventure', es: 'Accion / Aventura' },
      releaseDate: { en: 'Unknown', es: 'Desconocido' },
      publisher: { en: 'N/A', es: 'N/A' },
      developer: { en: 'N/A', es: 'N/A' },
      size: { en: 'Unknown Size', es: 'Tamano Desconocido' },
      description: {
        en: `Download ${gameTitle} for the ${gameConsole} console. High-speed and secure download links are available below.`,
        es: `Descarga ${gameTitle} para la consola ${gameConsole}. Enlaces de descarga segura de alta velocidad disponibles abajo.`
      }
    };

    try {
      const prompt = `You are a bi-lingual gaming database editor. Generate a data sheet for "${gameTitle}" on "${gameConsole}". Output ONLY valid JSON:
{"genre":{"en":"...","es":"..."},"releaseDate":{"en":"...","es":"..."},"publisher":{"en":"...","es":"..."},"developer":{"en":"...","es":"..."},"size":{"en":"...","es":"..."},"description":{"en":"80-100 word synopsis in English.","es":"Sinopsis de 80-100 palabras en espanol."}}`;

      const res = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          model: 'openai',
          jsonMode: true
        })
      });

      if (!res.ok) throw new Error(`Pollinations returned ${res.status}`);
      let rawText = await res.text();
      const jsonStart = rawText.indexOf('{');
      const jsonEnd = rawText.lastIndexOf('}') + 1;
      if (jsonStart === -1 || jsonEnd === 0) throw new Error('No JSON in response');
      const gameDetails = JSON.parse(rawText.substring(jsonStart, jsonEnd));
      localStorage.setItem(cacheKey, JSON.stringify(gameDetails));
      return gameDetails;
    } catch (e) {
      console.error('[GodZGames] Error fetching game details:', e);
      return fallback;
    }
  };

  // Render Game Details View
  const renderGamePage = async (game) => {
    homeView.style.display = 'none';
    gameView.style.display = 'block';
    
    // Set loading skeletons
    const t = translations[currentLang];
    const format = getFileFormat(game.console);
    const coverUrl = game.cover ? game.cover : `https://tse2.mm.bing.net/th?q=${encodeURIComponent(game.title + ' ' + game.console + ' official retail cover front')}&w=400`;
    
    // Screens URL
    const screenUrl1 = `https://image.pollinations.ai/prompt/High%20quality%20gameplay%20screenshot%20of%20video%20game%20${encodeURIComponent(game.title)}%20on%20${encodeURIComponent(game.console)}?width=800&height=450&nologo=true`;
    const screenUrl2 = `https://image.pollinations.ai/prompt/Cinematic%20action%20screenshot%20of%20video%20game%20${encodeURIComponent(game.title)}%20on%20${encodeURIComponent(game.console)}?width=800&height=450&nologo=true`;

    gameView.innerHTML = `
      <div class="breadcrumb">
        <a href="#">Home</a> &gt; <span>${game.console}</span> &gt; <span style="color:#fff;">${game.title}</span>
      </div>
      <div class="game-detail-wrap">
        <div class="game-sidebar">
          <div class="game-cover-box">
            <img src="${coverUrl}" alt="${game.title}" />
          </div>
          <table class="game-meta-table">
            <tr><td>Console:</td><td>${game.console}</td></tr>
            <tr><td>${t.format}:</td><td>${format}</td></tr>
            <tr><td>${t.genre}:</td><td class="skeleton skeleton-text" style="width: 80px;"></td></tr>
            <tr><td>${t.releaseDate}:</td><td class="skeleton skeleton-text" style="width: 50px;"></td></tr>
            <tr><td>${t.developer}:</td><td class="skeleton skeleton-text" style="width: 70px;"></td></tr>
            <tr><td>${t.publisher}:</td><td class="skeleton skeleton-text" style="width: 70px;"></td></tr>
            <tr><td>${t.fileSize}:</td><td class="skeleton skeleton-text" style="width: 60px;"></td></tr>
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
          <div class="game-screenshots">
            <h3>${t.screenshots}</h3>
            <div class="screenshots-grid">
              <div class="screenshot-item">
                <img src="${screenUrl1}" alt="${game.title} Screenshot 1" />
              </div>
              <div class="screenshot-item">
                <img src="${screenUrl2}" alt="${game.title} Screenshot 2" />
              </div>
            </div>
          </div>
          <div class="download-section-box">
            <h3>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
              ${t.downloadLinks}
            </h3>
            <div class="download-list">
              <div class="download-link-row">
                <div class="download-provider">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--color-secondary)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                  <span>1fichier Link</span>
                  <span class="download-format-badge">MIRROR 1</span>
                </div>
                <a href="${game.link}" target="_blank" class="download-action-btn">${t.downloadBtn}</a>
              </div>
              <div class="download-link-row">
                <div class="download-provider">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--color-secondary)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                  <span>Mega Mirror</span>
                  <span class="download-format-badge">MIRROR 2</span>
                </div>
                <a href="${game.link}" target="_blank" class="download-action-btn">${t.downloadBtn}</a>
              </div>
              <div class="download-link-row">
                <div class="download-provider">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--color-secondary)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                  <span>Google Drive Mirror</span>
                  <span class="download-format-badge">MIRROR 3</span>
                </div>
                <a href="${game.link}" target="_blank" class="download-action-btn">${t.downloadBtn}</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Fetch details asynchronously
    const details = await fetchGameDetails(game.title, game.console, game.id);
    
    // Extract localized values safely
    const getField = (fieldVal) => {
      if (!fieldVal) return 'N/A';
      if (typeof fieldVal === 'object') {
        return fieldVal[currentLang] || fieldVal['en'] || fieldVal['es'] || 'N/A';
      }
      return fieldVal;
    };

    const genre = getField(details.genre);
    const releaseDate = getField(details.releaseDate);
    const developer = getField(details.developer);
    const publisher = getField(details.publisher);
    const size = getField(details.size);
    const description = getField(details.description);

    // Apply custom overrides if defined
    const finalCoverUrl = details.customCover || coverUrl;
    const finalScreenUrl1 = (details.customScreens && details.customScreens[0]) || screenUrl1;
    const finalScreenUrl2 = (details.customScreens && details.customScreens[1]) || screenUrl2;
    const finalLinks = (details.customLinks && details.customLinks.length > 0)
      ? details.customLinks
      : [game.link, game.link, game.link];

    // Inject retrieved details into page and remove skeletons
    const sidebar = gameView.querySelector('.game-sidebar');
    const synopsisContainer = gameView.querySelector('.game-synopsis');
    
    sidebar.innerHTML = `
      <div class="game-cover-box">
        <img src="${finalCoverUrl}" alt="${game.title}" />
      </div>
      <table class="game-meta-table">
        <tr><td>Console:</td><td>${game.console}</td></tr>
        <tr><td>${t.format}:</td><td>${format}</td></tr>
        <tr><td>${t.genre}:</td><td>${genre}</td></tr>
        <tr><td>${t.releaseDate}:</td><td>${releaseDate}</td></tr>
        <tr><td>${t.developer}:</td><td>${developer}</td></tr>
        <tr><td>${t.publisher}:</td><td>${publisher}</td></tr>
        <tr><td>${t.fileSize}:</td><td>${size}</td></tr>
      </table>
    `;

    synopsisContainer.innerHTML = `
      <h3>${t.synopsis}</h3>
      <p>${description}</p>
    `;
    
    // Update screenshot sources
    const screenshotImgs = gameView.querySelectorAll('.screenshot-item img');
    if (screenshotImgs[0]) screenshotImgs[0].src = finalScreenUrl1;
    if (screenshotImgs[1]) screenshotImgs[1].src = finalScreenUrl2;

    // Update download mirror buttons
    const mirrorLinks = gameView.querySelectorAll('.download-action-btn');
    mirrorLinks.forEach((btn, idx) => {
      btn.href = finalLinks[idx] || game.link;
    });
    
    // Dynamically update sizes in mirrors
    const mirrorBadges = gameView.querySelectorAll('.download-format-badge');
    mirrorBadges.forEach((badge, idx) => {
      badge.textContent = `MIRROR ${idx + 1} (${size})`;
    });
  };

  // Reset state to show home view and reset category to ALL
  const goToHome = (e) => {
    if (e) e.preventDefault();
    currentCategory = 'ALL';
    currentPage = 1; // Reset to page 1 when returning home
    
    // Clear search query and clear inputs
    searchQuery = '';
    if (headerSearchInput) headerSearchInput.value = '';
    if (headerSearchClear) headerSearchClear.style.display = 'none';
    
    // Reset category tabs active state in navigation
    document.querySelectorAll('.nav-item').forEach(nav => {
      if (nav.dataset.cat === 'ALL') {
        nav.classList.add('active');
      } else {
        nav.classList.remove('active');
      }
    });

    window.location.hash = ''; // Triggers routing to show home view
    renderGames(); // Renders with ALL category
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
  const ADMIN_PASSWORD_HASH = '5197385424cec0b6f8eec13f9ef9a1852d7c2252ec46d5ca0a8b521311d55153'; // sha256 of admin password

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
    
    const details = await fetchGameDetails(game.title, game.console, game.id);
    
    document.getElementById('admin-edit-cover').value = details.customCover || '';
    document.getElementById('admin-edit-screen1').value = (details.customScreens && details.customScreens[0]) || '';
    document.getElementById('admin-edit-screen2').value = (details.customScreens && details.customScreens[1]) || '';
    
    const getVal = (obj, langKey) => {
      if (!obj) return '';
      if (typeof obj === 'object') return obj[langKey] || obj['en'] || obj['es'] || '';
      return obj;
    };
    
    document.getElementById('admin-edit-genre-en').value = getVal(details.genre, 'en');
    document.getElementById('admin-edit-genre-es').value = getVal(details.genre, 'es');
    document.getElementById('admin-edit-size-en').value = getVal(details.size, 'en');
    document.getElementById('admin-edit-size-es').value = getVal(details.size, 'es');
    document.getElementById('admin-edit-dev-en').value = getVal(details.developer, 'en');
    document.getElementById('admin-edit-dev-es').value = getVal(details.developer, 'es');
    document.getElementById('admin-edit-pub-en').value = getVal(details.publisher, 'en');
    document.getElementById('admin-edit-pub-es').value = getVal(details.publisher, 'es');
    document.getElementById('admin-edit-date-en').value = getVal(details.releaseDate, 'en');
    document.getElementById('admin-edit-date-es').value = getVal(details.releaseDate, 'es');
    
    document.getElementById('admin-edit-desc-en').value = getVal(details.description, 'en');
    document.getElementById('admin-edit-desc-es').value = getVal(details.description, 'es');
    
    const customLinks = details.customLinks || [];
    document.getElementById('admin-edit-link1').value = customLinks[0] || game.link || '';
    document.getElementById('admin-edit-link2').value = customLinks[1] || game.link || '';
    document.getElementById('admin-edit-link3').value = customLinks[2] || game.link || '';

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
    
    adminDashboard.style.display = 'none';
    adminEditor.style.display = 'block';
  };

  // Save admin game edits directly to localStorage (no backend)
  const saveAdminGameEdits = () => {
    if (!activeEditingGame) return;

    const customCover = document.getElementById('admin-edit-cover').value.trim();
    const customScreens = [
      document.getElementById('admin-edit-screen1').value.trim(),
      document.getElementById('admin-edit-screen2').value.trim()
    ].filter(url => url.length > 0);

    const customLinks = [
      document.getElementById('admin-edit-link1').value.trim(),
      document.getElementById('admin-edit-link2').value.trim(),
      document.getElementById('admin-edit-link3').value.trim()
    ].filter(url => url.length > 0);

    const savedData = {
      genre: {
        en: document.getElementById('admin-edit-genre-en').value.trim(),
        es: document.getElementById('admin-edit-genre-es').value.trim()
      },
      size: {
        en: document.getElementById('admin-edit-size-en').value.trim(),
        es: document.getElementById('admin-edit-size-es').value.trim()
      },
      developer: {
        en: document.getElementById('admin-edit-dev-en').value.trim(),
        es: document.getElementById('admin-edit-dev-es').value.trim()
      },
      publisher: {
        en: document.getElementById('admin-edit-pub-en').value.trim(),
        es: document.getElementById('admin-edit-pub-es').value.trim()
      },
      releaseDate: {
        en: document.getElementById('admin-edit-date-en').value.trim(),
        es: document.getElementById('admin-edit-date-es').value.trim()
      },
      description: {
        en: document.getElementById('admin-edit-desc-en').value.trim(),
        es: document.getElementById('admin-edit-desc-es').value.trim()
      },
      customCover: customCover || undefined,
      customScreens: customScreens.length > 0 ? customScreens : undefined,
      customLinks: customLinks.length > 0 ? customLinks : undefined
    };

    const cacheKey = `game-details-${activeEditingGame.id}`;
    localStorage.setItem(cacheKey, JSON.stringify(savedData));

    adminEditStatus.textContent = currentLang === 'es' ? 'Cambios guardados localmente' : 'Changes saved locally';
    adminEditStatus.className = 'admin-status-message success';
    adminEditStatus.style.display = 'block';
    setTimeout(() => showAdminDashboard(), 1200);
  };

  // Static admin login: hash password client-side and compare
  const handleAdminLogin = async () => {
    const password = adminPasswordInput.value.trim();
    if (!password) {
      adminLoginError.textContent = currentLang === 'es' ? 'Por favor ingrese la contrasena' : 'Please enter the password';
      adminLoginError.style.display = 'block';
      return;
    }

    const hash = await hashString(password);
    if (hash === ADMIN_PASSWORD_HASH) {
      localStorage.setItem('godzgames-admin-token', hash);
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
    gameView.style.display = 'none';
    homeView.style.display = 'block';
    adminView.style.display = 'none';
  };

  // Basic client-side router
  const handleRouting = () => {
    const hash = window.location.hash;
    if (hash.startsWith('#/game/')) {
      adminView.style.display = 'none';
      homeView.style.display = 'none';
      gameView.style.display = 'block';
      const gameId = hash.replace('#/game/', '');
      const game = games.find(g => g.id === gameId);
      if (game) {
        renderGamePage(game);
      } else {
        window.location.hash = '';
      }
    } else if (hash === '#/admin') {
      homeView.style.display = 'none';
      gameView.style.display = 'none';
      adminView.style.display = 'block';
      renderAdminPage();
    } else {
      adminView.style.display = 'none';
      showHomePage();
      renderGames();
    }
  };

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
    document.getElementById('lang-en').classList.toggle('active', lang === 'en');
    document.getElementById('lang-es').classList.toggle('active', lang === 'es');

    // Re-render dynamic elements
    renderNav();
    renderTicker();
    
    const hash = window.location.hash;
    if (hash.startsWith('#/game/')) {
      const gameId = hash.replace('#/game/', '');
      const game = games.find(g => g.id === gameId);
      if (game) {
        renderGamePage(game);
      }
    } else if (hash === '#/admin') {
      renderAdminPage();
    } else {
      renderGames();
    }
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

    // Render games immediately with bundled data (no waiting for backend)
    updateLanguage(currentLang);
    renderTags();
    handleRouting();

    // Attach switch language listeners
    document.getElementById('lang-en').addEventListener('click', (e) => {
      e.preventDefault();
      updateLanguage('en');
    });
    document.getElementById('lang-es').addEventListener('click', (e) => {
      e.preventDefault();
      updateLanguage('es');
    });

    // Attach click listeners to return home
    if (logo) logo.addEventListener('click', goToHome);
    if (navHome) navHome.addEventListener('click', goToHome);

    // Attach header search event listeners
    if (headerSearchInput && headerSearchClear) {
      headerSearchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        currentPage = 1; // Reset to page 1 on search input
        
        // Show/hide clear button
        if (searchQuery.length > 0) {
          headerSearchClear.style.display = 'block';
        } else {
          headerSearchClear.style.display = 'none';
        }

        // Return to home if on a game details page or admin page
        if ((window.location.hash.startsWith('#/game/') || window.location.hash === '#/admin') && searchQuery.trim().length > 0) {
          window.location.hash = ''; // Triggers routing to show homepage
        } else {
          renderGames();
        }
      });

      headerSearchClear.addEventListener('click', () => {
        headerSearchInput.value = '';
        searchQuery = '';
        currentPage = 1; // Reset to page 1 on search clear
        headerSearchClear.style.display = 'none';
        renderGames();
      });
    }

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

    // === Image URL preview (no upload to server — user pastes URL directly) ===
    ['admin-edit-cover', 'admin-edit-screen1', 'admin-edit-screen2'].forEach((id, i) => {
      const input = document.getElementById(id);
      const previewId = ['preview-cover', 'preview-screen1', 'preview-screen2'][i];
      // Hide upload buttons since there's no server to upload to
      const fileId = ['admin-upload-cover', 'admin-upload-screen1', 'admin-upload-screen2'][i];
      const uploadLabel = document.querySelector(`label[for="${fileId}"]`);
      if (uploadLabel) uploadLabel.style.display = 'none';
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

    // === Fetch news in background — 3-tier approach for maximum reliability ===
    (async () => {
      const parseRssXml = (xmlText) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'text/xml');
        const items = Array.from(doc.querySelectorAll('item')).slice(0, 3);
        if (items.length === 0) throw new Error('No items in RSS');

        return items.map((item, i) => {
          let title = item.querySelector('title')?.textContent || '';
          const lastDash = title.lastIndexOf(' - ');
          if (lastDash !== -1) title = title.substring(0, lastDash).trim();

          const link = item.querySelector('link')?.textContent || '#';
          const desc = (item.querySelector('description')?.textContent || '')
            .replace(/<[^>]+>/g, '').trim();
          const shortDesc = desc.length > 150 ? desc.substring(0, 147) + '...' : desc;

          const cleanForImg = title.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 60);
          const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent('video game news article illustration: ' + cleanForImg + '. Vibrant colors, cinematic, no text')}?width=800&height=500&nologo=true&seed=${i}`;

          return {
            id: `news-${i}`,
            tag: 'NEWS',
            image: imageUrl,
            link,
            en: { title, description: shortDesc, fullContent: desc },
            es: { title, description: shortDesc, fullContent: desc }
          };
        });
      };

      const applyNews = (items) => {
        if (items.length === 0) return;
        aiNews = items;
        renderTicker();
        const hash = window.location.hash;
        if (!hash.startsWith('#/game/') && hash !== '#/admin') renderGames();
      };

      const rssTarget = 'https://news.google.com/rss/search?q=video+games&hl=en-US&gl=US&ceid=US:en';

      // Tier 1: corsproxy.io
      try {
        const res = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(rssTarget)}`);
        if (!res.ok) throw new Error(`corsproxy ${res.status}`);
        const xml = await res.text();
        applyNews(parseRssXml(xml));
        return;
      } catch (e) {
        console.warn('[GodZGames] Tier 1 news proxy failed:', e.message);
      }

      // Tier 2: allorigins.win
      try {
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(rssTarget)}`);
        if (!res.ok) throw new Error(`allorigins ${res.status}`);
        const data = await res.json();
        applyNews(parseRssXml(data.contents));
        return;
      } catch (e) {
        console.warn('[GodZGames] Tier 2 news proxy failed:', e.message);
      }

      // Tier 3: static fallback so news section is never empty
      applyNews([
        { id: 'news-0', tag: 'NEWS', image: 'https://image.pollinations.ai/prompt/Epic%20video%20game%20battle%20scene%20cinematic?width=800&height=500&nologo=true&seed=10', link: 'https://www.ign.com/articles/best-games', en: { title: 'The Best Games of 2025 — Our Top Picks', description: 'From epic RPGs to indie gems, 2025 has been a spectacular year for gaming. Here are the must-play titles.', fullContent: '' }, es: { title: 'Los Mejores Juegos de 2025 — Nuestras Recomendaciones', description: 'Desde RPGs épicos hasta joyas indie, 2025 ha sido un año espectacular para los videojuegos.', fullContent: '' } },
        { id: 'news-1', tag: 'NEWS', image: 'https://image.pollinations.ai/prompt/Futuristic%20gaming%20setup%20neon%20lights?width=800&height=500&nologo=true&seed=11', link: 'https://www.eurogamer.net/', en: { title: 'Next-Gen Gaming: What\'s Coming in 2026', description: 'Major studios are gearing up for their biggest releases yet. Here\'s what\'s on the horizon for gamers worldwide.', fullContent: '' }, es: { title: 'Próxima Generación: Lo que Viene en 2026', description: 'Los grandes estudios se preparan para sus mayores lanzamientos. Esto es lo que viene para los jugadores.', fullContent: '' } },
        { id: 'news-2', tag: 'NEWS', image: 'https://image.pollinations.ai/prompt/Nintendo%20Switch%20gaming%20concept%20art?width=800&height=500&nologo=true&seed=12', link: 'https://www.nintendolife.com/', en: { title: 'Nintendo Reveals Exciting New Switch Titles', description: 'Nintendo continues to impress with a fresh lineup of exclusives bringing beloved franchises back to the spotlight.', fullContent: '' }, es: { title: 'Nintendo Revela Nuevos Títulos para Switch', description: 'Nintendo sigue impresionando con una nueva línea de exclusivos que traen de vuelta franquicias queridas.', fullContent: '' } }
      ]);
    })();
  };

  initializeApp();
});
