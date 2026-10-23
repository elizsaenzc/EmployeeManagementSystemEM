import { useEffect, useMemo, useState } from 'react'
import { Search, UserPlus, Eye, Pencil, UserX, AlertCircle, Users, KeyRound } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useApi, fmt, label } from '../../hooks/useApi'
import { employeesApi } from '../../services/api'
import { Topbar, Spinner, Empty, Modal, Avatar } from '../../components/ui'

const DEPARTMENTS = ['Direccion', 'Tecnologia', 'Marketing', 'Ventas', 'Finanzas', 'RRHH', 'Operaciones', 'Legal', 'Atencion_al_Cliente']
const ROLES       = ['Employee', 'Coordinator', 'HR', 'Admin']
const CONTRACTS   = ['Indefinido', 'Temporal', 'Practicas', 'Obra_y_Servicio']
const ROLE_BADGE  = { Admin: 'badge-red', HR: 'badge-purple', Coordinator: 'badge-blue', Employee: 'badge-muted' }

const emptyForm = {
  firstName: '', lastName: '', email: '', phone: '', nationalId: '',
  birthDate: '', address: '', position: '', department: 'Tecnologia',
  role: 'Employee', contractType: 'Indefinido', grossSalary: '',
  hireDate: '', managerId: '', workSchedule: '09:00-18:00',
}

const day = iso => (iso ? new Date(iso).toLocaleDateString('es-ES') : '—')

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t) }, [value, ms])
  return v
}

