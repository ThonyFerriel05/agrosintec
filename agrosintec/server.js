// server.js
// Fase 1: API Express para extraer y guardar analisis de suelo.

import "dotenv/config";
import express from "express";
import cors from "cors";

import { extraerAnalisisSuelo, analizarHoja, chatSobreContexto } from "./gemini.js";
import {
  guardarSuelo,
  leerSuelo,
  guardarDiagnostico,
  leerDiagnosticos,
  guardarMensajeChat,
  leerHistorialChat,
  limpiarHistorialChat,
} from "./db.js";
import { calcularAmenazas } from "./riesgoFitosanitario.js";

const app = express();
const PORT = process.env.PORT || 3000;

// CORS para el frontend Vite.
// Origenes permitidos: se pueden definir en .env como CORS_ORIGIN (separados por coma).
// Por defecto, los puertos tipicos de Vite en local (5173 y 5174, por si salta de puerto).
const ORIGENES_PERMITIDOS = (process.env.CORS_ORIGIN ||
  "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Permite herramientas sin origin (curl, Postman) y los origenes de la lista.
      if (!origin || ORIGENES_PERMITIDOS.includes(origin)) {
        return callback(null, true);
      }
      // Origen no permitido: no mandamos el header allow-origin (el navegador lo
      // bloquea) sin lanzar error, para no ensuciar la consola del backend.
      console.warn(`[cors] Origen bloqueado: ${origin}`);
      return callback(null, false);
    },
  })
);

// Las imagenes en base64 son grandes -> subimos el limite del body.
app.use(express.json({ limit: "20mb" }));

// Aviso si faltan las API keys
if (!process.env.GEMINI_API_KEY) {
  console.warn("[server] AVISO: falta GEMINI_API_KEY en .env. La extraccion y chat devolvera fallback.");
}

/**
 * Quita el prefijo data URL (data:image/jpeg;base64,...) si viene, y
 * devuelve { base64, mimeType }.
 */
function parsearImagen(imagen_base64) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s.exec(imagen_base64);
  if (match) {
    return { mimeType: match[1], base64: match[2] };
  }
  // Sin prefijo: asumimos jpeg.
  return { mimeType: "image/jpeg", base64: imagen_base64 };
}

// POST /analizar-suelo  { agricultor_id, imagen_base64 }
app.post("/analizar-suelo", async (req, res) => {
  const { agricultor_id, imagen_base64 } = req.body || {};

  if (!agricultor_id) {
    return res.status(400).json({ error: "Falta agricultor_id." });
  }
  if (!imagen_base64) {
    return res.status(400).json({ error: "Falta imagen_base64." });
  }

  const { base64, mimeType } = parsearImagen(imagen_base64);

  // gemini.js ya tiene try/catch + fallback, asi que siempre resuelve con estructura valida.
  const analisis = await extraerAnalisisSuelo(base64, mimeType, agricultor_id);

  await guardarSuelo(agricultor_id, analisis);

  return res.json(analisis);
});

// POST /analizar-hoja  { agricultor_id, imagen_base64 }
// FASE 2: el CRUCE. La hoja DEPENDE del perfil de suelo guardado.
app.post("/analizar-hoja", async (req, res) => {
  const { agricultor_id, imagen_base64, cultivo, clima } = req.body || {};

  if (!agricultor_id) {
    return res.status(400).json({ error: "Falta agricultor_id." });
  }
  if (!imagen_base64) {
    return res.status(400).json({ error: "Falta imagen_base64." });
  }

  // 1) Se lee PRIMERO el perfil de suelo guardado (reusa la logica de la Fase 1).
  const perfilSuelo = await leerSuelo(agricultor_id);

  // Si no hay suelo, no se puede cruzar: la hoja depende del suelo.
  if (!perfilSuelo) {
    return res.status(409).json({
      error: `No hay analisis de suelo guardado para "${agricultor_id}". Analiza el suelo primero con POST /analizar-suelo: el diagnostico de hoja depende del perfil de suelo.`,
    });
  }

  const { base64, mimeType } = parsearImagen(imagen_base64);

  // 2) analizarHoja calcula factores limitantes + prior de amenazas (cultivo/clima)
  //    y los inyecta en el prompt. Ya trae try/catch + fallback, asi que siempre
  //    resuelve con estructura valida.
  const resultado = await analizarHoja(base64, mimeType, perfilSuelo, cultivo, clima);

  // 3) Se guarda en el historial del agricultor (con cultivo/clima del contexto).
  await guardarDiagnostico(agricultor_id, { ...resultado, cultivo, clima });

  return res.json(resultado);
});

// POST /amenazas-probables  { agricultor_id, cultivo, clima }
// Devuelve el PRIOR (amenazas probables) SIN llamar a Gemini: pura logica
// determinista. Sirve para mostrar en vivo lo que el sistema "espera" antes
// de subir la foto de la hoja.
app.post("/amenazas-probables", async (req, res) => {
  const { agricultor_id, cultivo, clima } = req.body || {};
  if (!agricultor_id) {
    return res.status(400).json({ error: "Falta agricultor_id." });
  }
  const perfilSuelo = await leerSuelo(agricultor_id);
  if (!perfilSuelo) {
    return res.status(409).json({ error: `No hay analisis de suelo para "${agricultor_id}".` });
  }
  return res.json(calcularAmenazas(perfilSuelo, cultivo, clima));
});

