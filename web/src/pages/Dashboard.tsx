import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { api, ApiError, type Booking, type Business, type Hours, type User } from '../api'
import { WEEKDAYS, dateTime, thb } from '../format'
import { Button, Card, ErrorText, Field, Logo } from '../ui'

export default function Dashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<User>('/auth/me') })
  const business = useQuery({ queryKey: ['business'], queryFn: () => api<Business>('/business'), enabled: me.isSuccess })

  async function logout() {
    await api('/auth/logout', { method: 'POST' })
    queryClient.clear()
    navigate('/')
  }

  if (me.error instanceof ApiError && me.error.status === 401) return <Navigate to="/login" replace />
  const needsSetup = business.error instanceof ApiError && business.error.status === 404

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <Logo />
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-stone-600 sm:inline">{me.data?.email}</span>
          <Button variant="ghost" onClick={logout}>Log out</Button>
        </div>
      </header>

      {needsSetup && <CreateBusiness />}
      {(me.isPending || business.isPending) && !needsSetup && <p className="text-stone-600">Loading…</p>}
      <ErrorText error={!needsSetup && (me.error ?? business.error)} />

      {business.data && (
        <div className="grid gap-6">
          <ShareLink business={business.data} />
          <Bookings timezone={business.data.timezone} />
          <div className="grid gap-6 lg:grid-cols-2">
            <Services business={business.data} />
            <OpeningHours hours={business.data.hours} />
          </div>
        </div>
      )}
    </div>
  )
}

function useSaveBusiness() {
  const queryClient = useQueryClient()
  return (business: Business) => queryClient.setQueryData(['business'], business)
}

function CreateBusiness() {
  const save = useSaveBusiness()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const create = useMutation({ mutationFn: () => api<Business>('/business', { body: { name, slug } }), onSuccess: save })

  return (
    <Card title="Set up your business">
      <form onSubmit={(e) => { e.preventDefault(); create.mutate() }} className="space-y-4">
        <Field
          label="Business name" value={name} required maxLength={100} placeholder="Sunny Salon"
          onChange={(e) => {
            setName(e.target.value)
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40))
          }}
        />
        <Field
          label="Booking page link" value={slug} required pattern="[a-z0-9][a-z0-9-]{1,38}[a-z0-9]"
          title="3-40 lowercase letters, numbers and dashes" onChange={(e) => setSlug(e.target.value)}
        />
        <p className="text-sm text-stone-600">Customers will book at {location.origin}/b/{slug || 'your-link'}</p>
        <ErrorText error={create.error} />
        <Button type="submit" disabled={create.isPending}>Create business</Button>
      </form>
    </Card>
  )
}

function ShareLink({ business }: { business: Business }) {
  const url = `${location.origin}/b/${business.slug}`
  const [copied, setCopied] = useState(false)
  return (
    <Card>
      <h1 className="text-2xl font-bold">{business.name}</h1>
      <p className="mt-1 text-sm text-stone-600">Share this link with your customers:</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <a href={url} target="_blank" rel="noreferrer" className="flex-1 truncate rounded-lg bg-stone-100 px-3 py-2 text-teal-800 hover:underline">{url}</a>
        <Button variant="ghost" onClick={() => navigator.clipboard.writeText(url).then(() => setCopied(true))}>
          {copied ? 'Copied' : 'Copy link'}
        </Button>
      </div>
      {(business.services.length === 0 || business.hours.length === 0) && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Add at least one service and your opening hours so customers can book.
        </p>
      )}
    </Card>
  )
}

