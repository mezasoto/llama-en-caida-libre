import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowDownUp,
  ArrowUpRight,
  CircleHelp,
  Database,
  FlaskConical,
  Flame,
  Radio,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './App.css'

type Experiment = {
  id: string
  title: string
  type: string
  fuel: string
  flameIndex: number
  ignitionDelay: number
  burnTime: number
}

type TelemetryRecord = {
  id: number
  device_id: string
  temperature_c: number
  smoke_ppm: number
  flame_detected: boolean
  created_at: string
}

type TelemetryStatus = 'loading' | 'online' | 'empty' | 'offline'

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '')

const experiments: Experiment[] = [
  {
    id: 'DEMO-01',
    title: 'Caso A · llama de difusión',
    type: 'Difusión',
    fuel: 'Mezcla A',
    flameIndex: 32,
    ignitionDelay: 1.8,
    burnTime: 18,
  },
  {
    id: 'DEMO-02',
    title: 'Caso B · gota de combustible',
    type: 'Gota',
    fuel: 'Mezcla B',
    flameIndex: 44,
    ignitionDelay: 2.4,
    burnTime: 25,
  },
  {
    id: 'DEMO-03',
    title: 'Caso C · material sólido',
    type: 'Sólido',
    fuel: 'Material C',
    flameIndex: 25,
    ignitionDelay: 1.2,
    burnTime: 14,
  },
]

