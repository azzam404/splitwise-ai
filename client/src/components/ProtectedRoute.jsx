import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Spinner } from './ui'

export function ProtectedRoute() {
  const { user, status } = useAuthStore()
  const location = useLocation()

  if (status !== 'ready') return <Spinner />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

export function GuestRoute() {
  const { user, status } = useAuthStore()

  if (status !== 'ready') return <Spinner />
  if (user) return <Navigate to="/groups" replace />
  return <Outlet />
}
