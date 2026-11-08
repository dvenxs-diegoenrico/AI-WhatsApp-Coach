# Conocimiento del coach (investigación → decisiones de producto)

Resumen de la evidencia que usa WhatUpCoach y cómo se aplica en el código. Los números
que importan para la seguridad están en `lib/safety/limits.ts` y `lib/coach/nutrition.ts`
(no solo en el prompt). Revisar con un profesional de nutrición antes del lanzamiento.

## 1. Cuánta energía necesita cada persona

| Evidencia | Decisión |
|---|---|
| Mifflin-St Jeor es la ecuación de gasto en reposo con menor sesgo en adultos ambulatorios; aun así el error individual es amplio y es menos precisa en obesidad. | Punto de partida = Mifflin-St Jeor × factor de actividad (1.2–1.9). Se dice al usuario que es un *estimado inicial*. |
| Apps como MacroFactor mejoran mucho al recalcular el gasto con la tendencia del peso y lo que la persona registra (2–3 semanas para converger). | **TDEE adaptativo**: con ≥14 días de datos (≥10 días con comidas y ≥4 pesajes), se estima `gasto = ingesta promedio − pendiente del peso × 7,700 kcal/kg`, se mezcla con la ecuación según cuántos datos hay y se limita a ±25 % de la ecuación para no fallar por días mal registrados. |
| El peso diario varía por agua, sal y digestión. | Se usa **tendencia** (promedio móvil exponencial), no el peso de un día. Nunca se felicita ni regaña por un solo pesaje. |

## 2. Ritmo de pérdida y mínimos

| Evidencia | Decisión |
|---|---|
| Guía práctica más usada: 0.5–1 % del peso por semana; 0.5–0.75 % se considera moderado y más sostenible; >1 % aumenta pérdida de músculo y riesgo de cálculos biliares. | Ritmo por defecto **0.5 % semanal**, nunca más de **1 % ni 1 kg** por semana. Déficit máximo 25 % del gasto. |
| Dietas muy bajas en calorías requieren supervisión médica. | Mínimo **1,200 kcal (mujer) / 1,500 kcal (hombre)**, también en la base de datos. |

## 3. Proteína, grasa, carbohidratos, fibra y agua

| Evidencia | Decisión |
|---|---|
| ISSN: 1.4–2.0 g/kg/día para mantener o ganar músculo; 1.6–2.2 g/kg con entrenamiento de fuerza; en déficit, más proteína protege la masa magra. | **1.6 g/kg** (bajar o subir) y **1.4 g/kg** (mantener), tope 2.2 g/kg. Con IMC > 30 se usa el peso equivalente a IMC 25 para no inflar la meta. Repartir en 3–4 comidas de 25–40 g. |
| DIETFITS: bajo en grasa vs bajo en carbohidratos dan resultados similares; la **adherencia** y la calidad de la dieta pesan más que el reparto de macros. | Grasa ≈ 28 % (mínimo 0.6 g/kg), carbohidratos el resto. El coach se adapta al estilo que la persona pueda sostener (vegetariana, menos carbohidratos, etc.). |
| Guías Alimentarias para la Población Mexicana 2023: más alimentos de origen vegetal, tortilla de maíz y cereales integrales, leguminosas, agua simple, menos carnes rojas/procesadas, ultraprocesados y bebidas azucaradas. | El método del plato del coach usa estas guías con comida local (frijoles, nopales, tortilla de maíz, fruta de temporada) y se adapta al país del usuario. |
| Fibra: ~14 g por cada 1,000 kcal. Agua: ~30–35 ml/kg. | Metas de fibra (mín. 25 g) y agua (1.5–3.5 L). |

## 4. Movimiento y entrenamiento

| Evidencia | Decisión |
|---|---|
| OMS 2020: 150–300 min/semana de actividad moderada (o 75–150 vigorosa) + fuerza ≥ 2 días/semana. | Recomendación base para todos. |
| Pasos: el beneficio en mortalidad crece hasta ~7,000–8,000 pasos/día (6,000–8,000 en mayores de 60). | Meta de pasos **8,000** (7,000 si empieza muy sedentario). |
| ACSM 2026 / revisiones: ~10 series por músculo por semana para hipertrofia; entrenar cada músculo 1–2 veces por semana con volumen igual da resultados similares; principiantes empiezan con menos. | Principiante: cuerpo completo 2–3 días, 2–3 series de 8–12 repeticiones, dejando 2–3 repeticiones en reserva. **Doble progresión**: cuando completas el rango alto en todas las series, sube peso. |

## 5. Cómo se logra el cambio (por qué la gente sigue o abandona)

