// gemini.js
// Llamada a Gemini Vision para extraer el analisis de suelo.
// SDK oficial nuevo: @google/genai  (NO el deprecado @google/generative-ai)
// Modelo: gemini-2.5-flash  (los 1.5 estan apagados -> 404)

import { GoogleGenAI } from "@google/genai";
import { PROMPT_EXTRACCION_SUELO, construirPromptHoja } from "./prompts.js";
import { ESQUEMA_SUELO, ESQUEMA_HOJA, CLAVES_PARAMETROS } from "./schema.js";
import { calcularAmenazas } from "./riesgoFitosanitario.js";

const MODELO = "gemini-2.5-flash";

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
    interpretacion: {
      tipo_suelo: "sin dato",
      resumen: "No se pudo interpretar el suelo en este momento. Reintenta el analisis.",
      lo_bueno: [],
      lo_que_falta: [],
      cultivos: {
        mas_adecuados: [],
        con_manejo: "sin dato",
        fertilizante_sugerido: "sin dato",
      },
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
        // Salida JSON ESTRUCTURADA: el esquema obliga la forma exacta.
        // Nada de limpiar markdown ni rogar la estructura en el prompt.
        responseMimeType: "application/json",
        responseSchema: ESQUEMA_SUELO,
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
// Recibe el contexto (prior de amenazas) para devolverlo igual que en el exito.
function fallbackHoja(factoresLimitantes, contexto) {
  return {
    signos_detectados: [],
    diagnostico_probable: "No se pudo analizar la hoja con Gemini en este momento.",
    nivel_riesgo: "bajo",
    confianza: 0,
    accion_recomendada: "Reintentar el analisis de la hoja. Si persiste, revisar la API key y la conexion.",
    razonamiento_suelo: factoresLimitantes.length
      ? `No hubo analisis de imagen. Factores limitantes del suelo: ${factoresLimitantes.join(" | ")}.`
      : "No hubo analisis de imagen y el suelo no mostro factores limitantes claros.",
    contexto,
    _error: "Fallo la llamada a Gemini, se devolvio estructura de fallback valida.",
  };
}

/**
 * Analiza la hoja CRUZANDO con el perfil de suelo guardado.
 * @param {string} imagenBase64 - imagen de la hoja en base64 (sin prefijo data:)
 * @param {string} mimeType - ej "image/jpeg"
 * @param {object} perfilSuelo - perfil de suelo ya leido de db.json
 * @param {string} cultivo - ej "arroz", "soya"... (default "general")
 * @param {string} clima - clave de clima/temporada (default "templado")
 * @returns {Promise<object>} diagnostico con la forma de la Fase 2
 */
export async function analizarHoja(imagenBase64, mimeType, perfilSuelo, cultivo = "general", clima = "templado") {
  // 1) Se calculan los factores limitantes a partir del suelo guardado.
  const factoresLimitantes = identificarFactoresLimitantes(perfilSuelo);
  // 2) PASO INTERMEDIO: prior fitosanitario (amenazas probables) desde suelo + cultivo + clima.
  const contexto = calcularAmenazas(perfilSuelo, cultivo, clima);
  // 3) Se inyecta el cruce de suelo + el prior de amenazas en el prompt de la hoja.
  const prompt = construirPromptHoja(perfilSuelo, factoresLimitantes, contexto);

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
        responseSchema: ESQUEMA_HOJA,
      },
    });

    const datos = JSON.parse(respuesta.text);
    // Adjuntamos el PRIOR (amenazas que consideramos) para mostrarlo en la UI:
    // es nuestro diferenciador, debe ser visible. No lo decide Gemini, es del codigo.
    datos.contexto = {
      cultivo: contexto.cultivo,
      clima: contexto.climaLabel,
      amenazas: contexto.amenazas,
    };
    return datos;
  } catch (error) {
    console.error("[gemini] Error al analizar hoja:", error?.message || error);
    return fallbackHoja(factoresLimitantes, {
      cultivo: contexto.cultivo,
      clima: contexto.climaLabel,
      amenazas: contexto.amenazas,
    });
  }
}

// =====================================================================
// CHAT CONTEXTUALIZADO - Responde preguntas sobre el suelo del agricultor
// =====================================================================

