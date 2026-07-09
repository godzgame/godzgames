require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploaded images statically
const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `img_${Date.now()}${ext}`;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Formato no permitido. Solo JPG, PNG, WEBP o GIF.'));
    }
  }
});

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_TOKEN = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest('hex');

// Authentication middleware for administrative tasks
const requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No autorizado: Token ausente" });
  }
  
  const token = authHeader.replace('Bearer ', '').trim();
  if (token === ADMIN_TOKEN) {
    return next();
  }
  return res.status(401).json({ error: "No autorizado: Token inválido" });
};

const PORT = process.env.PORT || 3000;
const NEWS_FILE = path.join(__dirname, 'latest_news.json');
const CACHE_DIR = path.join(__dirname, 'game_cache');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const parser = new Parser();

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Robust translation helper using Google Translate API (free & fast)
const translateToSpanish = async (text) => {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(text)}`;
    const res = await axios.get(url, { timeout: 15000 });
    if (res.data && res.data[0]) {
      return res.data[0].map(item => item[0]).join('');
    }
    return text;
  } catch (err) {
    console.error("[Google Translate API] Error:", err.message);
    return text; // Fallback to original text if it fails
  }
};

// Helper to download image locally so the frontend doesn't struggle with rate limits
const downloadImageLocally = async (promptText) => {
  try {
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?width=800&height=500&nologo=true&seed=${Math.floor(Math.random() * 10000)}`;
    console.log(`Downloading AI image locally: "${promptText.substring(0, 30)}..."`);
    const res = await axios({
      url: imageUrl,
      method: 'GET',
      responseType: 'stream',
      timeout: 20000
    });
    const filename = `news_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
    const destPath = path.join(UPLOADS_DIR, filename);
    const writer = fs.createWriteStream(destPath);
    res.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    return `/uploads/${filename}`;
  } catch (err) {
    console.error("Error downloading image:", err.message);
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?width=800&height=500&nologo=true`;
  }
};

// Default Fallback News
const fallbackNews = [
  {
    id: "news-0",
    tag: 'NEWS',
    image: 'https://image.pollinations.ai/prompt/High%20quality%2C%20realistic%20photography%20of%20video%20game%20scene%20representing%3A%20Spider-Man%20Brand%20New%20Day. Highly detailed, 4k resolution, normal lighting, cinematic. No text.?width=800&height=500&nologo=true',
    link: 'https://www.polygon.com/',
    en: {
      title: 'Spider-Man Brand New Day: A New Chapter in Gaming Preservation',
      description: 'The upcoming installment of the web-slinging franchise is set to redefine how classic hero stories are preserved for the next generation.',
      fullContent: `Gaming history is being written in real-time as developers announce new initiatives for the preservation of classic superhero narratives. The upcoming release of Spider-Man: Brand New Day represents a bold step forward in keeping these interactive experiences accessible to fans worldwide.\n\nIndustry analysts note that maintaining access to older titles has become a major challenge for modern platforms. By building robust digital archives, studios aim to protect the cultural heritage of games, ensuring that future generations can swing through the virtual streets of New York just as players do today.`
    },
    es: {
      title: 'Spider-Man Brand New Day: Un Nuevo Capítulo en la Preservación de Videojuegos',
      description: 'La próxima entrega de la franquicia del arácnido redefinirá cómo se conservan las historias clásicas de héroes para las futuras generaciones.',
      fullContent: `La historia de los videojuegos se escribe en tiempo real con las nuevas iniciativas de preservación de narrativas de superhéroes. El lanzamiento de Spider-Man: Brand New Day representa un paso audaz para mantener accesibles estas experiencias interactivas a fans de todo el mundo.\n\nAnalistas de la industria señalan que mantener el acceso a títulos antiguos se ha vuelto un gran desafío. Al construir archivos digitales robustos, los estudios buscan proteger el legado cultural de los videojuegos, asegurando que las futuras generaciones puedan columpiarse por Nueva York.`
    }
  }
];

// Load current news from file or use fallback
let currentNews = fallbackNews;
let lastNewsUpdatedAt = 0;
if (fs.existsSync(NEWS_FILE)) {
  try {
    const rawData = JSON.parse(fs.readFileSync(NEWS_FILE, 'utf-8'));
    if (Array.isArray(rawData)) {
      currentNews = rawData;
      lastNewsUpdatedAt = 0; // Legacy format, force reload
    } else {
      currentNews = rawData.articles || fallbackNews;
      lastNewsUpdatedAt = rawData.updatedAt || 0;
    }
  } catch (err) {
    console.error("Error reading news file:", err.message);
  }
}

