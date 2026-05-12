import axios from 'axios'

const BACKEND_URL = import.meta.env.VITE_REACT_APP_BACKEND_URL || process.env.REACT_APP_BACKEND_URL

// Vite reads env via import.meta.env. Mirror frontend/.env REACT_APP_BACKEND_URL.
// Provide a fallback at runtime when window has the value.
function getBackendUrl() {
  // In Vite, import.meta.env keys must start with VITE_, but the existing
  // /app/frontend/.env uses REACT_APP_BACKEND_URL. We define it in vite.config
  // via `define` so process.env.REACT_APP_BACKEND_URL works.
  return (
    BACKEND_URL ||
    (typeof window !== 'undefined' && window.__BACKEND_URL__) ||
    ''
  )
}

export const API_BASE = getBackendUrl()

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

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Surface API errors with the readable detail when present
    if (err.response?.data?.detail) {
      err.message = err.response.data.detail
    }
    // Silently swallow 401 on /auth/me — happens for unauthenticated visitors
    // on every public page load and we don't want noisy console errors.
    if (
      err.response?.status === 401 &&
      err.config?.url?.endsWith('/auth/me')
    ) {
      return Promise.reject({ ...err, silent: true })
    }
    return Promise.reject(err)
  }
)

export default api