/**
 * Responde una pregunta sobre el contexto del suelo (chat normal).
 * Mantiene el historial de conversación y limita las respuestas al tema agrícola.
 * @param {string} mensajeUsuario - la pregunta del usuario
 * @param {object} perfilSuelo - perfil de suelo del agricultor (contexto)
 * @param {object[]} historialChat - array de mensajes previos { rol, contenido }
 * @returns {Promise<string>} respuesta de Gemini
 */
export async function chatSobreContexto(mensajeUsuario, perfilSuelo, historialChat = []) {
  try {
    // Construir el contexto del suelo en texto legible
    const textoContextoSuelo = construirTextoContextoSuelo(perfilSuelo);

    // Sistema prompt que limita el alcance al suelo y agricultura
    const systemPrompt = `Eres un asesor agrónomo experto y amable. Tu rol es responder preguntas sobre el análisis de suelo y la agricultura del agricultor.

## CONTEXTO DEL SUELO DEL AGRICULTOR:
${textoContextoSuelo}

## REGLAS IMPORTANTES:
1. Solo responde preguntas relacionadas con el suelo, la agricultura, cultivos y manejo agronómico.
2. Si la pregunta NO está relacionada con estos temas, responde amablemente: "Disculpa, esa pregunta está fuera de mi área de asesoría. Soy especialista en análisis de suelo y agricultura. ¿Tienes preguntas sobre el suelo o los cultivos?"
3. Usa el contexto del suelo para dar recomendaciones específicas y personalizadas.
4. Sé conciso pero informativo. Máximo 3-4 párrafos por respuesta.
5. Si necesitas clarificar algo del suelo que no esté en los datos, pídelo de forma educada.`;

    // Construir el historial en formato de Gemini
    const contenidoChat = [];

    // Agregar el sistema prompt
    contenidoChat.push({
      role: "user",
      parts: [{ text: systemPrompt }],
    });
    contenidoChat.push({
      role: "model",
      parts: [{ text: "Entendido. Soy un asesor agrónomo especializado en análisis de suelo. Estoy listo para responder tus preguntas sobre el suelo y la agricultura. ¿Qué deseas saber?" }],
    });

    // Agregar historial previo de la conversación
    if (Array.isArray(historialChat) && historialChat.length > 0) {
      for (const msg of historialChat) {
        contenidoChat.push({
          role: msg.rol === "user" ? "user" : "model",
          parts: [{ text: msg.contenido }],
        });
      }
    }

    // Agregar el mensaje actual del usuario
    contenidoChat.push({
      role: "user",
      parts: [{ text: mensajeUsuario }],
    });

    // Llamar a Gemini
    const respuesta = await ai.models.generateContent({
      model: MODELO,
      contents: contenidoChat,
      config: {
        temperature: 0.7, // Un poco más creativo que extraction, pero coherente
      },
    });

    const respuestaTexto = respuesta.text || "No pude generar una respuesta.";
    return respuestaTexto;
  } catch (error) {
    console.error("[gemini-chat] Error al responder pregunta:", error?.message || error);
    
    // Detectar si es error de cuota (429)
    const esErrorCuota = error?.message?.includes("429") || error?.message?.includes("Quota exceeded") || error?.message?.includes("quota");
    
    if (esErrorCuota) {
      console.warn("[gemini-chat] Cuota de Gemini agotada (429). Usando respuesta con inteligencia local...");
      return generarFallbackChat(mensajeUsuario, perfilSuelo);
    }
    
    return `Lo siento, ocurrió un error al procesar tu pregunta. Por favor intenta de nuevo. Error: ${error?.message || "desconocido"}`;
  }
}

/**
 * Genera una respuesta inteligente basada en el contexto del suelo cuando Gemini no está disponible.
 * Usa reglas agrícolas y los factores limitantes del suelo.
 * @param {string} mensajeUsuario - la pregunta del usuario
 * @param {object} perfilSuelo - perfil de suelo
 * @returns {string} respuesta generada localmente
 */
