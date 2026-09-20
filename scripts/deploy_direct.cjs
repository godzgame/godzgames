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

        const parentTree = [];
        try {
            console.log("🔍 Inspeccionando directorio padre (cd ..)...");
            await client.cd("..");
            const parentPwd = await client.pwd();
            console.log(`📂 PWD Padre: "${parentPwd}"`);
            const parentList = await client.list();
            parentList.forEach(item => {
                const line = `[PADRE] [${item.isDirectory ? 'DIR ' : 'FILE'}] ${item.name}`;
                console.log(line);
                parentTree.push(line);
            });
            // Volver a initialPwd
            await client.cd(initialPwd);
        } catch (e) {
            console.log(`⚠️ No se pudo explorar directorio padre: ${e.message}`);
        }

        const distPath = path.join(__dirname, "../dist");

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

        // Guardar logs padre en src/data/parent_tree.json
        fs.writeFileSync(path.join(__dirname, "../src/data/parent_tree.json"), JSON.stringify({ initialPwd, parentTree }, null, 2));

        console.log("🎉 ¡DESPLIEGUE FINALIZADO!");
    } catch (err) {
        console.error("❌ ERROR DURANTE EL DESPLIEGUE FTP:", err);
        process.exit(1);
    } finally {
        client.close();
    }
}

deploy();
