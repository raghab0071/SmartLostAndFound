import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Upload, MapPin, Calendar, Tag, X, Sparkles } from 'lucide-react'
import { SectionTitle } from '../../components/Common.jsx'

const CATEGORIES = ['Wallet', 'Phone', 'Keys', 'Bag', 'Electronics', 'Watch', 'Umbrella', 'Eyewear', 'Bottle', 'ID Card', 'Other']

export default function StudentReport() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Wallet',
    color: '',
    brand: '',
    last_seen_location: '',
    building: '',
    date_lost: new Date().toISOString().slice(0, 10),
    contact: '',
    images: [],
  })
  const [submitting, setSubmitting] = useState(false)

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleFiles = async (files) => {
    const arr = []
    for (const f of files) {
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name} is too large (>5MB)`)
        continue
      }
      const b64 = await new Promise((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(r.result)
        r.onerror = reject
        r.readAsDataURL(f)
      })
      arr.push(b64)
    }
    update('images', [...form.images, ...arr])
  }

  const submit = async (e) => {
    e.preventDefault()
    if (form.title.trim().length < 4) {
      toast.error('Title must be at least 4 characters')
      return
    }
    if (form.description.trim().length < 10) {
      toast.error('Add a more detailed description (10+ chars)')
      return
    }
    setSubmitting(true)
    try {
      const { data } = await api.post('/items/lost', form)
      toast.success('Lost item reported! AI is matching now…')
      navigate('/student/my-reports?focus=' + data.item_id)
    } catch (err) {
      toast.error(err.message || 'Failed to report')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div data-testid="student-report-page">
      <SectionTitle
        kicker="New report"
        title="Report a lost item"
        subtitle="The more detail you give, the better our AI can match it with a found item."
      />
      <form onSubmit={submit} className="card p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Title" required>
            <input data-testid="lr-title" required value={form.title} onChange={(e) => update('title', e.target.value)} className="input" placeholder="e.g., Lost black wallet" />
          </Field>
          <Field label="Category">
            <select data-testid="lr-category" value={form.category} onChange={(e) => update('category', e.target.value)} className="input">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Description" required>
          <textarea data-testid="lr-description" required rows={4} value={form.description} onChange={(e) => update('description', e.target.value)} className="input" placeholder="Color, material, any unique marks, contents, etc." />
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Color">
            <input data-testid="lr-color" value={form.color} onChange={(e) => update('color', e.target.value)} className="input" placeholder="e.g., Black" />
          </Field>
          <Field label="Brand">
            <input data-testid="lr-brand" value={form.brand} onChange={(e) => update('brand', e.target.value)} className="input" placeholder="e.g., Apple" />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Last seen location" required>
            <input data-testid="lr-location" required value={form.last_seen_location} onChange={(e) => update('last_seen_location', e.target.value)} className="input" placeholder="e.g., Main Cafeteria" />
          </Field>
          <Field label="Building">
            <input data-testid="lr-building" value={form.building} onChange={(e) => update('building', e.target.value)} className="input" placeholder="e.g., Main Library" />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Date lost">
            <input data-testid="lr-date" type="date" value={form.date_lost} onChange={(e) => update('date_lost', e.target.value)} className="input" />
          </Field>
          <Field label="Contact (optional)">
            <input data-testid="lr-contact" value={form.contact} onChange={(e) => update('contact', e.target.value)} className="input" placeholder="Phone or email" />
          </Field>
        </div>

        <Field label="Photos (optional, helps AI match)">
          <label className="card border-dashed border-2 border-brand-900/15 p-6 grid place-items-center text-center cursor-pointer hover:border-brand-600 transition">
            <Upload className="w-6 h-6 text-brand-600" />
            <span className="text-xs text-brand-900/60 mt-1">Drop or click to upload (PNG/JPG, &lt;5MB)</span>
            <input data-testid="lr-images" type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
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

        <div className="flex items-center justify-between pt-2 border-t border-brand-900/5">
          <div className="text-xs text-brand-900/60 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> AI will start matching the moment you submit.
          </div>
          <button data-testid="lr-submit" disabled={submitting} className="btn-primary disabled:opacity-60">
            {submitting ? 'Reporting…' : 'Submit report'}
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
