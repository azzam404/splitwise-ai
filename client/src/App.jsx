import { useEffect } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { GuestRoute, ProtectedRoute } from './components/ProtectedRoute'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import GroupsPage from './pages/GroupsPage'
import GroupDetailPage from './pages/GroupDetailPage'

function NotFound() {
  return (
    <div className="py-24 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <Link to="/" className="mt-4 inline-block text-brand-600 hover:underline">
        Go home
      </Link>
    </div>
  )
}

export default function App() {
  const loadSession = useAuthStore((s) => s.loadSession)

  useEffect(() => {
    loadSession()
  }, [loadSession])

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/groups/:id" element={<GroupDetailPage />} />
          </Route>
        </Route>
        <Route path="/" element={<Navigate to="/groups" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
