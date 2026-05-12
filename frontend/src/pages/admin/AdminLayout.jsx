import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Package, FileSearch, ClipboardCheck, MapPin } from 'lucide-react'

const NAV = [
  { to: '/admin', icon: LayoutDashboard, label: 'Overview', end: true, testid: 'admin-nav-overview' },
  { to: '/admin/found', icon: Package, label: 'Found items', testid: 'admin-nav-found' },
  { to: '/admin/lost', icon: FileSearch, label: 'Lost reports', testid: 'admin-nav-lost' },
  { to: '/admin/claims', icon: ClipboardCheck, label: 'Claims', testid: 'admin-nav-claims' },
  { to: '/admin/centres', icon: MapPin, label: 'Centres', testid: 'admin-nav-centres' },
]

export default function AdminLayout() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 grid lg:grid-cols-12 gap-8" data-testid="admin-layout">
      <aside className="lg:col-span-3">
        <div className="card p-3 sticky top-20">
          <div className="text-[10px] uppercase tracking-widest text-brand-900/50 font-bold px-3 pt-2 pb-1.5">Admin</div>
          <nav className="space-y-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                data-testid={n.testid}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${
                    isActive ? 'bg-brand-900 text-white' : 'text-brand-900 hover:bg-brand-50'
                  }`
                }
              >
                <n.icon className="w-4 h-4" />
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
      <section className="lg:col-span-9">
        <Outlet />
      </section>
    </div>
  )
}
