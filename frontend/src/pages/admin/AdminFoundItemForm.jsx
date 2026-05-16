import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Upload, X, ArrowLeft, Save } from 'lucide-react'
import { SectionTitle, Spinner } from '../../components/Common.jsx'

const CATEGORIES = ['Wallet', 'Phone', 'Keys', 'Bag', 'Electronics', 'Watch', 'Umbrella', 'Eyewear', 'Bottle', 'ID Card', 'Other']

const EMPTY = {
  title: '', description: '', category: 'Wallet', color: '', brand: '',
  location_found: '', building: '', date_found: new Date().toISOString().slice(0, 10),
  submitted_by_name: '', submitted_by_roll_no: '', submitted_by_institute: '',
  submitted_by_contact: '', images: [], centre_id: '',
}

export default function AdminFoundItemForm() {
  const { itemId } = useParams()
  const navigate = useNavigate()
  const isEdit = !!itemId
  const [form, setForm] = useState(EMPTY)
  const [centres, setCentres] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get('/centres', { params: { mine: true } }).then(({ data }) => setCentres(data || []))
    if (isEdit) {
      api.get(`/items/found/${itemId}`).then(({ data }) => {
        setForm({ ...EMPTY, ...data, centre_id: data.centre_id || '' })
      }).catch(() => toast.error('Failed to load item')).finally(() => setLoading(false))
    }
  }, [itemId, isEdit])

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleFiles = async (files) => {
    const arr = []
    for (const f of files) {
      if (f.size > 5 * 1024 * 1024) { toast.error(`${f.name} too large`); continue }
      const b64 = await new Promise((r, j) => {
        const x = new FileReader(); x.onload = () => r(x.result); x.onerror = j; x.readAsDataURL(f)
      })
      arr.push(b64)
    }
    update('images', [...form.images, ...arr])
  }

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = { ...form }
      if (!payload.centre_id) delete payload.centre_id
      if (isEdit) {
        await api.put(`/items/found/${itemId}`, payload)
        toast.success('Item updated')
      } else {
        await api.post('/items/found', payload)
        toast.success('Found item logged. AI is matching now…')
      }
      navigate('/admin/found')
    } catch (err) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <div data-testid="admin-found-form">
      <Link to="/admin/found" className="text-sm text-brand-900/60 hover:text-brand-900 inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to inventory
      </Link>
      <SectionTitle
        kicker={isEdit ? 'Edit' : 'New'}
        title={isEdit ? 'Edit found item' : 'Log a new found item'}
        subtitle="Capture details from the item physically handed in to the centre."
      />
      <form onSubmit={submit} className="card p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Title" required>
            <input data-testid="af-title" required value={form.title} onChange={(e) => update('title', e.target.value)} className="input" />
          </Field>
          <Field label="Category">
            <select data-testid="af-category" value={form.category} onChange={(e) => update('category', e.target.value)} className="input">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Description" required>
          <textarea data-testid="af-description" required rows={4} value={form.description} onChange={(e) => update('description', e.target.value)} className="input" />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Color">
            <input data-testid="af-color" value={form.color} onChange={(e) => update('color', e.target.value)} className="input" />
          </Field>
          <Field label="Brand">
            <input data-testid="af-brand" value={form.brand} onChange={(e) => update('brand', e.target.value)} className="input" />
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Location found" required>
            <input data-testid="af-location" required value={form.location_found} onChange={(e) => update('location_found', e.target.value)} className="input" />
          </Field>
          <Field label="Building">
            <input data-testid="af-building" value={form.building} onChange={(e) => update('building', e.target.value)} className="input" />
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Date found">
            <input data-testid="af-date" type="date" value={form.date_found} onChange={(e) => update('date_found', e.target.value)} className="input" />
          </Field>
          <Field label="Centre">
            <select data-testid="af-centre" value={form.centre_id} onChange={(e) => update('centre_id', e.target.value)} className="input">
              <option value="">— Select centre —</option>
              {centres.map((c) => <option key={c.centre_id} value={c.centre_id}>{c.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Handed in by (name)">
            <input data-testid="af-submitter" value={form.submitted_by_name} onChange={(e) => update('submitted_by_name', e.target.value)} className="input" />
          </Field>
          <Field label="Their contact">
            <input data-testid="af-submitter-contact" value={form.submitted_by_contact} onChange={(e) => update('submitted_by_contact', e.target.value)} className="input" />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-amber-50/40 border border-amber-200/60">
          <Field label="Finder's roll number (hidden from public)">
            <input data-testid="af-submitter-rollno" value={form.submitted_by_roll_no} onChange={(e) => update('submitted_by_roll_no', e.target.value)} className="input" placeholder="e.g., 21CS3001" />
          </Field>
          <Field label="Finder's institute">
            <input data-testid="af-submitter-institute" value={form.submitted_by_institute} onChange={(e) => update('submitted_by_institute', e.target.value)} className="input" placeholder="defaults to centre's institute" />
          </Field>
          <div className="sm:col-span-2 text-[11px] text-amber-900/80 -mt-2">
            <b>Why?</b> When the owner collects this item, the student matching this roll number earns the Trusted Finder badge within 24 hrs. These fields are never shown on the public item page.
          </div>
        </div>

        <Field label="Photos">
          <label className="card border-dashed border-2 border-brand-900/15 p-6 grid place-items-center text-center cursor-pointer hover:border-brand-600 transition">
            <Upload className="w-6 h-6 text-brand-600" />
            <span className="text-xs text-brand-900/60 mt-1">Click to upload (PNG/JPG, &lt;5MB)</span>
            <input data-testid="af-images" type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          </label>
          {form.images.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {form.images.map((src, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-brand-900/10">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => update('images', form.images.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-6 h-6 grid place-items-center rounded-full bg-white/90">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Field>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-brand-900/5">
          <Link to="/admin/found" className="btn-ghost">Cancel</Link>
          <button data-testid="af-submit" disabled={submitting} className="btn-primary disabled:opacity-60">
            <Save className="w-4 h-4" /> {submitting ? 'Saving…' : (isEdit ? 'Save changes' : 'Log item')}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children, required }) {
  return (
    <div>
      <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
    </div>
  )
}
