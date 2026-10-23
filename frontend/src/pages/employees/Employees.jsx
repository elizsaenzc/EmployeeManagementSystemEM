import { useState } from 'react'
import { useAuth }   from '../../context/AuthContext'
import { useApi, avatarColor } from '../../hooks/useApi'
import { employeesApi } from '../../services/api'
import { Topbar, Spinner, Empty, Modal, Avatar, Badge } from '../../components/ui'

const DEPARTMENTS = [
  'Direccion','Tecnologia','Marketing','Ventas',
  'Finanzas','RRHH','Operaciones','Legal','Atencion_al_Cliente'
]
const ROLES      = ['Employee','Coordinator','HR','Admin']
const CONTRACTS  = ['Indefinido','Temporal','Practicas','Obra_y_Servicio']

const ROLE_LABELS = {
  Employee: 'Empleado', Coordinator: 'Coordinador', HR: 'RRHH', Admin: 'Admin'
}
const DEPT_LABELS = {
  Direccion: 'Dirección', Tecnologia: 'Tecnología', Marketing: 'Marketing',
  Ventas: 'Ventas', Finanzas: 'Finanzas', RRHH: 'RRHH',
  Operaciones: 'Operaciones', Legal: 'Legal', Atencion_al_Cliente: 'Atención al cliente'
}
const CONTRACT_LABELS = {
  Indefinido: 'Indefinido', Temporal: 'Temporal',
  Practicas: 'Prácticas', Obra_y_Servicio: 'Obra y servicio'
}

const emptyForm = {
  firstName: '', lastName: '', email: '', phone: '', nationalId: '',
  birthDate: '', address: '', position: '', department: 'Tecnologia',
  role: 'Employee', contractType: 'Indefinido', grossSalary: '',
  hireDate: '', managerId: '', workSchedule: '09:00-18:00'
}

const ROLE_BADGE = {
  Admin: 'badge-red', HR: 'badge-purple',
  Coordinator: 'badge-blue', Employee: 'badge-muted'
}

