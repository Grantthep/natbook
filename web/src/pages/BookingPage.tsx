import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router'
import { api, ApiError, type Booking, type Business, type Service } from '../api'
import { addDays, dateTime, thb, time, todayIn } from '../format'
import { Button, Card, ErrorText, Field } from '../ui'

const MAX_DAYS_AHEAD = 60 // must match the API

export default function BookingPage() {
  const { slug = '' } = useParams()
  const business = useQuery({ queryKey: ['public', slug], queryFn: () => api<Business>(`/public/${slug}`) })
  const [service, setService] = useState<Service>()
  const [booked, setBooked] = useState<Booking>()

  if (business.isPending) return <Shell><p className="text-stone-600">Loading…</p></Shell>
  if (business.error) {
    const notFound = business.error instanceof ApiError && business.error.status === 404
    return <Shell><ErrorText error={notFound ? 'This booking page does not exist.' : business.error} /></Shell>
  }

  const b = business.data
  return (
    <Shell>
      <h1 className="text-3xl font-bold">{b.name}</h1>
      <p className="mt-1 text-stone-600">Book an appointment online</p>
      <div className="mt-6 space-y-6">
        {booked ? (
          <Confirmation booking={booked} business={b} onAnother={() => { setBooked(undefined); setService(undefined) }} />
        ) : (
          <>
            <Card title="1. Choose a service">
              {b.services.length === 0 && <p className="text-stone-600">No services are available yet.</p>}
              <div className="grid gap-2">
                {b.services.map((s) => (
                  <button
                    key={s.id} onClick={() => setService(s)} aria-pressed={service?.id === s.id}
                    className={`flex justify-between rounded-xl border px-4 py-3 text-left transition ${service?.id === s.id ? 'border-teal-700 bg-teal-50 ring-2 ring-teal-700/20' : 'border-stone-200 hover:border-stone-400'}`}
                  >
                    <span className="font-medium">{s.name}<span className="ml-2 text-sm font-normal text-stone-600">{s.duration_min} min</span></span>
                    <span>{thb(s.price_thb)}</span>
                  </button>
                ))}
              </div>
            </Card>
            {service && <ChooseTime key={service.id} business={b} service={service} onBooked={setBooked} />}
          </>
        )}
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      {children}
      <p className="mt-10 text-center text-xs text-stone-500">Booking powered by NatBook</p>
    </div>
  )
}

function ChooseTime({ business, service, onBooked }: { business: Business; service: Service; onBooked: (b: Booking) => void }) {
  const queryClient = useQueryClient()
  const today = todayIn(business.timezone)
  const [date, setDate] = useState(today)
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

  return (
    <>
      <Card title="2. Pick a time">
        <Field
          label="Date" type="date" value={date} min={today} max={addDays(today, MAX_DAYS_AHEAD)}
          onChange={(e) => { setDate(e.target.value || today); setSlot(undefined) }}
        />
        <div className="mt-4">
          {slots.isPending && <p className="text-stone-600">Finding free times…</p>}
          <ErrorText error={slots.error} />
          {slots.data?.slots.length === 0 && <p className="text-stone-600">No free times on this day. Try another date.</p>}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.data?.slots.map((s) => (
              <button
                key={s} onClick={() => setSlot(s)} aria-pressed={slot === s}
                className={`rounded-lg border py-2 text-sm font-medium transition ${slot === s ? 'border-teal-700 bg-teal-700 text-white' : 'border-stone-300 bg-white hover:border-teal-700'}`}
              >
                {time(s, business.timezone)}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {slot && (
        <Card title="3. Your details">
          <p className="mb-4 rounded-lg bg-stone-100 px-3 py-2 text-sm">
            {service.name} · {dateTime(slot, business.timezone)} · {thb(service.price_thb)}
          </p>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Name" name="name" required maxLength={100} autoComplete="name" />
            <Field label="Email" name="email" type="email" required autoComplete="email" />
            <Field label="Phone (optional)" name="phone" type="tel" maxLength={30} autoComplete="tel" />
            <ErrorText error={book.error} />
            <Button type="submit" className="w-full" disabled={book.isPending}>Confirm booking</Button>
          </form>
        </Card>
      )}
    </>
  )
}

function Confirmation({ booking, business, onAnother }: { booking: Booking; business: Business; onAnother: () => void }) {
  return (
    <Card>
      <p className="text-2xl font-bold text-teal-800">You're booked!</p>
      <p className="mt-2">{booking.service_name} at {business.name}</p>
      <p className="font-medium">{dateTime(booking.starts_at, business.timezone)}</p>
      <p className="mt-2 text-sm text-stone-600">Booking #{booking.id} for {booking.customer_name}.</p>
      <Button variant="ghost" className="mt-4" onClick={onAnother}>Book another appointment</Button>
    </Card>
  )
}