| Evidencia | Decisión |
|---|---|
| Registrar (auto-monitoreo) se asocia con más pérdida de peso en ~74 % de los estudios digitales, pero la adherencia cae rápido; funciona mejor combinado con metas y retroalimentación. | Registrar debe costar **segundos**: una foto o una frase. Cada registro recibe retroalimentación inmediata ("te faltan 40 g de proteína"). |
| Programas con más técnicas de cambio de conducta (metas, planeación, retroalimentación, coaching) son más efectivos. | El coach: (1) pregunta antes de aconsejar, (2) propone **una** acción pequeña y concreta, (3) la convierte en plan "si… entonces…", (4) revisa en el siguiente contacto. Check-in semanal con datos reales. |
| CBT/psicología (Noom): efecto modesto pero útil; el tono importa. | Nunca culpa ni vergüenza. Recaídas = información, no fracaso. |

## 6. Límites de la IA con fotos

| Evidencia | Decisión |
|---|---|
| Modelos con visión: error de calorías ~20–40 % (peor con porciones grandes) y subestiman proteína; mejora mucho si se da el peso o los ingredientes. | Siempre rango + "estimado". Si la porción, el aceite o el tamaño cambian mucho el total, el coach **hace una pregunta** (¿cuántas tortillas?, ¿frito o a la plancha?) y corrige el registro. La persona puede decir "eran 2 tacos" o "no era mío" y se corrige o borra. |

## 7. Programas y coaches con resultados probados

| Referencia | Qué demostró | Cómo lo usamos |
|---|---|---|
| **Diabetes Prevention Program (DPP)** | Meta de 7 % de peso + 150 min/semana de actividad: −58 % de riesgo de diabetes vs placebo (~3 años); en la práctica comunitaria, 45 % logró el 7 % y 67 % el 5 %. | Metas modestas y alcanzables (5–7 %) y actividad semanal; el beneficio a largo plazo baja si se abandonan los hábitos. |
| **National Weight Control Registry** (personas que mantienen ≥ 13.6 kg menos por años) | Comparten hábitos: comer con regularidad (desayuno casi diario), ~1 h de actividad al día (sobre todo caminar), pesarse semanal o diario, comer parecido entre semana y fin de semana. | Los hábitos de mantenimiento son el objetivo final, no "la dieta". Pesaje semanal sugerido; caminar es el ejercicio base. |
| **Precision Nutrition** (coaching por hábitos) | Método de porciones con la mano y un hábito a la vez; comer despacio hasta ~80 % de saciedad. Sus cifras de precisión son internas, no independientes. | Porciones con la mano para quien no quiere contar; 1–3 hábitos de enfoque. |
| **Implementación de intenciones** (Gollwitzer y Sheeran) | Planes "si… entonces…" mejoran el cumplimiento; efecto real moderado (d ≈ 0.15–0.35 al corregir sesgos). | El coach convierte cada acción en un plan si-entonces. |
| **Formación de hábitos** (Lally 2010) | Volverse automático toma de 18 a 254 días (≈ 2 meses típico); fallar un día no lo arruina. | Expectativas realistas y sin culpa por días perdidos. |
| **MacroFactor** | Gasto adaptativo con ingesta y tendencia del peso. | Nuestro TDEE adaptativo (sección 1). |
| **Noom / CBT digital** | Efecto modesto pero real; el auto-monitoreo explica buena parte. | Tono empático + registro sin fricción. |
| **Fitia** (app latinoamericana, competencia directa) | Planes con comida latina, cambios de comidas por equivalentes, coach de IA dentro de la app. | Nosotros: dentro de WhatsApp (sin descargar nada), con memoria, fotos y metas adaptativas. |

## 8. Hábitos y vicios

| Evidencia | Decisión |
|---|---|
| OMS Europa (2023): no hay nivel de alcohol libre de riesgo; el alcohol es cancerígeno del grupo 1. | El coach nunca anima a beber; da calorías reales (cerveza ≈ 150 kcal) y estrategias para reducir; ante señales de dependencia, ayuda profesional. |
| Dejar de fumar: aumento promedio de 4–5 kg, sobre todo en los primeros 3 meses (16 % incluso baja de peso). | Dejar de fumar siempre es prioridad sobre el peso; el coach prepara a la persona para ese posible aumento y la acompaña con antojos. |
| Dormir poco aumenta el hambre y los antojos. | Sueño 7–9 h como hábito de enfoque frecuente. |
| Refrescos: ~140 kcal y ~35 g de azúcar por lata. | "Escalera" de cambios: normal → sin azúcar → agua mineral → agua simple. |

Seguimiento: tabla `daily_metrics` (pasos, agua, sueño, alcohol, cigarros, refrescos), herramientas `log_habit` y `set_focus_habits`, y tarjeta de hábitos en el panel.

## 9. Pasos del celular

