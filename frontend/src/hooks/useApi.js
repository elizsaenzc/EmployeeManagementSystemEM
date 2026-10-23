import { useState, useEffect, useCallback } from 'react'

export function useApi(fn, deps = []) {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  const run = useCallback(async () => {
    try {
      setLoading(true); setError(null)
      const res = await fn()
      setData(res.data)
    } catch (e) {
      setError(e.response?.data?.message || 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }, deps) // eslint-disable-line

  useEffect(() => { run() }, [run])
  return { data, loading, error, refetch: run }
}

// Avatar color cycle
const AV = ['av-1','av-2','av-3','av-4','av-5','av-6']
export const avatarColor = name =>
  AV[(name?.charCodeAt(0) ?? 0) % AV.length]

// Format euros
export const fmt = (n, dec = 2) =>
  n != null ? Number(n).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: dec }) : '—'

// Status badge
const STATUS = {
  Pendiente:  'badge-amber',
  Aprobada:   'badge-green',
  Rechazada:  'badge-red',
  Cancelada:  'badge-muted',
  Presente:   'badge-green',
  Ausente:    'badge-red',
  Tarde:      'badge-amber',
  Teletrabajo:'badge-blue',
  Media_Jornada: 'badge-purple',
  Pagada:     'badge-green',
  Calculada:  'badge-blue',
  Borrador:   'badge-muted',
}
export const statusCls = s => STATUS[s] ?? 'badge-muted'

// Month names ES
export const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
                       'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
export const monthName = m => MONTHS[(m || 1) - 1] ?? ''

// Download blob helper
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href    = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Etiquetas legibles para los valores de enumeración que devuelve la API
const LABELS = {
  Direccion: 'Dirección', Tecnologia: 'Tecnología', Marketing: 'Marketing', Ventas: 'Ventas',
  Finanzas: 'Finanzas', RRHH: 'RRHH', Operaciones: 'Operaciones', Legal: 'Legal',
  Atencion_al_Cliente: 'Atención al cliente',
  Indefinido: 'Indefinido', Temporal: 'Temporal', Practicas: 'Prácticas', Obra_y_Servicio: 'Obra y servicio',
  Vacaciones: 'Vacaciones', Permiso_Medico: 'Permiso médico', Asunto_Personal: 'Asunto personal',
  Asunto_Familiar: 'Asunto familiar', Calamidad_Domestica: 'Calamidad doméstica',
  Permiso_Remunerado: 'Permiso remunerado', Baja_por_Enfermedad: 'Baja por enfermedad',
  Media_Jornada: 'Media jornada',
  Employee: 'Empleado', Coordinator: 'Coordinador', HR: 'RRHH', Admin: 'Administrador',
}
export const label = v => LABELS[v] ?? (v ? String(v).replace(/_/g, ' ') : '')

// Años seleccionables en filtros: dos atrás, el actual y el siguiente
export const yearOptions = () => {
  const y = new Date().getFullYear()
  return [y - 2, y - 1, y, y + 1]
}

// Fecha local en formato YYYY-MM-DD (toISOString usaría UTC y cambiaría de día por la noche)
export const localISODate = (d = new Date()) => d.toLocaleDateString('sv-SE')
export const daysAgoISO = n => { const d = new Date(); d.setDate(d.getDate() - n); return localISODate(d) }
export const fmtDay = iso =>
  iso ? new Date(iso.length === 10 ? iso + 'T00:00:00' : iso).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'
