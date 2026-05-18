import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api, { API_BASE } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { ArrowLeft, MapPin, Calendar, Tag, User, Shield, Send, QrCode, X, Image as ImageIcon, AlertCircle, Share2, Copy, Check } from 'lucide-react'
import { Spinner } from '../components/Common.jsx'

export default function ItemDetailPage() {
  const { itemId } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin, isStudent } = useAuth()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [claimOpen, setClaimOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const canEditItem = (item) => {
    if (!isAdmin || !user || !item) return false
    return item.posted_by_admin_id === user.user_id
  }

  const load = () => {
    setLoading(true)
    api.get(`/items/found/${itemId}`).then(({ data }) => setItem(data))
      .catch(() => toast.error('Item not found'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [itemId])

  if (loading) return <Spinner />
  if (!item) return null

  return (
    <div data-testid="item-detail-page" className="max-w-5xl mx-auto px-4 md:px-8 py-10">
      <button onClick={() => navigate(-1)} className="text-sm text-brand-900/60 hover:text-brand-900 inline-flex items-center gap-1 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="card overflow-hidden">
          <div className="aspect-square bg-brand-50">
            {item.images?.[0] ? (
              <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-brand-900/30">
                <ImageIcon className="w-16 h-16" />
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`chip status-${item.status}`}>{item.status}</span>
            <span className="chip bg-brand-50 text-brand-900 border border-brand-900/10"><Tag className="w-3 h-3" /> {item.category}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-brand-900">{item.title}</h1>
          <p className="text-brand-900/70 mt-3 leading-relaxed">{item.description}</p>

          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <Detail icon={MapPin} label="Found at" value={item.location_found} />
            {item.building && <Detail icon={MapPin} label="Building" value={item.building} />}
            {item.date_found && <Detail icon={Calendar} label="Date found" value={item.date_found} />}
            {item.color && <Detail label="Color" value={item.color} />}
            {item.brand && <Detail label="Brand" value={item.brand} />}
            {item.posted_by_admin_name && <Detail icon={Shield} label="Logged by" value={item.posted_by_admin_name} />}
            {item.submitted_by_name && <Detail icon={User} label="Handed in by" value={item.submitted_by_name} />}
          </dl>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              data-testid="view-qr-btn"
              onClick={() => setQrOpen(true)}
              className="btn-ghost"
            >
              <QrCode className="w-4 h-4" /> View QR
            </button>
            <button
              data-testid="share-btn"
              onClick={() => setShareOpen(true)}
              className="btn-ghost"
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
            {!user && (
              <Link to="/login/student" className="btn-primary" data-testid="login-to-claim-btn">
                <Send className="w-4 h-4" /> Sign in to claim
              </Link>
            )}
            {isStudent && item.status !== 'returned' && item.status !== 'closed' && (
              <button
                data-testid="open-claim-modal-btn"
                onClick={() => setClaimOpen(true)}
                className="btn-primary"
              >
                <Send className="w-4 h-4" /> File a claim
              </button>
            )}
            {canEditItem(item) && (
              <Link to={`/admin/found/${item.item_id}/edit`} className="btn-ghost" data-testid="edit-item-btn">
                Edit item
              </Link>
            )}
          </div>

          {item.status === 'returned' && (
            <div className="mt-6 p-4 rounded-2xl bg-blue-50 border border-blue-200 text-sm text-blue-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> This item has already been returned to its owner.
            </div>
          )}
        </div>
      </div>

      {qrOpen && (
        <Modal onClose={() => setQrOpen(false)} testid="qr-modal">
          <h3 className="text-lg font-bold text-brand-900 mb-3">Item QR · {item.item_id}</h3>
          <p className="text-sm text-brand-900/60 mb-4">Scan to share the public item page.</p>
          <div className="grid place-items-center bg-white p-4 rounded-xl border border-brand-900/10">
            <img
              data-testid="qr-image"
              src={`${API_BASE}/api/items/found/${item.item_id}/qr`}
              alt="QR"
              className="w-64 h-64"
            />
          </div>
        </Modal>
      )}

      {shareOpen && (
        <Modal onClose={() => setShareOpen(false)} testid="share-modal">
          <h3 className="text-lg font-bold text-brand-900 mb-1">Share this item</h3>
          <p className="text-sm text-brand-900/60 mb-4">Anyone can view this public item page using the link below.</p>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/items/${item.item_id}`}
                className="input flex-1 text-sm"
                data-testid="share-link-input"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/items/${item.item_id}`)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                  toast.success('Link copied!')
                }}
                data-testid="copy-link-btn"
                className="btn-ghost"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="text-xs text-brand-900/60">
              Share via email, messaging, or social media to help find the owner.
            </div>
          </div>
        </Modal>
      )}

      {claimOpen && (
        <ClaimModal
          itemId={item.item_id}
          onClose={() => setClaimOpen(false)}
          onSuccess={() => {
            setClaimOpen(false)
            toast.success('Claim submitted! An admin will review it.')
            load()
          }}
        />
      )}
    </div>
  )
}

