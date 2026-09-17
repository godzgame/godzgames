const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");

async function deploy() {
    const client = new ftp.Client(60000);
    client.ftp.verbose = true;

    let host = process.env.FTP_SERVER || "";
    const user = process.env.FTP_USERNAME || "";
    const password = process.env.FTP_PASSWORD || "";

    // Limpiar string de host
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

        // 1. PASO PRIORITARIO: Subir index.html y .htaccess primero (en 2 segundos)
        console.log("⚡ PASO 1 (PRIORITARIO): Subiendo index.html y .htaccess...");
        const indexLocal = path.join(distPath, "index.html");
        if (fs.existsSync(indexLocal)) {
            await client.uploadFrom(indexLocal, targetDir + "index.html");
            console.log("✅ index.html subido y actualizado instantáneamente en producción.");
        }
        const htaccessLocal = path.join(distPath, ".htaccess");
        if (fs.existsSync(htaccessLocal)) {
            await client.uploadFrom(htaccessLocal, targetDir + ".htaccess");
            console.log("✅ .htaccess subido instantáneamente.");
        }

        // 2. PASO PRIORITARIO: Subir assets/ (JS y CSS compilados con el panel de afiliados)
        console.log("⚡ PASO 2 (PRIORITARIO): Subiendo assets/ (JS/CSS)...");
        const assetsLocal = path.join(distPath, "assets");
        if (fs.existsSync(assetsLocal)) {
            await client.uploadFromDir(assetsLocal, targetDir + "assets");
            console.log("✅ assets/ compilados subidos con éxito.");
        }

        // 3. PASO COMPLETO: Sincronizar el resto del directorio dist
        console.log(`🚀 PASO 3: Sincronizando el resto del sitio (${distPath} -> ${targetDir})...`);
        await client.uploadFromDir(distPath, targetDir);

        console.log("🎉 ¡DESPLIEGUE FTP COMPLETADO CON ÉXITO! Todos los archivos fueron actualizados.");
    } catch (err) {
        console.error("❌ ERROR DURANTE EL DESPLIEGUE FTP:", err);
        process.exit(1);
    } finally {
        client.close();
    }
}

deploy();
