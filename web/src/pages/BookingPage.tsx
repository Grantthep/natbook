import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { api, ApiError, type Booking, type Business, type Service } from '../api'
import { categoryOf } from '../categories'
import { WEEKDAYS, addDays, dateTime, dayParts, hourIn, thb, time, todayIn, weekdayOf } from '../format'
import { manageLink, saveBooking } from '../savedBookings'
import { Button, Card, ErrorText, Field, ShopAvatar, TopBar } from '../ui'

const DAYS_SHOWN = 14
type CreatedBooking = Booking & { manage_token: string }

export default function BookingPage() {
  const { slug = '' } = useParams()
  const business = useQuery({ queryKey: ['public', slug], queryFn: () => api<Business>(`/public/${slug}`) })
  const [service, setService] = useState<Service>()
  const [booked, setBooked] = useState<CreatedBooking>()
  const name = business.data?.name
  useEffect(() => {
    if (!name) return
    document.title = `${name} – book on NatBook`
    return () => { document.title = 'NatBook – book appointments in Bangkok' }
  }, [name])

  if (business.isPending) return <Page><p className="text-stone-500">Loading…</p></Page>
  if (business.error) {
    const notFound = business.error instanceof ApiError && business.error.status === 404
    return (
      <Page>
        <ErrorText error={notFound ? "This shop doesn't exist, or the link is wrong." : business.error} />
        <Link to="/" className="mt-3 inline-block text-sm font-medium text-emerald-800 underline">See all places</Link>
      </Page>
    )
  }

  const b = business.data
  return (
    <Page>
      <Link to="/" className="text-sm text-stone-600 hover:text-stone-900">← All places</Link>
      <div className="mt-4 flex gap-4">
        <ShopAvatar name={b.name} category={b.category} size="lg" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{b.name}</h1>
          <p className="text-stone-600">{categoryOf(b.category).label}{b.area && ` · ${b.area}`}</p>
          <OpenToday business={b} />
        </div>
      </div>
      {b.description && <p className="mt-4 max-w-2xl text-stone-700">{b.description}</p>}

      <div className="mt-8">
        {booked ? (
          <Confirmation booking={booked} business={b} onAnother={() => { setBooked(undefined); setService(undefined) }} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_17rem]">
            {/* min-w-0 stops the scrolling date row from stretching the grid wider than the phone */}
            <div className="min-w-0 space-y-4">
              <Card title="Choose a service">
                {b.services.length === 0 && <p className="text-stone-600">This shop hasn't added any services yet.</p>}
                <div className="divide-y divide-stone-100">
                  {b.services.map((s) => (
                    <label key={s.id} className="flex cursor-pointer items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <input
                        type="radio" name="service" checked={service?.id === s.id} onChange={() => setService(s)}
                        className="h-4 w-4 accent-emerald-800"
                      />
                      <span className="flex-1">
                        <span className="block font-medium">{s.name}</span>
                        <span className="text-sm text-stone-500">{s.duration_min} min</span>
                      </span>
                      <span className="font-medium">{thb(s.price_thb)}</span>
                    </label>
                  ))}
                </div>
              </Card>
              {service ? (
                <ChooseTime key={service.id} business={b} service={service} onBooked={setBooked} />
              ) : (
                b.services.length > 0 && <p className="px-1 text-sm text-stone-500">Pick a service to see free times.</p>
              )}
            </div>
            <OpeningHours business={b} />
          </div>
        )}
      </div>
    </Page>
  )
}

function Page({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-5xl px-4 py-6 pb-16">{children}</main>
    </div>
  )
}

function OpenToday({ business }: { business: Business }) {
  const hours = business.hours.find((h) => h.weekday === weekdayOf(todayIn(business.timezone)))
  return hours ? (
    <p className="mt-1 text-sm text-emerald-800">Open today, {hours.opens.slice(0, 5)}–{hours.closes.slice(0, 5)}</p>
  ) : (
    <p className="mt-1 text-sm text-stone-500">Closed today</p>
  )
}

function OpeningHours({ business }: { business: Business }) {
  return (
    <Card title="Opening hours" className="h-fit">
      <dl className="space-y-1.5 text-sm">
        {WEEKDAYS.map((day, i) => {
          const h = business.hours.find((x) => x.weekday === i)
          return (
            <div key={day} className="flex justify-between">
              <dt className="text-stone-600">{day}</dt>
              <dd className={h ? '' : 'text-stone-400'}>{h ? `${h.opens.slice(0, 5)}–${h.closes.slice(0, 5)}` : 'Closed'}</dd>
            </div>
          )
        })}
      </dl>
    </Card>
  )
}

