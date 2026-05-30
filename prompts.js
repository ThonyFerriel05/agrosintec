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

Devuelve UNICAMENTE un JSON valido con EXACTAMENTE esta forma (sin texto extra,
sin markdown). El campo "agricultor_id" dejalo como string vacio "", el servidor lo rellena:

{
  "agricultor_id": "",
  "parametros": {
    "ph": { "valor": "sin dato", "unidad": "sin dato", "clasificacion": "sin dato" },
    "materia_organica": { "valor": "sin dato", "unidad": "sin dato", "clasificacion": "sin dato" },
    "conductividad_electrica": { "valor": "sin dato", "unidad": "sin dato", "clasificacion": "sin dato" },
    "nitrogeno": { "valor": "sin dato", "unidad": "sin dato", "clasificacion": "sin dato" },
    "fosforo": { "valor": "sin dato", "unidad": "sin dato", "clasificacion": "sin dato" },
    "potasio": { "valor": "sin dato", "unidad": "sin dato", "clasificacion": "sin dato" },
    "calcio": { "valor": "sin dato", "unidad": "sin dato", "clasificacion": "sin dato" },
    "magnesio": { "valor": "sin dato", "unidad": "sin dato", "clasificacion": "sin dato" },
    "sodio": { "valor": "sin dato", "unidad": "sin dato", "clasificacion": "sin dato" },
    "azufre": { "valor": "sin dato", "unidad": "sin dato", "clasificacion": "sin dato" },
    "silicio": { "valor": "sin dato", "unidad": "sin dato", "clasificacion": "sin dato" },
    "aluminio": { "valor": "sin dato", "unidad": "sin dato", "clasificacion": "sin dato" },
    "h_mas_al": { "valor": "sin dato", "unidad": "sin dato", "clasificacion": "sin dato" },
    "tbi": { "valor": "sin dato", "unidad": "sin dato", "clasificacion": "sin dato" },
    "cic": { "valor": "sin dato", "unidad": "sin dato", "clasificacion": "sin dato" },
    "t": { "valor": "sin dato", "unidad": "sin dato", "clasificacion": "sin dato" },
    "sb": { "valor": "sin dato", "unidad": "sin dato", "clasificacion": "sin dato" },
    "al_pct": { "valor": "sin dato", "unidad": "sin dato", "clasificacion": "sin dato" },
    "ca_pct": { "valor": "sin dato", "unidad": "sin dato", "clasificacion": "sin dato" },
    "mg_pct": { "valor": "sin dato", "unidad": "sin dato", "clasificacion": "sin dato" },
    "k_pct": { "valor": "sin dato", "unidad": "sin dato", "clasificacion": "sin dato" },
    "na_pct": { "valor": "sin dato", "unidad": "sin dato", "clasificacion": "sin dato" },
    "hierro": { "valor": "sin dato", "unidad": "sin dato", "clasificacion": "sin dato" },
    "manganeso": { "valor": "sin dato", "unidad": "sin dato", "clasificacion": "sin dato" },
    "zinc": { "valor": "sin dato", "unidad": "sin dato", "clasificacion": "sin dato" },
    "cobre": { "valor": "sin dato", "unidad": "sin dato", "clasificacion": "sin dato" },
    "boro": { "valor": "sin dato", "unidad": "sin dato", "clasificacion": "sin dato" }
  },
  "textura": {
    "arena_pct": "sin dato",
    "limo_pct": "sin dato",
    "arcilla_pct": "sin dato",
    "clase_textural": "sin dato"
  }
}
`.trim();

// =====================================================================
// FASE 2 - Analisis de HOJA con CRUCE contra el perfil de suelo.
// =====================================================================

/**
 * Construye el prompt de analisis de hoja inyectando el perfil de suelo.
 * @param {object} perfilSuelo - el JSON de suelo guardado (no se usa entero aqui,
 *   pero se deja por si quieres mostrar mas contexto numerico).
 * @param {string[]} factoresLimitantes - lineas legibles YA calculadas en gemini.js
 *   (deterministas, no las decide Gemini).
 * @returns {string} prompt listo para Gemini.
 */
export function construirPromptHoja(perfilSuelo, factoresLimitantes) {
  const listaFactores = factoresLimitantes.length
    ? factoresLimitantes.map((f) => `- ${f}`).join("\n")
    : "- (No se detectaron factores limitantes claros en el suelo de este agricultor.)";

  return `
Eres un agronomo experto en diagnostico foliar (analisis de hojas) por imagen.
Te paso la FOTO de una hoja de cultivo. Tu trabajo es detectar SIGNOS TEMPRANOS
de deficiencias o estres. NO predices el futuro ni das certezas absolutas:
hablas SIEMPRE en terminos de riesgo y probabilidad, con un nivel de confianza.

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

Analiza la hoja ponderando ese contexto y devuelve UNICAMENTE este JSON
(sin markdown, sin texto extra, exactamente estas claves):

{
  "signos_detectados": ["signos visuales concretos que ves en la hoja"],
  "diagnostico_probable": "hipotesis mas probable, en lenguaje de riesgo/probabilidad (no certezas)",
  "nivel_riesgo": "bajo | medio | alto",
  "confianza": 0.0,
  "accion_recomendada": "que hacer, concreto y accionable",
  "razonamiento_suelo": "OBLIGATORIO: explica como usaste el perfil de suelo para llegar al diagnostico, que factor limitante reforzo o descarto que hipotesis"
}

Reglas de salida:
- "confianza" es un numero entre 0 y 1.
- "nivel_riesgo" solo puede ser exactamente "bajo", "medio" o "alto".
- "razonamiento_suelo" SIEMPRE debe mencionar el cruce con el suelo.
- No inventes signos que no se vean. Si la hoja luce sana, dilo con confianza
  alta y riesgo "bajo", y aun asi menciona el cruce con el suelo.
`.trim();
}
