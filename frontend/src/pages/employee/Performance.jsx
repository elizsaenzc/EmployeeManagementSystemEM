import { useState } from 'react'
import { useAuth }   from '../../context/AuthContext'
import { useApi }    from '../../hooks/useApi'
import { performanceApi, employeesApi } from '../../services/api'
import { Topbar, Spinner, Empty, Modal } from '../../components/ui'

const SCORE_COLOR = s => {
  if (s >= 8.5) return 'var(--green)'
  if (s >= 7)   return 'var(--brand-light)'
  if (s >= 5)   return 'var(--amber)'
  return 'var(--red)'
}

function ScoreBar({ label, value }) {
  const pct = Math.round((value / 10) * 100)
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: SCORE_COLOR(value) }}>{value}/10</span>
      </div>
      <div className="attendance-bar">
        <div className="attendance-fill"
             style={{ width: `${pct}%`, background: SCORE_COLOR(value) }} />
      </div>
    </div>
  )
}

export default function Performance() {
  const { user }  = useAuth()
  const isManager = user?.role !== 'Employee'
  const empId     = user?.employeeId

  const [modal, setModal]   = useState(false)
  const [yearFilter, setYear] = useState(new Date().getFullYear())
  const [form, setForm]     = useState({
    employeeId: '', quarter: 1, year: new Date().getFullYear(),
    qualityScore: 7, efficiencyScore: 7, teamworkScore: 7, initiativeScore: 7,
    strengths: '', areasToImprove: '', goals: ''
  })

  const params = isManager ? { year: yearFilter } : { employeeId: empId, year: yearFilter }
  const { data: reviews, loading, refetch } = useApi(
    () => performanceApi.getAll(params), [empId, yearFilter]
  )
  const { data: employees } = useApi(employeesApi.getAll, [])

  const handleCreate = async () => {
    await performanceApi.create(form)
    setModal(false)
    refetch()
  }

  const f = (key, numeric = false) => e => setForm(p => ({
    ...p, [key]: numeric ? parseFloat(e.target.value) : e.target.value
  }))

  // Group by employee for cumulative view
  const byEmployee = (reviews ?? []).reduce((acc, r) => {
    const key = r.employeeId
    if (!acc[key]) acc[key] = { name: r.employeeName, dept: r.department, reviews: [] }
    acc[key].reviews.push(r)
    return acc
  }, {})

  const avg = arr => arr.length ? Math.round(arr.reduce((s,v) => s + v, 0) / arr.length * 10) / 10 : 0

  return (
    <>
      <Topbar title="Evaluación de desempeño">
        {isManager && (
          <button className="btn btn-primary" onClick={() => setModal(true)}>
            + Nueva evaluación
          </button>
        )}
      </Topbar>

      <div className="page section-gap">
        <div className="toolbar">
          <label className="form-label">Año</label>
          <select className="form-input" style={{ width: 'auto' }} value={yearFilter}
                  onChange={e => setYear(+e.target.value)}>
            {[2023,2024,2025].map(y => <option key={y}>{y}</option>)}
          </select>
          <span className="text-sm text-muted">{reviews?.length ?? 0} evaluaciones</span>
        </div>

        {loading ? <Spinner /> : !reviews?.length
          ? <Empty icon="📊" text="Sin evaluaciones para el periodo seleccionado" />
          : (
            <>
              {/* Cumulative summary cards */}
              {Object.values(byEmployee).map(emp => {
                const all = emp.reviews
                const cumulative = {
                  quality:    avg(all.map(r => r.qualityScore)),
                  efficiency: avg(all.map(r => r.efficiencyScore)),
                  teamwork:   avg(all.map(r => r.teamworkScore)),
                  initiative: avg(all.map(r => r.initiativeScore)),
                  overall:    avg(all.map(r => r.overallScore)),
                }
                return (
                  <div key={emp.name} className="card">
                    <div className="card-header">
                      <div>
                        <span className="card-title">{emp.name}</span>
                        <span className="text-muted text-sm" style={{ marginLeft: 8 }}>{emp.dept}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span className="text-sm text-muted">{all.length} trimestre(s)</span>
                        <div style={{
                          background: SCORE_COLOR(cumulative.overall) + '20',
                          color: SCORE_COLOR(cumulative.overall),
                          padding: '4px 14px', borderRadius: 20, fontWeight: 700, fontSize: 16
                        }}>
                          {cumulative.overall} / 10
                        </div>
                      </div>
                    </div>
                    <div className="card-body">
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                        <ScoreBar label="Calidad del trabajo" value={cumulative.quality} />
                        <ScoreBar label="Eficiencia"          value={cumulative.efficiency} />
                        <ScoreBar label="Trabajo en equipo"   value={cumulative.teamwork} />
                        <ScoreBar label="Iniciativa"          value={cumulative.initiative} />
                      </div>

                      {/* Individual quarterly reviews */}
                      <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                        <div className="text-sm text-muted" style={{ marginBottom: 10, fontWeight: 600 }}>
                          Detalle por trimestre
                        </div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {all.sort((a,b) => a.quarter - b.quarter).map(r => (
                            <div key={r.id} style={{
                              background: 'var(--surface2)', border: '1px solid var(--border)',
                              borderRadius: 8, padding: '10px 16px', minWidth: 120
                            }}>
                              <div className="text-sm text-muted">Q{r.quarter} {r.year}</div>
                              <div style={{ fontWeight: 700, fontSize: 18, color: SCORE_COLOR(r.overallScore) }}>
                                {r.overallScore}
                              </div>
                              {r.strengths && (
                                <div className="text-sm" style={{ marginTop: 6, color: 'var(--text2)', lineHeight: 1.5 }}>
                                  <strong>Fortalezas:</strong> {r.strengths}
                                </div>
                              )}
                              {r.goals && (
                                <div className="text-sm" style={{ marginTop: 4, color: 'var(--text2)' }}>
                                  <strong>Objetivos:</strong> {r.goals}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )
        }
      </div>

      {modal && (
        <Modal title="Nueva evaluación de desempeño" onClose={() => setModal(false)} wide
               footer={
                 <>
                   <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                   <button className="btn btn-primary" onClick={handleCreate}>Guardar evaluación</button>
                 </>
               }>
          <div className="form-grid" style={{ marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">Empleado</label>
              <select className="form-input" value={form.employeeId}
                      onChange={e => setForm(p => ({ ...p, employeeId: parseInt(e.target.value) }))}>
                <option value="">— Selecciona —</option>
                {employees?.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Trimestre</label>
              <select className="form-input" value={form.quarter}
                      onChange={e => setForm(p => ({ ...p, quarter: +e.target.value }))}>
                {[1,2,3,4].map(q => <option key={q} value={q}>Q{q}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Año</label>
              <select className="form-input" value={form.year}
                      onChange={e => setForm(p => ({ ...p, year: +e.target.value }))}>
                {[2024,2025].map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            {[
              ['qualityScore', 'Calidad del trabajo (0-10)'],
              ['efficiencyScore', 'Eficiencia (0-10)'],
              ['teamworkScore', 'Trabajo en equipo (0-10)'],
              ['initiativeScore', 'Iniciativa (0-10)'],
            ].map(([key, label]) => (
              <div key={key} className="form-group">
                <label className="form-label">{label}</label>
                <input className="form-input" type="number" min={0} max={10} step={0.1}
                       value={form[key]} onChange={f(key, true)} />
              </div>
            ))}
          </div>

          <div className="form-grid cols-1">
            <div className="form-group">
              <label className="form-label">Puntos fuertes</label>
              <textarea className="form-input" rows={2} value={form.strengths}
                        onChange={f('strengths')} style={{ resize: 'vertical' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Áreas de mejora</label>
              <textarea className="form-input" rows={2} value={form.areasToImprove}
                        onChange={f('areasToImprove')} style={{ resize: 'vertical' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Objetivos para próximo periodo</label>
              <textarea className="form-input" rows={2} value={form.goals}
                        onChange={f('goals')} style={{ resize: 'vertical' }} />
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
