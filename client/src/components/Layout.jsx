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
        {/* On phones the nav drops to its own row under the logo and log-out button. */}
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
          <Link to="/dashboard" className="order-1 shrink-0 text-lg font-bold text-brand-700">
            SplitWise <span className="text-slate-800">AI</span>
          </Link>
          <nav className="order-3 -mx-3 flex w-full flex-wrap gap-1 sm:order-2 sm:mx-0 sm:w-auto sm:flex-1">
            <NavLink to="/dashboard" className={navClass}>
              Dashboard
            </NavLink>
            <NavLink to="/groups" className={navClass}>
              Groups
            </NavLink>
            <NavLink to="/budgets" className={navClass}>
              Budgets
            </NavLink>
          </nav>
          <div className="order-2 flex items-center gap-3 sm:order-3">
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
