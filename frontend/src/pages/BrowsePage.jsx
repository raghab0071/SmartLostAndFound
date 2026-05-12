import React, { useEffect, useMemo, useState } from 'react'
import api from '../lib/api'
import ItemCard from '../components/ItemCard.jsx'
import { Filter, Search } from 'lucide-react'
import { SectionTitle, Spinner, EmptyState } from '../components/Common.jsx'

const CATEGORIES = ['Wallet', 'Phone', 'Keys', 'Bag', 'Electronics', 'Watch', 'Umbrella', 'Eyewear', 'Bottle', 'Other']

export default function BrowsePage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params = { limit: 60 }
    if (q) params.q = q
    if (category) params.category = category
    const id = setTimeout(async () => {
      try {
        const { data } = await api.get('/items/found', { params })
        if (!cancelled) setItems(data || [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)
    return () => {
      clearTimeout(id)
      cancelled = true
    }
  }, [q, category])

  const empty = !loading && !items.length

  return (
    <div data-testid="browse-page" className="max-w-7xl mx-auto px-4 md:px-8 py-12">
      <SectionTitle
        kicker="Browse"
        title="All found items"
        subtitle="Search and filter what's been turned in to our centres."
      />

      {/* Filters */}
      <div className="card p-4 mb-6 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-900/40" />
          <input
            data-testid="browse-search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title, brand, color, location…"
            className="input pl-9"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="w-4 h-4 text-brand-900/60 shrink-0" />
          <button
            data-testid="filter-cat-all"
            onClick={() => setCategory('')}
            className={`chip ${category === '' ? 'bg-brand-900 text-white' : 'bg-white border border-brand-900/10 text-brand-900'}`}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              data-testid={`filter-cat-${c}`}
              key={c}
              onClick={() => setCategory(c === category ? '' : c)}
              className={`chip whitespace-nowrap ${
                c === category ? 'bg-brand-900 text-white' : 'bg-white border border-brand-900/10 text-brand-900 hover:bg-brand-50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading && <Spinner />}
      {empty && (
        <EmptyState
          icon={Search}
          title="No items found"
          body="Try clearing filters or check back later — new items are added daily."
          testid="browse-empty"
        />
      )}
      {!loading && items.length > 0 && (
        <div data-testid="browse-grid" className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((it) => <ItemCard key={it.item_id} item={it} testidPrefix="browse" />)}
        </div>
      )}
    </div>
  )
}
