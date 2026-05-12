import React, { useEffect, useState } from 'react'
import api from '../lib/api'
import LostNoticeList from '../components/LostNoticeList.jsx'
import { SectionTitle, Spinner } from '../components/Common.jsx'

export default function NoticesPage() {
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/items/lost/alerts/recent', { params: { limit: 50 } })
      .then(({ data }) => setNotices(data || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-10" data-testid="notices-page">
      <SectionTitle kicker="Live alerts" title="All student lost notices" subtitle="If you find any of these items, hand them to a verified centre." />
      {loading ? <Spinner /> : <LostNoticeList notices={notices} />}
    </div>
  )
}
