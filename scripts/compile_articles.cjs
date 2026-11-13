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

const NEWS_DATA_PATH = path.join(__dirname, '../src/data/latest_news.json');
const CONTENT_DIR = path.join(__dirname, '../content');
const OUTPUT_PATH = path.join(__dirname, '../src/data/all_articles.json');

const parseFrontMatter = (content) => {
  const attributes = {};
  let body = content;
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (match) {
    const yamlLines = match[1].split('\n');
    let currentKey = null;
    yamlLines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;

      if (trimmed.startsWith('- ') && currentKey && Array.isArray(attributes[currentKey])) {
        const itemVal = trimmed.replace(/^-\s*/, '').replace(/^["']|["']$/g, '');
        attributes[currentKey].push(itemVal);
        return;
      }

      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const key = line.slice(0, colonIdx).trim();
        let val = line.slice(colonIdx + 1).trim();

        if (val === '') {
          attributes[key] = [];
          currentKey = key;
        } else {
          currentKey = key;
          if ((val.startsWith('[') && val.endsWith(']')) || (val.startsWith('{') && val.endsWith('}'))) {
            try {
              // Parse simple array strings like ["PS4", "RPG"]
              const cleanVal = val.replace(/'/g, '"');
              attributes[key] = JSON.parse(cleanVal);
            } catch (e) {
              attributes[key] = val.replace(/^["']|["']$/g, '');
            }
          } else if (!isNaN(val) && val !== '') {
            attributes[key] = Number(val);
          } else if (val === 'true' || val === 'false') {
            attributes[key] = val === 'true';
          } else {
            attributes[key] = val.replace(/^["']|["']$/g, '');
          }
        }
      }
    });
    body = match[2].trim();
  }
  return { attributes, body };
};

function extractExcerpt(body, length = 160) {
  if (!body) return '';
  const clean = body
    .replace(/^#+\s+.*$/gm, '')
    .replace(/\[CTA-COMPRA:[^\]]+\]/g, '')
    .replace(/\*\*/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
  return clean.length > length ? clean.slice(0, length) + '...' : clean;
}

function cleanImageUrl(img) {
  if (!img) return '/logo.png';
  if (typeof img === 'string' && img.includes('raw.githubusercontent.com/godzgame/godzgames/main/public')) {
    return img.replace('https://raw.githubusercontent.com/godzgame/godzgames/main/public', '');
  }
  return img;
}

function compileArticles() {
  console.log('🔄 Compilando todos los artículos (noticias, análisis, guías)...');
  const allArticles = [];

  // 1. Noticias de latest_news.json
  if (fs.existsSync(NEWS_DATA_PATH)) {
    try {
      const newsData = JSON.parse(fs.readFileSync(NEWS_DATA_PATH, 'utf-8'));
      const articles = newsData.articles || [];
      articles.forEach((art, idx) => {
        // Preserve bilingual structure so getLocalizedNews can localize correctly
        const esData = art.es || {};
        const enData = art.en || {};
        const titleEs = esData.title || art.title || `Noticia ${idx + 1}`;
        const titleEn = enData.title || titleEs;
        const slug = art.slug || slugify(titleEs);

        allArticles.push({
          id: art.id || `news-${idx}`,
          type: 'news',
          category: 'NOTICIAS',
          // Keep flat title as ES fallback (used by getArticleUrl slug generation)
          title: titleEs,
          slug,
          // Preserve full bilingual objects so getLocalizedNews works in both languages
          es: {
            title: titleEs,
            description: esData.description || art.description || '',
            fullContent: esData.fullContent || art.fullContent || esData.description || ''
          },
          en: {
            title: titleEn,
            description: enData.description || esData.description || art.description || '',
            fullContent: enData.fullContent || art.fullContent || enData.description || ''
          },
          // Legacy flat fields as fallback
          description: esData.description || art.description || '',
          fullContent: esData.fullContent || art.fullContent || '',
          image: cleanImageUrl(art.image),
          publishedAt: art.publishedAt || art.date || new Date(Date.now() - idx * 3600000).toISOString(),
          tag: art.tag || 'NOTICIA',
          link: art.link || ''
        });
      });
    } catch (e) {
      console.error('Error leyendo latest_news.json:', e.message);
    }
  }

  // ARCHIVO_COMPILE_PATCH: notas archivadas con url, para que /noticias/<slug>/ las encuentre
  try {
    const ARCHIVE_PATH = path.join(__dirname, '../src/data/news_archive.json');
    if (fs.existsSync(ARCHIVE_PATH)) {
      const archiveData = JSON.parse(fs.readFileSync(ARCHIVE_PATH, 'utf-8'));
      const archived = Array.isArray(archiveData.articles) ? archiveData.articles : [];
      const seen = new Set(allArticles.map(a => a.id));
      let added = 0;
      archived.forEach((art, idx) => {
        if (!art || !art.id || !art.url || seen.has(art.id)) return;
        seen.add(art.id);
        const esData = art.es || {};
        const enData = art.en || {};
        const titleEs = esData.title || art.title || ('Noticia archivada ' + (idx + 1));
        const titleEn = enData.title || titleEs;
        allArticles.push({
          id: art.id,
          type: 'news_archive',
          category: 'NOTICIAS_ARCHIVO',
          isArchived: true,
          title: titleEs,
          slug: art.slug || slugify(titleEs),
          es: { title: titleEs, description: esData.description || '', fullContent: esData.fullContent || esData.description || '' },
          en: { title: titleEn, description: enData.description || esData.description || '', fullContent: enData.fullContent || enData.description || '' },
          description: esData.description || '',
          fullContent: esData.fullContent || '',
          image: cleanImageUrl(art.image),
          publishedAt: art.publishedAt || art.date || archiveData.lastUpdated || '',
          tag: art.tag || 'NOTICIA',
          link: art.link || ''
        });
        added++;
      });
      console.log('  Notas archivadas compiladas: ' + added);
    }
  } catch (e) {
    console.error('Error leyendo news_archive.json:', e.message);
  }

  // 2. Archivos Markdown en content/
  if (fs.existsSync(CONTENT_DIR)) {
    const processDir = (dirPath) => {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      entries.forEach(entry => {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          // Omitir subcarpetas dentro de content/guias/ (reservadas para guías por juego estructuradas)
          if (dirPath === path.join(CONTENT_DIR, 'guias') || fs.existsSync(path.join(fullPath, 'config.json'))) {
            return;
          }
          processDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const { attributes, body } = parseFrontMatter(content);

          const folderName = path.basename(dirPath);
          let type = attributes.type || 'news';
          if (folderName === 'reviews' || attributes.category === 'Análisis' || attributes.type === 'review') {
            type = 'review';
          } else if (folderName === 'guias' || attributes.category === 'Guías' || attributes.type === 'guide') {
            type = 'guide';
          }

          const category = type === 'review' ? 'ANALISIS' : (type === 'guide' ? 'GUIAS' : 'NOTICIAS');
          const title = attributes.title || entry.name.replace('.md', '');
          const slug = attributes.slug || slugify(title);
          const description = attributes.verdict || attributes.description || extractExcerpt(body);

          allArticles.push({
            id: attributes.id || entry.name.replace('.md', ''),
            type,
            category,
            title,
            slug,
            description,
            fullContent: body,
            image: cleanImageUrl(attributes.image),
            publishedAt: attributes.publishedAt || attributes.date || '2026-10-05T12:00:00Z',
            score: attributes.score || null,
            author: attributes.author || 'Equipo GodZGames',
            tags: attributes.tags || [],
            pros: attributes.pros || [],
            cons: attributes.cons || [],
            verdict: attributes.verdict || ''
          });
        }
      });
    };

    processDir(CONTENT_DIR);
  }

  // Sort by publishedAt descending
  allArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allArticles, null, 2), 'utf-8');
  console.log(`✅ ${allArticles.length} artículos compilados en ${OUTPUT_PATH}`);
  console.log(`   - NOTICIAS: ${allArticles.filter(a => a.category === 'NOTICIAS').length}`);
  console.log(`   - ANÁLISIS: ${allArticles.filter(a => a.category === 'ANALISIS').length}`);
  console.log(`   - GUÍAS: ${allArticles.filter(a => a.category === 'GUIAS').length}`);
}

compileArticles();

module.exports = { compileArticles, slugify };
