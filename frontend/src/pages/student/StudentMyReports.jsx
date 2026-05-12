import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../../lib/api'
import { SectionTitle, Spinner, EmptyState } from '../../components/Common.jsx'
import { FileText, MapPin, Calendar, Sparkles, RefreshCcw, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function StudentMyReports() {
  const [search] = useSearchParams()
  const focusId = search.get('focus')
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [matches, setMatches] = useState({})  // {lostItemId: [matches]}
  const [refreshing, setRefreshing] = useState({})

  const load = () => {
    setLoading(true)
    api.get('/items/lost').then(({ data }) => setReports(data || [])).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const loadMatches = async (lostId) => {
    try {
      const { data } = await api.get(`/ai/match/${lostId}`)
      setMatches((m) => ({ ...m, [lostId]: data || [] }))
    } catch {}
  }
  const refresh = async (lostId) => {
    setRefreshing((r) => ({ ...r, [lostId]: true }))
    try {
      const { data } = await api.post(`/ai/match/${lostId}/refresh`)
      setMatches((m) => ({ ...m, [lostId]: data || [] }))
      toast.success('AI re-scanned — ' + (data.length) + ' matches')
    } catch (e) {
      toast.error('Refresh failed')
    } finally {
      setRefreshing((r) => ({ ...r, [lostId]: false }))
    }
  }

  // Auto-load matches for all
  useEffect(() => {
    reports.forEach((r) => loadMatches(r.item_id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports])

  if (loading) return <Spinner />

  return (
    <div data-testid="student-myreports-page" className="space-y-6">
      <SectionTitle kicker="Your reports" title="My lost items &amp; AI matches" />
      {reports.length === 0 && (
        <EmptyState
          icon={FileText}
          title="No reports yet"
          body="You haven't reported any lost item. Start one in seconds."
          action={<Link to="/student/report" className="btn-primary">Report a lost item</Link>}
          testid="my-reports-empty"
        />
      )}
      <div className="space-y-5">
        {reports.map((r) => {
          const m = matches[r.item_id] || []
          const highlight = focusId === r.item_id
          return (
            <div key={r.item_id} data-testid={`my-report-${r.item_id}`} className={`card p-5 ${highlight ? 'ring-2 ring-amber-400' : ''}`}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`chip status-${r.status}`}>{r.status}</span>
                    <span className="chip bg-brand-50 text-brand-900 border border-brand-900/10">{r.category}</span>
                  </div>
                  <h3 className="font-bold text-brand-900 text-lg">{r.title}</h3>
                  <p className="text-sm text-brand-900/60 mt-0.5 line-clamp-2">{r.description}</p>
                  <div className="text-xs text-brand-900/60 mt-2 flex items-center gap-4">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {r.last_seen_location}</span>
                    {r.date_lost && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {r.date_lost}</span>}
                  </div>
                </div>
                <button
                  data-testid={`refresh-matches-${r.item_id}`}
                  onClick={() => refresh(r.item_id)}
                  disabled={!!refreshing[r.item_id]}
                  className="btn-ghost text-xs disabled:opacity-60"
                >
                  <RefreshCcw className={`w-3.5 h-3.5 ${refreshing[r.item_id] ? 'animate-spin' : ''}`} /> Re-run AI
                </button>
              </div>

              <div className="mt-5 pt-5 border-t border-brand-900/5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-brand-600 font-bold mb-3">
                  <Sparkles className="w-3.5 h-3.5" /> AI Matches
                </div>
                {m.length === 0 && (
                  <div className="text-sm text-brand-900/60">No matches yet — they'll appear here as found items are logged.</div>
                )}
                <div className="grid sm:grid-cols-2 gap-3">
                  {m.slice(0, 4).map((mm) => (
                    <Link
                      key={mm.found_item_id}
                      to={`/items/${mm.found_item_id}`}
                      data-testid={`match-${r.item_id}-${mm.found_item_id}`}
                      className="card flex p-3 gap-3 items-center hover:shadow-xl transition border border-brand-900/5"
                    >
                      <div className="w-14 h-14 rounded-lg bg-brand-50 overflow-hidden shrink-0">
                        {mm.image && <img src={mm.image} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-brand-900 truncate">{mm.title}</div>
                        <div className="text-[11px] text-brand-900/60 truncate">{mm.location_found}</div>
                        <div className="text-[11px] text-brand-900/50 line-clamp-1 mt-0.5">{mm.reasoning}</div>
                      </div>
                      <div className="text-right pr-1">
                        <div className={`text-lg font-extrabold ${mm.similarity >= 70 ? 'text-emerald-600' : mm.similarity >= 40 ? 'text-amber-600' : 'text-brand-900/60'}`}>
                          {mm.similarity}%
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-brand-900/40 ml-auto" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
