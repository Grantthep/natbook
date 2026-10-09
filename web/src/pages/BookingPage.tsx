import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { api, ApiError, type Booking, type Business, type Service } from '../api'
import { categoryOf } from '../categories'
import { WEEKDAYS, addDays, dateTime, dayParts, hourIn, thb, time, todayIn, weekdayOf } from '../format'
import { Button, Card, ErrorText, Field, ShopCover, TopBar } from '../ui'

const DAYS_SHOWN = 14

export default function BookingPage() {
  const { slug = '' } = useParams()
  const business = useQuery({ queryKey: ['public', slug], queryFn: () => api<Business>(`/public/${slug}`) })
  const [service, setService] = useState<Service>()
  const [booked, setBooked] = useState<Booking>()

  if (business.isPending) return <Page><div className="h-52 animate-pulse bg-stone-200/70" /></Page>
  if (business.error) {
    const notFound = business.error instanceof ApiError && business.error.status === 404
    return (
      <Page>
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <ErrorText error={notFound ? 'This booking page does not exist.' : business.error} />
          <Link to="/" className="mt-4 inline-block font-semibold text-teal-800 hover:underline">← Browse all places</Link>
        </div>
      </Page>
    )
  }

  const b = business.data
  return (
    <Page>
      <ShopCover category={b.category} className="h-40 sm:h-56 [&>span]:text-7xl" />
      <div className="mx-auto max-w-5xl px-4">
        <div className="relative -mt-10 rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm sm:p-8">
          <Link to="/" className="text-sm font-semibold text-teal-800 hover:underline">← All places</Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight">{b.name}</h1>
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
              {categoryOf(b.category).emoji} {categoryOf(b.category).label}
            </span>
          </div>
          {b.area && <p className="mt-1 text-stone-500">📍 {b.area}</p>}
          {b.description && <p className="mt-3 max-w-2xl text-stone-700">{b.description}</p>}
          <OpenToday business={b} />
        </div>

        <div className="mt-6 pb-16">
          {booked ? (
            <Confirmation booking={booked} business={b} onAnother={() => { setBooked(undefined); setService(undefined) }} />
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
              {/* min-w-0 stops the scrolling date row from stretching the grid wider than the phone */}
              <div className="min-w-0 space-y-6">
                <Card title={<Step n={1}>Choose a service</Step>}>
                  {b.services.length === 0 && <p className="text-stone-600">No services are available yet.</p>}
                  <div className="grid gap-3">
                    {b.services.map((s) => (
                      <button
                        key={s.id} onClick={() => setService(s)} aria-pressed={service?.id === s.id}
                        className={`flex items-center justify-between gap-4 rounded-2xl border-2 px-4 py-3.5 text-left transition ${service?.id === s.id ? 'border-teal-700 bg-teal-50' : 'border-stone-200 hover:border-stone-300'}`}
                      >
                        <span>
                          <span className="block font-semibold">{s.name}</span>
                          <span className="text-sm text-stone-500">⏱ {s.duration_min} min</span>
                        </span>
                        <span className="font-bold">{thb(s.price_thb)}</span>
                      </button>
                    ))}
                  </div>
                </Card>
                {service ? (
                  <ChooseTime key={service.id} business={b} service={service} onBooked={setBooked} />
                ) : (
                  <Card title={<Step n={2} muted>Pick a date and time</Step>}>
                    <p className="text-stone-500">Choose a service first to see free times.</p>
                  </Card>
                )}
              </div>
              <OpeningHoursCard business={b} />
            </div>
          )}
        </div>
      </div>
    </Page>
  )
}

function Page({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <TopBar />
      {children}
    </div>
  )
}

function Step({ n, muted, children }: { n: number; muted?: boolean; children: ReactNode }) {
  return (
    <span className={`flex items-center gap-3 ${muted ? 'text-stone-400' : ''}`}>
      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${muted ? 'bg-stone-100' : 'bg-teal-700 text-white'}`}>{n}</span>
      {children}
    </span>
  )
}

function OpenToday({ business }: { business: Business }) {
  const hours = business.hours.find((h) => h.weekday === weekdayOf(todayIn(business.timezone)))
  return (
    <p className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${hours ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100 text-stone-600'}`}>
      <span className={`h-2 w-2 rounded-full ${hours ? 'bg-emerald-500' : 'bg-stone-400'}`} />
      {hours ? `Open today ${hours.opens.slice(0, 5)}–${hours.closes.slice(0, 5)}` : 'Closed today'}
    </p>
  )
}

