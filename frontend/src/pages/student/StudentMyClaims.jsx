import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import { Inbox, ArrowRight } from 'lucide-react'
import { SectionTitle, Spinner, EmptyState } from '../../components/Common.jsx'
import ClaimTimeline from '../../components/ClaimTimeline.jsx'

export default function StudentMyClaims() {
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/claims').then(({ data }) => setClaims(data || [])).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  return (
    <div data-testid="student-myclaims-page">
      <SectionTitle kicker="Claims" title="My claims" subtitle="Track every claim from submission to pickup." />
      {claims.length === 0 && (
        <EmptyState
          icon={Inbox}
          title="No claims yet"
          body="When you find a found item that matches yours, file a claim with proof."
          action={<Link to="/browse" className="btn-primary">Browse found items</Link>}
          testid="my-claims-empty"
        />
      )}
      <div className="space-y-4">
        {claims.map((c) => (
          <div key={c.claim_id} data-testid={`my-claim-${c.claim_id}`} className="card p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`chip status-${c.status}`}>{c.status.replace(/_/g, ' ')}</span>
                </div>
                <div className="font-bold text-brand-900 text-lg">{c.found_item_title}</div>
                <div className="text-xs text-brand-900/60 mt-1 line-clamp-2">{c.ownership_proof}</div>
              </div>
              <Link to={`/items/${c.found_item_id}`} className="btn-ghost text-xs">
                View item <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <ClaimTimeline status={c.status} timeline={c.timeline} />

            {c.admin_notes && (
              <div className="text-xs text-brand-700 italic mt-3 pt-3 border-t border-brand-900/5">
                <span className="font-semibold">Admin note:</span> {c.admin_notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
