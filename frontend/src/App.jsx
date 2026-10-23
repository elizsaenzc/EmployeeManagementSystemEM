import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth }                  from './context/AuthContext'
import Sidebar    from './components/layout/Sidebar'
import { ShellContext } from './components/layout/ShellContext'
import Login      from './pages/auth/Login'
import Dashboard  from './pages/dashboard/Dashboard'
import Attendance from './pages/employee/Attendance'
import Schedule   from './pages/employee/Schedule'
import { LeavesPage, OvertimePage } from './pages/employee/Leaves'
import Performance    from './pages/employee/Performance'
import Notifications  from './pages/employee/Notifications'
import { DocumentsPage, PayrollPage, ReportsPage } from './pages/hr/Payroll'
import Employees  from './pages/employees/Employees'
import Email      from './pages/email/Email'
import Chat       from './pages/chat/Chat'

function Shell({ children }) {
  const [navOpen, setNavOpen] = useState(false)
  return (
    <ShellContext.Provider value={{ navOpen, setNavOpen }}>
      <div className="app-shell">
        <Sidebar />
        <main className="main-area">{children}</main>
      </div>
    </ShellContext.Provider>
  )
}

function AppRoutes() {
  const { user } = useAuth()

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*"      element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  const isManager = ['Coordinator','HR','Admin'].includes(user.role)
  const isHR      = ['HR','Admin'].includes(user.role)

  return (
    <Shell>
      <Routes>
        <Route path="/"              element={<Dashboard />} />
        <Route path="/dashboard"     element={<Dashboard />} />

        {/* Attendance & time */}
        <Route path="/attendance"    element={<Attendance />} />
        <Route path="/schedule"      element={<Schedule />} />

        {/* Leave & overtime */}
        <Route path="/leaves"        element={<LeavesPage />} />
        <Route path="/overtime"      element={<OvertimePage />} />

        {/* My documents (all roles) */}
        <Route path="/documents"     element={<DocumentsPage />} />

        {/* Performance (all roles, but create only for managers) */}
        <Route path="/performance"   element={<Performance />} />

        {/* Communications */}
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/email"         element={<Email />} />
        <Route path="/chat"          element={<Chat />} />

        {/* HR & Admin only */}
        {isHR && <Route path="/payroll"    element={<PayrollPage />} />}
        {isHR && <Route path="/reports"    element={<ReportsPage />} />}

        {/* Coordinator, HR & Admin: team view */}
        {isManager && <Route path="/team"  element={<Employees teamOnly />} />}

        {/* HR & Admin: full employee management */}
        {isHR && <Route path="/employees"  element={<Employees />} />}

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
