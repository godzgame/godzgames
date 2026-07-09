const fs = require('fs');
const path = require('path');

const GAMES_FILE = path.join(__dirname, '..', 'src', 'data', 'games.json');
const RSS_FILE = path.join(__dirname, '..', 'public', 'rss.xml');

const generateRSS = () => {
  console.log('Generando RSS de juegos para Make.com y redes sociales...');
  
  if (!fs.existsSync(GAMES_FILE)) {
    console.error('El archivo games.json no existe.');
    return;
  }

  const rawData = fs.readFileSync(GAMES_FILE, 'utf-8');
  let data;
  try {
    data = JSON.parse(rawData);
  } catch (e) {
    console.error('Error parseando games.json:', e.message);
    return;
  }

  const games = data.games || [];
  
  // Asumimos que los últimos juegos agregados están al final del array
  // Tomamos los últimos 50 juegos para el RSS
  const latestGames = games.slice(-50).reverse();

  let rssItems = '';
  const siteUrl = 'https://www.godzgames.com';

  latestGames.forEach(game => {
    // Si no tiene carátula, usamos el logo genérico
    const imageUrl = game.cover && game.cover.startsWith('http') ? game.cover : `${siteUrl}/logo.png`;
    
    // Crear una URL única para el juego (simulada) para que Make la lea
    const gameUrl = `${siteUrl}?search=${encodeURIComponent(game.title)}`;
    
    // Escapar caracteres XML
    const escapeXml = (unsafe) => {
      if (!unsafe) return '';
      return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    const title = escapeXml(`Nuevo juego: ${game.title} (${game.console})`);
    const description = escapeXml(game.sinopsis || `Descarga ${game.title} para ${game.console} gratis en GodZGames.`);
    
    rssItems += `
    <item>
      <title>${title}</title>
      <link>${gameUrl}</link>
      <guid isPermaLink="false">${game.id}</guid>
      <description><![CDATA[
        <p>${description}</p>
        <img src="${imageUrl}" alt="${escapeXml(game.title)}" />
        <p><a href="${gameUrl}">Descargar ahora</a></p>
      ]]></description>
      <enclosure url="${imageUrl}" type="image/jpeg" />
      <category>${escapeXml(game.console)}</category>
    </item>`;
  });

  const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>GodZGames - Últimos Juegos</title>
    <link>${siteUrl}</link>
    <description>Últimos videojuegos agregados a GodZGames para descargar gratis.</description>
    <language>es-ES</language>
    ${rssItems}
  </channel>
</rss>`;

  fs.writeFileSync(RSS_FILE, rssFeed, 'utf-8');
  console.log('RSS generado correctamente en public/rss.xml');
};

generateRSS();
