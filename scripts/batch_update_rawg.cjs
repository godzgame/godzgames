const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#]+?)=(.+)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const RAWG_API_KEY = process.env.RAWG_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!RAWG_API_KEY) {
  console.error("ERROR: Falta RAWG_API_KEY en el archivo .env");
  process.exit(1);
}
if (!GROQ_API_KEY) {
  console.warn("⚠️ ADVERTENCIA: Falta GROQ_API_KEY. Se omitirá la IA.");
}

const gamesPath = path.join(__dirname, '..', 'src', 'data', 'games.json');
const dudososPath = path.join(__dirname, '..', 'titulos_dudosos.json');
const revisionManualPath = path.join(__dirname, '..', 'revision_manual.json');

// Helper for Exponential Backoff on 429 Rate Limits
async function fetchWithBackoff(url, options, maxRetries = 5) {
  let delay = 3000; // start with 3s
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429) {
        if (i === maxRetries - 1) throw new Error("Max retries reached on 429");
        console.log(`  -> ⚠️ Rate limit 429 de Groq detectado. Reintentando en ${delay/1000}s...`);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2; // Exponential backoff (3s, 6s, 12s, 24s, 48s)
        continue;
      }
      return res;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      console.log(`  -> ⚠️ Error de conexión. Reintentando en ${delay/1000}s...`);
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }
}

function isSuspicious(title) {
  const regex = /(_|\[|\]|\b(REPACK|USA|EUR|JAP|MULTI|PROPER|SKIDROW|CODEX|v\d+(\.\d+)?)\b)/i;
  if (regex.test(title)) return true;
  if (title === title.toLowerCase() && title.includes(' ')) return true;
  return false;
}

function normalizeTitle(title) {
  let t = title.toLowerCase();
  t = t.replace(/\b(game of the year edition|goty edition|goty|edition|version)\b/gi, '');
  t = t.replace(/[^\w\s\d]/g, '');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

function checkNumbersMatch(title1, title2) {
  const nums1 = title1.match(/\b\d+\b/g) || [];
  const nums2 = title2.match(/\b\d+\b/g) || [];
  for(let n of nums1) {
    if(!nums2.includes(n)) return false;
  }
  for(let n of nums2) {
    if(!nums1.includes(n)) return false;
  }
  return true;
}

function isValidRawgMatch(originalTitle, rawgTitle) {
  const normOrig = normalizeTitle(originalTitle);
  const normRawg = normalizeTitle(rawgTitle);
  
  if (!checkNumbersMatch(normOrig, normRawg)) return false;
  
  const wordsOrig = normOrig.split(' ');
  const wordsRawg = normRawg.split(' ');
  let matchCount = 0;
  for(let w of wordsOrig) {
    if (wordsRawg.includes(w)) matchCount++;
  }
  
  const matchRatio = matchCount / wordsOrig.length;
  if (matchRatio < 0.5) return false;
  
  return true;
}

async function translateRawgDescription(rawDesc, gameTitle) {
  const prompt = `You are a translator. Translate and adapt the following raw video game description into Spanish (80-100 words).
Focus ONLY on the game's story, characters, and gameplay for "${gameTitle}".
DO NOT invent anything that is not in the text. DO NOT mention platforms, versions, awards, or download links.
Output ONLY valid JSON matching this exact structure:
{"description":{"es":"Sinopsis de 80-100 palabras..."}}

Raw description:
"${rawDesc}"`;

  try {
    const res = await fetchWithBackoff('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'openai/gpt-oss-120b',
        response_format: { type: "json_object" }
      })
    });
    const jsonRes = await res.json();
    return JSON.parse(jsonRes.choices[0].message.content);
  } catch (e) {
    return null;
  }
}

