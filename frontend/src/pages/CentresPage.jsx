import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { MapPin, Phone, Mail, Clock, Building2, ArrowRight } from 'lucide-react'
import { SectionTitle, Spinner, EmptyState } from '../components/Common.jsx'

export default function CentresPage() {
  const { user, isStudent } = useAuth()
  const [centres, setCentres] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    setLoading(true)
    api.get('/centres').then(({ data }) => setCentres(data || [])).finally(() => setLoading(false))
  }, [])

  const filter = (c) => {
    if (!q) return true
    const s = q.toLowerCase()
    return [c.name, c.location, c.institute, c.building].filter(Boolean).some((v) => v.toLowerCase().includes(s))
  }

  // Sort: same-institute first
  const sortedCentres = [...centres].sort((a, b) => {
    const inst = user?.institute?.toLowerCase()
    if (!inst) return 0
    const aMatch = (a.institute || '').toLowerCase().includes(inst) ? 0 : 1
    const bMatch = (b.institute || '').toLowerCase().includes(inst) ? 0 : 1
    return aMatch - bMatch
  })

  const visible = sortedCentres.filter(filter)
  const yourInstitute = isStudent && user?.institute

  return (
    <div data-testid="centres-page" className="max-w-7xl mx-auto px-4 md:px-8 py-12">
      <SectionTitle
        kicker={yourInstitute ? `Near ${user.institute}` : 'Locations'}
        title="Lost &amp; Found centres"
        subtitle="Visit any centre to drop off found items or collect approved claims."
      />

      <div className="card p-3 mb-6 flex items-center gap-2">
        <Building2 className="w-4 h-4 text-brand-900/40 ml-2" />
        <input
          data-testid="centres-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, institute, location…"
          className="flex-1 bg-transparent outline-none text-sm"
        />
      </div>

      {loading && <Spinner />}
      {!loading && visible.length === 0 && (
        <EmptyState icon={MapPin} title="No centres yet" body="Admins haven't set up any centres yet — check back soon!" testid="centres-empty" />
      )}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visible.map((c) => {
          const isNear = yourInstitute && (c.institute || '').toLowerCase().includes(user.institute.toLowerCase())
          return (
            <Link key={c.centre_id} to={`/centres/${c.centre_id}`} data-testid={`centre-card-${c.centre_id}`}
              className="card overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group">
              <div className="aspect-[16/9] bg-brand-50 overflow-hidden relative">
                {c.image ? (
                  <img src={c.image} alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-brand-900/30"><MapPin className="w-10 h-10" /></div>
                )}
                {isNear && (
                  <span className="absolute top-3 left-3 chip bg-amber-400/95 text-brand-900 border border-amber-500/40 text-[10px] font-bold">
                    YOUR CAMPUS
                  </span>
                )}
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <h3 className="font-bold text-brand-900">{c.name}</h3>
                  {c.description && <p className="text-xs text-brand-900/60 mt-1 line-clamp-2 min-h-[2.5em]">{c.description}</p>}
                </div>
                <ul className="text-xs space-y-1.5 text-brand-900/70">
                  <li className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 mt-0.5 text-brand-600 shrink-0" /> {c.location}</li>
                  {c.institute && <li className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5 text-brand-600" /> {c.institute}</li>}
                  {c.contact_phone && <li className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-brand-600" /> {c.contact_phone}</li>}
                  {c.contact_email && <li className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-brand-600" /> {c.contact_email}</li>}
                  {c.hours && <li className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-brand-600" /> {c.hours}</li>}
                </ul>
                <div className="text-[11px] text-brand-700 font-semibold inline-flex items-center gap-1 pt-2 border-t border-brand-900/5">
                  See all items collected here <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
