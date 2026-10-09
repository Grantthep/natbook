import { useQuery } from '@tanstack/react-query'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { Link } from 'react-router'
import { api, type User } from './api'
import { categoryOf } from './categories'

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-teal-800">
      <img src="/favicon.svg" alt="" className="h-8 w-8" />
      NatBook
    </Link>
  )
}

export function TopBar({ children }: { children?: ReactNode }) {
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<User>('/auth/me'), retry: false })
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <nav className="flex items-center gap-2 text-sm font-semibold">
          {children !== undefined ? children : (
            me.data ? (
              <Link to="/dashboard" className="rounded-full bg-teal-700 px-4 py-2 text-white hover:bg-teal-800">My shop</Link>
            ) : (
              <>
                <Link to="/register" className="hidden rounded-full px-3 py-2 text-stone-700 hover:bg-stone-100 sm:block">For businesses</Link>
                <Link to="/login" className="rounded-full border border-stone-300 px-4 py-2 hover:bg-stone-100">Log in</Link>
              </>
            )
          )}
        </nav>
      </div>
    </header>
  )
}

/** Colourful cover with the category's emoji, used instead of uploaded photos. */
export function ShopCover({ category, className = '' }: { category: string; className?: string }) {
  const c = categoryOf(category)
  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br ${c.cover} ${className}`}>
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/20" />
      <div className="absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-white/15" />
      <span className="relative text-5xl drop-shadow-sm" aria-hidden>{c.emoji}</span>
    </div>
  )
}

export function Card({ title, children, action, className = '' }: { title?: ReactNode; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl border border-stone-200/80 bg-white p-5 shadow-sm sm:p-6 ${className}`}>
      {title && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const styles = {
    primary: 'bg-teal-700 text-white shadow-sm hover:bg-teal-800',
    ghost: 'border border-stone-300 bg-white hover:bg-stone-100',
    danger: 'text-red-700 hover:bg-red-50',
  }[variant]
  return (
    <button
      className={`rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
      {...props}
    />
  )
}

const inputClass =
  'mt-1.5 block w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-base text-stone-900 focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-600/15'

export function Field({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block text-sm font-semibold text-stone-700">
      {label}
      <input className={inputClass} {...props} />
    </label>
  )
}

export function TextArea({ label, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="block text-sm font-semibold text-stone-700">
      {label}
      <textarea className={`${inputClass} min-h-20`} {...props} />
    </label>
  )
}

export function Select({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="block text-sm font-semibold text-stone-700">
      {label}
      <select className={inputClass} {...props}>{children}</select>
    </label>
  )
}

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null
  return <p role="alert" className="text-sm font-medium text-red-700">{error instanceof Error ? error.message : String(error)}</p>
}
