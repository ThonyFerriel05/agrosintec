// prompts.js
// Prompt de extraccion de analisis de suelo (Fase 1).
// Pide a Gemini extraer TODOS los parametros listados, sin saltarse ninguno.
// Cada parametro: valor, unidad y clasificacion. Si no aparece -> "sin dato".

export const PROMPT_EXTRACCION_SUELO = `
Eres un asistente agronomo experto en interpretar reportes de laboratorio
de analisis de suelo. Te paso la FOTO de un analisis de suelo de laboratorio.

Tu tarea: extraer TODOS los parametros que liste abajo. NO te saltes ninguno.
Para cada parametro devuelve un objeto con exactamente estos campos:
  - "valor": el numero tal como aparece en el reporte (usa punto decimal). Si no aparece, "sin dato".
  - "unidad": la unidad del reporte (ej "meq/100g", "ppm", "%", "dS/m", "mg/kg"). Si no aparece, "sin dato".
  - "clasificacion": la categoria cualitativa. Usa la escala del propio reporte si la trae;
    si no, clasifica como uno de: "Muy Bajo", "Bajo", "Moderado", "Alto", "Muy Alto".
    Para el pH usa la escala de acidez: "Muy Acido", "Acido", "Ligeramente Acido",
    "Neutro", "Ligeramente Alcalino", "Alcalino". Si no puedes clasificar, "sin dato".

Si un parametro NO aparece en el reporte, igual debes incluir su clave con
valor, unidad y clasificacion todos en "sin dato". NUNCA omitas una clave.

PARAMETROS A EXTRAER (claves EXACTAS):

Quimica / acidez:
  ph, materia_organica, conductividad_electrica

Macronutrientes:
  nitrogeno, fosforo, potasio, calcio, magnesio, sodio, azufre, silicio

Complejo de intercambio:
  aluminio, h_mas_al (acidez total H+Al), tbi (total bases intercambiables),
  cic (capacidad de intercambio cationico), t (cic efectiva)

Saturaciones (en %):
  sb (saturacion de bases), al_pct (saturacion de aluminio), ca_pct,
  mg_pct, k_pct, na_pct

Micronutrientes:
  hierro, manganeso, zinc, cobre, boro

Ademas, la TEXTURA del suelo en un bloque aparte:
  arena_pct, limo_pct, arcilla_pct (numeros en %), clase_textural (texto, ej "Franco Arcilloso").
  Si no aparecen, usa "sin dato".

Y POR ULTIMO, lo mas importante para el agricultor: una "interpretacion" en
LENGUAJE HUMANO Y SENCILLO (como le hablarias a un agricultor que NO sabe quimica).
Se PUNTUAL y CONCISO. NO repitas la misma idea en varios campos: cada campo aporta
algo DISTINTO. Nada de jerga ni numeros tecnicos sueltos. Usa estos campos:
  - "tipo_suelo": UNA frase corta que describa el suelo (ej "Suelo acido y franco arcilloso").
    NO enumeres aqui las deficiencias, eso va en otra parte.
  - "resumen": MAXIMO 1 frase, directa y sin rodeos, con lo mas urgente a corregir.
  - "lo_bueno": lista de 2-4 ETIQUETAS MUY CORTAS (3-5 palabras c/u), SIN explicacion ni frases
    (ej "Buena retencion de nutrientes", "Calcio y magnesio altos").
  - "lo_que_falta": lista de 2-4 problemas, cada uno UNA frase corta y puntual que diga
    QUE falta y por que importa (ej "Fosforo muy bajo: frena raices y floracion").
  - "cultivos": un objeto que recomiende cultivos segun ESTE suelo concreto:
      - "mas_adecuados": lista de 2-4 cultivos que crecerian BIEN en el suelo TAL COMO ESTA hoy.
      - "con_manejo": UNA frase que diga que otros cultivos (ej arroz, soya, maiz) podrian
        servir SI se corrige el suelo, indicando la correccion concreta que hace falta.
      - "fertilizante_sugerido": UNA frase con el fertilizante o enmienda concreta recomendada
        (ej "Encalado para subir el pH + fertilizante rico en fosforo y potasio").
Basate en los numeros que extrajiste, pero NO los repitas crudos: traducelos a consecuencias.

La ESTRUCTURA de salida (que claves y de que tipo) ya esta fijada por el sistema:
tu solo rellena su contenido. No agregues texto fuera del JSON ni uses markdown.
Si un parametro no aparece en el reporte, pon "sin dato" en sus tres campos.
`.trim();

// =====================================================================
// FASE 2 - Analisis de HOJA con CRUCE contra el perfil de suelo.
// =====================================================================

