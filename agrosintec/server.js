// server.js
// Fase 1: API Express para extraer y guardar analisis de suelo.

import "dotenv/config";
import express from "express";
import cors from "cors";

import { extraerAnalisisSuelo, analizarHoja } from "./gemini.js";
import { guardarSuelo, leerSuelo } from "./db.js";

const app = express();
const PORT = process.env.PORT || 3000;

// CORS habilitado para el frontend Vite.
app.use(cors({ origin: "http://localhost:5173" }));

// Las imagenes en base64 son grandes -> subimos el limite del body.
app.use(express.json({ limit: "20mb" }));

// Aviso si falta la API key (no rompe el arranque, pero el demo fallara al extraer).
if (!process.env.GEMINI_API_KEY) {
  console.warn("[server] AVISO: falta GEMINI_API_KEY en .env. La extraccion devolvera fallback.");
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
  const { agricultor_id, imagen_base64 } = req.body || {};

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

  // 2) analizarHoja calcula factores limitantes del suelo y los inyecta en el prompt.
  //    Ya trae try/catch + fallback, asi que siempre resuelve con estructura valida.
  const resultado = await analizarHoja(base64, mimeType, perfilSuelo);

  return res.json(resultado);
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

app.listen(PORT, () => {
  console.log(`[server] Backend Fase 1+2 escuchando en http://localhost:${PORT}`);
});