async function fetchDetailsGeneric(game) {
  const prompt = `You are a video game database editor. I am giving you a raw filename/title: "${game.title}" for the "${game.console}". 
Identify the actual video game name. Generate a data sheet for that specific video game. 
CRITICAL: The description MUST focus ONLY on the game's story, characters, and gameplay. DO NOT mention version numbers, download links, DLCs, file sizes, or languages in the description! Si no estás completamente seguro de la trama o personajes reales de este juego específico, responde con una sinopsis genérica centrada solo en el género y estilo de juego, sin inventar nombres de personajes, tramas específicas ni conexiones con otras franquicias.
Output ONLY valid JSON matching this exact structure:
{"genre":{"en":"...","es":"..."},"releaseDate":{"en":"...","es":"..."},"publisher":{"en":"...","es":"..."},"developer":{"en":"...","es":"..."},"size":{"en":"...","es":"..."},"description":{"en":"80-100 word synopsis of the game's story and gameplay.","es":"Sinopsis de 80-100 palabras..."}}`;

  try {
    const res = await fetchWithBackoff('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'openai/gpt-oss-120b',
        response_format: { type: "json_object" }
      })
    });
    const jsonRes = await res.json();
    return JSON.parse(jsonRes.choices[0].message.content);
  } catch (e) {
    return null;
  }
}

async function verifySynopsis(title, synopsis) {
  const prompt = `Analiza la siguiente sinopsis generada para el videojuego "${title}".
¿Esta sinopsis contiene algún personaje, ubicación o conexión con otra franquicia de videojuegos que podría estar mal atribuida o inventada (alucinación)?
Responde SOLO en JSON válido con el siguiente formato exacto:
{"sospechoso": true/false, "razon": "Explicación breve de por qué es sospechoso o por qué está bien."}

Sinopsis a evaluar:
"${synopsis}"`;

  try {
    const res = await fetchWithBackoff('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'openai/gpt-oss-120b',
        response_format: { type: "json_object" }
      })
    });
    const jsonRes = await res.json();
    return JSON.parse(jsonRes.choices[0].message.content);
  } catch (e) {
    return { sospechoso: true, razon: "Error de red" };
  }
}

async function fetchRawgGameInfo(title) {
  try {
    const searchRes = await fetch(`https://api.rawg.io/api/games?search=${encodeURIComponent(title)}&key=${RAWG_API_KEY}&page_size=3`);
    const searchJson = await searchRes.json();
    
    if (searchJson.results && searchJson.results.length > 0) {
      let match = searchJson.results.find(r => r.name.toLowerCase() === title.toLowerCase());
      if (!match) match = searchJson.results[0]; 
      
      const slug = match.slug;
      const detailsRes = await fetch(`https://api.rawg.io/api/games/${slug}?key=${RAWG_API_KEY}`);
      const detailsJson = await detailsRes.json();
      
      if (detailsJson.description_raw && detailsJson.description_raw.length > 50) {
        return {
          rawg_found: true,
          description_raw: detailsJson.description_raw,
          released: detailsJson.released,
          developers: detailsJson.developers?.map(d => d.name).join(', '),
          publishers: detailsJson.publishers?.map(p => p.name).join(', '),
          genres: detailsJson.genres?.map(g => g.name).join(', '),
          name_matched: detailsJson.name,
          background_image: detailsJson.background_image
        };
      }
    }
  } catch (e) {
  }
  return { rawg_found: false };
}

// ── Git auto-commit helper ──────────────────────────────────────────────
const { execSync } = require('child_process');
function gitCommitPush(count) {
  try {
    execSync('git add src/data/games.json', { cwd: path.join(__dirname, '..'), stdio: 'pipe' });
    execSync(`git commit -m "auto: batch_update_rawg +${count} juegos procesados [skip ci]"`, { cwd: path.join(__dirname, '..'), stdio: 'pipe' });
    execSync('git push', { cwd: path.join(__dirname, '..'), stdio: 'pipe' });
    console.log(`  ✅ Git commit + push automático (${count} juegos acumulados)`);
  } catch(e) {
    console.warn('  ⚠️ Git push falló (puede que no haya cambios):', e.message.split('\n')[0]);
  }
}

