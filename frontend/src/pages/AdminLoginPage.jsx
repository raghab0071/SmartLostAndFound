import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Navigate, Link, useNavigate } from 'react-router-dom'
import { ShieldCheck, Lock, Mail, User as UserIcon } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminLoginPage() {
  const { user, loginAdmin, registerAdmin } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('admin@campus.edu')
  const [password, setPassword] = useState('Admin@123')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user?.role === 'admin') return <Navigate to="/admin" replace />
  if (user?.role === 'student') return <Navigate to="/student" replace />

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await loginAdmin(email, password)
        toast.success('Welcome back, admin!')
        navigate('/admin')
      } else {
        await registerAdmin(email, password, name)
        toast.success('Admin account created!')
        navigate('/admin')
      }
    } catch (err) {
      toast.error(err.message || 'Authentication failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div data-testid="admin-login-page" className="min-h-[80vh] grid place-items-center p-6">
      <div className="card w-full max-w-md p-8 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-400/20 rounded-full blur-2xl" />
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-900 grid place-items-center text-white mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-brand-900">
            {mode === 'login' ? 'Admin sign in' : 'Create admin account'}
          </h1>
          <p className="text-xs text-brand-900/60 mt-1">
            {mode === 'login' ? 'For staff that manage the campus L&F desks.' : 'Bootstrap a new admin user.'}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-3">
            {mode === 'register' && (
              <div>
                <label className="label">Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-900/40" />
                  <input
                    data-testid="admin-name-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="input pl-9"
                    placeholder="Jane Doe"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-900/40" />
                <input
                  data-testid="admin-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input pl-9"
                />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-900/40" />
                <input
                  data-testid="admin-password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="input pl-9"
                />
              </div>
            </div>
            <button
              data-testid="admin-submit-btn"
              disabled={submitting}
              className="btn-primary w-full mt-2 disabled:opacity-60"
            >
              {submitting ? 'Please wait…' : (mode === 'login' ? 'Sign in' : 'Create account')}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-brand-900/60">
            {mode === 'login' ? (
              <>Don't have an admin account? <button onClick={() => setMode('register')} className="text-brand-700 font-semibold hover:underline" data-testid="admin-switch-register">Register</button></>
            ) : (
              <>Already have one? <button onClick={() => setMode('login')} className="text-brand-700 font-semibold hover:underline" data-testid="admin-switch-login">Sign in</button></>
            )}
          </div>

          <div className="mt-2 text-center text-xs text-brand-900/60">
            Student? <Link to="/login/student" className="text-brand-700 font-semibold hover:underline">Use Google sign-in</Link>
          </div>

          {mode === 'login' && (
            <div className="mt-5 text-xs text-brand-900/50 bg-brand-50/60 rounded-xl p-3 border border-brand-900/5">
              <div className="font-semibold text-brand-900/70 mb-0.5">Demo credentials</div>
              admin@campus.edu / Admin@123
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
