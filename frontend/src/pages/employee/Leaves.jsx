import { useState }    from 'react'
import { useAuth }     from '../../context/AuthContext'
import { useApi }      from '../../hooks/useApi'
import { leavesApi, overtimeApi, employeesApi } from '../../services/api'
import { Topbar, Spinner, Empty, Modal, Badge, Tabs } from '../../components/ui'

// ── Leave types ──────────────────────────────────────────────────────────────
const LEAVE_TYPES = [
  'Vacaciones','Permiso_Medico','Asunto_Personal','Asunto_Familiar',
  'Calamidad_Domestica','Permiso_Remunerado','Baja_por_Enfermedad'
]

const LEAVE_LABELS = {
  Vacaciones: 'Vacaciones',
  Permiso_Medico: 'Permiso médico',
  Asunto_Personal: 'Asunto personal',
  Asunto_Familiar: 'Asunto familiar',
  Calamidad_Domestica: 'Calamidad doméstica',
  Permiso_Remunerado: 'Permiso remunerado',
  Baja_por_Enfermedad: 'Baja por enfermedad'
}

export function LeavesPage() {
  const { user } = useAuth()
  const isManager = user?.role !== 'Employee'
  const empId     = user?.employeeId

  const [tab,    setTab]    = useState('mine')
  const [modal,  setModal]  = useState(false)
  const [form,   setForm]   = useState({ type: 'Vacaciones', startDate: '', endDate: '', totalDays: 1, reason: '' })

  const myParams  = { employeeId: empId }
  const allParams = {}

  const { data: myLeaves,  loading: loadingMine,  refetch: refetchMine  } = useApi(() => leavesApi.getAll(myParams),  [empId])
  const { data: allLeaves, loading: loadingAll,   refetch: refetchAll   } = useApi(() => leavesApi.getAll(allParams), [])

  const handleCreate = async () => {
    await leavesApi.create({ ...form, employeeId: empId })
    setModal(false)
    refetchMine()
  }

  const handleReview = async (id, status, notes = '') => {
    await leavesApi.review(id, { status, reviewNotes: notes || null })
    refetchAll()
    refetchMine()
  }

  const f = k => e => setForm(p => ({ ...p, [k]: typeof e === 'string' ? e : e.target.value }))

  const tabDefs = [
    { id: 'mine', label: 'Mis solicitudes' },
    ...(isManager ? [{ id: 'all', label: 'Todas', count: allLeaves?.filter(r => r.status === 'Pendiente').length }] : [])
  ]

  const LeaveTable = ({ data, loading, showEmployee, showActions }) => (
    loading ? <Spinner /> : !data?.length ? <Empty icon="🌴" text="Sin solicitudes" /> : (
      <div className="tbl-wrap">
        <table className="hr-tbl">
          <thead>
            <tr>
              {showEmployee && <th>Empleado</th>}
              <th>Tipo</th>
              <th>Desde</th>
              <th>Hasta</th>
              <th>Días</th>
              <th>Motivo</th>
              <th>Estado</th>
              {showActions && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {data.map(r => (
              <tr key={r.id}>
                {showEmployee && <td style={{ fontWeight: 500 }}>{r.employeeName}</td>}
                <td>{LEAVE_LABELS[r.type] ?? r.type}</td>
                <td className="mono">{r.startDate}</td>
                <td className="mono">{r.endDate}</td>
                <td>{r.totalDays}</td>
                <td className="text-muted">{r.reason ?? '—'}</td>
                <td><Badge status={r.status} /></td>
                {showActions && r.status === 'Pendiente' && (
                  <td>
                    <div className="flex gap-8">
                      <button className="btn btn-success btn-sm" onClick={() => handleReview(r.id, 'Aprobada')}>✓ Aprobar</button>
                      <button className="btn btn-danger btn-sm"  onClick={() => handleReview(r.id, 'Rechazada')}>✗ Rechazar</button>
                    </div>
                  </td>
                )}
                {showActions && r.status !== 'Pendiente' && <td><Badge status={r.status} /></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  )

  return (
    <>
      <Topbar title="Permisos y vacaciones">
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Solicitar permiso</button>
      </Topbar>

      <div className="page section-gap">
        <Tabs tabs={tabDefs} active={tab} onChange={setTab} />

        <div className="card">
          {tab === 'mine' && <LeaveTable data={myLeaves} loading={loadingMine} showEmployee={false} showActions={false} />}
          {tab === 'all'  && <LeaveTable data={allLeaves} loading={loadingAll} showEmployee showActions={isManager} />}
        </div>
      </div>

      {modal && (
        <Modal title="Nueva solicitud de permiso" onClose={() => setModal(false)}
               footer={<>
                 <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                 <button className="btn btn-primary" onClick={handleCreate}>Enviar solicitud</button>
               </>}>
          <div className="form-grid">
            <div className="form-group span-2">
              <label className="form-label">Tipo de permiso</label>
              <select className="form-input" value={form.type} onChange={f('type')}>
                {LEAVE_TYPES.map(t => <option key={t} value={t}>{LEAVE_LABELS[t]}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Fecha de inicio</label>
              <input className="form-input" type="date" value={form.startDate} onChange={f('startDate')} />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha de fin</label>
              <input className="form-input" type="date" value={form.endDate} onChange={f('endDate')} />
            </div>
            <div className="form-group">
              <label className="form-label">Días laborables</label>
              <input className="form-input" type="number" min={1} value={form.totalDays}
                     onChange={e => setForm(p => ({ ...p, totalDays: +e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Motivo</label>
              <input className="form-input" value={form.reason} onChange={f('reason')} placeholder="Opcional" />
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 12 }}>
            Las solicitudes de tipo médico o calamidad doméstica son permisos remunerados. Recuerda adjuntar el justificante correspondiente cuando sea posible.
          </p>
        </Modal>
      )}
    </>
  )
}

// ── Overtime ──────────────────────────────────────────────────────────────────
export function OvertimePage() {
  const { user } = useAuth()
  const isManager = user?.role !== 'Employee'
  const empId     = user?.employeeId

  const [modal,  setModal]  = useState(false)
  const [form,   setForm]   = useState({ date: '', hours: 1, reason: '' })

  const { data, loading, refetch } = useApi(
    () => overtimeApi.getAll(isManager ? {} : { employeeId: empId }), [empId]
  )

  const handleCreate = async () => {
    await overtimeApi.create({ ...form, employeeId: empId })
    setModal(false)
    refetch()
  }

  const handleApprove = async id => {
    await overtimeApi.approve(id)
    refetch()
  }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <>
      <Topbar title="Horas extra">
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Registrar horas extra</button>
      </Topbar>

      <div className="page section-gap">
        <div className="card">
          {loading ? <Spinner /> : !data?.length ? <Empty icon="⏱" text="Sin horas extra registradas" /> : (
            <div className="tbl-wrap">
              <table className="hr-tbl">
                <thead>
                  <tr>
                    {isManager && <th>Empleado</th>}
                    <th>Fecha</th>
                    <th>Horas</th>
                    <th>Motivo</th>
                    <th>Estado</th>
                    {isManager && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {data.map(o => (
                    <tr key={o.id}>
                      {isManager && <td style={{ fontWeight: 500 }}>{o.employeeName}</td>}
                      <td className="mono">{o.date}</td>
                      <td className="mono fw-600">{o.hours}h</td>
                      <td className="text-muted">{o.reason ?? '—'}</td>
                      <td><span className={`badge ${o.approved ? 'badge-green' : 'badge-amber'}`}>{o.approved ? 'Aprobado' : 'Pendiente'}</span></td>
                      {isManager && !o.approved && (
                        <td><button className="btn btn-success btn-sm" onClick={() => handleApprove(o.id)}>✓ Aprobar</button></td>
                      )}
                      {isManager && o.approved && <td />}
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
                 <button className="btn btn-primary" onClick={handleCreate}>Enviar</button>
               </>}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Fecha</label>
              <input className="form-input" type="date" value={form.date} onChange={f('date')} />
            </div>
            <div className="form-group">
              <label className="form-label">Horas extra</label>
              <input className="form-input" type="number" step="0.5" min="0.5" value={form.hours}
                     onChange={e => setForm(p => ({ ...p, hours: +e.target.value }))} />
            </div>
            <div className="form-group span-2">
              <label className="form-label">Motivo o referencia del trabajo</label>
              <input className="form-input" value={form.reason} onChange={f('reason')} placeholder="Descripción del trabajo realizado" />
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
