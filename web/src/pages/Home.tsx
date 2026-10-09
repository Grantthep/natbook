import { useQuery } from '@tanstack/react-query'
import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router'
import { api, type ShopListItem } from '../api'
import { CATEGORIES, categoryOf } from '../categories'
import { thb } from '../format'
import { ErrorText, ShopAvatar, TopBar } from '../ui'

export default function Home() {
  const [category, setCategory] = useState<string>()
  const [search, setSearch] = useState('')
  const q = useDeferredValue(search.trim())
  const shops = useQuery({
    queryKey: ['shops', category, q],
    queryFn: () => {
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (q) params.set('q', q)
      return api<ShopListItem[]>(`/public?${params}`)
    },
    placeholderData: (previous) => previous,
  })
  const filtering = Boolean(category || q)

  return (
    <div className="min-h-screen">
      <TopBar />

      <main className="mx-auto max-w-5xl px-4 pb-16">
        <section className="py-10">
          <h1 className="text-3xl font-bold tracking-tight">Book an appointment</h1>
          <p className="mt-1 text-stone-600">Salons, massage, clinics, gyms and tutors around Bangkok.</p>
          <input
            type="search" value={search} onChange={(e) => setSearch(e.target.value)} maxLength={60}
            placeholder="Search by shop, service or area" aria-label="Search by shop, service or area"
            className="mt-5 block w-full max-w-xl rounded-lg border border-stone-300 bg-white px-4 py-3 text-base focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
          />
        </section>

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto border-b border-stone-200 px-4 pb-3">
          <FilterButton active={!category} onClick={() => setCategory(undefined)}>All</FilterButton>
          {CATEGORIES.map((c) => (
            <FilterButton key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>{c.label}</FilterButton>
          ))}
        </div>

        <ErrorText error={shops.error} />
        {shops.isPending && <p className="py-8 text-stone-500">Loading…</p>}

        {shops.data?.length === 0 && (filtering ? (
          <p className="py-10 text-stone-600">Nothing matches that. Try a different search or category.</p>
        ) : (
          <div className="py-12">
            <p className="font-semibold">No shops have joined yet.</p>
            <p className="mt-1 text-stone-600">
              Run a salon, clinic or studio? <Link to="/register" className="font-medium text-emerald-800 underline">Add your shop</Link> and start taking bookings.
            </p>
          </div>
        ))}

        {shops.data && shops.data.length > 0 && (
          <>
            <p className="mt-4 text-sm text-stone-500">{shops.data.length} {shops.data.length === 1 ? 'place' : 'places'}</p>
            <ul className="mt-2 grid gap-3 md:grid-cols-2">
              {shops.data.map((shop) => (
                <li key={shop.slug}>
                  <Link to={`/b/${shop.slug}`} className="flex h-full gap-4 rounded-xl border border-stone-200 bg-white p-4 transition-colors hover:border-stone-400">
                    <ShopAvatar name={shop.name} category={shop.category} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <h2 className="truncate font-semibold">{shop.name}</h2>
                        <span className="shrink-0 text-sm text-stone-600">from {thb(shop.min_price)}</span>
                      </div>
                      <p className="text-sm text-stone-500">{categoryOf(shop.category).label}{shop.area && ` · ${shop.area}`}</p>
                      {shop.description && <p className="mt-1 line-clamp-2 text-sm text-stone-600">{shop.description}</p>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="mt-16 border-t border-stone-200 pt-6 text-sm text-stone-600">
          Own a shop? <Link to="/register" className="font-medium text-emerald-800 underline">List it on NatBook</Link>. It's free, and customers can book you any time.
        </p>
      </main>
    </div>
  )
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick} aria-pressed={active}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${active ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500'}`}
    >
      {children}
    </button>
  )
}
