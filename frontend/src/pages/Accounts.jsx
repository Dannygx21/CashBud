import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const CATEGORY_ORDER = ['Checking', 'Credit', 'Loan', 'Savings', 'Investments',]
const CATEGORY_CONFIG = {
  Checking: { label: 'Checking', color: 'bg-sage/10 text-sage-dark', dot: 'bg-sage', icon: '◈' },
  Savings: { label: 'Savings', color: 'bg-blue-50 text-blue-700', dot: 'bg-blue-400', icon: '⬡' },
  Investments: { label: 'Investments', color: 'bg-violet-50 text-violet-700', dot: 'bg-violet-400', icon: '◇' },
  Credit: { label: 'Credit Cards', color: 'bg-amber-50 text-amber-700', dot: 'bg-amber-budget', icon: '□' },
  Loan: { label: 'Loans', color: 'bg-coral/10 text-coral', dot: 'bg-coral', icon: '↯' },
}

function moneyClass(n, category) {
  if (category === 'Loan' || category === 'Credit') return n > 0 ? 'money-negative' : 'money-positive'
  return n >= 0 ? 'money-positive' : 'money-negative'
}

// ─── Net Worth Summary Card ──────────────────────────────────────────────────

function NetWorthCard({ summary }) {
  const items = [
    { label: 'Cash', value: summary.cash, positive: true },
    { label: 'Savings', value: summary.savings, positive: true },
    { label: 'Investments', value: summary.investments, positive: true },
    { label: 'Credit', value: -summary.credit, positive: false },
    { label: 'Loans', value: -summary.loans, positive: false },
  ]
  return (
    <div className="card p-7 fade-up fade-up-1">
      <p className="label mb-3">Net Worth</p>
      <p className={`font-display text-5xl italic tracking-tight mb-6 ${summary.total >= 0 ? 'text-ink-900' : 'text-coral'}`}>
        {fmt(summary.total)}
      </p>
      <div className="grid grid-cols-5 gap-3">
        {items.map(({ label, value, positive }) => (
          <div key={label} className="text-center">
            <p className="label mb-1">{label}</p>
            <p className={`font-mono text-sm font-medium ${positive ? 'text-sage-dark' : 'text-coral'}`}>
              {fmt(Math.abs(value))}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Inline Edit Balance ─────────────────────────────────────────────────────

function BalanceEdit({ account, onSave, onCancel }) {
  const [val, setVal] = useState(String(account.balance))
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const parsed = parseFloat(val)
    if (isNaN(parsed)) return
    setSaving(true)
    try {
      await onSave(account._id, parsed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-ink-400 font-mono text-sm">$</span>
      <input
        autoFocus
        type="number"
        step="0.01"
        className="w-32 rounded-lg border border-ink-300 bg-ink-50 px-2 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ink-900/10 focus:border-ink-400"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel() }}
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="text-xs px-2 py-1 rounded-lg bg-ink-900 text-white hover:bg-ink-700 transition-colors disabled:opacity-50"
      >
        {saving ? '…' : '✓'}
      </button>
      <button
        onClick={onCancel}
        className="text-xs px-2 py-1 rounded-lg text-ink-500 hover:bg-ink-100 transition-colors"
      >
        ✕
      </button>
    </div>
  )
}

// ─── Account Row ─────────────────────────────────────────────────────────────

function AccountRow({ account, onUpdateBalance, animDelay }) {
  const [editing, setEditing] = useState(false)
  const cfg = CATEGORY_CONFIG[account.category] || {}

  const handleSave = async (id, newBalance) => {
    await onUpdateBalance(id, newBalance)
    setEditing(false)
  }

  return (
    <div
      className={`fade-up flex items-center justify-between px-5 py-3.5 rounded-xl hover:bg-ink-50 group transition-colors`}
      style={{ animationDelay: `${animDelay}ms` }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-900 truncate">{account.displayName}</p>
          {account.notes ? (
            <p className="text-xs text-ink-400 truncate">{account.notes}</p>
          ) : (
            <p className="text-xs text-ink-300">{account.institution}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {editing ? (
          <BalanceEdit account={account} onSave={handleSave} onCancel={() => setEditing(false)} />
        ) : (
          <>
            <span className={`text-sm font-medium ${moneyClass(account.balance, account.category)}`}>
              {fmt(account.balance)}
            </span>
            <button
              onClick={() => setEditing(true)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-ink-400 hover:text-ink-600 px-2 py-1 rounded-lg hover:bg-ink-100"
            >
              edit
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Category Section ────────────────────────────────────────────────────────

function CategorySection({ category, accounts, onUpdateBalance, sectionIndex }) {
  const cfg = CATEGORY_CONFIG[category] || { label: category, color: '', dot: 'bg-ink-400', icon: '○' }
  const total = accounts.reduce((s, a) => s + a.balance, 0)

  return (
    <div className={`card fade-up`} style={{ animationDelay: `${sectionIndex * 80}ms` }}>
      {/* Section header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100">
        <div className="flex items-center gap-2.5">
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.color}`}>
            <span>{cfg.icon}</span>
            {cfg.label}
          </span>
          <span className="text-xs text-ink-400">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</span>
        </div>
        <span className={`text-sm font-mono font-medium ${moneyClass(total, category)}`}>
          {fmt(total)}
        </span>
      </div>

      {/* Rows */}
      <div className="px-2 py-2">
        {accounts.map((acct, i) => (
          <AccountRow
            key={acct._id}
            account={acct}
            onUpdateBalance={onUpdateBalance}
            animDelay={(sectionIndex * 80) + (i * 40)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Add Account Modal ───────────────────────────────────────────────────────

function AddAccountModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    institution: '', displayName: '', type: 'Debit',
    category: 'Checking', balance: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const { data } = await api.post('/accounts', {
        ...form,
        name: form.institution,
        balance: parseFloat(form.balance) || 0,
      })
      onCreated(data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create account')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-ink-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md p-7 fade-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl italic text-ink-900">New Account</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700 transition-colors text-lg">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label mb-1.5 block">Institution</label>
              <input className="input" placeholder="e.g. SoFi" value={form.institution} onChange={e => set('institution', e.target.value)} required />
            </div>
            <div>
              <label className="label mb-1.5 block">Display Name</label>
              <input className="input" placeholder="e.g. SoFi Checking" value={form.displayName} onChange={e => set('displayName', e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label mb-1.5 block">Type</label>
              <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
                <option>Debit</option>
                <option>Credit</option>
              </select>
            </div>
            <div>
              <label className="label mb-1.5 block">Category</label>
              <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORY_ORDER.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label mb-1.5 block">Current Balance</label>
            <input className="input" type="number" step="0.01" placeholder="0.00" value={form.balance} onChange={e => set('balance', e.target.value)} />
          </div>

          <div>
            <label className="label mb-1.5 block">Notes <span className="normal-case font-normal text-ink-400">(optional)</span></label>
            <input className="input" placeholder="e.g. Total: 1,015" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

          {error && <p className="text-sm text-coral bg-coral/10 rounded-lg px-4 py-2.5">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
              {saving ? 'Saving…' : 'Add Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Accounts() {
  const [accounts, setAccounts] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [acctRes, summRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/accounts/summary'),
      ])
      setAccounts(acctRes.data)
      setSummary(summRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleUpdateBalance = useCallback(async (id, newBalance) => {
    await api.put(`/accounts/${id}`, { balance: newBalance, lastUpdated: new Date() })
    setAccounts(prev => prev.map(a => a._id === id ? { ...a, balance: newBalance } : a))
    // Refresh summary
    const { data } = await api.get('/accounts/summary')
    setSummary(data)
  }, [])

  const handleCreated = useCallback((newAccount) => {
    setAccounts(prev => [...prev, newAccount])
    api.get('/accounts/summary').then(r => setSummary(r.data))
  }, [])

  // Group by category
  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const catAccounts = accounts.filter(a => a.category === cat)
    if (catAccounts.length) acc[cat] = catAccounts
    return acc
  }, {})

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <p className="font-display text-3xl italic text-ink-300 mb-2">Loading…</p>
          <p className="text-xs text-ink-400 font-mono">fetching accounts</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Page header */}
      <div className="flex items-end justify-between mb-8 fade-up">
        <div>
          <p className="label mb-1">Overview</p>
          <h1 className="font-display text-4xl italic text-ink-900">Accounts</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInactive(v => !v)}
            className={`btn-ghost text-xs ${showInactive ? 'bg-ink-100' : ''}`}
          >
            {showInactive ? 'Hide' : 'Show'} inactive
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            + Add Account
          </button>
        </div>
      </div>

      {/* Net worth summary */}
      {summary && <div className="mb-6"><NetWorthCard summary={summary} /></div>}

      {/* Category sections */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([cat, accts], i) => (
          <CategorySection
            key={cat}
            category={cat}
            accounts={accts}
            onUpdateBalance={handleUpdateBalance}
            sectionIndex={i + 1}
          />
        ))}
      </div>

      {/* Empty state */}
      {!loading && accounts.length === 0 && (
        <div className="text-center py-20">
          <p className="font-display text-3xl italic text-ink-300 mb-2">No accounts yet</p>
          <p className="text-sm text-ink-400 mb-6">Add your first account to get started</p>
          <button onClick={() => setShowModal(true)} className="btn-primary">+ Add Account</button>
        </div>
      )}

      {showModal && (
        <AddAccountModal onClose={() => setShowModal(false)} onCreated={handleCreated} />
      )}
    </div>
  )
}