// GET /diagnosticos/:agricultor_id  -> historial de diagnosticos de hoja
app.get("/diagnosticos/:agricultor_id", async (req, res) => {
  const { agricultor_id } = req.params;
  const diagnosticos = await leerDiagnosticos(agricultor_id);
  return res.json(diagnosticos);
});

// GET /suelo/:agricultor_id  -> leer lo guardado
app.get("/suelo/:agricultor_id", async (req, res) => {
  const { agricultor_id } = req.params;
  const suelo = await leerSuelo(agricultor_id);

  if (!suelo) {
    return res.status(404).json({ error: `No hay analisis de suelo para ${agricultor_id}.` });
  }
  return res.json(suelo);
});

// =====================================================================
// ENDPOINTS DE CHAT CONTEXTUALIZADO
// =====================================================================

// POST /chat  { agricultor_id, mensaje }
// Responde una pregunta sobre el contexto del suelo del agricultor
app.post("/chat", async (req, res) => {
  const { agricultor_id, mensaje } = req.body || {};

  if (!agricultor_id) {
    return res.status(400).json({ error: "Falta agricultor_id." });
  }
  if (!mensaje || typeof mensaje !== "string") {
    return res.status(400).json({ error: "Falta mensaje (debe ser un string)." });
  }

  try {
    // 1) Leer el suelo del agricultor (contexto)
    const perfilSuelo = await leerSuelo(agricultor_id);
    if (!perfilSuelo) {
      return res.status(409).json({
        error: `No hay análisis de suelo para "${agricultor_id}". Por favor, analiza el suelo primero.`,
      });
    }

    // 2) Leer el historial de chat anterior
    const historial = await leerHistorialChat(agricultor_id);

    // 3) Llamar a Gemini con el contexto (con fallback inteligente si falla)
    const respuesta = await chatSobreContexto(mensaje, perfilSuelo, historial);

    // 4) Guardar el mensaje del usuario y la respuesta en el historial
    await guardarMensajeChat(agricultor_id, "user", mensaje);
    await guardarMensajeChat(agricultor_id, "assistant", respuesta);

    // 5) Devolver la respuesta
    return res.json({
      agricultor_id,
      mensaje_usuario: mensaje,
      respuesta,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[chat] Error:", error?.message || error);
    return res.status(500).json({
      error: "Error al procesar el chat.",
      detalle: error?.message || "desconocido",
    });
  }
});

// GET /chat/:agricultor_id  -> leer historial de chat
app.get("/chat/:agricultor_id", async (req, res) => {
  const { agricultor_id } = req.params;
  try {
    const historial = await leerHistorialChat(agricultor_id);
    return res.json({
      agricultor_id,
      historial,
    });
  } catch (error) {
    console.error("[chat-historial] Error:", error?.message || error);
    return res.status(500).json({
      error: "Error al leer el historial.",
      detalle: error?.message || "desconocido",
    });
  }
});

// DELETE /chat/:agricultor_id  -> limpiar historial de chat
app.delete("/chat/:agricultor_id", async (req, res) => {
  const { agricultor_id } = req.params;
  try {
    await limpiarHistorialChat(agricultor_id);
    return res.json({
      message: `Historial de chat del agricultor "${agricultor_id}" eliminado.`,
    });
  } catch (error) {
    console.error("[chat-limpiar] Error:", error?.message || error);
    return res.status(500).json({
      error: "Error al limpiar el historial.",
      detalle: error?.message || "desconocido",
    });
  }
});

// =====================================================================
// HEALTH CHECK - Verificar conexión a Groq
// =====================================================================

app.get("/health/groq", async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({
        status: "error",
        message: "GROQ_API_KEY no configurada en .env",
        detalle: "Asegúrate de tener la variable GROQ_API_KEY en tu archivo .env",
      });
    }

    // Intentar hacer una llamada simple a Groq
    const Groq = (await import("groq-sdk")).default;
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const prueba = await client.chat.completions.create({
      messages: [{ role: "user", content: "Hola" }],
      model: "mixtral-8x7b-32768",
      max_tokens: 10,
    });

    return res.json({
      status: "ok",
      message: "Conexión a Groq verificada exitosamente",
      modelo: "mixtral-8x7b-32768",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[health-groq] Error:", error?.message || error);
    return res.status(503).json({
      status: "error",
      message: "No se pudo conectar a Groq",
      error: error?.message || error?.status || "desconocido",
      troubleshoot: "1. Verifica tu GROQ_API_KEY en .env\n2. Intenta obtener una nueva key en https://console.groq.com/keys\n3. Reinicia el backend",
    });
  }
});

// GET /health - Health check general
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    backend: "AgroSintec Fase 1+2+Chat (Groq)",
    timestamp: new Date().toISOString(),
    endpoints: {
      groq_check: "/health/groq",
      chat: "/chat (POST)",
      chat_historial: "/chat/:agricultor_id (GET)",
    },
  });
});

app.listen(PORT, () => {
  console.log(`[server] Backend Fase 1+2+Chat (Gemini con fallback) escuchando en http://localhost:${PORT}`);
});
