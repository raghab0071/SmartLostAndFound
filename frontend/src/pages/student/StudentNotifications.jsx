import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Sparkles, BellOff, CheckCheck, Bell } from 'lucide-react'
import { SectionTitle, Spinner, EmptyState } from '../../components/Common.jsx'
import { useAuth } from '../../context/AuthContext'

export default function StudentNotifications() {
  const { refreshNotifications } = useAuth()
  const [data, setData] = useState({ items: [], unread: 0 })
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.get('/notifications', { params: { limit: 50 } })
      .then(({ data }) => {
        setData(data)
        refreshNotifications()
      })
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const markAll = async () => {
    await api.post('/notifications/read-all')
    toast.success('All marked as read')
    load()
  }
  const markOne = async (id) => {
    await api.post(`/notifications/${id}/read`)
    load()
  }

  if (loading) return <Spinner />

  return (
    <div data-testid="student-notifications-page">
      <SectionTitle
        kicker={`${data.unread} unread`}
        title="Notifications"
        action={data.unread > 0 ? <button data-testid="mark-all-read-btn" onClick={markAll} className="btn-ghost text-sm"><CheckCheck className="w-4 h-4" /> Mark all read</button> : null}
      />
      {data.items.length === 0 && (
        <EmptyState icon={BellOff} title="No notifications" testid="notif-empty" />
      )}
      <div className="space-y-3">
        {data.items.map((n) => (
          <div
            key={n.notification_id}
            data-testid={`notif-${n.notification_id}`}
            className={`card p-4 flex items-start gap-3 ${!n.read ? 'border-l-4 border-l-amber-400' : ''}`}
          >
            <div className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${n.read ? 'bg-brand-50 text-brand-700' : 'bg-amber-100 text-amber-700'}`}>
              {n.type === 'match' ? <Sparkles className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-brand-900">{n.title}</div>
              <div className="text-xs text-brand-900/70 mt-0.5">{n.body}</div>
              <div className="text-[10px] text-brand-900/40 mt-1">{new Date(n.created_at).toLocaleString()}</div>
              {n.link && n.link.startsWith('/items/') && (
                <Link
                  to={n.link}
                  onClick={() => !n.read && markOne(n.notification_id)}
                  className="text-xs font-semibold text-brand-700 hover:underline mt-2 inline-block"
                  data-testid={`notif-link-${n.notification_id}`}
                >
                  View →
                </Link>
              )}
            </div>
            {!n.read && (
              <button onClick={() => markOne(n.notification_id)} className="text-[10px] uppercase tracking-widest text-brand-700 hover:underline">
                Mark read
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
