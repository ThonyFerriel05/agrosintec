// riesgoFitosanitario.js
// PASO INTERMEDIO (determinista): cierra la brecha de Gemini Vision.
//
// Antes de mirar la hoja, el CODIGO calcula que plagas/hongos/bacterias son
// PLAUSIBLES para ESTE suelo + ESTE cultivo + ESTE clima. Eso es un "prior":
// una lista corta de candidatos realistas que se inyecta en el prompt para que
// Gemini compare lo que ve contra algo concreto, en vez de alucinar enfermedades
// al azar.
//
// HONESTO: los pesos son HEURISTICOS (reglas de experto), NO estadistica
// aprendida de datos reales. La estructura permite, el dia que haya un dataset
// {suelo, clima, enfermedad observada}, reemplazar los pesos por frecuencias
// reales sin tocar el resto del sistema.

// Texto normalizado: minusculas y sin acentos.
function norm(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

// Catalogo de amenazas (metadata para mostrar y para el prompt).
const AMENAZAS = {
  pudricion_raiz: { nombre: "Pudrición de raíz", tipo: "hongo", emoji: "🍄" },
  mildiu:         { nombre: "Mildiu (mildeu velloso)", tipo: "hongo", emoji: "🌫️" },
  oidio:          { nombre: "Oídio (cenicilla)", tipo: "hongo", emoji: "⚪" },
  antracnosis:    { nombre: "Antracnosis", tipo: "hongo", emoji: "🟤" },
  roya:           { nombre: "Roya", tipo: "hongo", emoji: "🟠" },
  tizon:          { nombre: "Tizón (temprano/tardío)", tipo: "hongo", emoji: "🍂" },
  sigatoka:       { nombre: "Sigatoka (raya negra)", tipo: "hongo", emoji: "🍌" },
  bacteriosis:    { nombre: "Bacteriosis / mancha bacteriana", tipo: "bacteria", emoji: "🦠" },
  nematodos:      { nombre: "Nematodos", tipo: "plaga", emoji: "🪱" },
  barrenador:     { nombre: "Barrenador del tallo", tipo: "plaga", emoji: "🐛" },
  pulgon:         { nombre: "Pulgón / áfidos", tipo: "plaga", emoji: "🦟" },
  acaros:         { nombre: "Ácaros", tipo: "plaga", emoji: "🕷️" },
};

// Climas soportados -> ejes (temperatura x humedad) + etiqueta legible.
const CLIMAS = {
  frio_humedo:   { temp: "frio",     humedad: "humedo", label: "frío y húmedo" },
  frio_seco:     { temp: "frio",     humedad: "seco",   label: "frío y seco" },
  templado:      { temp: "templado", humedad: "normal", label: "templado" },
  calido_humedo: { temp: "calido",   humedad: "humedo", label: "caluroso y húmedo" },
  calido_seco:   { temp: "calido",   humedad: "seco",   label: "caluroso y seco" },
};

// Reglas: si `cuando(s)` es verdadero, suma `peso` a `amenaza` con su `razon`.
// (s = señales derivadas del suelo + cultivo + clima.)
const REGLAS = [
  // ---- Humedad y textura (hongos de suelo/follaje) ----
  { amenaza: "pudricion_raiz", peso: 0.4,  razon: "suelo que retiene mucha humedad", cuando: (s) => s.retencionHumedad === "alta" },
  { amenaza: "pudricion_raiz", peso: 0.3,  razon: "clima húmedo", cuando: (s) => s.humedad === "humedo" },
  { amenaza: "mildiu",         peso: 0.35, razon: "humedad ambiental alta", cuando: (s) => s.humedad === "humedo" },
  { amenaza: "antracnosis",    peso: 0.25, razon: "humedad alta", cuando: (s) => s.humedad === "humedo" },
  { amenaza: "bacteriosis",    peso: 0.25, razon: "humedad alta favorece bacterias", cuando: (s) => s.humedad === "humedo" },
  { amenaza: "tizon",          peso: 0.3,  razon: "humedad alta", cuando: (s) => s.humedad === "humedo" },
  { amenaza: "sigatoka",       peso: 0.2,  razon: "humedad alta", cuando: (s) => s.humedad === "humedo" },

  // ---- Temperatura combinada con humedad ----
  { amenaza: "tizon",       peso: 0.3,  razon: "frío y húmedo es ideal para tizón", cuando: (s) => s.temp === "frio" && s.humedad === "humedo" },
  { amenaza: "mildiu",      peso: 0.2,  razon: "frescas y húmedas", cuando: (s) => s.temp === "frio" && s.humedad === "humedo" },
  { amenaza: "bacteriosis", peso: 0.3,  razon: "calor + humedad dispara bacteriosis", cuando: (s) => s.temp === "calido" && s.humedad === "humedo" },
  { amenaza: "antracnosis", peso: 0.3,  razon: "calor húmedo", cuando: (s) => s.temp === "calido" && s.humedad === "humedo" },
  { amenaza: "barrenador",  peso: 0.2,  razon: "calor favorece insectos", cuando: (s) => s.temp === "calido" },
  { amenaza: "oidio",       peso: 0.25, razon: "ambiente seco/templado", cuando: (s) => s.humedad === "seco" },
  { amenaza: "acaros",      peso: 0.35, razon: "calor seco dispara ácaros", cuando: (s) => s.temp === "calido" && s.humedad === "seco" },
  { amenaza: "roya",        peso: 0.2,  razon: "temperatura templada", cuando: (s) => s.temp === "templado" },

  // ---- Señales del SUELO (planta debil = mas susceptible) ----
  { amenaza: "pudricion_raiz", peso: 0.2,  razon: "raíces estresadas por suelo ácido", cuando: (s) => s.phAcido },
  { amenaza: "mildiu",         peso: 0.15, razon: "potasio bajo debilita la planta", cuando: (s) => s.kBajo },
  { amenaza: "bacteriosis",    peso: 0.15, razon: "potasio bajo = paredes celulares débiles", cuando: (s) => s.kBajo },
  { amenaza: "roya",           peso: 0.1,  razon: "potasio bajo reduce defensas", cuando: (s) => s.kBajo },
  { amenaza: "pulgon",         peso: 0.3,  razon: "exceso de nitrógeno genera tejido tierno", cuando: (s) => s.nAlto },
  { amenaza: "oidio",          peso: 0.2,  razon: "exceso de nitrógeno", cuando: (s) => s.nAlto },
  { amenaza: "nematodos",      peso: 0.35, razon: "suelo arenoso favorece nematodos", cuando: (s) => s.arenoso },

  // ---- Afinidad por CULTIVO ----
  { amenaza: "barrenador",     peso: 0.4,  razon: "el arroz es propenso al barrenador", cuando: (s) => s.cultivo === "arroz" },
  { amenaza: "pudricion_raiz", peso: 0.2,  razon: "arroz en suelo húmedo", cuando: (s) => s.cultivo === "arroz" },
  { amenaza: "bacteriosis",    peso: 0.25, razon: "el arroz sufre añublo bacteriano", cuando: (s) => s.cultivo === "arroz" },
  { amenaza: "roya",           peso: 0.4,  razon: "la soya es muy propensa a roya asiática", cuando: (s) => s.cultivo === "soya" },
  { amenaza: "antracnosis",    peso: 0.25, razon: "la soya sufre antracnosis", cuando: (s) => s.cultivo === "soya" },
  { amenaza: "nematodos",      peso: 0.2,  razon: "la soya es hospedera de nematodos", cuando: (s) => s.cultivo === "soya" },
  { amenaza: "barrenador",     peso: 0.4,  razon: "el maíz es atacado por barrenador", cuando: (s) => s.cultivo === "maiz" },
  { amenaza: "tizon",          peso: 0.25, razon: "el maíz sufre tizón foliar", cuando: (s) => s.cultivo === "maiz" },
  { amenaza: "roya",           peso: 0.2,  razon: "roya común del maíz", cuando: (s) => s.cultivo === "maiz" },
  { amenaza: "tizon",          peso: 0.45, razon: "la papa es muy sensible al tizón tardío", cuando: (s) => s.cultivo === "papa" },
  { amenaza: "nematodos",      peso: 0.25, razon: "nematodo del quiste en papa", cuando: (s) => s.cultivo === "papa" },
  { amenaza: "tizon",          peso: 0.35, razon: "el tomate sufre tizón", cuando: (s) => s.cultivo === "tomate" },
  { amenaza: "oidio",          peso: 0.25, razon: "oídio frecuente en tomate", cuando: (s) => s.cultivo === "tomate" },
  { amenaza: "bacteriosis",    peso: 0.25, razon: "mancha bacteriana en tomate", cuando: (s) => s.cultivo === "tomate" },
  { amenaza: "roya",           peso: 0.45, razon: "el café es muy sensible a la roya", cuando: (s) => s.cultivo === "cafe" },
  { amenaza: "antracnosis",    peso: 0.3,  razon: "antracnosis (ojo de gallo/CBD) en café", cuando: (s) => s.cultivo === "cafe" },
  { amenaza: "roya",           peso: 0.35, razon: "el frijol sufre roya", cuando: (s) => s.cultivo === "frijol" },
  { amenaza: "antracnosis",    peso: 0.25, razon: "antracnosis del frijol", cuando: (s) => s.cultivo === "frijol" },
  { amenaza: "sigatoka",       peso: 0.45, razon: "el plátano/banano sufre sigatoka", cuando: (s) => s.cultivo === "platano" },
];

// Deriva las señales a partir del perfil de suelo, el cultivo y el clima.
function derivarSenales(perfilSuelo, cultivo, claveClima) {
  const p = perfilSuelo?.parametros || {};
  const t = perfilSuelo?.textura || {};
  const clima = CLIMAS[norm(claveClima)] || CLIMAS.templado;

  const clasif = (k) => norm(p[k]?.clasificacion);
  const enBajos = (k) => ["bajo", "muy bajo"].includes(clasif(k));
  const enAltos = (k) => ["alto", "muy alto"].includes(clasif(k));
  const num = (v) => {
    const n = parseFloat(String(v ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  // Retención de humedad por textura.
  const arcilla = num(t.arcilla_pct);
  const arena = num(t.arena_pct);
  const clase = norm(t.clase_textural);
  let retencionHumedad = "media";
  if ((arcilla !== null && arcilla >= 35) || clase.includes("arcillos")) retencionHumedad = "alta";
  else if ((arena !== null && arena >= 60) || clase.includes("arenos")) retencionHumedad = "baja";

  const phVal = num(p.ph?.valor);

  return {
    cultivo: norm(cultivo) || "general",
    temp: clima.temp,
    humedad: clima.humedad,
    retencionHumedad,
    arenoso: retencionHumedad === "baja",
    phAcido: clasif("ph").includes("acido") || (phVal !== null && phVal < 5.5),
    kBajo: enBajos("potasio") || clasif("k_pct").includes("bajo"),
    nAlto: enAltos("nitrogeno"),
  };
}

/**
 * Calcula el prior fitosanitario: amenazas probables ordenadas por peso.
 * @param {object} perfilSuelo - perfil de suelo guardado.
 * @param {string} cultivo - ej "arroz", "soya", "maiz"... (o "general").
 * @param {string} claveClima - una clave de CLIMAS (ej "calido_humedo").
 * @returns {{ cultivo: string, clima: string, climaLabel: string, amenazas: object[] }}
 */
export function calcularAmenazas(perfilSuelo, cultivo = "general", claveClima = "templado") {
  const s = derivarSenales(perfilSuelo, cultivo, claveClima);
  const clima = CLIMAS[norm(claveClima)] || CLIMAS.templado;

  // Acumula peso y razones por amenaza.
  const acum = {};
  for (const regla of REGLAS) {
    if (!regla.cuando(s)) continue;
    if (!acum[regla.amenaza]) acum[regla.amenaza] = { peso: 0, razones: [] };
    acum[regla.amenaza].peso += regla.peso;
    acum[regla.amenaza].razones.push(regla.razon);
  }

  const amenazas = Object.entries(acum)
    .map(([id, { peso, razones }]) => ({
      id,
      ...AMENAZAS[id],
      probabilidad: Math.min(0.95, Math.round(peso * 100) / 100),
      razones,
    }))
    .filter((a) => a.probabilidad >= 0.25) // descarta ruido de baja señal
    .sort((a, b) => b.probabilidad - a.probabilidad)
    .slice(0, 5); // top 5: lista corta, justo para anclar a Gemini

  return { cultivo: s.cultivo, clima: norm(claveClima), climaLabel: clima.label, amenazas };
}