function generarFallbackChat(mensajeUsuario, perfilSuelo) {
  const pregunta = mensajeUsuario.toLowerCase();
  const factores = identificarFactoresLimitantes(perfilSuelo);
  
  // Preguntas fuera del tema
  if (pregunta.match(/hola|como estás|que tal|covid|política|deportes|música|películas/i)) {
    return "Disculpa, esa pregunta está fuera de mi área de asesoría. Soy especialista en análisis de suelo y agricultura. ¿Tienes preguntas sobre el suelo o los cultivos?";
  }
  
  // Preguntas sobre factores limitantes
  if (pregunta.match(/factor|limitante|problema|limitaciones/)) {
    if (factores.length === 0) {
      return "Según el análisis del suelo, no se detectaron factores limitantes significativos. Tu suelo presenta buenas características generales para la mayoría de cultivos. ¿Hay algún cultivo específico que quieras cultivar?";
    }
    return `Se identificaron los siguientes factores limitantes en tu suelo:\n\n${factores.map(f => `• ${f}`).join("\n")}\n\nEstos factores pueden afectar el crecimiento de tus plantas. ¿Quieres recomendaciones para manejarlos?`;
  }
  
  // Preguntas sobre pH
  if (pregunta.match(/ph|acido|alcalino|acidez/)) {
    const ph = perfilSuelo?.parametros?.ph;
    if (!ph) return "No tengo datos de pH registrados en tu perfil de suelo.";
    const valor = parseFloat(String(ph.valor).replace(",", "."));
    const clasif = String(ph.clasificacion).toLowerCase();
    if (valor < 5.5 || clasif.includes("muy acido")) {
      return `Tu suelo tiene pH ${ph.valor} (${ph.clasificacion}), que es muy ácido. Esto puede afectar la disponibilidad de nutrientes. Te recomiendo aplicar cal agrícola para aumentar el pH. ¿Necesitas más detalles sobre enmiendas?`;
    }
    if (valor > 8 || clasif.includes("alcalino")) {
      return `Tu suelo tiene pH ${ph.valor} (${ph.clasificacion}), que es alcalino. Esto puede bloquear algunos micronutrientes. Considera aplicar azufre elemental. ¿Qué cultivos planeas?`;
    }
    return `Tu suelo tiene pH ${ph.valor} (${ph.clasificacion}), que es adecuado para la mayoría de cultivos. ¿Hay algo específico que quieras saber?`;
  }
  
  // Preguntas sobre nutrientes
  if (pregunta.match(/nutriente|nitrogeno|fosforo|potasio|fertiliz|abono/)) {
    const parametrosNutritivos = perfilSuelo?.parametros || {};
    const respuestas = [];
    
    if (parametrosNutritivos.nitrogeno?.clasificacion?.toLowerCase().includes("bajo")) {
      respuestas.push("El nitrógeno está bajo. Considera aplicar fertilizantes nitrogenados o incorporar materia orgánica.");
    }
    if (parametrosNutritivos.fosforo?.clasificacion?.toLowerCase().includes("bajo")) {
      respuestas.push("El fósforo está bajo, lo que afecta el crecimiento radicular. Aplicar fertilizantes fosfatados es recomendado.");
    }
    if (parametrosNutritivos.potasio?.clasificacion?.toLowerCase().includes("bajo")) {
      respuestas.push("El potasio está bajo, necesario para la resistencia de la planta. Un fertilizante potásico sería beneficioso.");
    }
    
    if (respuestas.length > 0) {
      return `Basándome en tu análisis de suelo:\n\n${respuestas.map(r => `• ${r}`).join("\n")}\n\n¿Necesitas información sobre dosis específicas?`;
    }
    return "Los niveles de nutrientes en tu suelo parecen adecuados. ¿Qué cultivo específico vas a sembrar?";
  }
  
  // Preguntas sobre materia orgánica
  if (pregunta.match(/organica|materia|compost|abono verde|humus/)) {
    const mo = perfilSuelo?.parametros?.materia_organica;
    if (mo) {
      const valor = parseFloat(String(mo.valor).replace(",", "."));
      if (valor < 2) {
        return `Tu suelo tiene ${mo.valor}% de materia orgánica (${mo.clasificacion}). Este nivel es bajo. Te recomiendo incorporar compost, estiércol bien descompuesto o hacer abonos verdes para mejorar la estructura y fertilidad del suelo.`;
      }
      if (valor > 8) {
        return `Tu suelo tiene ${mo.valor}% de materia orgánica (${mo.clasificacion}). Este nivel es excelente, indica un suelo muy fértil y con buena estructura. Mantén esta práctica de añadir materia orgánica regularmente.`;
      }
      return `Tu suelo tiene ${mo.valor}% de materia orgánica (${mo.clasificacion}), que es un buen nivel. Puedes mejorar incorporando restos de cosechas y compost regularmente.`;
    }
    return "No tengo datos de materia orgánica en tu perfil. Incorporar abono orgánico es siempre beneficioso.";
  }
  
  // Preguntas sobre textura
  if (pregunta.match(/textura|arena|limo|arcilla|estructura|compactación/)) {
    if (perfilSuelo?.textura) {
      const tex = perfilSuelo.textura;
      return `Tu suelo es ${tex.clase_textural || "sin clasificación"} con ${tex.arena_pct}% arena, ${tex.limo_pct}% limo y ${tex.arcilla_pct}% arcilla. Esta composición afecta la retención de agua y aireación. ¿Necesitas recomendaciones para mejorar la estructura?`;
    }
    return "No tengo datos de textura en tu perfil.";
  }
  
  // Pregunta genérica sobre suelo
  if (pregunta.match(/suelo|tierra|terreno/)) {
    const resumen = perfilSuelo?.interpretacion?.resumen || "Suelo sin clasificar";
    return `Tu suelo es ${resumen}. Para dar recomendaciones más específicas, pregunta sobre nutrientes, pH, factores limitantes o qué cultivos quieres sembrar.`;
  }
  
  // Respuesta por defecto cuando Gemini no está disponible
  return "En este momento estoy con disponibilidad limitada de procesamiento. Soy especialista en suelo y agricultura. Prueba preguntar sobre:\n• Factores limitantes\n• pH del suelo\n• Nutrientes y fertilización\n• Textura y estructura\n• Materia orgánica\n\nO cuéntame qué cultivo quieres sembrar para darte recomendaciones específicas.";
}

