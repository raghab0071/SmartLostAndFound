import React from 'react'

export function EmptyState({ icon: Icon, title, body, action, testid = 'empty-state' }) {
  return (
    <div data-testid={testid} className="card p-10 text-center">
      {Icon && (
        <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 grid place-items-center mb-4">
          <Icon className="w-6 h-6 text-brand-600" />
        </div>
      )}
      <h3 className="font-bold text-brand-900">{title}</h3>
      {body && <p className="text-sm text-brand-900/60 mt-1 max-w-md mx-auto">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Spinner({ size = 'md' }) {
  const sz = size === 'sm' ? 'w-5 h-5 border-2' : 'w-10 h-10 border-4'
  return (
    <div className="flex justify-center py-10" data-testid="spinner">
      <div className={`${sz} border-brand-200 border-t-brand-600 rounded-full animate-spin`} />
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={`bg-brand-100/60 animate-pulse rounded-xl ${className}`} />
}

export function Stat({ label, value, sub, icon: Icon, accent = 'brand', testid }) {
  const accents = {
    brand: 'from-brand-500 to-brand-900',
    amber: 'from-amber-400 to-amber-600',
    emerald: 'from-emerald-500 to-emerald-700',
    rose: 'from-rose-500 to-rose-700',
    indigo: 'from-indigo-500 to-indigo-700',
  }
  return (
    <div data-testid={testid} className="card p-5 relative overflow-hidden">
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br ${accents[accent]} opacity-10`} />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-brand-900/60 font-semibold">{label}</div>
          <div className="text-3xl font-extrabold text-brand-900 mt-1">{value}</div>
          {sub && <div className="text-xs text-brand-900/60 mt-1">{sub}</div>}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accents[accent]} text-white grid place-items-center shadow-soft`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  )
}

export function SectionTitle({ kicker, title, subtitle, action }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div>
        {kicker && (
          <div className="text-xs uppercase tracking-[0.22em] text-brand-600 font-bold mb-2">{kicker}</div>
        )}
        <h2 className="text-2xl md:text-3xl font-extrabold text-brand-900 leading-tight">{title}</h2>
        {subtitle && <p className="text-sm text-brand-900/60 mt-1.5 max-w-xl">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