// Google News Article Link Decoder via batchexecute
const getArticleUrl = async (googleRssUrl) => {
  try {
    const response = await axios.get(googleRssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
      },
      timeout: 6000
    });
    
    const $ = cheerio.load(response.data);
    const data = $('c-wiz[data-p]').attr('data-p');
    if (!data) {
      return googleRssUrl;
    }
    
    const obj = JSON.parse(data.replace('%.@.', '["garturlreq",'));
    const payload = {
      'f.req': JSON.stringify([[
        ['Fbv4je', JSON.stringify([...obj.slice(0, -6), ...obj.slice(-2)]), 'null', 'generic']
      ]])
    };

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
    };

    const postResponse = await axios.post('https://news.google.com/_/DotsSplashUi/data/batchexecute', 
      new URLSearchParams(payload).toString(), 
      { headers, timeout: 6000 }
    );
    
    let cleaned = postResponse.data;
    if (cleaned.startsWith(")]}'")) {
      cleaned = cleaned.substring(4);
    }
    
    const parsedData = JSON.parse(cleaned);
    const arrayString = parsedData[0][2];
    const decodedObj = JSON.parse(arrayString);
    const articleUrl = decodedObj[1];
    
    return articleUrl || googleRssUrl;
  } catch (err) {
    console.error("Decoding Google News URL error:", err.message);
    return googleRssUrl;
  }
};

// Scrape article text helper
const scrapeArticleText = async (url) => {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 8000
    });
    const $ = cheerio.load(data);
    
    let paragraphs = [];
    const selectors = [
      'article p',
      '.c-entry-content p',
      '.article-content p',
      '.article-body p',
      '.entry-content p',
      '.page-content p',
      'main p',
      'p'
    ];
    
    for (const selector of selectors) {
      const found = $(selector);
      if (found.length > 0) {
        found.each((i, el) => {
          const txt = $(el).text().trim();
          if (txt.length > 60 && !txt.toLowerCase().includes('cookie') && !txt.toLowerCase().includes('privacy') && !txt.toLowerCase().includes('ad blocker')) {
            paragraphs.push(txt);
          }
        });
        if (paragraphs.length > 0) break;
      }
    }
    
    return paragraphs.slice(0, 6).join('\n\n');
  } catch (error) {
    console.error(`Error scraping URL ${url}:`, error.message);
    return '';
  }
};

