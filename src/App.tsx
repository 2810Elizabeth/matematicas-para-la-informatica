/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';

interface Voto {
  id: number;
  nombre: string;
  cafe: boolean;
  te: boolean;
  jugo: boolean;
}

interface Estadisticas {
  totalCafe: number;
  totalTe: number;
  totalJugo: number;
  combinaciones: {
    soloUna: number;
    dosOpciones: number;
    tresOpciones: number;
  };
}

export default function App() {
  const [paginaActual, setPaginaActual] = useState<'encuesta' | 'estadisticas'>('encuesta');

  const [nombre, setNombre] = useState('');
  const [tomaCafe, setTomaCafe] = useState(false);
  const [tomaTe, setTomaTe] = useState(false);
  const [tomaJugo, setTomaJugo] = useState(false);

  const [mensajeExito, setMensajeExito] = useState('');
  const [mensajeError, setMensajeError] = useState('');
  const [cargando, setCargando] = useState(false);

  const [votos, setVotos] = useState<Voto[]>([]);
  const [totalVotantes, setTotalVotantes] = useState(0);
  const [estadisticas, setEstadisticas] = useState<Estadisticas>({
    totalCafe: 0,
    totalTe: 0,
    totalJugo: 0,
    combinaciones: {
      soloUna: 0,
      dosOpciones: 0,
      tresOpciones: 0
    }
  });

  const cargarDatos = async () => {
    try {
      const respuesta = await fetch('/api/votos');
      const data = await respuesta.json();
      if (data.success) {
        setVotos(data.votos);
        setTotalVotantes(data.totalVotantes);
        setEstadisticas(data.estadisticas);
      }
    } catch (err) {
      console.error('Error al conectar con la base de datos MySQL:', err);
      setMensajeError('No se pudo conectar con el servidor de base de datos MySQL.');
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeError('');
    setMensajeExito('');

    if (!tomaCafe && !tomaTe && !tomaJugo) {
      setMensajeError('Por favor selecciona al menos una bebida: Café, Té o Jugo.');
      return;
    }

    setCargando(true);

    try {
      const respuesta = await fetch('/api/votos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombre: nombre.trim() || 'Participante anónimo',
          cafe: tomaCafe,
          te: tomaTe,
          jugo: tomaJugo
        })
      });

      const data = await respuesta.json();

      if (data.success) {
        setMensajeExito('¡Tu voto se ha guardado correctamente en la base de datos MySQL!');
        setNombre('');
        setTomaCafe(false);
        setTomaTe(false);
        setTomaJugo(false);
        await cargarDatos();
      } else {
        setMensajeError(data.error || 'Ocurrió un error al guardar en la base de datos.');
      }
    } catch (err) {
      console.error('Error al enviar:', err);
      setMensajeError('Error de conexión con el servidor MySQL.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div>
      <header>
        <h1>Encuesta de Preferencias: Café, Té y Jugo</h1>
      </header>

      <main>
        <nav>
          <button
            type="button"
            className={`btn-navegacion ${paginaActual === 'encuesta' ? 'activo' : ''}`}
            onClick={() => {
              setPaginaActual('encuesta');
              setMensajeError('');
            }}
          >
            Página 1: Encuesta
          </button>
          <button
            type="button"
            className={`btn-navegacion ${paginaActual === 'estadisticas' ? 'activo' : ''}`}
            onClick={() => {
              setPaginaActual('estadisticas');
              setMensajeError('');
            }}
          >
            Página 2: Estadísticas
          </button>
        </nav>

        {paginaActual === 'encuesta' && (
          <div>
            <div className="seccion">
              <h2>Formulario de Encuesta</h2>
              <p style={{ marginBottom: '15px' }}>
                Por favor responde la encuesta seleccionando las bebidas que acostumbras tomar. Puedes marcar una sola o varias opciones.
              </p>

              {mensajeExito && <div className="mensaje-exito">{mensajeExito}</div>}
              {mensajeError && <div className="mensaje-error">{mensajeError}</div>}

              <form onSubmit={manejarEnvio}>
                <div className="campo-formulario">
                  <label htmlFor="nombre">Tu Nombre:</label>
                  <input
                    type="text"
                    id="nombre"
                    placeholder="Escribe tu nombre (opcional)"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                  />
                </div>

                <div className="campo-formulario">
                  <label>Selecciona las bebidas que tomas (puedes elegir más de una):</label>
                  <div className="grupo-opciones">
                    <label className="opcion-checkbox">
                      <input
                        type="checkbox"
                        checked={tomaCafe}
                        onChange={(e) => setTomaCafe(e.target.checked)}
                      />
                      <span>Tomar café</span>
                    </label>

                    <label className="opcion-checkbox">
                      <input
                        type="checkbox"
                        checked={tomaTe}
                        onChange={(e) => setTomaTe(e.target.checked)}
                      />
                      <span>Tomar té</span>
                    </label>

                    <label className="opcion-checkbox">
                      <input
                        type="checkbox"
                        checked={tomaJugo}
                        onChange={(e) => setTomaJugo(e.target.checked)}
                      />
                      <span>Tomar jugo</span>
                    </label>
                  </div>
                </div>

                <button type="submit" className="btn-enviar" disabled={cargando}>
                  {cargando ? 'Guardando en la base de datos...' : 'Enviar mi voto a la base de datos'}
                </button>
              </form>
            </div>

            <div className="seccion">
              <h2>Resumen de Opciones Escogidas</h2>

              <div className="contenedor-resumen">
                <div className="tarjeta-resumen">
                  <div className="etiqueta">Solo una opción</div>
                  <div className="numero">{estadisticas.combinaciones.soloUna}</div>
                  <div className="etiqueta">
                    {totalVotantes > 0
                      ? `${Math.round((estadisticas.combinaciones.soloUna / totalVotantes) * 100)}% del total`
                      : '0%'}
                  </div>
                </div>

                <div className="tarjeta-resumen">
                  <div className="etiqueta">Dos opciones</div>
                  <div className="numero">{estadisticas.combinaciones.dosOpciones}</div>
                  <div className="etiqueta">
                    {totalVotantes > 0
                      ? `${Math.round((estadisticas.combinaciones.dosOpciones / totalVotantes) * 100)}% del total`
                      : '0%'}
                  </div>
                </div>

                <div className="tarjeta-resumen">
                  <div className="etiqueta">Las tres opciones</div>
                  <div className="numero">{estadisticas.combinaciones.tresOpciones}</div>
                  <div className="etiqueta">
                    {totalVotantes > 0
                      ? `${Math.round((estadisticas.combinaciones.tresOpciones / totalVotantes) * 100)}% del total`
                      : '0%'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {paginaActual === 'estadisticas' && (
          <div>
            <div className="seccion">
              <h2>Estadísticas de la Encuesta</h2>

              <p style={{ marginBottom: '15px' }}>
                A continuación se muestran los totales de votos recibidos para cada una de las opciones:
              </p>

              <div className="contenedor-resumen">
                <div className="tarjeta-resumen">
                  <div className="etiqueta">Personas que toman Café</div>
                  <div className="numero">{estadisticas.totalCafe}</div>
                  <div className="etiqueta">votos registrados</div>
                </div>

                <div className="tarjeta-resumen">
                  <div className="etiqueta">Personas que toman Té</div>
                  <div className="numero">{estadisticas.totalTe}</div>
                  <div className="etiqueta">votos registrados</div>
                </div>

                <div className="tarjeta-resumen">
                  <div className="etiqueta">Personas que toman Jugo</div>
                  <div className="numero">{estadisticas.totalJugo}</div>
                  <div className="etiqueta">votos registrados</div>
                </div>
              </div>

              <h3 style={{ marginTop: '25px' }}>Distribución por cantidad de opciones elegidas:</h3>
              <div className="contenedor-resumen">
                <div className="tarjeta-resumen">
                  <div className="etiqueta">Eligieron 1 opción</div>
                  <div className="numero">{estadisticas.combinaciones.soloUna}</div>
                </div>
                <div className="tarjeta-resumen">
                  <div className="etiqueta">Eligieron 2 opciones</div>
                  <div className="numero">{estadisticas.combinaciones.dosOpciones}</div>
                </div>
                <div className="tarjeta-resumen">
                  <div className="etiqueta">Eligieron las 3 opciones</div>
                  <div className="numero">{estadisticas.combinaciones.tresOpciones}</div>
                </div>
              </div>
            </div>

            <div className="seccion">
              <h2>Votos por participante</h2>

              {votos.length === 0 ? (
                <p style={{ padding: '20px', textAlign: 'center', backgroundColor: '#fce4ec', marginTop: '10px' }}>
                  Aún no hay votos registrados en la base de datos.
                </p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nombre</th>
                      <th>Opciones Elegidas</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {votos.map((voto) => {
                      const seleccionadas: string[] = [];
                      if (voto.cafe) seleccionadas.push('Café');
                      if (voto.te) seleccionadas.push('Té');
                      if (voto.jugo) seleccionadas.push('Jugo');

                      return (
                        <tr key={voto.id}>
                          <td><strong>{voto.id}</strong></td>
                          <td>{voto.nombre}</td>
                          <td>
                            <strong>{seleccionadas.join(', ')}</strong>
                          </td>
                          <td>{seleccionadas.length} {seleccionadas.length === 1 ? 'opción' : 'opciones'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
