import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [onboardingState, setOnboardingState] = useState(null)
  const navigate = useNavigate()

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me')
      setUser(data.user)
      return data.user
    } catch (err) {
      console.error('fetchMe error:', err.message)
      setUser(null)
      return null
    }
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

  // On mount, also handle Emergent OAuth redirect (#session_id=...)
  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      try {
        const hash = window.location.hash || ''
        if (hash.includes('session_id=')) {
          const params = new URLSearchParams(hash.replace(/^#/, ''))
          const sessionId = params.get('session_id')
          if (sessionId) {
            try {
              const { data } = await api.post('/auth/google/session', { session_id: sessionId })
              if (!cancelled) {
                setUser(data.user)
                toast.success(`Welcome, ${data.user.name}!`)
                const redirect = sessionStorage.getItem('post_login_redirect') || '/student'
                sessionStorage.removeItem('post_login_redirect')
                window.history.replaceState(null, '', window.location.pathname)
                navigate(redirect, { replace: true })
              }
            } catch (e) {
              console.error('OAuth error:', e.message)
              toast.error('Sign-in failed. Please try again.')
              window.history.replaceState(null, '', window.location.pathname)
            }
          }
        }
        const u = await fetchMe()
        if (u?.role === 'admin') {
          await refreshOnboarding(u)
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

  const loginStudentWithGoogle = (redirectPath = '/student') => {
    sessionStorage.setItem('post_login_redirect', redirectPath)
    const redirectUrl = `${window.location.origin}/profile`
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
    if (data.user.role === 'admin') await refreshOnboarding(data.user)
    return data.user
  }

  const logout = async () => {
    try { await api.post('/auth/logout') } catch {}
    localStorage.removeItem('admin_token')
    setUser(null)
    setOnboardingState(null)
    toast.success('Signed out')
    navigate('/')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        onboardingState,
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
