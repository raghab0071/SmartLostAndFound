import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { Upload, User, Building2, Phone, Hash, Save, Award } from 'lucide-react'
import { SectionTitle } from '../components/Common.jsx'

export default function UserProfilePage() {
  const { user, updateProfile } = useAuth()
  const isStudent = user?.role === 'student'
  const [name, setName] = useState(user?.name || '')
  const [institute, setInstitute] = useState(user?.institute || '')
  const [customInstitute, setCustomInstitute] = useState('')
  const [rollNo, setRollNo] = useState(user?.roll_no || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [picture, setPicture] = useState(user?.picture || '')
  const [institutes, setInstitutes] = useState([])
  const [saving, setSaving] = useState(false)

  const [loadingInstitutes, setLoadingInstitutes] = useState(true)

  useEffect(() => {
    let cancelled = false
    const loadInstitutes = async () => {
      try {
        const { data } = await api.get('/centres')
        if (cancelled) return
        const unique = Array.from(new Set((data || []).map((c) => c.institute).filter(Boolean)))
        setInstitutes(unique)
        if (user?.institute && !unique.includes(user.institute)) {
          setCustomInstitute(user.institute)
          setInstitute('')
        }
      } catch (err) {
        console.error('loadInstitutes error:', err.message)
      } finally {
        if (!cancelled) setLoadingInstitutes(false)
      }
    }
    loadInstitutes()
    return () => { cancelled = true }
  }, [])

  if (!user) return null

  const handleFile = async (file) => {
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return }
    const b64 = await new Promise((r, j) => { const x = new FileReader(); x.onload = () => r(x.result); x.onerror = j; x.readAsDataURL(file) })
    setPicture(b64)
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const finalInstitute = institute || customInstitute
      await updateProfile({
        name: name.trim(),
        institute: finalInstitute.trim() || undefined,
        roll_no: isStudent ? rollNo.trim() : undefined,
        phone: phone.trim() || undefined,
        picture: picture || undefined,
      })
      toast.success('Profile updated')
    } catch (e) {
      toast.error(e.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-10" data-testid="user-profile-page">
      <SectionTitle kicker="Account" title="Your profile" subtitle="Keep your details up to date to claim badges and rewards." />
      <form onSubmit={submit} className="card p-6 space-y-5">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-brand-500 to-brand-900 grid place-items-center text-white text-3xl font-extrabold">
              {picture ? <img src={picture} alt="profile" className="w-full h-full object-cover" /> : (name?.[0] || 'U').toUpperCase()}
            </div>
            <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white shadow grid place-items-center cursor-pointer hover:bg-brand-50">
              <Upload className="w-4 h-4 text-brand-700" />
              <input data-testid="me-picture-input" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </label>
          </div>
          <div>
            <div className="font-bold text-brand-900 text-lg">{user.email}</div>
            <div className="text-xs uppercase tracking-widest text-brand-900/60">{user.role}</div>
            {isStudent && (
              <div className="mt-2 flex items-center gap-3 text-xs text-brand-900/70">
                <span className="font-bold text-brand-900">{user.points || 0}</span> pts
                {user.badges?.length > 0 && (
                  <div className="flex gap-1">
                    {user.badges.map((b, i) => (
                      <span key={i} className="chip bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">
                        <Award className="w-2.5 h-2.5" /> {b}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field icon={User} label="Full name">
            <input data-testid="me-name-input" required value={name} onChange={(e) => setName(e.target.value)} className="input" />
          </Field>
          <Field icon={Building2} label="Institute / Campus">
            {institutes.length > 0 ? (
              <>
                <select
                  data-testid="me-institute-input"
                  value={institute || 'other'}
                  onChange={(e) => {
                    const value = e.target.value
                    setInstitute(value === 'other' ? '' : value)
                    if (value !== 'other') setCustomInstitute('')
                  }}
                  className="input"
                >
                  <option value="">Select your institute</option>
                  {institutes.map((inst) => (
                    <option key={inst} value={inst}>{inst}</option>
                  ))}
                  <option value="other">Other</option>
                </select>
                {((institute === '' && customInstitute) || institute === '') && (
                  <input
                    data-testid="me-institute-custom-input"
                    value={customInstitute}
                    onChange={(e) => setCustomInstitute(e.target.value)}
                    className="input mt-3"
                    placeholder="Enter your institute"
                  />
                )}
              </>
            ) : (
              <input data-testid="me-institute-input" value={institute} onChange={(e) => setInstitute(e.target.value)} className="input" placeholder="e.g., IIT Bombay" />
            )}
          </Field>
          {isStudent && (
            <Field icon={Hash} label="Roll number">
              <input
                data-testid="me-rollno-input"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                className="input"
                readOnly={Boolean(user?.roll_no)}
                placeholder={user?.roll_no ? 'Roll number cannot be changed' : ''}
              />
              {user?.roll_no && <div className="text-[10px] text-brand-900/60 mt-1">Roll number is locked once set.</div>}
            </Field>
          )}
          <Field icon={Phone} label="Phone">
            <input data-testid="me-phone-input" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
          </Field>
        </div>

        <div className="flex justify-end pt-2 border-t border-brand-900/5">
          <button data-testid="me-save-btn" disabled={saving} className="btn-primary disabled:opacity-60">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ icon: Icon, label, children }) {
  return (
    <div>
      <label className="label flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </label>
      {children}
    </div>
  )
}
