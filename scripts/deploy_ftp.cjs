const ftp = require("basic-ftp");
const path = require("path");

async function deploy() {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  const server = process.env.FTP_SERVER;
  const user = process.env.FTP_USERNAME;
  const password = process.env.FTP_PASSWORD;

  if (!server || !user || !password) {
    console.error("❌ Faltan credenciales de FTP (FTP_SERVER, FTP_USERNAME, FTP_PASSWORD)");
    process.exit(1);
  }

  try {
    console.log(`🔌 Conectando a FTP: ${server}...`);
    await client.access({
      host: server,
      user: user,
      password: password,
      secure: false,
      port: 21
    });

    const initialPwd = await client.pwd();
    console.log(`📂 Directorio FTP inicial (pwd): ${initialPwd}`);

    const rootList = await client.list();
    console.log(`📋 Archivos en raíz FTP (${initialPwd}):`);
    rootList.forEach(f => console.log(`  - ${f.isDirectory ? '[DIR]' : '[FILE]'} ${f.name}`));

    // Si existe la carpeta public_html, ahí es donde SiteGround sirve los archivos del sitio web
    const hasPublicHtml = rootList.some(f => f.isDirectory && f.name.toLowerCase() === 'public_html');
    if (hasPublicHtml) {
      console.log("➡️ Detectado directorio public_html/. Entrando a public_html/...");
      await client.cd("public_html");
    } else {
      console.log("ℹ️ No se detectó subcarpeta public_html, desplegando en raíz actual.");
    }

    const localDist = path.join(__dirname, "../dist");

    // Generar archivo de depuración para diagnosticar ruta HTTP real
    const fs = require('fs');
    const debugData = {
      timestamp: new Date().toISOString(),
      initialPwd,
      targetPwd,
      rootListNames: rootList.map(f => f.name),
      hasPublicHtml
    };
    fs.writeFileSync(path.join(localDist, "server_debug_info.json"), JSON.stringify(debugData, null, 2));

    // Forzar reemplazo de index.html
    const localIndex = path.join(localDist, "index.html");
    if (require('fs').existsSync(localIndex)) {
      try {
        console.log("📤 Subiendo index.html actualizado...");
        await client.uploadFile(localIndex, "index.html");
        console.log("✅ index.html subido con éxito.");
      } catch (e) {
        console.warn("⚠️ Aviso al subir index.html individual:", e.message);
      }
    }

    await client.uploadFromDir(localDist);

    console.log("✅ Despliegue FTP completado con éxito.");

    // Verificar index.html en el servidor
    const currentList = await client.list();
    const indexFile = currentList.find(f => f.name === 'index.html');
    if (indexFile) {
      console.log(`📄 index.html verificado en servidor: tamaño=${indexFile.size} bytes, modificado=${indexFile.modifiedAt}`);
    } else {
      console.warn("⚠️ No se encontró index.html en el directorio actual tras subir.");
    }

  } catch (err) {
    console.error("❌ Error en despliegue FTP:", err);
    process.exit(1);
  } finally {
    client.close();
  }
}

deploy();