export default function Employees({ teamOnly = false }) {
  const { user }  = useAuth()
  const canEdit   = !teamOnly && (user?.role === 'HR' || user?.role === 'Admin')
  const canDelete = !teamOnly && user?.role === 'Admin'

  const [search, setSearch]     = useState('')
  const [deptFilter, setDept]   = useState('')
  const [modal, setModal]       = useState(null)   // null | 'create' | 'edit' | 'view'
  const [detail, setDetail]     = useState(null)
  const [form, setForm]         = useState(emptyForm)
  const [saving, setSaving]     = useState(false)
  const [formError, setFormErr] = useState('')
  const [confirmDel, setConfirmDel] = useState(null)
  const [credentials, setCredentials] = useState(null)

  const q = useDebounced(search)
  const { data, loading, refetch } = useApi(
    () => employeesApi.getAll({ q, department: deptFilter }), [q, deptFilter]
  )
  const employees = useMemo(
    () => (data ?? []).filter(e => !teamOnly || e.managerId === user?.employeeId),
    [data, teamOnly, user?.employeeId]
  )
  const managers = useMemo(
    () => (data ?? []).filter(e => ['Coordinator', 'HR', 'Admin'].includes(e.role)),
    [data]
  )

  const open = async (mode, emp = null) => {
    setFormErr('')
    setDetail(null)
    if (mode === 'create') {
      setForm(emptyForm)
      setModal('create')
      return
    }
    setModal(mode)
    // La ficha completa (DNI, dirección, teléfono…) no viene en el listado
    const { data: d } = await employeesApi.getOne(emp.id)
    setDetail(d)
    if (mode === 'edit') {
      setForm({
        firstName: d.firstName, lastName: d.lastName, email: d.email,
        phone: d.phone ?? '', nationalId: d.nationalId ?? '',
        birthDate: d.birthDate?.split('T')[0] ?? '', address: d.address ?? '',
        position: d.position, department: d.department, role: d.role,
        contractType: d.contractType, grossSalary: d.grossSalary ?? '',
        hireDate: d.hireDate?.split('T')[0] ?? '', managerId: d.managerId ?? '',
        workSchedule: d.workSchedule ?? '09:00-18:00',
      })
    }
  }

  const save = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.position) {
      setFormErr('Nombre, apellidos, email y cargo son obligatorios.')
      return
    }
    setSaving(true)
    setFormErr('')
    try {
      const payload = {
        ...form,
        grossSalary: parseFloat(form.grossSalary) || 0,
        managerId:   form.managerId ? parseInt(form.managerId, 10) : null,
        hireDate:    form.hireDate || new Date().toISOString().split('T')[0],
        birthDate:   form.birthDate || null,
      }
      if (modal === 'create') {
        const { data: created } = await employeesApi.create(payload)
        setCredentials({ name: `${form.firstName} ${form.lastName}`, ...created })
      } else await employeesApi.update(detail.id, { ...payload, isActive: detail.isActive })
      setModal(null)
      refetch()
    } catch (e) {
      setFormErr(e.response?.data?.message ?? 'No se pudo guardar. Revisa los datos.')
    } finally {
      setSaving(false)
    }
  }

  const deactivate = async () => {
    await employeesApi.remove(confirmDel.id)
    setConfirmDel(null)
    refetch()
  }

  const f = key => e => setForm(p => ({ ...p, [key]: e.target.value }))

  return (
    <>
      <Topbar title={teamOnly ? 'Mi equipo' : 'Plantilla'}>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => open('create')}>
            <UserPlus size={16} /> Nuevo empleado
          </button>
        )}
      </Topbar>

      <div className="page section-gap">
        <div className="toolbar">
          <div className="search-wrap">
            <Search className="search-ico" size={15} />
            <input className="form-input" placeholder="Buscar por nombre, cargo o email"
                   value={search} onChange={e => setSearch(e.target.value)} aria-label="Buscar empleados" />
          </div>
          {!teamOnly && (
            <select className="form-input w-auto" value={deptFilter} onChange={e => setDept(e.target.value)}
                    aria-label="Filtrar por departamento">
              <option value="">Todos los departamentos</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{label(d)}</option>)}
            </select>
          )}
          <div className="spacer" />
          <span className="text-sm text-muted">{employees.length} {employees.length === 1 ? 'persona' : 'personas'}</span>
        </div>

        <div className="card">
          {loading ? <Spinner /> : !employees.length ? (
            <Empty icon={Users} text="No hay empleados que coincidan con los filtros" />
          ) : (
            <div className="tbl-wrap">
              <table className="hr-tbl">
                <thead>
                  <tr>
                    <th>Empleado</th><th>Cargo</th><th>Departamento</th><th>Rol</th>
                    <th>Contrato</th><th>Incorporación</th><th>Estado</th><th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id}>
                      <td>
                        <div className="flex gap-10">
                          <Avatar name={emp.fullName} size="av-sm" />
                          <div className="min-w-0">
                            <div className="fw-600">{emp.fullName}</div>
                            <div className="text-sm text-muted">{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{emp.position}</td>
                      <td>{label(emp.department)}</td>
                      <td><span className={`badge ${ROLE_BADGE[emp.role] ?? 'badge-muted'}`}>{label(emp.role)}</span></td>
                      <td>{label(emp.contractType)}</td>
                      <td className="mono text-muted">{day(emp.hireDate)}</td>
                      <td>
                        <span className={`badge ${emp.isActive ? 'badge-green' : 'badge-muted'}`}>
                          {emp.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn-ghost btn-icon" onClick={() => open('view', emp)}
                                  title="Ver ficha" aria-label={`Ver ficha de ${emp.fullName}`}><Eye size={16} /></button>
                          {canEdit && (
                            <button className="btn btn-ghost btn-icon" onClick={() => open('edit', emp)}
                                    title="Editar" aria-label={`Editar a ${emp.fullName}`}><Pencil size={15} /></button>
                          )}
                          {canDelete && emp.isActive && emp.id !== user?.employeeId && (
                            <button className="btn btn-ghost btn-icon text-red" onClick={() => setConfirmDel(emp)}
                                    title="Desactivar" aria-label={`Desactivar a ${emp.fullName}`}><UserX size={16} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {(modal === 'create' || modal === 'edit') && (
        <Modal
          title={modal === 'create' ? 'Nuevo empleado' : `Editar · ${detail ? `${detail.firstName} ${detail.lastName}` : ''}`}
          onClose={() => setModal(null)}
          wide
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={saving || (modal === 'edit' && !detail)}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </>
          }
        >
          {modal === 'edit' && !detail ? <Spinner /> : (
            <>
              {formError && <div className="alert alert-error mb-16"><AlertCircle size={16} /> {formError}</div>}
              <div className="form-grid">
                <Field label="Nombre *"><input className="form-input" value={form.firstName} onChange={f('firstName')} /></Field>
                <Field label="Apellidos *"><input className="form-input" value={form.lastName} onChange={f('lastName')} /></Field>
                <Field label="Email corporativo *"><input className="form-input" type="email" value={form.email} onChange={f('email')} /></Field>
                <Field label="Teléfono"><input className="form-input" value={form.phone} onChange={f('phone')} /></Field>
                <Field label="DNI / NIE"><input className="form-input" value={form.nationalId} onChange={f('nationalId')} /></Field>
                <Field label="Fecha de nacimiento"><input className="form-input" type="date" value={form.birthDate} onChange={f('birthDate')} /></Field>
                <Field label="Dirección" wide><input className="form-input" value={form.address} onChange={f('address')} /></Field>
                <Field label="Cargo *"><input className="form-input" value={form.position} onChange={f('position')} /></Field>
                <Field label="Departamento">
                  <select className="form-input" value={form.department} onChange={f('department')}>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{label(d)}</option>)}
                  </select>
                </Field>
                <Field label="Rol en el portal">
                  <select className="form-input" value={form.role} onChange={f('role')}>
                    {ROLES.map(r => <option key={r} value={r}>{label(r)}</option>)}
                  </select>
                </Field>
                <Field label="Tipo de contrato">
                  <select className="form-input" value={form.contractType} onChange={f('contractType')}>
                    {CONTRACTS.map(c => <option key={c} value={c}>{label(c)}</option>)}
                  </select>
                </Field>
                <Field label="Salario bruto anual (€)"><input className="form-input" type="number" min="0" step="100" value={form.grossSalary} onChange={f('grossSalary')} /></Field>
                <Field label="Fecha de incorporación"><input className="form-input" type="date" value={form.hireDate} onChange={f('hireDate')} /></Field>
                <Field label="Horario habitual"><input className="form-input" value={form.workSchedule} onChange={f('workSchedule')} placeholder="09:00-18:00" /></Field>
                <Field label="Responsable directo">
                  <select className="form-input" value={form.managerId} onChange={f('managerId')}>
                    <option value="">Sin responsable</option>
                    {managers.filter(m => m.id !== detail?.id).map(m => (
                      <option key={m.id} value={m.id}>{m.fullName} · {m.position}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </>
          )}
        </Modal>
      )}

      {modal === 'view' && (
        <Modal title="Ficha del empleado" onClose={() => setModal(null)} wide
               footer={<button className="btn btn-secondary" onClick={() => setModal(null)}>Cerrar</button>}>
          {!detail ? <Spinner /> : (
            <>
              <div className="profile-head">
                <Avatar name={detail.fullName} size="av-lg" />
                <div>
                  <div className="profile-name">{detail.fullName}</div>
                  <div className="text-muted">{detail.position}</div>
                  <div className="flex gap-8 mt-6">
                    <span className={`badge ${ROLE_BADGE[detail.role] ?? 'badge-muted'}`}>{label(detail.role)}</span>
                    <span className="badge badge-cyan">{label(detail.department)}</span>
                  </div>
                </div>
              </div>
              <div className="info-grid">
                {[
                  ['Email', detail.email],
                  ['Teléfono', detail.phone ?? '—'],
                  ['Responsable', detail.managerName ?? '—'],
                  ['Contrato', label(detail.contractType)],
                  ['Horario', detail.workSchedule ?? '—'],
                  ['Incorporación', day(detail.hireDate)],
                  ...(canEdit ? [
                    ['DNI / NIE', detail.nationalId ?? '—'],
                    ['Salario bruto anual', fmt(detail.grossSalary, 0)],
                  ] : []),
                ].map(([k, v]) => (
                  <div key={k} className="info-cell">
                    <div className="text-sm text-muted">{k}</div>
                    <div className="fw-500">{v}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Modal>
      )}

      {credentials && (
        <Modal title="Empleado creado" onClose={() => setCredentials(null)}
               footer={<button className="btn btn-primary" onClick={() => setCredentials(null)}>Entendido</button>}>
          <p className="text-body mb-16">
            Se ha creado el acceso de <strong>{credentials.name}</strong>. Entrégale estos datos;
            la contraseña temporal no se volverá a mostrar.
          </p>
          <div className="credential-box">
            <KeyRound size={18} />
            <div>
              <div className="text-sm text-muted">Usuario</div>
              <div className="mono fw-600">{credentials.username}</div>
              <div className="text-sm text-muted mt-6">Contraseña temporal</div>
              <div className="mono fw-600">{credentials.temporaryPassword}</div>
            </div>
          </div>
        </Modal>
      )}

      {confirmDel && (
        <Modal title="Desactivar empleado" onClose={() => setConfirmDel(null)}
               footer={
                 <>
                   <button className="btn btn-secondary" onClick={() => setConfirmDel(null)}>Cancelar</button>
                   <button className="btn btn-danger" onClick={deactivate}>Desactivar</button>
                 </>
               }>
          <p className="text-body">
            ¿Desactivar a <strong>{confirmDel.fullName}</strong>? Perderá el acceso al portal,
            pero se conserva todo su historial.
          </p>
        </Modal>
      )}
    </>
  )
}

function Field({ label: text, wide, children }) {
  return (
    <div className={`form-group ${wide ? 'span-2' : ''}`}>
      <label className="form-label">{text}</label>
      {children}
    </div>
  )
}
