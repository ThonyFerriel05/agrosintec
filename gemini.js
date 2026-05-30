// gemini.js
// Llamada a Gemini Vision para extraer el analisis de suelo.
// SDK oficial nuevo: @google/genai  (NO el deprecado @google/generative-ai)
// Modelo: gemini-2.5-flash  (los 1.5 estan apagados -> 404)

import { GoogleGenAI } from "@google/genai";
import { PROMPT_EXTRACCION_SUELO, construirPromptHoja } from "./prompts.js";

const MODELO = "gemini-2.5-flash";

// Claves de parametros que SIEMPRE deben existir en la salida.
const CLAVES_PARAMETROS = [
  "ph", "materia_organica", "conductividad_electrica",
  "nitrogeno", "fosforo", "potasio", "calcio", "magnesio", "sodio", "azufre", "silicio",
  "aluminio", "h_mas_al", "tbi", "cic", "t",
  "sb", "al_pct", "ca_pct", "mg_pct", "k_pct", "na_pct",
  "hierro", "manganeso", "zinc", "cobre", "boro",
];

// Estructura valida de fallback, para que el demo no se rompa si Gemini falla.
function estructuraFallback(agricultor_id) {
  const parametros = {};
  for (const clave of CLAVES_PARAMETROS) {
    parametros[clave] = { valor: "sin dato", unidad: "sin dato", clasificacion: "sin dato" };
  }
  return {
    agricultor_id,
    parametros,
    textura: {
      arena_pct: "sin dato",
      limo_pct: "sin dato",
      arcilla_pct: "sin dato",
      clase_textural: "sin dato",
    },
    _error: "No se pudo extraer con Gemini, se devolvio estructura vacia.",
  };
}

// Cliente: la API key viene SOLO de .env, nunca hardcodeada.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Extrae el analisis de suelo desde una imagen en base64.
 * @param {string} imagenBase64 - imagen del analisis en base64 (sin el prefijo data:)
 * @param {string} mimeType - ej "image/jpeg" o "image/png"
 * @param {string} agricultor_id
 * @returns {Promise<object>} JSON con { agricultor_id, parametros, textura }
 */
export async function extraerAnalisisSuelo(imagenBase64, mimeType, agricultor_id) {
  try {
    const respuesta = await ai.models.generateContent({
      model: MODELO,
      contents: [
        {
          role: "user",
          parts: [
            { text: PROMPT_EXTRACCION_SUELO },
            { inlineData: { mimeType, data: imagenBase64 } },
          ],
        },
      ],
      config: {
        // Salida JSON forzada por el SDK. Nada de limpiar markdown con regex.
        responseMimeType: "application/json",
      },
    });

    const texto = respuesta.text;
    const datos = JSON.parse(texto);

    // El servidor manda el id real.
    datos.agricultor_id = agricultor_id;
    return datos;
  } catch (error) {
    console.error("[gemini] Error al extraer analisis de suelo:", error?.message || error);
    return estructuraFallback(agricultor_id);
  }
}

// =====================================================================
// FASE 2 - Analisis de HOJA con CRUCE contra el perfil de suelo.
// =====================================================================

