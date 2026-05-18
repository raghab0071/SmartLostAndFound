import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../../lib/api'
import { SectionTitle, Spinner, EmptyState } from '../../components/Common.jsx'
import { FileText, MapPin, Calendar, Sparkles, RefreshCcw, ArrowRight, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function StudentMyReports() {
  const [search] = useSearchParams()
  const focusId = search.get('focus')
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [matches, setMatches] = useState({})
  const [refreshing, setRefreshing] = useState({})
  const [deleting, setDeleting] = useState({})
  const [claims, setClaims] = useState({}) // {foundItemId: claim}

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/items/lost').then(({ data }) => setReports(data || [])),
      api.get('/claims').then(({ data }) => {
        // Build map of found_item_id -> claim for quick lookup
        const claimsMap = {}
        data.forEach(c => {
          claimsMap[c.found_item_id] = c
        })
        setClaims(claimsMap)
      })
    ]).finally(() => setLoading(false))
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

  const handleDelete = async (lostId) => {
    if (!confirm('Delete this lost report? This cannot be undone.')) return
    setDeleting(prev => ({ ...prev, [lostId]: true }))
    try {
      await api.delete(`/items/lost/${lostId}`)
      toast.success('Lost report deleted')
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to delete report')
    } finally {
      setDeleting(prev => ({ ...prev, [lostId]: false }))
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
          const isClaimed = r.status === 'claimed'
          
          return (
            <div 
              key={r.item_id} 
              data-testid={`my-report-${r.item_id}`} 
              className={`card p-5 relative transition-all ${highlight ? 'ring-2 ring-amber-400' : ''} ${isClaimed ? 'opacity-50 blur-sm' : ''}`}
            >
              {/* Delete Button */}
              <button
                onClick={() => handleDelete(r.item_id)}
                disabled={deleting[r.item_id]}
                data-testid={`delete-report-${r.item_id}`}
                className="absolute top-3 right-3 w-8 h-8 grid place-items-center rounded-full hover:bg-red-50 disabled:opacity-50"
                title="Delete this report"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>

              <div className="flex flex-wrap items-start gap-3 pr-12">
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
                  {m.slice(0, 4).map((mm) => {
                    const claim = claims[mm.found_item_id]
                    const claimStatus = claim?.status
                    
                    return (
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
                          {claimStatus && (
                            <div className={`text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full inline-block ${
                              claimStatus === 'approved' ? 'bg-green-100 text-green-700' :
                              claimStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                              claimStatus === 'more_proof_requested' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {claimStatus.replace(/_/g, ' ')}
                            </div>
                          )}
                        </div>
                        <div className="text-right pr-1">
                          <div className={`text-lg font-extrabold ${mm.similarity >= 70 ? 'text-emerald-600' : mm.similarity >= 40 ? 'text-amber-600' : 'text-brand-900/60'}`}>
                            {mm.similarity}%
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-brand-900/40 ml-auto" />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
