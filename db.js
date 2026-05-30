// db.js
// "Base de datos" en archivo JSON (db.json).
// Estructura: { "agricultores": { "<agricultor_id>": { suelo: {...} } } }

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "db.json");

const DB_VACIA = { agricultores: {} };

async function leerDB() {
  if (!existsSync(DB_PATH)) {
    return structuredClone(DB_VACIA);
  }
  try {
    const contenido = await readFile(DB_PATH, "utf-8");
    const datos = JSON.parse(contenido);
    if (!datos.agricultores) datos.agricultores = {};
    return datos;
  } catch (error) {
    console.error("[db] db.json corrupto o ilegible, se reinicia:", error?.message || error);
    return structuredClone(DB_VACIA);
  }
}

async function escribirDB(datos) {
  await writeFile(DB_PATH, JSON.stringify(datos, null, 2), "utf-8");
}

/**
 * Guarda el analisis de suelo de un agricultor.
 * @param {string} agricultor_id
 * @param {object} analisisSuelo - JSON { agricultor_id, parametros, textura }
 */
export async function guardarSuelo(agricultor_id, analisisSuelo) {
  const db = await leerDB();
  if (!db.agricultores[agricultor_id]) {
    db.agricultores[agricultor_id] = {};
  }
  db.agricultores[agricultor_id].suelo = analisisSuelo;
  await escribirDB(db);
  return analisisSuelo;
}

/**
 * Lee el analisis de suelo guardado de un agricultor.
 * @param {string} agricultor_id
 * @returns {Promise<object|null>}
 */
export async function leerSuelo(agricultor_id) {
  const db = await leerDB();
  const agricultor = db.agricultores[agricultor_id];
  if (!agricultor || !agricultor.suelo) return null;
  return agricultor.suelo;
}
