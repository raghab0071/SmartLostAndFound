import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Check, X, MessageCircle, ClipboardCheck, ArrowRight, Eye, Package, PackageCheck, Hash } from 'lucide-react'
import { SectionTitle, Spinner, EmptyState } from '../../components/Common.jsx'
import ClaimTimeline from '../../components/ClaimTimeline.jsx'

const FILTER_TABS = [
  { v: 'submitted', l: 'New' },
  { v: 'verifying', l: 'Verifying' },
  { v: 'more_proof_requested', l: 'More proof' },
  { v: 'approved', l: 'Approved' },
  { v: 'ready_for_pickup', l: 'Ready' },
  { v: 'closed', l: 'Closed' },
  { v: 'rejected', l: 'Rejected' },
  { v: 'all', l: 'All' },
]

export default function AdminClaims() {
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('submitted')
  const [decisionFor, setDecisionFor] = useState(null) // {claim, action}
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => {
    setLoading(true)
    const params = {}
    if (filter !== 'all') params.status = filter
    api.get('/claims', { params }).then(({ data }) => setClaims(data || [])).finally(() => setLoading(false))
  }
  useEffect(load, [filter])

  const submit = async () => {
    if (!decisionFor) return
    setBusy(true)
    try {
      const endpoints = {
        verify: 'start-verifying',
        approve: 'approve',
        reject: 'reject',
        more_proof: 'request-proof',
        ready: 'mark-ready',
        close: 'close',
      }
      const path = endpoints[decisionFor.action]
      await api.post(`/claims/${decisionFor.claim.claim_id}/${path}`, { notes })
      toast.success('Decision recorded')
      setDecisionFor(null); setNotes('')
      load()
    } catch (e) {
      toast.error(e.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  // Map current status → which buttons to show
  const actionsFor = (c) => {
    switch (c.status) {
      case 'submitted':
        return [
          { key: 'verify', label: 'Start verifying', cls: 'btn-primary', icon: Eye },
          { key: 'approve', label: 'Approve', cls: 'btn-success', icon: Check },
          { key: 'more_proof', label: 'Ask for proof', cls: 'btn-ghost', icon: MessageCircle },
          { key: 'reject', label: 'Reject', cls: 'btn-danger', icon: X },
        ]
      case 'verifying':
      case 'more_proof_requested':
        return [
          { key: 'approve', label: 'Approve', cls: 'btn-success', icon: Check },
          { key: 'more_proof', label: 'Ask for proof', cls: 'btn-ghost', icon: MessageCircle },
          { key: 'reject', label: 'Reject', cls: 'btn-danger', icon: X },
        ]
      case 'approved':
        return [
          { key: 'ready', label: 'Mark ready for Collect', cls: 'btn-primary', icon: Package },
          { key: 'close', label: 'Mark collected', cls: 'btn-success', icon: PackageCheck },
        ]
      case 'ready_for_pickup':
        return [
          { key: 'close', label: 'Mark collected', cls: 'btn-success', icon: PackageCheck },
        ]
      default:
        return []
    }
  }

  return (
    <div data-testid="admin-claims-page">
      <SectionTitle kicker="Decisions" title="Claims queue" subtitle="Walk a claim through the 5 stages: Submitted → Verifying → Approved → Ready → Closed." />
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTER_TABS.map((t) => (
          <button
            key={t.v}
            data-testid={`claims-tab-${t.v}`}
            onClick={() => setFilter(t.v)}
            className={`chip ${filter === t.v ? 'bg-brand-900 text-white' : 'bg-white border border-brand-900/10 text-brand-900 hover:bg-brand-50'}`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {loading && <Spinner />}
      {!loading && claims.length === 0 && <EmptyState icon={ClipboardCheck} title="Nothing here" testid="admin-claims-empty" />}

      <div className="space-y-5">
        {claims.map((c) => (
          <div key={c.claim_id} className="card p-5" data-testid={`admin-claim-${c.claim_id}`}>
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`chip status-${c.status}`}>{c.status.replace(/_/g, ' ')}</span>
                </div>
                <Link to={`/items/${c.found_item_id}`} className="font-bold text-brand-900 hover:underline text-lg">
                  {c.found_item_title}
                </Link>
                <div className="text-xs text-brand-900/70 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  <span><b>Claimant:</b> {c.claimant_name}</span>
                  {c.claimant_email && <span>· {c.claimant_email}</span>}
                  {c.claimant_roll_no && (
                    <span className="inline-flex items-center gap-1 chip bg-brand-50 text-brand-900 border border-brand-900/10 text-[10px]">
                      <Hash className="w-2.5 h-2.5" /> {c.claimant_roll_no}
                    </span>
                  )}
                  {c.claimant_institute && <span className="chip bg-brand-50 text-brand-900/70 border border-brand-900/10 text-[10px]">{c.claimant_institute}</span>}
                  {c.contact && <span>· {c.contact}</span>}
                </div>

                <div className="mt-4">
                  <ClaimTimeline status={c.status} timeline={c.timeline} compact />
                </div>

                <div className="mt-4 p-3 rounded-xl bg-brand-50/50 border border-brand-900/5 text-sm text-brand-900/80">
                  <div className="text-[10px] uppercase tracking-widest text-brand-900/50 font-bold mb-1">Proof description</div>
                  {c.ownership_proof}
                </div>
                {c.proof_images?.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {c.proof_images.map((src, i) => (
                      <a key={i} href={src} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-lg overflow-hidden border border-brand-900/10">
                        <img src={src} alt="proof" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
                {c.admin_notes && (
                  <div className="mt-3 text-xs text-brand-700 italic">Last note: {c.admin_notes}</div>
                )}
              </div>

              <div className="flex flex-col gap-2 w-full sm:w-auto sm:min-w-[200px]">
                {actionsFor(c).map((a) => (
                  <button
                    key={a.key}
                    data-testid={`claim-${a.key}-${c.claim_id}`}
                    onClick={() => setDecisionFor({ claim: c, action: a.key })}
                    className={`${a.cls} text-xs justify-center`}
                  >
                    <a.icon className="w-3.5 h-3.5" /> {a.label}
                  </button>
                ))}
                <Link to={`/items/${c.found_item_id}`} className="text-[11px] text-brand-700 hover:underline text-center mt-1">
                  Open item ↗
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {decisionFor && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-brand-900/40 backdrop-blur-sm p-4" data-testid="decision-modal">
          <div className="card max-w-md w-full p-6">
            <h3 className="font-bold text-brand-900 capitalize">
              {decisionFor.action.replace('_', ' ')} claim
            </h3>
            <p className="text-xs text-brand-900/60 mt-1">{decisionFor.claim.found_item_title}</p>
            <textarea
              data-testid="decision-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input mt-4"
              placeholder="Optional notes for the student…"
            />
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setDecisionFor(null)} className="btn-ghost">Cancel</button>
              <button data-testid="decision-confirm" onClick={submit} disabled={busy}
                className={`disabled:opacity-60 ${decisionFor.action === 'reject' ? 'btn-danger' : decisionFor.action === 'approve' || decisionFor.action === 'close' ? 'btn-success' : 'btn-primary'}`}>
                {busy ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