// Rewrite article in both English and Spanish using Google Translate API
const rewriteArticleBilingual = async (title, originalText) => {
  try {
    const translatedTitle = await translateToSpanish(title);
    const translatedBody = await translateToSpanish(originalText);

    return {
      en: {
        title: title,
        body: originalText
      },
      es: {
        title: translatedTitle,
        body: translatedBody
      }
    };
  } catch (error) {
    console.error("Error in translation process:", error.message);
    return {
      en: { title: title, body: originalText },
      es: { title: title, body: originalText }
    };
  }
};
// Function to generate new AI news using Google News RSS + Scraping + Pollinations.ai Text & Image
const generateNews = async () => {
  console.log("Iniciando generación bilingüe de noticias (Google News + Scraping + IA Gratuita)...");
  
  try {
    const query = encodeURIComponent('video games');
    const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
    
    const feed = await parser.parseURL(url);
    if (!feed || !feed.items || feed.items.length === 0) {
      console.log("No items found in Google News feed.");
      return;
    }
    
    const newsData = [];
    const titlesSet = new Set();
    
    for (const item of feed.items) {
      if (newsData.length === 3) {
        break;
      }
      
      // Clean title from source suffix
      let cleanTitle = item.title;
      const lastDash = cleanTitle.lastIndexOf(' - ');
      if (lastDash !== -1) {
        cleanTitle = cleanTitle.substring(0, lastDash).trim();
      }
      
      // De-duplicate items to ensure distinct news topics
      const titlePrefix = cleanTitle.toLowerCase().substring(0, 18);
      if (titlesSet.has(titlePrefix)) {
        continue;
      }
      titlesSet.add(titlePrefix);
      
      try {
        console.log(`[Bilingual News ${newsData.length + 1}] Processing: ${cleanTitle}`);
        
        // Decode the Google News redirect URL
        const resolvedUrl = await getArticleUrl(item.link);
        console.log(`Resolved URL: ${resolvedUrl}`);
        
        // Scrape the full text of the article
        const originalText = await scrapeArticleText(resolvedUrl);
        
        // Use scraped text, or fallback to snippet if scraping failed
        const textToRewrite = originalText || item.contentSnippet || item.content || '';
        
        if (!textToRewrite || textToRewrite.trim().length < 50) {
          console.log(`Skipping item "${cleanTitle}" due to short content.`);
          continue;
        }
        
        // Rewrite the article in both languages using Pollinations AI
        const rewritten = await rewriteArticleBilingual(cleanTitle, textToRewrite);
        
        // Validate rewritten content (ensure we actually got something back)
        if (!rewritten.en.body || !rewritten.es.body || rewritten.en.body.trim().length < 50) {
          console.log(`Skipping item "${cleanTitle}" because AI rewriting failed or was too short.`);
          continue;
        }
        
        // Generate a realistic gaming-style image prompt based on the English title
        const cleanTitleForImage = rewritten.en.title.replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 60);
        const imagePrompt = `Epic, striking, dynamic video game concept art representing the news: ${cleanTitleForImage}. Vibrant colors, dramatic cinematic lighting, 8k resolution, highly detailed masterpiece. No text.`;
        const localImageUrl = await downloadImageLocally(imagePrompt);
        
        // Calculate short descriptions
        let enDesc = rewritten.en.body.split('\n')[0] || '';
        if (enDesc.length > 150) enDesc = enDesc.substring(0, 147) + '...';
        
        let esDesc = rewritten.es.body.split('\n')[0] || '';
        if (esDesc.length > 150) esDesc = esDesc.substring(0, 147) + '...';
        
        newsData.push({
          id: crypto.createHash('md5').update(resolvedUrl).digest('hex'),
          tag: 'NEWS',
          image: localImageUrl,
          link: resolvedUrl,
          en: {
            title: rewritten.en.title,
            description: enDesc,
            fullContent: rewritten.en.body
          },
          es: {
            title: rewritten.es.title,
            description: esDesc,
            fullContent: rewritten.es.body
          }
        });
      } catch (itemErr) {
        console.error(`Error processing individual item "${cleanTitle}":`, itemErr.message);
        // Continue to try the next item in the RSS feed
      }
    }
    
    if (newsData.length >= 3) {
      currentNews = newsData;
      lastNewsUpdatedAt = Date.now();
      fs.writeFileSync(NEWS_FILE, JSON.stringify({
        updatedAt: lastNewsUpdatedAt,
        articles: currentNews
      }, null, 2));
      console.log("Noticias bilingües de Google News actualizadas con éxito (3/3).");
    } else {
      console.warn(`Only generated ${newsData.length} news items. Keeping previous news to avoid broken layout.`);
    }
  } catch (error) {
    console.error("Error general en generateNews:", error.message);
  }
};

// Search Google News / RSS search for game information
const searchGameWebInfo = async (title, consoleName) => {
  try {
    const query = encodeURIComponent(`${title} ${consoleName} wiki review`);
    const searchUrl = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
    
    console.log(`Searching Web Info for game: "${title}" (${consoleName})...`);
    const feed = await parser.parseURL(searchUrl);
    
    if (feed && feed.items && feed.items.length > 0) {
      const firstItem = feed.items[0];
      const resolved = await getArticleUrl(firstItem.link);
      console.log(`Scraping game review article: ${resolved}`);
      const text = await scrapeArticleText(resolved);
      return text;
    }
  } catch (err) {
    console.error("Error searching web info for game details:", err.message);
  }
  return '';
};

// Stale check and updates scheduler (30-minute interval check)
const checkAndReloadNews = () => {
  let shouldGenerate = true;
  if (lastNewsUpdatedAt > 0) {
    const ageHrs = (Date.now() - lastNewsUpdatedAt) / (1000 * 60 * 60);
    if (ageHrs < 6) {
      shouldGenerate = false;
      console.log(`[Cache] Noticias cargadas desde caché (${ageHrs.toFixed(2)} horas de antigüedad).`);
    } else {
      console.log(`[Stale] Noticias obsoletas (${ageHrs.toFixed(2)} horas de antigüedad). Actualizando...`);
    }
  } else {
    console.log(`[No Timestamp] No hay timestamp en las noticias o es legado. Generando frescas...`);
  }

  if (shouldGenerate) {
    generateNews();
  }
};

// Periodic check: check every 30 minutes
setInterval(checkAndReloadNews, 30 * 60 * 1000);

// Run check once on startup
checkAndReloadNews();

// Endpoint for frontend to fetch news
app.get('/api/news', (req, res) => {
  res.json(currentNews);
});

