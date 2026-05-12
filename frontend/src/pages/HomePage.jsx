import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { ArrowRight, Sparkles, ShieldCheck, MapPin, BellRing, QrCode, Award, Search, Package, AlertTriangle } from 'lucide-react'
import ItemCard from '../components/ItemCard.jsx'
import LostNoticeList from '../components/LostNoticeList.jsx'
import { SectionTitle, Spinner } from '../components/Common.jsx'

export default function HomePage() {
  const { user, isStudent } = useAuth()
  const [foundItems, setFoundItems] = useState([])
  const [lostNotices, setLostNotices] = useState([])
  const [centres, setCentres] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const centresParams = isStudent && user?.institute ? { institute: user.institute } : {}
        const [a, b, c] = await Promise.all([
          api.get('/items/found/recent', { params: { limit: 8 } }),
          api.get('/items/lost/alerts/recent', { params: { limit: 5 } }),
          api.get('/centres', { params: centresParams }),
        ])
        if (cancelled) return
        let centresList = c.data || []
        if (isStudent && user?.institute && centresList.length === 0) {
          // Fallback: show all centres if none for this institute
          const all = await api.get('/centres')
          centresList = all.data || []
        }
        setFoundItems(a.data || [])
        setLostNotices(b.data || [])
        setCentres(centresList)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [isStudent, user?.institute])

  return (
    <div data-testid="home-page">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-brand-400/30 to-brand-900/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-amber-300/30 to-rose-300/20 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 pt-14 md:pt-20 pb-16 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 border border-brand-900/10 text-xs font-semibold text-brand-900 mb-5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> AI-powered campus matching
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-brand-900 leading-[1.05] tracking-tight">
              Lose something today?
              <br />
              <span className="bg-gradient-to-r from-brand-600 to-amber-500 bg-clip-text text-transparent">
                Your campus has it.
              </span>
            </h1>
            <p className="mt-5 text-brand-900/70 text-base sm:text-lg max-w-xl leading-relaxed">
              FindIt connects students with admins at official Lost &amp; Found centres. Report what's missing,
              browse fresh finds, and let our AI match wallets to wallets — automatically.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to={isStudent ? "/student/report" : "/login/student"} data-testid="hero-report-btn" className="btn-primary">
                Report a lost item <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/browse" data-testid="hero-browse-btn" className="btn-ghost">
                <Search className="w-4 h-4" /> Browse found items
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-xs text-brand-900/60">
              <HeroStat label="Active centres" value={centres.length} />
              <HeroStat label="Live lost notices" value={lostNotices.length} />
              <HeroStat label="Found items showcased" value={foundItems.length} />
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="relative">
              <div className="absolute inset-0 -m-3 bg-gradient-to-br from-brand-200 to-amber-200 rounded-[28px] blur-2xl opacity-50" />
              <div className="relative card p-6 overflow-hidden grain">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-brand-600">How it works</div>
                    <h3 className="text-xl font-extrabold text-brand-900 mt-1">3 simple steps</h3>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-900 text-white grid place-items-center shadow-soft">
                    <QrCode className="w-6 h-6" />
                  </div>
                </div>
                <ol className="mt-5 space-y-4">
                  {[
                    { icon: BellRing, t: 'Students report what they lost', d: 'A description, location, date — that\'s it.' },
                    { icon: ShieldCheck, t: 'Admins log items handed in physically', d: 'Each item gets a QR + the finder\'s roll number (hidden from public).' },
                    { icon: Award, t: 'AI suggests a match · Owner claims with proof', d: 'When item is collected, the finder earns a badge in 24 hrs.' },
                  ].map((s, i) => (
                    <li key={i} className="flex gap-3">
                      <div className="shrink-0 w-9 h-9 rounded-xl bg-amber-50 grid place-items-center text-amber-700 font-bold">
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-bold text-brand-900 text-sm flex items-center gap-2">
                          <s.icon className="w-3.5 h-3.5 text-brand-600" /> {s.t}
                        </div>
                        <div className="text-xs text-brand-900/60 mt-0.5">{s.d}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 1 — Found items from admins */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-14">
        <SectionTitle
          kicker="Verified inventory"
          title="Found items from admins"
          subtitle="Verified items physically stored at Lost &amp; Found centres."
          action={
            <Link to="/browse" data-testid="all-found-link" className="btn-ghost text-sm">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          }
        />
        {loading ? (
          <Spinner />
        ) : foundItems.length === 0 ? (
          <div className="card border-dashed border-2 border-brand-900/10 p-12 text-center" data-testid="found-items-empty">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 grid place-items-center text-brand-700 mx-auto mb-3">
              <Package className="w-6 h-6" />
            </div>
            <div className="text-sm text-brand-900/70">No verified found items yet — centres will appear here after admins publish them.</div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5" data-testid="home-found-grid">
            {foundItems.slice(0, 8).map((it) => (
              <ItemCard key={it.item_id} item={it} testidPrefix="home-found" />
            ))}
          </div>
        )}
      </section>

      {/* SECTION 2 — Student lost notices (compact small bar style) */}
      <section className="bg-gradient-to-b from-amber-50/40 to-transparent py-14">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-200 text-[10px] uppercase tracking-widest font-bold text-amber-800 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Live alerts
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-brand-900 leading-tight">Student lost notices</h2>
              <p className="text-sm text-brand-900/60 mt-1.5 max-w-xl">Public alerts from students. If you find any of these items, hand them to a verified centre.</p>
            </div>
            <Link to="/notices" data-testid="all-notices-link" className="btn-ghost text-sm">
              All notices <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {loading ? <Spinner /> : <LostNoticeList notices={lostNotices.slice(0, 5)} />}
          <div className="mt-5 text-center">
            <Link to={isStudent ? "/student/report" : "/login/student"} className="btn-ghost text-sm" data-testid="post-notice-btn">
              <AlertTriangle className="w-3.5 h-3.5" /> Post your own lost notice
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 3 — Lost & Found centres near you */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-14">
        <SectionTitle
          kicker={isStudent && user?.institute ? `Near ${user.institute}` : 'Near you'}
          title="Lost &amp; Found centres near you"
          subtitle="Verified centres across institutes — tap to see all items they've collected."
          action={
            <Link to="/centres" data-testid="all-centres-link" className="btn-ghost text-sm">
              All centres <ArrowRight className="w-4 h-4" />
            </Link>
          }
        />
        {loading ? (
          <Spinner />
        ) : centres.length === 0 ? (
          <div className="card border-dashed border-2 border-brand-900/10 p-12 text-center" data-testid="centres-empty">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 grid place-items-center text-brand-700 mx-auto mb-3">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="text-sm text-brand-900/70">No centres yet — admins are setting up.</div>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-5">
            {centres.slice(0, 6).map((c) => (
              <Link
                key={c.centre_id}
                to={`/centres/${c.centre_id}`}
                data-testid={`home-centre-${c.centre_id}`}
                className="card overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group"
              >
                <div className="aspect-[16/9] bg-brand-50 overflow-hidden">
                  {c.image ? (
                    <img
                      src={c.image}
                      alt={c.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-brand-900/30">
                      <MapPin className="w-10 h-10" />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-brand-900">{c.name}</h3>
                  <p className="text-xs text-brand-900/60 mt-1 line-clamp-2 min-h-[2.5em]">{c.description}</p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-brand-900/70 truncate">
                      <MapPin className="w-3.5 h-3.5" /> {c.location}
                    </span>
                    {c.institute && (
                      <span className="chip bg-brand-50 text-brand-900 border border-brand-900/10 text-[10px]">{c.institute}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function HeroStat({ label, value }) {
  return (
    <div>
      <div className="text-2xl font-extrabold text-brand-900 leading-none">{value || '0'}</div>
      <div className="uppercase tracking-widest mt-1">{label}</div>
    </div>
  )
}
