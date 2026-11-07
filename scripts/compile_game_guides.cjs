const fs = require('fs');
const path = require('path');

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

const GUIDES_DIR = path.join(__dirname, '../content/guias');
const GAMES_PATH = path.join(__dirname, '../src/data/games.json');
const AFFILIATES_PATH = path.join(__dirname, '../src/data/affiliates.json');
const OUTPUT_PATH = path.join(__dirname, '../src/data/game_guides.json');

/**
 * Convierte Markdown limpio a HTML estilizado para guías de GodZGames
 */
function parseMarkdownToHtml(md) {
  if (!md) return '';
  let text = md.trim();

  // Strip front matter if present
  text = text.replace(/^---[\s\S]*?---\s*/, '');

  // 1. Code blocks
  const codeBlocks = [];
  text = text.replace(/```([a-z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`<pre class="guide-code-block"><code>${escapeHtml(code.trim())}</code></pre>`);
    return placeholder;
  });

  // 2. Tables
  text = text.replace(/(?:^|\n)(\|.+?\|\n\|[\s\-:|]+\|\n(?:\|.+?\|\n?)+)/g, (match) => {
    const lines = match.trim().split('\n');
    if (lines.length < 2) return match;
    const headerCols = lines[0].split('|').slice(1, -1).map(c => c.trim());
    const rowLines = lines.slice(2);
    let tableHtml = '<div class="guide-table-wrap"><table class="guide-table"><thead><tr>';
    headerCols.forEach(col => {
      tableHtml += `<th>${col}</th>`;
    });
    tableHtml += '</tr></thead><tbody>';
    rowLines.forEach(row => {
      if (!row.trim()) return;
      const cols = row.split('|').slice(1, -1).map(c => c.trim());
      tableHtml += '<tr>';
      cols.forEach(col => {
        tableHtml += `<td>${col}</td>`;
      });
      tableHtml += '</tr>';
    });
    tableHtml += '</tbody></table></div>';
    return `\n\n${tableHtml}\n\n`;
  });

  // 3. Headings
  text = text.replace(/^####\s+(.*$)/gim, '<h4 class="guide-h4">$1</h4>');
  text = text.replace(/^###\s+(.*$)/gim, '<h3 class="guide-h3">$1</h3>');
  text = text.replace(/^##\s+(.*$)/gim, '<h2 class="guide-h2">$1</h2>');
  text = text.replace(/^#\s+(.*$)/gim, '<h1 class="guide-h1">$1</h1>');

  // 4. Blockquotes
  text = text.replace(/^>\s*(.*$)/gim, '<blockquote class="guide-quote">$1</blockquote>');

  // 5. Images and Links
  text = text.replace(/!\[(.*?)\]\((.*?)\)/g, '<div class="guide-img-box"><img src="$2" alt="$1" loading="lazy" /><span class="guide-img-caption">$1</span></div>');
  text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="guide-link" target="_blank" rel="noopener noreferrer">$1</a>');

  // 6. Formatting
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  text = text.replace(/`([^`]+)`/g, '<code class="guide-inline-code">$1</code>');

  // 7. Unordered Lists
  text = text.replace(/(?:^|\n)([-*]\s+.+(?:\n[-*]\s+.+)*)/g, (match) => {
    const items = match.trim().split('\n').map(l => l.replace(/^[-*]\s+/, '').trim());
    return '\n<ul class="guide-ul">' + items.map(it => `<li>${it}</li>`).join('') + '</ul>\n';
  });

  // 8. Ordered Lists
  text = text.replace(/(?:^|\n)(\d+\.\s+.+(?:\n\d+\.\s+.+)*)/g, (match) => {
    const items = match.trim().split('\n').map(l => l.replace(/^\d+\.\s+/, '').trim());
    return '\n<ol class="guide-ol">' + items.map(it => `<li>${it}</li>`).join('') + '</ol>\n';
  });

  // 9. Paragraphs
  const blocks = text.split(/\n\s*\n+/);
  let html = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<h') || 
        trimmed.startsWith('<div') || 
        trimmed.startsWith('<blockquote') || 
        trimmed.startsWith('<ul') || 
        trimmed.startsWith('<ol') || 
        trimmed.startsWith('__CODE_BLOCK_')) {
      return trimmed;
    }
    return `<p class="guide-p">${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).filter(Boolean).join('\n');

  // Restore code blocks
  codeBlocks.forEach((codeHtml, idx) => {
    html = html.replace(`__CODE_BLOCK_${idx}__`, codeHtml);
  });

  return html;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Genera el HTML de la Ficha Técnica del Juego
 */
function generateFichaHtml(game, guide, affiliate) {
  let affiliateHtml = '';
  if (affiliate && affiliate.permalink) {
    affiliateHtml = `
      <div class="guide-affiliate-box">
        <div class="guide-affiliate-badge">🔥 OFERTA DISPONIBLE</div>
        <div class="guide-affiliate-info">
          <h4>Dónde comprar ${game?.title || guide.gameTitle}</h4>
          ${affiliate.price ? `<div class="guide-affiliate-price">$${affiliate.price} MXN</div>` : ''}
          <a href="${affiliate.permalink}" target="_blank" rel="noopener noreferrer nofollow" class="guide-buy-btn">
            🛒 Comprar en Oferta
          </a>
        </div>
      </div>
    `;
  }

  const cleanSinopsis = game?.sinopsis ? game.sinopsis.replace(/\n\n+/g, '</p><p class="guide-p">') : 'Sin descripción técnica disponible.';

  return `
    <div class="guide-ficha-layout">
      <div class="guide-ficha-specs">
        <h3 class="guide-h3">📋 Especificaciones y Ficha Técnica</h3>
        <table class="guide-table guide-specs-table">
          <tbody>
            <tr><td><strong>Título Oficial</strong></td><td>${game?.title || guide.gameTitle}</td></tr>
            <tr><td><strong>Plataforma / Consola</strong></td><td><span class="guide-console-tag">${game?.console || guide.gameConsole}</span></td></tr>
            ${game?.releaseDate ? `<tr><td><strong>Año de lanzamiento</strong></td><td>${typeof game.releaseDate === 'object' ? (game.releaseDate.es || game.releaseDate.en) : game.releaseDate}</td></tr>` : ''}
            ${guide.publishedAt ? `<tr><td><strong>Guía publicada</strong></td><td>${guide.publishedAt}</td></tr>` : ''}
          </tbody>
        </table>
      </div>

      ${affiliateHtml}

      <div class="guide-ficha-sinopsis">
        <h3 class="guide-h3">📖 Sinopsis / Argumento Oficial</h3>
        <p class="guide-p">${cleanSinopsis}</p>
      </div>
    </div>
  `;
}

function compileGameGuides() {
  console.log('🔄 Compilando guías por juego desde content/guias/...');
  const compiledGuides = [];

  // 1. Cargar games.json
  let gamesData = { games: [] };
  if (fs.existsSync(GAMES_PATH)) {
    try {
      gamesData = JSON.parse(fs.readFileSync(GAMES_PATH, 'utf-8'));
    } catch (e) {
      console.error('Error leyendo games.json:', e.message);
    }
  }
  const gamesList = Array.isArray(gamesData.games) ? gamesData.games : [];

  // 2. Cargar affiliates.json
  let affiliatesList = [];
  if (fs.existsSync(AFFILIATES_PATH)) {
    try {
      affiliatesList = JSON.parse(fs.readFileSync(AFFILIATES_PATH, 'utf-8'));
      if (!Array.isArray(affiliatesList)) affiliatesList = [];
    } catch (e) {
      console.warn('Error leyendo affiliates.json:', e.message);
    }
  }

  // 3. Escanear content/guias/
  if (fs.existsSync(GUIDES_DIR)) {
    const entries = fs.readdirSync(GUIDES_DIR, { withFileTypes: true });

    entries.forEach(entry => {
      if (!entry.isDirectory()) return;

      const guideFolder = path.join(GUIDES_DIR, entry.name);
      const configPath = path.join(guideFolder, 'config.json');

      if (!fs.existsSync(configPath)) {
        return; // No es una carpeta de guía estructurada
      }

      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const slug = config.slug || entry.name;
        const gameId = config.gameId;

        // Buscar datos en games.json
        const matchedGame = gamesList.find(g => 
          (gameId && g.id === gameId) || 
          (slugify(g.title || '') === slug) ||
          (config.gameTitle && g.title.toLowerCase() === config.gameTitle.toLowerCase())
        );

        const gameTitle = config.gameTitle || matchedGame?.title || entry.name;
        const gameConsole = config.gameConsole || matchedGame?.console || 'MULTI';
        const cover = config.cover || matchedGame?.cover || '/logo.png';
        const description = config.description || (matchedGame?.sinopsis ? matchedGame.sinopsis.slice(0, 160) + '...' : `Guía completa de ${gameTitle}`);

        // Buscar afiliado para este juego si existe
        const matchedAffiliate = affiliatesList.find(a => 
          (gameId && (a.id === gameId || a.productId === gameId || a.gameId === gameId)) ||
          (a.title && gameTitle && a.title.toLowerCase().includes(gameTitle.toLowerCase()))
        ) || null;

        const sections = Array.isArray(config.sections) ? config.sections : [];
        const compiledSections = [];

        sections.forEach(sec => {
          const secId = sec.id;
          const secLabel = sec.label || secId;
          let isPublished = Boolean(sec.published);
          let html = null;
          let rawContent = '';

          if (secId === 'ficha') {
            // Ficha se auto-genera desde RAWG / games.json
            html = generateFichaHtml(matchedGame, { gameTitle, gameConsole, gameId, publishedAt: config.publishedAt }, matchedAffiliate);
            // La ficha se publica si la guía está activa o sec.published no es false explícito
            isPublished = sec.published !== false;
          } else if (sec.file) {
            const filePath = path.join(guideFolder, sec.file);
            if (fs.existsSync(filePath)) {
              rawContent = fs.readFileSync(filePath, 'utf-8');
              html = parseMarkdownToHtml(rawContent);
            } else {
              isPublished = false;
            }
          }

          compiledSections.push({
            id: secId,
            label: secLabel,
            label_es: sec.label_es || null,
            label_en: sec.label_en || null,
            file: sec.file || null,
            lang: sec.lang || null,
            published: isPublished,
            html: isPublished ? html : null,
            rawContent: isPublished ? rawContent : ''
          });
        });

        compiledGuides.push({
          slug,
          gameId: gameId || matchedGame?.id || '',
          gameTitle,
          gameConsole,
          cover,
          description,
          publishedAt: config.publishedAt || new Date().toISOString().split('T')[0],
          affiliate: matchedAffiliate ? {
            id: matchedAffiliate.id || matchedAffiliate.productId,
            title: matchedAffiliate.title,
            price: matchedAffiliate.price,
            permalink: matchedAffiliate.permalink,
            thumbnail: matchedAffiliate.thumbnail
          } : null,
          sections: compiledSections
        });

        console.log(`  ✓ Guía compilada: ${gameTitle} (${slug}) con ${compiledSections.filter(s => s.published).length} secciones publicadas`);
      } catch (err) {
        console.error(`Error procesando guía en ${entry.name}:`, err.message);
      }
    });
  }

  // Guardar en src/data/game_guides.json
  const outDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(compiledGuides, null, 2), 'utf-8');
  console.log(`✅ ${compiledGuides.length} guías por juego guardadas en ${OUTPUT_PATH}`);

  return compiledGuides;
}

if (require.main === module) {
  compileGameGuides();
}

module.exports = { compileGameGuides, parseMarkdownToHtml, generateFichaHtml };
