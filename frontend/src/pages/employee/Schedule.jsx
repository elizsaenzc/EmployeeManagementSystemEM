import { useAuth } from '../../context/AuthContext'
import { useApi }  from '../../hooks/useApi'
import { employeesApi } from '../../services/api'
import { Topbar, Spinner } from '../../components/ui'

const SCHEDULE_LABELS = {
  '08:00-17:00': { label: 'Jornada mañana', hours: 8, desc: 'Lunes a viernes · 08:00–17:00' },
  '09:00-18:00': { label: 'Jornada estándar', hours: 8, desc: 'Lunes a viernes · 09:00–18:00' },
  '09:00-17:00': { label: 'Jornada reducida', hours: 7, desc: 'Lunes a viernes · 09:00–17:00' },
}

const WORKING_DAYS = ['Lunes','Martes','Miércoles','Jueves','Viernes']
const WEEKEND      = ['Sábado','Domingo']

export default function Schedule() {
  const { user } = useAuth()
  const { data: emp, loading } = useApi(
    () => employeesApi.getOne(user?.employeeId), [user?.employeeId]
  )

  if (loading) return (
    <>
      <Topbar title="Mi horario" />
      <div className="page"><Spinner /></div>
    </>
  )

  const schedule  = emp?.workSchedule ?? '09:00-18:00'
  const schedInfo = SCHEDULE_LABELS[schedule] ?? { label: 'Personalizado', hours: 8, desc: schedule }
  const [checkIn, checkOut] = schedule.split('-')

  // Calculate daily blocks
  const toMinutes = t => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const toTime = mins => {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
  }

  const startMin  = toMinutes(checkIn)
  const endMin    = toMinutes(checkOut)
  const lunchFrom = Math.min(startMin + 4 * 60, 14 * 60)
  const lunchTo   = lunchFrom + 60

  const blocks = [
    { label: 'Entrada',    time: checkIn,             type: 'entry' },
    { label: 'Trabajo',    time: `${checkIn}–${toTime(lunchFrom)}`, type: 'work' },
    { label: 'Descanso',   time: `${toTime(lunchFrom - 15)}–${toTime(lunchFrom)}`, type: 'break', note: '15 min (aprox.)' },
    { label: 'Almuerzo',   time: `${toTime(lunchFrom)}–${toTime(lunchTo)}`, type: 'lunch', note: '1 hora' },
    { label: 'Trabajo',    time: `${toTime(lunchTo)}–${checkOut}`, type: 'work' },
    { label: 'Salida',     time: checkOut,             type: 'exit' },
  ]

  const BLOCK_COLORS = {
    entry: 'var(--green)',
    work:  'var(--brand-light)',
    break: 'var(--amber)',
    lunch: 'var(--purple)',
    exit:  'var(--red)',
  }

  return (
    <>
      <Topbar title="Mi horario de trabajo" />

      <div className="page section-gap">
        {/* Summary card */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          {[
            { label: 'Tipo de jornada',      value: schedInfo.label,  icon: '📋' },
            { label: 'Horas diarias',         value: `${schedInfo.hours}h`,  icon: '⏱' },
            { label: 'Horas semanales',       value: `${schedInfo.hours * 5}h`, icon: '📅' },
            { label: 'Descanso diario',       value: '15 min',        icon: '☕' },
            { label: 'Almuerzo',             value: '1 hora',         icon: '🍽' },
            { label: 'Días de trabajo',       value: '5 días',         icon: '📆' },
          ].map(item => (
            <div key={item.label} className="kpi">
              <div className="kpi-icon" style={{ background: 'var(--brand-dim)', fontSize: 18 }}>
                {item.icon}
              </div>
              <div className="kpi-label">{item.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Weekly schedule grid */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Calendario semanal</span>
            <span className="badge badge-blue">{schedInfo.desc}</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
              {[...WORKING_DAYS, ...WEEKEND].map(day => {
                const isWork = WORKING_DAYS.includes(day)
                return (
                  <div key={day} style={{
                    background: isWork ? 'var(--brand-dim)' : 'var(--surface2)',
                    border: `1px solid ${isWork ? 'rgba(37,99,235,.2)' : 'var(--border)'}`,
                    borderRadius: 10, padding: '14px 10px', textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: isWork ? 'var(--brand-light)' : 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
                      {day.slice(0,3)}
                    </div>
                    {isWork ? (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{checkIn}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', margin: '3px 0' }}>↕</div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{checkOut}</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 6 }}>
                          {schedInfo.hours}h trabajo
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Descanso</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Daily timeline */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Bloques horarios diarios</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {blocks.map((block, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '10px 16px', borderRadius: 8,
                  background: BLOCK_COLORS[block.type] + '12',
                  border: `1px solid ${BLOCK_COLORS[block.type]}30`
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: BLOCK_COLORS[block.type], flexShrink: 0
                  }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{block.label}</span>
                    {block.note && (
                      <span className="text-sm text-muted" style={{ marginLeft: 8 }}>{block.note}</span>
                    )}
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: 13, color: BLOCK_COLORS[block.type], fontWeight: 600 }}>
                    {block.time}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Info boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Días de vacaciones</span></div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, textAlign: 'center' }}>
                {[
                  { label: 'Días anuales', value: 23, color: 'var(--green)' },
                  { label: 'Disfrutados', value: 0, color: 'var(--amber)' },
                  { label: 'Pendientes', value: 23, color: 'var(--brand-light)' },
                ].map(item => (
                  <div key={item.label} style={{ background: 'var(--surface2)', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: item.color }}>{item.value}</div>
                    <div className="text-sm text-muted">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Convenio colectivo</span></div>
            <div className="card-body">
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
                <div>📌 Convenio aplicable: <strong>TIC y Telecomunicaciones</strong></div>
                <div>📌 Jornada máxima anual: <strong>1.800 horas</strong></div>
                <div>📌 Horas extra máximas: <strong>80h/año</strong></div>
                <div>📌 Compensación hora extra: <strong>+25% sobre hora ordinaria</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
