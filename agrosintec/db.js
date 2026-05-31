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

/**
 * Guarda un diagnostico de hoja en el historial del agricultor (mas reciente primero).
 * @param {string} agricultor_id
 * @param {object} diagnostico - resultado de la Fase 2 (se le agrega `fecha`).
 * @returns {Promise<object>} el diagnostico guardado (con fecha).
 */
export async function guardarDiagnostico(agricultor_id, diagnostico) {
  const db = await leerDB();
  if (!db.agricultores[agricultor_id]) db.agricultores[agricultor_id] = {};
  if (!Array.isArray(db.agricultores[agricultor_id].diagnosticos)) {
    db.agricultores[agricultor_id].diagnosticos = [];
  }
  const registro = { ...diagnostico, fecha: new Date().toISOString() };
  db.agricultores[agricultor_id].diagnosticos.unshift(registro);
  // Tope para no inflar el json (demo): solo los ultimos 20.
  db.agricultores[agricultor_id].diagnosticos =
    db.agricultores[agricultor_id].diagnosticos.slice(0, 20);
  await escribirDB(db);
  return registro;
}

/**
 * Lee el historial de diagnosticos de hoja de un agricultor (mas reciente primero).
 * @param {string} agricultor_id
 * @returns {Promise<object[]>}
 */
export async function leerDiagnosticos(agricultor_id) {
  const db = await leerDB();
  return db.agricultores[agricultor_id]?.diagnosticos || [];
}
  /**
   * Guarda un mensaje de chat en el historial del agricultor.
   * @param {string} agricultor_id
   * @param {string} rol - "user" o "assistant"
   * @param {string} contenido - el mensaje
   * @returns {Promise<object>} el mensaje guardado con timestamp
   */
  export async function guardarMensajeChat(agricultor_id, rol, contenido) {
    const db = await leerDB();
    if (!db.agricultores[agricultor_id]) db.agricultores[agricultor_id] = {};
    if (!Array.isArray(db.agricultores[agricultor_id].chat)) {
      db.agricultores[agricultor_id].chat = [];
    }
    const mensaje = {
      rol,
      contenido,
      timestamp: new Date().toISOString(),
    };
    db.agricultores[agricultor_id].chat.push(mensaje);
    // Limitar a los últimos 50 mensajes para no inflar el JSON
    db.agricultores[agricultor_id].chat = db.agricultores[agricultor_id].chat.slice(-50);
    await escribirDB(db);
    return mensaje;
  }

  /**
   * Lee el historial de chat de un agricultor.
   * @param {string} agricultor_id
   * @returns {Promise<object[]>} array de mensajes { rol, contenido, timestamp }
   */
  export async function leerHistorialChat(agricultor_id) {
    const db = await leerDB();
    return db.agricultores[agricultor_id]?.chat || [];
  }

  /**
   * Limpia el historial de chat de un agricultor.
   * @param {string} agricultor_id
   * @returns {Promise<void>}
   */
  export async function limpiarHistorialChat(agricultor_id) {
    const db = await leerDB();
    if (db.agricultores[agricultor_id]) {
      db.agricultores[agricultor_id].chat = [];
    }
    await escribirDB(db);
  }