function Detail({ icon: Icon, label, value }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-widest text-brand-900/50 font-semibold">{label}</dt>
      <dd className="text-brand-900 flex items-center gap-1.5 mt-0.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-brand-600" />} {value}
      </dd>
    </div>
  )
}

function Modal({ children, onClose, testid }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-brand-900/40 backdrop-blur-sm p-4" data-testid={testid}>
      <div className="card max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          data-testid="modal-close-btn"
          className="absolute top-3 right-3 w-8 h-8 grid place-items-center rounded-full hover:bg-brand-50"
        >
          <X className="w-4 h-4" />
        </button>
        {children}
      </div>
    </div>
  )
}

function ClaimModal({ itemId, onClose, onSuccess }) {
  const [proof, setProof] = useState('')
  const [contact, setContact] = useState('')
  const [images, setImages] = useState([])
  const [submitting, setSubmitting] = useState(false)

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
    setImages((prev) => [...prev, ...arr])
  }

  const submit = async () => {
    if (proof.trim().length < 15) {
      toast.error('Please describe your proof in more detail (15+ chars).')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/claims', {
        found_item_id: itemId,
        ownership_proof: proof,
        contact,
        proof_images: images,
      })
      onSuccess()
    } catch (e) {
      toast.error(e.message || 'Failed to submit claim')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal onClose={onClose} testid="claim-modal">
      <h3 className="text-lg font-bold text-brand-900 mb-1">File a claim</h3>
      <p className="text-xs text-brand-900/60 mb-4">Describe a unique detail (a scratch, contents, a sticker — anything verifiable) so admins can verify ownership.</p>
      <div className="space-y-3">
        <div>
          <label className="label">Proof of ownership</label>
          <textarea
            data-testid="claim-proof-input"
            value={proof}
            onChange={(e) => setProof(e.target.value)}
            rows={4}
            className="input"
            placeholder="e.g., My wallet has a punched-hole metro card and a faded photo inside the bill section."
          />
        </div>
        <div>
          <label className="label">Contact (optional)</label>
          <input
            data-testid="claim-contact-input"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="input"
            placeholder="Phone or email so the centre can reach you"
          />
        </div>
        <div>
          <label className="label">Proof images (optional)</label>
          <input
            data-testid="claim-images-input"
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFiles(e.target.files)}
            className="text-sm"
          />
          {images.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-2">
              {images.map((src, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-brand-900/10">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setImages((arr) => arr.filter((_, j) => j !== i))}
                    className="absolute top-0.5 right-0.5 w-5 h-5 grid place-items-center rounded-full bg-white/90"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          data-testid="claim-submit-btn"
          onClick={submit}
          disabled={submitting}
          className="btn-primary w-full disabled:opacity-60"
        >
          {submitting ? 'Submitting…' : 'Submit claim'}
        </button>
      </div>
    </Modal>
  )
}
