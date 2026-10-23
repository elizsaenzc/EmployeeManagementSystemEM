import { useMemo, useState } from 'react'
import { Plus, ClipboardCheck, AlertCircle } from 'lucide-react'
import { useAuth }   from '../../context/AuthContext'
import { useApi, label, yearOptions } from '../../hooks/useApi'
import { performanceApi, employeesApi } from '../../services/api'
import { Topbar, Spinner, Empty, Modal } from '../../components/ui'

const SCORE_TONE = s => (s >= 8.5 ? 'green' : s >= 7 ? 'blue' : s >= 5 ? 'amber' : 'red')
const SCORE_COLOR = s => `var(--${{ green: 'green', blue: 'brand-light', amber: 'amber', red: 'red' }[SCORE_TONE(s)]})`
const prevQuarter = () => {
  const q = Math.floor(new Date().getMonth() / 3) + 1
  return q === 1 ? { quarter: 4, year: new Date().getFullYear() - 1 } : { quarter: q - 1, year: new Date().getFullYear() }
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
  const [error, setError]   = useState('')
  const [yearFilter, setYear] = useState(new Date().getFullYear())
  const [form, setForm]     = useState({
    employeeId: '', ...prevQuarter(),
    qualityScore: 7, efficiencyScore: 7, teamworkScore: 7, initiativeScore: 7,
    strengths: '', areasToImprove: '', goals: ''
  })

  const { data: reviews, loading, refetch } = useApi(
    () => performanceApi.getAll({ year: yearFilter }), [yearFilter]
  )
  const { data: employees } = useApi(employeesApi.getAll, [])
  // Coordinador: solo su equipo. RRHH/Admin: cualquiera. Nunca uno mismo.
  const assignable = useMemo(() => (employees ?? []).filter(e =>
    e.isActive && e.id !== empId && (user?.role !== 'Coordinator' || e.managerId === empId)), [employees, empId, user?.role])

  const handleCreate = async () => {
    if (!form.employeeId) { setError('Selecciona a quién evalúas.'); return }
    setError('')
    try {
      await performanceApi.create(form)
      setModal(false)
      refetch()
    } catch (e) {
      setError(e.response?.data?.message ?? 'No se pudo guardar la evaluación')
    }
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
          <button className="btn btn-primary" onClick={() => { setError(''); setModal(true) }}>
            <Plus size={16} /> Nueva evaluación
          </button>
        )}
      </Topbar>

      <div className="page section-gap">
        <div className="toolbar">
          <label className="form-label">Año</label>
          <select className="form-input w-auto" value={yearFilter} aria-label="Año"
                  onChange={e => setYear(+e.target.value)}>
            {yearOptions().map(y => <option key={y}>{y}</option>)}
          </select>
          <span className="text-sm text-muted">{reviews?.length ?? 0} evaluaciones</span>
        </div>

        {loading ? <Spinner /> : !reviews?.length
          ? <Empty icon={ClipboardCheck} text={`No hay evaluaciones de ${yearFilter}`} />
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
                        <span className="text-muted text-sm ml-8">{label(emp.dept)}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span className="text-sm text-muted">{all.length} {all.length === 1 ? 'trimestre' : 'trimestres'}</span>
                        <span className={`score-pill tone-${SCORE_TONE(cumulative.overall)}`}>{cumulative.overall} / 10</span>
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
                              <div className="text-sm text-muted">T{r.quarter} {r.year}</div>
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
          {error && <div className="alert alert-error mb-16"><AlertCircle size={16} /> {error}</div>}
          <div className="form-grid mb-16">
            <div className="form-group">
              <label className="form-label">Empleado</label>
              <select className="form-input" value={form.employeeId}
                      onChange={e => setForm(p => ({ ...p, employeeId: parseInt(e.target.value) }))}>
                <option value="">Selecciona</option>
                {assignable.map(e => <option key={e.id} value={e.id}>{e.fullName} · {e.position}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Trimestre</label>
              <select className="form-input" value={form.quarter}
                      onChange={e => setForm(p => ({ ...p, quarter: +e.target.value }))}>
                {[1, 2, 3, 4].map(q => <option key={q} value={q}>T{q}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Año</label>
              <select className="form-input" value={form.year}
                      onChange={e => setForm(p => ({ ...p, year: +e.target.value }))}>
                {yearOptions().map(y => <option key={y}>{y}</option>)}
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
