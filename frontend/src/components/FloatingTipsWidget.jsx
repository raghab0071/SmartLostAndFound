import React, { useEffect, useState } from 'react'
import { Lightbulb, X, ArrowRight, Sparkles, ShieldCheck, QrCode, Award, MapPin } from 'lucide-react'

const TIPS = [
  {
    icon: Sparkles,
    title: 'AI-powered matching',
    body: 'Our system scans every new found item against open lost reports — top 3 matches show instantly.',
    accent: 'from-amber-400 to-rose-400',
  },
  {
    icon: ShieldCheck,
    title: 'Verified centres only',
    body: 'Every centre is created and managed by a campus admin. Drop-offs are tracked, not anonymous.',
    accent: 'from-emerald-400 to-teal-500',
  },
  {
    icon: QrCode,
    title: 'Every item has a QR',
    body: 'Found items get a unique QR — scan it to open the public claim page directly.',
    accent: 'from-brand-400 to-indigo-500',
  },
  {
    icon: Award,
    title: 'Reward the honest',
    body: 'When an item is collected, the original finder gets points and the Trusted Finder badge — within 24 hrs.',
    accent: 'from-fuchsia-400 to-pink-500',
  },
  {
    icon: MapPin,
    title: 'Nearby first',
    body: "Centres are sorted by your institute. Lost something? You'll see your campus desk on top.",
    accent: 'from-orange-400 to-amber-500',
  },
]

export default function FloatingTipsWidget() {
  const [open, setOpen] = useState(true)
  const [idx, setIdx] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('tips_dismissed')) setDismissed(true)
  }, [])

  useEffect(() => {
    if (!open || dismissed) return
    const t = setInterval(() => setIdx((i) => (i + 1) % TIPS.length), 6000)
    return () => clearInterval(t)
  }, [open, dismissed])

  if (dismissed) return null

  const tip = TIPS[idx]
  const Icon = tip.icon

  return (
    <div className="fixed bottom-5 right-5 z-30 print:hidden" data-testid="floating-tips-widget">
      {open ? (
        <div className="relative w-[300px] card overflow-hidden shadow-xl animate-fadeUp">
          <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tip.accent}`} />
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tip.accent} text-white grid place-items-center shadow-soft shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-brand-900/50 font-bold">Did you know?</div>
                <div className="font-bold text-brand-900 text-sm leading-snug mt-0.5" data-testid="tip-title">{tip.title}</div>
                <p className="text-xs text-brand-900/70 mt-1.5 leading-relaxed" data-testid="tip-body">{tip.body}</p>
              </div>
              <button
                data-testid="tips-collapse-btn"
                onClick={() => setOpen(false)}
                className="w-7 h-7 grid place-items-center rounded-full hover:bg-brand-50 shrink-0"
                title="Collapse"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-1.5">
                {TIPS.map((_, i) => (
                  <button
                    key={i}
                    aria-label={`Tip ${i + 1}`}
                    onClick={() => setIdx(i)}
                    className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-brand-700' : 'w-1.5 bg-brand-900/15 hover:bg-brand-900/30'}`}
                  />
                ))}
              </div>
              <button
                data-testid="tip-next-btn"
                onClick={() => setIdx((i) => (i + 1) % TIPS.length)}
                className="text-[11px] font-semibold text-brand-700 hover:underline flex items-center gap-0.5"
              >
                Next <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <button
              data-testid="tips-dismiss-btn"
              onClick={() => { sessionStorage.setItem('tips_dismissed', '1'); setDismissed(true) }}
              className="absolute bottom-1 right-2 text-[9px] uppercase tracking-widest text-brand-900/40 hover:text-brand-900"
            >
              Don't show
            </button>
          </div>
        </div>
      ) : (
        <button
          data-testid="tips-expand-btn"
          onClick={() => setOpen(true)}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-600 to-brand-900 text-white grid place-items-center shadow-xl animate-pulseGlow"
          title="Show tips"
        >
          <Lightbulb className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}
