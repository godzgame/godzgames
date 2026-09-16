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

    // Determinar si debemos hacer cd public_html
    const hasPublicHtmlDir = rootList.some(f => f.isDirectory && f.name === 'public_html');
    if (hasPublicHtmlDir) {
      console.log("➡️ Entrando a directorio public_html/...");
      await client.cd("public_html");
    } else {
      console.log("ℹ️ Ya estamos en la raíz pública o no existe subcarpeta public_html.");
    }

    const targetPwd = await client.pwd();
    console.log(`🚀 Desplegando dist/ en: ${targetPwd}`);

    const localDist = path.join(__dirname, "../dist");
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