// Endpoint to force trigger generation (for testing)
app.post('/api/generate-news', async (req, res) => {
  await generateNews();
  res.json({ message: "Generación completada", news: currentNews });
});

// Endpoint to fetch game details (synopsis & metadata) dynamically via Web Search Scraper + Pollinations
app.get('/api/game-details', async (req, res) => {
  const { title, consoleName, id } = req.query;
  
  if (!title || !consoleName || !id) {
    return res.status(400).json({ error: "Missing required query parameters: title, consoleName, id" });
  }

  const cacheFile = path.join(CACHE_DIR, `${id}.json`);

  // Check cache first
  if (fs.existsSync(cacheFile)) {
    try {
      const cachedData = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      return res.json(cachedData);
    } catch (err) {
      console.error("Error reading cached game details:", err.message);
    }
  }

  // Not in cache, proceed to generate
  try {
    // 1. Search Google News search for game reviews / wiki
    const scrapedText = await searchGameWebInfo(title, consoleName);
    
    // 2. Rewrite/Generate JSON via Pollinations Text API
    const systemPrompt = 'You are a professional bi-lingual gaming database editor returning JSON.';
    const prompt = `You are a professional bi-lingual gaming database editor. Based on the following source text (which is scraped from web reviews or wikis about the game "${title}" on console "${consoleName}"), generate a complete game page data sheet in BOTH English and Spanish.
If the source text is empty, generate it based on your general knowledge of this game.

Do not translate literally; rewrite each to sound natural, engaging, and professional in its respective language.
Do not include any introductions, explanations, or author notes. Output strictly in JSON format.

Expected JSON output format:
{
  "genre": {
    "en": "Genre in English (e.g. Action-Adventure, Role-Playing, etc.)",
    "es": "Género en español"
  },
  "releaseDate": {
    "en": "Release Year in English (e.g. November 2023, 2021)",
    "es": "Año de lanzamiento en español"
  },
  "publisher": {
    "en": "Publisher in English",
    "es": "Distribuidor en español"
  },
  "developer": {
    "en": "Developer in English",
    "es": "Desarrollador en español"
  },
  "size": {
    "en": "Estimated Size in English (e.g. 12.5 GB, 500 MB)",
    "es": "Tamaño estimado en español"
  },
  "description": {
    "en": "An engaging game synopsis of about 80-100 words in English, describing the plot, gameplay, and setting.",
    "es": "Una sinopsis atractiva del juego de unas 80-100 palabras en español, describiendo la trama, jugabilidad y ambientación."
  }
}

Source text:
${scrapedText}`;

    console.log(`Calling Pollinations Text API for game details of "${title}"...`);
    const aiResponse = await axios.post('https://text.pollinations.ai/', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      model: 'openai',
      jsonMode: true
    });

    const responseText = aiResponse.data;
    let gameDetails;
    
    let rawContent = responseText;
    if (typeof responseText === 'object' && responseText !== null) {
      if (responseText.content) {
        rawContent = responseText.content;
      }
    }
    
    if (typeof rawContent === 'object' && rawContent !== null) {
      gameDetails = rawContent;
    } else if (typeof rawContent === 'string') {
      // Extract JSON safely
      const jsonStart = rawContent.indexOf('{');
      const jsonEnd = rawContent.lastIndexOf('}') + 1;
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("Invalid JSON returned by AI");
      }
      const jsonStr = rawContent.substring(jsonStart, jsonEnd);
      gameDetails = JSON.parse(jsonStr);
    } else {
      throw new Error("Unknown response format returned by AI");
    }

    // Save to cache
    fs.writeFileSync(cacheFile, JSON.stringify(gameDetails, null, 2));
    
    res.json(gameDetails);
  } catch (error) {
    console.error(`Error generating game details for "${title}":`, error.message);
    
    // Fallback response if anything fails
    const fallbackDetails = {
      genre: { en: "Action / Adventure", es: "Acción / Aventura" },
      releaseDate: { en: "Unknown", es: "Desconocido" },
      publisher: { en: "N/A", es: "N/A" },
      developer: { en: "N/A", es: "N/A" },
      size: { en: "Unknown Size", es: "Tamaño Desconocido" },
      description: {
        en: `Download ${title} for the ${consoleName} console. High-speed and secure download links are available below.`,
        es: `Descarga ${title} para la consola ${consoleName}. Enlaces de descarga segura de alta velocidad disponibles abajo.`
      }
    };
    res.json(fallbackDetails);
  }
});
// Admin login endpoint
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.json({ token: ADMIN_TOKEN });
  }
  return res.status(401).json({ error: "Contraseña incorrecta" });
});

