import { useState } from 'react';
import './App.css';

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

function App() {
  const [agricultorId, setAgricultorId] = useState('');
  const [imagenBase64, setImageBase64] = useState('');
  const [imagenPreview, setImagePreview] = useState('');
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [tabActivo, setTabActivo] = useState('resumen');

  // Procesar archivo seleccionado
  const procesarArchivo = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecciona únicamente un archivo de imagen (PNG, JPG, JPEG).');
      return;
    }

    setError('');
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    procesarArchivo(e.target.files[0]);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      procesarArchivo(e.dataTransfer.files[0]);
    }
  };

  // Enviar imagen para analizar con Gemini
  const analizarSuelo = async () => {
    if (!agricultorId.trim()) {
      setError('Debes ingresar o seleccionar un ID de agricultor.');
      return;
    }
    if (!imagenBase64) {
      setError('Debes subir o arrastrar la imagen de un reporte de laboratorio.');
      return;
    }

    setCargando(true);
    setError('');
    setResultado(null);

    try {
      const response = await fetch('http://localhost:3000/analizar-suelo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agricultor_id: agricultorId,
          imagen_base64: imagenBase64
        })
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
      setError(`No se pudo completar el análisis: ${err.message}. Asegúrate de tener el backend corriendo en http://localhost:3000.`);
    } finally {
      setCargando(false);
    }
  };

  // Cargar registro histórico
  const cargarHistorico = async () => {
    if (!agricultorId.trim()) {
      setError('Debes ingresar o seleccionar un ID de agricultor para buscar su historial.');
      return;
    }

    setCargando(true);
    setError('');
    setResultado(null);

    try {
      const response = await fetch(`http://localhost:3000/suelo/${encodeURIComponent(agricultorId)}`);
      
      if (response.status === 404) {
        throw new Error(`No se encontró ningún reporte guardado para el agricultor "${agricultorId}". Realiza un nuevo análisis primero.`);
      }

      if (!response.ok) {
        throw new Error('Error al consultar el historial en el servidor.');
      }

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

  // Determinar la clase CSS de acuerdo a la clasificación técnica
  const obtenerClaseClasificacion = (clasificacion) => {
    if (!clasificacion) return 'badge-neutral';
    const c = clasificacion.toLowerCase();
    if (c.includes('muy bajo') || c.includes('muy acido') || c.includes('alcalino')) return 'badge-alert';
    if (c.includes('bajo') || c.includes('acido')) return 'badge-warning';
    if (c.includes('moderado') || c.includes('ligeramente') || c.includes('neutro')) return 'badge-success';
    if (c.includes('alto') || c.includes('adecuado') || c.includes('muy alto')) return 'badge-info';
    return 'badge-neutral';
  };

  // Calcular porcentaje aproximado para el medidor visual de nutrientes
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

  // Agrupar los parámetros en sus respectivas categorías
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
      .map(([key, info]) => ({
        key,
        valor: info.valor,
        unidad: info.unidad,
        clasificacion: info.clasificacion,
        ...NOMBRES_PARAMETROS[key]
      }));
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
            <p>Fase 1: Diagnóstico Inteligente de Suelo con Gemini Vision</p>
          </div>
        </div>
      </header>

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

            {/* Accesos rápidos de demostración */}
            <div className="demo-suggestions">
              <span className="demo-title">Demos rápidos:</span>
              <div className="demo-badges">
                {AGRICULTORES_DEMO.map((demo) => (
                  <button
                    key={demo.id}
                    type="button"
                    className="demo-badge-btn"
                    onClick={() => setAgricultorId(demo.id)}
                  >
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
                    <label htmlFor="file-upload-replace" className="btn btn-sm btn-overlay">
                      Cambiar Imagen
                    </label>
                  </div>
                </div>
              ) : (
                <div className="dropzone-prompt">
                  <span className="dropzone-icon animate-bounce">📄</span>
                  <p>Arrastra aquí tu reporte o</p>
                  <label htmlFor="file-upload" className="btn btn-sm btn-accent btn-glow">
                    Seleccionar Archivo
                  </label>
                </div>
              )}
              <input
                id="file-upload"
                type="file"
                className="hidden-file-input"
                accept="image/*"
                onChange={handleFileChange}
              />
              <input
                id="file-upload-replace"
                type="file"
                className="hidden-file-input"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {error && <div className="error-banner">{error}</div>}

          {/* Botón Principal con Efecto Shimmer de IA */}
          <button
            type="button"
            className="btn btn-primary btn-block btn-large btn-sparkle shimmer-button"
            onClick={analizarSuelo}
            disabled={cargando || !imagenBase64 || !agricultorId.trim()}
          >
            {cargando ? (
              <span className="spinner-wrapper">
                <span className="spinner"></span>
                Extrayendo datos con Gemini...
              </span>
            ) : (
              <span>✨ Extraer con Gemini Vision</span>
            )}
          </button>
        </section>

        {/* Panel Derecho: Dashboard de Resultados */}
        <section className="results-panel">
          {resultado ? (
            <div className="results-container">
              {/* Encabezado del Análisis */}
              <div className="results-header-card card glass border-glow">
                <div className="results-meta">
                  <span className="farmer-badge">🧑‍🌾 Agricultor: <strong>{resultado.agricultor_id}</strong></span>
                  {resultado._error && (
                    <span className="status-badge warning">⚠️ Con errores de extracción (Fallback activo)</span>
                  )}
                </div>
                <div className="tabs-header">
                  <button
                    type="button"
                    className={`tab-btn ${tabActivo === 'resumen' ? 'active' : ''}`}
                    onClick={() => setTabActivo('resumen')}
                  >
                    📊 Resumen & Textura
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${tabActivo === 'quimica' ? 'active' : ''}`}
                    onClick={() => setTabActivo('quimica')}
                  >
                    🧪 Química & Acidez
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${tabActivo === 'nutrientes' ? 'active' : ''}`}
                    onClick={() => setTabActivo('nutrientes')}
                  >
                    🌱 Macro & Micro
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${tabActivo === 'complejo' ? 'active' : ''}`}
                    onClick={() => setTabActivo('complejo')}
                  >
                    🔋 Complejo & Saturación
                  </button>
                </div>
              </div>

              {/* Contenido Dinámico por Pestaña */}
              <div className="tab-content">
                
                {/* 1. RESUMEN Y TEXTURA */}
                {tabActivo === 'resumen' && (
                  <div className="grid-two-cols animate-fade-in">
                    {/* Tarjeta de Textura Física */}
                    <div className="card glass physical-card">
                      <div className="card-header border-glow">
                        <h3>Física del Suelo: Textura</h3>
                        <p className="card-subtitle">Distribución porcentual de las partículas del suelo</p>
                      </div>
                      
                      <div className="texture-container">
                        <div className="texture-visual-bar">
                          <div 
                            className="bar-part sand" 
                            style={{ width: resultado.textura.arena_pct !== 'sin dato' ? `${resultado.textura.arena_pct}%` : '33.3%' }}
                            title={`Arena: ${resultado.textura.arena_pct}%`}
                          >
                            <span>Arena {resultado.textura.arena_pct}%</span>
                          </div>
                          <div 
                            className="bar-part silt" 
                            style={{ width: resultado.textura.limo_pct !== 'sin dato' ? `${resultado.textura.limo_pct}%` : '33.3%' }}
                            title={`Limo: ${resultado.textura.limo_pct}%`}
                          >
                            <span>Limo {resultado.textura.limo_pct}%</span>
                          </div>
                          <div 
                            className="bar-part clay" 
                            style={{ width: resultado.textura.arcilla_pct !== 'sin dato' ? `${resultado.textura.arcilla_pct}%` : '33.4%' }}
                            title={`Arcilla: ${resultado.textura.arcilla_pct}%`}
                          >
                            <span>Arcilla {resultado.textura.arcilla_pct}%</span>
                          </div>
                        </div>

                        <div className="textural-class-box glow-primary">
                          <span className="label">Clase Textural Interpretada:</span>
                          <span className="value">{resultado.textura.clase_textural || 'Sin Clasificar'}</span>
                        </div>
                      </div>

                      <div className="texture-details-list">
                        <div className="text-row">
                          <span>🏜️ Arena</span>
                          <strong>{resultado.textura.arena_pct}%</strong>
                        </div>
                        <div className="text-row">
                          <span>🌫️ Limo</span>
                          <strong>{resultado.textura.limo_pct}%</strong>
                        </div>
                        <div className="text-row">
                          <span>🧱 Arcilla</span>
                          <strong>{resultado.textura.arcilla_pct}%</strong>
                        </div>
                      </div>
                    </div>

                    {/* Tarjeta de Resumen Rápido / Salud */}
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
                            <span className={`badge ${obtenerClaseClasificacion(resultado.parametros.ph?.clasificacion)}`}>
                              {resultado.parametros.ph?.clasificacion || 'sin dato'}
                            </span>
                          </div>
                        </div>

                        <div className="health-indicator-item hover-glow">
                          <span className="ind-label">Materia Orgánica (MO)</span>
                          <div className="ind-val-wrapper">
                            <span className="ind-val">🍂 {resultado.parametros.materia_organica?.valor} {resultado.parametros.materia_organica?.unidad}</span>
                            <span className={`badge ${obtenerClaseClasificacion(resultado.parametros.materia_organica?.clasificacion)}`}>
                              {resultado.parametros.materia_organica?.clasificacion || 'sin dato'}
                            </span>
                          </div>
                        </div>

                        <div className="health-indicator-item hover-glow">
                          <span className="ind-label">Capacidad de Intercambio (CIC)</span>
                          <div className="ind-val-wrapper">
                            <span className="ind-val">🔋 {resultado.parametros.cic?.valor} {resultado.parametros.cic?.unidad}</span>
                            <span className={`badge ${obtenerClaseClasificacion(resultado.parametros.cic?.clasificacion)}`}>
                              {resultado.parametros.cic?.clasificacion || 'sin dato'}
                            </span>
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
                            <div className="nut-title-with-icon">
                              <span className="nut-micro-icon">{item.icono}</span>
                              <h4>{item.nombre}</h4>
                            </div>
                            <span className={`badge ${obtenerClaseClasificacion(item.clasificacion)}`}>
                              {item.clasificacion}
                            </span>
                          </div>
                          <p className="nut-desc">{item.desc}</p>
                          
                          {/* Sleek Progress Meter (Medidor Visual) */}
                          <div className="nut-progress-container">
                            <div className="nut-progress-track">
                              <div 
                                className={`nut-progress-bar ${obtenerClaseClasificacion(item.clasificacion)}`}
                                style={{ width: `${obtenerPorcentajeNutriente(item.clasificacion)}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="nut-value-box">
                            <span className="number">{item.valor}</span>
                            <span className="unit">{item.unidad !== 'sin dato' ? item.unidad : ''}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. MACRO & MICRONUTRIENTES */}
                {tabActivo === 'nutrientes' && (
                  <div className="nutrients-tab-layout animate-fade-in">
                    {/* Macronutrientes */}
                    <div className="card glass">
                      <div className="card-header border-glow">
                        <h3>Macronutrientes Primarios y Secundarios</h3>
                        <p className="card-subtitle">Elementos demandados en altas cantidades por el cultivo</p>
                      </div>
                      <div className="nutrient-compact-list">
                        {filtrarNutrientes('macronutrientes').map((item) => (
                          <div key={item.key} className="nutrient-list-item hover-glow">
                            <div className="item-name-col">
                              <div className="nut-title-with-icon">
                                <span className="nut-micro-icon">{item.icono}</span>
                                <strong>{item.nombre}</strong>
                              </div>
                              <span className="item-desc">{item.desc}</span>
                              {/* Slim visual meter inside lists */}
                              <div className="nut-progress-container list-meter">
                                <div className="nut-progress-track">
                                  <div 
                                    className={`nut-progress-bar ${obtenerClaseClasificacion(item.clasificacion)}`}
                                    style={{ width: `${obtenerPorcentajeNutriente(item.clasificacion)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                            <div className="item-value-col">
                              <span className="item-val">{item.valor}</span>
                              <span className="item-uni">{item.unidad !== 'sin dato' ? item.unidad : ''}</span>
                            </div>
                            <div className="item-status-col">
                              <span className={`badge ${obtenerClaseClasificacion(item.clasificacion)}`}>
                                {item.clasificacion}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Micronutrientes */}
                    <div className="card glass">
                      <div className="card-header border-glow">
                        <h3>Micronutrientes (Oligoelementos)</h3>
                        <p className="card-subtitle">Elementos esenciales en cantidades pequeñas pero críticas para la salud</p>
                      </div>
                      <div className="nutrient-compact-list">
                        {filtrarNutrientes('micronutrientes').map((item) => (
                          <div key={item.key} className="nutrient-list-item hover-glow">
                            <div className="item-name-col">
                              <div className="nut-title-with-icon">
                                <span className="nut-micro-icon">{item.icono}</span>
                                <strong>{item.nombre}</strong>
                              </div>
                              <span className="item-desc">{item.desc}</span>
                              {/* Slim visual meter inside lists */}
                              <div className="nut-progress-container list-meter">
                                <div className="nut-progress-track">
                                  <div 
                                    className={`nut-progress-bar ${obtenerClaseClasificacion(item.clasificacion)}`}
                                    style={{ width: `${obtenerPorcentajeNutriente(item.clasificacion)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                            <div className="item-value-col">
                              <span className="item-val">{item.valor}</span>
                              <span className="item-uni">{item.unidad !== 'sin dato' ? item.unidad : ''}</span>
                            </div>
                            <div className="item-status-col">
                              <span className={`badge ${obtenerClaseClasificacion(item.clasificacion)}`}>
                                {item.clasificacion}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. INTERCAMBIO Y SATURACIONES */}
                {tabActivo === 'complejo' && (
                  <div className="nutrients-tab-layout animate-fade-in">
                    {/* Complejo de Intercambio Cationico */}
                    <div className="card glass">
                      <div className="card-header border-glow">
                        <h3>Cationes e Intercambio</h3>
                        <p className="card-subtitle">Capacidad del suelo para adsorber y retener nutrientes</p>
                      </div>
                      <div className="nutrient-compact-list">
                        {filtrarNutrientes('complejo').map((item) => (
                          <div key={item.key} className="nutrient-list-item hover-glow">
                            <div className="item-name-col">
                              <div className="nut-title-with-icon">
                                <span className="nut-micro-icon">{item.icono}</span>
                                <strong>{item.nombre}</strong>
                              </div>
                              <span className="item-desc">{item.desc}</span>
                              {/* Slim visual meter inside lists */}
                              <div className="nut-progress-container list-meter">
                                <div className="nut-progress-track">
                                  <div 
                                    className={`nut-progress-bar ${obtenerClaseClasificacion(item.clasificacion)}`}
                                    style={{ width: `${obtenerPorcentajeNutriente(item.clasificacion)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                            <div className="item-value-col">
                              <span className="item-val">{item.valor}</span>
                              <span className="item-uni">{item.unidad !== 'sin dato' ? item.unidad : ''}</span>
                            </div>
                            <div className="item-status-col">
                              <span className={`badge ${obtenerClaseClasificacion(item.clasificacion)}`}>
                                {item.clasificacion}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Saturación de Cationes */}
                    <div className="card glass">
                      <div className="card-header border-glow">
                        <h3>Saturaciones de Cationes</h3>
                        <p className="card-subtitle">Equilibrio porcentual entre las bases y elementos ácidos de la CIC</p>
                      </div>
                      <div className="nutrient-compact-list">
                        {filtrarNutrientes('saturaciones').map((item) => (
                          <div key={item.key} className="nutrient-list-item hover-glow">
                            <div className="item-name-col">
                              <div className="nut-title-with-icon">
                                <span className="nut-micro-icon">{item.icono}</span>
                                <strong>{item.nombre}</strong>
                              </div>
                              <span className="item-desc">{item.desc}</span>
                              {/* Slim visual meter inside lists */}
                              <div className="nut-progress-container list-meter">
                                <div className="nut-progress-track">
                                  <div 
                                    className={`nut-progress-bar ${obtenerClaseClasificacion(item.clasificacion)}`}
                                    style={{ width: `${obtenerPorcentajeNutriente(item.clasificacion)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                            <div className="item-value-col">
                              <span className="item-val">{item.valor}</span>
                              <span className="item-uni">{item.unidad !== 'sin dato' ? item.unidad : '%'}</span>
                            </div>
                            <div className="item-status-col">
                              <span className={`badge ${obtenerClaseClasificacion(item.clasificacion)}`}>
                                {item.clasificacion}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Pantalla Vacía de Bienvenida
            <div className="empty-results card glass">
              <span className="empty-icon animate-bounce">📈</span>
              <h3>No hay Datos Disponibles</h3>
              <p>
                Por favor, ingresa el ID de un agricultor, selecciona o arrastra la imagen de un análisis de suelo de laboratorio en el panel de la izquierda y haz clic en "Extraer con Gemini Vision" para procesarlo en segundos con IA de última generación.
              </p>
              <div className="empty-features">
                <div className="feat-item hover-glow">
                  <span className="feat-icon">⚡</span>
                  <strong>Extracción Rápida</strong>
                  <p>Interpreta en formato JSON todos los analitos del reporte.</p>
                </div>
                <div className="feat-item hover-glow">
                  <span className="feat-icon">🎨</span>
                  <strong>Categorización Visual</strong>
                  <p>Identifica deficiencias o excesos con clasificaciones por colores.</p>
                </div>
                <div className="feat-item hover-glow">
                  <span className="feat-icon">💾</span>
                  <strong>Historial Guardado</strong>
                  <p>Guarda y recupera datos previos consultando por el ID del agricultor.</p>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="app-footer glass">
        <p>© 2026 AgroSintec. Todos los derechos reservados. Desarrollado en colaboración con Google DeepMind.</p>
      </footer>
    </div>
  );
}

export default App;
