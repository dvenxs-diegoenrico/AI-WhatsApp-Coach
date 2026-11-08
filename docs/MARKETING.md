# Marketing

## Códigos de audiencia
Cada canal usa un enlace de WhatsApp con un mensaje distinto ya escrito. El bot guarda el código del primer mensaje y la vista `funnel_by_audience` en Supabase muestra cuántos se registran por canal.

| Código | Canal | Enlace |
|---|---|---|
| A | Anuncios de Instagram / Facebook (Click-to-WhatsApp) | `https://wa.me/TUNUMERO?text=Hola%20A` |
| B | TikTok | `https://wa.me/TUNUMERO?text=Hola%20B` |
| C | Influencers y recomendaciones | `https://wa.me/TUNUMERO?text=Hola%20C` |
| D | Página web y orgánico (el botón de la landing ya usa D) | `https://wa.me/TUNUMERO?text=Hola%20D` |

`TUNUMERO` = número con código de país, solo dígitos (ej. `5215512345678`). En los anuncios Click-to-WhatsApp de Meta, escribe "Hola A" como mensaje predeterminado.

## Reglas para anuncios y contenido (obligatorias)
- Anuncios de bajar de peso: público **18+**. Sin fotos de "antes y después", sin hacer sentir mal a nadie por su cuerpo, sin promesas como "baja 10 kg en un mes".
- Siempre "coach de nutrición con IA". Nunca "nutriólogo", "nutricionista" ni "doctor".
- Calorías de fotos = "estimación".
- Personas generadas con IA (Higgsfield u otras): etiquetarlas como contenido de IA (Meta y TikTok lo exigen). Nunca presentarlas como nutricionista real ni como cliente real dando un testimonio.
- Testimonios: solo de usuarios reales, con su permiso, y sin prometer resultados.

## 5 guiones de video (15–30 s, formato vertical 9:16)

**1. "¿Cuántas calorías tienen mis tacos?"** (demostración, el más fuerte)
- Gancho (0–2 s): plato de tacos en la mesa. Texto: "Le mandé esto a mi coach de IA 👀"
- Toma: grabación de pantalla real del WhatsApp: mandas la foto → llega la estimación.
- Cierre: "Gratis tu primera foto. Link en la bio." (o botón del anuncio)
- Higgsfield: b-roll del plato en cámara lenta para los primeros 2 segundos.

**2. Amigable vs. estricto** (humor)
- Gancho: "Le dije a mi coach que me comí 3 conchas…"
- Pantalla dividida: respuesta del modo amigable 😊 vs. modo estricto 💪 (capturas reales).
- Cierre: "Tú eliges cómo te habla. ¿Cuál escogerías?"

**3. Mito de la tortilla**
- Gancho: "¿La tortilla engorda?" (texto grande sobre una tortilla)
- Le preguntas al coach en WhatsApp; se ve la respuesta corta y equilibrada.
- Cierre: "Pregúntale tus dudas de comida. Primeras 3 gratis."
- Variante por país: arepa (CO/VE), pan (ES/AR), pupusa (SV).

**4. "Qué ceno hoy"** (útil y cotidiano)
- Gancho: refri abierto, casi vacío. Texto: "Tengo huevo, nopales y tortillas. ¿Qué ceno?"
- Respuesta del coach con una idea concreta + cómo se ve el plato terminado.
- Higgsfield: plato terminado (imagen o video corto) si no lo cocinas tú.

**5. Sin dietas extremas** (confianza)
- Gancho: "Le pedí a mi coach una dieta de 800 calorías…"
- Se ve cómo se niega con amabilidad y propone algo sostenible.
- Cierre: "Un coach que cuida tu salud. 18+."
- Este video muestra el valor de seguridad; no muestres cuerpos ni pesos.

## Presupuesto inicial sugerido
- Después de activar los pagos: $3,000–5,000 MXN/mes en Meta (Click-to-WhatsApp), 2 semanas.
- Un anuncio por guion, todos con código A (o A1, A2… cuando agreguemos sub-códigos).
- Quédate con los que tengan menor costo por registro completo (`finished_signup` en `funnel_by_audience`).
