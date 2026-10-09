export type Service = { id: number; name: string; duration_min: number; price_thb: number }
export type Hours = { weekday: number; opens: string; closes: string }
export type ShopCard = { name: string; slug: string; category: string; area: string; description: string }
export type ShopListItem = ShopCard & { min_price: number; service_count: number }
export type Business = ShopCard & { timezone: string; services: Service[]; hours: Hours[] }
export type User = { id: number; email: string }
export type Booking = {
  id: number
  service_id: number
  service_name: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  starts_at: string
  ends_at: string
  status: 'confirmed' | 'cancelled'
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// FastAPI sends {detail: "message"} or, for validation errors, {detail: [{loc, msg}, ...]}.
function errorMessage(data: unknown): string {
  const detail = (data as { detail?: unknown })?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length) {
    const { loc, msg } = detail[0] as { loc: (string | number)[]; msg: string }
    return `${String(loc.at(-1)).replaceAll('_', ' ')}: ${msg}`
  }
  return 'Something went wrong. Please try again.'
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const hasBody = options.body !== undefined
  const res = await fetch(`/api${path}`, {
    method: options.method ?? (hasBody ? 'POST' : 'GET'),
    headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
    body: hasBody ? JSON.stringify(options.body) : undefined,
  })
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, errorMessage(data))
  return data as T
}
