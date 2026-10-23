import { useMemo, useState } from 'react'
import { Plus, Check, X, CalendarCheck, Timer, AlertCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useApi, label, fmtDay, localISODate } from '../../hooks/useApi'
import { leavesApi, overtimeApi } from '../../services/api'
import { Topbar, Spinner, Empty, Modal, Badge, Tabs } from '../../components/ui'

const LEAVE_TYPES = [
  'Vacaciones', 'Permiso_Medico', 'Asunto_Personal', 'Asunto_Familiar',
  'Calamidad_Domestica', 'Permiso_Remunerado', 'Baja_por_Enfermedad',
]

const apiError = e => e.response?.data?.message ?? 'No se pudo completar la operación'

// Días laborables (lunes a viernes) entre dos fechas, ambas incluidas
function workingDays(from, to) {
  if (!from || !to || to < from) return 0
  let n = 0
  for (let d = new Date(from + 'T00:00:00'); d <= new Date(to + 'T00:00:00'); d.setDate(d.getDate() + 1))
    if (d.getDay() !== 0 && d.getDay() !== 6) n++
  return n
}

function LeaveTable({ rows, loading, showEmployee, canReview, me, onReview }) {
  if (loading) return <Spinner />
  if (!rows?.length) return <Empty icon={CalendarCheck} text="No hay solicitudes" />
  return (
    <div className="tbl-wrap">
      <table className="hr-tbl">
        <thead>
          <tr>
            {showEmployee && <th>Empleado</th>}
            <th>Tipo</th><th>Desde</th><th>Hasta</th><th className="text-right">Días</th><th>Motivo</th><th>Estado</th>
            {canReview && <th aria-label="Acciones" />}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              {showEmployee && <td className="fw-500">{r.employeeName}</td>}
              <td>{label(r.type)}</td>
              <td>{fmtDay(r.startDate)}</td>
              <td>{fmtDay(r.endDate)}</td>
              <td className="mono text-right">{r.totalDays}</td>
              <td className="text-muted">{r.reason || '—'}</td>
              <td>
                <Badge status={r.status} />
                {r.reviewerName && r.status !== 'Pendiente' && <div className="text-xs text-muted mt-4">por {r.reviewerName}</div>}
              </td>
              {canReview && (
                <td>
                  {r.status === 'Pendiente' && r.employeeId !== me && (
                    <div className="row-actions">
                      <button className="btn btn-success btn-sm" onClick={() => onReview(r.id, 'Aprobada')}><Check size={14} /> Aprobar</button>
                      <button className="btn btn-danger btn-sm" onClick={() => onReview(r.id, 'Rechazada')}><X size={14} /> Rechazar</button>
                    </div>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function LeavesPage() {
  const { user } = useAuth()
  const isManager = user?.role !== 'Employee'
  const empId = user?.employeeId

  const [tab, setTab]       = useState(isManager ? 'review' : 'mine')
  const [modal, setModal]   = useState(false)
  const [error, setError]   = useState('')
  const [formError, setFormError] = useState('')
  const [form, setForm]     = useState({ type: 'Vacaciones', startDate: '', endDate: '', reason: '' })

  // La API ya filtra por rol: empleado = las suyas, coordinador = su equipo, RRHH = todas
  const { data: leaves, loading, refetch } = useApi(leavesApi.getAll, [])
  const mine   = useMemo(() => (leaves ?? []).filter(r => r.employeeId === empId), [leaves, empId])
  const others = useMemo(() => (leaves ?? []).filter(r => r.employeeId !== empId), [leaves, empId])
  const pendingCount = others.filter(r => r.status === 'Pendiente').length
  const days = workingDays(form.startDate, form.endDate)

  const create = async () => {
    if (!form.startDate || !form.endDate) { setFormError('Indica las fechas de inicio y fin.'); return }
    if (days < 1) { setFormError('El periodo no incluye ningún día laborable.'); return }
    try {
      await leavesApi.create({ ...form, totalDays: days, employeeId: empId })
      setModal(false)
      setTab('mine')
      refetch()
    } catch (e) { setFormError(apiError(e)) }
  }

  const review = async (id, status) => {
    setError('')
    try { await leavesApi.review(id, { status, reviewNotes: null }); refetch() }
    catch (e) { setError(apiError(e)) }
  }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const tabs = [
    ...(isManager ? [{ id: 'review', label: user?.role === 'Coordinator' ? 'Mi equipo' : 'Todas', count: pendingCount }] : []),
    { id: 'mine', label: 'Mis solicitudes' },
  ]

  return (
    <>
      <Topbar title={isManager ? 'Permisos y vacaciones' : 'Mis vacaciones y permisos'}>
        <button className="btn btn-primary" onClick={() => {
          setForm({ type: 'Vacaciones', startDate: '', endDate: '', reason: '' }); setFormError(''); setModal(true)
        }}>
          <Plus size={16} /> Nueva solicitud
        </button>
      </Topbar>

      <div className="page section-gap">
        {error && <div className="alert alert-error"><AlertCircle size={16} /> {error}</div>}
        {isManager && <Tabs tabs={tabs} active={tab} onChange={setTab} />}
        <div className="card">
          {tab === 'review'
            ? <LeaveTable rows={others} loading={loading} showEmployee canReview me={empId} onReview={review} />
            : <LeaveTable rows={mine} loading={loading} />}
        </div>
      </div>

      {modal && (
        <Modal title="Nueva solicitud" onClose={() => setModal(false)}
               footer={<>
                 <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                 <button className="btn btn-primary" onClick={create}>Enviar solicitud</button>
               </>}>
          {formError && <div className="alert alert-error mb-16"><AlertCircle size={16} /> {formError}</div>}
          <div className="form-grid">
            <div className="form-group span-2">
              <label className="form-label">Tipo</label>
              <select className="form-input" value={form.type} onChange={f('type')}>
                {LEAVE_TYPES.map(t => <option key={t} value={t}>{label(t)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Desde</label>
              <input className="form-input" type="date" value={form.startDate} onChange={f('startDate')} />
            </div>
            <div className="form-group">
              <label className="form-label">Hasta</label>
              <input className="form-input" type="date" value={form.endDate} min={form.startDate} onChange={f('endDate')} />
            </div>
            <div className="form-group span-2">
              <label className="form-label">Motivo <span className="text-muted">(opcional)</span></label>
              <input className="form-input" value={form.reason} onChange={f('reason')} />
            </div>
          </div>
          <p className="text-sm text-muted mt-12">
            {days > 0 ? `${days} ${days === 1 ? 'día laborable' : 'días laborables'}. ` : ''}
            Para permisos médicos o por calamidad doméstica, aporta el justificante a RRHH.
          </p>
        </Modal>
      )}
    </>
  )
}

export function OvertimePage() {
  const { user } = useAuth()
  const isManager = user?.role !== 'Employee'
  const empId = user?.employeeId

  const [modal, setModal]   = useState(false)
  const [error, setError]   = useState('')
  const [formError, setFormError] = useState('')
  const [form, setForm]     = useState({ date: localISODate(), hours: 1, reason: '' })

  const { data, loading, refetch } = useApi(overtimeApi.getAll, [])

  const create = async () => {
    if (!form.date || !(form.hours > 0)) { setFormError('Indica la fecha y las horas.'); return }
    try {
      await overtimeApi.create({ ...form, employeeId: empId })
      setModal(false)
      refetch()
    } catch (e) { setFormError(apiError(e)) }
  }

  const approve = async id => {
    setError('')
    try { await overtimeApi.approve(id); refetch() }
    catch (e) { setError(apiError(e)) }
  }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <>
      <Topbar title="Horas extra">
        <button className="btn btn-primary" onClick={() => { setFormError(''); setModal(true) }}>
          <Plus size={16} /> Registrar horas
        </button>
      </Topbar>

      <div className="page section-gap">
        {error && <div className="alert alert-error"><AlertCircle size={16} /> {error}</div>}
        <div className="card">
          {loading ? <Spinner /> : !data?.length ? <Empty icon={Timer} text="No hay horas extra registradas" /> : (
            <div className="tbl-wrap">
              <table className="hr-tbl">
                <thead>
                  <tr>
                    {isManager && <th>Empleado</th>}
                    <th>Día</th><th className="text-right">Horas</th><th>Motivo</th><th>Estado</th>
                    {isManager && <th aria-label="Acciones" />}
                  </tr>
                </thead>
                <tbody>
                  {data.map(o => (
                    <tr key={o.id}>
                      {isManager && <td className="fw-500">{o.employeeName}</td>}
                      <td>{fmtDay(o.date)}</td>
                      <td className="mono text-right fw-600">{o.hours} h</td>
                      <td className="text-muted">{o.reason || '—'}</td>
                      <td><span className={`badge ${o.approved ? 'badge-green' : 'badge-amber'}`}>{o.approved ? 'Aprobadas' : 'Pendientes'}</span></td>
                      {isManager && (
                        <td>
                          {!o.approved && o.employeeId !== empId && (
                            <button className="btn btn-success btn-sm" onClick={() => approve(o.id)}><Check size={14} /> Aprobar</button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <Modal title="Registrar horas extra" onClose={() => setModal(false)}
               footer={<>
                 <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                 <button className="btn btn-primary" onClick={create}>Enviar</button>
               </>}>
          {formError && <div className="alert alert-error mb-16"><AlertCircle size={16} /> {formError}</div>}
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Día</label>
              <input className="form-input" type="date" value={form.date} max={localISODate()} onChange={f('date')} />
            </div>
            <div className="form-group">
              <label className="form-label">Horas</label>
              <input className="form-input" type="number" step="0.5" min="0.5" max="12" value={form.hours}
                     onChange={e => setForm(p => ({ ...p, hours: +e.target.value }))} />
            </div>
            <div className="form-group span-2">
              <label className="form-label">Trabajo realizado</label>
              <input className="form-input" value={form.reason} onChange={f('reason')} />
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
