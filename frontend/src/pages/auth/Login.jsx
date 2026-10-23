import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, LogIn, AlertCircle, Clock, Wallet, CalendarCheck, MessageSquare } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const DEMO_ACCOUNTS = [
  { username: 'ceo',        password: 'Admin2025!', label: 'Roberto Vidal', role: 'Administrador' },
  { username: 'rrhh.dir',   password: 'RRHH2025!',  label: 'Patricia Morales', role: 'RRHH' },
  { username: 'tech.coord', password: 'Coord2025!', label: 'Marcos Jiménez', role: 'Coordinador' },
  { username: 'carlos.r',   password: 'Emp2025!',   label: 'Carlos Ruiz', role: 'Empleado' },
]

const FEATURES = [
  { icon: Clock, text: 'Fichajes y control horario' },
  { icon: CalendarCheck, text: 'Vacaciones y permisos con aprobación' },
  { icon: Wallet, text: 'Nóminas e informes en Excel' },
  { icon: MessageSquare, text: 'Correo, chat y avisos internos' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [form, setForm]       = useState({ username: '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.username.trim(), form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.status === 401 || err.response?.status === 400
        ? 'Usuario o contraseña incorrectos.'
        : 'No se pudo conectar con el servidor. Si la demo llevaba un rato sin uso, tarda unos segundos en arrancar: vuelve a intentarlo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-left">
        <div className="auth-brand">
          <div className="logo-mark lg"><Building2 size={22} /></div>
          <div>
            <div className="auth-logo-text">ESC Media &amp; Tech</div>
            <div className="auth-sub">Portal de Recursos Humanos</div>
          </div>
        </div>
        <ul className="auth-features">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text}><Icon size={17} strokeWidth={1.75} /> {text}</li>
          ))}
        </ul>
      </section>

      <section className="auth-right">
        <div className="auth-card">
          <h1 className="auth-title">Iniciar sesión</h1>
          <p className="text-muted mb-24">Accede con tu usuario corporativo.</p>

          {error && <div className="alert alert-error mb-16"><AlertCircle size={16} /> {error}</div>}

          <form onSubmit={submit} className="flex-col gap-14">
            <div className="form-group">
              <label className="form-label" htmlFor="login-user">Usuario</label>
              <input id="login-user" className="form-input" autoComplete="username" value={form.username}
                     onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="login-pass">Contraseña</label>
              <input id="login-pass" className="form-input" type="password" autoComplete="current-password" value={form.password}
                     onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              <LogIn size={16} /> {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <div className="demo-accounts">
            <p className="demo-title">Cuentas de demostración</p>
            {DEMO_ACCOUNTS.map(a => (
              <button key={a.username} type="button" className="demo-account"
                      onClick={() => setForm({ username: a.username, password: a.password })}>
                <span>
                  <span className="fw-500">{a.label}</span>
                  <span className="text-muted"> · {a.role}</span>
                </span>
                <span className="mono text-muted">{a.username}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
