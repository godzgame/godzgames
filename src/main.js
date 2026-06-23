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

  // ============================================================
  // NEWS SYSTEM — 12 curated articles with rich content + fast images
  // 3 random items shown immediately, different every page load
  // Images from Unsplash (CDN, instant load) instead of AI generation
  // ============================================================
  const NEWS_POOL = [
    {
      id: 'n1', tag: 'GAMING',
      image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=500&fit=crop&q=80',
      link: 'https://www.ign.com/articles/best-open-world-games',
      en: {
        title: 'GTA VI Confirmed: Rockstar\'s Most Ambitious Game Yet',
        description: 'Rockstar Games has officially confirmed that Grand Theft Auto VI will launch with the largest open world ever created in gaming history, featuring a living, breathing recreation of Vice City.',
        fullContent: 'Rockstar Games has officially confirmed that Grand Theft Auto VI will launch with the largest open world ever created in gaming history. The game features a living, breathing recreation of Vice City and its surrounding areas, complete with dynamic weather systems, realistic NPC behavior, and an unprecedented level of environmental interaction.\n\nThe developers revealed that the map will be approximately 4x larger than GTA V\'s Los Santos, with dense urban areas, rural landscapes, swamps, and beaches all seamlessly connected. Players will experience a dual-protagonist story that follows two characters whose lives intertwine across the criminal underworld of modern-day Florida.\n\nRockstar has also confirmed that GTA Online will receive a complete overhaul to accompany the new release, with cross-platform play and a revamped economy system. Industry analysts predict this could become the best-selling entertainment product of all time, surpassing even the $8 billion generated by GTA V.\n\nThe game will launch simultaneously on PlayStation 5, Xbox Series X|S, and PC, marking the first time a GTA title has launched on PC alongside consoles.'
      },
      es: {
        title: 'GTA VI Confirmado: El Juego Más Ambicioso de Rockstar',
        description: 'Rockstar Games ha confirmado oficialmente que Grand Theft Auto VI se lanzará con el mundo abierto más grande jamás creado en la historia de los videojuegos, con una recreación viva de Vice City.',
        fullContent: 'Rockstar Games ha confirmado oficialmente que Grand Theft Auto VI se lanzará con el mundo abierto más grande jamás creado en la historia de los videojuegos. El juego presenta una recreación viva y palpitante de Vice City y sus alrededores, con sistemas climáticos dinámicos, comportamiento realista de NPCs y un nivel sin precedentes de interacción ambiental.\n\nLos desarrolladores revelaron que el mapa será aproximadamente 4 veces más grande que Los Santos de GTA V, con zonas urbanas densas, paisajes rurales, pantanos y playas conectados de forma fluida. Los jugadores experimentarán una historia con dos protagonistas cuyas vidas se entrelazan en el submundo criminal de la Florida moderna.\n\nRockstar también confirmó que GTA Online recibirá una renovación completa para acompañar el nuevo lanzamiento, con juego cruzado entre plataformas y un sistema económico renovado. Los analistas de la industria predicen que podría convertirse en el producto de entretenimiento más vendido de todos los tiempos, superando los $8 mil millones generados por GTA V.\n\nEl juego se lanzará simultáneamente en PlayStation 5, Xbox Series X|S y PC, marcando la primera vez que un título GTA se lanza en PC junto con las consolas.'
      }
    },
    {
      id: 'n2', tag: 'TECNOLOGÍA',
      image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&h=500&fit=crop&q=80',
      link: 'https://www.theverge.com/gaming',
      en: {
        title: 'NVIDIA RTX 5090 Benchmarks Leaked: 2x Faster Than RTX 4090',
        description: 'Leaked benchmarks reveal NVIDIA\'s upcoming RTX 5090 delivers nearly double the performance of its predecessor, with revolutionary AI-powered frame generation that achieves 240 FPS in 4K.',
        fullContent: 'Leaked benchmarks from a trusted hardware leaker have revealed that NVIDIA\'s upcoming RTX 5090 GPU delivers nearly double the performance of the RTX 4090 across major gaming titles. The new flagship card, built on the Blackwell architecture, features 32GB of GDDR7 memory and a staggering 21,760 CUDA cores.\n\nThe most impressive advancement comes from NVIDIA\'s new DLSS 4.0 technology, which uses next-generation AI models to generate multiple frames between each rendered frame. In testing, this technology pushed frame rates to over 240 FPS at 4K resolution in games like Cyberpunk 2077 and Alan Wake 2, while maintaining visual quality indistinguishable from native rendering.\n\nThe RTX 5090 also introduces real-time path tracing that runs at playable frame rates without DLSS assistance — a first for consumer GPUs. Ray tracing performance shows a 3x improvement over the 4090 generation.\n\nHowever, the card comes with a substantial power requirement of 600W TDP and an expected retail price of $1,999. NVIDIA is expected to officially announce the card at CES, with availability in Q1 2026.'
      },
      es: {
        title: 'Benchmarks de la NVIDIA RTX 5090 Filtrados: 2x Más Rápida que la RTX 4090',
        description: 'Los benchmarks filtrados revelan que la próxima RTX 5090 de NVIDIA ofrece casi el doble de rendimiento que su predecesora, con generación de frames por IA revolucionaria que alcanza 240 FPS en 4K.',
        fullContent: 'Los benchmarks filtrados de un leaker de hardware confiable revelan que la próxima GPU RTX 5090 de NVIDIA ofrece casi el doble de rendimiento de la RTX 4090 en los principales títulos de juegos. La nueva tarjeta insignia, construida sobre la arquitectura Blackwell, cuenta con 32GB de memoria GDDR7 y unos asombrosos 21,760 CUDA cores.\n\nEl avance más impresionante proviene de la nueva tecnología DLSS 4.0 de NVIDIA, que utiliza modelos de IA de nueva generación para generar múltiples frames entre cada frame renderizado. En las pruebas, esta tecnología elevó las tasas de frames a más de 240 FPS en resolución 4K en juegos como Cyberpunk 2077 y Alan Wake 2, manteniendo una calidad visual indistinguible del renderizado nativo.\n\nLa RTX 5090 también introduce trazado de rayos en tiempo real que funciona a frame rates jugables sin asistencia de DLSS — una primicia para GPUs de consumo. El rendimiento de ray tracing muestra una mejora de 3x sobre la generación 4090.\n\nSin embargo, la tarjeta viene con un requisito sustancial de 600W TDP y un precio estimado de $1,999. Se espera que NVIDIA anuncie oficialmente la tarjeta en el CES, con disponibilidad en Q1 2026.'
      }
    },
    {
      id: 'n3', tag: 'NINTENDO',
      image: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=800&h=500&fit=crop&q=80',
      link: 'https://www.nintendolife.com/',
      en: {
        title: 'Nintendo Switch 2 Specs Revealed: 4K Docked, DLSS Support',
        description: 'Nintendo has officially revealed the Switch 2 hardware specifications, confirming 4K output when docked, NVIDIA DLSS upscaling support, and backwards compatibility with the entire Switch library.',
        fullContent: 'Nintendo has finally pulled back the curtain on the Switch 2, revealing hardware specifications that position the console as a massive leap forward from its predecessor. The new hybrid console features a custom NVIDIA Tegra T239 chip with DLSS support, enabling native 1080p handheld gameplay and 4K output when docked.\n\nThe Switch 2 boasts 12GB of LPDDR5X RAM, a 7.9-inch OLED display with 120Hz refresh rate, and internal storage options of 256GB and 512GB. The Joy-Con 2 controllers feature magnetic attachment rails, Hall-effect analog sticks that eliminate drift, and a new mouse-like sensor on the right controller for precision aiming.\n\nNintendo confirmed full backwards compatibility with the entire Switch library, with many first-party titles receiving automatic resolution and performance upgrades. Launch titles include a new 3D Mario game, Metroid Prime 4, and a remastered collection of beloved GameCube titles.\n\nThe console will retail at $399 for the base model and $449 for the premium storage option, with preorders opening immediately after the announcement event. Nintendo expects to ship 15 million units in the first fiscal year.'
      },
      es: {
        title: 'Especificaciones del Switch 2 Reveladas: 4K con Dock, Soporte DLSS',
        description: 'Nintendo ha revelado oficialmente las especificaciones del Switch 2, confirmando salida 4K en dock, soporte para DLSS de NVIDIA y compatibilidad retroactiva con toda la biblioteca de Switch.',
        fullContent: 'Nintendo finalmente ha revelado el Switch 2, mostrando especificaciones de hardware que posicionan la consola como un salto masivo respecto a su predecesora. La nueva consola híbrida cuenta con un chip personalizado NVIDIA Tegra T239 con soporte DLSS, permitiendo juego nativo a 1080p en modo portátil y salida 4K cuando está en el dock.\n\nEl Switch 2 presume de 12GB de RAM LPDDR5X, una pantalla OLED de 7.9 pulgadas con tasa de refresco de 120Hz, y opciones de almacenamiento interno de 256GB y 512GB. Los controles Joy-Con 2 cuentan con rieles de fijación magnética, joysticks de efecto Hall que eliminan el drift, y un nuevo sensor tipo ratón en el control derecho para apuntado de precisión.\n\nNintendo confirmó compatibilidad total con toda la biblioteca de Switch, con muchos títulos first-party recibiendo mejoras automáticas de resolución y rendimiento. Los títulos de lanzamiento incluyen un nuevo Mario 3D, Metroid Prime 4 y una colección remasterizada de títulos queridos de GameCube.\n\nLa consola tendrá un precio de $399 para el modelo base y $449 para la opción de almacenamiento premium, con preventa abierta inmediatamente después del evento de anuncio. Nintendo espera enviar 15 millones de unidades en el primer año fiscal.'
      }
    },
    {
      id: 'n4', tag: 'PLAYSTATION',
      image: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800&h=500&fit=crop&q=80',
      link: 'https://blog.playstation.com/',
      en: {
        title: 'PlayStation 5 Pro: Sony\'s 8K Beast Breaks Sales Records',
        description: 'The PS5 Pro has shattered launch week records, selling 3.2 million units globally. Enhanced ray tracing and an 8K-ready GPU make it the most powerful console ever released.',
        fullContent: 'Sony\'s PlayStation 5 Pro has shattered every launch week sales record in console history, moving 3.2 million units worldwide in its first seven days of availability. The upgraded console features a significantly more powerful GPU that delivers up to 45% faster rendering than the standard PS5, with support for 8K resolution output.\n\nThe PS5 Pro\'s standout feature is its advanced ray tracing engine, which now supports 2-3x more rays per scene, enabling photorealistic lighting and reflections in real time. First-party titles like Spider-Man 2, Horizon Forbidden West, and the upcoming Wolverine have received dedicated Pro patches that push visual fidelity to near-cinematic levels.\n\nSony also introduced PlayStation Spectral Super Resolution (PSSR), their proprietary AI-driven upscaling technology that competes directly with NVIDIA\'s DLSS. Early results show PSSR delivering native 4K quality from a 1440p internal resolution, freeing up GPU power for enhanced visual effects.\n\nThe console retails at $699 and includes a 2TB SSD, a redesigned DualSense controller with improved haptics, and three months of PlayStation Plus Premium. Sony has confirmed that the PS5 Pro will be the definitive PlayStation console for the rest of this generation, with no further hardware revisions planned.'
      },
      es: {
        title: 'PlayStation 5 Pro: La Bestia 8K de Sony Rompe Récords de Ventas',
        description: 'La PS5 Pro ha roto los récords de su semana de lanzamiento, vendiendo 3.2 millones de unidades globalmente. Ray tracing mejorado y GPU preparada para 8K la convierten en la consola más potente.',
        fullContent: 'La PlayStation 5 Pro de Sony ha destrozado todos los récords de ventas de la primera semana en la historia de las consolas, moviendo 3.2 millones de unidades en todo el mundo en sus primeros siete días. La consola mejorada cuenta con una GPU significativamente más potente que ofrece hasta un 45% más de rendimiento de renderizado que la PS5 estándar, con soporte para salida de resolución 8K.\n\nLa característica destacada de la PS5 Pro es su motor avanzado de ray tracing, que ahora soporta 2-3 veces más rayos por escena, permitiendo iluminación y reflejos fotorrealistas en tiempo real. Títulos first-party como Spider-Man 2, Horizon Forbidden West y el próximo Wolverine han recibido parches Pro dedicados que elevan la fidelidad visual a niveles casi cinematográficos.\n\nSony también introdujo PlayStation Spectral Super Resolution (PSSR), su tecnología de upscaling impulsada por IA que compite directamente con DLSS de NVIDIA. Los primeros resultados muestran que PSSR entrega calidad 4K nativa desde una resolución interna de 1440p, liberando poder de GPU para efectos visuales mejorados.\n\nLa consola tiene un precio de $699 e incluye un SSD de 2TB, un control DualSense rediseñado con hápticos mejorados y tres meses de PlayStation Plus Premium.'
      }
    },
    {
      id: 'n5', tag: 'XBOX',
      image: 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=800&h=500&fit=crop&q=80',
      link: 'https://news.xbox.com/',
      en: {
        title: 'Xbox Game Pass Reaches 50 Million Subscribers Worldwide',
        description: 'Microsoft\'s Game Pass subscription service has hit a massive milestone with 50 million subscribers, bolstered by day-one releases of Starfield DLC, Avowed, and Indiana Jones.',
        fullContent: 'Microsoft has announced that Xbox Game Pass has officially surpassed 50 million subscribers worldwide, cementing its position as the dominant force in gaming subscription services. The milestone was achieved thanks to an aggressive slate of day-one releases that included the Starfield: Shattered Space DLC, Avowed, and Indiana Jones and the Great Circle.\n\nPhil Spencer, CEO of Microsoft Gaming, attributed the growth to the company\'s commitment to delivering high-quality titles directly to the service on launch day. "Game Pass is the future of gaming," Spencer said at the announcement event. "We believe players should have access to amazing games without the barrier of a $70 price tag."\n\nThe service now includes over 500 games across Xbox, PC, and cloud platforms, with the cloud gaming component showing the fastest growth at 15 million active users. Microsoft has also expanded Game Pass to Samsung smart TVs, Amazon Fire TV devices, and Meta Quest headsets.\n\nAnalysts predict that Game Pass could reach 100 million subscribers by 2028, especially with the planned integration of Activision Blizzard\'s full catalog, including Call of Duty titles being available on the service from day one starting next year.'
      },
      es: {
        title: 'Xbox Game Pass Alcanza 50 Millones de Suscriptores Mundialmente',
        description: 'El servicio de suscripción Game Pass de Microsoft alcanzó un gran hito con 50 millones de suscriptores, impulsado por lanzamientos del día uno de Starfield DLC, Avowed e Indiana Jones.',
        fullContent: 'Microsoft ha anunciado que Xbox Game Pass ha superado oficialmente los 50 millones de suscriptores en todo el mundo, consolidando su posición como la fuerza dominante en servicios de suscripción de videojuegos. El hito se logró gracias a una agresiva lista de lanzamientos del día uno que incluyeron el DLC Starfield: Shattered Space, Avowed e Indiana Jones and the Great Circle.\n\nPhil Spencer, CEO de Microsoft Gaming, atribuyó el crecimiento al compromiso de la empresa de entregar títulos de alta calidad directamente al servicio el día de lanzamiento. "Game Pass es el futuro del gaming," dijo Spencer en el evento. "Creemos que los jugadores deberían tener acceso a juegos increíbles sin la barrera de un precio de $70."\n\nEl servicio ahora incluye más de 500 juegos en Xbox, PC y plataformas en la nube, con el componente de juego en la nube mostrando el crecimiento más rápido con 15 millones de usuarios activos. Microsoft también expandió Game Pass a televisores Samsung, dispositivos Amazon Fire TV y auriculares Meta Quest.\n\nLos analistas predicen que Game Pass podría alcanzar los 100 millones de suscriptores para 2028, especialmente con la integración del catálogo completo de Activision Blizzard.'
      }
    },
    {
      id: 'n6', tag: 'INDIE',
      image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=500&fit=crop&q=80',
      link: 'https://store.steampowered.com/',
      en: {
        title: 'Indie Hit "Hollow Depths" Sells 5 Million Copies in 2 Weeks',
        description: 'The surprise indie sensation Hollow Depths has taken the gaming world by storm, selling 5 million copies in just two weeks and dethroning AAA titles on Steam\'s top sellers chart.',
        fullContent: 'Hollow Depths, a Metroidvania-style adventure game developed by a two-person team from Portugal, has become the biggest indie success story of the year by selling over 5 million copies in its first two weeks on Steam. The game dethroned several AAA titles on the platform\'s top sellers chart and currently holds an "Overwhelmingly Positive" rating from over 120,000 reviews.\n\nThe game combines hand-painted pixel art with a haunting orchestral soundtrack and features 40+ hours of content across an interconnected underground world filled with challenging boss battles, hidden secrets, and a deeply emotional narrative about loss and redemption.\n\nDevelopers Ana and Marco Silva quit their day jobs three years ago to pursue their dream of making games. "We never imagined this kind of success," Ana said in an interview. "We just wanted to make a game that we ourselves would love to play. The response from players has been overwhelming and humbling."\n\nSony, Nintendo, and Microsoft have all reached out regarding console ports, with the game expected to launch on PlayStation 5, Xbox Series X|S, and Nintendo Switch 2 by the end of the year. A major content expansion is already in development.'
      },
      es: {
        title: 'El Hit Indie "Hollow Depths" Vende 5 Millones de Copias en 2 Semanas',
        description: 'La sorpresa indie Hollow Depths ha tomado el mundo del gaming por asalto, vendiendo 5 millones de copias en solo dos semanas y destronando títulos AAA en Steam.',
        fullContent: 'Hollow Depths, un juego de aventura estilo Metroidvania desarrollado por un equipo de dos personas de Portugal, se ha convertido en la mayor historia de éxito indie del año al vender más de 5 millones de copias en sus primeras dos semanas en Steam. El juego destronó varios títulos AAA en la lista de los más vendidos de la plataforma y actualmente tiene una calificación de "Abrumadoramente Positivo" de más de 120,000 reseñas.\n\nEl juego combina pixel art pintado a mano con una banda sonora orquestal envolvente y ofrece más de 40 horas de contenido en un mundo subterráneo interconectado lleno de desafiantes batallas contra jefes, secretos ocultos y una narrativa profundamente emocional sobre la pérdida y la redención.\n\nLos desarrolladores Ana y Marco Silva dejaron sus trabajos hace tres años para perseguir su sueño de hacer juegos. "Nunca imaginamos este tipo de éxito," dijo Ana en una entrevista. "Solo queríamos hacer un juego que nosotros mismos quisiéramos jugar."\n\nSony, Nintendo y Microsoft se han contactado para ports a consola, con el juego esperado en PlayStation 5, Xbox Series X|S y Nintendo Switch 2 para fin de año.'
      }
    },
    {
      id: 'n7', tag: 'TECNOLOGÍA',
      image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=500&fit=crop&q=80',
      link: 'https://www.pcgamer.com/',
      en: {
        title: 'AI-Generated NPCs That Remember Everything Are Here',
        description: 'A groundbreaking AI system allows NPCs to hold persistent memories, form opinions about the player, and engage in truly dynamic conversations that evolve throughout the entire game.',
        fullContent: 'A revolutionary AI system developed by Inworld AI in partnership with Xbox has been unveiled, allowing non-player characters in games to hold persistent memories, form genuine opinions about the player\'s actions, and engage in dynamic conversations that evolve naturally throughout the entire gameplay experience.\n\nUnlike traditional scripted dialogue trees, this system uses large language models fine-tuned for gaming to generate real-time responses that reflect each NPC\'s unique personality, emotional state, and accumulated history with the player. If you help a shopkeeper defend their store from bandits, they\'ll remember it months later and offer you special deals. If you steal from them, they\'ll spread word to other merchants.\n\nThe technology was demonstrated live at the Xbox Games Showcase using a medieval RPG prototype. During the demo, a player had a 10-minute unscripted conversation with a tavern keeper who recalled previous interactions from hours earlier, referenced events happening in other parts of the game world, and even cracked contextual jokes based on the player\'s equipment.\n\n"This is the end of the dialogue wheel as we know it," said the lead developer. "NPCs will finally feel like real people inhabiting a living world." The technology is expected to debut in three upcoming Xbox-exclusive titles in 2026.'
      },
      es: {
        title: 'Los NPCs con IA que Recuerdan Todo Ya Están Aquí',
        description: 'Un sistema de IA revolucionario permite que los NPCs mantengan memorias persistentes, formen opiniones sobre el jugador y participen en conversaciones dinámicas que evolucionan durante todo el juego.',
        fullContent: 'Un sistema de IA revolucionario desarrollado por Inworld AI en asociación con Xbox ha sido presentado, permitiendo que los personajes no jugables mantengan memorias persistentes, formen opiniones genuinas sobre las acciones del jugador y participen en conversaciones dinámicas que evolucionan naturalmente a lo largo de toda la experiencia de juego.\n\nA diferencia de los árboles de diálogo tradicionales con guion, este sistema utiliza modelos de lenguaje grandes afinados para gaming que generan respuestas en tiempo real reflejando la personalidad única de cada NPC, su estado emocional y la historia acumulada con el jugador. Si ayudas a un comerciante a defender su tienda de bandidos, lo recordará meses después y te ofrecerá ofertas especiales. Si les robas, correrán la voz a otros comerciantes.\n\nLa tecnología fue demostrada en vivo en el Xbox Games Showcase usando un prototipo de RPG medieval. Durante la demo, un jugador tuvo una conversación de 10 minutos sin guion con un tabernero que recordaba interacciones previas de horas antes.\n\n"Este es el fin de la rueda de diálogo tal como la conocemos," dijo el desarrollador principal. "Los NPCs finalmente se sentirán como personas reales habitando un mundo vivo." La tecnología debutará en tres títulos exclusivos de Xbox en 2026.'
      }
    },
    {
      id: 'n8', tag: 'RETRO',
      image: 'https://images.unsplash.com/photo-1551103782-8ab07afd45c1?w=800&h=500&fit=crop&q=80',
      link: 'https://www.eurogamer.net/',
      en: {
        title: 'Final Fantasy VII Remake Part 3 Announced with Stunning Trailer',
        description: 'Square Enix unveiled the final chapter of the FF7 Remake trilogy with a jaw-dropping trailer showing the Northern Crater, Sephiroth\'s true form, and completely reimagined ending sequences.',
        fullContent: 'Square Enix has officially unveiled Final Fantasy VII Remake Part 3, the concluding chapter of the beloved remake trilogy, with a stunning five-minute cinematic trailer that left fans speechless. The trailer showcased the Northern Crater in breathtaking detail, Sephiroth\'s true One-Winged Angel form rendered with next-gen graphics, and teased completely reimagined ending sequences.\n\nDirector Tetsuya Nomura revealed that Part 3 will feature the largest world map in any Final Fantasy game, with fully explorable areas including the Forgotten Capital, Icicle Inn, Cosmo Canyon, and the massive Midgar ruins. The game will also introduce a revamped materia system with over 200 unique materia combinations.\n\nThe combat system receives its most significant evolution yet, with party sizes expanded to five active characters and a new "Limit Synergy" system that allows characters to combine their Limit Breaks for devastating team attacks. Cloud, Tifa, Barret, Aerith, Red XIII, Cid, Yuffie, Vincent, and Cait Sith are all playable from the start.\n\n"This is the ending that fans have waited 28 years for," Nomura said. "We have poured everything we have into making this the definitive conclusion." The game is scheduled for a holiday 2026 release on PlayStation 5, with a PC version following six months later.'
      },
      es: {
        title: 'Final Fantasy VII Remake Parte 3 Anunciado con un Tráiler Impresionante',
        description: 'Square Enix reveló el capítulo final de la trilogía FF7 Remake con un tráiler impactante mostrando el Cráter del Norte, la verdadera forma de Sephiroth y secuencias finales completamente reimaginadas.',
        fullContent: 'Square Enix ha revelado oficialmente Final Fantasy VII Remake Parte 3, el capítulo final de la querida trilogía remake, con un impresionante tráiler cinemático de cinco minutos que dejó a los fans sin palabras. El tráiler mostró el Cráter del Norte con detalle impresionante, la verdadera forma de Ángel de Una Ala de Sephiroth renderizada con gráficos de nueva generación, y anticipó secuencias finales completamente reimaginadas.\n\nEl director Tetsuya Nomura reveló que la Parte 3 contará con el mapa mundial más grande de cualquier Final Fantasy, con áreas completamente explorables incluyendo la Capital Olvidada, Icicle Inn, Cosmo Canyon y las masivas ruinas de Midgar. El juego también introducirá un sistema de materia renovado con más de 200 combinaciones únicas.\n\nEl sistema de combate recibe su evolución más significativa hasta ahora, con grupos expandidos a cinco personajes activos y un nuevo sistema "Limit Synergy" que permite combinar Limit Breaks para ataques devastadores en equipo.\n\n"Este es el final que los fans han esperado 28 años," dijo Nomura. "Hemos puesto todo lo que tenemos en hacer esta la conclusión definitiva." El juego está programado para lanzamiento en las fiestas de 2026 en PlayStation 5.'
      }
    },
    {
      id: 'n9', tag: 'ESPORTS',
      image: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=800&h=500&fit=crop&q=80',
      link: 'https://www.dexerto.com/',
      en: {
        title: 'League of Legends Worlds 2025 Draws 180 Million Viewers',
        description: 'The League of Legends World Championship 2025 has broken all viewership records with 180 million peak concurrent viewers, as T1\'s Faker leads his team to an unprecedented fifth title.',
        fullContent: 'The League of Legends World Championship 2025, held at the Tokyo Dome in Japan, has shattered every viewership record in esports history with a staggering 180 million peak concurrent viewers during the Grand Finals. The tournament featured 24 teams from around the globe competing for the $5 million prize pool.\n\nThe Grand Finals saw T1\'s legendary mid-laner Faker lead his team to an unprecedented fifth World Championship title in a dramatic 3-2 series against Gen.G. At 29 years old, Faker proved once again why he is widely considered the greatest esports player of all time, delivering clutch performances on Ahri and Azir that turned seemingly lost teamfights.\n\nThe production value of the event reached new heights, with a holographic opening ceremony featuring a virtual dragon that flew over the 55,000-seat stadium. Riot Games also announced a $30 million investment in the Tier 2 competitive scene to develop talent from underrepresented regions.\n\n"Esports is no longer a niche — it\'s mainstream entertainment on par with the Super Bowl and the Champions League," said Riot Games CEO. The 2026 World Championship will be held across multiple cities in South America for the first time.'
      },
      es: {
        title: 'El Mundial de League of Legends 2025 Atrae 180 Millones de Espectadores',
        description: 'El Campeonato Mundial de League of Legends 2025 ha roto todos los récords con 180 millones de espectadores simultáneos, mientras Faker de T1 lidera a su equipo a un quinto título sin precedentes.',
        fullContent: 'El Campeonato Mundial de League of Legends 2025, celebrado en el Tokyo Dome de Japón, ha destrozado todos los récords de audiencia en la historia de los esports con unos asombrosos 180 millones de espectadores simultáneos durante la Gran Final. El torneo contó con 24 equipos de todo el mundo compitiendo por el premio de $5 millones.\n\nLa Gran Final vio al legendario mid-laner de T1, Faker, llevar a su equipo a un quinto título mundial sin precedentes en una dramática serie 3-2 contra Gen.G. A sus 29 años, Faker demostró una vez más por qué es considerado el mejor jugador de esports de todos los tiempos, con actuaciones decisivas con Ahri y Azir.\n\nEl valor de producción del evento alcanzó nuevas alturas, con una ceremonia de apertura holográfica con un dragón virtual que sobrevoló el estadio de 55,000 asientos. Riot Games también anunció una inversión de $30 millones en la escena competitiva Tier 2.\n\n"Los esports ya no son un nicho — son entretenimiento mainstream a la par del Super Bowl y la Champions League," dijo el CEO de Riot Games. El Mundial 2026 se celebrará en varias ciudades de Sudamérica por primera vez.'
      }
    },
    {
      id: 'n10', tag: 'VR / AR',
      image: 'https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?w=800&h=500&fit=crop&q=80',
      link: 'https://www.meta.com/quest/',
      en: {
        title: 'Meta Quest 4 Delivers "True Presence" VR for Under $300',
        description: 'Meta\'s Quest 4 achieves a breakthrough in affordable VR with 4K per-eye displays, full-body tracking, and mixed reality so convincing that testers couldn\'t distinguish virtual objects from real ones.',
        fullContent: 'Meta has unveiled the Quest 4, a next-generation virtual reality headset that achieves what the company calls "True Presence" — a level of visual fidelity and immersion so convincing that test users struggled to distinguish virtual objects from real ones. Remarkably, the headset is priced at just $299 for the base model.\n\nThe Quest 4 features dual 4K micro-OLED displays running at 120Hz, providing a visual clarity that eliminates the "screen door effect" that has plagued VR since its inception. The headset is 30% lighter than the Quest 3 at just 380 grams, with a battery life of 3.5 hours during intensive gaming sessions.\n\nFull-body tracking is achieved through a combination of inside-out cameras and AI-powered skeletal estimation, requiring no external sensors or trackers. Players\' movements are mapped 1:1 in virtual space, enabling unprecedented physical gameplay experiences.\n\nThe mixed reality capabilities are equally impressive, with color passthrough cameras that rival smartphone quality and real-time depth sensing that allows virtual objects to interact naturally with real-world surfaces. Meta demonstrated a mixed reality game where virtual creatures hid behind real furniture and responded to real-world lighting conditions.\n\nThe headset launches with over 100 titles, including Half-Life: Alyx 2 as a timed exclusive and a VR adaptation of Elden Ring.'
      },
      es: {
        title: 'Meta Quest 4 Ofrece VR de "Presencia Real" por Menos de $300',
        description: 'El Quest 4 de Meta logra un avance en VR accesible con pantallas 4K por ojo, seguimiento corporal completo y realidad mixta tan convincente que los testers no distinguían objetos virtuales de reales.',
        fullContent: 'Meta ha presentado el Quest 4, un auricular de realidad virtual de nueva generación que logra lo que la empresa llama "Presencia Real" — un nivel de fidelidad visual e inmersión tan convincente que los usuarios de prueba no podían distinguir objetos virtuales de los reales. Notablemente, el auricular tiene un precio de solo $299 para el modelo base.\n\nEl Quest 4 cuenta con pantallas duales micro-OLED 4K a 120Hz, proporcionando una claridad visual que elimina el "efecto puerta de mosquitero" que ha plagado la VR desde sus inicios. El auricular es un 30% más ligero que el Quest 3 con solo 380 gramos, con una batería de 3.5 horas durante sesiones de juego intensivas.\n\nEl seguimiento corporal completo se logra mediante una combinación de cámaras inside-out y estimación esquelética por IA, sin sensores externos. Los movimientos de los jugadores se mapean 1:1 en el espacio virtual.\n\nLas capacidades de realidad mixta son igualmente impresionantes, con cámaras de paso a color que rivalizan la calidad de smartphones y detección de profundidad en tiempo real. El auricular se lanza con más de 100 títulos, incluyendo Half-Life: Alyx 2 como exclusivo temporal y una adaptación VR de Elden Ring.'
      }
    },
    {
      id: 'n11', tag: 'MÓVIL',
      image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=500&fit=crop&q=80',
      link: 'https://www.pocketgamer.com/',
      en: {
        title: 'Apple and Google Announce AAA Console Games Coming to Mobile',
        description: 'In a joint initiative, Apple and Google have partnered with major studios to bring full console-quality experiences to smartphones, starting with Resident Evil 9 and Assassin\'s Creed mobile exclusives.',
        fullContent: 'In an unprecedented joint initiative, Apple and Google have announced partnerships with major gaming studios to bring full console-quality gaming experiences to mobile devices. The initiative, dubbed "Mobile AAA," will launch with exclusive mobile versions of Resident Evil 9 and a brand-new Assassin\'s Creed title built from the ground up for smartphones.\n\nApple\'s A19 Pro chip and Google\'s Tensor G5 processor both now feature dedicated ray-tracing hardware that brings real-time lighting effects previously only possible on high-end PCs and consoles. Both companies demonstrated gameplay footage running at 60 FPS with full ray tracing on their latest flagship phones.\n\nCapcom\'s Resident Evil 9 Mobile will feature the complete story campaign with adapted touch controls and optional controller support, while Ubisoft\'s Assassin\'s Creed: Shadows of the East is a 40-hour original adventure set in feudal Japan, designed specifically for mobile play sessions.\n\nThe mobile gaming market, already worth $100 billion annually, is expected to see a 40% surge as AAA titles bridge the quality gap between phones and dedicated gaming hardware. Both games will be available later this year through Apple Arcade and Google Play Pass respectively.'
      },
      es: {
        title: 'Apple y Google Anuncian Juegos AAA de Consola para Móviles',
        description: 'En una iniciativa conjunta, Apple y Google se asociaron con grandes estudios para traer experiencias de calidad consola a smartphones, comenzando con Resident Evil 9 y exclusivos de Assassin\'s Creed.',
        fullContent: 'En una iniciativa conjunta sin precedentes, Apple y Google han anunciado asociaciones con grandes estudios de gaming para traer experiencias de calidad consola a dispositivos móviles. La iniciativa, llamada "Mobile AAA," se lanzará con versiones móviles exclusivas de Resident Evil 9 y un nuevo título de Assassin\'s Creed construido desde cero para smartphones.\n\nEl chip A19 Pro de Apple y el procesador Tensor G5 de Google ahora cuentan con hardware dedicado de ray-tracing que trae efectos de iluminación en tiempo real antes solo posibles en PCs y consolas de alta gama. Ambas empresas demostraron footage de juego corriendo a 60 FPS con ray tracing completo en sus teléfonos insignia más recientes.\n\nResident Evil 9 Mobile de Capcom contará con la campaña de historia completa con controles táctiles adaptados y soporte opcional para control, mientras que Assassin\'s Creed: Shadows of the East de Ubisoft es una aventura original de 40 horas ambientada en el Japón feudal.\n\nEl mercado de juegos móviles, que ya vale $100 mil millones anuales, se espera que vea un aumento del 40% a medida que los títulos AAA cierran la brecha de calidad entre teléfonos y hardware de gaming dedicado.'
      }
    },
    {
      id: 'n12', tag: 'NOTICIAS',
      image: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800&h=500&fit=crop&q=80',
      link: 'https://www.gamespot.com/',
      en: {
        title: 'Steam Breaks All Records: 40 Million Players Online Simultaneously',
        description: 'Valve\'s Steam platform has achieved a historic milestone with 40 million concurrent users, driven by the explosive launches of three blockbuster titles in the same week.',
        fullContent: 'Valve\'s Steam platform has achieved a historic milestone that seemed impossible just a few years ago: 40 million concurrent users logged in simultaneously. The record was set during a perfect storm of gaming events, with three highly anticipated blockbuster titles launching within the same week.\n\nThe new concurrent user record was driven by the surprise shadow-drop of Half-Life 3, which alone drew 8 million simultaneous players in its first 24 hours. Combined with the launch of Monster Hunter Wilds and a major Dota 2 tournament, Steam\'s servers were pushed to their absolute limits.\n\nValve confirmed that their infrastructure handled the load without significant outages, thanks to a $500 million investment in server capacity over the past two years. Steam now has over 130 million monthly active users, making it larger than many social media platforms.\n\nGabe Newell, Valve\'s co-founder, made a rare public appearance to celebrate the milestone. "PC gaming has never been stronger," he said. "The diversity and quality of games on Steam today is something I could only dream about when we started this platform 22 years ago."\n\nThe record also highlighted Steam\'s growing presence in Asia and South America, where the platform has seen 200% user growth over the past three years.'
      },
      es: {
        title: 'Steam Rompe Todos los Récords: 40 Millones de Jugadores Simultáneos',
        description: 'La plataforma Steam de Valve ha logrado un hito histórico con 40 millones de usuarios simultáneos, impulsado por los lanzamientos explosivos de tres títulos blockbuster en la misma semana.',
        fullContent: 'La plataforma Steam de Valve ha logrado un hito histórico que parecía imposible hace pocos años: 40 millones de usuarios simultáneos conectados al mismo tiempo. El récord se estableció durante una tormenta perfecta de eventos gaming, con tres títulos blockbuster muy esperados lanzándose en la misma semana.\n\nEl nuevo récord fue impulsado por el lanzamiento sorpresa de Half-Life 3, que solo atrajo 8 millones de jugadores simultáneos en sus primeras 24 horas. Combinado con el lanzamiento de Monster Hunter Wilds y un torneo importante de Dota 2, los servidores de Steam fueron llevados a su límite absoluto.\n\nValve confirmó que su infraestructura manejó la carga sin interrupciones significativas, gracias a una inversión de $500 millones en capacidad de servidores en los últimos dos años. Steam ahora tiene más de 130 millones de usuarios activos mensuales.\n\nGabe Newell, cofundador de Valve, hizo una rara aparición pública para celebrar el hito. "El gaming en PC nunca ha sido más fuerte," dijo. "La diversidad y calidad de juegos en Steam hoy es algo que solo podía soñar cuando iniciamos esta plataforma hace 22 años."\n\nEl récord también destacó la creciente presencia de Steam en Asia y Sudamérica, donde la plataforma ha visto un crecimiento del 200% en usuarios en los últimos tres años.'
      }
    }
  ];

  // Pick 3 random non-repeating items from the pool each page load
  const pickRandomNews = () => {
    const shuffled = [...NEWS_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  };

  // Start with random selection immediately (no loading wait)
  let aiNews = pickRandomNews();

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

    // News already loaded from NEWS_POOL (random 3 picked at top of file)
    // No external API needed — instant load, bilingual, varied each visit
  };

  initializeApp();
});