export default function Employees() {
  const { user } = useAuth()
  const canEdit  = user?.role === 'HR' || user?.role === 'Admin'
  const canDel   = user?.role === 'Admin'

  const [search, setSearch]   = useState('')
  const [deptFilter, setDept] = useState('')
  const [modal,  setModal]    = useState(null)  // null | 'create' | 'edit' | 'view'
  const [target, setTarget]   = useState(null)
  const [form,   setForm]     = useState({ ...emptyForm })
  const [saving, setSaving]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)

  const { data: employees, loading, refetch } = useApi(
    () => employeesApi.getAll({ q: search, department: deptFilter }),
    [search, deptFilter]
  )

  const handleOpen = (mode, emp = null) => {
    setTarget(emp)
    if (mode === 'edit' && emp) {
      setForm({
        firstName:    emp.fullName?.split(' ')[0] ?? '',
        lastName:     emp.fullName?.split(' ').slice(1).join(' ') ?? '',
        email:        emp.email,
        phone:        emp.phone ?? '',
        nationalId:   '',
        birthDate:    '',
        address:      '',
        position:     emp.position,
        department:   emp.department,
        role:         emp.role,
        contractType: emp.contractType,
        grossSalary:  emp.grossSalary,
        hireDate:     emp.hireDate?.split('T')[0] ?? '',
        managerId:    emp.managerId ?? '',
        workSchedule: emp.workSchedule ?? '09:00-18:00'
      })
    } else {
      setForm({ ...emptyForm })
    }
    setModal(mode)
  }

  const handleSave = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.position) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        grossSalary: parseFloat(form.grossSalary) || 0,
        managerId:   form.managerId ? parseInt(form.managerId) : null,
        hireDate:    form.hireDate || new Date().toISOString().split('T')[0],
        birthDate:   form.birthDate || null,
      }
      if (modal === 'create') {
        await employeesApi.create(payload)
      } else {
        await employeesApi.update(target.id, { ...payload, isActive: true })
      }
      setModal(null)
      refetch()
    } catch (e) {
      alert(e.response?.data?.message ?? 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    await employeesApi.remove(confirmDel.id)
    setConfirmDel(null)
    refetch()
  }

  const f = key => e => setForm(p => ({ ...p, [key]: e.target.value }))

  return (
    <>
      <Topbar title="Plantilla">
        {canEdit && (
          <button className="btn btn-primary" onClick={() => handleOpen('create')}>
            + Nuevo empleado
          </button>
        )}
      </Topbar>

      <div className="page section-gap">
        <div className="toolbar">
          <div className="search-wrap">
            <span className="search-ico">🔍</span>
            <input className="form-input" placeholder="Buscar por nombre, cargo, email…"
                   value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-input" style={{ width: 'auto' }}
                  value={deptFilter} onChange={e => setDept(e.target.value)}>
            <option value="">Todos los departamentos</option>
            {DEPARTMENTS.map(d => (
              <option key={d} value={d}>{DEPT_LABELS[d] ?? d}</option>
            ))}
          </select>
          <div className="spacer" />
          <span className="text-sm text-muted">{employees?.length ?? 0} empleados</span>
        </div>

        <div className="card">
          {loading ? <Spinner /> : !employees?.length
            ? <Empty icon="👥" text="Sin empleados que coincidan con los filtros" />
            : (
              <div className="tbl-wrap">
                <table className="hr-tbl">
                  <thead>
                    <tr>
                      <th>Empleado</th>
                      <th>Cargo</th>
                      <th>Departamento</th>
                      <th>Rol</th>
                      <th>Contrato</th>
                      <th>Incorporación</th>
                      <th>Horario</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => (
                      <tr key={emp.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Avatar name={emp.fullName} size="av-sm" />
                            <div>
                              <div style={{ fontWeight: 600 }}>{emp.fullName}</div>
                              <div className="text-sm text-muted">{emp.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>{emp.position}</td>
                        <td>{DEPT_LABELS[emp.department] ?? emp.department}</td>
                        <td>
                          <span className={`badge ${ROLE_BADGE[emp.role] ?? 'badge-muted'}`}>
                            {ROLE_LABELS[emp.role] ?? emp.role}
                          </span>
                        </td>
                        <td>{CONTRACT_LABELS[emp.contractType] ?? emp.contractType}</td>
                        <td className="mono text-muted">
                          {emp.hireDate ? new Date(emp.hireDate).toLocaleDateString('es-ES') : '—'}
                        </td>
                        <td className="mono text-muted">{emp.workSchedule ?? '—'}</td>
                        <td>
                          <div className="flex gap-8">
                            <button className="btn btn-secondary btn-sm"
                                    onClick={() => handleOpen('view', emp)}>
                              Ver
                            </button>
                            {canEdit && (
                              <button className="btn btn-secondary btn-sm"
                                      onClick={() => handleOpen('edit', emp)}>
                                Editar
                              </button>
                            )}
                            {canDel && (
                              <button className="btn btn-danger btn-sm"
                                      onClick={() => setConfirmDel(emp)}>
                                ✕
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>
      </div>

      {/* Create / Edit modal */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal
          title={modal === 'create' ? 'Nuevo empleado' : `Editar · ${target?.fullName}`}
          onClose={() => setModal(null)}
          wide
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input className="form-input" value={form.firstName} onChange={f('firstName')} />
            </div>
            <div className="form-group">
              <label className="form-label">Apellidos *</label>
              <input className="form-input" value={form.lastName} onChange={f('lastName')} />
            </div>
            <div className="form-group">
              <label className="form-label">Email corporativo *</label>
              <input className="form-input" type="email" value={form.email} onChange={f('email')} />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input className="form-input" value={form.phone} onChange={f('phone')} />
            </div>
            <div className="form-group">
              <label className="form-label">DNI / NIE</label>
              <input className="form-input" value={form.nationalId} onChange={f('nationalId')} />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha de nacimiento</label>
              <input className="form-input" type="date" value={form.birthDate} onChange={f('birthDate')} />
            </div>
            <div className="form-group span-2">
              <label className="form-label">Dirección</label>
              <input className="form-input" value={form.address} onChange={f('address')} />
            </div>
            <div className="form-group">
              <label className="form-label">Cargo / Puesto *</label>
              <input className="form-input" value={form.position} onChange={f('position')} />
            </div>
            <div className="form-group">
              <label className="form-label">Departamento</label>
              <select className="form-input" value={form.department} onChange={f('department')}>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{DEPT_LABELS[d] ?? d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Rol en el sistema</label>
              <select className="form-input" value={form.role} onChange={f('role')}>
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tipo de contrato</label>
              <select className="form-input" value={form.contractType} onChange={f('contractType')}>
                {CONTRACTS.map(c => <option key={c} value={c}>{CONTRACT_LABELS[c]}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Salario bruto anual (€)</label>
              <input className="form-input" type="number" value={form.grossSalary} onChange={f('grossSalary')} />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha de incorporación</label>
              <input className="form-input" type="date" value={form.hireDate} onChange={f('hireDate')} />
            </div>
            <div className="form-group">
              <label className="form-label">Horario habitual</label>
              <input className="form-input" value={form.workSchedule} onChange={f('workSchedule')}
                     placeholder="09:00-18:00" />
            </div>
            <div className="form-group">
              <label className="form-label">Responsable directo (ID)</label>
              <input className="form-input" type="number" value={form.managerId} onChange={f('managerId')}
                     placeholder="ID del manager" />
            </div>
          </div>
        </Modal>
      )}

      {/* View detail modal */}
      {modal === 'view' && target && (
        <Modal title="Ficha del empleado" onClose={() => setModal(null)} wide
               footer={<button className="btn btn-secondary" onClick={() => setModal(null)}>Cerrar</button>}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 20 }}>
            <Avatar name={target.fullName} size="av-lg" />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{target.fullName}</div>
              <div style={{ color: 'var(--text2)', marginTop: 3 }}>{target.position}</div>
              <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                <span className={`badge ${ROLE_BADGE[target.role] ?? 'badge-muted'}`}>
                  {ROLE_LABELS[target.role] ?? target.role}
                </span>
                <span className="badge badge-cyan">
                  {DEPT_LABELS[target.department] ?? target.department}
                </span>
              </div>
            </div>
          </div>
          <div className="form-grid" style={{ gap: 10 }}>
            {[
              ['Email', target.email],
              ['Teléfono', target.phone ?? '—'],
              ['Contrato', CONTRACT_LABELS[target.contractType] ?? target.contractType],
              ['Horario', target.workSchedule ?? '—'],
              ['Incorporación', target.hireDate ? new Date(target.hireDate).toLocaleDateString('es-ES') : '—'],
              ['Salario bruto anual', `${Number(target.grossSalary).toLocaleString('es-ES')} €`],
              ['Salario mensual neto aprox.', `${Math.round(target.monthlySalary * (1 - 0.20)).toLocaleString('es-ES')} €`],
            ].map(([label, value]) => (
              <div key={label} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 14px' }}>
                <div className="text-sm text-muted">{label}</div>
                <div style={{ fontWeight: 500, marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Confirm delete */}
      {confirmDel && (
        <Modal title="Desactivar empleado" onClose={() => setConfirmDel(null)}
               footer={
                 <>
                   <button className="btn btn-secondary" onClick={() => setConfirmDel(null)}>Cancelar</button>
                   <button className="btn btn-danger" onClick={handleDelete}>Desactivar</button>
                 </>
               }>
          <p style={{ color: 'var(--text2)', lineHeight: 1.7 }}>
            ¿Seguro que quieres desactivar a <strong>{confirmDel.fullName}</strong>?
            El empleado perderá acceso al sistema pero se conservará su historial completo.
          </p>
        </Modal>
      )}
    </>
  )
}
