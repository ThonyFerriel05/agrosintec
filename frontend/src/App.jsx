import { useState } from 'react';
import './App.css';
import './App.fase2.css';

// URL del backend Express. Viene de frontend/.env (VITE_API_URL).
// Fallback a localhost:3000 por si no esta definida.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// Diccionario de nombres legibles, descripciones e iconos para los parámetros del suelo
const NOMBRES_PARAMETROS = {
  ph: { nombre: 'pH (Acidez)', icono: '🧪', desc: 'Nivel de acidez o alcalinidad. Influye en la disponibilidad de nutrientes.' },
  materia_organica: { nombre: 'Materia Orgánica (MO)', icono: '🍂', desc: 'Indica la fertilidad natural y capacidad de retener agua.' },
  conductividad_electrica: { nombre: 'Conductividad Eléctrica (CE)', icono: '⚡', desc: 'Indica la concentración de sales solubles en el suelo.' },
  nitrogeno: { nombre: 'Nitrógeno (N)', icono: '🌿', desc: 'Esencial para el crecimiento vegetativo y desarrollo foliar.' },
  fosforo: { nombre: 'Fósforo (P)', icono: '🌾', desc: 'Crucial para el desarrollo de raíces y floración.' },
  potasio: { nombre: 'Potasio (K)', icono: '🥔', desc: 'Regula el agua y mejora la resistencia a plagas y sequías.' },
  calcio: { nombre: 'Calcio (Ca)', icono: '🦴', desc: 'Vital para la estructura celular de la planta y del suelo.' },
  magnesio: { nombre: 'Magnesio (Mg)', icono: '☀️', desc: 'Componente central de la clorofila, clave para la fotosíntesis.' },
  sodio: { nombre: 'Sodio (Na)', icono: '🧂', desc: 'Elemento no esencial en exceso, puede causar problemas de salinidad.' },
  azufre: { nombre: 'Azufre (S)', icono: '🔥', desc: 'Necesario para la formación de proteínas y clorofila.' },
  silicio: { nombre: 'Silicio (Si)', icono: '💎', desc: 'Fortalece las paredes celulares, previniendo estrés biótico.' },
  aluminio: { nombre: 'Aluminio (Al)', icono: '⚠️', desc: 'Elemento tóxico para las raíces en suelos muy ácidos.' },
  h_mas_al: { nombre: 'Acidez Total (H + Al)', icono: '🛡️', desc: 'Suma de iones de hidrógeno y aluminio en el complejo arcillo-húmico.' },
  tbi: { nombre: 'Bases Intercambiables (TBI)', icono: '🔋', desc: 'Suma de los cationes básicos de calcio, magnesio, potasio y sodio.' },
  cic: { nombre: 'Capacidad de Intercambio (CIC)', icono: '📦', desc: 'Medida del almacenamiento total de nutrientes que tiene el suelo.' },
  t: { nombre: 'CIC Efectiva (T)', icono: '⚙️', desc: 'Capacidad de intercambio medida a la acidez natural del suelo.' },
  sb: { nombre: 'Saturación de Bases (SB)', icono: '📈', desc: 'Porcentaje de la CIC ocupado por nutrientes básicos recomendables.' },
  al_pct: { nombre: 'Saturación de Aluminio (%)', icono: '❌', desc: 'Porcentaje de la CIC ocupado por aluminio tóxico.' },
  ca_pct: { nombre: 'Saturación de Calcio (%)', icono: '⚪', desc: 'Porcentaje óptimo sugerido entre 60% y 80%.' },
  mg_pct: { nombre: 'Saturación de Magnesio (%)', icono: '🟢', desc: 'Porcentaje óptimo sugerido entre 10% y 20%.' },
  k_pct: { nombre: 'Saturación de Potasio (%)', icono: '🟣', desc: 'Porcentaje óptimo sugerido entre 2% y 7%.' },
  na_pct: { nombre: 'Saturación de Sodio (%)', icono: '🔴', desc: 'Valores superiores a 5% pueden deteriorar la física del suelo.' },
  hierro: { nombre: 'Hierro (Fe)', icono: '🧱', desc: 'Micronutriente clave para la síntesis de clorofila.' },
  manganeso: { nombre: 'Manganeso (Mn)', icono: '🎨', desc: 'Participa en la fotólisis del agua durante la fotosíntesis.' },
  zinc: { nombre: 'Zinc (Zn)', icono: '🧬', desc: 'Esencial para la síntesis de hormonas reguladoras de crecimiento.' },
  cobre: { nombre: 'Cobre (Cu)', icono: '🪙', desc: 'Activa enzimas e interviene en la síntesis de lignina.' },
  boro: { nombre: 'Boro (B)', icono: '🎈', desc: 'Vital para la división celular, polinización y cuajado de frutos.' }
};

// IDs de prueba prácticos para el usuario
const AGRICULTORES_DEMO = [
  { id: 'AGRO-2026-Norte', label: 'Don Pedro - Parcela Norte' },
  { id: 'AGRO-2026-Sur', label: 'Finca El Tablazo' },
  { id: 'DEMO-SUELO-ACIDO', label: 'Zona Andina (Suelo Ácido)' }
];

