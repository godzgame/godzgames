const ftp = require("basic-ftp");
const path = require("path");

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
    console.log(`🔌 Conectando a FTP: ${server} como usuario: ${user}...`);
    await client.access({
      host: server,
      user: user,
      password: password,
      secure: false,
      port: 21
    });

    const initialPwd = await client.pwd();
    console.log(`📂 Directorio FTP inicial: ${initialPwd}`);

    const list = await client.list();
    console.log("📋 Listado de directorio inicial:");
    list.forEach(f => console.log(`  - ${f.isDirectory ? '[DIR]' : '[FILE]'} ${f.name}`));

    // Si la raíz contiene public_html, entramos en ella (caso de usuario edgarperezmiranda@)
    const hasPublicHtml = list.some(f => f.isDirectory && f.name.toLowerCase() === 'public_html');
    if (hasPublicHtml) {
      console.log("➡️ Subdirectorio public_html detectado. Entrando a public_html/...");
      await client.cd("public_html");
      
      // Limpiar posible subcarpeta duplicada public_html/public_html si existe
      const subList = await client.list();
      const duplicatePublicHtml = subList.find(f => f.isDirectory && f.name.toLowerCase() === 'public_html');
      if (duplicatePublicHtml) {
        console.log("🧹 Limpiando subcarpeta duplicada public_html/public_html...");
        await client.removeDir("public_html").catch(() => {});
      }
    } else {
      console.log("ℹ️ Ya estamos en public_html (caso de usuario github-deploy@).");
    }

    const targetPwd = await client.pwd();
    console.log(`🚀 Desplegando dist/ en la carpeta web real: ${targetPwd}`);

    const localDist = path.join(__dirname, "../dist");
    await client.uploadFromDir(localDist);

    console.log("✅ Despliegue FTP completado con éxito.");

  } catch (err) {
    console.error("❌ Error en despliegue FTP:", err);
    process.exit(1);
  } finally {
    client.close();
  }
}

deploy();
