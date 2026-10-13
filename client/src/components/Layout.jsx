import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Button } from './ui'

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const navClass = ({ isActive }) =>
    `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:text-slate-900'}`

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link to="/groups" className="text-lg font-bold text-brand-700">
              SplitWise <span className="text-slate-800">AI</span>
            </Link>
            <nav className="flex gap-1">
              <NavLink to="/groups" className={navClass}>
                Groups
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">{user?.name}</span>
            <Button variant="ghost" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