// Cultivos soportados por el prior fitosanitario (deben coincidir con riesgoFitosanitario.js).
const CULTIVOS = [
  { id: 'general', label: 'General / Otro' },
  { id: 'arroz', label: 'Arroz' },
  { id: 'soya', label: 'Soya' },
  { id: 'maiz', label: 'Maíz' },
  { id: 'papa', label: 'Papa' },
  { id: 'tomate', label: 'Tomate' },
  { id: 'cafe', label: 'Café' },
  { id: 'frijol', label: 'Frijol' },
  { id: 'platano', label: 'Plátano / Banano' }
];

// Clima / temporada (deben coincidir con las claves de CLIMAS en riesgoFitosanitario.js).
const CLIMAS = [
  { id: 'templado', label: 'Templado' },
  { id: 'frio_humedo', label: 'Frío y húmedo' },
  { id: 'frio_seco', label: 'Frío y seco' },
  { id: 'calido_humedo', label: 'Caluroso y húmedo' },
  { id: 'calido_seco', label: 'Caluroso y seco' }
];

// Lee un File y devuelve su contenido como Data URL (base64) por callback.
function leerArchivoComoDataURL(file, onResult, onError) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    onError?.('Por favor, selecciona únicamente un archivo de imagen (PNG, JPG, JPEG).');
    return;
  }
  const reader = new FileReader();
  reader.onloadend = () => onResult(reader.result, URL.createObjectURL(file));
  reader.readAsDataURL(file);
}

