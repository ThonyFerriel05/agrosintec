// schema.js
// FUENTE UNICA DE VERDAD para la FORMA de las respuestas de Gemini.
// Se pasa como `responseSchema` (salida estructurada): Gemini queda OBLIGADO
// a devolver exactamente esta estructura. Asi no hace falta repetir el ejemplo
// JSON gigante en el prompt, ni proteger cada campo con guards en el frontend.
//
// Si hay que agregar/quitar un campo de la respuesta, se hace AQUI y en un solo
// sitio (mas las instrucciones de tono en prompts.js). Nada de editar 4 lugares.

import { Type } from "@google/genai";

// Las 27 claves de parametros del analisis de suelo (orden de presentacion).
export const CLAVES_PARAMETROS = [
  "ph", "materia_organica", "conductividad_electrica",
  "nitrogeno", "fosforo", "potasio", "calcio", "magnesio", "sodio", "azufre", "silicio",
  "aluminio", "h_mas_al", "tbi", "cic", "t",
  "sb", "al_pct", "ca_pct", "mg_pct", "k_pct", "na_pct",
  "hierro", "manganeso", "zinc", "cobre", "boro",
];

// Cada parametro tiene la misma forma: { valor, unidad, clasificacion } (string).
const esquemaParametro = {
  type: Type.OBJECT,
  properties: {
    valor: { type: Type.STRING },
    unidad: { type: Type.STRING },
    clasificacion: { type: Type.STRING },
  },
  required: ["valor", "unidad", "clasificacion"],
  propertyOrdering: ["valor", "unidad", "clasificacion"],
};

// Construye el objeto 'parametros' con las 27 claves, todas con esquemaParametro.
const propsParametros = {};
for (const clave of CLAVES_PARAMETROS) {
  propsParametros[clave] = esquemaParametro;
}

// Lista de strings reutilizable (lo_bueno, lo_que_falta, cultivos.mas_adecuados).
const listaDeTexto = { type: Type.ARRAY, items: { type: Type.STRING } };

// ===================== ESQUEMA DE SUELO (Fase 1) =====================
export const ESQUEMA_SUELO = {
  type: Type.OBJECT,
  properties: {
    parametros: {
      type: Type.OBJECT,
      properties: propsParametros,
      required: CLAVES_PARAMETROS,
      propertyOrdering: CLAVES_PARAMETROS,
    },
    textura: {
      type: Type.OBJECT,
      properties: {
        arena_pct: { type: Type.STRING },
        limo_pct: { type: Type.STRING },
        arcilla_pct: { type: Type.STRING },
        clase_textural: { type: Type.STRING },
      },
      required: ["arena_pct", "limo_pct", "arcilla_pct", "clase_textural"],
      propertyOrdering: ["arena_pct", "limo_pct", "arcilla_pct", "clase_textural"],
    },
    interpretacion: {
      type: Type.OBJECT,
      properties: {
        tipo_suelo: { type: Type.STRING },
        resumen: { type: Type.STRING },
        lo_bueno: listaDeTexto,
        lo_que_falta: listaDeTexto,
        cultivos: {
          type: Type.OBJECT,
          properties: {
            mas_adecuados: listaDeTexto,
            con_manejo: { type: Type.STRING },
            fertilizante_sugerido: { type: Type.STRING },
          },
          required: ["mas_adecuados", "con_manejo", "fertilizante_sugerido"],
          propertyOrdering: ["mas_adecuados", "con_manejo", "fertilizante_sugerido"],
        },
      },
      required: ["tipo_suelo", "resumen", "lo_bueno", "lo_que_falta", "cultivos"],
      propertyOrdering: ["tipo_suelo", "resumen", "lo_bueno", "lo_que_falta", "cultivos"],
    },
  },
  required: ["parametros", "textura", "interpretacion"],
  // ORDEN DE GENERACION (clave): primero EXTRAE los datos, LUEGO interpreta
  // sobre ellos. Asi razona la interpretacion sobre numeros que ya "vio".
  propertyOrdering: ["parametros", "textura", "interpretacion"],
};

// ===================== ESQUEMA DE HOJA (Fase 2) =====================
export const ESQUEMA_HOJA = {
  type: Type.OBJECT,
  properties: {
    signos_detectados: listaDeTexto,
    diagnostico_probable: { type: Type.STRING },
    nivel_riesgo: { type: Type.STRING, enum: ["bajo", "medio", "alto"] },
    confianza: { type: Type.NUMBER },
    accion_recomendada: { type: Type.STRING },
    razonamiento_suelo: { type: Type.STRING },
  },
  required: [
    "signos_detectados", "diagnostico_probable", "nivel_riesgo",
    "confianza", "accion_recomendada", "razonamiento_suelo",
  ],
  propertyOrdering: [
    "signos_detectados", "diagnostico_probable", "nivel_riesgo",
    "confianza", "accion_recomendada", "razonamiento_suelo",
  ],
};
