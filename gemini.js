// gemini.js
// Llamada a Gemini Vision para extraer el analisis de suelo.
// SDK oficial nuevo: @google/genai  (NO el deprecado @google/generative-ai)
// Modelo: gemini-2.5-flash  (los 1.5 estan apagados -> 404)

import { GoogleGenAI } from "@google/genai";
import { PROMPT_EXTRACCION_SUELO } from "./prompts.js";

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