function App() {
  // ---- Estado COMÚN ----
  const [agricultorId, setAgricultorId] = useState('');
  const [pasoActivo, setPasoActivo] = useState('suelo'); // 'suelo' | 'hoja'

  // ---- Estado PASO 1: SUELO ----
  const [imagenBase64, setImageBase64] = useState('');
  const [imagenPreview, setImagePreview] = useState('');
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [tabActivo, setTabActivo] = useState('resumen');
  const [detalleTecnicoAbierto, setDetalleTecnicoAbierto] = useState(false); // tabs técnicos plegados por defecto

  // ---- Estado PASO 2: HOJA ----
  const [imagenHoja, setImagenHoja] = useState('');
  const [imagenHojaPreview, setImagenHojaPreview] = useState('');
  const [cargandoHoja, setCargandoHoja] = useState(false);
  const [diagnostico, setDiagnostico] = useState(null);
  const [errorHoja, setErrorHoja] = useState('');
  const [dragActiveHoja, setDragActiveHoja] = useState(false);
  const [cultivoHoja, setCultivoHoja] = useState('general'); // contexto para el prior de amenazas
  const [climaHoja, setClimaHoja] = useState('templado');

  // El Paso 2 SOLO se habilita cuando hay un perfil de suelo cargado para el agricultor.
  const perfilSueloListo = !!(resultado && resultado.parametros);

  // =================== PASO 1: SUELO ===================
  const procesarArchivo = (file) => {
    leerArchivoComoDataURL(
      file,
      (dataUrl, preview) => { setError(''); setImagePreview(preview); setImageBase64(dataUrl); },
      (msg) => setError(msg)
    );
  };
  const handleFileChange = (e) => procesarArchivo(e.target.files[0]);
  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) procesarArchivo(e.dataTransfer.files[0]);
  };

  const analizarSuelo = async () => {
    if (!agricultorId.trim()) { setError('Debes ingresar o seleccionar un ID de agricultor.'); return; }
    if (!imagenBase64) { setError('Debes subir o arrastrar la imagen de un reporte de laboratorio.'); return; }

    setCargando(true); setError(''); setResultado(null);
    try {
      const response = await fetch(`${API_URL}/analizar-suelo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agricultor_id: agricultorId.trim(), imagen_base64: imagenBase64 })
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Error en el servidor de análisis.');
      }
      const datos = await response.json();
      setResultado(datos);
      setTabActivo('resumen');
    } catch (err) {
      console.error(err);
      setError(`No se pudo completar el análisis: ${err.message}. Asegúrate de tener el backend corriendo en ${API_URL}.`);
    } finally {
      setCargando(false);
    }
  };

  const cargarHistorico = async () => {
    if (!agricultorId.trim()) { setError('Debes ingresar o seleccionar un ID de agricultor para buscar su historial.'); return; }
    setCargando(true); setError(''); setResultado(null);
    try {
      const response = await fetch(`${API_URL}/suelo/${encodeURIComponent(agricultorId.trim())}`);
      if (response.status === 404) {
        throw new Error(`No se encontró ningún reporte guardado para el agricultor "${agricultorId.trim()}". Realiza un nuevo análisis primero.`);
      }
      if (!response.ok) throw new Error('Error al consultar el historial en el servidor.');
      const datos = await response.json();
      setResultado(datos);
      setTabActivo('resumen');
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  // =================== PASO 2: HOJA ===================
  const procesarArchivoHoja = (file) => {
    leerArchivoComoDataURL(
      file,
      (dataUrl, preview) => { setErrorHoja(''); setImagenHojaPreview(preview); setImagenHoja(dataUrl); },
      (msg) => setErrorHoja(msg)
    );
  };
  const handleFileChangeHoja = (e) => procesarArchivoHoja(e.target.files[0]);
  const handleDragHoja = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActiveHoja(true);
    else if (e.type === 'dragleave') setDragActiveHoja(false);
  };
  const handleDropHoja = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragActiveHoja(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) procesarArchivoHoja(e.dataTransfer.files[0]);
  };

  const analizarHoja = async () => {
    if (!perfilSueloListo) { setErrorHoja('Primero completa el Paso 1: el diagnóstico de hoja depende del perfil de suelo.'); return; }
    if (!imagenHoja) { setErrorHoja('Sube o arrastra la foto de la hoja / planta.'); return; }

    setCargandoHoja(true); setErrorHoja(''); setDiagnostico(null);
    try {
      const response = await fetch(`${API_URL}/analizar-hoja`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agricultor_id: agricultorId.trim(), imagen_base64: imagenHoja, cultivo: cultivoHoja, clima: climaHoja })
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Error en el servidor de detección.');
      }
      const datos = await response.json();
      setDiagnostico(datos);
    } catch (err) {
      console.error(err);
      setErrorHoja(`No se pudo completar la detección: ${err.message}. Asegúrate de tener el backend corriendo en ${API_URL}.`);
    } finally {
      setCargandoHoja(false);
    }
  };

  // =================== HELPERS DE PRESENTACIÓN (SUELO) ===================
  const obtenerClaseClasificacion = (clasificacion) => {
    if (!clasificacion) return 'badge-neutral';
    const c = clasificacion.toLowerCase();
    if (c.includes('muy bajo') || c.includes('muy acido') || c.includes('alcalino')) return 'badge-alert';
    if (c.includes('bajo') || c.includes('acido')) return 'badge-warning';
    if (c.includes('moderado') || c.includes('ligeramente') || c.includes('neutro')) return 'badge-success';
    if (c.includes('alto') || c.includes('adecuado') || c.includes('muy alto')) return 'badge-info';
    return 'badge-neutral';
  };

  const obtenerPorcentajeNutriente = (clasificacion) => {
    if (!clasificacion) return 0;
    const c = clasificacion.toLowerCase();
    if (c.includes('muy bajo') || c.includes('muy acido')) return 20;
    if (c.includes('bajo') || c.includes('acido')) return 45;
    if (c.includes('moderado') || c.includes('ligeramente') || c.includes('neutro')) return 70;
    if (c.includes('alto') || c.includes('adecuado')) return 90;
    if (c.includes('muy alto') || c.includes('alcalino')) return 100;
    return 0;
  };

  const filtrarNutrientes = (grupo) => {
    if (!resultado || !resultado.parametros) return [];
    const configuracion = {
      quimica: ['ph', 'materia_organica', 'conductividad_electrica'],
      macronutrientes: ['nitrogeno', 'fosforo', 'potasio', 'calcio', 'magnesio', 'sodio', 'azufre', 'silicio'],
      complejo: ['aluminio', 'h_mas_al', 'tbi', 'cic', 't'],
      saturaciones: ['sb', 'al_pct', 'ca_pct', 'mg_pct', 'k_pct', 'na_pct'],
      micronutrientes: ['hierro', 'manganeso', 'zinc', 'cobre', 'boro']
    };
    return Object.entries(resultado.parametros)
      .filter(([key]) => configuracion[grupo]?.includes(key))
      .map(([key, info]) => ({ key, valor: info.valor, unidad: info.unidad, clasificacion: info.clasificacion, ...NOMBRES_PARAMETROS[key] }));
  };

  // Riesgo -> clase de color para el badge del diagnóstico de hoja
  const claseRiesgo = (nivel) => {
    const n = (nivel || '').toLowerCase();
    if (n === 'alto') return 'badge-alert';
    if (n === 'medio') return 'badge-warning';
    if (n === 'bajo') return 'badge-success';
    return 'badge-neutral';
  };

  return (
    <div className="app-container">
      {/* Aurora Background Effects */}
      <div className="aurora-glow glow-1"></div>
      <div className="aurora-glow glow-2"></div>
      <div className="aurora-glow glow-3"></div>

      {/* Encabezado Principal */}
      <header className="app-header glass">
        <div className="logo-section">
          <div className="logo-icon animate-pulse">🌿</div>
          <div className="logo-text">
            <h1>AgroSintec</h1>
            <p>Asistencia agronómica con IA · Suelo + Detección en hoja (Gemini Vision)</p>
          </div>
        </div>
      </header>

      {/* STEPPER: flujo en dos pasos */}
      <nav className="stepper glass">
        <button
          type="button"
          className={`step-tab ${pasoActivo === 'suelo' ? 'active' : ''} ${perfilSueloListo ? 'done' : ''}`}
          onClick={() => setPasoActivo('suelo')}
        >
          <span className="step-num">{perfilSueloListo ? '✅' : '1'}</span>
          <span className="step-info">
            <strong>Análisis de Suelo</strong>
            <small>Reporte de laboratorio → base de datos</small>
          </span>
        </button>

        <span className="step-arrow">→</span>

        <button
          type="button"
          className={`step-tab ${pasoActivo === 'hoja' ? 'active' : ''} ${!perfilSueloListo ? 'locked' : ''}`}
          onClick={() => { if (perfilSueloListo) setPasoActivo('hoja'); }}
          disabled={!perfilSueloListo}
          title={!perfilSueloListo ? 'Completa primero el análisis de suelo' : 'Detección en hoja'}
        >
          <span className="step-num">{perfilSueloListo ? '2' : '🔒'}</span>
          <span className="step-info">
            <strong>Detección en Hoja</strong>
            <small>Foto de la planta → cruce con el suelo</small>
          </span>
        </button>
      </nav>

      {/* ============================ PASO 1: SUELO ============================ */}
      {pasoActivo === 'suelo' && (
      <main className="app-main">
        {/* Panel Izquierdo: Formulario de Control y Carga */}
        <section className="control-panel card glass">
          <div className="card-header border-glow">
            <h2>1. Configuración & Carga</h2>
            <p className="card-subtitle">Define el agricultor y carga el reporte de laboratorio</p>
          </div>

          <div className="form-group">
            <label htmlFor="agricultor-id-input">ID del Agricultor / Parcela</label>
            <div className="input-with-button">
              <input
                id="agricultor-id-input"
                type="text"
                value={agricultorId}
                onChange={(e) => setAgricultorId(e.target.value)}
                placeholder="Ej. DON-PEDRO-01"
              />
              <button
                type="button"
                className="btn btn-secondary btn-glow"
                onClick={cargarHistorico}
                disabled={cargando}
                title="Consultar análisis previos guardados en db.json"
              >
                Buscar
              </button>
            </div>

            <div className="demo-suggestions">
              <span className="demo-title">Demos rápidos:</span>
              <div className="demo-badges">
                {AGRICULTORES_DEMO.map((demo) => (
                  <button key={demo.id} type="button" className="demo-badge-btn" onClick={() => setAgricultorId(demo.id)}>
                    {demo.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Zona de Arrastre y Soltado (Dropzone) */}
          <div className="form-group">
            <label>Reporte de Laboratorio (Imagen)</label>
            <div
              className={`dropzone animated-border ${dragActive ? 'active' : ''} ${imagenPreview ? 'has-preview' : ''}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
            >
              {imagenPreview ? (
                <div className="preview-container">
                  <img src={imagenPreview} alt="Reporte cargado" className="image-preview" />
                  <div className="preview-overlay glass">
                    <label htmlFor="file-upload" className="btn btn-sm btn-overlay">Cambiar Imagen</label>
                  </div>
                </div>
              ) : (
                <div className="dropzone-prompt">
                  <span className="dropzone-icon animate-bounce">📄</span>
                  <p>Arrastra aquí tu reporte o</p>
                  <label htmlFor="file-upload" className="btn btn-sm btn-accent btn-glow">Seleccionar Archivo</label>
                </div>
              )}
              <input id="file-upload" type="file" className="hidden-file-input" accept="image/*" onChange={handleFileChange} />
            </div>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <button
            type="button"
            className="btn btn-primary btn-block btn-shimmer"
            onClick={analizarSuelo}
            disabled={cargando || !imagenBase64 || !agricultorId.trim()}
          >
            {cargando ? (
              <span className="spinner-wrapper"><span className="spinner"></span>Extrayendo datos con Gemini...</span>
            ) : (
              <span>✨ Extraer con Gemini Vision</span>
            )}
          </button>

          {/* Al tener el suelo listo, invita a pasar al Paso 2 */}
          {perfilSueloListo && (
            <button type="button" className="btn btn-accent btn-block btn-glow next-step-btn" onClick={() => setPasoActivo('hoja')}>
              Continuar al Paso 2: Detección en Hoja →
            </button>
          )}
        </section>

        {/* Panel Derecho: Dashboard de Resultados */}
        <section className="results-panel">
          {resultado ? (
            <div className="results-container">
              <div className="results-header-card card glass border-glow">
                <div className="results-meta">
                  <span className="farmer-badge">🧑‍🌾 Agricultor: <strong>{resultado.agricultor_id}</strong></span>
                  {resultado._error && (
                    <span className="status-badge warning">⚠️ Con errores de extracción (Fallback activo)</span>
                  )}
                </div>
              </div>

              {/* NUEVO: interpretación en lenguaje humano (lo primero que ve el agricultor) */}
              {resultado.interpretacion && (
                <div className="card glass interpretacion-card border-glow animate-fade-in">
                  <div className="interp-head">
                    <span className="interp-icon">🌱</span>
                    <div>
                      <h3>Tu suelo, en pocas palabras</h3>
                      <p className="interp-tipo">{resultado.interpretacion.tipo_suelo}</p>
                    </div>
                  </div>
                  <p className="interp-resumen">{resultado.interpretacion.resumen}</p>
                  <div className="interp-cols">
                    <div className="interp-col bueno">
                      <h4>✅ Lo bueno</h4>
                      {Array.isArray(resultado.interpretacion.lo_bueno) && resultado.interpretacion.lo_bueno.length > 0 ? (
                        <ul>{resultado.interpretacion.lo_bueno.map((x, i) => <li key={i}>{x}</li>)}</ul>
                      ) : <p className="muted">—</p>}
                    </div>
                    <div className="interp-col falta">
                      <h4>⚠️ Lo que falta</h4>
                      {Array.isArray(resultado.interpretacion.lo_que_falta) && resultado.interpretacion.lo_que_falta.length > 0 ? (
                        <ul>{resultado.interpretacion.lo_que_falta.map((x, i) => <li key={i}>{x}</li>)}</ul>
                      ) : <p className="muted">—</p>}
                    </div>
                  </div>
                  {resultado.interpretacion.cultivos && (
                    <div className="interp-cultivos glow-primary">
                      <h4>🌾 Cultivos recomendados para este suelo</h4>
                      {Array.isArray(resultado.interpretacion.cultivos.mas_adecuados) && resultado.interpretacion.cultivos.mas_adecuados.length > 0 && (
                        <div className="cultivos-chips">
                          {resultado.interpretacion.cultivos.mas_adecuados.map((c, i) => (
                            <span key={i} className="cultivo-chip">🌱 {c}</span>
                          ))}
                        </div>
                      )}
                      {resultado.interpretacion.cultivos.con_manejo && resultado.interpretacion.cultivos.con_manejo !== 'sin dato' && (
                        <p className="cultivo-linea"><strong>🔧 Con manejo:</strong> {resultado.interpretacion.cultivos.con_manejo}</p>
                      )}
                      {resultado.interpretacion.cultivos.fertilizante_sugerido && resultado.interpretacion.cultivos.fertilizante_sugerido !== 'sin dato' && (
                        <p className="cultivo-linea"><strong>🧪 Fertilizante sugerido:</strong> {resultado.interpretacion.cultivos.fertilizante_sugerido}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Detalle técnico plegable (los 27 parámetros para quien los quiera) */}
              <div className="detalle-tecnico">
                <button type="button" className="detalle-toggle" onClick={() => setDetalleTecnicoAbierto((v) => !v)}>
                  <span className={`detalle-caret ${detalleTecnicoAbierto ? 'open' : ''}`}>›</span>
                  {detalleTecnicoAbierto ? 'Ocultar detalle técnico' : 'Ver detalle técnico (27 parámetros)'}
                </button>

                {detalleTecnicoAbierto && (
                <>
                <div className="tabs-header">
                  <button type="button" className={`tab-btn ${tabActivo === 'resumen' ? 'active' : ''}`} onClick={() => setTabActivo('resumen')}>📊 Resumen & Textura</button>
                  <button type="button" className={`tab-btn ${tabActivo === 'quimica' ? 'active' : ''}`} onClick={() => setTabActivo('quimica')}>🧪 Química & Acidez</button>
                  <button type="button" className={`tab-btn ${tabActivo === 'nutrientes' ? 'active' : ''}`} onClick={() => setTabActivo('nutrientes')}>🌱 Macro & Micro</button>
                  <button type="button" className={`tab-btn ${tabActivo === 'complejo' ? 'active' : ''}`} onClick={() => setTabActivo('complejo')}>🔋 Complejo & Saturación</button>
                </div>

              <div className="tab-content">
                {/* 1. RESUMEN Y TEXTURA */}
                {tabActivo === 'resumen' && (
                  <div className="grid-two-cols animate-fade-in">
                    <div className="card glass physical-card">
                      <div className="card-header border-glow">
                        <h3>Física del Suelo: Textura</h3>
                        <p className="card-subtitle">Distribución porcentual de las partículas del suelo</p>
                      </div>
                      <div className="texture-container">
                        <div className="texture-visual-bar">
                          <div className="bar-part sand" style={{ width: resultado.textura.arena_pct !== 'sin dato' ? `${resultado.textura.arena_pct}%` : '33.3%' }} title={`Arena: ${resultado.textura.arena_pct}%`}>
                            <span>Arena {resultado.textura.arena_pct}%</span>
                          </div>
                          <div className="bar-part silt" style={{ width: resultado.textura.limo_pct !== 'sin dato' ? `${resultado.textura.limo_pct}%` : '33.3%' }} title={`Limo: ${resultado.textura.limo_pct}%`}>
                            <span>Limo {resultado.textura.limo_pct}%</span>
                          </div>
                          <div className="bar-part clay" style={{ width: resultado.textura.arcilla_pct !== 'sin dato' ? `${resultado.textura.arcilla_pct}%` : '33.4%' }} title={`Arcilla: ${resultado.textura.arcilla_pct}%`}>
                            <span>Arcilla {resultado.textura.arcilla_pct}%</span>
                          </div>
                        </div>
                        <div className="textural-class-box glow-primary">
                          <span className="label">Clase Textural Interpretada:</span>
                          <span className="value">{resultado.textura.clase_textural || 'Sin Clasificar'}</span>
                        </div>
                      </div>
                      <div className="texture-details-list">
                        <div className="text-row"><span>🏜️ Arena</span><strong>{resultado.textura.arena_pct}%</strong></div>
                        <div className="text-row"><span>🌫️ Limo</span><strong>{resultado.textura.limo_pct}%</strong></div>
                        <div className="text-row"><span>🧱 Arcilla</span><strong>{resultado.textura.arcilla_pct}%</strong></div>
                      </div>
                    </div>

                    <div className="card glass health-summary-card">
                      <div className="card-header border-glow">
                        <h3>Salud del Suelo</h3>
                        <p className="card-subtitle">Indicadores principales de acidez e intercambio</p>
                      </div>
                      <div className="health-indicators">
                        <div className="health-indicator-item hover-glow">
                          <span className="ind-label">Reacción del Suelo (pH)</span>
                          <div className="ind-val-wrapper">
                            <span className="ind-val">🧪 {resultado.parametros.ph?.valor || 's/d'}</span>
                            <span className={`badge ${obtenerClaseClasificacion(resultado.parametros.ph?.clasificacion)}`}>{resultado.parametros.ph?.clasificacion || 'sin dato'}</span>
                          </div>
                        </div>
                        <div className="health-indicator-item hover-glow">
                          <span className="ind-label">Materia Orgánica (MO)</span>
                          <div className="ind-val-wrapper">
                            <span className="ind-val">🍂 {resultado.parametros.materia_organica?.valor} {resultado.parametros.materia_organica?.unidad}</span>
                            <span className={`badge ${obtenerClaseClasificacion(resultado.parametros.materia_organica?.clasificacion)}`}>{resultado.parametros.materia_organica?.clasificacion || 'sin dato'}</span>
                          </div>
                        </div>
                        <div className="health-indicator-item hover-glow">
                          <span className="ind-label">Capacidad de Intercambio (CIC)</span>
                          <div className="ind-val-wrapper">
                            <span className="ind-val">🔋 {resultado.parametros.cic?.valor} {resultado.parametros.cic?.unidad}</span>
                            <span className={`badge ${obtenerClaseClasificacion(resultado.parametros.cic?.clasificacion)}`}>{resultado.parametros.cic?.clasificacion || 'sin dato'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. QUÍMICA & ACIDEZ */}
                {tabActivo === 'quimica' && (
                  <div className="card glass animate-fade-in">
                    <div className="card-header border-glow">
                      <h3>Propiedades Químicas de la Solución</h3>
                      <p className="card-subtitle">Parámetros que controlan la disponibilidad de nutrientes y la salinidad</p>
                    </div>
                    <div className="nutrients-grid">
                      {filtrarNutrientes('quimica').map((item) => (
                        <div key={item.key} className="nutrient-card hover-glow">
                          <div className="nut-header">
                            <div className="nut-title-with-icon"><span className="nut-micro-icon">{item.icono}</span><h4>{item.nombre}</h4></div>
                            <span className={`badge ${obtenerClaseClasificacion(item.clasificacion)}`}>{item.clasificacion}</span>
                          </div>
                          <p className="nut-desc">{item.desc}</p>
                          <div className="nut-progress-container">
                            <div className="nut-progress-track">
                              <div className={`nut-progress-bar ${obtenerClaseClasificacion(item.clasificacion)}`} style={{ width: `${obtenerPorcentajeNutriente(item.clasificacion)}%` }}></div>
                            </div>
                          </div>
                          <div className="nut-value-box"><span className="number">{item.valor}</span><span className="unit">{item.unidad !== 'sin dato' ? item.unidad : ''}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. MACRO & MICRONUTRIENTES */}
                {tabActivo === 'nutrientes' && (
                  <div className="nutrients-tab-layout animate-fade-in">
                    <div className="card glass">
                      <div className="card-header border-glow">
                        <h3>Macronutrientes Primarios y Secundarios</h3>
                        <p className="card-subtitle">Elementos demandados en altas cantidades por el cultivo</p>
                      </div>
                      <div className="nutrient-compact-list">
                        {filtrarNutrientes('macronutrientes').map((item) => (
                          <div key={item.key} className="nutrient-list-item hover-glow">
                            <div className="item-name-col">
                              <div className="nut-title-with-icon"><span className="nut-micro-icon">{item.icono}</span><strong>{item.nombre}</strong></div>
                              <span className="item-desc">{item.desc}</span>
                              <div className="nut-progress-container list-meter"><div className="nut-progress-track"><div className={`nut-progress-bar ${obtenerClaseClasificacion(item.clasificacion)}`} style={{ width: `${obtenerPorcentajeNutriente(item.clasificacion)}%` }}></div></div></div>
                            </div>
                            <div className="item-value-col"><span className="item-val">{item.valor}</span><span className="item-uni">{item.unidad !== 'sin dato' ? item.unidad : ''}</span></div>
                            <div className="item-status-col"><span className={`badge ${obtenerClaseClasificacion(item.clasificacion)}`}>{item.clasificacion}</span></div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="card glass">
                      <div className="card-header border-glow">
                        <h3>Micronutrientes (Oligoelementos)</h3>
                        <p className="card-subtitle">Elementos esenciales en cantidades pequeñas pero críticas para la salud</p>
                      </div>
                      <div className="nutrient-compact-list">
                        {filtrarNutrientes('micronutrientes').map((item) => (
                          <div key={item.key} className="nutrient-list-item hover-glow">
                            <div className="item-name-col">
                              <div className="nut-title-with-icon"><span className="nut-micro-icon">{item.icono}</span><strong>{item.nombre}</strong></div>
                              <span className="item-desc">{item.desc}</span>
                              <div className="nut-progress-container list-meter"><div className="nut-progress-track"><div className={`nut-progress-bar ${obtenerClaseClasificacion(item.clasificacion)}`} style={{ width: `${obtenerPorcentajeNutriente(item.clasificacion)}%` }}></div></div></div>
                            </div>
                            <div className="item-value-col"><span className="item-val">{item.valor}</span><span className="item-uni">{item.unidad !== 'sin dato' ? item.unidad : ''}</span></div>
                            <div className="item-status-col"><span className={`badge ${obtenerClaseClasificacion(item.clasificacion)}`}>{item.clasificacion}</span></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. INTERCAMBIO Y SATURACIONES */}
                {tabActivo === 'complejo' && (
                  <div className="nutrients-tab-layout animate-fade-in">
                    <div className="card glass">
                      <div className="card-header border-glow">
                        <h3>Cationes e Intercambio</h3>
                        <p className="card-subtitle">Capacidad del suelo para adsorber y retener nutrientes</p>
                      </div>
                      <div className="nutrient-compact-list">
                        {filtrarNutrientes('complejo').map((item) => (
                          <div key={item.key} className="nutrient-list-item hover-glow">
                            <div className="item-name-col">
                              <div className="nut-title-with-icon"><span className="nut-micro-icon">{item.icono}</span><strong>{item.nombre}</strong></div>
                              <span className="item-desc">{item.desc}</span>
                              <div className="nut-progress-container list-meter"><div className="nut-progress-track"><div className={`nut-progress-bar ${obtenerClaseClasificacion(item.clasificacion)}`} style={{ width: `${obtenerPorcentajeNutriente(item.clasificacion)}%` }}></div></div></div>
                            </div>
                            <div className="item-value-col"><span className="item-val">{item.valor}</span><span className="item-uni">{item.unidad !== 'sin dato' ? item.unidad : ''}</span></div>
                            <div className="item-status-col"><span className={`badge ${obtenerClaseClasificacion(item.clasificacion)}`}>{item.clasificacion}</span></div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="card glass">
                      <div className="card-header border-glow">
                        <h3>Saturaciones de Cationes</h3>
                        <p className="card-subtitle">Equilibrio porcentual entre las bases y elementos ácidos de la CIC</p>
                      </div>
                      <div className="nutrient-compact-list">
                        {filtrarNutrientes('saturaciones').map((item) => (
                          <div key={item.key} className="nutrient-list-item hover-glow">
                            <div className="item-name-col">
                              <div className="nut-title-with-icon"><span className="nut-micro-icon">{item.icono}</span><strong>{item.nombre}</strong></div>
                              <span className="item-desc">{item.desc}</span>
                              <div className="nut-progress-container list-meter"><div className="nut-progress-track"><div className={`nut-progress-bar ${obtenerClaseClasificacion(item.clasificacion)}`} style={{ width: `${obtenerPorcentajeNutriente(item.clasificacion)}%` }}></div></div></div>
                            </div>
                            <div className="item-value-col"><span className="item-val">{item.valor}</span><span className="item-uni">{item.unidad !== 'sin dato' ? item.unidad : '%'}</span></div>
                            <div className="item-status-col"><span className={`badge ${obtenerClaseClasificacion(item.clasificacion)}`}>{item.clasificacion}</span></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
                </>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-results card glass">
              <span className="empty-icon animate-bounce">📈</span>
              <h3>No hay Datos Disponibles</h3>
              <p>Ingresa el ID de un agricultor, carga la imagen de un análisis de suelo de laboratorio y haz clic en "Extraer con Gemini Vision". Una vez guardado el perfil, se desbloquea el Paso 2 (detección en hoja).</p>
              <div className="empty-features">
                <div className="feat-item hover-glow"><span className="feat-icon">⚡</span><strong>Extracción Rápida</strong><p>Interpreta en formato JSON todos los analitos del reporte.</p></div>
                <div className="feat-item hover-glow"><span className="feat-icon">🎨</span><strong>Categorización Visual</strong><p>Identifica deficiencias o excesos con clasificaciones por colores.</p></div>
                <div className="feat-item hover-glow"><span className="feat-icon">💾</span><strong>Historial Guardado</strong><p>Guarda y recupera datos previos consultando por el ID del agricultor.</p></div>
              </div>
            </div>
          )}
        </section>
      </main>
      )}

      {/* ============================ PASO 2: HOJA ============================ */}
      {pasoActivo === 'hoja' && (
      <main className="app-main">
        {/* Panel Izquierdo: carga de la hoja */}
        <section className="control-panel card glass">
          <div className="card-header border-glow">
            <h2>2. Detección en Hoja</h2>
            <p className="card-subtitle">Sube la foto de la planta. Se cruza con el perfil de suelo guardado.</p>
          </div>

          {/* Contexto: qué agricultor y que su suelo ya está cargado */}
          <div className="cruce-context">
            <span className="farmer-badge">🧑‍🌾 Agricultor: <strong>{agricultorId.trim() || '—'}</strong></span>
            {perfilSueloListo ? (
              <span className="status-badge ok">✅ Perfil de suelo cargado (se usará como contexto)</span>
            ) : (
              <span className="status-badge warning">⚠️ Falta el perfil de suelo. Vuelve al Paso 1.</span>
            )}
          </div>

          {/* Contexto para el prior de amenazas: cultivo + clima/temporada */}
          <div className="form-group contexto-amenazas">
            <label>Contexto del cultivo (afina la detección y evita alucinaciones)</label>
            <div className="contexto-grid">
              <div className="contexto-campo">
                <span className="contexto-label">🌱 Cultivo</span>
                <select value={cultivoHoja} onChange={(e) => setCultivoHoja(e.target.value)}>
                  {CULTIVOS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div className="contexto-campo">
                <span className="contexto-label">🌡️ Clima / temporada</span>
                <select value={climaHoja} onChange={(e) => setClimaHoja(e.target.value)}>
                  {CLIMAS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <small className="contexto-hint">
              El sistema calcula las plagas/hongos probables para este cultivo, clima y suelo, y se los da a Gemini como pista.
            </small>
          </div>

          <div className="form-group">
            <label>Foto de la Hoja / Planta (Imagen)</label>
            <div
              className={`dropzone animated-border ${dragActiveHoja ? 'active' : ''} ${imagenHojaPreview ? 'has-preview' : ''}`}
              onDragEnter={handleDragHoja}
              onDragOver={handleDragHoja}
              onDragLeave={handleDragHoja}
              onDrop={handleDropHoja}
            >
              {imagenHojaPreview ? (
                <div className="preview-container">
                  <img src={imagenHojaPreview} alt="Hoja cargada" className="image-preview" />
                  <div className="preview-overlay glass">
                    <label htmlFor="file-upload-hoja" className="btn btn-sm btn-overlay">Cambiar Imagen</label>
                  </div>
                </div>
              ) : (
                <div className="dropzone-prompt">
                  <span className="dropzone-icon animate-bounce">🌿</span>
                  <p>Arrastra aquí la foto de la hoja o</p>
                  <label htmlFor="file-upload-hoja" className="btn btn-sm btn-accent btn-glow">Seleccionar Archivo</label>
                </div>
              )}
              <input id="file-upload-hoja" type="file" className="hidden-file-input" accept="image/*" onChange={handleFileChangeHoja} />
            </div>
          </div>

          {errorHoja && <div className="error-banner">{errorHoja}</div>}

          <button
            type="button"
            className="btn btn-primary btn-block btn-shimmer"
            onClick={analizarHoja}
            disabled={cargandoHoja || !imagenHoja || !perfilSueloListo}
          >
            {cargandoHoja ? (
              <span className="spinner-wrapper"><span className="spinner"></span>Detectando con Gemini...</span>
            ) : (
              <span>🔬 Detectar y cruzar con el suelo</span>
            )}
          </button>

          <button type="button" className="btn btn-secondary btn-block btn-glow next-step-btn" onClick={() => setPasoActivo('suelo')}>
            ← Volver al Paso 1: Suelo
          </button>
        </section>

        {/* Panel Derecho: diagnóstico de la hoja */}
        <section className="results-panel">
          {diagnostico ? (
            <div className="results-container">
              <div className="results-header-card card glass border-glow">
                <div className="results-meta">
                  <span className="farmer-badge">🧑‍🌾 Agricultor: <strong>{agricultorId.trim()}</strong></span>
                  {diagnostico._error && <span className="status-badge warning">⚠️ Detección con fallback (Gemini falló)</span>}
                </div>
                <div className="diag-headline">
                  <span className={`badge badge-lg ${claseRiesgo(diagnostico.nivel_riesgo)}`}>Nivel de riesgo: {diagnostico.nivel_riesgo || 's/d'}</span>
                  <div className="confianza-wrap">
                    <span className="confianza-label">Confianza</span>
                    <div className="confianza-track"><div className="confianza-bar" style={{ width: `${Math.round((Number(diagnostico.confianza) || 0) * 100)}%` }}></div></div>
                    <span className="confianza-num">{Math.round((Number(diagnostico.confianza) || 0) * 100)}%</span>
                  </div>
                </div>
              </div>

              <div className="card glass animate-fade-in diag-card">
                <div className="diag-block">
                  <h4>🔍 Signos detectados en la hoja</h4>
                  {Array.isArray(diagnostico.signos_detectados) && diagnostico.signos_detectados.length > 0 ? (
                    <ul className="signos-list">
                      {diagnostico.signos_detectados.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  ) : (
                    <p className="muted">No se reportaron signos visuales.</p>
                  )}
                </div>

                <div className="diag-block">
                  <h4>🩺 Diagnóstico probable</h4>
                  <p>{diagnostico.diagnostico_probable || 'sin dato'}</p>
                </div>

                <div className="diag-block">
                  <h4>✅ Acción recomendada</h4>
                  <p>{diagnostico.accion_recomendada || 'sin dato'}</p>
                </div>

                {/* EL CRUCE: cómo usó el perfil de suelo */}
                <div className="diag-block cruce-block glow-primary">
                  <h4>🔗 Razonamiento con el suelo (el cruce)</h4>
                  <p>{diagnostico.razonamiento_suelo || 'sin dato'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-results card glass">
              <span className="empty-icon animate-bounce">🔬</span>
              <h3>Detección en Hoja</h3>
              <p>Sube la foto de la hoja o planta del agricultor <strong>{agricultorId.trim() || '—'}</strong> y pulsa "Detectar". El backend leerá el perfil de suelo guardado, identificará los factores limitantes y los usará como contexto para que Gemini pondere el diagnóstico en vez de adivinar.</p>
              <div className="empty-features">
                <div className="feat-item hover-glow"><span className="feat-icon">🧠</span><strong>Cruce Suelo-Hoja</strong><p>El suelo guardado refuerza o descarta hipótesis visuales.</p></div>
                <div className="feat-item hover-glow"><span className="feat-icon">📊</span><strong>Riesgo + Confianza</strong><p>Detección temprana en lenguaje de probabilidad, no certezas.</p></div>
                <div className="feat-item hover-glow"><span className="feat-icon">🎯</span><strong>Acción Concreta</strong><p>Recomendación accionable según el diagnóstico.</p></div>
              </div>
            </div>
          )}
        </section>
      </main>
      )}

      <footer className="app-footer glass">
        <p>© 2026 AgroSintec · Asistencia agronómica con IA · Gemini Vision</p>
      </footer>
    </div>
  );
}

export default App;