// ── Console priority order ───────────────────────────────────────────────
// PS4, Switch, PS5, Xbox primero — luego el resto
const CONSOLE_PRIORITY = ['PS4', 'SWITCH', 'PS5', 'XBOX', 'PS3', 'PC', 'WII U', 'WII', '3DS', 'NDS', 'PSP', 'PSVITA', 'PSX', 'PS2'];
function consolePriority(console) {
  const idx = CONSOLE_PRIORITY.findIndex(c => console?.toUpperCase().includes(c));
  return idx === -1 ? 999 : idx;
}

async function run() {
  console.log('=== INICIANDO AUTO-PROCESAMIENTO GLOBAL ===');
  console.log('Orden de prioridad: PS4 → Switch → PS5 → Xbox → PS3 → PC → resto');
  
  let totalProcesados = 0;
  let procesadosDesdeUltimoCommit = 0;
  const COMMIT_INTERVAL = 50; // commit + push cada 50 juegos
  
  while (true) {
    // Leemos siempre del disco para excluir automáticamente los ya procesados
    const data = JSON.parse(fs.readFileSync(gamesPath, 'utf8'));
    
    let excludedIds = new Set();
    if (fs.existsSync(dudososPath)) {
      JSON.parse(fs.readFileSync(dudososPath, 'utf8')).forEach(g => excludedIds.add(g.id));
    }
    let manualRevisions = [];
    if (fs.existsSync(revisionManualPath)) {
      manualRevisions = JSON.parse(fs.readFileSync(revisionManualPath, 'utf8'));
      manualRevisions.forEach(g => excludedIds.add(g.id));
    }
    
    // Filtrar juegos sin cover (objetivo principal) Y sin sinopsis
    // Ordenar por prioridad de consola: PS4, Switch, PS5, Xbox primero
    const allPendingGames = data.games
      .filter(g => (!g.cover || g.cover === '') && !excludedIds.has(g.id))
      .sort((a, b) => consolePriority(a.console) - consolePriority(b.console));
    const totalFaltantes = allPendingGames.length;
    
    if (totalFaltantes === 0) {
      console.log('\n🎉 ¡PROCESO COMPLETADO! No quedan más juegos sin portada.');
      break;
    }
    
    console.log(`\n--- NUEVO LOTE ---`);
    console.log(`▶ Juegos sin portada pendientes: ${totalFaltantes}`);
    console.log(`▶ Procesados esta sesión: ${totalProcesados} | Desde último commit: ${procesadosDesdeUltimoCommit}`);
    console.log(`▶ Próxima consola en cola: ${allPendingGames[0]?.console}`);
    
    const targetGames = allPendingGames.slice(0, 50);
    let newManualRevisions = [];
    
    for (let i = 0; i < targetGames.length; i++) {
      const game = targetGames[i];
      const consolaStr = game.console ? ` [${game.console}]` : '';
      console.log(`[Lote: ${i+1}/${targetGames.length}] Procesando: ${game.title}${consolaStr}`);
      
      if (isSuspicious(game.title)) {
        console.log(`  -> Omitido: Título sospechoso`);
        newManualRevisions.push({ id: game.id || Math.random().toString(36).substring(7), title: game.title, console: game.console, razon: "Título sospechoso detectado" });
        continue;
      }

      const rawgData = await fetchRawgGameInfo(game.title);
      let rawgValid = false;
      let fallback = false;
      
      if (rawgData.rawg_found) {
        if (isValidRawgMatch(game.title, rawgData.name_matched)) {
          rawgValid = true;
        } else {
          newManualRevisions.push({ id: game.id || Math.random().toString(36).substring(7), title: game.title, console: game.console, razon: "posible coincidencia incorrecta en RAWG" });
          fallback = true;
        }
      } else {
        fallback = true;
      }
      
      let saved = false;
      
      if (rawgValid && GROQ_API_KEY) {
        const transRes = await translateRawgDescription(rawgData.description_raw, game.title);
        if (transRes && transRes.description && transRes.description.es && transRes.description.es.length > 20) {
          game.sinopsis = transRes.description.es;
          if (rawgData.genres) game.genre = { es: rawgData.genres };
          if (rawgData.released) game.releaseDate = { es: rawgData.released };
          if (rawgData.developers) game.developer = { es: rawgData.developers };
          if (rawgData.publishers) game.publisher = { es: rawgData.publishers };
          if (rawgData.background_image) game.cover = rawgData.background_image;
          
          saved = true;
          console.log(`  -> Éxito (RAWG + Traducción)`);
        } else {
          newManualRevisions.push({ id: game.id || Math.random().toString(36).substring(7), title: game.title, console: game.console, razon: "IA falló al traducir o devolvió texto vacío." });
          fallback = true; 
        }
      }
      
      if (fallback && GROQ_API_KEY && !saved) {
        const details = await fetchDetailsGeneric(game);
        if (details && details.description && details.description.es && details.description.es.length > 20) {
          const genSinopsis = details.description.es;
          const verif = await verifySynopsis(game.title, genSinopsis);
          
          if (verif.sospechoso) {
            newManualRevisions.push({ id: game.id || Math.random().toString(36).substring(7), title: game.title, console: game.console, razon: `Verificación rechazó genérico: ${verif.razon}` });
            console.log(`  -> Fallo: Rechazado por IA Verificadora`);
          } else {
            game.sinopsis = genSinopsis;
            if (details.genre) game.genre = details.genre;
            if (details.releaseDate) game.releaseDate = details.releaseDate;
            if (details.publisher) game.publisher = details.publisher;
            if (details.developer) game.developer = details.developer;
            console.log(`  -> Éxito (Genérico Verificado)`);
          }
        } else {
          newManualRevisions.push({ id: game.id || Math.random().toString(36).substring(7), title: game.title, console: game.console, razon: "Fallback genérico falló." });
          console.log(`  -> Fallo: Generación Genérica Falló`);
        }
      }
      
      await new Promise(r => setTimeout(r, 6000));
    }
    
    // Merge en copia fresca del disco para no sobreescribir cambios externos
    const freshData = JSON.parse(fs.readFileSync(gamesPath, 'utf8'));
    targetGames.forEach(tg => {
      const freshGame = freshData.games.find(g => g.id === tg.id);
      if (freshGame) {
        if (tg.sinopsis) freshGame.sinopsis = tg.sinopsis;
        if (tg.cover)    freshGame.cover    = tg.cover;    // ← antes faltaba este campo
        if (tg.genre)    freshGame.genre    = tg.genre;
        if (tg.releaseDate) freshGame.releaseDate = tg.releaseDate;
        if (tg.publisher)   freshGame.publisher   = tg.publisher;
        if (tg.developer)   freshGame.developer   = tg.developer;
      }
    });
    fs.writeFileSync(gamesPath, JSON.stringify(freshData, null, 2), 'utf8');
    
    if (newManualRevisions.length > 0) {
      const merged = [...manualRevisions];
      newManualRevisions.forEach(r => {
        if (!merged.find(ex => ex.id === r.id || ex.title === r.title)) merged.push(r);
      });
      fs.writeFileSync(revisionManualPath, JSON.stringify(merged, null, 2), 'utf8');
    }
    
    totalProcesados += targetGames.length;
    procesadosDesdeUltimoCommit += targetGames.length;
    console.log(`\n✅ Lote guardado en disco. Total sesión: ${totalProcesados} | Sin commit: ${procesadosDesdeUltimoCommit}`);
    
    // ── Auto commit + push cada 50 juegos ──────────────────────────────
    if (procesadosDesdeUltimoCommit >= COMMIT_INTERVAL) {
      gitCommitPush(procesadosDesdeUltimoCommit);
      procesadosDesdeUltimoCommit = 0;
    }
  }
  
  // Commit final al terminar todo
  if (procesadosDesdeUltimoCommit > 0) {
    console.log('\n🔄 Commit final de los últimos juegos procesados...');
    gitCommitPush(procesadosDesdeUltimoCommit);
  }
  console.log('\n🎉 run() completado.');
}

run();
