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
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
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
