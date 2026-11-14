import { defineConfig } from 'vite';

// Quita del index.html compilado el contenido del panel de administracion.
// Solo aplica al compilar; con npm run dev el panel sigue completo.
const quitarPanelAdmin = () => ({
  name: 'quitar-panel-admin',
  apply: 'build',
  transformIndexHtml(html) {
    const start = html.indexOf('<div id="admin-view"');
    if (start === -1) return html;
    const openEnd = html.indexOf('>', start) + 1;
    const re = /<div\b|<\/div>/g;
    re.lastIndex = openEnd;
    let depth = 1;
    let m;
    while ((m = re.exec(html)) !== null) {
      if (m[0] === '</div>') {
        depth--;
        if (depth === 0) return html.slice(0, openEnd) + html.slice(m.index);
      } else {
        depth++;
      }
    }
    return html;
  }
});

export default defineConfig({
  plugins: [quitarPanelAdmin()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'assets/index.css';
          }
          return 'assets/[name].[ext]';
        }
      }
    }
  }
});