// Normaliza un texto: minusculas y sin acentos (para comparar clasificaciones).
function norm(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/**
 * Identifica los FACTORES LIMITANTES del suelo con reglas agronomicas FIJAS.
 * Esto lo decide el codigo (determinista), NO Gemini.
 *
 * OJO con la regla de negocio: no todo lo "bajo" es malo.
 *   - Limitantes: pH muy acido, P bajo, K% muy bajo, S bajo/muy bajo, B bajo/muy bajo.
 *   - NO limitantes (son BUENOS aunque salgan "muy bajo"): Al% y C.E.
 *
 * @param {object} perfilSuelo - JSON de suelo guardado { parametros, textura, ... }
 * @returns {string[]} lineas legibles para inyectar en el prompt de la hoja.
 */
export function identificarFactoresLimitantes(perfilSuelo) {
  const p = perfilSuelo?.parametros || {};
  const factores = [];

  const clasif = (k) => norm(p[k]?.clasificacion);
  const enBajos = (k) => ["bajo", "muy bajo"].includes(clasif(k));
  const valorNum = (k) => {
    const v = parseFloat(String(p[k]?.valor ?? "").replace(",", "."));
    return Number.isFinite(v) ? v : null;
  };
  const etiqueta = (k) =>
    `valor ${p[k]?.valor ?? "sin dato"}, clasificacion "${p[k]?.clasificacion ?? "sin dato"}"`;

  // 1. pH muy acido (por clasificacion "muy acido" o por valor < 5.5)
  const phVal = valorNum("ph");
  if (clasif("ph").includes("muy acido") || (phVal !== null && phVal < 5.5)) {
    factores.push(`pH muy acido (${etiqueta("ph")}): induce estres y bloquea disponibilidad de nutrientes.`);
  }

  // 2. Fosforo (P) bajo / muy bajo
  if (enBajos("fosforo")) {
    factores.push(`Fosforo (P) bajo (${etiqueta("fosforo")}): limita energia, raices y desarrollo.`);
  }

  // 3. Saturacion de potasio (K%) MUY baja
  if (clasif("k_pct").includes("muy bajo")) {
    factores.push(`Saturacion de potasio (K%) muy baja (${etiqueta("k_pct")}): riesgo de deficiencia de potasio.`);
  }

  // 4. Azufre (S) bajo / muy bajo
  if (enBajos("azufre")) {
    factores.push(`Azufre (S) bajo (${etiqueta("azufre")}): afecta sintesis de proteinas y formacion de clorofila.`);
  }

  // 5. Boro (B) bajo / muy bajo
  if (enBajos("boro")) {
    factores.push(`Boro (B) bajo (${etiqueta("boro")}): afecta floracion, cuajado y crecimiento de meristemos.`);
  }

  // NOTA: Al% muy bajo y C.E. muy baja son CONDICIONES BUENAS -> NO se agregan.
  return factores;
}

// Fallback valido de hoja, para que el demo no se rompa si Gemini falla.
function fallbackHoja(factoresLimitantes) {
  return {
    signos_detectados: [],
    diagnostico_probable: "No se pudo analizar la hoja con Gemini en este momento.",
    nivel_riesgo: "bajo",
    confianza: 0,
    accion_recomendada: "Reintentar el analisis de la hoja. Si persiste, revisar la API key y la conexion.",
    razonamiento_suelo: factoresLimitantes.length
      ? `No hubo analisis de imagen. Factores limitantes del suelo: ${factoresLimitantes.join(" | ")}.`
      : "No hubo analisis de imagen y el suelo no mostro factores limitantes claros.",
    _error: "Fallo la llamada a Gemini, se devolvio estructura de fallback valida.",
  };
}

/**
 * Analiza la hoja CRUZANDO con el perfil de suelo guardado.
 * @param {string} imagenBase64 - imagen de la hoja en base64 (sin prefijo data:)
 * @param {string} mimeType - ej "image/jpeg"
 * @param {object} perfilSuelo - perfil de suelo ya leido de db.json
 * @returns {Promise<object>} diagnostico con la forma de la Fase 2
 */
export async function analizarHoja(imagenBase64, mimeType, perfilSuelo) {
  // 1) Se calculan los factores limitantes a partir del suelo guardado.
  const factoresLimitantes = identificarFactoresLimitantes(perfilSuelo);
  // 2) Se inyectan como contexto en el prompt de la hoja (EL CRUCE).
  const prompt = construirPromptHoja(perfilSuelo, factoresLimitantes);

  try {
    const respuesta = await ai.models.generateContent({
      model: MODELO,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: imagenBase64 } },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const datos = JSON.parse(respuesta.text);
    return datos;
  } catch (error) {
    console.error("[gemini] Error al analizar hoja:", error?.message || error);
    return fallbackHoja(factoresLimitantes);
  }
}
