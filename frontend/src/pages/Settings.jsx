import { useState, useEffect } from 'react'
import api from '../api/client'

// ─── Constants ────────────────────────────────────────────────────────────────

const FREQUENCY_OPTIONS = [
  { value: 'biweekly',  label: 'Biweekly (every 2 weeks)' },
  { value: 'bimonthly', label: 'Bimonthly (1st & 15th)' },
  { value: 'weekly',    label: 'Weekly' },
  { value: 'monthly',   label: 'Monthly' },
]

const GROUPING_OPTIONS = [
  { value: 'monthly',   label: 'Monthly — one list for the whole month' },
  { value: 'payperiod', label: 'Pay Period — split by your paycheck dates' },
  { value: 'bimonthly', label: 'Bimonthly — 1st–14th and 15th–end' },
  { value: 'weekly',    label: 'Weekly — 7-day blocks' },
]

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateInput(val) {
  if (!val) return ''
  const d = new Date(val)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

// ─── Settings Page ────────────────────────────────────────────────────────────

export default function Settings() {
  const [form, setForm]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')

  // Password change fields (separate, optional)
  const [pwForm, setPwForm]   = useState({ password: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)

  useEffect(() => {
    api.get('/profile')
      .then(({ data }) => {
        setForm({
          name:                data.name || '',
          incomePerPaycheck:   String(data.incomePerPaycheck || ''),
          paycheckFrequency:   data.paycheckFrequency || 'biweekly',
          paycheckAnchorDate:  toDateInput(data.paycheckAnchorDate),
          transactionGrouping: data.transactionGrouping || 'monthly',
          color:               data.color || '#6366f1',
        })
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const payload = {
        ...form,
        incomePerPaycheck:  parseFloat(form.incomePerPaycheck) || 0,
        paycheckAnchorDate: form.paycheckAnchorDate || null,
      }
      await api.put('/profile', payload)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSave = async (e) => {
    e.preventDefault()
    setPwError('')
    setPwSaved(false)
    if (pwForm.password !== pwForm.confirm) {
      setPwError('Passwords do not match.')
      return
    }
    if (pwForm.password.length < 8) {
      setPwError('Password must be at least 8 characters.')
      return
    }
    try {
      await api.put('/profile', { password: pwForm.password })
      setPwForm({ password: '', confirm: '' })
      setPwSaved(true)
      setTimeout(() => setPwSaved(false), 3000)
    } catch (err) {
      setPwError(err.response?.data?.error || 'Failed to update password.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <p className="font-display text-3xl italic text-ink-300">Loading…</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="mb-8 fade-up">
        <p className="label mb-1">Account</p>
        <h1 className="font-display text-2xl sm:text-4xl italic text-ink-900">Settings</h1>
      </div>

      {/* Profile form */}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Profile ── */}
        <div className="card p-6 fade-up">
          <h2 className="font-medium text-ink-900 mb-4">Profile</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label mb-1.5 block">Name</label>
                <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>
              <div>
                <label className="label mb-1.5 block">Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="w-10 h-10 rounded-lg border border-ink-200 cursor-pointer p-0.5"
                    value={form.color}
                    onChange={e => set('color', e.target.value)}
                  />
                  <span className="text-sm font-mono text-ink-500">{form.color}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Income ── */}
        <div className="card p-6 fade-up">
          <h2 className="font-medium text-ink-900 mb-4">Income</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label mb-1.5 block">Income per Paycheck</label>
              <input
                type="number" step="0.01" min="0"
                className="input"
                placeholder="0.00"
                value={form.incomePerPaycheck}
                onChange={e => set('incomePerPaycheck', e.target.value)}
              />
              {form.incomePerPaycheck > 0 && (
                <p className="text-xs text-ink-400 mt-1">
                  ≈ {fmt(parseFloat(form.incomePerPaycheck) * 26 / 12)}/mo
                </p>
              )}
            </div>
            <div>
              <label className="label mb-1.5 block">Paycheck Frequency</label>
              <select className="input" value={form.paycheckFrequency} onChange={e => set('paycheckFrequency', e.target.value)}>
                {FREQUENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Transaction View ── */}
        <div className="card p-6 fade-up">
          <h2 className="font-medium text-ink-900 mb-1">Transaction View</h2>
          <p className="text-xs text-ink-400 mb-4">Choose how transactions are grouped on the Transactions page.</p>

          <div className="space-y-3">
            {GROUPING_OPTIONS.map(o => (
              <label key={o.value} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="transactionGrouping"
                  value={o.value}
                  checked={form.transactionGrouping === o.value}
                  onChange={() => set('transactionGrouping', o.value)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-ink-900">{o.label.split(' — ')[0]}</p>
                  <p className="text-xs text-ink-400">{o.label.split(' — ')[1]}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Anchor date — only relevant for payperiod grouping */}
          {form.transactionGrouping === 'payperiod' && (
            <div className="mt-4 pt-4 border-t border-ink-100">
              <label className="label mb-1.5 block">Pay Period Anchor Date</label>
              <p className="text-xs text-ink-400 mb-2">
                The start date of any known pay period. All other periods are calculated from this date.
              </p>
              <input
                type="date"
                className="input max-w-[200px]"
                value={form.paycheckAnchorDate}
                onChange={e => set('paycheckAnchorDate', e.target.value)}
              />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-coral bg-coral/10 rounded-lg px-4 py-2.5">{error}</p>}
        {saved  && <p className="text-sm text-sage-dark bg-sage/10 rounded-lg px-4 py-2.5">Settings saved.</p>}

        <button type="submit" disabled={saving} className="btn-primary w-full disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>

      {/* ── Password ── */}
      <div className="card p-6 mt-6 fade-up">
        <h2 className="font-medium text-ink-900 mb-4">Change Password</h2>
        <form onSubmit={handlePasswordSave} className="space-y-4">
          <div>
            <label className="label mb-1.5 block">New Password</label>
            <input
              type="password"
              className="input"
              placeholder="Min. 8 characters"
              value={pwForm.password}
              onChange={e => setPwForm(f => ({ ...f, password: e.target.value }))}
            />
          </div>
          <div>
            <label className="label mb-1.5 block">Confirm Password</label>
            <input
              type="password"
              className="input"
              placeholder="Re-enter password"
              value={pwForm.confirm}
              onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
            />
          </div>
          {pwError && <p className="text-sm text-coral bg-coral/10 rounded-lg px-4 py-2.5">{pwError}</p>}
          {pwSaved  && <p className="text-sm text-sage-dark bg-sage/10 rounded-lg px-4 py-2.5">Password updated.</p>}
          <button type="submit" className="btn-ghost w-full">Update Password</button>
        </form>
      </div>

    </div>
  )
}