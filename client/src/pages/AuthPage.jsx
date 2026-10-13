import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { errorMessage } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { Alert, Button, Card, Input } from '../components/ui'

// Shared login / register screen; `mode` decides which fields and action to use.
export default function AuthPage({ mode }) {
  const isRegister = mode === 'register'
  const { login, register } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (isRegister) await register(form)
      else await login({ email: form.email, password: form.password })
      navigate(location.state?.from?.pathname || '/groups', { replace: true })
    } catch (err) {
      const details = err.response?.data?.error?.details
      setError(details?.length ? details.map((d) => `${d.path}: ${d.message}`).join(' · ') : errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-bold text-brand-700">
          SplitWise <span className="text-slate-800">AI</span>
        </h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          {isRegister ? 'Create an account to start splitting.' : 'Welcome back! Log in to continue.'}
        </p>
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Alert>{error}</Alert>
            {isRegister && (
              <Input id="name" label="Name" value={form.name} onChange={update('name')} required minLength={2} />
            )}
            <Input id="email" label="Email" type="email" value={form.email} onChange={update('email')} required />
            <Input
              id="password"
              label="Password"
              type="password"
              value={form.password}
              onChange={update('password')}
              required
              minLength={isRegister ? 8 : undefined}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
            />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-slate-600">
          {isRegister ? 'Already have an account? ' : 'New here? '}
          <Link to={isRegister ? '/login' : '/register'} className="font-medium text-brand-600 hover:underline">
            {isRegister ? 'Log in' : 'Create an account'}
          </Link>
        </p>
      </div>
    </div>
  )
}
