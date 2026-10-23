import { useMemo, useState } from 'react'
import { LogIn, LogOut, Plus, CalendarDays, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useApi, label, localISODate, daysAgoISO, fmtDay } from '../../hooks/useApi'
import { attendanceApi, employeesApi } from '../../services/api'
import { Topbar, Spinner, Empty, Modal, Badge } from '../../components/ui'

const STATUSES = ['Presente', 'Tarde', 'Teletrabajo', 'Media_Jornada', 'Ausente']
const nowHHMM  = () => new Date().toTimeString().slice(0, 5)

export default function Attendance() {
  const { user } = useAuth()
  const empId     = user?.employeeId
  const isManager = user?.role !== 'Employee'
  const today     = localISODate()

  const [dateFrom, setFrom] = useState(daysAgoISO(isManager ? 0 : 14))
  const [dateTo, setTo]     = useState(today)
  const [notice, setNotice] = useState(null)   // { ok, text }
  const [modal, setModal]   = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({
    employeeId: '', date: today, checkIn: '09:00', checkOut: '18:00',
    lunchStart: '14:00', lunchEnd: '15:00', status: 'Presente', notes: '',
  })

  const { data: records, loading, refetch } = useApi(
    () => attendanceApi.getAll({ from: dateFrom, to: dateTo }), [dateFrom, dateTo]
  )
  // Registro propio de hoy (independiente del filtro de fechas)
  const { data: mine, refetch: refetchMine } = useApi(
    () => attendanceApi.getAll({ employeeId: empId, from: today, to: today }), [empId, today]
  )
  const { data: employees } = useApi(employeesApi.getAll, [])
  const todayRec = mine?.[0]

  // Un coordinador solo puede registrar a su equipo; RRHH y Admin a cualquiera
  const assignable = useMemo(() => (employees ?? []).filter(e =>
    e.isActive && (user?.role !== 'Coordinator' || e.managerId === empId || e.id === empId)), [employees, user?.role, empId])

  const clock = async kind => {
    const time = nowHHMM()
    try {
      if (kind === 'in') await attendanceApi.checkIn({ employeeId: empId, time })
      else await attendanceApi.checkOut({ employeeId: empId, time, lunchStart: '14:00', lunchEnd: '15:00' })
      setNotice({ ok: true, text: `${kind === 'in' ? 'Entrada' : 'Salida'} registrada a las ${time}` })
      refetch(); refetchMine()
    } catch (e) {
      setNotice({ ok: false, text: e.response?.data?.message ?? 'No se pudo registrar el fichaje' })
    }
  }

  const save = async () => {
    if (!form.employeeId) { setFormError('Selecciona un empleado.'); return }
    try {
      await attendanceApi.upsert({
        ...form,
        employeeId: parseInt(form.employeeId, 10),
        checkIn: form.checkIn || null, checkOut: form.checkOut || null,
        lunchStart: form.lunchStart || null, lunchEnd: form.lunchEnd || null,
      })
      setModal(false)
      refetch()
    } catch (e) {
      setFormError(e.response?.data?.message ?? 'No se pudo guardar el registro')
    }
  }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <>
      <Topbar title={isManager ? 'Control de asistencia' : 'Mi asistencia'}>
        {isManager && (
          <button className="btn btn-primary" onClick={() => { setFormError(''); setModal(true) }}>
            <Plus size={16} /> Registrar
          </button>
        )}
      </Topbar>

      <div className="page section-gap">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Mi fichaje de hoy</span>
            <span className="text-sm text-muted">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
          <div className="card-body">
            <div className="stat-tiles">
              <div className="stat-tile"><div className="stat-label">Entrada</div><div className="stat-value">{todayRec?.checkIn ?? '—'}</div></div>
              <div className="stat-tile"><div className="stat-label">Descanso</div><div className="stat-value sm">{todayRec?.lunchStart && todayRec?.lunchEnd ? `${todayRec.lunchStart}–${todayRec.lunchEnd}` : '—'}</div></div>
              <div className="stat-tile"><div className="stat-label">Salida</div><div className="stat-value">{todayRec?.checkOut ?? '—'}</div></div>
              <div className="stat-tile"><div className="stat-label">Horas</div><div className="stat-value">{todayRec?.workedHours != null ? `${todayRec.workedHours} h` : '—'}</div></div>
            </div>
            {notice && (
              <div className={`alert ${notice.ok ? 'alert-success' : 'alert-error'} mt-16`}>
                {notice.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {notice.text}
              </div>
            )}
            <div className="flex gap-8 mt-16">
              <button className="btn btn-primary" onClick={() => clock('in')} disabled={!!todayRec?.checkIn}>
                <LogIn size={16} /> Fichar entrada
              </button>
              <button className="btn btn-secondary" onClick={() => clock('out')} disabled={!todayRec?.checkIn || !!todayRec?.checkOut}>
                <LogOut size={16} /> Fichar salida
              </button>
            </div>
          </div>
        </div>

        <div className="toolbar">
          <label className="form-label" htmlFor="att-from">Desde</label>
          <input id="att-from" className="form-input w-auto" type="date" value={dateFrom} max={dateTo} onChange={e => setFrom(e.target.value)} />
          <label className="form-label" htmlFor="att-to">Hasta</label>
          <input id="att-to" className="form-input w-auto" type="date" value={dateTo} min={dateFrom} onChange={e => setTo(e.target.value)} />
          <div className="spacer" />
          <span className="text-sm text-muted">{records?.length ?? 0} registros</span>
        </div>

        <div className="card">
          {loading ? <Spinner /> : !records?.length ? <Empty icon={CalendarDays} text="No hay registros en este periodo" /> : (
            <div className="tbl-wrap">
              <table className="hr-tbl">
                <thead>
                  <tr>
                    {isManager && <th>Empleado</th>}
                    <th>Día</th><th>Entrada</th><th>Descanso</th><th>Salida</th><th className="text-right">Horas</th><th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id}>
                      {isManager && <td className="fw-500">{r.employeeName}</td>}
                      <td>{fmtDay(r.date)}</td>
                      <td className="mono">{r.checkIn ?? '—'}</td>
                      <td className="mono text-muted">{r.lunchStart && r.lunchEnd ? `${r.lunchStart}–${r.lunchEnd}` : '—'}</td>
                      <td className="mono">{r.checkOut ?? '—'}</td>
                      <td className="mono text-right">{r.workedHours != null ? `${r.workedHours} h` : '—'}</td>
                      <td><Badge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <Modal title="Registrar asistencia" onClose={() => setModal(false)}
               footer={<>
                 <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                 <button className="btn btn-primary" onClick={save}>Guardar</button>
               </>}>
          {formError && <div className="alert alert-error mb-16"><AlertCircle size={16} /> {formError}</div>}
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Empleado</label>
              <select className="form-input" value={form.employeeId} onChange={f('employeeId')}>
                <option value="">Selecciona</option>
                {assignable.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Fecha</label>
              <input className="form-input" type="date" value={form.date} max={today} onChange={f('date')} />
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
                {STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}
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
