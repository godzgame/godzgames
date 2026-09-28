# ESTADO DEL PROYECTO - GodZGames

> **REGLA OBLIGATORIA DE INICIO DE SESIÓN:**
> Al inicio de cada sesión de trabajo, el asistente IA debe leer este archivo por completo ANTES de modificar cualquier archivo de código o configuración del repositorio.

---

## 1. Flujo de Despliegue Oficial (A la fecha)

Actualmente, el método oficial y garantizado para desplegar cambios a producción en SiteGround es:

1. **Generar el build local sin errores:**
   ```bash
   npm run build
   ```
2. **Comprimir el contenido directo de `dist/` en un archivo ZIP:**
   ```bash
   cd dist && zip -r ~/Desktop/GodZGames_Despliegue.zip . && cd ..
   ```
   *(Nota: Se comprime el contenido interno de `dist/`, NO la carpeta contenedora).*
3. **Subida manual a SiteGround:**
   - Acceder al **Gestor de Archivos de SiteGround** (Site Tools).
   - Subir el archivo ZIP a la raíz del sitio (`public_html`).
   - Extraer el contenido para sobreescribir los archivos en producción.

*Razón del flujo manual:* El flujo automático FTP vía GitHub Actions en ocasiones omitía la transferencia real de ciertos archivos modificados o chocaba con las políticas de caché de SiteGround.

---

## 2. Versión Oficial del Diseño

- **Diseño Oficial:** La interfaz actual en producción que cuenta con:
  - Header con Logo de GodZGames, buscador global, selector de idioma (EN/ES).
  - Barra de navegación principal con menú de categorías y consolas (`TODO`, `3DS`, `DS`, `PC`, `PS2`, `PS3`, `PS4`, `PS5`, `PSP`, `PSVITA`, `SWITCH`, `WII`, `WII U`, `XBOX`).
  - Ticker de *Última Hora* y rejilla de noticias destacadas en el Home.
  - Sección de análisis, guías y catálogo de juegos con paginación.
  - Panel de Administración en `/#admin` con pestañas para Gestor de Juegos, Calendario Editorial y Sugerencias de Afiliados.
- **Regla de Oro:** Este diseño y estructura de componentes es **OFICIAL** y **NO se altera ni modifica** sin una petición explícita del usuario.

---

## 3. Decisiones de Arquitectura y Reglas Inviolables

1. **Cero enlaces ilegales:** No se ofrecen descargas piratas ni enlaces directos a ROMs/ISOs ilegales en el código ni en la base de datos.
2. **Noticias Bilingües y Validación Anti-Inglés:**
   - Toda noticia generada por `scripts/update_news.cjs` debe incluir traducción fáctica y fluida en español (`es`) e inglés (`en`).
   - Si la traducción falla o devuelve texto idéntico al original en inglés, la noticia **SE OMITE** en lugar de publicarse rota o sin traducir.
   - Las imágenes descargadas en `public/uploads/` deben ser commiteadas y sincronizadas en Git para estar disponibles en GitHub Raw y producción.
3. **Sugerencias de Afiliados con Datos Reales Exclusivos:**
   - Solo se muestran productos reales obtenidos y validados desde la API oficial de Mercado Libre (`scripts/generate_affiliate_suggestions.cjs`).
   - Queda estrictamente prohibido usar precios ficticios, ratings falsos o fallbacks con datos inventados.
   - En el cliente (`src/main.js`), si la API remota no responde o es bloqueada (por ej. escudos de navegadores o respuestas HTML), se usa `safeFetchJSON` para validar la respuesta sin lanzar excepciones y se recurre limpiamente a `fallbackAffiliateSuggestions` empaquetado en el bundle.
4. **Manejo Defensivo del DOM en JavaScript (`src/main.js`):**
   - **PROHIBIDO** hacer `document.getElementById('ID').addEventListener(...)` o acceder a propiedades (`.value`, `.style`, `.innerHTML`) sin verificar previamente si el elemento existe en el DOM.
   - Todo selector debe estar protegido por comprobaciones de nulidad (`if (el) { ... }` o encadenamiento opcional `?.`).
5. **Configuración `.htaccess` compatible con Apache/Nginx:**
   - **PROHIBIDO** incluir directivas sintácticamente inválidas como `SetEnvIfAlways` (causan Error 500 Internal Server Error).
   - Usar solo reglas estándar compatibles con `mod_rewrite` y `mod_headers`.

---

## 4. Pendientes Abiertos

- [ ] **Procesamiento continuo de carátulas y sinopsis:** Continuar la ejecución del script `node scripts/batch_update_rawg.cjs` para enriquecer la base de datos `src/data/games.json` en lotes de 50 juegos.
- [ ] **Monitoreo de GitHub Actions:** Evaluar mejoras en el script de despliegue directo FTP si se decide automatizar nuevamente en el futuro.

---

## 5. Historial de Etiquetas (Git Tags)

- **`version-estable-27sep`**: Punto de restauración estable verificado al 27 de septiembre de 2026.
