import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { API_BASE } from '../../lib/api'
import toast from 'react-hot-toast'
import { Plus, Edit, Trash2, QrCode, Package, X, Search } from 'lucide-react'
import { SectionTitle, Spinner, EmptyState } from '../../components/Common.jsx'

export default function AdminFoundItems() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [qrItem, setQrItem] = useState(null)

  const load = () => {
    setLoading(true)
    api.get('/items/found', { params: { limit: 200, mine: true } })
      .then(({ data }) => setItems(data || [])).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const remove = async (id, status) => {
    if (status === 'claimed') {
      toast.error('Cannot delete claimed items')
      return
    }
    if (!confirm('Delete this item permanently?')) return
    try {
      await api.delete(`/items/found/${id}`)
      toast.success('Item deleted')
      load()
    } catch (e) {
      toast.error(e.message || 'Failed')
    }
  }

  const filtered = items.filter((i) => {
    if (!q) return true
    const s = q.toLowerCase()
    return [i.title, i.description, i.category, i.brand, i.color, i.location_found, i.building]
      .filter(Boolean).some((v) => v.toLowerCase().includes(s))
  })

  if (loading) return <Spinner />

  return (
    <div data-testid="admin-found-page">
      <SectionTitle
        kicker="Inventory"
        title="Found items"
        subtitle="Manage everything physically turned in to the centres."
        action={<Link to="/admin/found/new" className="btn-primary" data-testid="add-found-btn"><Plus className="w-4 h-4" /> New found item</Link>}
      />
      <div className="card p-3 mb-5 flex items-center gap-2">
        <Search className="w-4 h-4 text-brand-900/40 ml-2" />
        <input
          data-testid="admin-search-found"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 bg-transparent outline-none text-sm"
          placeholder="Search by title, category, brand, location…"
        />
      </div>

      {filtered.length === 0 && <EmptyState icon={Package} title="No matches" testid="admin-found-empty" />}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-brand-900/60 bg-brand-50/50">
            <tr>
              <th className="p-3">Item</th>
              <th className="p-3">Category</th>
              <th className="p-3 hidden md:table-cell">Location</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => {
              const isClaimed = i.status === 'claimed'
              return (
                <tr key={i.item_id} className={`border-t border-brand-900/5 hover:bg-brand-50/30 ${isClaimed ? 'bg-green-50/30' : ''}`} data-testid={`admin-found-row-${i.item_id}`}>
                  <td className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-50 overflow-hidden shrink-0">
                      {i.images?.[0] && <img src={i.images[0]} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div>
                      <Link to={`/items/${i.item_id}`} className="font-semibold text-brand-900 hover:underline">{i.title}</Link>
                      <div className="text-[10px] uppercase tracking-widest text-brand-900/50 mt-0.5">{i.item_id}</div>
                    </div>
                  </td>
                  <td className="p-3"><span className="chip bg-brand-50 text-brand-900 border border-brand-900/10">{i.category}</span></td>
                  <td className="p-3 text-brand-900/70 hidden md:table-cell">{i.location_found}</td>
                  <td className="p-3">
                    <span className={`chip status-${i.status}`}>{i.status || 'open'}</span>
                    {isClaimed && <div className="text-[10px] text-green-700 font-bold mt-1">✓ Resolved</div>}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button onClick={() => setQrItem(i)} title="QR" data-testid={`qr-btn-${i.item_id}`} className="inline-grid place-items-center w-8 h-8 rounded-full hover:bg-brand-50">
                      <QrCode className="w-4 h-4 text-brand-700" />
                    </button>
                    <Link to={`/admin/found/${i.item_id}/edit`} title={isClaimed ? "Cannot edit claimed items" : "Edit"} data-testid={`edit-btn-${i.item_id}`} className={`inline-grid place-items-center w-8 h-8 rounded-full ${isClaimed ? 'opacity-50 cursor-not-allowed' : 'hover:bg-brand-50'}`} onClick={(e) => isClaimed && e.preventDefault()}>
                      <Edit className="w-4 h-4 text-brand-700" />
                    </Link>
                    <button onClick={() => remove(i.item_id, i.status)} title={isClaimed ? "Cannot delete claimed items" : "Delete"} data-testid={`del-btn-${i.item_id}`} disabled={isClaimed} className={`inline-grid place-items-center w-8 h-8 rounded-full ${isClaimed ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-50'}`}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {qrItem && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-brand-900/40 backdrop-blur-sm p-4" data-testid="admin-qr-modal">
          <div className="card max-w-sm w-full p-6 relative">
            <button onClick={() => setQrItem(null)} className="absolute top-3 right-3 w-8 h-8 grid place-items-center rounded-full hover:bg-brand-50">
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-brand-900">{qrItem.title}</h3>
            <p className="text-xs text-brand-900/60 mt-1 mb-4">{qrItem.item_id}</p>
            <div className="bg-white p-3 rounded-xl border border-brand-900/10 grid place-items-center">
              <img src={`${API_BASE}/api/items/found/${qrItem.item_id}/qr`} alt="QR" className="w-60 h-60" data-testid="admin-qr-img" />
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <input
                readOnly
                value={`${window.location.origin}/items/${qrItem.item_id}`}
                className="input text-xs"
              />
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/items/${qrItem.item_id}`)}
                className="btn-ghost text-sm"
              >
                Copy public item link
              </button>
            </div>
            <p className="text-xs text-brand-900/60 mt-3 text-center">Print and attach to the physical item. Scanning opens the public page.</p>
          </div>
        </div>
      )}
    </div>
  )
}
