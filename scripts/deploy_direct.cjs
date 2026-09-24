const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");

async function deploy() {
    const client = new ftp.Client(30000);
    client.ftp.verbose = true;

    let host = process.env.FTP_SERVER || "";
    const user = process.env.FTP_USERNAME || "";
    const password = process.env.FTP_PASSWORD || "";

    host = host.replace(/^ftp:\/\//i, "").replace(/\/.*$/, "").trim();

    if (!host || !user || !password) {
        console.error("❌ ERROR: Faltan credenciales FTP.");
        process.exit(1);
    }

    try {
        console.log(`📡 Conectando a FTP ${host} con usuario ${user}...`);
        await client.access({
            host: host,
            user: user,
            password: password,
            port: 21,
            secure: false
        });

        console.log("✅ Conexión FTP establecida.");
        const currentPwd = await client.pwd();
        console.log(`📂 PWD actual en servidor: "${currentPwd}"`);

        const distPath = path.join(__dirname, "../dist");

        // Omitir uploads localmente para deploy ultrarrapido (las imágenes subidas en el servidor persisten)
        const localUploads = path.join(distPath, "uploads");
        if (fs.existsSync(localUploads)) {
            console.log("⚡ Omitiendo re-subida de uploads/ local...");
            fs.rmSync(localUploads, { recursive: true, force: true });
        }

        // Limpiar assets antiguos en el servidor para forzar actualización de bundles JS/CSS
        try {
            console.log("🧹 Limpiando directorio assets/ antiguo en el servidor...");
            await client.clearDir("./assets/");
        } catch (clearErr) {
            console.warn("⚠️ No se pudo limpiar assets/ (posiblemente no existía):", clearErr.message);
        }

        console.log(`🚀 Subiendo código compilado a la raíz del sitio FTP ("./")...`);
        await client.uploadFromDir(distPath, "./");
        console.log("✅ Subida completada.");

        // Si existe una subcarpeta secundaria public_html, sincronizar también
        const rootItems = await client.list("./");
        const hasSubPublicHtml = rootItems.some(item => item.name === "public_html" && item.isDirectory);
        if (hasSubPublicHtml) {
            console.log("🚀 Sincronizando también con subcarpeta ./public_html/...");
            try {
                await client.clearDir("./public_html/assets/");
            } catch (e) {}
            await client.uploadFromDir(distPath, "./public_html/");
            console.log("✅ Subida a ./public_html/ completada.");
        }

        console.log("🎉 ¡DESPLIEGUE COMPLETADO CON ÉXITO EN SITEGROUND!");
    } catch (err) {
        console.error("❌ ERROR DURANTE EL DESPLIEGUE FTP:", err);
        process.exit(1);
    } finally {
        client.close();
    }
}

deploy();
