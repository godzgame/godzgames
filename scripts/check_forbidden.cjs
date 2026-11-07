#!/usr/bin/env node
/**
 * check_forbidden.cjs
 * Pre-build content guard.
 *
 * Fails with exit 1 if any forbidden download host or field is found in:
 *   - src/data/games.json (ALL fields, recursively)
 *   - public/rss.xml
 *   - dist/ (if it exists)
 *   - content/ (all .md and .json files)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Lista completa de dominios y términos de descarga no permitidos
const FORBIDDEN_DOMAINS = [
  '1fichier',
  'filecrypt',
  'akirabox',
  'mediafire',
  'vikingfile',
  'vikingf1le',
  'vik1ngfile',
  'send.now',
  'datanodes',
  'multiup',
  'gofile',
  'drive.google.com',
  'frdl.my',
  'frdl.is',
  'frdl.fi',
  'mega.nz',
  'mega.co.nz',
  'megaup',
  'ranoz',
  'rootz.so',
  'buzzheavier',
  'filepv',
  'qiwi.gg',
  'send.cm',
  '1drv.ms',
  'goo.gl',
  'anotepad',
  'hexload',
  'rapidgator',
  'zippyshare',
  'turbobit',
  'nitroflare',
  'katfile',
  'dropapk',
  'uploadhaven',
  'doodrive',
  'solidfiles',
  'mixdrop',
  'streamtape',
  'dlpsgame',
  'dlxbgame',
  'nswgame',
  'gamepciso',
  'downloadgameps3',
  'downloadgamepsp',
  'fitgirl-repacks',
  'dodi-repacks',
  'romsfun',
  'romspure'
];

// Construir expresiones regulares para dominios de descarga
const FORBIDDEN_PATTERNS = FORBIDDEN_DOMAINS.map(d => new RegExp(d.replace(/\./g, '\\.'), 'i'));

// Campos prohibidos que NO deben existir en juegos
const FORBIDDEN_FIELDS = ['link', 'links', 'customLinks', 'downloadLinks', 'downloadUrl', 'mirrors', 'password'];

let errors = [];

function addError(source, field, value) {
  const snippet = String(value).slice(0, 140).replace(/\n/g, ' ');
  errors.push(`  [${source}] field="${field}" → "${snippet}"`);
}

function checkValue(source, keyPath, value) {
  if (value === null || value === undefined) return;

  if (typeof value === 'string') {
    for (const re of FORBIDDEN_PATTERNS) {
      if (re.test(value)) {
        addError(source, keyPath, value);
        return;
      }
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, i) => checkValue(source, `${keyPath}[${i}]`, item));
    return;
  }

  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      checkValue(source, `${keyPath}.${k}`, v);
    }
  }
}

function checkGame(game) {
  const label = `games.json#${game.id || '?'} (${game.title || '?'})`;

  for (const field of FORBIDDEN_FIELDS) {
    if (field in game) {
      const val = game[field];
      const isEmpty =
        val === null ||
        val === undefined ||
        val === '' ||
        (Array.isArray(val) && val.length === 0) ||
        (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0);
      if (!isEmpty) {
        addError(label, field, val);
      }
    }
  }

  checkValue(label, 'root', game);
}

function checkTextFile(filePath) {
  const rel = path.relative(ROOT, filePath);
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const re of FORBIDDEN_PATTERNS) {
    if (re.test(text)) {
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (re.test(lines[i])) {
          addError(rel, `line ${i + 1}`, lines[i].trim());
          break;
        }
      }
    }
  }
}

function collectFiles(dir, exts) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full, exts));
    } else if (!exts || exts.some(e => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

console.log('🔍 check_forbidden: escaneando contenido antes del build...');

// 1. Scan src/data/games.json
const gamesPath = path.join(ROOT, 'src', 'data', 'games.json');
if (fs.existsSync(gamesPath)) {
  const data = JSON.parse(fs.readFileSync(gamesPath, 'utf8'));
  (data.games || []).forEach(checkGame);
}

// 2. Scan public/rss.xml
const rssPath = path.join(ROOT, 'public', 'rss.xml');
if (fs.existsSync(rssPath)) {
  checkTextFile(rssPath);
}

// 3. Scan dist/ (if exists)
const distDir = path.join(ROOT, 'dist');
if (fs.existsSync(distDir)) {
  const distFiles = collectFiles(distDir, ['.html', '.js', '.json', '.xml', '.css']);
  for (const f of distFiles) {
    checkTextFile(f);
  }
}

// 4. Scan content/ (markdown + json)
const contentDir = path.join(ROOT, 'content');
if (fs.existsSync(contentDir)) {
  const contentFiles = collectFiles(contentDir, ['.md', '.json']);
  for (const f of contentFiles) {
    checkTextFile(f);
  }
}

// ─── Report ───────────────────────────────────────────────────────────────────

if (errors.length > 0) {
  console.error('\n❌ check_forbidden: se encontraron contenidos prohibidos. BUILD ABORTADO.\n');
  errors.forEach(e => console.error(e));
  console.error(`\n  Total: ${errors.length} violación(es). Corrígelas antes de volver a compilar.\n`);
  process.exit(1);
} else {
  console.log('✅ check_forbidden: sin contenidos prohibidos. Continuando con el build.\n');
  process.exit(0);
}
