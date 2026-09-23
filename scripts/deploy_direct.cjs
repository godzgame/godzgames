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
        const initialPwd = await client.pwd();
        console.log(`📂 PWD inicial: "${initialPwd}"`);

        const distPath = path.join(__dirname, "../dist");

        // Omitir uploads localmente para deploy ultrarrapido (las imágenes en servidor se conservan)
        const localUploads = path.join(distPath, "uploads");
        if (fs.existsSync(localUploads)) {
            console.log("⚡ Omitiendo re-subida de uploads/...");
            fs.rmSync(localUploads, { recursive: true, force: true });
        }

        const topItems = await client.list("./");
        const hasPublicHtml = topItems.some(item => item.name === "public_html" && item.isDirectory);

        const targetDirs = ["./"];
        if (hasPublicHtml) {
            targetDirs.push("./public_html/");
        }

        console.log(`🎯 Rutas objetivo para despliegue: ${JSON.stringify(targetDirs)}`);

        for (const targetDir of targetDirs) {
            console.log(`🚀 Subiendo código compilado a "${targetDir}"...`);
            await client.uploadFromDir(distPath, targetDir);
            console.log(`✅ Subida a "${targetDir}" completada.`);
        }

        console.log("🎉 ¡DESPLIEGUE COMPLETADO CON ÉXITO EN LA RAÍZ DEL SITIO!");
    } catch (err) {
        console.error("❌ ERROR DURANTE EL DESPLIEGUE FTP:", err);
        process.exit(1);
    } finally {
        client.close();
    }
}

deploy();
