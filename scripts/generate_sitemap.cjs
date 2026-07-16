const fs = require('fs');
const path = require('path');

// Cargar variables de entorno si existe dotenv
try {
  require('dotenv').config();
} catch (e) {
  // Ignorar si dotenv no está instalado a nivel global/script
}

const gamesDataPath = path.join(__dirname, '../src/data/games.json');
const publicDir = path.join(__dirname, '../public');
const distDir = path.join(__dirname, '../dist');

// Configuración de dominio y rutas
// 1. Prioriza variable de entorno SITE_URL
// 2. Prioriza argumento de terminal: node generate_sitemap.js https://miweb.com
// 3. Fallback por defecto: https://godzgames.com
const siteUrl = process.argv[2] || process.env.SITE_URL || 'https://godzgames.com';

// Enrutamiento con parámetros de consulta para SEO
console.log(`[Sitemap Generator] Usando dominio: ${siteUrl}`);
console.log(`[Sitemap Generator] Enrutamiento: Rutas con query parameters (/?game=id)`);

// Función para formatear la fecha actual en YYYY-MM-DD
const getTodayDate = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const generateSitemap = () => {
  if (!fs.existsSync(gamesDataPath)) {
    console.error(`[Sitemap Generator] Error: No se encontró el archivo de datos en: ${gamesDataPath}`);
    process.exit(1);
  }

  let gamesData;
  try {
    gamesData = JSON.parse(fs.readFileSync(gamesDataPath, 'utf-8'));
  } catch (err) {
    console.error(`[Sitemap Generator] Error al parsear games.json:`, err.message);
    process.exit(1);
  }

  const games = gamesData.games || [];
  console.log(`[Sitemap Generator] Procesando ${games.length} juegos para el sitemap...`);

  const today = getTodayDate();
  const cleanUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // 1. URL de la página de inicio
  xml += '  <url>\n';
  xml += `    <loc>${cleanUrl}/</loc>\n`;
  xml += `    <lastmod>${today}</lastmod>\n`;
  xml += '    <changefreq>daily</changefreq>\n';
  xml += '    <priority>1.0</priority>\n';
  xml += '  </url>\n';

  // 2. URLs de los videojuegos
  games.forEach(game => {
    if (!game.id) return;
    
    // Crear la ruta según el tipo de enrutador
    const gamePath = `/?game=${game.id}`;
    const fullUrl = `${cleanUrl}${gamePath}`;

    xml += '  <url>\n';
    xml += `    <loc>${fullUrl}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.7</priority>\n';
    xml += '  </url>\n';
  });

  xml += '</urlset>\n';

  // Asegurar que la carpeta public existe
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Guardar en public/sitemap.xml
  const publicSitemapPath = path.join(publicDir, 'sitemap.xml');
  fs.writeFileSync(publicSitemapPath, xml);
  console.log(`[Sitemap Generator] Sitemap guardado en: ${publicSitemapPath}`);

  // Guardar también en dist/sitemap.xml si la carpeta dist ya está creada
  if (fs.existsSync(distDir)) {
    const distSitemapPath = path.join(distDir, 'sitemap.xml');
    fs.writeFileSync(distSitemapPath, xml);
    console.log(`[Sitemap Generator] Copiado a dist en: ${distSitemapPath}`);
  }

  return cleanUrl;
};

const generateRobots = (cleanUrl) => {
  const robotsContent = `User-agent: *
Allow: /

Sitemap: ${cleanUrl}/sitemap.xml
`;

  // Guardar en public/robots.txt
  const publicRobotsPath = path.join(publicDir, 'robots.txt');
  fs.writeFileSync(publicRobotsPath, robotsContent);
  console.log(`[Sitemap Generator] Robots.txt guardado en: ${publicRobotsPath}`);

  // Guardar en dist/robots.txt si dist existe
  if (fs.existsSync(distDir)) {
    const distRobotsPath = path.join(distDir, 'robots.txt');
    fs.writeFileSync(distRobotsPath, robotsContent);
    console.log(`[Sitemap Generator] Copiado a dist en: ${distRobotsPath}`);
  }
};

const cleanUrl = generateSitemap();
generateRobots(cleanUrl);
console.log('[Sitemap Generator] ¡Proceso completado con éxito!');
