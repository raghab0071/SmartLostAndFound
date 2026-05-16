import React from 'react'
import { Link } from 'react-router-dom'
import { Search, Github, Twitter, Mail } from 'lucide-react'

export default function Footer() {
  return (
    <footer data-testid="app-footer" className="mt-24 border-t border-brand-900/10 bg-brand-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 grain opacity-30" />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 grid md:grid-cols-4 gap-8 relative">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white/10 grid place-items-center">
              <Search className="w-5 h-5 text-amber-400" />
            </div>
            <div className="font-extrabold text-lg">FindIt</div>
          </div>
          <p className="text-sm text-white/60 mt-3 max-w-xs">
            The intelligent lost &amp; found ecosystem for modern campuses. Powered by AI matching and built for trust.
          </p>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-white/40 mb-3">Platform</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/browse" className="hover:text-amber-300">Browse Found</Link></li>
            <li><Link to="/centres" className="hover:text-amber-300">Centres</Link></li>
            <li><Link to="/leaderboard" className="hover:text-amber-300">Leaderboard</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-white/40 mb-3">For Users</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/login/student" className="hover:text-amber-300">Student Sign in</Link></li>
            <li><Link to="/login/admin" className="hover:text-amber-300">Admin Login</Link></li>
            <li><Link to="/student/report" className="hover:text-amber-300">Report a lost item</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-white/40 mb-3">Connect</div>
          <div className="flex items-center gap-3 text-white/70">
            <a href="https://twitter.com" className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 grid place-items-center"><Twitter className="w-4 h-4" /></a>
            <a href="https://github.com/raghab0071/SmartLostAndFound" className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 grid place-items-center"><Github className="w-4 h-4" /></a>
            <a href="mailto:info@findit.com" className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 grid place-items-center"><Mail className="w-4 h-4" /></a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/40">
        © {new Date().getFullYear()} FindIt · Smart Lost &amp; Found Ecosystem
      </div>
    </footer>
  )
}
