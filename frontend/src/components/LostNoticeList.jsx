import React from 'react'
import { AlertTriangle, MapPin, Calendar } from 'lucide-react'

/**
 * Compact, notification-style list of public lost notices.
 * NOT the same look as the main found-item card — these are short alerts.
 */
export default function LostNoticeList({ notices = [], emptyLabel = "No active lost notices right now." }) {
  if (!notices.length) {
    return (
      <div className="card p-8 border-dashed border-2 border-brand-900/10 text-center" data-testid="lost-notices-empty">
        <div className="text-sm text-brand-900/60">{emptyLabel}</div>
      </div>
    )
  }
  return (
    <div className="card divide-y divide-brand-900/5 overflow-hidden" data-testid="lost-notice-list">
      {notices.map((n, i) => (
        <div
          key={n.item_id || i}
          data-testid={`lost-notice-row-${n.item_id}`}
          className="flex items-center gap-3 p-3 hover:bg-amber-50/40 transition group"
        >
          <span className="relative shrink-0 w-7 h-7 rounded-lg bg-amber-100 text-amber-700 grid place-items-center">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-brand-900 truncate">
              {n.title}
              <span className="ml-2 chip bg-brand-50 text-brand-900/70 border border-brand-900/10 text-[10px]">{n.category}</span>
            </div>
            <div className="text-[11px] text-brand-900/60 truncate flex items-center gap-3 mt-0.5">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {n.last_seen_location}</span>
              {n.date_lost && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {n.date_lost}</span>}
            </div>
          </div>
          <div className="text-[10px] uppercase tracking-widest text-amber-700 font-bold shrink-0 opacity-0 group-hover:opacity-100 transition">
            Found it? Then submit it to the Institute Lost & Found.
          </div>
        </div>
      ))}
    </div>
  )
}
