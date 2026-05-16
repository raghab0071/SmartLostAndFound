import React, { useEffect, useState } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Plus, Edit, Trash2, MapPin, X, Save } from 'lucide-react'
import { SectionTitle, Spinner, EmptyState } from '../../components/Common.jsx'

const EMPTY = {
  name: '', description: '', location: '', building: '', institute: '',
  contact_phone: '', contact_email: '', hours: '', image: '',
}

export default function AdminCentres() {
  const [centres, setCentres] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null | {centre_id?, ...}

  const load = () => {
    setLoading(true)
    api.get('/centres', { params: { mine: true } }).then(({ data }) => setCentres(data || [])).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const save = async (e) => {
    e.preventDefault()
    const payload = { ...editing }
    delete payload.centre_id
    try {
      if (editing.centre_id) {
        await api.put(`/centres/${editing.centre_id}`, payload)
        toast.success('Centre updated')
      } else {
        await api.post('/centres', payload)
        toast.success('Centre added')
      }
      setEditing(null)
      load()
    } catch (e) {
      toast.error(e.message || 'Failed')
    }
  }

  const remove = async (id) => {
    if (!confirm('Delete this centre?')) return
    try {
      await api.delete(`/centres/${id}`)
      toast.success('Deleted')
      load()
    } catch (e) {
      toast.error(e.message || 'Failed')
    }
  }

  if (loading) return <Spinner />

  return (
    <div data-testid="admin-centres-page">
      <SectionTitle
        kicker="Locations"
        title="Manage centres"
        action={<button data-testid="add-centre-btn" onClick={() => setEditing({ ...EMPTY })} className="btn-primary"><Plus className="w-4 h-4" /> New centre</button>}
      />
      {centres.length === 0 && <EmptyState icon={MapPin} title="No centres yet" testid="admin-centres-empty" />}
      <div className="grid md:grid-cols-2 gap-5">
        {centres.map((c) => (
          <div key={c.centre_id} className="card p-5" data-testid={`admin-centre-${c.centre_id}`}>
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-brand-50 grid place-items-center text-brand-700 shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-brand-900">{c.name}</div>
                {c.institute && <div className="text-xs text-brand-600 font-medium mt-0.5">Institute: {c.institute}</div>}
                <div className="text-xs text-brand-900/60 mt-0.5">{c.location}</div>
                {c.hours && <div className="text-xs text-brand-900/60 mt-1">⏰ {c.hours}</div>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(c)} data-testid={`edit-centre-${c.centre_id}`} className="w-8 h-8 grid place-items-center rounded-full hover:bg-brand-50"><Edit className="w-4 h-4 text-brand-700" /></button>
                <button onClick={() => remove(c.centre_id)} data-testid={`del-centre-${c.centre_id}`} className="w-8 h-8 grid place-items-center rounded-full hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-600" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-brand-900/40 backdrop-blur-sm p-4" data-testid="centre-form-modal">
          <form onSubmit={save} className="card max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button type="button" onClick={() => setEditing(null)} className="absolute top-3 right-3 w-8 h-8 grid place-items-center rounded-full hover:bg-brand-50">
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-brand-900 text-lg">{editing.centre_id ? 'Edit centre' : 'New centre'}</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Name</label>
                <input data-testid="centre-name" required value={editing.name} onChange={(e) => setEditing((x) => ({ ...x, name: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea data-testid="centre-desc" rows={2} value={editing.description || ''} onChange={(e) => setEditing((x) => ({ ...x, description: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="label">Location</label>
                <input data-testid="centre-location" required value={editing.location} onChange={(e) => setEditing((x) => ({ ...x, location: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="label">Building</label>
                <input data-testid="centre-building" value={editing.building || ''} onChange={(e) => setEditing((x) => ({ ...x, building: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="label">Institute / Campus</label>
                <input data-testid="centre-institute" value={editing.institute || ''} onChange={(e) => setEditing((x) => ({ ...x, institute: e.target.value }))} className="input" placeholder="e.g., IIT Bombay" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Phone</label>
                  <input data-testid="centre-phone" value={editing.contact_phone || ''} onChange={(e) => setEditing((x) => ({ ...x, contact_phone: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input data-testid="centre-email" type="email" value={editing.contact_email || ''} onChange={(e) => setEditing((x) => ({ ...x, contact_email: e.target.value }))} className="input" />
                </div>
              </div>
              <div>
                <label className="label">Hours</label>
                <input data-testid="centre-hours" value={editing.hours || ''} onChange={(e) => setEditing((x) => ({ ...x, hours: e.target.value }))} className="input" placeholder="Mon–Fri · 9 AM – 6 PM" />
              </div>
              <div>
                <label className="label">Image URL</label>
                <input data-testid="centre-image" value={editing.image || ''} onChange={(e) => setEditing((x) => ({ ...x, image: e.target.value }))} className="input" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" onClick={() => setEditing(null)} className="btn-ghost">Cancel</button>
              <button data-testid="centre-save" className="btn-primary"><Save className="w-4 h-4" /> Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