/**
 * Construye un texto legible con el contexto del suelo para inyectar en el prompt.
 * @param {object} perfilSuelo - perfil de suelo
 * @returns {string} texto formateado
 */
function construirTextoContextoSuelo(perfilSuelo) {
  if (!perfilSuelo) {
    return "No hay datos de suelo disponibles.";
  }

  const p = perfilSuelo.parametros || {};
  let texto = "";

  // Resumen de interpretación
  if (perfilSuelo.interpretacion) {
    const interp = perfilSuelo.interpretacion;
    texto += `**Tipo de Suelo:** ${interp.tipo_suelo || "sin clasificar"}\n`;
    texto += `**Resumen:** ${interp.resumen || "sin resumen"}\n\n`;
  }

  // Textura
  if (perfilSuelo.textura) {
    const tex = perfilSuelo.textura;
    texto += `**Textura del Suelo:**\n`;
    texto += `- Arena: ${tex.arena_pct || "sin dato"}%\n`;
    texto += `- Limo: ${tex.limo_pct || "sin dato"}%\n`;
    texto += `- Arcilla: ${tex.arcilla_pct || "sin dato"}%\n`;
    texto += `- Clasificación textural: ${tex.clase_textural || "sin dato"}\n\n`;
  }

  // Parámetros químicos principales
  texto += `**Parámetros Principales:**\n`;
  const parametrosPrincipales = ["ph", "materia_organica", "conductividad_electrica", "nitrogeno", "fosforo", "potasio"];
  for (const clave of parametrosPrincipales) {
    const param = p[clave];
    if (param) {
      texto += `- ${clave.toUpperCase()}: ${param.valor} ${param.unidad || ""} (${param.clasificacion || "sin clasificación"})\n`;
    }
  }

  // Factores limitantes si los hay
  const factores = identificarFactoresLimitantes(perfilSuelo);
  if (factores.length > 0) {
    texto += `\n**Factores Limitantes Identificados:**\n`;
    for (const factor of factores) {
      texto += `- ${factor}\n`;
    }
  }

  return texto;
}
