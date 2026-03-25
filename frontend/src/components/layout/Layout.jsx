import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAV = [
  { to: '/accounts',     label: 'Accounts',     icon: '⬡' },
  { to: '/dashboard',    label: 'Dashboard',    icon: '◈' },
  { to: '/transactions', label: 'Transactions', icon: '⇄' },
  { to: '/expenses',     label: 'Expenses',     icon: '◻' },
  { to: '/settings',     label: 'Settings',     icon: '⚙' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex min-h-screen bg-ink-50">

      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-ink-900 text-white">
        <div className="px-6 pt-8 pb-6 border-b border-white/10">
          <span className="font-display text-2xl italic text-white tracking-tight">Budget Buddy</span>
          <p className="mt-1 text-xs text-ink-300 font-mono">household · 2026</p>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-0.5">
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ` +
                (isActive ? 'bg-white/10 text-white' : 'text-ink-300 hover:bg-white/5 hover:text-white')
              }
            >
              <span className="text-base opacity-70">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

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

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-5 py-4 bg-ink-900 text-white shrink-0">
          <span className="font-display text-xl italic tracking-tight">Budget Buddy</span>
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: user?.color || '#6366f1' }}
            >
              {user?.name?.[0]}
            </div>
            <button onClick={handleLogout} className="text-xs text-ink-400 hover:text-ink-200 transition-colors">
              Sign out
            </button>
          </div>
        </header>

        {/* Extra bottom padding on mobile for the fixed tab bar */}
        <main className="flex-1 overflow-auto pb-24 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Bottom tab bar — mobile only */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-ink-900 border-t border-white/10 flex z-40">
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ` +
              (isActive ? 'text-white' : 'text-ink-500')
            }
          >
            <span className="text-lg leading-none">{icon}</span>
            <span className="text-[10px] leading-tight font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
