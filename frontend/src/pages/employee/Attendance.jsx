import { useState } from 'react'
import { useAuth }   from '../../context/AuthContext'
import { useApi }    from '../../hooks/useApi'
import { attendanceApi, employeesApi } from '../../services/api'
import { Topbar, Spinner, Empty, Modal, Badge } from '../../components/ui'

const today = new Date().toISOString().split('T')[0]

export default function Attendance() {
  const { user } = useAuth()
  const isManager = user?.role !== 'Employee'
  const empId = user?.employeeId

  const [dateFrom, setFrom]   = useState(today)
  const [dateTo,   setTo]     = useState(today)
  const [msg,      setMsg]    = useState('')
  const [modal,    setModal]  = useState(false)
  const [form,     setForm]   = useState({ employeeId: '', date: today, checkIn: '', checkOut: '', lunchStart: '14:00', lunchEnd: '15:00', status: 'Presente', notes: '' })

  const params = isManager
    ? { from: dateFrom, to: dateTo }
    : { employeeId: empId, from: dateFrom, to: dateTo }

  const { data: records, loading, refetch } = useApi(
    () => attendanceApi.getAll(params), [dateFrom, dateTo, empId]
  )
  const { data: employees } = useApi(employeesApi.getAll, [])

  const todayRec = records?.find(r => r.date === today && r.employeeId === empId)

  const handleCheckIn = async () => {
    const time = new Date().toTimeString().slice(0,5)
    await attendanceApi.checkIn({ employeeId: empId, time })
    setMsg('✅ Entrada registrada a las ' + time)
    refetch()
  }

  const handleCheckOut = async () => {
    const time = new Date().toTimeString().slice(0,5)
    await attendanceApi.checkOut({ employeeId: empId, time, lunchStart: '14:00', lunchEnd: '15:00' })
    setMsg('✅ Salida registrada a las ' + time)
    refetch()
  }

  const handleUpsert = async () => {
    await attendanceApi.upsert(form)
    setModal(false)
    refetch()
  }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <>
      <Topbar title="Control de asistencia">
        {isManager && (
          <button className="btn btn-primary" onClick={() => setModal(true)}>+ Registrar</button>
        )}
      </Topbar>

      <div className="page section-gap">
        {/* Employee quick-check panel */}
        {!isManager && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Mi registro de hoy — {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
            <div className="card-body" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200, background: 'var(--surface2)', borderRadius: 10, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Entrada</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{todayRec?.checkIn ?? '—'}</div>
              </div>
              <div style={{ flex: 1, minWidth: 200, background: 'var(--surface2)', borderRadius: 10, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Descanso</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{todayRec?.lunchStart && todayRec?.lunchEnd ? `${todayRec.lunchStart} – ${todayRec.lunchEnd}` : '14:00 – 15:00'}</div>
              </div>
              <div style={{ flex: 1, minWidth: 200, background: 'var(--surface2)', borderRadius: 10, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Salida</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{todayRec?.checkOut ?? '—'}</div>
              </div>
              <div style={{ flex: 1, minWidth: 200, background: 'var(--surface2)', borderRadius: 10, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Horas trabajadas</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{todayRec?.workedHours != null ? `${todayRec.workedHours}h` : '—'}</div>
              </div>
            </div>
            {msg && <div style={{ padding: '10px 20px 16px', color: 'var(--green)', fontSize: 13 }}>{msg}</div>}
            <div className="card-body" style={{ display: 'flex', gap: 10, paddingTop: 0 }}>
              <button className="btn btn-success" onClick={handleCheckIn} disabled={!!todayRec?.checkIn}>
                🟢 Marcar entrada
              </button>
              <button className="btn btn-danger" onClick={handleCheckOut}
                      disabled={!todayRec?.checkIn || !!todayRec?.checkOut}>
                🔴 Marcar salida
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="toolbar">
          <label style={{ fontSize: 13, color: 'var(--text2)' }}>Desde</label>
          <input className="form-input" type="date" value={dateFrom}
                 onChange={e => setFrom(e.target.value)} style={{ width: 'auto' }} />
          <label style={{ fontSize: 13, color: 'var(--text2)' }}>Hasta</label>
          <input className="form-input" type="date" value={dateTo}
                 onChange={e => setTo(e.target.value)} style={{ width: 'auto' }} />
          <span className="text-sm text-muted">{records?.length ?? 0} registros</span>
        </div>

        <div className="card">
          {loading ? <Spinner /> : !records?.length ? <Empty icon="📅" text="Sin registros en el periodo" /> : (
            <div className="tbl-wrap">
              <table className="hr-tbl">
                <thead>
                  <tr>
                    {isManager && <th>Empleado</th>}
                    <th>Fecha</th>
                    <th>Entrada</th>
                    <th>Descanso</th>
                    <th>Salida</th>
                    <th>Horas</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id}>
                      {isManager && <td style={{ fontWeight: 500 }}>{r.employeeName}</td>}
                      <td className="mono">{r.date}</td>
                      <td className="mono">{r.checkIn ?? '—'}</td>
                      <td className="mono text-muted">{r.lunchStart && r.lunchEnd ? `${r.lunchStart}–${r.lunchEnd}` : '—'}</td>
                      <td className="mono">{r.checkOut ?? '—'}</td>
                      <td className="mono">{r.workedHours != null ? `${r.workedHours}h` : '—'}</td>
                      <td><Badge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal && isManager && (
        <Modal title="Registrar asistencia" onClose={() => setModal(false)}
               footer={<>
                 <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                 <button className="btn btn-primary" onClick={handleUpsert}>Guardar</button>
               </>}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Empleado</label>
              <select className="form-input" value={form.employeeId} onChange={f('employeeId')}>
                <option value="">— Selecciona —</option>
                {employees?.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Fecha</label>
              <input className="form-input" type="date" value={form.date} onChange={f('date')} />
            </div>
            <div className="form-group">
              <label className="form-label">Entrada</label>
              <input className="form-input" type="time" value={form.checkIn} onChange={f('checkIn')} />
            </div>
            <div className="form-group">
              <label className="form-label">Salida</label>
              <input className="form-input" type="time" value={form.checkOut} onChange={f('checkOut')} />
            </div>
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select className="form-input" value={form.status} onChange={f('status')}>
                {['Presente','Ausente','Tarde','Teletrabajo','Media_Jornada'].map(s =>
                  <option key={s}>{s}</option>
                )}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Notas</label>
              <input className="form-input" value={form.notes} onChange={f('notes')} />
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
