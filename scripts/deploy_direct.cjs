const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");

async function deploy() {
    const client = new ftp.Client(60000);
    client.ftp.verbose = true;

    let host = process.env.FTP_SERVER || "";
    const user = process.env.FTP_USERNAME || "";
    const password = process.env.FTP_PASSWORD || "";

    // Limpiar host
    host = host.replace(/^ftp:\/\//i, "").replace(/\/.*$/, "").trim();

    if (!host || !user || !password) {
        console.error("❌ ERROR: Faltan credenciales FTP (FTP_SERVER, FTP_USERNAME, FTP_PASSWORD).");
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

        console.log("✅ Conexión FTP establecida con éxito.");
        const initialPwd = await client.pwd();
        console.log(`📂 Directorio inicial (pwd): "${initialPwd}"`);

        const list = await client.list();
        console.log("📋 Contenido del directorio inicial:");
        list.forEach(item => {
            console.log(`   - [${item.isDirectory ? 'DIR ' : 'FILE'}] ${item.name} (${item.size} bytes)`);
        });

        const distPath = path.join(__dirname, "../dist");

        // Omitir subida masiva de imágenes de juegos localmente para que el despliegue tome 3 segundos
        const localUploadsGames = path.join(distPath, "uploads", "games");
        if (fs.existsSync(localUploadsGames)) {
            console.log("⚡ Omitiendo re-subida de imágenes de juegos (se conservan intactas en el servidor)...");
            fs.rmSync(localUploadsGames, { recursive: true, force: true });
        }

        const hasPublicHtml = list.some(item => item.name === "public_html" && item.isDirectory);

        // Subir a la raíz Y a public_html/ si existe, asegurando cubrir el 100% de configuraciones
        const targetDirs = ["./"];
        if (hasPublicHtml) {
            targetDirs.push("./public_html/");
        }

        console.log(`🎯 Rutas objetivo para despliegue: ${JSON.stringify(targetDirs)}`);

        for (const targetDir of targetDirs) {
            console.log(`🚀 Sincronizando todo dist/ hacia "${targetDir}"...`);
            await client.uploadFromDir(distPath, targetDir);
            console.log(`✅ Sincronización a "${targetDir}" completada.`);
        }

        console.log("🎉 ¡DESPLIEGUE COMPLETO Y DUAL COMPLETADO CON ÉXITO!");
    } catch (err) {
        console.error("❌ ERROR DURANTE EL DESPLIEGUE FTP:", err);
        process.exit(1);
    } finally {
        client.close();
    }
}

deploy();