function Bookings({ timezone }: { timezone: string }) {
  const queryClient = useQueryClient()
  const bookings = useQuery({ queryKey: ['bookings'], queryFn: () => api<Booking[]>('/business/bookings') })
  const cancel = useMutation({
    mutationFn: (id: number) => api<Booking>(`/business/bookings/${id}/cancel`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  })
  const confirmed = bookings.data?.filter((b) => b.status === 'confirmed') ?? []

  return (
    <Card title="Upcoming bookings">
      {bookings.isPending && <p className="text-stone-600">Loading…</p>}
      <ErrorText error={bookings.error ?? cancel.error} />
      {bookings.isSuccess && confirmed.length === 0 && <p className="text-stone-600">No upcoming bookings yet.</p>}
      <ul className="divide-y divide-stone-200">
        {confirmed.map((b) => (
          <li key={b.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{dateTime(b.starts_at, timezone)} · {b.service_name}</p>
              <p className="text-sm text-stone-600">
                {b.customer_name} · {b.customer_email}{b.customer_phone && ` · ${b.customer_phone}`}
              </p>
            </div>
            <Button
              variant="danger" disabled={cancel.isPending}
              onClick={() => confirm(`Cancel ${b.customer_name}'s booking?`) && cancel.mutate(b.id)}
            >
              Cancel
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function Services({ business }: { business: Business }) {
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['business'] })
  const add = useMutation({
    mutationFn: (body: { name: string; duration_min: number; price_thb: number }) => api('/business/services', { body }),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: (id: number) => api(`/business/services/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  })

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    const form = new FormData(formEl)
    add.mutate(
      { name: String(form.get('name')), duration_min: Number(form.get('duration')), price_thb: Number(form.get('price')) },
      { onSuccess: () => formEl.reset() },
    )
  }

  return (
    <Card title="Services">
      <ul className="mb-4 divide-y divide-stone-200">
        {business.services.map((s) => (
          <li key={s.id} className="flex items-center justify-between py-2">
            <span>{s.name} <span className="text-sm text-stone-600">· {s.duration_min} min · {thb(s.price_thb)}</span></span>
            <Button variant="danger" onClick={() => remove.mutate(s.id)} disabled={remove.isPending}>Remove</Button>
          </li>
        ))}
      </ul>
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <Field label="Service" name="name" required maxLength={100} placeholder="Haircut" />
        <Field label="Minutes" name="duration" type="number" min={5} max={480} step={5} required defaultValue={60} />
        <Field label="Price (฿)" name="price" type="number" min={0} required defaultValue={500} />
        <div className="sm:col-span-3">
          <ErrorText error={add.error ?? remove.error} />
          <Button type="submit" disabled={add.isPending}>Add service</Button>
        </div>
      </form>
    </Card>
  )
}

function OpeningHours({ hours }: { hours: Hours[] }) {
  const save = useSaveBusiness()
  const [days, setDays] = useState(() =>
    WEEKDAYS.map((_, weekday) => {
      const h = hours.find((x) => x.weekday === weekday)
      return { open: !!h, opens: h?.opens.slice(0, 5) ?? '09:00', closes: h?.closes.slice(0, 5) ?? '18:00' }
    }),
  )
  const update = useMutation({
    mutationFn: () =>
      api<Business>('/business/hours', {
        method: 'PUT',
        body: days.flatMap((d, weekday) => (d.open ? [{ weekday, opens: d.opens, closes: d.closes }] : [])),
      }),
    onSuccess: save,
  })
  const setDay = (i: number, patch: Partial<(typeof days)[number]>) =>
    setDays(days.map((d, j) => (i === j ? { ...d, ...patch } : d)))

  return (
    <Card title="Opening hours">
      <div className="space-y-2">
        {days.map((d, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <label className="flex w-32 items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={d.open} onChange={(e) => setDay(i, { open: e.target.checked })} className="h-4 w-4 accent-teal-700" />
              {WEEKDAYS[i]}
            </label>
            {d.open ? (
              <>
                <input type="time" aria-label={`${WEEKDAYS[i]} opens`} value={d.opens} onChange={(e) => setDay(i, { opens: e.target.value })} className="rounded-lg border border-stone-300 px-2 py-1" />
                <span className="text-stone-500">to</span>
                <input type="time" aria-label={`${WEEKDAYS[i]} closes`} value={d.closes} onChange={(e) => setDay(i, { closes: e.target.value })} className="rounded-lg border border-stone-300 px-2 py-1" />
              </>
            ) : (
              <span className="text-sm text-stone-500">Closed</span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button onClick={() => update.mutate()} disabled={update.isPending}>Save hours</Button>
        {update.isSuccess && <span className="text-sm text-teal-800">Saved</span>}
      </div>
      <ErrorText error={update.error} />
    </Card>
  )
}
