import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      return setError('Passwords do not match.')
    }
    setError('')
    setLoading(true)
    try {
      await register(form.name, form.email, form.password)
      navigate('/accounts')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="font-display text-5xl italic text-white tracking-tight mb-2">
            Budget Buddy
          </h1>
          <p className="text-ink-400 text-sm font-mono">create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-ink-800 rounded-2xl p-8 shadow-2xl border border-white/5">
          <h2 className="text-white font-medium mb-6 text-lg">Sign up</h2>

          <div className="space-y-4">
            <div>
              <label className="label text-ink-400 mb-1.5 block">Name</label>
              <input
                type="text"
                className="input bg-ink-700 border-ink-600 text-white placeholder-ink-500 focus:ring-white/10 focus:border-ink-400"
                placeholder="Your name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label text-ink-400 mb-1.5 block">Email</label>
              <input
                type="email"
                className="input bg-ink-700 border-ink-600 text-white placeholder-ink-500 focus:ring-white/10 focus:border-ink-400"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label text-ink-400 mb-1.5 block">Password</label>
              <input
                type="password"
                className="input bg-ink-700 border-ink-600 text-white placeholder-ink-500 focus:ring-white/10 focus:border-ink-400"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label text-ink-400 mb-1.5 block">Confirm Password</label>
              <input
                type="password"
                className="input bg-ink-700 border-ink-600 text-white placeholder-ink-500 focus:ring-white/10 focus:border-ink-400"
                placeholder="••••••••"
                value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                required
              />
            </div>
          </div>

          {error && (
            <p className="mt-4 text-sm text-coral-light bg-coral/10 rounded-lg px-4 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full bg-white text-ink-900 rounded-xl py-3 font-medium text-sm hover:bg-ink-100 active:scale-95 transition-all duration-150 disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Create account →'}
          </button>
        </form>

        <p className="text-center text-ink-500 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-ink-300 hover:text-white transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}