import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const DEMO_ACCOUNTS = [
  { username: 'ceo',         password: 'Admin2025!',  role: 'Admin',       label: 'CEO / Admin' },
  { username: 'rrhh.dir',    password: 'RRHH2025!',   role: 'HR',          label: 'Directora RRHH' },
  { username: 'tech.coord',  password: 'Coord2025!',  role: 'Coordinator', label: 'Coord. Tecnología' },
  { username: 'carlos.r',    password: 'Emp2025!',    role: 'Employee',    label: 'Empleado (Carlos R.)' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [form, setForm]   = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.username, form.password)
      navigate('/')
    } catch {
      setError('Credenciales incorrectas. Verifica tu usuario y contraseña.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = acc => setForm({ username: acc.username, password: acc.password })

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div>
          <div className="auth-logo-text">ESC Media &amp; Tech</div>
          <div className="auth-sub">Portal de Recursos Humanos</div>
          <div className="auth-tagline">Gestiona tu empresa desde un solo lugar</div>
          <div className="auth-desc">
            Control de asistencia, nóminas, permisos, comunicación interna y evaluación de desempeño — todo integrado.
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: 'var(--brand)' }}>
            Acceder
          </h1>
          <p style={{ color: 'var(--text3)', marginBottom: 24, fontSize: 13 }}>
            Introduce tus credenciales corporativas
          </p>

          {error && (
            <div style={{ background: 'var(--red-dim)', color: 'var(--red)', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Usuario</label>
              <input className="form-input" value={form.username}
                     onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                     placeholder="usuario.apellido" required />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input className="form-input" type="password" value={form.password}
                     onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                     placeholder="••••••••" required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}
                    style={{ justifyContent: 'center', padding: '11px', marginTop: 4, fontSize: 14 }}>
              {loading ? 'Iniciando sesión…' : 'Acceder al portal'}
            </button>
          </form>

          <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 18 }}>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              Cuentas de demo
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {DEMO_ACCOUNTS.map(a => (
                <button key={a.username}
                        onClick={() => fillDemo(a)}
                        style={{
                          border: '1px solid var(--border)', borderRadius: 7, padding: '7px 12px',
                          background: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', fontSize: 12, color: 'var(--text2)', fontFamily: 'inherit'
                        }}>
                  <span>{a.label}</span>
                  <span style={{ color: 'var(--text3)', fontSize: 11 }}>{a.username}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
