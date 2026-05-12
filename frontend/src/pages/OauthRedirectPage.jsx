import React from 'react'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'
import { Spinner } from '../components/Common.jsx'

/**
 * OAuth callback page. AuthContext detects #session_id= in URL, exchanges it,
 * and navigates onward. While loading, show a spinner.
 */
export default function OauthRedirectPage() {
  const { user, loading } = useAuth()
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
  if (user?.role === 'admin') return <Navigate to="/admin" replace />
  if (user?.role === 'student') return <Navigate to="/student" replace />
  return <Navigate to="/" replace />
}
