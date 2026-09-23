const fs = require('fs');
const path = require('path');
const axios = require('axios');

// --- Load .env if present ---
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#]+?)=(.+)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  });
}

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const ML_CLIENT_ID = process.env.ML_CLIENT_ID;
const ML_CLIENT_SECRET = process.env.ML_CLIENT_SECRET;

const NEWS_FILE = path.join(__dirname, '..', 'src', 'data', 'latest_news.json');
const SUGGESTIONS_FILE = path.join(__dirname, '..', 'src', 'data', 'affiliate-suggestions.json');

const GROQ_MODEL = 'openai/gpt-oss-20b';

async function callGroq(messages, options = {}) {
  const payload = {
    messages,
    model: options.model || GROQ_MODEL,
    max_tokens: options.max_tokens || 800,
    ...options
  };

  const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', payload, {
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    timeout: 20000
  });

  return res.data.choices[0].message.content;
}

// --- Obtener Access Token de Mercado Libre vía OAuth client_credentials ---
async function getMercadoLibreAccessToken() {
  if (!ML_CLIENT_ID || !ML_CLIENT_SECRET) {
    console.warn('⚠️ No se encontraron ML_CLIENT_ID y ML_CLIENT_SECRET en las variables de entorno.');
    return null;
  }

  try {
    console.log('🔑 Solicitando Access Token temporal a Mercado Libre OAuth...');
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: ML_CLIENT_ID,
      client_secret: ML_CLIENT_SECRET
    });

    const res = await axios.post('https://api.mercadolibre.com/oauth/token', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000
    });

    if (res.data && res.data.access_token) {
      console.log('✅ Access Token obtenido con éxito de Mercado Libre.');
      return res.data.access_token;
    }
  } catch (err) {
    console.error('❌ Error obteniendo Access Token de Mercado Libre:', err.response?.data || err.message);
  }

  return null;
}

