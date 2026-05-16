import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import { SectionTitle, Spinner, EmptyState } from '../../components/Common.jsx'
import { FileSearch, MapPin, Calendar, User, Sparkles } from 'lucide-react'

export default function AdminLostReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [matches, setMatches] = useState({})

  useEffect(() => {
    // Fetch lost items that are visible to this admin
    // For admins: shows public reports + institute-only reports matching their institute
    api.get('/items/lost', { params: { limit: 200 } })
      .then(({ data }) => setReports(data || []))
      .catch((err) => {
        console.error('Failed to fetch lost reports:', err)
        setReports([])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    reports.forEach((r) => {
      api.get(`/ai/match/${r.item_id}`).then(({ data }) => {
        setMatches((m) => ({ ...m, [r.item_id]: data || [] }))
      }).catch(() => {})
    })
  }, [reports])

  if (loading) return <Spinner />

  return (
    <div data-testid="admin-lost-page">
      <SectionTitle kicker="Live" title="Lost reports" subtitle="Every student-submitted lost item, newest first." />
      {reports.length === 0 && <EmptyState icon={FileSearch} title="No reports yet" testid="admin-lost-empty" />}
      <div className="space-y-4">
        {reports.map((r) => {
          const m = matches[r.item_id] || []
          return (
            <div key={r.item_id} className="card p-5" data-testid={`admin-lost-${r.item_id}`}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`chip status-${r.status}`}>{r.status}</span>
                    <span className="chip bg-brand-50 text-brand-900 border border-brand-900/10">{r.category}</span>
                  </div>
                  <h3 className="font-bold text-brand-900 text-lg">{r.title}</h3>
                  <p className="text-sm text-brand-900/60 mt-0.5 line-clamp-2">{r.description}</p>
                  <div className="text-xs text-brand-900/70 mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {r.reported_by_name}</span>
                    {r.contact && <span>· {r.contact}</span>}
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {r.last_seen_location}</span>
                    {r.date_lost && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {r.date_lost}</span>}
                  </div>
                </div>
              </div>

              {m.length > 0 && (
                <div className="mt-4 pt-4 border-t border-brand-900/5">
                  <div className="flex items-center gap-1 text-[11px] uppercase tracking-widest font-bold text-amber-700 mb-2">
                    <Sparkles className="w-3 h-3" /> Top AI matches
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {m.slice(0, 3).map((mm) => (
                      <Link
                        key={mm.found_item_id}
                        to={`/items/${mm.found_item_id}`}
                        className="chip bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100"
                      >
                        <span className="font-extrabold">{mm.similarity}%</span> {mm.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
