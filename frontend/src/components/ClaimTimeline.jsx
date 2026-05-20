import React from 'react'
import { Check, Clock, Sparkles, ShieldCheck, Package, XCircle, AlertTriangle } from 'lucide-react'

/**
 * Visualises the 5-stage claim flow:
 *   Submitted → Verifying → Approved → Ready for Pickup → Closed
 * with optional side-states: more_proof_requested, rejected.
 */
const STAGES = [
  { key: 'submitted', label: 'Submitted', icon: Sparkles },
  { key: 'verifying', label: 'Verifying', icon: Clock },
  { key: 'approved', label: 'Approved', icon: ShieldCheck },
  { key: 'ready_for_pickup', label: 'Ready for Collect', icon: Package },
  { key: 'closed', label: 'Closed', icon: Check },
]

const STAGE_INDEX = { submitted: 0, verifying: 1, more_proof_requested: 1, approved: 2, ready_for_pickup: 3, closed: 4 }

export default function ClaimTimeline({ status, timeline = [], compact = false }) {
  const isRejected = status === 'rejected'
  const needsMoreProof = status === 'more_proof_requested'
  const activeIndex = isRejected ? -1 : (STAGE_INDEX[status] ?? 0)

  // Build a lookup of which stage has its timeline event for tooltip + at-time
  const stageAt = {}
  for (const ev of timeline || []) {
    stageAt[ev.status] = ev
  }

  return (
    <div data-testid="claim-timeline" className={`relative ${compact ? 'py-1' : 'py-2'}`}>
      <div className="flex items-center justify-between">
        {STAGES.map((s, i) => {
          const Icon = s.icon
          const active = !isRejected && i <= activeIndex
          const isCurrent = !isRejected && i === activeIndex
          return (
            <React.Fragment key={s.key}>
              <div className="flex flex-col items-center flex-1 relative">
                <div
                  data-testid={`timeline-stage-${s.key}`}
                  className={`relative w-9 h-9 rounded-full grid place-items-center transition-all duration-300 ${
                    active
                      ? 'bg-gradient-to-br from-brand-500 to-brand-900 text-white shadow-soft'
                      : 'bg-white border border-brand-900/15 text-brand-900/40'
                  } ${isCurrent ? 'ring-4 ring-brand-200 animate-pulseGlow scale-110' : ''}`}
                >
                  <Icon className="w-4 h-4" />
                  {isCurrent && (
                    <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-white animate-pulse" />
                  )}
                </div>
                {!compact && (
                  <>
                    <div className={`mt-2 text-[10px] uppercase tracking-widest font-bold text-center ${active ? 'text-brand-900' : 'text-brand-900/40'}`}>
                      {s.label}
                    </div>
                    {stageAt[s.key]?.at && (
                      <div className="text-[9px] text-brand-900/40 mt-0.5">
                        {new Date(stageAt[s.key].at).toLocaleDateString()}
                      </div>
                    )}
                  </>
                )}
              </div>
              {i < STAGES.length - 1 && (
                <div className="h-[3px] flex-1 mx-1 rounded-full overflow-hidden bg-brand-900/10 relative -translate-y-3">
                  <div
                    className="h-full bg-gradient-to-r from-brand-500 to-brand-900 transition-all duration-700"
                    style={{ width: !isRejected && i < activeIndex ? '100%' : (isCurrent ? '50%' : '0%') }}
                  />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Side-branch banners */}
      {isRejected && (
        <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800 flex items-center gap-2" data-testid="timeline-rejected-banner">
          <XCircle className="w-4 h-4" /> This claim was rejected.
        </div>
      )}
      {needsMoreProof && (
        <div className="mt-4 p-3 rounded-xl bg-yellow-50 border border-yellow-200 text-sm text-yellow-800 flex items-center gap-2" data-testid="timeline-more-proof-banner">
          <AlertTriangle className="w-4 h-4" /> Admin needs additional proof from you. Reply with photos / details.
        </div>
      )}
    </div>
  )
}