function OpeningHoursCard({ business }: { business: Business }) {
  return (
    <Card title="Opening hours" className="h-fit lg:sticky lg:top-24">
      <dl className="space-y-2 text-sm">
        {WEEKDAYS.map((day, i) => {
          const h = business.hours.find((x) => x.weekday === i)
          return (
            <div key={day} className="flex justify-between">
              <dt className="text-stone-600">{day}</dt>
              <dd className={h ? 'font-semibold' : 'text-stone-400'}>{h ? `${h.opens.slice(0, 5)} – ${h.closes.slice(0, 5)}` : 'Closed'}</dd>
            </div>
          )
        })}
      </dl>
    </Card>
  )
}

function ChooseTime({ business, service, onBooked }: { business: Business; service: Service; onBooked: (b: Booking) => void }) {
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
      api<Booking>(`/public/${business.slug}/bookings`, { body: { service_id: service.id, starts_at: slot, ...customer } }),
    onSuccess: onBooked,
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
      <Card title={<Step n={2}>Pick a date and time</Step>}>
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6">
          {days.map((d, i) => {
            const { weekday, day, month } = dayParts(d)
            const closed = !openDays.has(weekdayOf(d))
            return (
              <button
                key={d} disabled={closed} aria-pressed={date === d}
                onClick={() => { setDate(d); setSlot(undefined) }}
                className={`flex w-16 shrink-0 flex-col items-center rounded-2xl border-2 py-2.5 transition ${date === d ? 'border-teal-700 bg-teal-700 text-white' : 'border-stone-200 hover:border-stone-300'} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <span className="text-xs font-semibold uppercase">{i === 0 ? 'Today' : weekday}</span>
                <span className="text-xl font-extrabold">{day}</span>
                <span className="text-xs">{closed ? 'Closed' : month}</span>
              </button>
            )
          })}
        </div>

        <div className="mt-6 space-y-5">
          {slots.isPending && <div className="h-24 animate-pulse rounded-2xl bg-stone-100" />}
          <ErrorText error={slots.error} />
          {slots.data?.slots.length === 0 && (
            <p className="rounded-2xl bg-stone-50 p-4 text-center text-stone-600">Fully booked on this day. Try another date.</p>
          )}
          {groups.filter((g) => g.slots.length).map((g) => (
            <div key={g.label}>
              <h3 className="mb-2 text-sm font-semibold text-stone-500">{g.label}</h3>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {g.slots.map((s) => (
                  <button
                    key={s} onClick={() => setSlot(s)} aria-pressed={slot === s}
                    className={`rounded-xl border-2 py-2 text-sm font-semibold transition ${slot === s ? 'border-teal-700 bg-teal-700 text-white' : 'border-stone-200 bg-white hover:border-teal-600'}`}
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
        <Card title={<Step n={3}>Your details</Step>}>
          <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl bg-teal-50 px-4 py-3">
            <div>
              <p className="font-semibold">{service.name}</p>
              <p className="text-sm text-teal-900">{dateTime(slot, business.timezone)} · {service.duration_min} min</p>
            </div>
            <p className="text-lg font-extrabold">{thb(service.price_thb)}</p>
          </div>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Name" name="name" required maxLength={100} autoComplete="name" /></div>
            <Field label="Email" name="email" type="email" required autoComplete="email" />
            <Field label="Phone (optional)" name="phone" type="tel" maxLength={30} autoComplete="tel" />
            <div className="space-y-3 sm:col-span-2">
              <ErrorText error={book.error} />
              <Button type="submit" className="w-full py-3.5 text-base" disabled={book.isPending}>
                {book.isPending ? 'Booking…' : `Confirm booking · ${thb(service.price_thb)}`}
              </Button>
              <p className="text-center text-xs text-stone-500">Pay at the shop. Free to book.</p>
            </div>
          </form>
        </Card>
      )}
    </>
  )
}

function Confirmation({ booking, business, onAnother }: { booking: Booking; business: Business; onAnother: () => void }) {
  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-3xl bg-white shadow-xl shadow-stone-900/10">
      <div className="bg-gradient-to-br from-teal-700 to-emerald-600 px-6 py-8 text-center text-white">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-3xl">✓</div>
        <p className="mt-3 text-2xl font-extrabold">You're booked!</p>
        <p className="text-teal-50">Booking #{booking.id}</p>
      </div>
      <div className="relative border-t-2 border-dashed border-stone-200 px-6 py-6">
        <div className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-stone-50" />
        <div className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-stone-50" />
        <dl className="space-y-3 text-sm">
          <Row label="Place" value={business.name} />
          <Row label="Service" value={booking.service_name} />
          <Row label="When" value={dateTime(booking.starts_at, business.timezone)} />
          <Row label="Name" value={booking.customer_name} />
        </dl>
        <p className="mt-5 text-center text-sm text-stone-500">Please arrive 5 minutes early. 🙏</p>
        <div className="mt-5 grid gap-2">
          <Button onClick={onAnother}>Book another service</Button>
          <Link to="/" className="rounded-full py-2.5 text-center text-sm font-semibold text-teal-800 hover:bg-teal-50">Browse other places</Link>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-stone-500">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  )
}
