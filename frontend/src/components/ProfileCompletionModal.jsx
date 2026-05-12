import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Upload, User, Building2, Phone, Hash, Save, X } from 'lucide-react'

/**
 * Modal that forces users (students + admins) to fill required profile fields
 * before they can use the app. Students must provide name + institute + roll_no.
 * Admins must provide name + institute (then complete centre onboarding).
 */
export default function ProfileCompletionModal() {
  const { user, updateProfile } = useAuth()
  const isStudent = user?.role === 'student'

  const [name, setName] = useState(user?.name || '')
  const [institute, setInstitute] = useState(user?.institute || '')
  const [rollNo, setRollNo] = useState(user?.roll_no || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [picture, setPicture] = useState(user?.picture || '')
  const [saving, setSaving] = useState(false)

  if (!user || user.profile_complete) return null

  const handleFile = async (file) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB')
      return
    }
    const b64 = await new Promise((r, j) => {
      const x = new FileReader()
      x.onload = () => r(x.result)
      x.onerror = j
      x.readAsDataURL(file)
    })
    setPicture(b64)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !institute.trim()) {
      toast.error('Name and Institute are required')
      return
    }
    if (isStudent && !rollNo.trim()) {
      toast.error('Roll number is required for students')
      return
    }
    setSaving(true)
    try {
      await updateProfile({
        name: name.trim(),
        institute: institute.trim(),
        roll_no: isStudent ? rollNo.trim() : undefined,
        phone: phone.trim() || undefined,
        picture: picture || undefined,
      })
      toast.success('Profile complete! 🎉')
    } catch (e) {
      toast.error(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-brand-900/60 backdrop-blur-md p-4" data-testid="profile-completion-modal">
      <form onSubmit={submit} className="card w-full max-w-lg p-7 max-h-[90vh] overflow-y-auto relative animate-fadeUp">
        <div className="text-xs uppercase tracking-widest font-bold text-brand-600 mb-1">Step 1 of {isStudent ? 1 : 2}</div>
        <h2 className="text-2xl font-extrabold text-brand-900">Complete your profile</h2>
        <p className="text-sm text-brand-900/60 mt-1">
          {isStudent
            ? 'A few details so admins can credit you when you turn in a found item.'
            : 'Tell us about you and your campus.'}
        </p>

        <div className="mt-6 flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-brand-500 to-brand-900 grid place-items-center text-white text-2xl font-extrabold">
              {picture ? (
                <img src={picture} alt="profile" className="w-full h-full object-cover" />
              ) : (
                (name?.[0] || user?.email?.[0] || 'U').toUpperCase()
              )}
            </div>
            <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white shadow grid place-items-center cursor-pointer hover:bg-brand-50" title="Upload photo">
              <Upload className="w-3.5 h-3.5 text-brand-700" />
              <input
                data-testid="profile-picture-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
          </div>
          <div>
            <div className="text-sm font-semibold text-brand-900">{user?.email}</div>
            <div className="text-xs text-brand-900/60 mt-0.5 uppercase tracking-widest">{user?.role}</div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <Field icon={User} label="Full name" required>
            <input data-testid="profile-name-input" required value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Your full name" />
          </Field>

          <Field icon={Building2} label="Institute / Campus" required>
            <input data-testid="profile-institute-input" required value={institute} onChange={(e) => setInstitute(e.target.value)} className="input" placeholder="e.g., IIT Bombay, NIT Trichy, MIT" />
          </Field>

          {isStudent && (
            <Field icon={Hash} label="Roll number" required>
              <input data-testid="profile-rollno-input" required value={rollNo} onChange={(e) => setRollNo(e.target.value)} className="input" placeholder="e.g., 21CS3001" />
            </Field>
          )}

          <Field icon={Phone} label="Phone (optional)">
            <input data-testid="profile-phone-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="+91 …" />
          </Field>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="text-[11px] text-brand-900/50 max-w-[60%]">
            {isStudent
              ? 'Your roll number is used for badge attribution and never shown publicly on items.'
              : 'Next: create your first Lost & Found Centre.'}
          </div>
          <button data-testid="profile-save-btn" disabled={saving} className="btn-primary disabled:opacity-60">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save & continue'}
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
