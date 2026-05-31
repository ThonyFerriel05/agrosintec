import { useState, useRef, useEffect } from 'react';
import './ChatBox.css';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function ChatBox({ agricultorId, sueleLoaded, onChatOpen }) {
  const [mensajes, setMensajes] = useState([]);
  const [inputMensaje, setInputMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [chatAbierto, setChatAbierto] = useState(false);
  const [minimizado, setMinimizado] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll automático al último mensaje
  const scrollAlFinal = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollAlFinal();
  }, [mensajes]);

  // Cargar historial cuando se abre el chat
  useEffect(() => {
    if (!chatAbierto || !agricultorId.trim()) return;

    const cargarHistorial = async () => {
      setCargandoHistorial(true);
      try {
        const response = await fetch(
          `${API_URL}/chat/${encodeURIComponent(agricultorId.trim())}`
        );
        if (response.ok) {
          const datos = await response.json();
          setMensajes(datos.historial || []);
        }
      } catch (err) {
        console.error('Error al cargar historial de chat:', err);
      } finally {
        setCargandoHistorial(false);
      }
    };

    cargarHistorial();
  }, [chatAbierto, agricultorId]);

  const enviarMensaje = async (e) => {
    e.preventDefault();
    if (!inputMensaje.trim()) return;
    if (!agricultorId.trim()) {
      setError('Por favor selecciona un agricultor primero.');
      return;
    }
    if (!sueleLoaded) {
      setError('Necesitas cargar el análisis de suelo primero para usar el chat.');
      return;
    }

    const mensajeUsuario = inputMensaje.trim();
    setInputMensaje('');
    setError('');

    // Agregar mensaje del usuario al historial local inmediatamente
    setMensajes((prev) => [
      ...prev,
      {
        rol: 'user',
        contenido: mensajeUsuario,
        timestamp: new Date().toISOString(),
      },
    ]);

    setCargando(true);
    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agricultor_id: agricultorId.trim(),
          mensaje: mensajeUsuario,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en el servidor');
      }

      const datos = await response.json();

      // Agregar respuesta del asistente
      setMensajes((prev) => [
        ...prev,
        {
          rol: 'assistant',
          contenido: datos.respuesta,
          timestamp: datos.timestamp,
        },
      ]);
    } catch (err) {
      console.error('Error al enviar mensaje:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  const limpiarChat = async () => {
    if (!confirm('¿Estás seguro de que quieres borrar todo el historial de chat?')) return;

    try {
      const response = await fetch(
        `${API_URL}/chat/${encodeURIComponent(agricultorId.trim())}`,
        { method: 'DELETE' }
      );
      if (response.ok) {
        setMensajes([]);
        setError('');
      } else {
        throw new Error('No se pudo limpiar el chat');
      }
    } catch (err) {
      console.error('Error al limpiar chat:', err);
      setError(`Error: ${err.message}`);
    }
  };

  const abrirChat = () => {
    setChatAbierto(true);
    setMinimizado(false);
    onChatOpen?.();
  };

  const cerrarChat = () => {
    setChatAbierto(false);
    setMinimizado(false);
  };

  const minimizarChat = () => {
    setMinimizado(true);
  };

  if (!chatAbierto || minimizado) {
    return (
      <div className="chat-toggler">
        <button
          onClick={abrirChat}
          className="btn-chat-toggle"
          title="Abre el chat para hacer preguntas sobre el suelo"
          disabled={!sueleLoaded}
        >
          💬 Chat Agrónomo
          {minimizado && <span className="badge-minimized">(minimizado)</span>}
        </button>
      </div>
    );
  }

  return (
    <div className="chatbox-container glass">
      <div className="chatbox-header">
        <h3>💬 Asesor Agrónomo</h3>
        <div className="chatbox-controls">
          {mensajes.length > 0 && (
            <button onClick={limpiarChat} className="btn-small btn-danger" title="Limpiar historial">
              🗑️
            </button>
          )}
          <button onClick={minimizarChat} className="btn-small btn-minimize" title="Minimizar chat">
            ━
          </button>
          <button onClick={cerrarChat} className="btn-small btn-close" title="Cerrar chat completamente">
            ✕
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
          <button
            onClick={() => setError('')}
            className="btn-close-alert"
            title="Descartar error"
          >
            ✕
          </button>
        </div>
      )}

      <div className="chatbox-messages">
        {cargandoHistorial && (
          <div className="chat-loading">Cargando historial...</div>
        )}
        {mensajes.length === 0 && !cargandoHistorial && (
          <div className="chat-welcome">
            <p>👋 ¡Hola! Soy tu asesor agrónomo.</p>
            <p>
              Puedo responder preguntas sobre el análisis de suelo y recomendaciones
              agrícolas basadas en tu perfil de suelo.
            </p>
            <p className="chat-hint">Haz una pregunta para empezar...</p>
          </div>
        )}
        {mensajes.map((msg, idx) => (
          <div
            key={idx}
            className={`chat-mensaje ${msg.rol === 'user' ? 'usuario' : 'asistente'}`}
          >
            <span className="chat-rol">
              {msg.rol === 'user' ? '👤 Tú' : '🤖 Asesor'}
            </span>
            <p>{msg.contenido}</p>
            {msg.timestamp && (
              <small className="chat-tiempo">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </small>
            )}
          </div>
        ))}
        {cargando && (
          <div className="chat-mensaje asistente loading">
            <span className="chat-rol">🤖 Asesor</span>
            <div className="loader">●●●</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={enviarMensaje} className="chatbox-form">
        <div className="input-group">
          <input
            type="text"
            value={inputMensaje}
            onChange={(e) => setInputMensaje(e.target.value)}
            placeholder="Escribe tu pregunta sobre el suelo..."
            disabled={cargando}
            maxLength="500"
            className="chat-input"
          />
          <button
            type="submit"
            disabled={cargando || !inputMensaje.trim() || !sueleLoaded}
            className="btn btn-primary"
            title="Enviar mensaje"
          >
            {cargando ? '⏳' : '📤'}
          </button>
        </div>
        <small className="chat-info">
          El chat responde solo sobre temas agrícolas y del suelo.
          <br />
          💡 Minimizar (━) o Cerrar (✕) desde los botones en la esquina superior derecha.
        </small>
      </form>
    </div>
  );
}
