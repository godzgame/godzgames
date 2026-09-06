const fs = require('fs');
const path = require('path');
const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

// --- Load .env ---
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#]+?)=(.+)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  });
}

const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) {
  console.error('ERROR: Falta GROQ_API_KEY en el archivo .env');
  process.exit(1);
}

const parser = new Parser();
const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const NEWS_FILE = path.join(__dirname, '..', 'src', 'data', 'latest_news.json');
if (!fs.existsSync(path.dirname(NEWS_FILE))) fs.mkdirSync(path.dirname(NEWS_FILE), { recursive: true });

// --- Exponential Backoff helper (same as batch_update_rawg.cjs) ---
async function fetchWithBackoff(url, options, maxRetries = 5) {
  let delay = 3000;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429) {
        if (i === maxRetries - 1) throw new Error('Max retries reached on 429');
        console.log(`  -> ⚠️ Rate limit 429 detectado. Reintentando en ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      return res;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      console.log(`  -> ⚠️ Error de conexión. Reintentando en ${delay / 1000}s...`);
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }
}

// --- Similarity check: returns true if texts are "almost identical" (>90% words match) ---
function areTextsAlmostIdentical(textA, textB) {
  if (!textA || !textB) return true;
  const wordsA = textA.toLowerCase().split(/\s+/);
  const wordsB = new Set(textB.toLowerCase().split(/\s+/));
  const matchCount = wordsA.filter(w => wordsB.has(w)).length;
  const similarity = matchCount / Math.max(wordsA.length, 1);
  return similarity > 0.90;
}

// --- Groq API: rewrite article bilingually ---
const rewriteArticleWithGroq = async (title, originalText) => {
  const prompt = `Actúa como un periodista de videojuegos profesional y neutral.
Tengo esta noticia original:
Título: "${title}"
Texto: "${originalText.substring(0, 2000)}"

Tu tarea es reescribir esta noticia para que sea 100% original y fluida, respetando ESTRICTAMENTE estas reglas de periodismo neutral:
1. SOLO reporta los hechos tal como los presenta la fuente original. NO agregues interpretación, juicio de valor ni caracterización propia.
2. PROHIBIDO usar palabras como: parodia, sátira, ridiculizar, farsa, controvertido, polémico, decepcionante, satírico, ni ningún término que implique una opinión o juicio tuyo sobre los hechos.
3. Si el artículo original no califica algo como bueno, malo, serio o cómico, TÚ tampoco lo hagas.
4. El titular puede ser claro y directo, pero debe ser FÁCTICO — no debe implicar una postura que el artículo original no tiene explícitamente.
5. Que sea fluido y natural, no una traducción automática.
Devuelve SOLO un JSON válido (sin markdown, sin bloques de código) con este formato exacto:
{"en":{"title":"(Título fáctico en inglés)","body":"(Cuerpo de la noticia reescrito en inglés, 2-3 párrafos)"},"es":{"title":"(Título fáctico en español)","body":"(Cuerpo de la noticia reescrito en español, 2-3 párrafos)"}}\`;

  const res = await fetchWithBackoff('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1200
    })
  }, 5);

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error ${res.status}: ${errText.substring(0, 200)}`);
  }

  const data = await res.json();
  const rawText = data?.choices?.[0]?.message?.content || '';

  const jsonStart = rawText.indexOf('{');
  const jsonEnd = rawText.lastIndexOf('}') + 1;
  if (jsonStart === -1 || jsonEnd === 0) throw new Error('No se encontró JSON válido en la respuesta de Groq');

  const parsed = JSON.parse(rawText.substring(jsonStart, jsonEnd));
  if (!parsed.en || !parsed.es) throw new Error('JSON de Groq no tiene las claves en/es esperadas');

  return parsed;
};

