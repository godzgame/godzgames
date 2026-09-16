const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");

let logBuffer = [];
function log(msg) {
  console.log(msg);
  logBuffer.push(msg);
}

async function deploy() {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  const server = process.env.FTP_SERVER;
  const user = process.env.FTP_USERNAME;
  const password = process.env.FTP_PASSWORD;

  if (!server || !user || !password) {
    console.error("❌ Faltan credenciales de FTP");
    process.exit(1);
  }

  try {
    log(`🔌 Conectando a FTP: ${server} como usuario: ${user}...`);
    await client.access({
      host: server,
      user: user,
      password: password,
      secure: false,
      port: 21
    });

    const initialPwd = await client.pwd();
    log(`📂 Directorio FTP inicial: ${initialPwd}`);

    const list = await client.list();
    log(`📋 Listado de directorio inicial (${list.length} elementos):`);
    list.forEach(f => log(`  - ${f.isDirectory ? '[DIR]' : '[FILE]'} ${f.name}`));

    const hasPublicHtml = list.some(f => f.isDirectory && f.name.toLowerCase() === 'public_html');
    if (hasPublicHtml) {
      log("➡️ Subdirectorio public_html detectado. Entrando a public_html/...");
      await client.cd("public_html");
    } else {
      log("ℹ️ Ya estamos en la raíz o no hay subcarpeta public_html.");
    }

    const targetPwd = await client.pwd();
    log(`🚀 Desplegando dist/ en la carpeta web real: ${targetPwd}`);

    const localDist = path.join(__dirname, "../dist");

    // Guardar logBuffer en dist/upload_log.txt antes de subir
    log(`[${new Date().toISOString()}] Inicio de subida FTP de dist/`);
    fs.writeFileSync(path.join(localDist, "upload_log.txt"), logBuffer.join("\n"));

    await client.uploadFromDir(localDist);

    log("✅ Despliegue FTP completado con éxito.");

    // Volver a escribir el log final
    logBuffer.push(`[${new Date().toISOString()}] Fin de subida FTP exitosa.`);
    fs.writeFileSync(path.join(localDist, "upload_log.txt"), logBuffer.join("\n"));
    await client.uploadFile(path.join(localDist, "upload_log.txt"), "upload_log.txt");

  } catch (err) {
    console.error("❌ Error en despliegue FTP:", err);
    process.exit(1);
  } finally {
    client.close();
  }
}

deploy();
