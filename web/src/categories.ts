// Must match Category in api/app/schemas.py.
export const CATEGORIES = [
  { id: 'salon', label: 'Hair & barber', emoji: '💇', cover: 'from-rose-400 to-orange-300' },
  { id: 'spa', label: 'Massage & spa', emoji: '💆', cover: 'from-emerald-400 to-teal-300' },
  { id: 'nails', label: 'Nails', emoji: '💅', cover: 'from-pink-400 to-fuchsia-300' },
  { id: 'clinic', label: 'Clinic', emoji: '🩺', cover: 'from-sky-400 to-cyan-300' },
  { id: 'dental', label: 'Dental', emoji: '🦷', cover: 'from-blue-400 to-indigo-300' },
  { id: 'fitness', label: 'Fitness', emoji: '🏋️', cover: 'from-amber-400 to-yellow-300' },
  { id: 'tutor', label: 'Tutoring', emoji: '📚', cover: 'from-violet-400 to-purple-300' },
  { id: 'pet', label: 'Pet grooming', emoji: '🐶', cover: 'from-lime-400 to-green-300' },
] as const

export type CategoryId = (typeof CATEGORIES)[number]['id']

export const categoryOf = (id: string) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0]
