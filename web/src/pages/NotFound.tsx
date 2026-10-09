import { Link } from 'react-router'
import { TopBar } from '../ui'

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-5xl px-4 py-16">
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-stone-600">The link may be wrong, or the page was removed.</p>
        <Link to="/" className="mt-4 inline-block font-medium text-emerald-800 underline">Go to the home page</Link>
      </main>
    </div>
  )
}
