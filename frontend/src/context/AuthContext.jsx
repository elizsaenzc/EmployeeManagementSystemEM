import { createContext, useContext, useState } from 'react'
import { authApi } from '../services/api'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('esc_user')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  const login = async (username, password) => {
    const res = await authApi.login({ username, password })
    localStorage.setItem('esc_token', res.data.token)
    localStorage.setItem('esc_user',  JSON.stringify(res.data))
    setUser(res.data)
    return res.data
  }

  const logout = () => {
    localStorage.removeItem('esc_token')
    localStorage.removeItem('esc_user')
    setUser(null)
  }

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
