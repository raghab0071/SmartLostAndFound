import React, { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Navigate, useNavigate } from 'react-router-dom'
import { Spinner } from '../components/Common.jsx'

/**
 * OAuth callback page. AuthContext detects #session_id= in URL, exchanges it,
 * and navigates onward. While loading, show a spinner.
 */
export default function OauthRedirectPage() {
  const { user, loading, authError, clearAuthError } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    return () => {
      clearAuthError()
    }
  }, [clearAuthError])

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center" data-testid="oauth-redirect-page">
        <div className="text-center">
          <Spinner />
          <div className="text-sm text-brand-900/60 mt-2">Signing you in…</div>
        </div>
      </div>
    )
  }

  if (authError) {
    return (
      <div className="min-h-[60vh] grid place-items-center px-4" data-testid="oauth-error-page">
        <div className="max-w-xl w-full bg-white border border-rose-200 shadow-sm rounded-3xl p-8 text-center">
          <h1 className="text-3xl font-bold text-rose-700">Sign-in failed</h1>
          <p className="mt-4 text-sm text-rose-600 leading-relaxed">We could not complete login with Google.</p>
          <div className="mt-6 rounded-2xl bg-rose-50 border border-rose-100 p-4 text-left text-sm text-rose-800">
            <strong>Details:</strong>
            <div className="mt-2 break-words whitespace-pre-wrap">{authError}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              clearAuthError()
              navigate('/login/student')
            }}
            className="mt-8 inline-flex items-center justify-center rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold text-white hover:bg-rose-700 transition"
          >
            Return to student login
          </button>
        </div>
      </div>
    )
  }

  if (user?.role === 'admin') return <Navigate to="/admin" replace />
  if (user?.role === 'student') return <Navigate to="/student" replace />
  return <Navigate to="/" replace />
}