| Plataforma | Realidad técnica | Solución |
|---|---|---|
| **iPhone (Apple Salud)** | HealthKit solo se lee desde una app en el teléfono; no hay acceso web. | **Atajos de Apple**: una automatización diaria busca los pasos del día en Salud (agrupados por día) y los manda por POST a `/api/health/steps` con un enlace personal firmado (revocable). Sin instalar ninguna app. |
| **Android (Health Connect / Google Fit)** | Google cierra las APIs web de Google Fit a fines de 2026; Health Connect solo funciona dentro de una app instalada y la nueva Google Health API requiere revisión de seguridad. | Por ahora: captura del contador de pasos (la IA lee el número) o escribirlo. Futuro: app nativa ligera o un integrador (Terra, Sahha) cuando haya volumen. |

## 10. Qué hacemos mejor que las apps existentes

1. **Sin fricción**: WhatsApp, foto o texto; nada de buscar alimentos en una base de datos.
2. **Comida local**: platillos y porciones de cada país, no solo comida estadounidense.
3. **Metas que se ajustan solas** con los datos de la persona (como MacroFactor), explicadas en palabras simples.
4. **Coach con memoria**: recuerda objetivos, lesiones, horarios y preferencias.
5. **Seguridad en código**: mínimos de calorías, ritmo máximo, modo de orientación general ante condiciones de salud o señales de TCA, crisis → línea de ayuda.
6. **Panel visual** para ver el progreso de un vistazo, sin tener que registrar nada extra.

## Fuentes (hábitos, programas y pasos)
- National Weight Control Registry — https://pmc.ncbi.nlm.nih.gov/articles/PMC2248784 · https://www.unm.edu/~lkravitz/Article%20folder/winning.html
- Diabetes Prevention Program — https://pmc.ncbi.nlm.nih.gov/articles/PMC4221569 · https://biostatcenter.gwu.edu/node/1300
- Precision Nutrition, porciones con la mano — https://www.precisionnutrition.com/hand-portion-transformations
- Implementation intentions / hábitos — https://stafforini.com/works/gollwitzer-2006-implementation-intentions-and/ · https://kops.uni-konstanz.de/handle/123456789/69905 · https://www.news-medical.net/news/20250128/How-long-does-it-take-to-form-a-healthy-habit.aspx
- Fitia — https://fitia.app/es/funcionalidades/ · https://andina.pe/agencia/noticia-desarrollan-aplicacion-nutricion-basada-machine-learning-901189.aspx
- OMS: no hay nivel seguro de alcohol — https://time.com/6248439/no-safe-amount-of-alcohol
- Aumento de peso al dejar de fumar — https://www.phc.ox.ac.uk/publications/351503
- Atajos + Apple Salud por HTTP — https://blog.maximeheckel.com/posts/build-personal-health-api-shortcuts-serverless/ · https://jngiam.bearblog.dev/syncing-apple-health-data-to-claude-code/
- Fin de las APIs de Google Fit / Health Connect — https://sahha.ai/blog/google-fit-api-sunset-migration/ · https://developers.google.com/health/about

## Fuentes
- ISSN Position Stand: protein and exercise (2017) — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5477153/
- ISSN Position Stand: diets and body composition — https://pubmed.ncbi.nlm.nih.gov/28630601/
- Bias and accuracy of RMR equations in non-obese and obese adults — https://pubmed.ncbi.nlm.nih.gov/23631843/
- MacroFactor: expenditure algorithm accuracy — https://macrofactor.com/algorithm-accuracy/ · cutting rate — https://macrofactor.com/cutting-calculator/
- DIETFITS secondary analyses — https://pmc.ncbi.nlm.nih.gov/articles/PMC7752762/
- WHO 2020 guidelines on physical activity — https://www.repository.cam.ac.uk/handle/1810/312925
- ACSM 2026 resistance training update (news) — https://www.newswise.com/articles/acsm-unveils-landmark-2026-resistance-training-guidelines-first-update-in-17-years
- Training frequency review (Kravitz) — https://unm.edu/~lkravitz/Article%20folder/frequency.html
- Daily steps & mortality (Paluch 2022) — https://hospitalhealthcare.com/specialisms/cardiovascular/mortality-benefit-from-higher-daily-steps-plateaus/ · (Ding 2025) — https://pubmed.ncbi.nlm.nih.gov/40713949/
- Digital self-monitoring meta-analysis — https://pmc.ncbi.nlm.nih.gov/articles/PMC8365685
- Digital CBT for obesity RCT — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7226050/
- LLM calorie estimation from food images — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12513282/ · https://arxiv.org/html/2507.07048v1
- Guías Alimentarias 2023 para la población mexicana — https://www.gob.mx/cms/uploads/attachment/file/863929/Infografi_a_Gui_as_Alimentarias_Poblacio_n_16Oct23.pdf
