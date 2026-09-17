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

        const distPath = path.join(__dirname, "../dist");

        console.log("🔍 DIAGNÓSTICO COMPLETO DE ESTRUCTURA DE DIRECTORIOS EN SERVIDOR:");
        const treeLogs = [`PWD: ${initialPwd}`];
        async function listRecursive(dirPath, depth = 0) {
            if (depth > 2) return;
            try {
                const items = await client.list(dirPath);
                for (const item of items) {
                    const line = `${"  ".repeat(depth)} - [${item.isDirectory ? "DIR " : "FILE"}] ${dirPath}${item.name}`;
                    console.log(line);
                    treeLogs.push(line);
                    if (item.isDirectory && !item.name.startsWith(".") && item.name !== "node_modules" && item.name !== "uploads") {
                        await listRecursive(`${dirPath}${item.name}/`, depth + 1);
                    }
                }
            } catch (e) {
                treeLogs.push(`  Error al listar ${dirPath}: ${e.message}`);
            }
        }
        await listRecursive("./");

        // Guardar estructura del servidor en src/data/server_tree.json para inspección local
        const treeJsonPath = path.join(__dirname, "../src/data/server_tree.json");
        fs.writeFileSync(treeJsonPath, JSON.stringify({ pwd: initialPwd, tree: treeLogs }, null, 2));

        // Omitir uploads localmente para deploy ultrarrapido
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

        console.log(`🎯 Rutas objetivo para despliegue: ${JSON.stringify(targetDirs)}`);

        for (const targetDir of targetDirs) {
            console.log(`🚀 Subiendo código de dist/ a "${targetDir}"...`);
            await client.uploadFromDir(distPath, targetDir);
            console.log(`✅ Subida a "${targetDir}" completada.`);
        }

        console.log("🎉 ¡DESPLIEGUE FINALIZADO!");
    } catch (err) {
        console.error("❌ ERROR DURANTE EL DESPLIEGUE FTP:", err);
        process.exit(1);
    } finally {
        client.close();
    }
}

deploy();
