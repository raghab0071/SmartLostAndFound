import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center" data-testid="loading-spinner">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    const target = role === 'admin' ? '/login/admin' : '/login/student'
    return <Navigate to={target} state={{ from: location }} replace />
  }
  if (role && user.role !== role) {
    return <Navigate to="/" replace />
  }
  return children
}