// Admin verify token endpoint
app.post('/api/admin/verify-token', requireAdmin, (req, res) => {
  res.json({ valid: true });
});

// Setup memory storage multer for Excel files
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

// Endpoint to import excel files
app.post('/api/admin/import-excel', requireAdmin, excelUpload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No se ha subido ningún archivo" });
  }

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    if (rows.length === 0) {
      return res.status(400).json({ error: "El archivo Excel está vacío" });
    }

    // Try to guess consoleName from filename: e.g. Juegos_SWITCH.xlsx -> SWITCH
    let consoleName = 'SWITCH'; // default fallback
    const originalName = req.file.originalname;
    if (originalName.toLowerCase().startsWith('juegos_')) {
      consoleName = originalName.replace(/juegos_/i, '').replace(/\.xlsx$/i, '').replace(/\.xls$/i, '').trim().toUpperCase();
    } else {
      if (req.body.consoleName) {
        consoleName = req.body.consoleName.trim().toUpperCase();
      }
    }

    // Load existing games database to merge and preserve IDs/covers
    const gamesDataPath = path.join(__dirname, '..', 'src', 'data', 'games.json');
    let dbData = { consoles: [], games: [] };
    if (fs.existsSync(gamesDataPath)) {
      dbData = JSON.parse(fs.readFileSync(gamesDataPath, 'utf-8'));
    }

    const existingGamesMap = new Map();
    dbData.games.forEach(g => {
      const key = `${g.title.trim().toLowerCase()}_${g.console.trim().toLowerCase()}`;
      existingGamesMap.set(key, g);
    });

    let newGamesCount = 0;
    let updatedGamesCount = 0;

    const getDeterministicId = (title, consoleName) => {
      const normalized = `${title.trim().toLowerCase()}_${consoleName.trim().toLowerCase()}`;
      return crypto.createHash('md5').update(normalized).digest('hex').substring(0, 8);
    };

    rows.forEach(row => {
      const keys = Object.keys(row);
      let title = '';
      let links = [];
      let trailer = '';
      let sinopsis = '';

      for (const key of keys) {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('título') || lowerKey.includes('titulo') || lowerKey.includes('name') || lowerKey.includes('juego')) {
          title = row[key];
        }
        if (lowerKey.includes('sinopsis') || lowerKey.includes('descripcion') || lowerKey.includes('description')) {
          const sin = row[key];
          if (typeof sin === 'string' && sin.toLowerCase() !== 'no disponible' && sin.toLowerCase() !== 'n/a') {
            sinopsis = sin.trim();
          }
        }

        const val = row[key];
        if (typeof val === 'string' && val.includes('http')) {
          const urls = val.match(/https?:\/\/[^\s,]+/g);
          if (urls) {
            for (const u of urls) {
              if (u.includes('downloadgameps3') || u.includes('downloadgamepsp') || u.includes('dlxbgame.com') || u.includes('dlpsgame.com') || u.includes('gamepciso.com') || u.includes('nswgame.com') || u.includes('docs.google.com/spreadsheets')) {
                continue;
              }
              if (u.includes('youtube.com') || u.includes('youtu.be')) {
                trailer = u;
              } else {
                links.push(u);
              }
            }
          }
        }
      }

      if (!title || typeof title !== 'string' || !title.trim()) return;

      const trimmedTitle = title.trim();
      const key = `${trimmedTitle.toLowerCase()}_${consoleName.toLowerCase()}`;
      links = [...new Set(links)];

      if (existingGamesMap.has(key)) {
        const existing = existingGamesMap.get(key);
        if (links.length > 0 && JSON.stringify(existing.links) !== JSON.stringify(links)) {
          existing.links = links;
          existing.link = links[0];
          updatedGamesCount++;
        }
        if (trailer && existing.trailer !== trailer) {
          existing.trailer = trailer;
        }
        if (sinopsis && existing.sinopsis !== sinopsis) {
          existing.sinopsis = sinopsis;
        }
      } else {
        const newId = getDeterministicId(trimmedTitle, consoleName);
        const newGame = {
          id: newId,
          title: trimmedTitle,
          console: consoleName,
          links: links,
          link: links.length > 0 ? links[0] : '#',
          trailer: trailer,
          sinopsis: sinopsis,
          cover: ''
        };
        dbData.games.push(newGame);
        existingGamesMap.set(key, newGame);
        newGamesCount++;
      }
    });

    if (!dbData.consoles.includes(consoleName)) {
      dbData.consoles.push(consoleName);
      dbData.consoles.sort();
    }

    fs.writeFileSync(gamesDataPath, JSON.stringify(dbData, null, 2));

    console.log(`[Excel Import] Imported console: ${consoleName}. New: ${newGamesCount}, Updated links: ${updatedGamesCount}`);
    
    res.json({
      message: `Importación completada para la consola ${consoleName}.`,
      console: consoleName,
      newGamesCount,
      updatedGamesCount,
      totalGamesCount: dbData.games.length
    });

  } catch (err) {
    console.error("Error importing Excel file:", err.message);
    res.status(500).json({ error: `Error al procesar el archivo Excel: ${err.message}` });
  }
});

