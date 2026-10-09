// Must match Category in api/app/schemas.py.
export const CATEGORIES = [
  { id: 'salon', label: 'Hair & barber', tint: 'bg-rose-100 text-rose-800' },
  { id: 'spa', label: 'Massage & spa', tint: 'bg-emerald-100 text-emerald-800' },
  { id: 'nails', label: 'Nails', tint: 'bg-pink-100 text-pink-800' },
  { id: 'clinic', label: 'Clinic', tint: 'bg-sky-100 text-sky-800' },
  { id: 'dental', label: 'Dental', tint: 'bg-indigo-100 text-indigo-800' },
  { id: 'fitness', label: 'Fitness', tint: 'bg-amber-100 text-amber-800' },
  { id: 'tutor', label: 'Tutoring', tint: 'bg-violet-100 text-violet-800' },
  { id: 'pet', label: 'Pet grooming', tint: 'bg-lime-100 text-lime-800' },
] as const

export const categoryOf = (id: string) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0]
