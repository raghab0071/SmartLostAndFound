import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, FilePlus2, FileText, Inbox, Bell } from 'lucide-react'

const NAV = [
  { to: '/student', icon: LayoutDashboard, label: 'Overview', end: true, testid: 'student-nav-overview' },
  { to: '/student/report', icon: FilePlus2, label: 'Report lost item', testid: 'student-nav-report' },
  { to: '/student/my-reports', icon: FileText, label: 'My reports & matches', testid: 'student-nav-reports' },
  { to: '/student/my-claims', icon: Inbox, label: 'My claims', testid: 'student-nav-claims' },
  { to: '/student/notifications', icon: Bell, label: 'Notifications', testid: 'student-nav-notifications' },
]

export default function StudentLayout() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 grid lg:grid-cols-12 gap-8" data-testid="student-layout">
      <aside className="lg:col-span-3">
        <div className="card p-3 sticky top-20">
          <div className="text-[10px] uppercase tracking-widest text-brand-900/50 font-bold px-3 pt-2 pb-1.5">Student</div>
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
