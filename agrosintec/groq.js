// groq.js
// Chat contextualizado usando Groq API (sin límite de requests como Gemini)
// Groq proporciona ~9000 requests/día gratis vs 20 de Gemini

import Groq from "groq-sdk";

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODELO = "mixtral-8x7b-32768";

/**
 * Responde una pregunta sobre el contexto del suelo usando Groq (chat normal).
 * Mantiene el historial de conversación y limita las respuestas al tema agrícola.
 * @param {string} mensajeUsuario - la pregunta del usuario
 * @param {object} perfilSuelo - perfil de suelo del agricultor (contexto)
 * @param {object[]} historialChat - array de mensajes previos { rol, contenido }
 * @returns {Promise<string>} respuesta de Groq
 */
export async function chatSobreContextoGroq(
  mensajeUsuario,
  perfilSuelo,
  historialChat = []
) {
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
5. Si necesitas clarificar algo del suelo que no esté en los datos, pídelo de forma educada.
6. Responde en español.`;

    // Construir el historial en formato para Groq
    const mensajesParaGroq = [];

    // Agregar el historial previo de la conversación
    if (Array.isArray(historialChat) && historialChat.length > 0) {
      for (const msg of historialChat) {
        mensajesParaGroq.push({
          role: msg.rol === "user" ? "user" : "assistant",
          content: msg.contenido,
        });
      }
    }

    // Agregar el mensaje actual del usuario
    mensajesParaGroq.push({
      role: "user",
      content: mensajeUsuario,
    });

    // Llamar a Groq
    const respuesta = await client.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...mensajesParaGroq,
      ],
      model: MODELO,
      temperature: 0.7,
      max_tokens: 1024,
    });

    const respuestaTexto =
      respuesta.choices?.[0]?.message?.content ||
      "No pude generar una respuesta.";
    return respuestaTexto;
  } catch (error) {
    console.error("[groq-chat] Error al responder pregunta:", error?.message || error);
    return `Lo siento, ocurrió un error al procesar tu pregunta. Por favor intenta de nuevo. Error: ${
      error?.message || "desconocido"
    }`;
  }
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
  const parametrosPrincipales = [
    "ph",
    "materia_organica",
    "conductividad_electrica",
    "nitrogeno",
    "fosforo",
    "potasio",
  ];
  for (const clave of parametrosPrincipales) {
    const param = p[clave];
    if (param) {
      texto += `- ${clave.toUpperCase()}: ${param.valor} ${
        param.unidad || ""
      } (${param.clasificacion || "sin clasificación"})\n`;
    }
  }

  return texto;
}
