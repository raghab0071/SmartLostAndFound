import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { Award, FilePlus2, Inbox, Sparkles, TrendingUp, FileText, Trophy } from 'lucide-react'
import { Stat, SectionTitle, Spinner } from '../../components/Common.jsx'

export default function StudentDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState({ reports: [], claims: [], notif: { items: [], unread: 0 } })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/items/lost'),
      api.get('/claims'),
      api.get('/notifications'),
    ])
      .then(([r, c, n]) => setData({ reports: r.data || [], claims: c.data || [], notif: n.data || { items: [], unread: 0 } }))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  const activeReports = data.reports.filter((r) => r.status === 'open' || r.status === 'matched').length
  const pendingClaims = data.claims.filter((c) => c.status === 'pending' || c.status === 'more_proof_requested').length
  const approved = data.claims.filter((c) => c.status === 'approved').length

  return (
    <div data-testid="student-dashboard" className="space-y-8">
      <div>
        <div className="text-xs uppercase tracking-[0.22em] text-brand-600 font-bold mb-2">Hi {user?.name?.split(' ')[0] || 'there'}</div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-brand-900">Your campus dashboard</h1>
        <p className="text-brand-900/60 mt-2">Track reports, claims and rewards in one place.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat testid="stat-points" label="Points" value={user?.points || 0} icon={Trophy} accent="amber" sub="Earn 50 pts per successful claim" />
        <div className="relative">
          <Stat testid="stat-active-reports" label="Active reports" value={activeReports} icon={FileText} accent="brand" />
          {activeReports > 0 && (
            <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white" title="New updates" />
          )}
        </div>
        <div className="relative">
          <Stat testid="stat-pending-claims" label="Open claims" value={pendingClaims} icon={Inbox} accent="indigo" />
          {pendingClaims > 0 && (
            <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-purple-500 ring-2 ring-white" title="New updates" />
          )}
        </div>
        <div className="relative">
          <Stat testid="stat-recovered" label="Recovered" value={approved} icon={TrendingUp} accent="emerald" />
          {approved > 0 && (
            <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-white" title="New updates" />
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="card p-6 lg:col-span-2 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-amber-200/40 rounded-full blur-2xl" />
          <div className="relative">
            <h3 className="font-extrabold text-brand-900 text-lg">Quick actions</h3>
            <p className="text-sm text-brand-900/60 mt-1">Get something done in seconds.</p>
            <div className="mt-5 grid sm:grid-cols-2 gap-3">
              <Link to="/student/report" data-testid="qa-report-btn" className="card p-4 hover:shadow-xl hover:-translate-y-0.5 transition border border-brand-900/5 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 grid place-items-center text-brand-700"><FilePlus2 className="w-5 h-5" /></div>
                <div>
                  <div className="font-semibold text-brand-900 text-sm">Report a lost item</div>
                  <div className="text-xs text-brand-900/60">AI starts matching immediately.</div>
                </div>
              </Link>
              <Link to="/browse" data-testid="qa-browse-btn" className="card p-4 hover:shadow-xl hover:-translate-y-0.5 transition border border-brand-900/5 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 grid place-items-center text-amber-700"><Sparkles className="w-5 h-5" /></div>
                <div>
                  <div className="font-semibold text-brand-900 text-sm">Browse found items</div>
                  <div className="text-xs text-brand-900/60">See recent finds across centres.</div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-brand-900">Your badges</h3>
            <Award className="w-5 h-5 text-amber-500" />
          </div>
          {user?.badges?.length ? (
            <div className="flex flex-wrap gap-2 mt-4">
              {user.badges.map((b, i) => (
                <span key={i} className="chip bg-amber-50 text-amber-700 border border-amber-200" data-testid={`badge-${i}`}>
                  <Award className="w-3 h-3" /> {b}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-brand-900/60 mt-3">Reunite an item to earn your first badge.</p>
          )}
        </div>
      </div>

      <div>
        <SectionTitle title="Your lost items" subtitle="Track your reports and their status." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.reports.length === 0 ? (
            <div className="col-span-full text-sm text-brand-900/60 py-6">
              No lost items reported yet. <Link to="/student/report" className="text-brand-600 hover:underline font-semibold">Report one now</Link>
            </div>
          ) : (
            data.reports.map((r) => {
              const statusLabel = r.status === 'claimed' ? 'returned' : r.status
              return (
                <Link
                  key={r.item_id}
                  to={`/student/my-reports?focus=${r.item_id}`}
                  className="card p-4 hover:shadow-xl hover:-translate-y-0.5 transition border border-brand-900/5 relative"
                >
                  <div className="absolute top-3 left-3">
                    <span className={`chip status-${statusLabel}`}>{statusLabel}</span>
                  </div>
                  {r.status === 'claimed' && (
                    <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-bold border border-green-500">
                      ✓ Resolved
                    </div>
                  )}
                  <div className="mt-6">
                    <h4 className="font-bold text-brand-900 line-clamp-1">{r.title}</h4>
                    <p className="text-xs text-brand-900/60 mt-1 line-clamp-2">{r.description}</p>
                    <div className="text-[11px] text-brand-900/60 mt-2 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> {r.category}
                    </div>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>

      <div>
        <SectionTitle title="Latest notifications" subtitle="Match alerts, claim updates and rewards land here." />
        <div className="space-y-3">
          {data.notif.items.slice(0, 5).map((n) => (
            <div key={n.notification_id} className="card p-4 flex items-start gap-3" data-testid={`dash-notif-${n.notification_id}`}>
              <div className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${n.read ? 'bg-brand-50 text-brand-700' : 'bg-amber-100 text-amber-700'}`}>
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-brand-900">{n.title}</div>
                <div className="text-xs text-brand-900/60 mt-0.5">{n.body}</div>
              </div>
              {!n.read && <span className="w-2 h-2 rounded-full bg-red-500 mt-2" />}
            </div>
          ))}
          {!data.notif.items.length && (
            <div className="text-sm text-brand-900/60">No notifications yet. We'll let you know the moment something matches.</div>
          )}
        </div>
      </div>
    </div>
  )
}
