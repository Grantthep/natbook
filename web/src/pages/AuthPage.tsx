import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { api, type User } from '../api'
import { Button, Card, ErrorText, Field, TopBar } from '../ui'

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const submit = useMutation({
    mutationFn: (body: { email: string; password: string }) => api<User>(`/auth/${mode}`, { body }),
    onSuccess: () => {
      queryClient.clear()
      navigate('/dashboard')
    },
  })

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    submit.mutate({ email: String(form.get('email')), password: String(form.get('password')) })
  }

  const isLogin = mode === 'login'
  return (
    <div className="min-h-screen">
      <TopBar>{null}</TopBar>
      <div className="mx-auto max-w-sm px-4 py-12">
        <h1 className="text-2xl font-bold">{isLogin ? 'Shop owner login' : 'Add your shop to NatBook'}</h1>
        <p className="mb-6 mt-2 text-stone-600">
          {isLogin ? 'Manage your shop, opening hours and bookings.' : 'Create an account first, then add your services and opening hours. It only takes a few minutes.'}
        </p>
        <Card>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Email" name="email" type="email" autoComplete="email" required />
            <Field
              label="Password" name="password" type="password" minLength={8} required
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
            <ErrorText error={submit.error} />
            <Button type="submit" className="w-full" disabled={submit.isPending}>
              {isLogin ? 'Log in' : 'Create account'}
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-stone-600">
          {isLogin ? 'New here? ' : 'Already have an account? '}
          <Link to={isLogin ? '/register' : '/login'} className="font-medium text-emerald-800 underline">
            {isLogin ? 'Create an account' : 'Log in'}
          </Link>
        </p>
      </div>
    </div>
  )
}
