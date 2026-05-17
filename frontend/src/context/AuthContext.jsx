import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)
  const [onboardingState, setOnboardingState] = useState(null)
  const [notificationsCount, setNotificationsCount] = useState(0)
  const exchangeAttempted = useRef(false)
  const navigate = useNavigate()

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/status')
      setUser(data.user)
      return data.user
    } catch (err) {
      const status = err?.response?.status
      if (status === 404) {
        try {
          const { data } = await api.get('/auth/me')
          setUser(data.user)
          return data.user
        } catch (err2) {
          const status2 = err2?.response?.status
          if (status2 !== 401 && status2 !== 403) {
            console.error('fetchMe /auth/me error:', err2.message, err2?.response?.data)
          }
        }
      }
      if (status !== 401 && status !== 403) {
        console.error('fetchMe error:', err.message, err?.response?.data)
      }
      setUser(null)
      return null
    }
  }, [])

  const getSessionIdFromUrl = useCallback(() => {
    const hash = window.location.hash || ''
    const search = window.location.search || ''
    const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
    const queryParams = new URLSearchParams(search.replace(/^\?/, ''))
    return hashParams.get('session_id') || queryParams.get('session_id')
  }, [])

  const refreshOnboarding = useCallback(async (currentUser) => {
    const u = currentUser || user
    if (!u || u.role !== 'admin') {
      setOnboardingState(null)
      return null
    }
    try {
      const { data } = await api.get('/admin/onboarding-status')
      setOnboardingState(data)
      return data
    } catch (err) {
      console.error('refreshOnboarding error:', err.message)
      return null
    }
  }, [user])

  const refreshNotifications = useCallback(async () => {
    if (!user || user.role !== 'student') {
      setNotificationsCount(0)
      return 0
    }
    try {
      const { data } = await api.get('/notifications', { params: { limit: 1 } })
      setNotificationsCount(data.unread || 0)
      return data.unread || 0
    } catch (err) {
      console.error('refreshNotifications error:', err.message)
      return 0
    }
  }, [user])

  // On mount, also handle Emergent OAuth redirect (#session_id=...)
  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      try {
        setAuthError(null)
        const sessionId = getSessionIdFromUrl()
        if (sessionId) {
          if (exchangeAttempted.current) return
          exchangeAttempted.current = true
          console.debug('OAuth callback session_id:', sessionId)
          try {
            // Fetch via local Vite proxy or Vercel edge proxy to completely bypass CORS & backend WAF blocks
            const sessionResponse = await fetch('/emergent-api/auth/v1/env/oauth/session-data', {
              headers: { 'X-Session-ID': sessionId }
            })
            
            if (!sessionResponse.ok) {
              const errorText = await sessionResponse.text()
              let detail = errorText
              try { detail = JSON.parse(errorText).detail || detail } catch (e) {}
              throw new Error(`Invalid session data: ${detail}`)
            }
            const sessionData = await sessionResponse.json()
            
            // Pass the successfully retrieved session data directly to our backend API
            const { data } = await api.post('/auth/google/session', sessionData)
            
            if (!cancelled) {
              localStorage.removeItem('admin_token')
              setUser(data.user)
              setAuthError(null)
              toast.success(`Welcome, ${data.user.name}!`)
              const redirect = sessionStorage.getItem('post_login_redirect') || '/student'
              sessionStorage.removeItem('post_login_redirect')
              window.history.replaceState(null, '', window.location.pathname)
              navigate(redirect, { replace: true })
            }
            return
          } catch (e) {
            const detail = e?.response?.data?.detail || e?.response?.data || e?.message || 'Sign-in failed'
            console.error('OAuth error:', {
              message: e?.message,
              status: e?.response?.status,
              data: e?.response?.data,
              sessionId,
            })
            setAuthError(detail)
            toast.error(`Sign-in failed: ${detail}`)
            window.history.replaceState(null, '', window.location.pathname)
            return
          }
        }
        const u = await fetchMe()
        if (u?.role === 'admin') {
          await refreshOnboarding(u)
        }
        if (u?.role === 'student') {
          await refreshNotifications()
        }
      } catch (err) {
        console.error('Bootstrap error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    bootstrap()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const FRONTEND_BASE_URL = import.meta.env.VITE_REACT_APP_FRONTEND_URL || window.location.origin

  const loginStudentWithGoogle = (redirectPath = '/student') => {
    localStorage.removeItem('admin_token')
    setUser(null)
    setOnboardingState(null)
    sessionStorage.setItem('post_login_redirect', redirectPath)
    const redirectUrl = `${FRONTEND_BASE_URL}/profile`
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`
  }

  const loginAdmin = async (email, password) => {
    const { data } = await api.post('/auth/admin/login', { email, password })
    localStorage.setItem('admin_token', data.access_token)
    setUser(data.user)
    await refreshOnboarding(data.user)
    return data.user
  }

  const registerAdmin = async (email, password, name) => {
    const { data } = await api.post('/auth/admin/register', { email, password, name })
    localStorage.setItem('admin_token', data.access_token)
    setUser(data.user)
    await refreshOnboarding(data.user)
    return data.user
  }

  const updateProfile = async (payload) => {
    const { data } = await api.patch('/auth/profile', payload)
    setUser(data.user)
    if (data.user.role === 'admin') {
      await refreshOnboarding(data.user)
    }
    if (data.user.role === 'student') {
      await refreshNotifications()
    }
    return data.user
  }

  const clearAuthError = () => setAuthError(null)

  const logout = async () => {
    try { await api.post('/auth/logout') } catch {}
    localStorage.removeItem('admin_token')
    setUser(null)
    setOnboardingState(null)
    setNotificationsCount(0)
    setAuthError(null)
    toast.success('Signed out')
    navigate('/')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        clearAuthError,
        onboardingState,
        notificationsCount,
        refreshNotifications,
        fetchMe,
        refreshOnboarding,
        loginStudentWithGoogle,
        loginAdmin,
        registerAdmin,
        updateProfile,
        logout,
        isAdmin: user?.role === 'admin',
        isStudent: user?.role === 'student',
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
