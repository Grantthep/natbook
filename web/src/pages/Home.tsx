import { useQuery } from '@tanstack/react-query'
import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router'
import { api, type ShopListItem } from '../api'
import { CATEGORIES, categoryOf } from '../categories'
import { thb } from '../format'
import { ErrorText, ShopCover, TopBar } from '../ui'

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

  return (
    <div className="min-h-screen">
      <TopBar />

      <section className="bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-600 text-white">
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-12 sm:pt-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-teal-100">Bangkok · no queue, no phone calls</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Book your next appointment in a few taps
          </h1>
          <p className="mt-3 max-w-xl text-lg text-teal-50/90">
            Haircuts, massage, nails, dentists, gyms and tutors. See real free times and book instantly.
          </p>
          <div className="mt-8 flex max-w-xl items-center gap-3 rounded-2xl bg-white p-2 shadow-xl shadow-teal-950/20">
            <span className="pl-3 text-xl" aria-hidden>🔍</span>
            <input
              type="search" value={search} onChange={(e) => setSearch(e.target.value)} maxLength={60}
              placeholder="Search shops, services or areas"
              aria-label="Search shops, services or areas"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none"
            />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 pb-16">
        <div className="no-scrollbar -mx-4 -mt-6 flex gap-2 overflow-x-auto px-4 pb-2">
          <CategoryChip active={!category} onClick={() => setCategory(undefined)} emoji="✨" label="All" />
          {CATEGORIES.map((c) => (
            <CategoryChip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)} emoji={c.emoji} label={c.label} />
          ))}
        </div>

        <div className="mt-8 flex items-baseline justify-between">
          <h2 className="text-2xl font-extrabold tracking-tight">
            {category ? categoryOf(category).label : 'Popular near you'}
          </h2>
          {shops.data && <span className="text-sm text-stone-500">{shops.data.length} places</span>}
        </div>

        <ErrorText error={shops.error} />
        {shops.isPending && <ShopGridSkeleton />}
        {shops.data?.length === 0 && (
          <div className="mt-6 rounded-3xl border border-dashed border-stone-300 p-10 text-center text-stone-600">
            {category || q ? (
              'No places match that yet. Try another search or category.'
            ) : (
              <>
                <p className="text-lg font-semibold text-stone-800">No shops have joined yet.</p>
                <p className="mt-1">Own a shop, clinic or studio? Be the first to take bookings on NatBook.</p>
                <Link to="/register" className="mt-5 inline-block rounded-full bg-teal-700 px-6 py-3 font-semibold text-white hover:bg-teal-800">
                  Add your shop
                </Link>
              </>
            )}
          </div>
        )}
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shops.data?.map((shop) => <ShopTile key={shop.slug} shop={shop} />)}
        </div>

        <section className="mt-16 flex flex-col items-start justify-between gap-6 rounded-3xl bg-stone-900 p-8 text-white sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="text-2xl font-extrabold">Own a shop or clinic?</h2>
            <p className="mt-2 max-w-md text-stone-300">
              Get your own booking page for free. Customers book open slots, and you never get double-booked.
            </p>
          </div>
          <Link to="/register" className="shrink-0 rounded-full bg-white px-6 py-3 font-semibold text-stone-900 hover:bg-teal-50">
            Create your booking page
          </Link>
        </section>
      </main>
    </div>
  )
}

function CategoryChip({ active, onClick, emoji, label }: { active: boolean; onClick: () => void; emoji: string; label: string }) {
  return (
    <button
      onClick={onClick} aria-pressed={active}
      className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold shadow-sm transition ${active ? 'border-teal-700 bg-teal-700 text-white' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-400'}`}
    >
      <span aria-hidden>{emoji}</span>
      {label}
    </button>
  )
}

function ShopTile({ shop }: { shop: ShopListItem }) {
  return (
    <Link
      to={`/b/${shop.slug}`}
      className="group overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <ShopCover category={shop.category} className="h-36 transition group-hover:brightness-105" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold leading-snug">{shop.name}</h3>
          <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600">
            {categoryOf(shop.category).label}
          </span>
        </div>
        {shop.area && <p className="mt-1 text-sm text-stone-500">📍 {shop.area}</p>}
        <p className="mt-2 line-clamp-2 text-sm text-stone-600">{shop.description}</p>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-stone-500">{shop.service_count} services</span>
          <span className="font-bold text-teal-800">from {thb(shop.min_price)}</span>
        </div>
      </div>
    </Link>
  )
}

function ShopGridSkeleton() {
  return (
    <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-72 animate-pulse rounded-3xl bg-stone-200/70" />
      ))}
    </div>
  )
}