// --- Fallback: Google Translate (unofficial) ---
const translateToSpanish = async (text) => {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(text.substring(0, 4000))}`;
  const res = await axios.get(url, { timeout: 15000 });
  if (res.data && res.data[0]) {
    return res.data[0].map(item => item[0]).join('');
  }
  throw new Error('Google Translate no devolvió respuesta válida');
};

// --- Main translation: Groq first, then Google Translate, then skip ---
const rewriteArticleBilingual = async (title, originalText) => {
  // 1. Try Groq
  try {
    console.log(`  -> Usando Groq para reescribir...`);
    const result = await rewriteArticleWithGroq(title, originalText);
    // Validate that Spanish is not just the English text
    if (areTextsAlmostIdentical(result.en.body, result.es.body)) {
      throw new Error('Groq devolvió textos EN y ES casi idénticos (sin traducir real)');
    }
    console.log(`  -> ✅ Groq OK.`);
    return result;
  } catch (groqErr) {
    console.warn(`  -> ⚠️ Groq falló: ${groqErr.message}. Intentando fallback con Google Translate...`);
  }

  // 2. Fallback: Google Translate
  try {
    const translatedTitle = await translateToSpanish(title);
    const translatedBody = await translateToSpanish(originalText);

    // Validate that the translation is actually different
    if (areTextsAlmostIdentical(originalText, translatedBody)) {
      throw new Error('Google Translate devolvió texto idéntico al original (sin traducir)');
    }

    console.log(`  -> ✅ Google Translate OK (fallback).`);
    return {
      en: { title: title, body: originalText },
      es: { title: translatedTitle, body: translatedBody }
    };
  } catch (translateErr) {
    console.error(`  -> ❌ Google Translate también falló: ${translateErr.message}`);
  }

  // 3. Both failed — return null so the caller skips this article
  return null;
};

// --- Image helpers ---
const downloadAnyImageLocally = async (imageUrl) => {
  try {
    console.log(`  -> Descargando imagen: "${imageUrl.substring(0, 60)}..."`);
    const res = await axios({
      url: imageUrl, method: 'GET', responseType: 'stream', timeout: 20000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const filename = `news_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
    const destPath = path.join(UPLOADS_DIR, filename);
    const writer = fs.createWriteStream(destPath);
    res.data.pipe(writer);
    await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
    return `https://raw.githubusercontent.com/godzgame/godzgames/main/public/uploads/${filename}`;
  } catch (err) {
    console.error(`  -> Error descargando imagen: ${err.message}`);
    return null;
  }
};

const downloadAiImage = async (promptText) => {
  try {
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?width=800&height=500&nologo=true&seed=${Math.floor(Math.random() * 10000)}`;
    return await downloadAnyImageLocally(imageUrl);
  } catch (err) {
    console.error(`  -> Error generando imagen AI: ${err.message}`);
    return null;
  }
};

// --- Google News URL decoder ---
const getArticleUrl = async (googleRssUrl) => {
  try {
    const response = await axios.get(googleRssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36' },
      timeout: 6000
    });
    const $ = cheerio.load(response.data);
    const data = $('c-wiz[data-p]').attr('data-p');
    if (!data) return googleRssUrl;
    const obj = JSON.parse(data.replace('%.@.', '["garturlreq",'));
    const payload = { 'f.req': JSON.stringify([[['Fbv4je', JSON.stringify([...obj.slice(0, -6), ...obj.slice(-2)]), 'null', 'generic']]]) };
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'User-Agent': 'Mozilla/5.0' };
    const postResponse = await axios.post('https://news.google.com/_/DotsSplashUi/data/batchexecute', new URLSearchParams(payload).toString(), { headers, timeout: 6000 });
    let cleaned = postResponse.data;
    if (cleaned.startsWith(")]}'")) cleaned = cleaned.substring(4);
    const parsedData = JSON.parse(cleaned);
    const articleUrl = JSON.parse(parsedData[0][2])[1];
    return articleUrl || googleRssUrl;
  } catch (err) {
    return googleRssUrl;
  }
};

// --- Article scraper ---
const scrapeArticleTextAndImage = async (url) => {
  try {
    const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 });
    const $ = cheerio.load(data);
    let paragraphs = [];
    const selectors = ['article p', '.c-entry-content p', '.article-content p', '.article-body p', '.entry-content p', '.page-content p', 'main p', 'p'];
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
    let imageUrl = ($('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || '').trim();
    if (imageUrl && imageUrl.startsWith('/')) {
      const urlObj = new URL(url);
      imageUrl = `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
    }
    return { text: paragraphs.slice(0, 6).join('\n\n'), imageUrl };
  } catch (error) {
    console.error(`  -> Error scraping ${url}: ${error.message}`);
    return { text: '', imageUrl: '' };
  }
};

