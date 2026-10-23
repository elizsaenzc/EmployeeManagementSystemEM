import { useState } from 'react'
import { Topbar, Spinner, Empty, Modal, StatusBadge, Avatar } from '../../components/ui'
import { useApi } from '../../hooks/useApi'
import { attendanceApi, employeesApi } from '../../services/api'

const STATUSES = ['Present','Absent','Late','Remote','HalfDay']
const today    = new Date().toISOString().split('T')[0]

export default function Attendance() {
  const [dateFrom, setFrom] = useState(today)
  const [dateTo,   setTo]   = useState(today)
  const [modal,    setModal]  = useState(false)
  const [saving,   setSaving] = useState(false)
  const [form, setForm] = useState({
    employeeId:'', date: today, checkIn:'08:30',
    checkOut:'17:30', status:'Present', notes:''
  })

  const { data: records, loading, refetch } = useApi(
    () => attendanceApi.getAll({ from: dateFrom, to: dateTo }),
    [dateFrom, dateTo]
  )
  const { data: employees } = useApi(employeesApi.getAll)

  const handleSave = async () => {
    if (!form.employeeId) return alert('Selecciona un empleado')
    setSaving(true)
    try {
      await attendanceApi.upsert(form)
      setModal(false)
      refetch()
    } catch (e) {
      alert(e.response?.data?.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  // Summary counts for the filtered period
  const summary = records
    ? {
        present: records.filter(r => r.status === 'Present').length,
        absent:  records.filter(r => r.status === 'Absent').length,
        late:    records.filter(r => r.status === 'Late').length,
        remote:  records.filter(r => r.status === 'Remote').length,
      }
    : {}

  return (
    <>
      <Topbar title="Asistencia">
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Registrar asistencia</button>
      </Topbar>

      <div className="page section-gap">
        {/* Date filter */}
        <div className="toolbar">
          <div className="flex gap-10" style={{alignItems:'center'}}>
            <label className="text-sm text-muted">Desde</label>
            <input className="input" type="date" value={dateFrom} onChange={e => setFrom(e.target.value)} style={{width:'auto'}} />
            <label className="text-sm text-muted">Hasta</label>
            <input className="input" type="date" value={dateTo}   onChange={e => setTo(e.target.value)}   style={{width:'auto'}} />
          </div>
        </div>

        {/* Mini KPIs */}
        {records && (
          <div style={{display:'flex', gap:12, flexWrap:'wrap'}}>
            {[
              {label:'Presentes', val: summary.present, cls:'badge-green'},
              {label:'Ausentes',  val: summary.absent,  cls:'badge-red'},
              {label:'Tarde',     val: summary.late,    cls:'badge-amber'},
              {label:'Remoto',    val: summary.remote,  cls:'badge-accent'},
            ].map(s => (
              <div key={s.label} className="card" style={{padding:'14px 20px', display:'flex', alignItems:'center', gap:10, flex:'1 1 140px'}}>
                <div style={{fontSize:22, fontWeight:700}}>{s.val}</div>
                <span className={`badge ${s.cls}`}>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="card" style={{padding:0}}>
          {loading
            ? <Spinner />
            : !records?.length
            ? <Empty icon="◷" text="Sin registros para el periodo seleccionado." />
            : (
              <div className="table-wrap">
                <table className="hr-table">
                  <thead>
                    <tr>
                      <th>Empleado</th>
                      <th>Fecha</th>
                      <th>Entrada</th>
                      <th>Salida</th>
                      <th>Horas</th>
                      <th>Estado</th>
                      <th>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(r => (
                      <tr key={r.id}>
                        <td>
                          <div className="flex gap-10">
                            <Avatar initials={r.initials} name={r.employeeName} size="avatar-sm" />
                            <span style={{fontWeight:500}}>{r.employeeName}</span>
                          </div>
                        </td>
                        <td className="mono text-sm">{r.date}</td>
                        <td className="mono">{r.checkIn  ?? <span className="text-muted">—</span>}</td>
                        <td className="mono">{r.checkOut ?? <span className="text-muted">—</span>}</td>
                        <td className="mono">{r.hoursWorked != null ? `${r.hoursWorked}h` : <span className="text-muted">—</span>}</td>
                        <td><StatusBadge value={r.status} /></td>
                        <td className="text-sm text-muted">{r.notes ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>
      </div>

      {modal && (
        <Modal
          title="Registrar asistencia"
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </>
          }
        >
          <div className="flex-col" style={{gap:14}}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Empleado *</label>
                <select className="input" value={form.employeeId} onChange={f('employeeId')}>
                  <option value="">— Selecciona —</option>
                  {employees?.map(e => (
                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fecha *</label>
                <input className="input" type="date" value={form.date} onChange={f('date')} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select className="input" value={form.status} onChange={f('status')}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            {form.status !== 'Absent' && (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Hora entrada</label>
                  <input className="input" type="time" value={form.checkIn} onChange={f('checkIn')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Hora salida</label>
                  <input className="input" type="time" value={form.checkOut} onChange={f('checkOut')} />
                </div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Notas</label>
              <input className="input" value={form.notes} onChange={f('notes')} placeholder="Opcional" />
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
