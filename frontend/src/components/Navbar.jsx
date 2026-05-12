import React, { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Bell, LogOut, Search, ShieldCheck, User as UserIcon, Menu, X, ChevronDown } from 'lucide-react'

export default function Navbar() {
  const { user, isAdmin, isStudent, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenu, setUserMenu] = useState(false)

  const close = () => { setMobileOpen(false); setUserMenu(false) }

  const navLinks = [
    { to: '/', label: 'Home', testid: 'nav-home' },
    { to: '/browse', label: 'Browse Found', testid: 'nav-browse' },
    { to: '/centres', label: 'Centres', testid: 'nav-centres' },
    { to: '/leaderboard', label: 'Leaderboard', testid: 'nav-leaderboard' },
    ...(isStudent ? [{ to: '/student', label: 'My Dashboard', testid: 'nav-student' }] : []),
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', testid: 'nav-admin' }] : []),
  ]

  return (
    <header data-testid="app-navbar" className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-brand-900/5">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center gap-6">
        <Link to="/" data-testid="nav-logo" onClick={close} className="flex items-center gap-2 group">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-brand-900 flex items-center justify-center shadow-soft">
            <Search className="w-5 h-5 text-white" strokeWidth={2.5} />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full ring-2 ring-white animate-pulseGlow" />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-extrabold tracking-tight text-brand-900">FindIt</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-brand-900/50 -mt-0.5">Lost &amp; Found</div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1 text-sm font-medium">
          {navLinks.map((n) => (
            <NavLinkItem key={n.to} to={n.to} testid={n.testid}>{n.label}</NavLinkItem>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {!user && (
            <>
              <Link to="/login/student" data-testid="nav-student-login" className="btn-ghost text-sm hidden sm:inline-flex">
                <UserIcon className="w-4 h-4" /> Student
              </Link>
              <Link to="/login/admin" data-testid="nav-admin-login" className="btn-primary text-sm">
                <ShieldCheck className="w-4 h-4" /> Admin
              </Link>
            </>
          )}

          {user && (
            <>
              {isStudent && (
                <button data-testid="nav-bell-btn" onClick={() => { navigate('/student/notifications'); close() }} className="relative w-10 h-10 rounded-full grid place-items-center hover:bg-brand-50 transition" title="Notifications">
                  <Bell className="w-5 h-5 text-brand-900" />
                </button>
              )}
              <div className="relative">
                <button
                  data-testid="nav-user-chip"
                  onClick={() => setUserMenu((v) => !v)}
                  className="flex items-center gap-2 pl-3 pr-2 py-1 rounded-full bg-brand-50/60 border border-brand-900/5 hover:bg-brand-50"
                >
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-900 grid place-items-center text-white text-xs font-bold">
                      {(user.name || user.email)?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="text-xs leading-tight hidden md:block text-left">
                    <div className="font-semibold text-brand-900" data-testid="nav-user-name">{user.name || user.email}</div>
                    <div className="text-[10px] uppercase tracking-wider text-brand-900/60">
                      {isAdmin ? 'Admin' : `Student · ${user.points || 0} pts`}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-brand-900/60" />
                </button>
                {userMenu && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={close} />
                    <div className="absolute right-0 top-full mt-2 w-56 card p-2 z-40 shadow-xl" data-testid="user-menu">
                      <Link to="/me" onClick={close} data-testid="user-menu-profile" className="block px-3 py-2 rounded-lg text-sm text-brand-900 hover:bg-brand-50">Edit profile</Link>
                      {isStudent && (
                        <>
                          <Link to="/student/my-claims" onClick={close} className="block px-3 py-2 rounded-lg text-sm text-brand-900 hover:bg-brand-50">My claims</Link>
                          <Link to="/student/notifications" onClick={close} className="block px-3 py-2 rounded-lg text-sm text-brand-900 hover:bg-brand-50">Notifications</Link>
                        </>
                      )}
                      <button data-testid="nav-logout-btn" onClick={() => { close(); logout() }} className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                        <LogOut className="w-3.5 h-3.5" /> Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          <button
            data-testid="mobile-menu-btn"
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden w-10 h-10 rounded-full grid place-items-center hover:bg-brand-50"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-brand-900/5 bg-white" data-testid="mobile-drawer">
          <div className="max-w-7xl mx-auto px-4 py-3 grid gap-1">
            {navLinks.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end
                onClick={close}
                data-testid={`mobile-${n.testid}`}
                className={({ isActive }) => `px-3 py-2 rounded-xl text-sm font-medium ${isActive ? 'bg-brand-900 text-white' : 'text-brand-900 hover:bg-brand-50'}`}
              >
                {n.label}
              </NavLink>
            ))}
            {!user && (
              <Link to="/login/student" onClick={close} className="btn-ghost text-sm justify-start mt-2">
                <UserIcon className="w-4 h-4" /> Student sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

function NavLinkItem({ to, children, testid }) {
  return (
    <NavLink to={to} data-testid={testid} end
      className={({ isActive }) => `px-3 py-1.5 rounded-full transition ${isActive ? 'bg-brand-900 text-white shadow-soft' : 'text-brand-900/80 hover:bg-brand-50'}`}>
      {children}
    </NavLink>
  )
}
