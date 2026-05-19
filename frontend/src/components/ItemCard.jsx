import React from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Calendar, Tag } from 'lucide-react'

export default function ItemCard({ item, testidPrefix = 'item' }) {
  const img = item.images?.[0]
  const statusLabel = item.status === 'claim_pending' ? 'pending' : item.status
  
  return (
    <Link
      to={`/items/${item.item_id}`}
      data-testid={`${testidPrefix}-card-${item.item_id}`}
      className="group block card overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
    >
      <div className="aspect-[4/3] bg-brand-50 relative overflow-hidden">
        {img ? (
          <img
            src={img}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-brand-900/30 text-sm">No image</div>
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className={`chip status-${statusLabel}`}>{statusLabel}</span>
        </div>
        <div className="absolute top-3 right-3">
          <span className="chip bg-white/85 text-brand-900 border border-brand-900/5">
            <Tag className="w-3 h-3" /> {item.category}
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-brand-900 leading-snug line-clamp-1">{item.title}</h3>
        <p className="text-xs text-brand-900/60 mt-1 line-clamp-2 min-h-[2.5em]">{item.description}</p>
        <div className="flex items-center justify-between text-[11px] text-brand-900/60 mt-3 pt-3 border-t border-brand-900/5">
          <div className="flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{item.location_found}</span>
          </div>
          {item.date_found && (
            <div className="flex items-center gap-1 shrink-0">
              <Calendar className="w-3 h-3" />
              {item.date_found}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
