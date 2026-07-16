const title = "Killer Bean";
const feature = "graficos extreme";
const aiPrompt = `Actúa como un creador de contenido experto en videos verticales virales (TikTok/Shorts) sobre videojuegos. Escribe un guión de 15 a 20 segundos optimizado para retención total sobre el juego "${title}".

El juego se destaca principalmente por: "${feature}".

RESTRICCIONES Y ESTILO ANTI-IA (¡MUY IMPORTANTE!):
* PROHIBIDO USAR las siguientes palabras o frases de IA: "adéntrate en", "sumérgete", "en conclusión", "descubre un mundo", "revolucionario", "es importante destacar", "épica aventura", "paisaje digital", "sin embargo", "además".
* No uses introducciones de bienvenida (como 'Hola a todos').
* Habla como un streamer de Twitch, tiktoker gamer o youtuber irreverente. Lenguaje coloquial, frases cortas, dinámico y muy directo al punto. Cero lenguaje corporativo.

FORMATO ESTRICTO:
Debes devolver la respuesta EXACTAMENTE con este formato, sin añadir texto extra al principio ni al final. Solo rellena los textos:

[Gancho 0-3s]
Voz en off: "(Escribe aquí una frase muy llamativa que detenga el scroll sin decir el nombre del juego)"
Texto en pantalla: "(Orden visual CapCut style)"

[Desarrollo 3-12s]
Voz en off: "(Explica por qué es increíble con tono enérgico)"
Texto en pantalla: "(Texto corto para pantalla)"

[CTA 12-15s]
Voz en off: "Consíguelo buscando ${title} en el link de mi perfil."
Texto en pantalla: "DESCARGA EN EL LINK DEL PERFIL 📥"

[Entonación de Voz]
- Tono: (Tu instrucción)
- Velocidad: (Tu instrucción)
- Emoción: (Tu instrucción)

[Ideas de B-Roll / Video]
1. (Idea 1 de qué clip de YouTube buscar)
2. (Idea 2)
3. (Idea 3)`;

async function run() {
  try {
    const res = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: aiPrompt }],
        model: 'openai'
      })
    });
    console.log(res.status, res.statusText);
    const text = await res.text();
    console.log(text);
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