function ChooseTime({ business, service, onBooked }: { business: Business; service: Service; onBooked: (b: CreatedBooking) => void }) {
  const queryClient = useQueryClient()
  const today = todayIn(business.timezone)
  const openDays = new Set(business.hours.map((h) => h.weekday))
  const days = Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(today, i))
  const [date, setDate] = useState(() => days.find((d) => openDays.has(weekdayOf(d))) ?? today)
  const [slot, setSlot] = useState<string>()
  const slotsKey = ['slots', business.slug, service.id, date]
  const slots = useQuery({
    queryKey: slotsKey,
    queryFn: () => api<{ slots: string[] }>(`/public/${business.slug}/slots?service_id=${service.id}&date=${date}`),
  })
  const book = useMutation({
    mutationFn: (customer: { customer_name: string; customer_email: string; customer_phone: string | null }) =>
      api<CreatedBooking>(`/public/${business.slug}/bookings`, { body: { service_id: service.id, starts_at: slot, ...customer } }),
    onSuccess: (booking) => {
      saveBooking({ id: booking.id, token: booking.manage_token })
      onBooked(booking)
    },
    onError: (error) => {
      // Someone else took the slot: show fresh times.
      if (error instanceof ApiError && error.status === 409) {
        setSlot(undefined)
        queryClient.invalidateQueries({ queryKey: slotsKey })
      }
    },
  })

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    book.mutate({
      customer_name: String(form.get('name')),
      customer_email: String(form.get('email')),
      customer_phone: String(form.get('phone')) || null,
    })
  }

  const groups = [
    { label: 'Morning', from: 0, to: 12 },
    { label: 'Afternoon', from: 12, to: 17 },
    { label: 'Evening', from: 17, to: 24 },
  ].map((g) => ({ ...g, slots: slots.data?.slots.filter((s) => { const h = hourIn(s, business.timezone); return h >= g.from && h < g.to }) ?? [] }))

  return (
    <>
      <Card title="Date and time">
        <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5">
          {days.map((d, i) => {
            const { weekday, day } = dayParts(d)
            const closed = !openDays.has(weekdayOf(d))
            return (
              <button
                key={d} disabled={closed} aria-pressed={date === d} aria-label={closed ? `${d}, closed` : d}
                onClick={() => { setDate(d); setSlot(undefined) }}
                className={`flex w-14 shrink-0 flex-col items-center rounded-lg border py-2 text-sm transition-colors ${date === d ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-stone-200 hover:border-stone-400'} disabled:cursor-not-allowed disabled:border-transparent disabled:text-stone-300`}
              >
                <span className="text-xs">{i === 0 ? 'Today' : weekday}</span>
                <span className="text-lg font-semibold leading-tight">{day}</span>
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-stone-500">{new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T00:00:00Z`))}</p>

        <div className="mt-4 space-y-4">
          {slots.isPending && <p className="text-sm text-stone-500">Checking free times…</p>}
          <ErrorText error={slots.error} />
          {slots.data?.slots.length === 0 && <p className="text-sm text-stone-600">No free times left on this day. Try another day.</p>}
          {groups.filter((g) => g.slots.length).map((g) => (
            <div key={g.label}>
              <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-stone-500">{g.label}</h3>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                {g.slots.map((s) => (
                  <button
                    key={s} onClick={() => setSlot(s)} aria-pressed={slot === s}
                    className={`rounded-lg border py-2 text-sm transition-colors ${slot === s ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-stone-200 bg-white hover:border-stone-400'}`}
                  >
                    {time(s, business.timezone)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {slot && (
        <Card title="Your details">
          <p className="mb-4 text-sm text-stone-600">
            <span className="font-medium text-stone-900">{service.name}</span>, {dateTime(slot, business.timezone)} ({service.duration_min} min) · {thb(service.price_thb)}
          </p>
          <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Name" name="name" required maxLength={100} autoComplete="name" /></div>
            <Field label="Email" name="email" type="email" required autoComplete="email" />
            <Field label="Phone (optional)" name="phone" type="tel" maxLength={30} autoComplete="tel" />
            <div className="space-y-2 pt-1 sm:col-span-2">
              <ErrorText error={book.error} />
              <Button type="submit" className="w-full py-3" disabled={book.isPending}>
                {book.isPending ? 'Booking…' : 'Book'}
              </Button>
              <p className="text-center text-xs text-stone-500">You pay at the shop. Booking is free.</p>
            </div>
          </form>
        </Card>
      )}
    </>
  )
}

function Confirmation({ booking, business, onAnother }: { booking: CreatedBooking; business: Business; onAnother: () => void }) {
  return (
    <Card className="mx-auto max-w-lg">
      <p className="text-sm font-medium text-emerald-800">Booking confirmed</p>
      <h2 className="mt-1 text-xl font-bold">See you {dateTime(booking.starts_at, business.timezone)}</h2>
      <dl className="mt-4 space-y-2 border-t border-stone-100 pt-4 text-sm">
        <Row label="Service" value={booking.service_name} />
        <Row label="Shop" value={business.name} />
        <Row label="Name" value={booking.customer_name} />
        <Row label="Booking no." value={`#${booking.id}`} />
      </dl>
      <p className="mt-4 rounded-lg bg-stone-50 p-3 text-sm text-stone-600">
        It's saved under <Link to="/my-bookings" className="font-medium text-emerald-800 underline">My bookings</Link> on this device,
        where you can also cancel it. Please arrive a few minutes early.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link to={manageLink({ id: booking.id, token: booking.manage_token })} className="flex-1 rounded-lg border border-stone-300 px-4 py-2 text-center text-sm font-medium hover:bg-stone-50">
          View or cancel
        </Link>
        <Button variant="ghost" className="flex-1" onClick={onAnother}>Book something else</Button>
      </div>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-stone-500">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )
}