// Endpoint to return the status of all games (manual vs automatic vs pending)
app.get('/api/admin/games-status', requireAdmin, (req, res) => {
  try {
    const files = fs.readdirSync(CACHE_DIR).filter(file => file.endsWith('.json'));
    const statusMap = {};

    files.forEach(file => {
      const id = file.replace('.json', '');
      const filePath = path.join(CACHE_DIR, file);
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (content.isManualEdit) {
          statusMap[id] = 'manual';
        } else if (content.genre || content.description) {
          statusMap[id] = 'automatic';
        }
      } catch (err) {
        // Skip invalid file
      }
    });

    res.json(statusMap);
  } catch (err) {
    console.error("Error reading cache status map:", err.message);
    res.status(500).json({ error: "Error al leer el estado de los juegos" });
  }
});

// Admin save game details override endpoint
app.post('/api/admin/save-game', requireAdmin, (req, res) => {
  const { id, title, consoleName, customData } = req.body;
  
  if (!id || !title || !consoleName || !customData) {
    return res.status(400).json({ error: "Faltan parámetros requeridos: id, title, consoleName, customData" });
  }
  
  const cacheFile = path.join(CACHE_DIR, `${id}.json`);
  
  let mergedData = {};
  if (fs.existsSync(cacheFile)) {
    try {
      mergedData = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    } catch (e) {
      console.error("Error reading cache for merging:", e.message);
    }
  }
  
  // Merge custom edits into the cached game details JSON
  mergedData = {
    ...mergedData,
    ...customData,
    title,
    consoleName,
    id,
    isManualEdit: true, // Mark as manually edited!
    lastModified: Date.now()
  };
  
  try {
    fs.writeFileSync(cacheFile, JSON.stringify(mergedData, null, 2));
    console.log(`[Admin Override] Game details updated for: "${title}" (${consoleName})`);
    res.json({ message: "Juego guardado exitosamente", details: mergedData });
  } catch (err) {
    console.error("Error saving game cache overrides:", err.message);
    res.status(500).json({ error: "Error al escribir los cambios en el servidor" });
  }
});


// Admin image upload endpoint
app.post('/api/admin/upload-image', requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo.' });
  }
  const publicUrl = `/uploads/${req.file.filename}`;
  console.log(`[Admin Upload] Image saved: ${req.file.filename}`);
  res.json({ url: publicUrl, filename: req.file.filename });
});