/**
 * Construye el prompt de analisis de hoja inyectando el perfil de suelo
 * y el PRIOR fitosanitario (amenazas probables ya calculadas por el codigo).
 * @param {object} perfilSuelo - el JSON de suelo guardado.
 * @param {string[]} factoresLimitantes - lineas legibles YA calculadas en gemini.js
 *   (deterministas, no las decide Gemini).
 * @param {object} contexto - { cultivo, climaLabel, amenazas } del modulo
 *   riesgoFitosanitario.js. `amenazas` es la lista corta de candidatos plausibles.
 * @returns {string} prompt listo para Gemini.
 */
export function construirPromptHoja(perfilSuelo, factoresLimitantes, contexto = {}) {
  const { cultivo = "general", climaLabel = "templado", amenazas = [] } = contexto;

  const listaFactores = factoresLimitantes.length
    ? factoresLimitantes.map((f) => `- ${f}`).join("\n")
    : "- (No se detectaron factores limitantes claros en el suelo de este agricultor.)";

  const listaAmenazas = amenazas.length
    ? amenazas
        .map((a) => `- ${a.nombre} (${a.tipo}, probabilidad ~${Math.round(a.probabilidad * 100)}%): ${a.razones.join("; ")}.`)
        .join("\n")
    : "- (No se identificaron amenazas claras para este cultivo/clima; evalua la hoja con cautela y sin forzar un diagnostico.)";

  return `
Eres un agronomo experto en diagnostico foliar (analisis de hojas) por imagen.
Te paso la FOTO de una hoja de cultivo. Tu trabajo es detectar SIGNOS TEMPRANOS
de deficiencias o estres. NO predices el futuro ni das certezas absolutas:
hablas SIEMPRE en terminos de riesgo y probabilidad, con un nivel de confianza.

Cultivo: ${cultivo}. Clima de la temporada: ${climaLabel}.

=====================================================================
>>> INYECCION DEL PERFIL DE SUELO (EL CRUCE - lo mas importante) <<<
Este agricultor YA tiene un analisis de suelo. De ese suelo extrajimos los
FACTORES LIMITANTES reales (los que debilitan la planta). Usalos como
CONTEXTO PRIORITARIO al leer la hoja:
  - Si lo que ves en la hoja es COMPATIBLE con uno de estos factores del
    suelo, dale MAS PESO a esa hipotesis en vez de adivinar al azar.
  - Si la hoja NO concuerda con ningun factor del suelo, dilo claramente.

FACTORES LIMITANTES DEL SUELO DE ESTE AGRICULTOR:
${listaFactores}

=====================================================================
>>> AMENAZAS PROBABLES (PRIOR calculado por el sistema) <<<
A partir del suelo, el cultivo (${cultivo}) y el clima (${climaLabel}), el sistema
ya calculo que plagas/hongos/bacterias son MAS PLAUSIBLES en este caso. Esta lista
es tu PRIMER lugar donde buscar, para NO inventar enfermedades exoticas:
  - Si lo que ves coincide con una de estas amenazas, NOMBRALA y sube la confianza.
  - Si ves algo que NO esta en la lista pero es claro en la imagen, puedes
    reportarlo, pero di explicitamente que estaba fuera del prior.
  - Si la hoja luce sana, dilo; no fuerces ninguna de estas amenazas.

CANDIDATOS PROBABLES PARA ESTE CULTIVO/CLIMA/SUELO:
${listaAmenazas}
=====================================================================

Analiza la hoja ponderando ese contexto. La ESTRUCTURA de salida ya esta fijada
por el sistema (claves y tipos); tu rellena el contenido de cada campo:
  - "signos_detectados": signos visuales concretos que ves en la hoja.
  - "diagnostico_probable": la hipotesis mas probable, en lenguaje de riesgo/probabilidad (no certezas).
  - "nivel_riesgo": exactamente "bajo", "medio" o "alto".
  - "confianza": numero entre 0 y 1.
  - "accion_recomendada": que hacer, concreto y accionable.
  - "razonamiento_suelo": OBLIGATORIO, explica como usaste el perfil de suelo Y la
    lista de amenazas probables para llegar al diagnostico: que factor o amenaza
    reforzo o descarto que hipotesis.

Reglas:
- "razonamiento_suelo" SIEMPRE debe mencionar el cruce con el suelo y, si aplica,
  con la lista de amenazas probables.
- No inventes signos que no se vean. Si la hoja luce sana, dilo con confianza
  alta y riesgo "bajo", y aun asi menciona el cruce con el suelo.
`.trim();
}