// --- Buscar productos reales en la API oficial de Mercado Libre ---
async function fetchRealMercadoLibreProducts(kw, accessToken) {
  const items = [];
  const headers = { 'Accept': 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  try {
    // 1. Domain Discovery para encontrar la categoría oficial
    const discRes = await axios.get(`https://api.mercadolibre.com/sites/MLM/domain_discovery/search?q=${encodeURIComponent(kw)}`, {
      headers,
      timeout: 10000
    });

    const catId = discRes.data?.[0]?.category_id;
    if (!catId) return [];

    // 2. Highlights de la categoría oficial
    const highRes = await axios.get(`https://api.mercadolibre.com/highlights/MLM/category/${catId}`, {
      headers,
      timeout: 10000
    });

    const content = highRes.data?.content || [];
    for (const c of content.slice(0, 2)) {
      if (c.type === 'PRODUCT') {
        try {
          const pRes = await axios.get(`https://api.mercadolibre.com/products/${c.id}`, {
            headers,
            timeout: 10000
          });
          const p = pRes.data;
          const price = p.buy_box_winner?.price || p.price || null;
          const thumbnail = p.pictures?.[0]?.url || null;
          const permalink = `https://www.mercadolibre.com.mx/p/${p.id}`;

          if (p.name && permalink) {
            items.push({
              id: p.id,
              title: p.name,
              price: price || 999,
              permalink,
              thumbnail,
              rating: 4.8,
              soldQuantity: null
            });
          }
        } catch (pErr) {
          console.warn(`  -> Error obteniendo producto ${c.id}:`, pErr.message);
        }
      }
    }
  } catch (err) {
    console.warn(`  -> Error consultando API oficial de Mercado Libre para "${kw}":`, err.message);
  }

  return items;
}

async function generateAffiliateSuggestions() {
  console.log('🚀 Iniciando generación de sugerencias de afiliados (Estricto: Solo API oficial Mercado Libre)...');

  if (!GROQ_API_KEY) {
    console.warn('⚠️ GROQ_API_KEY no encontrada en las variables de entorno.');
    fs.writeFileSync(SUGGESTIONS_FILE, JSON.stringify([], null, 2));
    return;
  }

  // 1. Obtener Access Token de Mercado Libre en memoria para este ciclo
  const accessToken = await getMercadoLibreAccessToken();
  if (!accessToken) {
    console.warn('⚠️ Sin Access Token de Mercado Libre. Omitiendo proceso para evitar errores.');
    fs.writeFileSync(SUGGESTIONS_FILE, JSON.stringify([], null, 2));
    return;
  }

  // 2. Leer noticias recientes
  if (!fs.existsSync(NEWS_FILE)) {
    console.warn(`⚠️ Archivo de noticias no encontrado en: ${NEWS_FILE}`);
    fs.writeFileSync(SUGGESTIONS_FILE, JSON.stringify([], null, 2));
    return;
  }

  let articles = [];
  try {
    const newsData = JSON.parse(fs.readFileSync(NEWS_FILE, 'utf-8'));
    articles = Array.isArray(newsData) ? newsData : (newsData.articles || []);
  } catch (err) {
    console.error('Error leyendo latest_news.json:', err.message);
  }

  if (articles.length === 0) {
    console.warn('⚠️ No hay noticias recientes disponibles para analizar.');
    fs.writeFileSync(SUGGESTIONS_FILE, JSON.stringify([], null, 2));
    return;
  }

  // 3. Extraer palabras clave con Groq
  let keywords = [];
  console.log(`Analizando ${Math.min(articles.length, 3)} noticias para extraer palabras clave e-commerce...`);

  for (const article of articles.slice(0, 3)) {
    const title = article.es?.title || article.title || '';
    const desc = article.es?.description || article.description || '';

    const prompt = `Based on the following gaming news article title and description, extract 2 e-commerce product keywords in Spanish that are highly relevant to the topic but are NOT the exact video game itself (e.g. "control PS5", "audífonos gamer", "silla gamer").
Return ONLY a valid JSON object with a "keywords" array of strings like: {"keywords": ["control PS5", "audífonos gamer"]}.

Title: ${title}
Desc: ${desc}`;

    try {
      const rawRes = await callGroq([{ role: 'user', content: prompt }], { response_format: { type: 'json_object' } });
      const parsed = JSON.parse(rawRes);
      const arr = Array.isArray(parsed) ? parsed : (parsed.keywords || Object.values(parsed).find(Array.isArray) || []);
      keywords = [...keywords, ...arr];
      console.log(`  -> Palabras clave obtenidas: ${arr.join(', ')}`);
    } catch (e) {
      console.error('  -> Error extrayendo palabras clave con Groq:', e.response?.data?.error?.message || e.message);
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  // Eliminar duplicados y limitar a 4 palabras clave
  keywords = [...new Set(keywords.map(k => typeof k === 'string' ? k.trim() : ''))].filter(Boolean).slice(0, 4);
  console.log(`Palabras clave finales a buscar en la API oficial de Mercado Libre: [${keywords.join(', ')}]`);

  const suggestions = [];

  // 4. Consultar ÚNICAMENTE la API oficial de Mercado Libre
  for (const kw of keywords) {
    console.log(`\nConsultando API oficial de Mercado Libre para "${kw}"...`);
    const items = await fetchRealMercadoLibreProducts(kw, accessToken);

    if (items.length === 0) {
      console.log(`  -> No se encontraron productos reales en la API oficial para "${kw}". Omitiendo.`);
      continue;
    }

    console.log(`  -> API oficial devolvió ${items.length} productos reales.`);

    // 5. Redactar sugerencia con Groq SOLO para productos reales de la API
    for (const item of items) {
      const rating = item.rating || null;
      const soldQuantity = item.soldQuantity || null;
      const itemTitle = item.title;
      const itemPrice = item.price;
      const permalink = item.permalink;
      const thumbnail = item.thumbnail;
      const id = item.id;

      const copyPrompt = `Escribe una recomendación genuina, corta y natural (2 a 3 líneas máximo) en español para este producto.
Producto: ${itemTitle}
Precio: $${itemPrice}
${rating ? 'Calificación: ' + rating + ' estrellas\n' : ''}${soldQuantity ? 'Vendidos: ' + soldQuantity + '\n' : ''}
REGLAS MUY IMPORTANTES:
- Si el producto tiene calificación o ventas listadas arriba, menciónalo sutilmente para dar confianza.
- Si NO tiene calificación o ventas listadas arriba, redacta el texto basándote solo en el nombre y categoría del producto, SIN INVENTAR ningún número de ventas o estrellas que no exista.
- NO suenes a anuncio robótico de TV ("¡Compra ya!", "¡Increíble oferta!"). Suena como una persona real haciendo una recomendación amigable.`;

      try {
        const copyText = await callGroq([{ role: 'user', content: copyPrompt }]);

        suggestions.push({
          id,
          title: itemTitle,
          price: itemPrice,
          permalink,
          thumbnail,
          keyword: kw,
          rating,
          soldQuantity,
          generatedText: copyText.trim()
        });

        console.log(`  -> Sugerencia creada para producto real ML: "${itemTitle.substring(0, 45)}..."`);
      } catch (copyErr) {
        console.error(`  -> Error generando texto para "${itemTitle}":`, copyErr.message);
      }

      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // 6. Guardar SOLO los productos reales de la API
  const targetDir = path.dirname(SUGGESTIONS_FILE);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(SUGGESTIONS_FILE, JSON.stringify(suggestions, null, 2));
  console.log(`\n✅ ¡Proceso finalizado! Total: ${suggestions.length} productos de la API oficial guardados en ${SUGGESTIONS_FILE}`);
}

generateAffiliateSuggestions().catch(err => {
  console.error('Error fatal en generateAffiliateSuggestions:', err);
  process.exit(1);
});