// Admin TikTok Script Generator endpoint (Using Pollinations Free API)
app.post('/api/admin/generate-tiktok', requireAdmin, async (req, res) => {
  const { title, feature } = req.body;
  if (!title) return res.status(400).json({ error: 'Falta el título del juego' });

  const aiPrompt = `Actúa como un creador de contenido experto en videos verticales virales (TikTok/Shorts) sobre videojuegos. Escribe un guión de 15 a 20 segundos optimizado para retención total sobre el juego "${title}".

El juego se destaca principalmente por: "${feature || 'ser increíblemente entretenido'}".

RESTRICCIONES Y ESTILO ANTI-IA (¡MUY IMPORTANTE!):
* PROHIBIDO USAR las siguientes palabras o frases de IA: "adéntrate en", "sumérgete", "en conclusión", "descubre un mundo", "revolucionario", "es importante destacar", "épica aventura", "paisaje digital", "sin embargo", "además".
* No uses introducciones de bienvenida (como 'Hola a todos').
* Habla como un streamer de Twitch, tiktoker gamer o youtuber irreverente. Lenguaje coloquial, frases cortas, dinámico y muy directo al punto. Cero lenguaje corporativo.

El guión debe seguir estrictamente esta estructura dividida por escenas:

1. [Gancho 0-3s]: Una frase muy llamativa que detenga el scroll (No digas el nombre del juego aquí, genera misterio). Debe incluir una orden visual de texto en pantalla (CapCut style).
2. [Desarrollo 3-12s]: Explica brevemente por qué este juego es increíble o qué se puede hacer en él. Usa un tono enérgico y directo.
3. [CTA 12-15s]: Explica al usuario que puede conseguirlo y descargarlo yendo al enlace de nuestro perfil. Di textualmente: 'Consíguelo buscando ${title} en el link de mi perfil'.

Además, agrega al final:
4. [Entonación de Voz]: Instrucciones de cómo debe ser la voz (tono, velocidad, emoción).
5. [Ideas de B-Roll / Video]: 3 ideas exactas de qué tipo de clips de YouTube buscar para poner de fondo mientras suena el audio.

Devuelve la respuesta en formato de lista limpia, separando el Audio (Voz en off) y el Texto que debe ir pegado en el video, como en este ejemplo:
[Gancho 0-3s]
Voz en off: "Este es el juego de peleas anime que Nintendo no quiere que conozcas..."
Texto en pantalla: "¡EL JUEGO PROHIBIDO DE ANIME! 🚨"`;

  try {
    const aiResponse = await axios.post('https://text.pollinations.ai/', {
      messages: [{ role: 'user', content: aiPrompt }],
      model: 'openai'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    res.json({ script: aiResponse.data });
  } catch (error) {
    console.error('[Admin] Error generating TikTok script:', error.message);
    res.status(500).json({ error: 'Error generando el script con IA' });
  }
});

// ============================================================
// BACKGROUND SCRAPING QUEUE SYSTEM
// ============================================================

// Load all games from games.json for the scraping queue
const gamesDataPath = path.join(__dirname, '..', 'src', 'data', 'games.json');
let allGames = [];
try {
  const gamesRaw = fs.readFileSync(gamesDataPath, 'utf-8');
  allGames = JSON.parse(gamesRaw).games || [];
  console.log(`[Scraper] Loaded ${allGames.length} games from games.json`);
} catch (err) {
  console.error('[Scraper] Could not load games.json:', err.message);
}

// Scraping state
const scrapeState = {
  running: false,
  total: 0,
  processed: 0,
  succeeded: 0,
  failed: 0,
  skipped: 0,
  currentGame: null,
  errors: [],
  startedAt: null,
  stoppedAt: null
};


// Process a single game using AI general knowledge (fast batch mode)
const scrapeAndCacheGame = async (game) => {
  const cacheFile = path.join(CACHE_DIR, `${game.id}.json`);

  // Skip already cached
  if (fs.existsSync(cacheFile)) {
    scrapeState.skipped++;
    scrapeState.processed++;
    return;
  }

  scrapeState.currentGame = `${game.title} (${game.console})`;

  try {
    const systemPrompt = 'You are a professional bi-lingual gaming database editor returning JSON.';
    const prompt = `Generate a complete game data sheet for the video game "${game.title}" on the "${game.console}" console in BOTH English and Spanish.
Use your general knowledge. Output strictly valid JSON, no extra text.

{
  "genre": { "en": "Genre in English", "es": "Género en español" },
  "releaseDate": { "en": "Release year in English", "es": "Año en español" },
  "publisher": { "en": "Publisher name", "es": "Nombre del distribuidor" },
  "developer": { "en": "Developer name", "es": "Nombre del desarrollador" },
  "size": { "en": "Estimated file size", "es": "Tamaño estimado" },
  "description": { "en": "60-80 word engaging synopsis in English", "es": "Sinopsis de 60-80 palabras en español" }
}`;

    const aiResponse = await callPollinationsWithRetry({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      model: 'openai',
      jsonMode: true
    });

    const responseText = aiResponse.data;
    let gameDetails;
    let rawContent = responseText;

    if (typeof responseText === 'object' && responseText !== null) {
      rawContent = responseText.content || responseText;
    }

    if (typeof rawContent === 'object' && rawContent !== null) {
      gameDetails = rawContent;
    } else if (typeof rawContent === 'string') {
      const jsonStart = rawContent.indexOf('{');
      const jsonEnd = rawContent.lastIndexOf('}') + 1;
      if (jsonStart === -1 || jsonEnd === 0) throw new Error('No JSON found in AI response');
      gameDetails = JSON.parse(rawContent.substring(jsonStart, jsonEnd));
    } else {
      throw new Error('Unknown AI response format');
    }

    fs.writeFileSync(cacheFile, JSON.stringify(gameDetails, null, 2));
    scrapeState.succeeded++;
    scrapeState.processed++;
    console.log(`[Scraper ✓] ${game.title} (${game.console}) — ${scrapeState.processed}/${scrapeState.total}`);

  } catch (err) {
    scrapeState.failed++;
    scrapeState.processed++;
    scrapeState.errors.push({ game: game.title, error: err.message });
    console.error(`[Scraper ✗] "${game.title}": ${err.message}`);
  }
};

// Main background runner
const runScrapeQueue = async () => {
  const DELAY_BETWEEN_MS = 6000; // 6 seconds between games to stay within Pollinations rate limits
  const pending = allGames.filter(g => !fs.existsSync(path.join(CACHE_DIR, `${g.id}.json`)));

  scrapeState.total = allGames.length;
  scrapeState.skipped = allGames.length - pending.length; // already cached
  scrapeState.processed = scrapeState.skipped;
  scrapeState.startedAt = Date.now();
  scrapeState.stoppedAt = null;
  scrapeState.errors = [];

  console.log(`[Scraper] Starting queue: ${pending.length} games to process (${scrapeState.skipped} already cached)`);

  for (const game of pending) {
    if (!scrapeState.running) {
      console.log('[Scraper] Queue stopped by user.');
      break;
    }
    await scrapeAndCacheGame(game);
    if (scrapeState.running) {
      await delay(DELAY_BETWEEN_MS);
    }
  }

  scrapeState.running = false;
  scrapeState.currentGame = null;
  scrapeState.stoppedAt = Date.now();
  console.log(`[Scraper] Queue finished. Succeeded: ${scrapeState.succeeded}, Failed: ${scrapeState.failed}, Skipped: ${scrapeState.skipped}`);
};

// GET scrape status (public for admin dashboard — token still required)
app.get('/api/admin/scrape/status', requireAdmin, (req, res) => {
  const cached = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json')).length;
  res.json({
    ...scrapeState,
    cachedCount: cached,
    totalGames: allGames.length,
    pendingCount: allGames.length - cached
  });
});

// POST start scraping
app.post('/api/admin/scrape/start', requireAdmin, (req, res) => {
  if (scrapeState.running) {
    return res.json({ message: 'El scraping ya está en progreso.', state: scrapeState });
  }
  scrapeState.running = true;
  scrapeState.succeeded = 0;
  scrapeState.failed = 0;
  // Run async in background — don't await
  runScrapeQueue();
  res.json({ message: 'Scraping iniciado en segundo plano.', state: scrapeState });
});

// POST stop scraping
app.post('/api/admin/scrape/stop', requireAdmin, (req, res) => {
  scrapeState.running = false;
  scrapeState.stoppedAt = Date.now();
  res.json({ message: 'Scraping detenido.', state: scrapeState });
});

// POST reset only-fallback cached files so they get re-scraped
app.post('/api/admin/scrape/reset-fallbacks', requireAdmin, (req, res) => {
  let removed = 0;
  try {
    const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const filePath = path.join(CACHE_DIR, file);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (data._fallback === true) {
          fs.unlinkSync(filePath);
          removed++;
        }
      } catch (_) { /* skip malformed files */ }
    }
    res.json({ message: `Se eliminaron ${removed} archivos fallback para re-intentar.`, removed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ADD NEW GAME ENDPOINT
// ============================================================
app.post('/api/admin/add-game', requireAdmin, (req, res) => {
  const { title, console: consoleName, link, cover } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'El título es obligatorio.' });
  }
  if (!consoleName || !consoleName.trim()) {
    return res.status(400).json({ error: 'La consola es obligatoria.' });
  }

  try {
    // Read current games.json
    const gamesRaw = fs.readFileSync(gamesDataPath, 'utf-8');
    const gamesData = JSON.parse(gamesRaw);

    // Generate unique ID (8 char alphanumeric)
    const newId = Math.random().toString(36).substring(2, 10);

    const newGame = {
      id: newId,
      title: title.trim(),
      console: consoleName.trim().toUpperCase(),
      link: (link || '').trim(),
      cover: (cover || '').trim()
    };

    gamesData.games.push(newGame);

    // Write back to games.json
    fs.writeFileSync(gamesDataPath, JSON.stringify(gamesData, null, 2));

    // Also update in-memory allGames so scraper picks it up
    allGames = gamesData.games;

    console.log(`[Admin] New game added: "${newGame.title}" (${newGame.console}) — ID: ${newGame.id}`);
    res.json({ message: 'Juego agregado correctamente.', game: newGame });
  } catch (err) {
    console.error('[Admin] Error adding game:', err.message);
    res.status(500).json({ error: 'Error al guardar el juego: ' + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Modo Bilingüe Activo: Google News + batchexecute + Pollinations.ai (Stale Check Activo)`);
});
