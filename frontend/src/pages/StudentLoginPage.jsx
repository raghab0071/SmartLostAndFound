import React from 'react'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'
import { Search, ShieldCheck } from 'lucide-react'

export default function StudentLoginPage() {
  const { user, loginStudentWithGoogle } = useAuth()
  if (user?.role === 'student') return <Navigate to="/student" replace />
  if (user?.role === 'admin') return <Navigate to="/admin" replace />

  return (
    <div data-testid="student-login-page" className="min-h-[80vh] grid lg:grid-cols-2 gap-0">
      <div className="hidden lg:block relative bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 overflow-hidden">
        <div className="absolute inset-0 grain opacity-40" />
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="relative h-full flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2">
            <Search className="w-6 h-6 text-amber-300" />
            <div className="font-extrabold text-xl">FindIt</div>
          </div>
          <div>
            <h2 className="text-4xl font-black leading-tight">
              Hi, student.<br />
              <span className="text-amber-300">Get your stuff back.</span>
            </h2>
            <p className="mt-4 text-white/80 max-w-md">
              Sign in with your Google account to report lost items, see AI-matched finds, and track your claims.
            </p>
          </div>
          <div className="text-white/40 text-sm">Trusted by students across campus.</div>
        </div>
      </div>

      <div className="grid place-items-center p-8">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-extrabold text-brand-900">Welcome back</h1>
          <p className="text-sm text-brand-900/60 mt-2">Sign in with your campus Google account to continue.</p>

          <button
            data-testid="google-signin-btn"
            onClick={() => loginStudentWithGoogle('/student')}
            className="mt-8 w-full inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-white border-2 border-brand-900/10 hover:border-brand-400 hover:shadow-soft transition font-medium text-brand-900"
          >
            <GoogleIcon /> Continue with Google
          </button>

          <div className="mt-6 text-xs text-brand-900/60 text-center">
            Are you an admin? <a href="/login/admin" className="text-brand-700 font-semibold hover:underline inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Admin sign-in
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.98.66-2.23 1.05-3.71 1.05-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.95l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
  )
}
