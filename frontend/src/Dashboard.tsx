import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  BookOpenText,
  CircleAlert,
  Database,
  ExternalLink,
  Flame,
  Gauge,
  Orbit,
  Radio,
  Search,
  Send,
  Sparkles,
  Wind,
} from 'lucide-react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './App.css'

const FlameScene = lazy(() =>
  import('./components/FlameScene').then((module) => ({ default: module.FlameScene })),
)

type TelemetryRecord = {
  id: number
  device_id: string
  temperature_c: number
  smoke_ppm: number
  flame_detected: boolean
  created_at: string
}

type TelemetryStatus = 'loading' | 'online' | 'empty' | 'offline'

type NasaReference = {
  id: string
  year: string
  title: string
  reportNumber: string
  abstract: string
  center: string
  authors: string[]
  href: string
}

type NasaSearchStatus = 'loading' | 'online' | 'offline'

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '')

const initialNasaReferences: NasaReference[] = [
  {
    id: '20150023456',
    year: '2015',
    title: 'Detailed Results from the Flame Extinguishment Experiment (FLEX)',
    reportNumber: 'NASA/TP-2015-216046',
    abstract: 'Describe el equipo y los métodos de análisis, y publica resultados de los primeros 284 ensayos FLEX para uso de la comunidad científica.',
    center: 'NASA Glenn Research Center',
    authors: ['Daniel L. Dietrich', 'Paul V. Ferkul', 'Victoria M. Bryg'],
    href: 'https://ntrs.nasa.gov/citations/20150023456',
  },
  {
    id: '20130014061',
    year: '2013',
    title: 'Methanol Droplet Combustion in Oxygen-Inert Environments in Microgravity',
    reportNumber: 'NASA NTRS · 20130014061',
    abstract: 'En las mezclas y condiciones estudiadas, el LOI del metanol fue aproximadamente 12–13 % de O₂; no es un umbral universal ni una regla operativa.',
    center: 'NASA Glenn Research Center',
    authors: ['Vedha Nayagam', 'Daniel L. Dietrich', 'Michael C. Hicks'],
    href: 'https://ntrs.nasa.gov/citations/20130014061',
  },
]

const formatClock = (value: string) =>
  new Date(value).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

