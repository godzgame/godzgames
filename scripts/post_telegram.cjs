const fs = require('fs');
const path = require('path');

const NEWS_FILE = path.join(__dirname, '..', 'src', 'data', 'latest_news.json');
const STATE_FILE = path.join(__dirname, '..', 'src', 'data', 'telegram_enviadas.json');
const RAW = 'https://raw.githubusercontent.com/godzgame/godzgames/main/public';
const args = process.argv.slice(2);
const PRUEBA = args.includes('--prueba');
const UNA = args.includes('--enviar-una');
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT = process.env.TELEGRAM_CHAT_ID || '';
const MAX_POR_EJECUCION = 5;

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

function leerNoticias() {
  const data = JSON.parse(fs.readFileSync(NEWS_FILE, 'utf8'));
  return Array.isArray(data.articles) ? data.articles : [];
}

function leerEstado() {
  if (fs.existsSync(STATE_FILE) === false) return null;
  try {
    const d = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    return Array.isArray(d.ids) ? d.ids : null;
  } catch (e) {
    return null;
  }
}

function guardarEstado(ids) {
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ids: ids.slice(-500) }, null, 2));
}

function armarMensaje(a) {
  const es = a.es || {};
  const titulo = es.title || (a.en && a.en.title) || 'Nueva noticia';
  const desc = (es.description || '').slice(0, 200);
  return '🎮 ' + titulo + '\n\n' + desc + '\n\n🔗 ' + a.url;
}

function urlImagen(a) {
  const img = a.image || '';
  if (img.startsWith('https://')) return img;
  if (img.startsWith('/')) return RAW + img;
  return '';
}

async function llamar(metodo, cuerpo) {
  const r = await fetch('https://api.telegram.org/bot' + TOKEN + '/' + metodo, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo)
  });
  return await r.json().catch(() => ({}));
}

async function publicar(a) {
  const texto = armarMensaje(a);
  const foto = urlImagen(a);
  if (foto) {
    const j = await llamar('sendPhoto', { chat_id: CHAT, photo: foto, caption: texto });
    if (j.ok) return true;
    console.log('  sendPhoto fallo (' + (j.description || 'sin detalle') + '). Se envia solo texto.');
  }
  const j2 = await llamar('sendMessage', { chat_id: CHAT, text: texto });
  if (j2.ok) return true;
  console.log('  sendMessage fallo: ' + (j2.description || 'sin detalle'));
  return false;
}

async function main() {
  const notas = leerNoticias().filter((a) => a && a.id && a.url);
  const enviadas = leerEstado();

  if (PRUEBA === false && (TOKEN === '' || CHAT === '')) {
    console.log('Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID. No se publica nada.');
    return;
  }

  if (UNA && PRUEBA === false) {
    if (notas.length === 0) { console.log('No hay noticias.'); return; }
    console.log('Enviando una nota de prueba: ' + notas[0].url);
    const ok = await publicar(notas[0]);
    console.log(ok ? 'Enviada.' : 'No se pudo enviar.');
    return;
  }

  if (enviadas === null && PRUEBA === false) {
    guardarEstado(notas.map((a) => a.id));
    console.log('Primera ejecucion: se registraron ' + notas.length + ' noticias como ya vistas. No se envio nada.');
    return;
  }

  const ya = enviadas || [];
  let nuevas = notas.filter((a) => ya.includes(a.id) === false);
  if (enviadas === null) nuevas = nuevas.slice(0, 2);
  nuevas = nuevas.slice(0, MAX_POR_EJECUCION).reverse();
  console.log('Notas nuevas para Telegram: ' + nuevas.length);

  const enviadasAhora = [];
  for (const a of nuevas) {
    if (PRUEBA) {
      console.log('--- (prueba, no se envia) ---');
      console.log('Imagen: ' + (urlImagen(a) || '(sin imagen)'));
      console.log(armarMensaje(a));
      continue;
    }
    const ok = await publicar(a);
    if (ok) {
      enviadasAhora.push(a.id);
      console.log('  Enviada: ' + a.url);
    }
    await esperar(3000);
  }

  if (PRUEBA === false && enviadasAhora.length > 0) {
    guardarEstado(ya.concat(enviadasAhora));
  }
}

main().catch((e) => console.log('Error: ' + e.message));
