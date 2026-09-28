const fs = require('fs');
const path = require('path');

const LATEST_NEWS_FILE = path.join(__dirname, '..', 'src', 'data', 'latest_news.json');
const CONTENT_DIR = path.join(__dirname, '..', 'content', 'news');
const RSS_FILE = path.join(__dirname, '..', 'public', 'news_rss.xml');

const generateNewsRSS = () => {
  console.log('Generando RSS de NOTICIAS para Make.com y redes sociales...');
  
  let articles = [];

  // 1. Cargar desde latest_news.json (noticias de IA actualizadas)
  if (fs.existsSync(LATEST_NEWS_FILE)) {
    try {
      const raw = fs.readFileSync(LATEST_NEWS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.articles)) {
        parsed.articles.forEach(art => {
          const title = art.es?.title || art.en?.title || 'Noticia de Videojuegos';
          const description = art.es?.description || art.en?.description || '';
          const image = art.image && art.image.startsWith('http') 
            ? art.image 
            : `https://www.godzgames.com${art.image || '/logo.png'}`;

          articles.push({
            id: art.id,
            title: title,
            description: description,
            image: image,
            link: art.link || `https://www.godzgames.com?article=${art.id}`,
            publishedAt: parsed.updatedAt || Date.now()
          });
        });
      }
    } catch (e) {
      console.error('Error leyendo latest_news.json:', e.message);
    }
  }

  // 2. Cargar desde content/news/*.md (si existen)
  if (fs.existsSync(CONTENT_DIR)) {
    try {
      const fm = require('front-matter');
      const files = fs.readdirSync(CONTENT_DIR).filter(file => file.endsWith('.md'));
      for (const file of files) {
        try {
          const filePath = path.join(CONTENT_DIR, file);
          const rawContent = fs.readFileSync(filePath, 'utf-8');
          const parsed = fm(rawContent);
          const slug = parsed.attributes.slug || file.replace('.md', '');
          articles.push({
            id: slug,
            title: parsed.attributes.title,
            description: parsed.attributes.description || parsed.body.substring(0, 150),
            image: parsed.attributes.image,
            link: `https://www.godzgames.com?article=${slug}`,
            publishedAt: new Date(parsed.attributes.publishedAt || Date.now()).getTime()
          });
        } catch (e) {}
      }
    } catch (e) {}
  }

  const siteUrl = 'https://www.godzgames.com';

  const escapeXml = (unsafe) => {
    if (!unsafe) return '';
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  let rssItems = articles.map(article => {
    const title = escapeXml(article.title);
    const description = escapeXml(article.description || `Lee la noticia completa en GodZGames.`);
    const imageUrl = article.image || `${siteUrl}/logo.png`;
    const articleUrl = article.link || `${siteUrl}?article=${article.id}`;

    return `
    <item>
      <title>${title}</title>
      <link>${articleUrl}</link>
      <guid isPermaLink="false">${article.id}</guid>
      <description><![CDATA[
        <p>${description}</p>
        <img src="${imageUrl}" alt="${title}" />
        <p><a href="${articleUrl}">Leer noticia completa en GodZGames</a></p>
      ]]></description>
      <enclosure url="${imageUrl}" type="image/jpeg" />
      <category>Noticias Gaming</category>
    </item>`;
  }).join('');

  const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>GodZGames - Últimas Noticias</title>
    <link>${siteUrl}</link>
    <description>Noticias de videojuegos, actualizaciones y más.</description>
    <language>es-ES</language>
    ${rssItems}
  </channel>
</rss>`;

  fs.writeFileSync(RSS_FILE, rssFeed, 'utf-8');
  console.log('RSS de noticias generado correctamente en public/news_rss.xml');
};

generateNewsRSS();