function App() {
  const [telemetry, setTelemetry] = useState<TelemetryRecord[]>([])
  const [telemetryStatus, setTelemetryStatus] = useState<TelemetryStatus>('loading')
  const [gravityG, setGravityG] = useState(0.01)
  const [oxygenPercent, setOxygenPercent] = useState(21)
  const [sourceQuery, setSourceQuery] = useState('')
  const [nasaReferences, setNasaReferences] = useState(initialNasaReferences)
  const [nasaSearchStatus, setNasaSearchStatus] = useState<NasaSearchStatus>('loading')
  const [question, setQuestion] = useState('¿Qué cambia al reducir la gravedad?')
  const [answer, setAnswer] = useState<{ text: string; sources: string[] } | null>(null)
  const [assistantStatus, setAssistantStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [assistantError, setAssistantError] = useState('')

  useEffect(() => {
    let isCurrent = true

    const loadTelemetry = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/telemetry`)
        if (!response.ok) throw new Error('No se pudo consultar la API')
        const result = (await response.json()) as { data?: TelemetryRecord[] }
        if (!Array.isArray(result.data)) throw new Error('Respuesta de telemetría inválida')
        if (isCurrent) {
          setTelemetry(result.data)
          setTelemetryStatus(result.data.length ? 'online' : 'empty')
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

  useEffect(() => {
    let isCurrent = true
    const controller = new AbortController()
    const query = sourceQuery.trim() || 'Flame Extinguishment Experiment FLEX microgravity'
    setNasaSearchStatus('loading')

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `${apiBaseUrl}/api/nasa/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        )
        if (!response.ok) throw new Error('NASA NTRS search request failed')

        const result = (await response.json()) as { data?: NasaReference[] }
        if (!Array.isArray(result.data)) throw new Error('Unexpected NASA NTRS response')

        if (isCurrent) {
          setNasaReferences(result.data)
          setNasaSearchStatus('online')
        }
      } catch {
        if (isCurrent && !controller.signal.aborted) {
          setNasaReferences(initialNasaReferences)
          setNasaSearchStatus('offline')
        }
      }
    }, 350)

    return () => {
      isCurrent = false
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [sourceQuery])

  const telemetryChartData = useMemo(
    () => telemetry.slice(0, 20).reverse().map((record) => ({
      ...record,
      time: formatClock(record.created_at),
    })),
    [telemetry],
  )

  const latestReading = telemetry[0]
  const gravityDescription = gravityG < 0.1
    ? 'La flotabilidad casi desaparece; el transporte alrededor de la gota se representa como difusión radial.'
    : gravityG > 0.75
      ? 'La flotabilidad domina; el modelo estira la zona de llama en dirección ascendente.'
      : 'Régimen intermedio ilustrativo: cambian gradualmente la forma y las trayectorias de transporte.'
  const oxygenMarker = ((oxygenPercent - 12) / 18) * 100
  const oxygenDescription = oxygenPercent <= 13
    ? 'En el intervalo LOI reportado para metanol en ese estudio.'
    : 'Por encima del intervalo LOI reportado para metanol en ese estudio.'

  const askAssistant = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!question.trim() || assistantStatus === 'loading') return

    setAssistantStatus('loading')
    setAssistantError('')
    setAnswer(null)

    try {
      const response = await fetch(`${apiBaseUrl}/api/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          gravityG,
          oxygenPercent,
          telemetry: telemetry.slice(0, 5),
        }),
      })
      const result = (await response.json()) as { answer?: string; sources?: string[]; error?: string }
      if (!response.ok) throw new Error(result.error || 'No se pudo generar el análisis.')
      setAnswer({
        text: result.answer || 'No se recibió una respuesta del asistente.',
        sources: result.sources ?? [],
      })
      setAssistantStatus('idle')
    } catch (error) {
      setAssistantError(error instanceof Error ? error.message : 'Error al consultar el asistente.')
      setAssistantStatus('error')
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#inicio" aria-label="LlamaLab, inicio">
          <span className="brand-mark"><Flame size={21} strokeWidth={2.2} /></span>
          <span className="brand-name">LLAMA<span>LAB</span></span>
        </a>
        <div className="workspace-label">OBSERVATORIO DE FUEGO</div>
        <nav className="side-nav" aria-label="Navegación principal">
          <a className="nav-item active" href="#simulacion"><Orbit size={17} /> Simulación 3D</a>
          <a className="nav-item" href="#evidencia"><BookOpenText size={17} /> Evidencia NASA</a>
          <a className="nav-item" href="#telemetria"><Radio size={17} /> Telemetría</a>
          <a className="nav-item" href="#asistente"><Sparkles size={17} /> Asistente IA</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="mission-card">
            <div className="mission-icon"><Database size={16} /></div>
            <div><strong>NASA NTRS + Wokwi</strong><span>Fuentes diferenciadas</span></div>
            <span className="status-dot status-connected" />
          </div>
          <div className="team-chip"><span className="team-avatar">LL</span><span>Equipo Llama</span><span className="team-menu">···</span></div>
        </div>
      </aside>

      <main className="main-content" id="inicio">
        <header className="topbar">
          <div className="breadcrumb">Exploración espacial <span>/</span> <strong>Seguridad contra incendios</strong></div>
          <div className="topbar-right">
            <span className="demo-label"><span /> MODELO CONCEPTUAL</span>
            <a className="icon-button source-icon" href="https://ntrs.nasa.gov/search?q=FLEX%20microgravity%20combustion" target="_blank" rel="noreferrer" aria-label="Abrir búsqueda NASA NTRS" title="Abrir NASA NTRS"><ExternalLink size={16} /></a>
          </div>
        </header>

        <div className="content-wrap">
          <section className="page-heading dashboard-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> NASA SPACE APPS · FLAME IN FREEFALL</div>
              <h1>Cuando la llama <em>pierde arriba</em></h1>
              <p>Explora cómo gravedad y oxígeno cambian el transporte de calor y materia alrededor de una gota.</p>
            </div>
            <div className="live-status"><span className={`pulse-dot pulse-${telemetryStatus}`} />{telemetryStatus === 'online' ? `${telemetry.length} lecturas Wokwi` : telemetryStatus === 'empty' ? 'Wokwi conectado · sin lecturas' : telemetryStatus === 'loading' ? 'Conectando telemetría' : 'Telemetría sin conexión'}</div>
          </section>

          <div className="truth-banner" role="note">
            <CircleAlert size={16} />
            <span><strong>Dos capas, dos niveles de evidencia.</strong> La escena 3D es cualitativa; los valores NASA se citan desde NTRS y las mediciones ESP32 están marcadas como simuladas.</span>
          </div>

          <section className="metric-grid science-metrics" aria-label="Indicadores de evidencia">
            <article className="metric-card">
              <div className="metric-top"><span>ENSAYOS EN REPORTE FLEX</span><Flame size={16} /></div>
              <div className="metric-value">284</div>
              <div className="metric-foot">Resultados descritos en NASA/TP-2015-216046</div>
            </article>
            <article className="metric-card">
              <div className="metric-top"><span>LOI METANOL · ESTUDIO FLEX</span><Wind size={16} /></div>
              <div className="metric-value">12–13<small>% O₂</small></div>
              <div className="metric-foot">Mezclas y condiciones específicas · no universal</div>
            </article>
            <article className="metric-card">
              <div className="metric-top"><span>TELEMETRÍA WOKWI</span><Radio size={16} /></div>
              <div className="metric-value">{telemetry.length.toString().padStart(2, '0')}</div>
              <div className="metric-foot"><span className={`pulse-dot pulse-${telemetryStatus}`} /> {telemetryStatus === 'online' ? 'Lecturas simuladas recibidas' : telemetryStatus === 'empty' ? 'Sin lecturas aún' : telemetryStatus === 'loading' ? 'Consultando API' : 'API sin conexión'}</div>
            </article>
            <article className="metric-card metric-card-accent">
              <div className="metric-top"><span>ESCENARIO 3D</span><Gauge size={16} /></div>
              <div className="metric-value metric-demo">{gravityG < 0.1 ? 'DIFUSIVO' : gravityG > 0.75 ? 'CONVECTIVO' : 'TRANSICIÓN'}</div>
              <div className="metric-foot">Gravedad configurada: {gravityG.toFixed(2)} g</div>
            </article>
          </section>

          <section className="panel simulation-panel" id="simulacion">
            <div className="simulation-heading">
              <div>
                <div className="section-kicker">LABORATORIO VISUAL · GOTA DE METANOL</div>
                <h2>Gravedad cambia el transporte</h2>
              </div>
              <span className="model-badge"><span /> MODELO CUALITATIVO · NO CFD</span>
            </div>
            <div className="simulation-grid">
              <div className="flame-viewport">
                <Suspense fallback={<div className="flame-scene-fallback">Cargando escena 3D…</div>}>
                  <FlameScene gravityG={gravityG} oxygenPercent={oxygenPercent} />
                </Suspense>
                <div className="scene-readout scene-readout-top"><span className="scene-readout-dot" /> CÁMARA DE COMBUSTIÓN</div>
                <div className="scene-readout scene-readout-bottom"><span>G = {gravityG.toFixed(2)} g</span><span>O₂ = {oxygenPercent}%</span><span>{gravityG < 0.1 ? 'DIFUSIÓN RADIAL' : 'EMPUJE ASCENDENTE'}</span></div>
                <div className="scene-axis-label">Y · GRAVEDAD</div>
              </div>
              <div className="simulation-controls">
                <div className="control-heading"><span>PARÁMETROS DEL ESCENARIO</span><span className="control-live">EN VIVO</span></div>
                <div className="control-block">
                  <div className="control-label-row"><label htmlFor="gravity-range">Gravedad</label><output htmlFor="gravity-range">{gravityG.toFixed(2)} g</output></div>
                  <div className="preset-row" role="group" aria-label="Presets de gravedad">
                    <button className={gravityG < 0.1 ? 'preset-active' : ''} type="button" onClick={() => setGravityG(0.01)}>Micro · 0.01 g</button>
                    <button className={gravityG > 0.75 ? 'preset-active' : ''} type="button" onClick={() => setGravityG(1)}>Tierra · 1 g</button>
                  </div>
                  <input id="gravity-range" className="science-range gravity-range" type="range" min="0.01" max="1" step="0.01" value={gravityG} onChange={(event) => setGravityG(Number(event.target.value))} />
                  <div className="range-ends"><span>Microgravedad</span><span>1 g</span></div>
                </div>
                <div className="control-block oxygen-control">
                  <div className="control-label-row"><label htmlFor="oxygen-range">Oxígeno ambiente</label><output htmlFor="oxygen-range">{oxygenPercent}%</output></div>
                  <input id="oxygen-range" className="science-range oxygen-range" type="range" min="12" max="30" step="1" value={oxygenPercent} onChange={(event) => setOxygenPercent(Number(event.target.value))} />
                  <div className="oxygen-reference-track" aria-label="Rango de oxígeno estudiado de 12 a 30 por ciento">
                    <span className="oxygen-reference-band" />
                    <span className="oxygen-loi-band" />
                    <span className="oxygen-current-marker" style={{ left: `${oxygenMarker}%` }} />
                  </div>
                  <div className="range-ends oxygen-ends"><span>12% · LOI</span><span>30% · ensayo</span></div>
                  <p className="control-context">{oxygenDescription}</p>
                </div>
                <div className="transport-note">
                  {gravityG < 0.1 ? <Orbit size={16} /> : <ArrowUpRight size={16} />}
                  <p>{gravityDescription}</p>
                </div>
                <p className="model-caveat">Las dimensiones, intensidad y partículas ilustran tendencias; no predicen ignición, extinción ni riesgo de misión.</p>
              </div>
            </div>
            <div className="scene-legend"><span><i className="legend-droplet" /> Gota de combustible</span><span><i className="legend-reaction" /> Zona de reacción</span><span><i className="legend-flow" /> Transporte cualitativo</span><span>Arrastra la escena para rotar</span></div>
          </section>

          <section className="analysis-grid science-analysis" id="evidencia">
            <article className="panel oxygen-panel">
              <div className="panel-heading">
                <div><div className="section-kicker">EVIDENCIA EXPERIMENTAL · NASA NTRS 20130014061</div><h2>Oxígeno límite en metanol</h2></div>
                <span className="unit-tag">% EN VOLUMEN</span>
              </div>
              <p className="evidence-intro">El informe estudia gotas de metanol en microgravedad y mezclas con O₂, N₂ y diluyentes. En esas condiciones, el LOI reportado fue ~12–13 % de O₂.</p>
              <div className="evidence-chart" role="img" aria-label={`Oxígeno actual ${oxygenPercent} por ciento; LOI de metanol reportado de 12 a 13 por ciento y rango de ensayo de 12 a 30 por ciento`}>
                <div className="evidence-chart-label"><span>LOI publicado</span><strong>12–13%</strong></div>
                <div className="evidence-axis"><span className="evidence-axis-base" /><span className="evidence-test-band" /><span className="evidence-loi-band" /><span className="evidence-cursor" style={{ left: `${oxygenMarker}%` }}><i /></span></div>
                <div className="evidence-ticks"><span>12</span><span>13</span><span>20</span><span>30</span></div>
                <div className="evidence-current"><span>Escenario actual</span><strong>{oxygenPercent}% O₂</strong></div>
              </div>
              <div className="scope-warning"><CircleAlert size={15} /><span>Es un resultado de metanol en una configuración experimental específica. No es un umbral universal ni una concentración segura para una nave.</span></div>
              <a className="citation-link" href="https://ntrs.nasa.gov/citations/20130014061" target="_blank" rel="noreferrer">Abrir informe NASA NTRS <ExternalLink size={14} /></a>
            </article>

            <article className="panel telemetry-analysis" id="telemetria">
              <div className="panel-heading">
                <div><div className="section-kicker">DATOS DE SIMULADOR · NO NASA</div><h2>Telemetría ESP32 reciente</h2></div>
                <span className={`connection-tag connection-${telemetryStatus}`}><span />{telemetryStatus === 'online' ? 'En vivo' : telemetryStatus === 'empty' ? 'Sin datos' : telemetryStatus === 'loading' ? 'Conectando' : 'Offline'}</span>
              </div>
              {telemetryChartData.length ? (
                <div className="telemetry-chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={telemetryChartData} margin={{ top: 12, right: 4, left: -18, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#e8e8e1" strokeDasharray="3 5" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#73766f', fontSize: 9 }} />
                      <YAxis yAxisId="temperature" axisLine={false} tickLine={false} tick={{ fill: '#73766f', fontSize: 9 }} width={38} />
                      <YAxis yAxisId="smoke" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#73766f', fontSize: 9 }} width={38} />
                      <Tooltip contentStyle={{ border: '1px solid #dfe1d9', borderRadius: 4, fontSize: 10 }} />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                      <Line yAxisId="temperature" type="monotone" dataKey="temperature_c" name="Temperatura °C" stroke="#de7550" strokeWidth={2} dot={{ r: 2 }} />
                      <Line yAxisId="smoke" type="monotone" dataKey="smoke_ppm" name="Humo ppm" stroke="#45899a" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="telemetry-empty" aria-live="polite">{telemetryStatus === 'offline' ? 'No hay conexión con la API.' : telemetryStatus === 'loading' ? 'Consultando Render…' : 'Inicia Wokwi para enviar la primera lectura.'}</div>
              )}
              <div className="telemetry-footnote"><span className="simulated-dot" /> ESP32 Wokwi · refresco cada 10 s <span>{latestReading ? `Última: ${latestReading.temperature_c.toFixed(1)} °C · ${latestReading.smoke_ppm} ppm` : 'Sin última lectura'}</span></div>
            </article>
          </section>

          <section className="panel references-panel">
            <div className="references-heading">
              <div><div className="section-kicker">BIBLIOTECA DE FUENTES PRIMARIAS</div><h2>Informes que respaldan la lectura</h2></div>
              <div className="reference-search-group">
                <label className="search-field reference-search"><Search size={15} /><input value={sourceQuery} maxLength={120} onChange={(event) => setSourceQuery(event.target.value)} placeholder="Buscar FLEX, metanol…" aria-label="Buscar referencias NASA" /></label>
                <span className={`ntrs-status ntrs-${nasaSearchStatus}`}><i />{nasaSearchStatus === 'online' ? 'NASA NTRS en vivo' : nasaSearchStatus === 'loading' ? 'Buscando NTRS…' : 'Fuentes locales · NTRS offline'}</span>
              </div>
            </div>
            <div className="reference-list">
              {nasaReferences.map((reference) => (
                <article className="reference-row" key={reference.id}>
                  <div className="reference-year">{reference.year}<span>NASA NTRS</span></div>
                  <div className="reference-copy"><h3>{reference.title}</h3><p>{reference.abstract || 'Sin abstract disponible en el catálogo.'}</p><span>{reference.reportNumber} · {reference.center}</span></div>
                  <a href={reference.href} target="_blank" rel="noreferrer" className="reference-open" aria-label={`Abrir ${reference.title}`}><ExternalLink size={16} /></a>
                </article>
              ))}
              {nasaReferences.length === 0 && <div className="empty-table">No hay fuentes que coincidan con la búsqueda.</div>}
            </div>
            <div className="references-foot"><BookOpenText size={14} /> El reto aún no publica su propio paquete de datos; estas fichas enlazan a informes públicos de NASA NTRS.</div>
          </section>

          <section className="panel assistant-panel" id="asistente">
            <div className="assistant-heading">
              <div className="ai-icon"><Sparkles size={17} /></div>
              <div><div className="section-kicker">SÍNTESIS ASISTIDA · CON CITAS</div><h2>Pregunta sobre el escenario</h2></div>
              <span className="preview-tag">NASA NTRS + WOKWI</span>
            </div>
            <form className="assistant-form" onSubmit={askAssistant}>
              <label className="sr-only" htmlFor="science-question">Pregunta de investigación</label>
              <input id="science-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={400} placeholder="Ej.: ¿Qué significa el LOI de metanol para este escenario?" />
              <button type="submit" disabled={assistantStatus === 'loading' || !question.trim()}><Send size={15} />{assistantStatus === 'loading' ? 'Analizando…' : 'Analizar'}</button>
            </form>
              {answer && <div className="assistant-answer" aria-live="polite"><Sparkles size={15} /><div><p>{answer.text}</p>{answer.sources.length > 0 && <div className="assistant-citations">Fuentes: {answer.sources.map((source) => <a href={source} target="_blank" rel="noreferrer" key={source}>NASA NTRS <ExternalLink size={11} /></a>)}</div>}</div></div>}
            {assistantError && <div className="assistant-error" role="status"><CircleAlert size={15} /><span>{assistantError}{assistantError.toLowerCase().includes('no está configurado') ? ' Revisa GEMINI_API_KEY en el Web Service del backend.' : ' Revisa el error más reciente de Gemini en los logs del Web Service.'}</span></div>}
            <div className="assistant-scope">La IA recibe gravedad, oxígeno, lecturas simuladas recientes y los dos informes citados. No emite recomendaciones operativas ni sustituye validación de ingeniería.</div>
          </section>

          <footer className="page-footer"><span>LLAMALAB <i>·</i> INVESTIGACIÓN ESPACIAL</span><span>Modelo 3D conceptual <i>·</i> Wokwi no son datos NASA</span></footer>
        </div>
      </main>
    </div>
  )
}

export default App