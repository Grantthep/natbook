import { useQuery } from '@tanstack/react-query'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { Link, NavLink } from 'react-router'
import { api, type User } from './api'
import { categoryOf } from './categories'

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 text-lg font-bold text-stone-900">
      <img src="/favicon.svg" alt="" className="h-7 w-7" />
      NatBook
    </Link>
  )
}

const navLink = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap rounded-md px-2 py-2 sm:px-3 ${isActive ? 'text-emerald-800' : 'text-stone-600 hover:text-stone-900'}`

export function TopBar({ children }: { children?: ReactNode }) {
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<User>('/auth/me'), retry: false })
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <Logo />
        <nav className="flex items-center gap-1 text-sm font-medium">
          {children !== undefined ? children : (
            <>
              <NavLink to="/my-bookings" className={navLink}>My bookings</NavLink>
              <NavLink to={me.data ? '/dashboard' : '/login'} className={navLink}>
                {me.data ? 'My shop' : 'For shop owners'}
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

/** Initials on a tinted square: what real apps show for a shop without a photo. */
export function ShopAvatar({ name, category, size = 'md' }: { name: string; category: string; size?: 'md' | 'lg' }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  const box = size === 'lg' ? 'h-16 w-16 text-xl' : 'h-12 w-12 text-base'
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-lg font-semibold ${box} ${categoryOf(category).tint}`} aria-hidden>
      {initials}
    </div>
  )
}

export function Card({ title, children, action, className = '' }: { title?: ReactNode; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-stone-200 bg-white p-5 ${className}`}>
      {title && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const styles = {
    primary: 'bg-emerald-800 text-white hover:bg-emerald-900',
    ghost: 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-50',
    danger: 'text-red-700 hover:bg-red-50',
  }[variant]
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
      {...props}
    />
  )
}

const inputClass =
  'mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20'

export function Field({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block text-sm font-medium text-stone-700">
      {label}
      <input className={inputClass} {...props} />
    </label>
  )
}

export function TextArea({ label, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="block text-sm font-medium text-stone-700">
      {label}
      <textarea className={`${inputClass} min-h-20`} {...props} />
    </label>
  )
}

export function Select({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="block text-sm font-medium text-stone-700">
      {label}
      <select className={inputClass} {...props}>{children}</select>
    </label>
  )
}

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null
  return <p role="alert" className="text-sm text-red-700">{error instanceof Error ? error.message : String(error)}</p>
}
