const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");

async function syncUploads(client) {
    const localDir = path.join(__dirname, "../public/uploads");
    if (!fs.existsSync(localDir)) {
        console.log("ℹ️ No hay public/uploads local; se omite la sincronizacion de imagenes.");
        return;
    }
    let remote = new Set();
    try {
        const items = await client.list("./uploads");
        remote = new Set(items.filter(i => i.isFile).map(i => i.name));
    } catch (e) {
        console.log("ℹ️ No se pudo listar ./uploads: " + e.message);
        await client.ensureDir("./uploads");
        await client.cd("/");
    }
    const localFiles = fs.readdirSync(localDir).filter(n => fs.statSync(path.join(localDir, n)).isFile());
    const missing = localFiles.filter(n => !remote.has(n)).sort().reverse();
    const toUpload = missing.slice(0, 400);
    console.log("🖼️ Imagenes en GitHub: " + localFiles.length + " | en el servidor: " + remote.size + " | faltan: " + missing.length + " | se suben ahora: " + toUpload.length);
    let ok = 0;
    for (const n of toUpload) {
        try {
            await client.uploadFrom(path.join(localDir, n), "./uploads/" + n);
            ok++;
        } catch (e) {
            console.warn("⚠️ No se pudo subir " + n + ": " + e.message);
        }
    }
    console.log("✅ Imagenes subidas: " + ok + " de " + toUpload.length);
}

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
        try { await syncUploads(client); } catch (e) { console.warn("⚠️ Sincronizacion de imagenes fallo: " + e.message); }

        // Si existe una subcarpeta secundaria public_html, sincronizar también
        const rootItems = await client.list("./");
        const hasSubPublicHtml = false;
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
