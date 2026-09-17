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
        const distPath = path.join(__dirname, "../dist");

        // Omitir carpeta uploads/ localmente para deploy instantaneo
        const localUploads = path.join(distPath, "uploads");
        if (fs.existsSync(localUploads)) {
            fs.rmSync(localUploads, { recursive: true, force: true });
        }

        const topItems = await client.list("./");
        const hasPublicHtml = topItems.some(item => item.name === "public_html" && item.isDirectory);

        const targetDirs = ["./"];
        if (hasPublicHtml) {
            targetDirs.push("./public_html/");
        }

        const auditLogs = [];

        for (const targetDir of targetDirs) {
            console.log(`🔍 Inspeccionando index.html en "${targetDir}"...`);
            try {
                const list = await client.list(targetDir);
                const oldIndex = list.find(item => item.name === "index.html");
                if (oldIndex) {
                    auditLogs.push(`Antes [${targetDir}index.html]: size=${oldIndex.size}, date=${oldIndex.rawModifiedAt || oldIndex.modifiedAt}`);
                    console.log(`   Viejo index.html encontrado: ${oldIndex.size} bytes, fecha: ${oldIndex.modifiedAt}`);
                    
                    // Eliminar el index.html viejo explícitamente para forzar la recreación
                    console.log(`   Borrando ${targetDir}index.html viejo...`);
                    await client.remove(targetDir + "index.html");
                    console.log(`   ✅ ${targetDir}index.html eliminado con éxito.`);
                }
            } catch (err) {
                auditLogs.push(`Error borrando ${targetDir}index.html: ${err.message}`);
                console.log(`   ⚠️ No se pudo borrar index.html viejo: ${err.message}`);
            }

            console.log(`🚀 Subiendo nuevo código de dist/ a "${targetDir}"...`);
            await client.uploadFromDir(distPath, targetDir);

            // Verificar el nuevo index.html
            try {
                const newList = await client.list(targetDir);
                const newIndex = newList.find(item => item.name === "index.html");
                if (newIndex) {
                    auditLogs.push(`Después [${targetDir}index.html]: size=${newIndex.size}, date=${newIndex.rawModifiedAt || newIndex.modifiedAt}`);
                }
            } catch (e) {}
        }

        // Guardar logs de auditoría en JSON
        const auditPath = path.join(__dirname, "../src/data/file_audit.json");
        fs.writeFileSync(auditPath, JSON.stringify({ auditLogs }, null, 2));

        console.log("🎉 ¡DESPLIEGUE FINALIZADO CON AUDITORÍA DE ARCHIVOS!");
    } catch (err) {
        console.error("❌ ERROR DURANTE EL DESPLIEGUE FTP:", err);
        process.exit(1);
    } finally {
        client.close();
    }
}

deploy();
