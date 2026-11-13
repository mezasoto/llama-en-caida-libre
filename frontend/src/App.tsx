                    <span className="oxygen-current-marker" style={{ left: `${oxygenMarker}%` }} />
                  </div>
                  <div className="range-ends oxygen-ends"><span>12% · LOI</span><span>30% · ensayo</span></div>
                  <p className="control-context">{oxygenDescription}</p>
                </div>
                <div className="control-block compact-control">
                  <div className="control-label-row"><label htmlFor="temperature-range">Temperatura</label><output htmlFor="temperature-range">{temperatureC} °C</output></div>
                  <input id="temperature-range" className="science-range temperature-range" type="range" min="10" max="45" step="1" value={temperatureC} onChange={(event) => setTemperatureC(Number(event.target.value))} />
                  <div className="range-ends"><span>10 °C</span><span>45 °C</span></div>
                </div>
                <div className="control-block compact-control">
                  <div className="control-label-row"><label htmlFor="airflow-range">Flujo de aire</label><output htmlFor="airflow-range">{airflowMps.toFixed(2)} m/s</output></div>
                  <input id="airflow-range" className="science-range airflow-range" type="range" min="0" max="1.2" step="0.05" value={airflowMps} onChange={(event) => setAirflowMps(Number(event.target.value))} />
                  <div className="range-ends"><span>Difusión</span><span>1.2 m/s</span></div>
                </div>
                <div className="control-block compact-control">
                  <div className="control-label-row"><label htmlFor="ventilation-range">Ventilación</label><output htmlFor="ventilation-range">{ventilationPercent}%</output></div>
                  <input id="ventilation-range" className="science-range ventilation-range" type="range" min="0" max="100" step="5" value={ventilationPercent} onChange={(event) => setVentilationPercent(Number(event.target.value))} />
                  <div className="range-ends"><span>Cerrada</span><span>Abierta</span></div>
                </div>
                <div className="simulation-chart">
                  <div className="simulation-chart-heading"><span>RESPUESTA DEL MODELO · 56 s</span><span>cualitativo</span></div>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={combustionSeries} margin={{ top: 6, right: 2, left: -27, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#dfe6df" strokeDasharray="3 4" />
                      <XAxis dataKey="time" hide />
                      <YAxis domain={[0, 100]} tick={{ fill: '#879287', fontSize: 7 }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip contentStyle={{ border: '1px solid #dfe5dd', borderRadius: 4, fontSize: 9 }} />
                      <Line type="monotone" dataKey="intensidad" name="Intensidad relativa" stroke="#dc754e" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="transporte" name="Transporte" stroke="#4f98a1" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
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
                <div className="telemetry-empty" aria-live="polite">{telemetryStatus === 'offline' ? 'No hay conexión con la API.' : telemetryStatus === 'loading' ? 'Consultando la API…' : 'Inicia Wokwi para enviar la primera lectura.'}</div>
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
            {assistantError && <div className="assistant-error" role="status"><CircleAlert size={15} /><span>{assistantError}{assistantError.toLowerCase().includes('no está configurado') ? ' Revisa GROQ_API_KEY o GEMINI_API_KEY en las variables de entorno de Azure App Service.' : ' Revisa los registros de Azure App Service y las variables de IA configuradas.'}</span></div>}
            <div className="assistant-scope">La IA recibe gravedad, oxígeno, lecturas simuladas recientes y los dos informes citados. No emite recomendaciones operativas ni sustituye validación de ingeniería.</div>
          </section>

          <footer className="page-footer"><span>LLAMALAB <i>·</i> INVESTIGACIÓN ESPACIAL</span><span>Modelo 3D conceptual <i>·</i> Wokwi no son datos NASA</span></footer>
        </div>
      </main>
    </div>
