import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import {
  Package, FileSearch, ClipboardCheck, MapPin, TrendingUp, Plus, Users,
} from 'lucide-react'
import { Stat, SectionTitle, Spinner } from '../../components/Common.jsx'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, AreaChart, Area, CartesianGrid,
} from 'recharts'

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/dashboard/analytics')
      .then(({ data }) => setData(data))
      .catch((err) => {
        console.error('Failed to load dashboard:', err)
        setError(err.message || 'Failed to load dashboard')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  if (error) return (
    <div className="card p-8 text-center">
      <div className="text-red-600 font-semibold mb-2">Unable to load dashboard</div>
      <div className="text-sm text-brand-900/60">{error}</div>
    </div>
  )
  if (!data) return null
  const t = data.totals
  const barColors = ['#172f6f', '#2972f5', '#85b8ff', '#ffb627', '#1aaa6e', '#e84a4a', '#a855f7', '#06b6d4']

  // Show empty state if admin has no centres and no found items
  const hasNoCentres = t.centres === 0 && t.found === 0 && t.pending_claims === 0
  
  if (hasNoCentres) {
    return (
      <div data-testid="admin-dashboard" className="space-y-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-brand-600 font-bold mb-2">Your centre</div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-brand-900">Your dashboard</h1>
          </div>
          <Link to="/admin/found/new" className="btn-primary" data-testid="quick-add-found-btn">
            <Plus className="w-4 h-4" /> Log found item
          </Link>
        </div>
        
        <div className="card p-8 text-center border-2 border-dashed border-brand-200">
          <MapPin className="w-12 h-12 text-brand-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-brand-900 mb-2">No centres assigned yet</h2>
          <p className="text-brand-900/60 mb-4">Add a centre to get started with managing lost & found items.</p>
          <Link to="/admin/centres" className="btn-primary inline-block">
            <Plus className="w-4 h-4" /> Create your first centre
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="admin-dashboard" className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-brand-600 font-bold mb-2">Your centre</div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-brand-900">Your dashboard</h1>
        </div>
        <Link to="/admin/found/new" className="btn-primary" data-testid="quick-add-found-btn">
          <Plus className="w-4 h-4" /> Log found item
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat testid="admin-stat-found" label="Total found" value={t.found} icon={Package} accent="brand" sub={`${t.open_found} currently open`} />
        <Stat testid="admin-stat-lost" label="Lost reports" value={t.lost} icon={FileSearch} accent="rose" />
        <Stat testid="admin-stat-pending" label="Pending claims" value={t.pending_claims} icon={ClipboardCheck} accent="amber" />
        <Stat testid="admin-stat-recovery" label="Recovery rate" value={`${t.recovery_rate}%`} icon={TrendingUp} accent="emerald" sub={`${t.returned} returned`} />
        <Stat testid="admin-stat-centres" label="Centres" value={t.centres} icon={MapPin} accent="indigo" />
        <Stat testid="admin-stat-students" label="Students" value={t.students} icon={Users} accent="brand" />
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        <div className="card p-5 lg:col-span-3">
          <SectionTitle title="Weekly trend" subtitle="New lost reports vs. found items, last 7 days." />
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={data.weekly_trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="lostGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e84a4a" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#e84a4a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="foundGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2972f5" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#2972f5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(20,50,110,0.06)" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: 'rgba(20,50,110,0.1)' }} />
                <Area type="monotone" dataKey="found" stroke="#2972f5" fill="url(#foundGrad)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="lost" stroke="#e84a4a" fill="url(#lostGrad)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5 lg:col-span-2">
          <SectionTitle title="By category" subtitle="Found items breakdown." />
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={data.by_category} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="rgba(20,50,110,0.06)" />
                <XAxis dataKey="category" stroke="#64748b" fontSize={10} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: 'rgba(20,50,110,0.1)' }} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {data.by_category.map((_, i) => (<Cell key={i} fill={barColors[i % barColors.length]} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="font-bold text-brand-900 text-lg">Shortcuts</div>
        <div className="grid sm:grid-cols-3 gap-3 mt-3">
          <Link to="/admin/found/new" className="card p-4 hover:shadow-xl transition border border-brand-900/5" data-testid="shortcut-found-new">
            <Plus className="w-5 h-5 text-brand-600" />
            <div className="font-semibold text-brand-900 text-sm mt-2">Log a new found item</div>
            <div className="text-xs text-brand-900/60">Generate QR + match to lost reports.</div>
          </Link>
          <Link to="/admin/claims" className="card p-4 hover:shadow-xl transition border border-brand-900/5" data-testid="shortcut-claims">
            <ClipboardCheck className="w-5 h-5 text-amber-600" />
            <div className="font-semibold text-brand-900 text-sm mt-2">Review pending claims</div>
            <div className="text-xs text-brand-900/60">{t.pending_claims} waiting for your decision.</div>
          </Link>
          <Link to="/admin/centres" className="card p-4 hover:shadow-xl transition border border-brand-900/5" data-testid="shortcut-centres">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <div className="font-semibold text-brand-900 text-sm mt-2">Manage centres</div>
            <div className="text-xs text-brand-900/60">Edit hours, contacts and locations.</div>
          </Link>
        </div>
      </div>
    </div>
  )
}
