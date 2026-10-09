import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { api, ApiError } from '../api'
import { dateTime, thb } from '../format'
import { loadSaved, manageLink, saveBooking, type SavedBooking } from '../savedBookings'
import { Button, Card, ErrorText, TopBar } from '../ui'

export type CustomerBooking = {
  id: number
  shop_name: string
  shop_slug: string
  timezone: string
  service_name: string
  price_thb: number
  customer_name: string
  starts_at: string
  ends_at: string
  status: 'confirmed' | 'cancelled'
}

const fetchBooking = ({ id, token }: SavedBooking) =>
  api<CustomerBooking>(`/bookings/${id}?token=${encodeURIComponent(token)}`)

/** All bookings made from this browser. */
export default function MyBookings() {
  const saved = loadSaved()
  const results = useQueries({
    queries: saved.map((s) => ({ queryKey: ['my-booking', s.id], queryFn: () => fetchBooking(s) })),
  })
  const [now] = useState(() => Date.now())
  const loaded = results.flatMap((r, i) => (r.data ? [{ booking: r.data, saved: saved[i] }] : []))
  const upcoming = loaded.filter(({ booking }) => booking.status === 'confirmed' && Date.parse(booking.ends_at) > now)
    .sort((a, b) => a.booking.starts_at.localeCompare(b.booking.starts_at))
  const past = loaded.filter((x) => !upcoming.includes(x))

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold">My bookings</h1>
        <p className="mt-1 text-sm text-stone-600">Bookings you've made on this device.</p>

        {saved.length === 0 && (
          <div className="mt-6 rounded-xl border border-stone-200 bg-white p-6 text-stone-600">
            You haven't booked anything on this device yet. <Link to="/" className="font-medium text-emerald-800 underline">Find a place</Link>
          </div>
        )}
        {loaded.length === 0 && results.some((r) => r.isPending) && <p className="mt-6 text-stone-500">Loading…</p>}

        {upcoming.length > 0 && (
          <section className="mt-6 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Upcoming</h2>
            {upcoming.map(({ booking, saved }) => <BookingRow key={booking.id} booking={booking} link={manageLink(saved)} />)}
          </section>
        )}
        {past.length > 0 && (
          <section className="mt-8 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Past and cancelled</h2>
            {past.map(({ booking, saved }) => <BookingRow key={booking.id} booking={booking} link={manageLink(saved)} />)}
          </section>
        )}
      </main>
    </div>
  )
}

function BookingRow({ booking, link }: { booking: CustomerBooking; link: string }) {
  const cancelled = booking.status === 'cancelled'
  return (
    <Link to={link} className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white p-4 hover:border-stone-300">
      <div className={cancelled ? 'text-stone-400' : ''}>
        <p className="font-semibold">{booking.shop_name}</p>
        <p className="text-sm">{booking.service_name} · {dateTime(booking.starts_at, booking.timezone)}</p>
      </div>
      <span className="text-sm text-stone-500">{cancelled ? 'Cancelled' : 'View'}</span>
    </Link>
  )
}

/** One booking, opened from its private link. */
export function ManageBooking() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const saved = { id: Number(id), token: params.get('token') ?? '' }
  const queryClient = useQueryClient()
  const booking = useQuery({ queryKey: ['my-booking', saved.id], queryFn: () => fetchBooking(saved) })
  const cancel = useMutation({
    mutationFn: () => api<CustomerBooking>(`/bookings/${saved.id}/cancel?token=${encodeURIComponent(saved.token)}`, { method: 'POST' }),
    onSuccess: (b) => queryClient.setQueryData(['my-booking', saved.id], b),
  })

  // Opening the link on another device adds the booking to that device's list too.
  useEffect(() => {
    if (booking.isSuccess) saveBooking({ id: saved.id, token: saved.token })
  }, [booking.isSuccess, saved.id, saved.token])

  const [now] = useState(() => Date.now())
  const b = booking.data
  const upcoming = b && b.status === 'confirmed' && Date.parse(b.starts_at) > now
  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-lg px-4 py-8">
        <Link to="/my-bookings" className="text-sm text-stone-600 hover:text-stone-900">← My bookings</Link>
        {booking.isPending && <p className="mt-6 text-stone-500">Loading…</p>}
        {booking.error && (
          <ErrorText error={booking.error instanceof ApiError && booking.error.status === 404 ? "We couldn't find this booking. Check that the link is complete." : booking.error} />
        )}
        {b && (
          <Card className="mt-4">
            <p className={`text-sm font-medium ${b.status === 'cancelled' ? 'text-red-700' : 'text-emerald-800'}`}>
              {b.status === 'cancelled' ? 'Cancelled' : 'Confirmed'}
            </p>
            <h1 className="mt-1 text-xl font-bold">{b.service_name}</h1>
            <Link to={`/b/${b.shop_slug}`} className="text-stone-600 underline-offset-2 hover:underline">{b.shop_name}</Link>
            <dl className="mt-5 space-y-2 border-t border-stone-100 pt-4 text-sm">
              <Detail label="When" value={dateTime(b.starts_at, b.timezone)} />
              <Detail label="Name" value={b.customer_name} />
              <Detail label="Price" value={`${thb(b.price_thb)}, paid at the shop`} />
              <Detail label="Booking no." value={`#${b.id}`} />
            </dl>
            <ErrorText error={cancel.error} />
            {upcoming && (
              <Button
                variant="ghost" className="mt-5 w-full" disabled={cancel.isPending}
                onClick={() => confirm('Cancel this booking? The time will be given to someone else.') && cancel.mutate()}
              >
                Cancel booking
              </Button>
            )}
          </Card>
        )}
      </main>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-stone-500">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )
}
