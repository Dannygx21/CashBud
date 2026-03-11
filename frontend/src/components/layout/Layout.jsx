import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAV = [
  { to: '/accounts',     label: 'Accounts',     icon: '⬡' },
  { to: '/dashboard',    label: 'Dashboard',    icon: '◈' },
  { to: '/transactions', label: 'Transactions', icon: '⇄' },
  { to: '/expenses',     label: 'Expenses',     icon: '◻' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex min-h-screen bg-ink-50">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col bg-ink-900 text-white">
        {/* Logo */}
        <div className="px-6 pt-8 pb-6 border-b border-white/10">
          <span className="font-display text-2xl italic text-white tracking-tight">Budget Buddy</span>
          <p className="mt-1 text-xs text-ink-300 font-mono">household · 2026</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-0.5">
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ` +
                (isActive
                  ? 'bg-white/10 text-white'
                  : 'text-ink-300 hover:bg-white/5 hover:text-white')
              }
            >
              <span className="text-base opacity-70">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 pb-6 pt-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: user?.color || '#6366f1' }}
            >
              {user?.name?.[0]}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{user?.name}</p>
              <p className="text-xs text-ink-400">{user?.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full text-left text-xs text-ink-500 hover:text-ink-300 transition-colors px-1">
            Sign out →
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
