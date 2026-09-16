const ftp = require("basic-ftp");
const path = require("path");

async function deploy() {
    const client = new ftp.Client(30000);
    client.ftp.verbose = true;

    let host = process.env.FTP_SERVER || "";
    const user = process.env.FTP_USERNAME || "";
    const password = process.env.FTP_PASSWORD || "";

    // Clean host string (remove ftp://, slashes, ports if any)
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
        console.log(`📂 Directorio inicial del usuario (pwd): "${initialPwd}"`);

        const list = await client.list();
        console.log("📋 Contenido del directorio inicial:");
        list.forEach(item => {
            console.log(`   - [${item.isDirectory ? 'DIR ' : 'FILE'}] ${item.name}`);
        });

        // Determinar directorio destino automáticamente
        let targetDir = "./";
        const hasPublicHtml = list.some(item => item.name === "public_html" && item.isDirectory);
        
        if (hasPublicHtml) {
            console.log("🎯 Se detectó la subcarpeta 'public_html'. El destino del despliegue será: ./public_html/");
            targetDir = "./public_html/";
        } else {
            console.log("🎯 El usuario FTP ya inicia dentro de la raíz de la web. El destino del despliegue será: ./");
        }

        const distPath = path.join(__dirname, "../dist");
        console.log(`🚀 Subiendo todo el contenido de ${distPath} a ${targetDir}...`);
        
        await client.uploadFromDir(distPath, targetDir);

        console.log("🎉 ¡DESPLIEGUE FTP COMPLETADO CON ÉXITO! Todos los archivos fueron sobrescritos.");
    } catch (err) {
        console.error("❌ ERROR DURANTE EL DESPLIEGUE FTP:", err);
        process.exit(1);
    } finally {
        client.close();
    }
}

deploy();