function App() {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('Todos')
  const [selectedIds, setSelectedIds] = useState(['DEMO-01', 'DEMO-02'])
  const [telemetry, setTelemetry] = useState<TelemetryRecord[]>([])
  const [telemetryStatus, setTelemetryStatus] = useState<TelemetryStatus>('loading')

  useEffect(() => {
    let isCurrent = true

    const loadTelemetry = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/telemetry`)
        if (!response.ok) throw new Error('Telemetry API request failed')

        const result = (await response.json()) as { data?: TelemetryRecord[] }
        if (!Array.isArray(result.data)) throw new Error('Unexpected telemetry response')

        if (isCurrent) {
          setTelemetry(result.data)
          setTelemetryStatus(result.data.length > 0 ? 'online' : 'empty')
        }
      } catch {
        if (isCurrent) setTelemetryStatus('offline')
      }
    }

    void loadTelemetry()
    const intervalId = window.setInterval(() => void loadTelemetry(), 10000)

    return () => {
      isCurrent = false
      window.clearInterval(intervalId)
    }
  }, [])

  const filteredExperiments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return experiments.filter((experiment) => {
      const matchesType = typeFilter === 'Todos' || experiment.type === typeFilter
      const matchesQuery = `${experiment.title} ${experiment.fuel} ${experiment.id}`
        .toLowerCase()
        .includes(normalizedQuery)

      return matchesType && matchesQuery
    })
  }, [query, typeFilter])

  const selectedExperiments = experiments.filter((experiment) =>
    selectedIds.includes(experiment.id),
  )

  const toggleExperiment = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id],
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#inicio" aria-label="Llama en caída libre, inicio">
          <span className="brand-mark"><Flame size={21} strokeWidth={2.2} /></span>
          <span className="brand-name">LLAMA<span>LAB</span></span>
        </a>

        <div className="workspace-label">ESPACIO DE TRABAJO</div>
        <nav className="side-nav" aria-label="Navegación principal">
          <a className="nav-item active" href="#panel"><Activity size={17} /> Panel de análisis</a>
          <a className="nav-item" href="#experimentos"><FlaskConical size={17} /> Experimentos</a>
          <a className="nav-item" href="#telemetria"><Radio size={17} /> Telemetría <span className="nav-soon">DEMO</span></a>
        </nav>

        <div className="sidebar-bottom">
          <div className="mission-card">
            <div className="mission-icon"><Database size={16} /></div>
            <div>
              <strong>Datos de muestra</strong>
              <span>Sin conexión a NASA</span>
            </div>
            <span className="status-dot" />
          </div>
          <button className="help-button" type="button" title="Información del proyecto">
            <CircleHelp size={17} /> Información del proyecto
          </button>
          <div className="team-chip"><span className="team-avatar">LL</span><span>Equipo Llama</span><span className="team-menu">···</span></div>
        </div>
      </aside>

      <main className="main-content" id="inicio">
        <header className="topbar">
          <div className="breadcrumb">Exploración espacial <span>/</span> <strong>Combustión</strong></div>
          <div className="topbar-right">
            <span className="demo-label"><span /> ENTORNO DE DEMOSTRACIÓN</span>
            <button className="icon-button" type="button" title="Ayuda"><CircleHelp size={18} /></button>
          </div>
        </header>

        <div className="content-wrap" id="panel">
          <section className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> OBSERVATORIO DE COMBUSTIÓN</div>
              <h1>Combustión en <em>microgravedad</em></h1>
              <p>Explora patrones experimentales y su impacto en la seguridad de misión.</p>
            </div>
            <button className="export-button" type="button" title="La exportación estará disponible al conectar los datos">
              <ArrowDownUp size={16} /> Exportar
            </button>
          </section>

          <div className="notice-bar" role="note">
            <span className="notice-icon"><FlaskConical size={16} /></span>
            <span><strong>Datos ilustrativos.</strong> Estos registros son ficticios y no representan resultados de NASA.</span>
            <span className="notice-source">FUENTE NASA PENDIENTE</span>
          </div>

          <section className="metric-grid" aria-label="Resumen de datos">
            <article className="metric-card">
              <div className="metric-top"><span>REGISTROS EN VISTA</span><Database size={16} /></div>
              <div className="metric-value">03 <small>/ 03</small></div>
              <div className="metric-foot">Casos ilustrativos</div>
            </article>
            <article className="metric-card">
              <div className="metric-top"><span>TIPOS DE COMBUSTIÓN</span><Flame size={16} /></div>
              <div className="metric-value">03</div>
              <div className="metric-foot">Difusión, gota y sólido</div>
            </article>
            <article className="metric-card">
              <div className="metric-top"><span>TELEMETRÍA</span><Radio size={16} /></div>
              <div className="metric-value">{telemetry.length.toString().padStart(2, '0')}</div>
              <div className="metric-foot"><span className={`pulse-dot pulse-${telemetryStatus}`} /> {telemetryStatus === 'online' ? 'Lecturas recibidas' : telemetryStatus === 'empty' ? 'API conectada · sin lecturas' : telemetryStatus === 'loading' ? 'Conectando API...' : 'API sin conexión'}</div>
            </article>
            <article className="metric-card metric-card-accent">
              <div className="metric-top"><span>ANÁLISIS IA</span><Sparkles size={16} /></div>
              <div className="metric-value metric-demo">VISTA PREVIA</div>
              <div className="metric-foot">Sin modelo conectado</div>
            </article>
          </section>

          <section className="analysis-grid">
            <article className="panel comparison-panel">
              <div className="panel-heading">
                <div>
                  <div className="section-kicker">COMPARACIÓN</div>
                  <h2>Índice relativo de llama</h2>
                </div>
                <span className="unit-tag">UNIDADES ILUSTRATIVAS</span>
              </div>
              <div className="chart-wrap">
                {selectedExperiments.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={selectedExperiments} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#e8e8e1" strokeDasharray="3 5" />
                      <XAxis dataKey="id" axisLine={false} tickLine={false} tick={{ fill: '#73766f', fontSize: 11 }} dy={9} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#92948c', fontSize: 11 }} />
                      <Tooltip cursor={{ fill: '#f1f2ed' }} contentStyle={{ border: '1px solid #dfe1d9', borderRadius: 4, fontSize: 12 }} />
                      <Bar dataKey="flameIndex" name="Índice relativo" fill="#e46e45" radius={[3, 3, 0, 0]} maxBarSize={54} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-chart">Selecciona al menos un experimento para comparar.</div>
                )}
              </div>
              <div className="chart-foot"><span className="chart-legend" /> Índice relativo de llama <span className="chart-foot-note">No usar para decisiones operativas</span></div>
            </article>

            <article className="panel insight-panel">
              <div className="panel-heading insight-heading">
                <div className="insight-title"><span className="ai-icon"><Sparkles size={16} /></span><div><div className="section-kicker">ASISTENTE DE INVESTIGACIÓN</div><h2>Lectura preliminar</h2></div></div>
                <span className="preview-tag">DEMO</span>
              </div>
              <div className="insight-body">
                {selectedExperiments.length > 0 ? (
                  <>
                    <p>En los registros ilustrativos seleccionados, <strong>{selectedExperiments.reduce((highest, item) => item.flameIndex > highest.flameIndex ? item : highest).title.toLowerCase()}</strong> presenta el índice relativo de llama más alto ({Math.max(...selectedExperiments.map((item) => item.flameIndex))} u.a.).</p>
                    <p className="insight-caveat">Esto solo describe los valores de ejemplo visibles. No es una conclusión científica ni una recomendación de seguridad.</p>
                  </>
                ) : (
                  <p>Selecciona uno o más registros para generar una lectura preliminar de demostración.</p>
                )}
              </div>
              <div className="insight-source"><span className="source-mark">i</span><span>Sin documentos fuente conectados</span><span className="source-pending">PENDIENTE</span></div>
              <button className="ask-button" type="button" disabled><Sparkles size={15} /> Consultar al asistente <span>Próximamente</span></button>
            </article>
          </section>

          <section className="panel telemetry-panel" id="telemetria">
            <div className="experiment-heading telemetry-heading">
              <div>
                <div className="section-kicker">LECTURAS DEL ESP32</div>
                <h2>Telemetría reciente <span className="count-pill">{telemetry.length}</span></h2>
              </div>
              <span className={`connection-tag connection-${telemetryStatus}`}><span />{telemetryStatus === 'online' ? 'API conectada' : telemetryStatus === 'empty' ? 'Esperando primera lectura' : telemetryStatus === 'loading' ? 'Conectando...' : 'Sin conexión'}</span>
            </div>
            {telemetry.length > 0 ? (
              <div className="table-scroll telemetry-scroll">
                <table>
                  <thead><tr><th>DISPOSITIVO</th><th>TEMPERATURA</th><th>HUMO</th><th>LLAMA</th><th>RECIBIDO</th></tr></thead>
                  <tbody>
                    {telemetry.slice(0, 8).map((reading) => (
                      <tr key={reading.id}>
                        <td><span className="record-name">{reading.device_id}</span></td>
                        <td><span className="table-value">{reading.temperature_c.toFixed(1)} <small>°C</small></span></td>
                        <td><span className="table-value">{reading.smoke_ppm.toFixed(0)} <small>ppm</small></span></td>
                        <td><span className={`flame-state ${reading.flame_detected ? 'flame-detected' : 'flame-clear'}`}>{reading.flame_detected ? 'Detectada' : 'No detectada'}</span></td>
                        <td>{new Date(reading.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="telemetry-empty" aria-live="polite">
                {telemetryStatus === 'offline'
                  ? 'No se pudo conectar con la API. Revisa VITE_API_URL y que el backend esté activo.'
                  : telemetryStatus === 'loading'
                    ? 'Consultando la API...'
                    : 'La API responde, pero aún no ha recibido lecturas del ESP32.'}
              </div>
            )}
          </section>

          <section className="panel experiment-panel" id="experimentos">
            <div className="experiment-heading">
              <div>
                <div className="section-kicker">BIBLIOTECA DE MUESTRA</div>
                <h2>Experimentos <span className="count-pill">{filteredExperiments.length}</span></h2>
              </div>
              <div className="table-controls">
                <label className="search-field">
                  <Search size={16} />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar registros" aria-label="Buscar registros" />
                  <kbd>/</kbd>
                </label>
                <label className="filter-field"><SlidersHorizontal size={15} /><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filtrar por tipo"><option>Todos</option><option>Difusión</option><option>Gota</option><option>Sólido</option></select></label>
              </div>
            </div>

            <div className="table-scroll">
              <table>
                <thead><tr><th className="select-col">COMPARAR</th><th>REGISTRO</th><th>TIPO</th><th>COMBUSTIBLE</th><th>ÍNDICE RELATIVO</th><th>DEMORA DE IGNICIÓN</th><th>DURACIÓN</th></tr></thead>
                <tbody>
                  {filteredExperiments.map((experiment) => (
                    <tr key={experiment.id} className={selectedIds.includes(experiment.id) ? 'row-selected' : ''}>
                      <td><input className="compare-checkbox" type="checkbox" checked={selectedIds.includes(experiment.id)} onChange={() => toggleExperiment(experiment.id)} aria-label={`Comparar ${experiment.title}`} /></td>
                      <td><div className="record-name">{experiment.title}</div><div className="record-id">{experiment.id} · dato ficticio</div></td>
                      <td><span className="type-label">{experiment.type}</span></td>
                      <td>{experiment.fuel}</td>
                      <td><span className="table-value">{experiment.flameIndex} <small>u.a.</small></span></td>
                      <td>{experiment.ignitionDelay.toFixed(1)} <span className="table-unit">s</span></td>
                      <td>{experiment.burnTime} <span className="table-unit">s</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredExperiments.length === 0 && <div className="empty-table">No hay registros que coincidan con la búsqueda.</div>}
            </div>
            <div className="table-footer"><span><span className="selection-dot" /> {selectedExperiments.length} seleccionados para comparar</span><span>Todos los valores son ficticios <ArrowUpRight size={14} /></span></div>
          </section>

          <footer className="page-footer"><span>LLAMALAB <i>·</i> PROTOTIPO DE INVESTIGACIÓN</span><span>Datos simulados <i>·</i> No apto para uso operativo</span></footer>
        </div>
      </main>
    </div>
  )
}

export default App
