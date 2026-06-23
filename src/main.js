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
  let gamesStatusMap = {};
  let adminSelectedConsole = '';
  let adminSelectedLetter = 'ALL';
  const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://godzgames-backend.onrender.com';

  const getFullImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://localhost:3000')) {
      return url.replace('http://localhost:3000', API_BASE_URL);
    }
    if (url.startsWith('/uploads/')) {
      return `${API_BASE_URL}${url}`;
    }
    return url;
  };

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
    
    modalImage.src = getFullImageUrl(newsItem.image);
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
        <img src="${getFullImageUrl(news.image)}" alt="${loc.title}" loading="lazy" />
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
    const coverUrl = game.cover ? getFullImageUrl(game.cover) : `https://tse2.mm.bing.net/th?q=${encodeURIComponent(game.title + ' ' + game.console + ' official retail cover front')}&w=300`;
    
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

  // Fetch Game Details dynamically using the backend proxy
  const fetchGameDetails = async (gameTitle, gameConsole, gameId) => {
    const cacheKey = `game-details-${gameId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);

    try {
      const url = `${API_BASE_URL}/api/game-details?title=${encodeURIComponent(gameTitle)}&consoleName=${encodeURIComponent(gameConsole)}&id=${encodeURIComponent(gameId)}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const data = await res.json();
      localStorage.setItem(cacheKey, JSON.stringify(data));
      return data;
    } catch (e) {
      console.error("Error fetching game details from backend:", e);
      return {
        genre: { en: "Action / Adventure", es: "Acción / Aventura" },
        releaseDate: { en: "Unknown", es: "Desconocido" },
        publisher: { en: "N/A", es: "N/A" },
        developer: { en: "N/A", es: "N/A" },
        size: { en: "Unknown Size", es: "Tamaño Desconocido" },
        description: {
          en: `Download ${gameTitle} for the ${gameConsole} console. High-speed and secure download links are available below.`,
          es: `Descarga ${gameTitle} para la consola ${gameConsole}. Enlaces de descarga segura de alta velocidad disponibles abajo.`
        }
      };
    }
  };

  // Render Game Details View
  const renderGamePage = async (game) => {
    homeView.style.display = 'none';
    gameView.style.display = 'block';
    
    // Set loading skeletons
    const t = translations[currentLang];
    const format = getFileFormat(game.console);
    const coverUrl = game.cover ? getFullImageUrl(game.cover) : `https://tse2.mm.bing.net/th?q=${encodeURIComponent(game.title + ' ' + game.console + ' official retail cover front')}&w=400`;
    
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
    const finalCoverUrl = getFullImageUrl(details.customCover || coverUrl);
    const finalScreenUrl1 = getFullImageUrl((details.customScreens && details.customScreens[0]) || screenUrl1);
    const finalScreenUrl2 = getFullImageUrl((details.customScreens && details.customScreens[1]) || screenUrl2);
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

  const fetchGamesStatus = async () => {
    const token = localStorage.getItem('godzgames-admin-token');
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/games-status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        gamesStatusMap = await response.json();
      }
    } catch (err) {
      console.error("Error fetching games edit status map:", err);
    }
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

  const renderAdminPage = async () => {
    const token = localStorage.getItem('godzgames-admin-token');
    if (!token) {
      showAdminLogin();
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/verify-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        await showAdminDashboard();
      } else {
        localStorage.removeItem('godzgames-admin-token');
        showAdminLogin();
      }
    } catch (e) {
      console.error("Error verifying admin token:", e);
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
      const status = gamesStatusMap[game.id] || 'pending';
      let badgeHtml = '';
      if (status === 'manual') {
        badgeHtml = `<span class="status-badge status-manual">${currentLang === 'es' ? 'Manual' : 'Manual'}</span>`;
      } else if (status === 'automatic') {
        badgeHtml = `<span class="status-badge status-automatic">${currentLang === 'es' ? 'Auto' : 'Auto'}</span>`;
      } else {
        badgeHtml = `<span class="status-badge status-pending">${currentLang === 'es' ? 'Pendiente' : 'Pending'}</span>`;
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

  const saveAdminGameEdits = async () => {
    if (!activeEditingGame) return;

    const token = localStorage.getItem('godzgames-admin-token');
    if (!token) {
      adminEditStatus.textContent = currentLang === 'es' ? 'Error: Sesión expirada' : 'Error: Session expired';
      adminEditStatus.className = 'admin-status-message error';
      adminEditStatus.style.display = 'block';
      return;
    }

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

    const customData = {
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

    adminEditStatus.textContent = currentLang === 'es' ? 'Guardando cambios...' : 'Saving changes...';
    adminEditStatus.className = 'admin-status-message';
    adminEditStatus.style.display = 'block';

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/save-game`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: activeEditingGame.id,
          title: activeEditingGame.title,
          consoleName: activeEditingGame.console,
          customData
        })
      });

      if (res.ok) {
        const result = await res.json();
        
        const cacheKey = `game-details-${activeEditingGame.id}`;
        localStorage.setItem(cacheKey, JSON.stringify(result.details));

        adminEditStatus.textContent = currentLang === 'es' ? 'Cambios guardados con éxito' : 'Changes saved successfully';
        adminEditStatus.className = 'admin-status-message success';
        adminEditStatus.style.display = 'block';

        setTimeout(() => {
          showAdminDashboard();
        }, 1500);
      } else {
        const errorData = await res.json();
        adminEditStatus.textContent = `Error: ${errorData.error || 'Server error'}`;
        adminEditStatus.className = 'admin-status-message error';
        adminEditStatus.style.display = 'block';
      }
    } catch (e) {
      console.error(e);
      adminEditStatus.textContent = currentLang === 'es' ? 'Error al guardar. Verifica la conexión con el servidor.' : 'Failed to save. Check server connection.';
      adminEditStatus.className = 'admin-status-message error';
      adminEditStatus.style.display = 'block';
    }
  };

  const handleAdminLogin = async () => {
    const password = adminPasswordInput.value.trim();
    if (!password) {
      adminLoginError.textContent = currentLang === 'es' ? 'Por favor ingrese la contraseña' : 'Please enter the password';
      adminLoginError.style.display = 'block';
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('godzgames-admin-token', data.token);
        showAdminDashboard();
      } else {
        const err = await res.json();
        adminLoginError.textContent = err.error || (currentLang === 'es' ? 'Contraseña incorrecta' : 'Incorrect password');
        adminLoginError.style.display = 'block';
      }
    } catch (e) {
      console.error(e);
      adminLoginError.textContent = currentLang === 'es' ? 'Error al conectar con el servidor' : 'Failed to connect to the server';
      adminLoginError.style.display = 'block';
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('godzgames-admin-token');
    showAdminLogin();
  };

  const handleExcelImport = async (file) => {
    const statusEl = document.getElementById('admin-import-status');
    if (!statusEl) return;

    const token = localStorage.getItem('godzgames-admin-token');
    if (!token) {
      statusEl.textContent = currentLang === 'es' ? 'Error: Sesión expirada' : 'Error: Session expired';
      statusEl.className = 'admin-status-message error';
      statusEl.style.display = 'block';
      return;
    }

    statusEl.textContent = currentLang === 'es' ? 'Importando archivo Excel...' : 'Importing Excel file...';
    statusEl.className = 'admin-status-message';
    statusEl.style.display = 'block';

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/import-excel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        statusEl.textContent = currentLang === 'es' 
          ? `✓ ${result.message} Nuevos: ${result.newGamesCount}, Enlaces actualizados: ${result.updatedGamesCount}` 
          : `✓ ${result.message} New: ${result.newGamesCount}, Updated links: ${result.updatedGamesCount}`;
        statusEl.className = 'admin-status-message success';
        
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        statusEl.textContent = result.error || (currentLang === 'es' ? 'Error al importar' : 'Import failed');
        statusEl.className = 'admin-status-message error';
      }
    } catch (err) {
      console.error(err);
      statusEl.textContent = currentLang === 'es' ? 'Error al conectar con el servidor' : 'Failed to connect to the server';
      statusEl.className = 'admin-status-message error';
    }
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

    try {
      const response = await fetch(`${API_BASE_URL}/api/news`);
      if (response.ok) {
        aiNews = await response.json();
      }
    } catch (e) {
      console.error("Error fetching news from backend. Is the server running?", e);
    }

    // Initialize with current language
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

    const adminImportExcelInput = document.getElementById('admin-import-excel');
    if (adminImportExcelInput) {
      adminImportExcelInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          handleExcelImport(file);
        }
      });
    }

    // === Scraping Panel Logic ===
    let scrapePollingInterval = null;

    const updateScrapeUI = (state) => {
      const statusBar = document.getElementById('scrape-status-bar');
      const barFill = document.getElementById('scrape-bar-fill');
      const statCached = document.getElementById('scrape-stat-cached');
      const statPending = document.getElementById('scrape-stat-pending');
      const statOk = document.getElementById('scrape-stat-ok');
      const statErr = document.getElementById('scrape-stat-err');
      const statPct = document.getElementById('scrape-stat-pct');
      const currentGame = document.getElementById('scrape-current-game');
      const startBtn = document.getElementById('scrape-start-btn');
      const stopBtn = document.getElementById('scrape-stop-btn');

      if (!statusBar) return;

      const total = state.totalGames || 0;
      const cached = state.cachedCount || 0;
      const pct = total > 0 ? Math.round((cached / total) * 100) : 0;

      statusBar.style.display = 'block';
      if (barFill) barFill.style.width = `${pct}%`;
      if (statCached) statCached.textContent = cached;
      if (statPending) statPending.textContent = state.pendingCount || 0;
      if (statOk) statOk.textContent = state.succeeded || 0;
      if (statErr) statErr.textContent = state.failed || 0;
      if (statPct) statPct.textContent = `${pct}%`;

      if (state.running && state.currentGame) {
        if (currentGame) currentGame.textContent = `⏳ Procesando: ${state.currentGame}`;
      } else if (!state.running && state.stoppedAt) {
        if (currentGame) currentGame.textContent = pct >= 100
          ? '✅ Pre-carga completada para todos los juegos.'
          : '⏹ Pre-carga detenida. Pulsa Iniciar para continuar.';
      } else {
        if (currentGame) currentGame.textContent = '';
      }

      // Toggle Start/Stop buttons
      if (startBtn) startBtn.style.display = state.running ? 'none' : 'inline-flex';
      if (stopBtn) stopBtn.style.display = state.running ? 'inline-flex' : 'none';

      // Stop polling if no longer running
      if (!state.running && scrapePollingInterval) {
        clearInterval(scrapePollingInterval);
        scrapePollingInterval = null;
      }
    };

    const fetchScrapeStatus = async () => {
      const token = localStorage.getItem('godzgames-admin-token');
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/scrape/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const state = await res.json();
          updateScrapeUI(state);
        }
      } catch (_) { /* ignore network errors during polling */ }
    };

    const startScrapePolling = () => {
      if (scrapePollingInterval) clearInterval(scrapePollingInterval);
      scrapePollingInterval = setInterval(fetchScrapeStatus, 3000);
      fetchScrapeStatus(); // immediate first fetch
    };

    const scrapeStartBtn = document.getElementById('scrape-start-btn');
    const scrapeStopBtn = document.getElementById('scrape-stop-btn');
    const scrapeResetBtn = document.getElementById('scrape-reset-btn');

    if (scrapeStartBtn) {
      scrapeStartBtn.addEventListener('click', async () => {
        const token = localStorage.getItem('godzgames-admin-token');
        if (!token) return;
        try {
          scrapeStartBtn.disabled = true;
          scrapeStartBtn.textContent = 'Iniciando...';
          const res = await fetch(`${API_BASE_URL}/api/admin/scrape/start`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            startScrapePolling();
          } else {
            alert('Error al iniciar el scraping.');
          }
        } catch (e) {
          alert('Error de conexión con el servidor.');
        } finally {
          scrapeStartBtn.disabled = false;
          scrapeStartBtn.textContent = '▶ Iniciar';
        }
      });
    }

    if (scrapeStopBtn) {
      scrapeStopBtn.addEventListener('click', async () => {
        const token = localStorage.getItem('godzgames-admin-token');
        if (!token) return;
        try {
          await fetch(`${API_BASE_URL}/api/admin/scrape/stop`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          await fetchScrapeStatus();
        } catch (e) { /* ignore */ }
      });
    }

    if (scrapeResetBtn) {
      scrapeResetBtn.addEventListener('click', async () => {
        const token = localStorage.getItem('godzgames-admin-token');
        if (!token) return;
        if (!confirm('¿Eliminar archivos fallback para que se re-intenten en el próximo scraping?')) return;
        try {
          const res = await fetch(`${API_BASE_URL}/api/admin/scrape/reset-fallbacks`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            alert(data.message);
            await fetchScrapeStatus();
          }
        } catch (e) { /* ignore */ }
      });
    }

    // Auto-fetch status when dashboard is shown (to show already-cached count)
    fetchScrapeStatus();

    // === Add Game Modal Logic ===
    const addGameModal = document.getElementById('add-game-modal');
    const addGameOpenBtn = document.getElementById('admin-add-game-btn');
    const addGameCloseBtn = document.getElementById('add-game-close-btn');
    const addGameCancelBtn = document.getElementById('add-game-cancel-btn');
    const addGameForm = document.getElementById('add-game-form');
    const addGameSubmitBtn = document.getElementById('add-game-submit-btn');
    const addGameError = document.getElementById('add-game-error');

    const openAddGameModal = () => {
      if (addGameModal) {
        addGameModal.style.display = 'flex';
        document.getElementById('add-game-title').value = '';
        document.getElementById('add-game-link').value = '';
        document.getElementById('add-game-cover').value = '';
        if (addGameError) addGameError.style.display = 'none';
        // Focus title field
        setTimeout(() => document.getElementById('add-game-title')?.focus(), 100);
      }
    };

    const closeAddGameModal = () => {
      if (addGameModal) addGameModal.style.display = 'none';
    };

    if (addGameOpenBtn) addGameOpenBtn.addEventListener('click', openAddGameModal);
    if (addGameCloseBtn) addGameCloseBtn.addEventListener('click', closeAddGameModal);
    if (addGameCancelBtn) addGameCancelBtn.addEventListener('click', closeAddGameModal);

    // Close on overlay click
    if (addGameModal) {
      addGameModal.addEventListener('click', (e) => {
        if (e.target === addGameModal) closeAddGameModal();
      });
    }

    // Submit new game
    if (addGameForm) {
      addGameForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('godzgames-admin-token');
        if (!token) { alert('Sesión expirada.'); return; }

        const title = document.getElementById('add-game-title').value.trim();
        const consoleName = document.getElementById('add-game-console').value;
        const link = document.getElementById('add-game-link').value.trim();
        const cover = document.getElementById('add-game-cover').value.trim();

        if (!title) {
          if (addGameError) {
            addGameError.textContent = 'El título es obligatorio.';
            addGameError.style.display = 'block';
          }
          return;
        }

        try {
          addGameSubmitBtn.disabled = true;
          addGameSubmitBtn.textContent = 'Guardando...';
          if (addGameError) addGameError.style.display = 'none';

          const res = await fetch(`${API_BASE_URL}/api/admin/add-game`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title, console: consoleName, link, cover })
          });

          const data = await res.json();

          if (res.ok) {
            closeAddGameModal();
            // Re-fetch games list to show the new game
            try {
              const gamesRes = await fetch('/src/data/games.json');
              if (gamesRes.ok) {
                const gamesData = await gamesRes.json();
                renderAdminGamesList(gamesData.games);
              }
            } catch (_) { /* If can't refresh, user can reload manually */ }
            alert(`✅ Juego "${data.game.title}" agregado correctamente.`);
          } else {
            if (addGameError) {
              addGameError.textContent = data.error || 'Error desconocido.';
              addGameError.style.display = 'block';
            }
          }
        } catch (err) {
          if (addGameError) {
            addGameError.textContent = 'Error de conexión con el servidor.';
            addGameError.style.display = 'block';
          }
        } finally {
          addGameSubmitBtn.disabled = false;
          addGameSubmitBtn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            Guardar Juego
          `;
        }
      });
    }

    // === Image Upload Listeners ===

    const uploadImageToServer = async (file, targetInputId, previewId, labelEl) => {
      const token = localStorage.getItem('godzgames-admin-token');
      if (!token) {
        alert('Sesión expirada. Por favor inicia sesión nuevamente.');
        return;
      }

      // Show loading state on button
      labelEl.classList.add('uploading');
      labelEl.querySelector('svg') && (labelEl.querySelector('svg').style.display = 'none');
      const originalText = labelEl.textContent.trim();
      labelEl.textContent = 'Subiendo...';

      try {
        const formData = new FormData();
        formData.append('image', file);

        const res = await fetch(`${API_BASE_URL}/api/admin/upload-image`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          // Put the returned URL into the text input
          const targetInput = document.getElementById(targetInputId);
          if (targetInput) targetInput.value = data.url;

          // Show preview thumbnail
          const previewWrap = document.getElementById(previewId);
          if (previewWrap) {
            previewWrap.innerHTML = `
              <img src="${data.url}" alt="Preview" />
              <span class="upload-success-tag">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                Imagen guardada correctamente
              </span>
            `;
          }
        } else {
          const err = await res.json();
          alert(`Error al subir: ${err.error || 'Error desconocido'}`);
        }
      } catch (e) {
        console.error('Upload error:', e);
        alert('Error de conexión al subir la imagen.');
      } finally {
        labelEl.classList.remove('uploading');
        labelEl.textContent = '';
        const svgIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgIcon.setAttribute('width', '16'); svgIcon.setAttribute('height', '16');
        svgIcon.setAttribute('viewBox', '0 0 24 24'); svgIcon.setAttribute('fill', 'currentColor');
        svgIcon.innerHTML = '<path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>';
        labelEl.appendChild(svgIcon);
        labelEl.appendChild(document.createTextNode(' Subir'));
      }
    };

    // Attach upload listeners to the three file inputs
    [
      { fileId: 'admin-upload-cover',   targetId: 'admin-edit-cover',   previewId: 'preview-cover' },
      { fileId: 'admin-upload-screen1', targetId: 'admin-edit-screen1', previewId: 'preview-screen1' },
      { fileId: 'admin-upload-screen2', targetId: 'admin-edit-screen2', previewId: 'preview-screen2' }
    ].forEach(({ fileId, targetId, previewId }) => {
      const fileInput = document.getElementById(fileId);
      if (fileInput) {
        fileInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;
          // Find the label button next to the text input
          const labelEl = document.querySelector(`label[for="${fileId}"]`);
          uploadImageToServer(file, targetId, previewId, labelEl);
          // Reset so the same file can be re-selected if needed
          fileInput.value = '';
        });
      }
    });

    // Also clear preview when user types a URL manually
    ['admin-edit-cover', 'admin-edit-screen1', 'admin-edit-screen2'].forEach((id, i) => {
      const input = document.getElementById(id);
      const previewId = ['preview-cover', 'preview-screen1', 'preview-screen2'][i];
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
  };

  initializeApp();
});
