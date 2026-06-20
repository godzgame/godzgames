const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const crypto = require('crypto');

const linksDir = path.join(__dirname, '../links');
const dataDir = path.join(__dirname, '../src/data');
const outputFile = path.join(dataDir, 'games.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 1. Read existing games.json if it exists to preserve IDs and covers
const existingGamesMap = new Map(); // key: "title_console" -> value: { id, cover }
if (fs.existsSync(outputFile)) {
  try {
    const existingData = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
    if (existingData && Array.isArray(existingData.games)) {
      existingData.games.forEach(g => {
        if (g.title && g.console && g.id) {
          const key = `${g.title.trim().toLowerCase()}_${g.console.trim().toLowerCase()}`;
          existingGamesMap.set(key, { id: g.id, cover: g.cover || '' });
        }
      });
      console.log(`Loaded ${existingGamesMap.size} existing games to preserve IDs/covers.`);
    }
  } catch (err) {
    console.warn(`Could not read existing games.json, starting fresh:`, err.message);
  }
}

const games = [];
const consoles = new Set();

const files = fs.readdirSync(linksDir).filter(file => file.endsWith('.xlsx'));

const getDeterministicId = (title, consoleName) => {
  const normalized = `${title.trim().toLowerCase()}_${consoleName.trim().toLowerCase()}`;
  return crypto.createHash('md5').update(normalized).digest('hex').substring(0, 8);
};

files.forEach(file => {
  // Extract console name, e.g., 'Juegos_3DS.xlsx' -> '3DS'
  let consoleName = file.replace('Juegos_', '').replace('.xlsx', '').trim();
  consoles.add(consoleName);

  const filePath = path.join(linksDir, file);
  console.log(`Reading ${filePath}...`);
  
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to JSON, assuming row 1 is headers
    const rows = xlsx.utils.sheet_to_json(sheet);
    console.log(`Found ${rows.length} rows in ${file}`);
    
    rows.forEach(row => {
      const keys = Object.keys(row);
      if (keys.length === 0) return;
      
      // Heuristics for Title and Link
      let title = row[keys[0]]; // usually the first column is the game name
      let link = '';
      
      for (const key of keys) {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('link') || lowerKey.includes('url') || lowerKey.includes('acortador')) {
          link = row[key];
        }
        if (lowerKey.includes('título') || lowerKey.includes('titulo') || lowerKey.includes('name') || lowerKey.includes('juego')) {
          title = row[key];
        }
      }
      
      if (!title || typeof title !== 'string' || !title.trim()) return;

      const trimmedTitle = title.trim();
      const key = `${trimmedTitle.toLowerCase()}_${consoleName.toLowerCase()}`;
      
      let id;
      let cover = '';
      if (existingGamesMap.has(key)) {
        const existing = existingGamesMap.get(key);
        id = existing.id;
        cover = existing.cover || '';
      } else {
        id = getDeterministicId(trimmedTitle, consoleName);
      }
      
      games.push({
        id: id,
        title: trimmedTitle,
        console: consoleName,
        link: (link || '').trim() || '#',
        cover: cover
      });
    });
  } catch (err) {
    console.error(`Error reading ${file}:`, err.message);
  }
});

const outputData = {
  consoles: Array.from(consoles).sort(),
  games: games
};

fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
console.log(`Successfully parsed ${games.length} games into ${outputFile}`);
