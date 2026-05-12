import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { MapPin, Upload, Save, X, Building2, Clock, Mail, Phone } from 'lucide-react'

/**
 * Step 2 for admins: forces them to create at least one Lost & Found centre
 * (with image) before they can post found items. Shows only when:
 *  - user.role === 'admin'
 *  - profile_complete === true
 *  - onboardingState.has_centre === false
 */
export default function AdminCentreOnboardingModal() {
  const { user, onboardingState, refreshOnboarding } = useAuth()

  const [form, setForm] = useState({
    name: '',
    description: '',
    location: '',
    building: '',
    institute: user?.institute || '',
    contact_phone: user?.phone || '',
    contact_email: user?.email || '',
    hours: '',
    image: '',
  })
  const [saving, setSaving] = useState(false)

  if (
    !user || user.role !== 'admin' ||
    !user.profile_complete ||
    !onboardingState ||
    onboardingState.has_centre
  ) return null

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleFile = async (file) => {
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Image must be under 3MB')
      return
    }
    const b64 = await new Promise((r, j) => {
      const x = new FileReader()
      x.onload = () => r(x.result)
      x.onerror = j
      x.readAsDataURL(file)
    })
    upd('image', b64)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.location.trim()) {
      toast.error('Name and location are required')
      return
    }
    setSaving(true)
    try {
      await api.post('/centres', form)
      toast.success('Centre created — you\'re all set!')
      await refreshOnboarding(user)
    } catch (e) {
      toast.error(e.message || 'Failed to create centre')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-brand-900/60 backdrop-blur-md p-4" data-testid="centre-onboarding-modal">
      <form onSubmit={submit} className="card w-full max-w-2xl p-7 max-h-[92vh] overflow-y-auto relative animate-fadeUp">
        <div className="text-xs uppercase tracking-widest font-bold text-brand-600 mb-1">Step 2 of 2</div>
        <h2 className="text-2xl font-extrabold text-brand-900">Set up your Lost &amp; Found centre</h2>
        <p className="text-sm text-brand-900/60 mt-1">
          You'll log every found item against this centre. Add details &amp; a photo so students can find it.
        </p>

        <div className="mt-5 grid sm:grid-cols-[200px_1fr] gap-5">
          <div>
            <label className="label">Centre photo</label>
            <label className="card border-dashed border-2 border-brand-900/15 aspect-[4/3] grid place-items-center cursor-pointer hover:border-brand-600 transition overflow-hidden">
              {form.image ? (
                <img src={form.image} alt="centre" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-brand-900/60 text-xs px-3">
                  <Upload className="w-6 h-6 mx-auto text-brand-600" />
                  <span className="block mt-1">Click to upload</span>
                </div>
              )}
              <input
                data-testid="onboarding-centre-image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
          </div>
          <div className="space-y-3">
            <Field icon={Building2} label="Centre name" required>
              <input data-testid="onboarding-centre-name" required value={form.name} onChange={(e) => upd('name', e.target.value)} className="input" placeholder="e.g., Main Library Lost & Found" />
            </Field>
            <Field label="Short description">
              <textarea data-testid="onboarding-centre-desc" rows={2} value={form.description} onChange={(e) => upd('description', e.target.value)} className="input" placeholder="What does this centre cover?" />
            </Field>
            <Field icon={MapPin} label="Location" required>
              <input data-testid="onboarding-centre-location" required value={form.location} onChange={(e) => upd('location', e.target.value)} className="input" placeholder="Block A, Ground Floor, Main Library" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Building">
                <input data-testid="onboarding-centre-building" value={form.building} onChange={(e) => upd('building', e.target.value)} className="input" />
              </Field>
              <Field icon={Building2} label="Institute">
                <input data-testid="onboarding-centre-institute" value={form.institute} onChange={(e) => upd('institute', e.target.value)} className="input" placeholder="e.g., IIT Bombay" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field icon={Phone} label="Phone">
                <input data-testid="onboarding-centre-phone" value={form.contact_phone} onChange={(e) => upd('contact_phone', e.target.value)} className="input" />
              </Field>
              <Field icon={Mail} label="Email">
                <input data-testid="onboarding-centre-email" type="email" value={form.contact_email} onChange={(e) => upd('contact_email', e.target.value)} className="input" />
              </Field>
            </div>
            <Field icon={Clock} label="Hours">
              <input data-testid="onboarding-centre-hours" value={form.hours} onChange={(e) => upd('hours', e.target.value)} className="input" placeholder="Mon–Sat · 9:00 AM – 6:00 PM" />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-brand-900/5">
          <div className="text-[11px] text-brand-900/50 mr-auto">You can add more centres later from the admin dashboard.</div>
          <button data-testid="onboarding-centre-save-btn" disabled={saving} className="btn-primary disabled:opacity-60">
            <Save className="w-4 h-4" /> {saving ? 'Creating…' : 'Create centre & continue'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ icon: Icon, label, required, children }) {
  return (
    <div>
      <label className="label flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />}
        {label}{required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}
