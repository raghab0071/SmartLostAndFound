import React, { useEffect, useState } from 'react'
import api from '../lib/api'
import { Trophy, Award } from 'lucide-react'
import { SectionTitle, Spinner, EmptyState } from '../components/Common.jsx'

export default function LeaderboardPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

 useEffect(() => {
  api.get('/leaderboard')
    .then((res) => {
      const data = res.data

      // handle different API shapes safely
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.users)
          ? data.users
          : []

      setUsers(list)
    })
    .catch((err) => {
      console.error(err)
      setUsers([])
    })
    .finally(() => setLoading(false))
}, [])

  const medals = ['from-amber-400 to-amber-600', 'from-slate-400 to-slate-500', 'from-orange-400 to-orange-600']

  return (
    <div data-testid="leaderboard-page" className="max-w-3xl mx-auto px-4 md:px-8 py-12">
      <SectionTitle
        kicker="Hall of Heroes"
        title="Campus Leaderboard"
        subtitle="Top students who help reunite the campus with its stuff."
      />
      {loading && <Spinner />}
      {!loading && users.length === 0 && (
        <EmptyState icon={Trophy} title="No heroes yet" body="Be the first to earn points by reuniting an item." testid="leaderboard-empty" />
      )}
      <div className="space-y-3">
        {Array.isArray(users) && users.map((u, i) => (
          <div
            key={i}
            data-testid={`leader-row-${i}`}
            className="card p-4 flex items-center gap-4 hover:shadow-xl transition"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${medals[i] || 'from-brand-500 to-brand-900'} text-white font-extrabold grid place-items-center shadow-soft`}>
              {i + 1}
            </div>
            {u.picture ? (
              <img src={u.picture} alt={u.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-white" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-brand-900 grid place-items-center text-white font-bold">
                {u.name?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <div className="font-bold text-brand-900">{u.name}</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {u.badges?.map((b, j) => (
                  <span key={j} className="chip bg-amber-50 text-amber-700 border border-amber-200">
                    <Award className="w-3 h-3" /> {b}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-brand-900">{u.points}</div>
              <div className="text-[10px] uppercase tracking-widest text-brand-900/60">points</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