// --- Main function ---
const generateNews = async () => {
  console.log('Iniciando generación bilingüe de noticias con Groq...');

  try {
    const query = encodeURIComponent('video games');
    const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
    const feed = await parser.parseURL(url);

    if (!feed || !feed.items || feed.items.length === 0) {
      console.log('No items found in Google News feed.');
      return;
    }

    const newsData = [];
    const titlesSet = new Set();

    for (const item of feed.items) {
      if (newsData.length === 5) break;

      let cleanTitle = item.title;
      const lastDash = cleanTitle.lastIndexOf(' - ');
      if (lastDash !== -1) cleanTitle = cleanTitle.substring(0, lastDash).trim();

      const titlePrefix = cleanTitle.toLowerCase().substring(0, 18);
      if (titlesSet.has(titlePrefix)) continue;
      titlesSet.add(titlePrefix);

      try {
        console.log(`\nProcessing: ${cleanTitle}`);
        const resolvedUrl = await getArticleUrl(item.link);
        const { text: originalText, imageUrl: scrapedImageUrl } = await scrapeArticleTextAndImage(resolvedUrl);

        if (!originalText || originalText.length < 200) {
          console.log(`  -> Skipping (too short / blocked)`);
          continue;
        }

        // ── Translate / rewrite ──
        const rewritten = await rewriteArticleBilingual(cleanTitle, originalText);

        // CRITICAL: if both Groq and fallback failed, skip this article entirely
        if (!rewritten) {
          console.warn(`  -> ⛔ Traducción fallida. Artículo OMITIDO (se reintentará en el próximo ciclo).`);
          continue;
        }

        if (!rewritten.en.body || rewritten.en.body.trim().length < 50 ||
            !rewritten.es.body || rewritten.es.body.trim().length < 50) {
          console.warn(`  -> ⛔ Cuerpo demasiado corto. Artículo OMITIDO.`);
          continue;
        }

        // ── Safety validation: EN and ES must NOT be identical ──
        if (areTextsAlmostIdentical(rewritten.en.body, rewritten.es.body)) {
          console.warn(`  -> ⛔ Validación: ES e EN son casi idénticos. Artículo OMITIDO (no se publica sin traducción real).`);
          continue;
        }

        // ── Download image ──
        let finalImageUrl = null;
        if (scrapedImageUrl) finalImageUrl = await downloadAnyImageLocally(scrapedImageUrl);
        if (!finalImageUrl) {
          const cleanTitleForImage = rewritten.en.title.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 60);
          finalImageUrl = await downloadAiImage(`Epic, striking, dynamic video game concept art representing: ${cleanTitleForImage}. Vibrant colors, dramatic cinematic lighting, 8k resolution, highly detailed. No text.`);
        }

        let enDesc = rewritten.en.body.split('\n')[0] || '';
        if (enDesc.length > 150) enDesc = enDesc.substring(0, 147) + '...';
        let esDesc = rewritten.es.body.split('\n')[0] || '';
        if (esDesc.length > 150) esDesc = esDesc.substring(0, 147) + '...';

        newsData.push({
          id: crypto.createHash('md5').update(resolvedUrl).digest('hex'),
          tag: 'NEWS',
          image: finalImageUrl,
          link: resolvedUrl,
          en: { title: rewritten.en.title, description: enDesc, fullContent: rewritten.en.body },
          es: { title: rewritten.es.title, description: esDesc, fullContent: rewritten.es.body }
        });

        console.log(`  -> ✅ Noticia lista: "${rewritten.es.title}"`);

      } catch (itemErr) {
        console.error(`  -> Error procesando "${cleanTitle}": ${itemErr.message}`);
      }
    }

    if (newsData.length >= 3) {
      fs.writeFileSync(NEWS_FILE, JSON.stringify({ updatedAt: Date.now(), articles: newsData }, null, 2));
      console.log(`\n✅ Noticias actualizadas con éxito (${newsData.length} artículos).`);
    } else {
      console.warn(`\n⚠️ Solo se generaron ${newsData.length} noticias. Se mantiene el archivo anterior sin cambios.`);
    }
  } catch (error) {
    console.error('Error general en generateNews:', error.message);
  }
};

generateNews();
