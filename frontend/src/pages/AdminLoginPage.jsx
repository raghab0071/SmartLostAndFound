import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Navigate, Link, useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Lock,
  Mail,
  User as UserIcon,
} from 'lucide-react'

import toast from 'react-hot-toast'

export default function AdminLoginPage() {
  const { user, loginAdmin, registerAdmin } = useAuth()

  const navigate = useNavigate()

  const [mode, setMode] = useState('login')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')

  const [submitting, setSubmitting] = useState(false)

  if (user?.role === 'admin')
    return <Navigate to="/admin" replace />

  if (user?.role === 'student')
    return <Navigate to="/student" replace />

  const submit = async (e) => {
    e.preventDefault()

    setSubmitting(true)

    try {
      if (mode === 'login') {
        await loginAdmin(email, password)

        toast.success('Welcome back, admin!')

        navigate('/admin')
      } else {
        // Confirm password validation
        if (password !== confirmPassword) {
          toast.error('Passwords do not match')

          setSubmitting(false)
          return
        }

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
    <div
      data-testid="admin-login-page"
      className="min-h-[80vh] grid place-items-center p-6"
    >
      <div className="card w-full max-w-md p-8 relative overflow-hidden">

        {/* Glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-400/20 rounded-full blur-2xl" />

        <div className="relative">

          {/* Icon */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-900 grid place-items-center text-white mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-extrabold text-brand-900">
            {mode === 'login'
              ? 'Admin sign in'
              : 'Create admin account'}
          </h1>

          <p className="text-xs text-brand-900/60 mt-1">
            {mode === 'login'
              ? 'For staff that manage the campus L&F desks.'
              : 'Bootstrap a new admin user.'}
          </p>

          {/* Form */}
          <form
            onSubmit={submit}
            className="mt-6 space-y-4"
          >

            {/* Name */}
            {mode === 'register' && (
              <div>
                <label className="label">
                  NAME
                </label>

                <div className="relative">

                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-900/40 pointer-events-none" />

                  <input
                    data-testid="admin-name-input"
                    type="text"
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value)
                    }
                    required
                    placeholder="Jane Doe"
                    className="input pl-11 h-12 leading-none placeholder:text-brand-900/30"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="label">
                EMAIL
              </label>

              <div className="relative">

                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-900/40 pointer-events-none" />

                <input
                  data-testid="admin-email-input"
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  required
                  placeholder="admin@campus.edu"
                  className="input pl-11 h-12 leading-none placeholder:text-brand-900/30"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label">
                PASSWORD
              </label>

              <div className="relative">

                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-900/40 pointer-events-none" />

                <input
                  data-testid="admin-password-input"
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  required
                  minLength={6}
                  placeholder="Enter password"
                  className="input pl-11 h-12 leading-none placeholder:text-brand-900/30"
                />
              </div>
            </div>

            {/* Confirm Password */}
            {mode === 'register' && (
              <div>
                <label className="label">
                  CONFIRM PASSWORD
                </label>

                <div className="relative">

                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-900/40 pointer-events-none" />

                  <input
                    data-testid="admin-confirm-password-input"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                    required
                    minLength={6}
                    placeholder="Confirm password"
                    className="input pl-11 h-12 leading-none placeholder:text-brand-900/30"
                  />
                </div>

                {/* Error */}
                {confirmPassword &&
                  password !== confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">
                      Passwords do not match
                    </p>
                  )}
              </div>
            )}

            {/* Submit */}
            <button
              data-testid="admin-submit-btn"
              disabled={
                submitting ||
                (mode === 'register' &&
                  password !== confirmPassword)
              }
              className="btn-primary w-full mt-2 disabled:opacity-60"
            >
              {submitting
                ? 'Please wait...'
                : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
            </button>

          </form>

          {/* Toggle */}
          <div className="mt-5 text-center text-xs text-brand-900/60">

            {mode === 'login' ? (
              <>
                Don't have an admin account?{' '}

                <button
                  onClick={() =>
                    setMode('register')
                  }
                  className="text-brand-700 font-semibold hover:underline"
                  data-testid="admin-switch-register"
                >
                  Register
                </button>
              </>
            ) : (
              <>
                Already have one?{' '}

                <button
                  onClick={() =>
                    setMode('login')
                  }
                  className="text-brand-700 font-semibold hover:underline"
                  data-testid="admin-switch-login"
                >
                  Sign in
                </button>
              </>
            )}

          </div>

          {/* Student */}
          <div className="mt-2 text-center text-xs text-brand-900/60">

            Student?{' '}

            <Link
              to="/login/student"
              className="text-brand-700 font-semibold hover:underline"
            >
              Use Google sign-in
            </Link>

          </div>

          {/* Demo */}
          {mode === 'login' && (
            <div className="mt-5 text-xs text-brand-900/50 bg-brand-50/60 rounded-xl p-3 border border-brand-900/5">

              <div className="font-semibold text-brand-900/70 mb-0.5">
              
              </div>

              {/* admin@campus.edu / Admin@123 */}

            </div>
          )}

        </div>
      </div>
    </div>
  )
}