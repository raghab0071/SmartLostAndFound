import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { MapPin, Phone, Mail, Clock, ArrowLeft, Building2, Package } from 'lucide-react'
import { Spinner, EmptyState } from '../components/Common.jsx'
import ItemCard from '../components/ItemCard.jsx'

export default function CentreDetailPage() {
  const { centreId } = useParams()
  const { user } = useAuth()
  const [centre, setCentre] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/centres').then((r) => (r.data || []).find((c) => c.centre_id === centreId)),
      api.get(`/items/found/by-centre/${centreId}`).then((r) => r.data || []),
    ]).then(([c, it]) => {
      setCentre(c)
      setItems(it)
    }).finally(() => setLoading(false))
  }, [centreId])

  if (loading) return <Spinner />
  if (!centre) return (
    <div className="max-w-3xl mx-auto px-4 py-10 text-center">
      <div className="text-xl font-bold text-brand-900">Centre not found</div>
      <Link to="/centres" className="btn-ghost mt-4">Back to centres</Link>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-10" data-testid="centre-detail-page">
      <Link to="/centres" className="text-sm text-brand-900/60 hover:text-brand-900 inline-flex items-center gap-1 mb-6">
        <ArrowLeft className="w-4 h-4" /> All centres
      </Link>

      <div className="card overflow-hidden">
        <div className="aspect-[16/6] bg-brand-50 overflow-hidden">
          {centre.image ? (
            <img src={centre.image} alt={centre.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-brand-900/30"><MapPin className="w-16 h-16" /></div>
          )}
        </div>
        <div className="p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-extrabold text-brand-900">{centre.name}</h1>
              {centre.description && <p className="text-brand-900/70 mt-2 max-w-2xl">{centre.description}</p>}
            </div>
            {/* Centre Status Badge - Text only */}
            <span className={`px-3 py-1 rounded-full text-sm font-bold text-white ${
              centre.is_open !== false ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {centre.is_open !== false ? 'OPEN' : 'CLOSE'}
            </span>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 mt-5 text-sm">
            <Info icon={MapPin} label="Location" value={centre.location} />
            {centre.building && <Info icon={Building2} label="Building" value={centre.building} />}
            {centre.institute && <Info icon={Building2} label="Institute" value={centre.institute} />}
            {centre.hours && <Info icon={Clock} label="Hours" value={centre.hours} />}
            {centre.contact_phone && <Info icon={Phone} label="Phone" value={centre.contact_phone} />}
            {centre.contact_email && <Info icon={Mail} label="Email" value={centre.contact_email} />}
          </div>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-extrabold text-brand-900 mb-4">Items at this centre <span className="text-brand-900/60 font-normal text-sm">({items.length})</span></h2>
        {items.length === 0 ? (
          <EmptyState icon={Package} title="No items yet" body="This centre hasn't logged any items." testid="centre-detail-empty" />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5" data-testid="centre-detail-items">
            {items.map((it) => <ItemCard key={it.item_id} item={it} testidPrefix="centre-detail" />)}
          </div>
        )}
      </div>
    </div>
  )
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
      <div>
        <div className="text-[10px] uppercase tracking-widest text-brand-900/50 font-bold">{label}</div>
        <div className="text-brand-900 text-sm">{value}</div>
      </div>
    </div>
  )
}
