import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { api, ApiError, type Booking, type Business, type Hours, type User } from '../api'
import { CATEGORIES, categoryOf } from '../categories'
import { WEEKDAYS, dateTime, thb } from '../format'
import { Button, Card, ErrorText, Field, Select, ShopCover, TextArea, TopBar } from '../ui'

const DAY_MS = 24 * 60 * 60 * 1000 // bookings made in the last day get a "New" badge

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
    <div className="min-h-screen">
      <TopBar>
        <span className="hidden text-stone-500 sm:inline">{me.data?.email}</span>
        <Button variant="ghost" onClick={logout}>Log out</Button>
      </TopBar>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {needsSetup && <CreateBusiness />}
        {(me.isPending || business.isPending) && !needsSetup && <div className="h-40 animate-pulse rounded-3xl bg-stone-200/70" />}
        <ErrorText error={!needsSetup && (me.error ?? business.error)} />

        {business.data && (
          <div className="grid gap-6">
            <ShareLink business={business.data} />
            <Bookings timezone={business.data.timezone} />
            <div className="grid gap-6 lg:grid-cols-2">
              <Services business={business.data} />
              <OpeningHours hours={business.data.hours} />
            </div>
            <ShopDetails business={business.data} />
          </div>
        )}
      </main>
    </div>
  )
}

type Details = { name: string; category: string; area: string; description: string }

/** Name, category, area and description inputs, shared by "create" and "edit". */
function DetailsFields({ value, onChange }: { value: Details; onChange: (d: Details) => void }) {
  return (
    <>
      <Field label="Shop name" value={value.name} required maxLength={100} placeholder="Sunny Salon"
        onChange={(e) => onChange({ ...value, name: e.target.value })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Category" value={value.category} onChange={(e) => onChange({ ...value, category: e.target.value })}>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
        </Select>
        <Field label="Area" value={value.area} maxLength={60} placeholder="Ari, Sukhumvit 24, Silom…"
          onChange={(e) => onChange({ ...value, area: e.target.value })} />
      </div>
      <TextArea label="Short description" value={value.description} maxLength={300} placeholder="What makes your place great?"
        onChange={(e) => onChange({ ...value, description: e.target.value })} />
    </>
  )
}

function ShopDetails({ business }: { business: Business }) {
  const save = useSaveBusiness()
  const [details, setDetails] = useState<Details>(business)
  const update = useMutation({
    mutationFn: () => api<Business>('/business', { method: 'PATCH', body: { ...details, timezone: business.timezone } }),
    onSuccess: save,
  })
  return (
    <Card title="Shop details">
      <form onSubmit={(e) => { e.preventDefault(); update.mutate() }} className="space-y-4">
        <DetailsFields value={details} onChange={setDetails} />
        <ErrorText error={update.error} />
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={update.isPending}>Save details</Button>
          {update.isSuccess && <span className="text-sm font-semibold text-teal-800">Saved</span>}
        </div>
      </form>
    </Card>
  )
}

function useSaveBusiness() {
  const queryClient = useQueryClient()
  return (business: Business) => queryClient.setQueryData(['business'], business)
}

function CreateBusiness() {
  const save = useSaveBusiness()
  const [details, setDetails] = useState<Details>({ name: '', category: 'salon', area: '', description: '' })
  const [slug, setSlug] = useState('')
  const create = useMutation({ mutationFn: () => api<Business>('/business', { body: { ...details, slug } }), onSuccess: save })

  return (
    <Card title="Set up your shop" className="mx-auto max-w-2xl">
      <form onSubmit={(e) => { e.preventDefault(); create.mutate() }} className="space-y-4">
        <DetailsFields
          value={details}
          onChange={(d) => {
            if (d.name !== details.name) setSlug(d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40))
            setDetails(d)
          }}
        />
        <Field
          label="Booking page link" value={slug} required pattern="[a-z0-9][a-z0-9-]{1,38}[a-z0-9]"
          title="3-40 lowercase letters, numbers and dashes" onChange={(e) => setSlug(e.target.value)}
        />
        <p className="text-sm text-stone-600">Customers will book at {location.origin}/b/{slug || 'your-link'}</p>
        <ErrorText error={create.error} />
        <Button type="submit" disabled={create.isPending}>Create my booking page</Button>
      </form>
    </Card>
  )
}

function ShareLink({ business }: { business: Business }) {
  const url = `${location.origin}/b/${business.slug}`
  const [copied, setCopied] = useState(false)
  return (
    <Card>
      <div className="flex items-center gap-4">
        <ShopCover category={business.category} className="h-16 w-16 shrink-0 rounded-2xl [&>span]:text-3xl" />
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{business.name}</h1>
          <p className="text-sm text-stone-500">{categoryOf(business.category).label}{business.area && ` · ${business.area}`}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-stone-600">Share your booking page with customers:</p>
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
  // Poll so new customer bookings show up without reloading. shortcut: polling, switch to WebSockets if it ever matters.
  const bookings = useQuery({ queryKey: ['bookings'], queryFn: () => api<Booking[]>('/business/bookings'), refetchInterval: 15_000 })
  const cancel = useMutation({
    mutationFn: (id: number) => api<Booking>(`/business/bookings/${id}/cancel`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  })
  const confirmed = bookings.data?.filter((b) => b.status === 'confirmed') ?? []

  return (
    <Card title="Upcoming bookings" action={<span className="text-xs text-stone-500">Updates automatically</span>}>
      {bookings.isPending && <p className="text-stone-600">Loading…</p>}
      <ErrorText error={bookings.error ?? cancel.error} />
      {bookings.isSuccess && confirmed.length === 0 && <p className="text-stone-600">No upcoming bookings yet.</p>}
      <ul className="divide-y divide-stone-200">
        {confirmed.map((b) => (
          <li key={b.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">
                {dateTime(b.starts_at, timezone)} · {b.service_name}
                {Date.now() - Date.parse(b.created_at) < DAY_MS && (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">New</span>
                )}
              </p>
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
