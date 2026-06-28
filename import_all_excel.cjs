const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const crypto = require('crypto');

const LINKS_DIR = path.join(__dirname, 'links');
const OUT_FILE = path.join(__dirname, 'src', 'data', 'games.json');

let dbData = { consoles: [], games: [] };

const getDeterministicId = (title, consoleName) => {
  const normalized = `${title.trim().toLowerCase()}_${consoleName.trim().toLowerCase()}`;
  return crypto.createHash('md5').update(normalized).digest('hex').substring(0, 8);
};

const files = fs.readdirSync(LINKS_DIR).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

for (const file of files) {
  let consoleName = file.replace(/juegos_/i, '').replace(/\.xlsx$/i, '').replace(/\.xls$/i, '').trim().toUpperCase();
  if (!dbData.consoles.includes(consoleName)) {
    dbData.consoles.push(consoleName);
  }

  const filePath = path.join(LINKS_DIR, file);
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet);

  for (const row of rows) {
    const keys = Object.keys(row);
    if (keys.length === 0) continue;

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
        // Extract multiple URLs if they are separated by space or newline
        const urls = val.match(/https?:\/\/[^\s,]+/g);
        if (urls) {
          for (const u of urls) {
            // Ignore bad links entirely
            if (u.includes('downloadgameps3') || u.includes('downloadgamepsp') || u.includes('dlxbgame.com') || u.includes('dlpsgame.com') || u.includes('gamepciso.com') || u.includes('nswgame.com') || u.includes('docs.google.com/spreadsheets')) {
              continue;
            }
            if (u.includes('youtube.com') || u.includes('youtu.be')) {
              trailer = u; // Pick the first youtube link found as trailer
            } else {
              links.push(u);
            }
          }
        }
      }
    }

    if (!title || typeof title !== 'string' || !title.trim()) continue;

    const trimmedTitle = title.trim();
    const newId = getDeterministicId(trimmedTitle, consoleName);
    
    // De-duplicate links
    links = [...new Set(links)];

    dbData.games.push({
      id: newId,
      title: trimmedTitle,
      console: consoleName,
      links: links,
      link: links.length > 0 ? links[0] : '#',
      trailer: trailer,
      sinopsis: sinopsis,
      cover: ''
    });
  }
}

dbData.consoles.sort();

fs.writeFileSync(OUT_FILE, JSON.stringify(dbData, null, 2));
console.log('Successfully updated games.json with new Excel data and extracted parts/links.');
