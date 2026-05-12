import axios from 'axios'

const API_BASE = import.meta.env.VITE_REACT_APP_BACKEND_URL

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
