import { Link } from 'react-router'
import { Logo } from '../ui'

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="flex items-center justify-between">
        <Logo />
        <Link to="/login" className="text-sm font-medium text-teal-800 hover:underline">Log in</Link>
      </header>

      <main className="py-16 text-center sm:py-24">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Online booking for your small business</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-stone-600">
          Salons, tutors, massage shops and studios get their own booking page in minutes. Customers pick a free
          time slot, and double bookings are impossible.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/register" className="rounded-lg bg-teal-700 px-6 py-3 font-medium text-white hover:bg-teal-800">
            Create your booking page
          </Link>
          <Link to="/b/sunny-salon" className="rounded-lg border border-stone-300 bg-white px-6 py-3 font-medium hover:bg-stone-100">
            See a demo booking page
          </Link>
        </div>
      </main>
    </div>
  )
}
