const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");

const logs = [];
function log(msg) {
    console.log(msg);
    logs.push(`[${new Date().toISOString()}] ${msg}`);
}

async function deploy() {
    const client = new ftp.Client(60000);
    client.ftp.verbose = true;

    let host = process.env.FTP_SERVER || "";
    const user = process.env.FTP_USERNAME || "";
    const password = process.env.FTP_PASSWORD || "";

    host = host.replace(/^ftp:\/\//i, "").replace(/\/.*$/, "").trim();

    if (!host || !user || !password) {
        log("❌ ERROR: Faltan credenciales FTP (FTP_SERVER, FTP_USERNAME, FTP_PASSWORD).");
        process.exit(1);
    }

    try {
        log(`📡 Conectando a FTP ${host} con usuario ${user}...`);
        await client.access({
            host: host,
            user: user,
            password: password,
            port: 21,
            secure: false
        });

        log("✅ Conexión FTP establecida con éxito.");
        const initialPwd = await client.pwd();
        log(`📂 Directorio inicial del usuario (pwd): "${initialPwd}"`);

        const list = await client.list();
        log("📋 Contenido del directorio inicial:");
        list.forEach(item => {
            log(`   - [${item.isDirectory ? 'DIR ' : 'FILE'}] ${item.name}`);
        });

        let targetDir = "./";
        const hasPublicHtml = list.some(item => item.name === "public_html" && item.isDirectory);
        
        if (hasPublicHtml) {
            log("🎯 Se detectó la subcarpeta 'public_html'. El destino del despliegue será: ./public_html/");
            targetDir = "./public_html/";
        } else {
            log("🎯 El usuario FTP ya inicia dentro de la raíz de la web. El destino del despliegue será: ./");
        }

        const distPath = path.join(__dirname, "../dist");

        // Subir index.html prioritario
        log("⚡ PASO 1: Subiendo index.html...");
        const indexLocal = path.join(distPath, "index.html");
        if (fs.existsSync(indexLocal)) {
            await client.uploadFrom(indexLocal, targetDir + "index.html");
            log("✅ index.html subido y actualizado en producción.");
        }

        // Subir .htaccess prioritario
        const htaccessLocal = path.join(distPath, ".htaccess");
        if (fs.existsSync(htaccessLocal)) {
            await client.uploadFrom(htaccessLocal, targetDir + ".htaccess");
            log("✅ .htaccess subido.");
        }

        // Subir assets/ (JS y CSS compilados)
        log("⚡ PASO 2: Subiendo assets/...");
        const assetsLocal = path.join(distPath, "assets");
        if (fs.existsSync(assetsLocal)) {
            await client.uploadFromDir(assetsLocal, targetDir + "assets");
            log("✅ assets/ compilados subidos con éxito.");
        }

        log("🎉 DESPLIEGUE FTP COMPLETADO CON ÉXITO.");
        
        // Escribir log a deploy_log.txt y subirlo
        const localLogFile = path.join(distPath, "deploy_log.txt");
        fs.writeFileSync(localLogFile, logs.join("\n"));
        await client.uploadFrom(localLogFile, targetDir + "deploy_log.txt");
        
    } catch (err) {
        log(`❌ ERROR DURANTE EL DESPLIEGUE FTP: ${err.stack || err.message || err}`);
        process.exit(1);
    } finally {
        client.close();
    }
}

deploy();
