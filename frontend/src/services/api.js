import axios from 'axios'

const http = axios.create({ baseURL: '/api' })

http.interceptors.request.use(cfg => {
  const token = localStorage.getItem('esc_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

http.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('esc_token')
      localStorage.removeItem('esc_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  login: d => http.post('/auth/login', d),
  me:    () => http.get('/auth/me'),
}

export const employeesApi = {
  getAll:  p => http.get('/employees', { params: p }),
  getOne:  id => http.get(`/employees/${id}`),
  create:  d => http.post('/employees', d),
  update:  (id, d) => http.put(`/employees/${id}`, d),
  remove:  id => http.delete(`/employees/${id}`),
}

export const attendanceApi = {
  getAll:   p => http.get('/attendance', { params: p }),
  checkIn:  d => http.post('/attendance/checkin', d),
  checkOut: d => http.post('/attendance/checkout', d),
  upsert:   d => http.post('/attendance', d),
}

export const leavesApi = {
  getAll:  p => http.get('/leaves', { params: p }),
  create:  d => http.post('/leaves', d),
  review:  (id, d) => http.patch(`/leaves/${id}/review`, d),
}

export const overtimeApi = {
  getAll:  p => http.get('/overtime', { params: p }),
  create:  d => http.post('/overtime', d),
  approve: id => http.patch(`/overtime/${id}/approve`),
}

export const payrollApi = {
  getAll:      p => http.get('/payroll', { params: p }),
  getSummary:  () => http.get('/payroll/summary'),
  generate:    d => http.post('/payroll/generate', d),
  markPaid:    id => http.patch(`/payroll/${id}/pay`),
  download:    id => http.get(`/payroll/${id}/download`, { responseType: 'blob' }),
  exportExcel: p => http.get('/payroll/report/excel', { params: p, responseType: 'blob' }),
}

export const performanceApi = {
  getAll:  p => http.get('/performance', { params: p }),
  create:  d => http.post('/performance', d),
}

export const notificationsApi = {
  getAll:    p => http.get('/notifications', { params: p }),
  markRead:  id => http.patch(`/notifications/${id}/read`),
  broadcast: d => http.post('/notifications/broadcast', d),
}

export const emailApi = {
  getAll:     p => http.get('/email', { params: p }),
  send:       d => http.post('/email', d),
  markRead:   id => http.patch(`/email/${id}/read`),
  toggleStar: id => http.patch(`/email/${id}/star`),
  delete:     id => http.delete(`/email/${id}`),
}

export const chatApi = {
  getConversation: contactId => http.get(`/chat/${contactId}`),
  send:            d => http.post('/chat', d),
  getContacts:     () => http.get('/chat/contacts'),
}

export const dashboardApi = {
  get: () => http.get('/dashboard'),
}
