export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const thb = (amount: number) => `฿${amount.toLocaleString('en-US')}`

export const time = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

export const dateTime = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))

/** Today's date (YYYY-MM-DD) in the business's timezone, not the visitor's. */
export const todayIn = (timeZone: string) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date())

/** Hour of the day (0-23) of `iso` in `timeZone`. */
export const hourIn = (iso: string, timeZone: string) =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(new Date(iso)))

/** Weekday of a YYYY-MM-DD date, 0 = Monday (same as the API). */
export const weekdayOf = (ymd: string) => (new Date(`${ymd}T00:00:00Z`).getUTCDay() + 6) % 7

/** Labels for a YYYY-MM-DD date chip, e.g. { weekday: 'Mon', day: '12', month: 'Oct' }. */
export function dayParts(ymd: string) {
  const d = new Date(`${ymd}T00:00:00Z`)
  const part = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...o }).format(d)
  return { weekday: part({ weekday: 'short' }), day: part({ day: 'numeric' }), month: part({ month: 'short' }) }
}

export function addDays(ymd: string, days: number) {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
