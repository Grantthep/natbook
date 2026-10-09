// Customers have no accounts, so the private link to each booking (id + token) is kept in
// this browser. Storage can be blocked (private mode), so every access is wrapped.
export type SavedBooking = { id: number; token: string }

const KEY = 'natbook.bookings'

export function loadSaved(): SavedBooking[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export function saveBooking(booking: SavedBooking) {
  const others = loadSaved().filter((b) => b.id !== booking.id)
  try {
    localStorage.setItem(KEY, JSON.stringify([booking, ...others].slice(0, 50)))
  } catch {
    // Not fatal: the customer still has the link on the confirmation screen.
  }
}

export const manageLink = ({ id, token }: SavedBooking) => `/booking/${id}?token=${encodeURIComponent(token)}`
