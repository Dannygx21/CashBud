import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ['Loan', 'Grocery', 'Savings', 'Health Care', 'Want', 'Car Insurance', 'Investments', 'Membership']
const FREQUENCIES = ['Monthly', 'Yearly']
const PAYERS      = ['Daniel', 'Chloe', 'Taken Out of Paycheck', 'Paused', 'Split']

const CATEGORY_CONFIG = {
  Loan:             { color: 'bg-coral/10 text-coral',          dot: 'bg-coral'        },
  Grocery:          { color: 'bg-green-50 text-green-700',       dot: 'bg-green-400'    },
  Savings:          { color: 'bg-blue-50 text-blue-700',         dot: 'bg-blue-400'     },
  'Health Care':    { color: 'bg-pink-50 text-pink-700',         dot: 'bg-pink-400'     },
  Want:             { color: 'bg-violet-50 text-violet-700',     dot: 'bg-violet-400'   },
  'Car Insurance':  { color: 'bg-amber-50 text-amber-700',       dot: 'bg-amber-400'    },
  Investments:      { color: 'bg-indigo-50 text-indigo-700',     dot: 'bg-indigo-400'   },
  Membership:       { color: 'bg-orange-50 text-orange-700',     dot: 'bg-orange-400'   },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const toMonthly = (amount, frequency) =>
  frequency === 'Yearly' ? amount / 12 : amount

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '', amount: '', category: 'Want', frequency: 'Monthly',
  notes: '', personPaying: 'Daniel', paused: false,
}

function ExpenseModal({ expense, onClose, onSaved }) {
  const isEdit = !!expense
  const [form, setForm] = useState(
    isEdit
      ? { ...expense, amount: String(expense.amount) }
      : EMPTY_FORM
  )
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = { ...form, amount: parseFloat(form.amount) }
      const { data } = isEdit
        ? await api.put(`/expenses/${expense._id}`, payload)
        : await api.post('/expenses', payload)
      onSaved(data, isEdit)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save expense.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-ink-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md p-7 fade-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl italic text-ink-900">
            {isEdit ? 'Edit Expense' : 'New Expense'}
          </h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700 transition-colors text-lg">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label mb-1.5 block">Name</label>
            <input className="input" placeholder="e.g. Netflix" value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label mb-1.5 block">Amount</label>
              <input type="number" step="0.01" min="0" className="input" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} required />
            </div>
            <div>
              <label className="label mb-1.5 block">Frequency</label>
              <select className="input" value={form.frequency} onChange={e => set('frequency', e.target.value)}>
                {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label mb-1.5 block">Category</label>
              <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label mb-1.5 block">Person Paying</label>
              <select className="input" value={form.personPaying} onChange={e => set('personPaying', e.target.value)}>
                {PAYERS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label mb-1.5 block">Notes <span className="normal-case font-normal text-ink-400">(optional)</span></label>
            <input className="input" placeholder="Any notes…" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" className="rounded" checked={form.paused} onChange={e => set('paused', e.target.checked)} />
            <span className="text-sm text-ink-600">Paused</span>
          </label>

          {error && <p className="text-sm text-coral bg-coral/10 rounded-lg px-4 py-2.5">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Expense Row ──────────────────────────────────────────────────────────────

function ExpenseRow({ expense, onEdit, animDelay }) {
  const cfg = CATEGORY_CONFIG[expense.category] || { color: 'bg-ink-100 text-ink-500', dot: 'bg-ink-400' }
  const monthly = toMonthly(expense.amount, expense.frequency)

  return (
    <div
      className={`fade-up px-5 py-3.5 rounded-xl group transition-colors ${expense.paused ? 'opacity-40' : 'hover:bg-ink-50'}`}
      style={{ animationDelay: `${animDelay}ms` }}
    >
      {/* Mobile: stacked layout */}
      <div className="flex items-start justify-between gap-2 sm:hidden">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${cfg.dot}`} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-900">
              {expense.name}
              {expense.paused && <span className="ml-2 text-xs text-ink-400 font-normal">(paused)</span>}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-ink-100 text-ink-500">
                {expense.frequency}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                {expense.category}
              </span>
            </div>
            <p className="text-xs text-ink-400 mt-0.5">{expense.personPaying}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p className="text-sm font-mono font-medium text-ink-900">{fmt(expense.amount)}</p>
            {expense.frequency === 'Yearly' && (
              <p className="text-xs font-mono text-ink-400">{fmt(monthly)}/mo</p>
            )}
          </div>
          <button onClick={() => onEdit(expense)} className="text-xs text-ink-400 hover:text-ink-600 px-2 py-1 rounded-lg hover:bg-ink-100">
            edit
          </button>
        </div>
      </div>

      {/* Desktop: original single-row layout */}
      <div className="hidden sm:flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-900 truncate">
              {expense.name}
              {expense.paused && <span className="ml-2 text-xs text-ink-400 font-normal">(paused)</span>}
            </p>
            <p className="text-xs text-ink-400 truncate">{expense.personPaying}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-ink-100 text-ink-500">
            {expense.frequency}
          </span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
            {expense.category}
          </span>
          <div className="text-right">
            <p className="text-sm font-mono font-medium text-ink-900">{fmt(expense.amount)}</p>
            {expense.frequency === 'Yearly' && (
              <p className="text-xs font-mono text-ink-400">{fmt(monthly)}/mo</p>
            )}
          </div>
          <button
            onClick={() => onEdit(expense)}
            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-xs text-ink-400 hover:text-ink-600 px-2 py-1 rounded-lg hover:bg-ink-100"
          >
            edit
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Category Section ─────────────────────────────────────────────────────────

function CategorySection({ category, expenses, onEdit, sectionIndex }) {
  const cfg = CATEGORY_CONFIG[category] || { color: 'bg-ink-100 text-ink-500' }
  const monthlyTotal = expenses.reduce((s, e) => s + toMonthly(e.amount, e.frequency), 0)

  return (
    <div className="card fade-up" style={{ animationDelay: `${sectionIndex * 60}ms` }}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.color}`}>
          {category}
        </span>
        <span className="text-sm font-mono font-medium text-ink-900">{fmt(monthlyTotal)}<span className="text-ink-400 text-xs">/mo</span></span>
      </div>
      <div className="px-2 py-2">
        {expenses.map((e, i) => (
          <ExpenseRow
            key={e._id}
            expense={e}
            onEdit={onEdit}
            animDelay={(sectionIndex * 60) + (i * 30)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Expenses() {
  const [expenses, setExpenses]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [showInactive, setShowInactive] = useState(false)
  const [modal, setModal]           = useState(null) // null | 'add' | expense object

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = showInactive ? '?includeInactive=true' : ''
      const { data } = await api.get(`/expenses${params}`)
      setExpenses(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [showInactive])

  useEffect(() => { load() }, [load])

  const handleSaved = useCallback((saved, isEdit) => {
    setExpenses(prev =>
      isEdit
        ? prev.map(e => e._id === saved._id ? saved : e)
        : [...prev, saved]
    )
  }, [])

  // Summaries
  const activeExpenses  = expenses.filter(e => !e.paused)
  const monthlyTotal    = activeExpenses.reduce((s, e) => s + toMonthly(e.amount, e.frequency), 0)
  const danielTotal     = activeExpenses.filter(e => e.personPaying === 'Daniel').reduce((s, e) => s + toMonthly(e.amount, e.frequency), 0)
  const chloeTotal      = activeExpenses.filter(e => e.personPaying === 'Chloe').reduce((s, e) => s + toMonthly(e.amount, e.frequency), 0)

  // Group by category in model order
  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = expenses.filter(e => e.category === cat)
    if (items.length) acc[cat] = items
    return acc
  }, {})

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <p className="font-display text-3xl italic text-ink-300 mb-2">Loading…</p>
          <p className="text-xs text-ink-400 font-mono">fetching expenses</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="flex items-end justify-between mb-8 fade-up">
        <div>
          <p className="label mb-1">Monthly</p>
          <h1 className="font-display text-2xl sm:text-4xl italic text-ink-900">Expenses</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInactive(v => !v)}
            className={`btn-ghost text-xs ${showInactive ? 'bg-ink-100' : ''}`}
          >
            {showInactive ? 'Hide' : 'Show'} inactive
          </button>
          <button onClick={() => setModal('add')} className="btn-primary">+ Add Expense</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 fade-up fade-up-1">
        {[
          { label: 'Total / Month', value: monthlyTotal },
          { label: 'Daniel',        value: danielTotal  },
          { label: 'Chloe',         value: chloeTotal   },
        ].map(({ label, value }) => (
          <div key={label} className="card p-5">
            <p className="label mb-2">{label}</p>
            <p className="font-display text-2xl sm:text-3xl italic tracking-tight text-ink-900">{fmt(value)}</p>
            <p className="text-xs text-ink-400 font-mono mt-1">per month</p>
          </div>
        ))}
      </div>

      {/* Category sections */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([cat, items], i) => (
          <CategorySection
            key={cat}
            category={cat}
            expenses={items}
            onEdit={setModal}
            sectionIndex={i + 1}
          />
        ))}
      </div>

      {/* Empty state */}
      {!loading && expenses.length === 0 && (
        <div className="text-center py-20">
          <p className="font-display text-3xl italic text-ink-300 mb-2">No expenses yet</p>
          <p className="text-sm text-ink-400 mb-6">Add your recurring expenses to get started</p>
          <button onClick={() => setModal('add')} className="btn-primary">+ Add Expense</button>
        </div>
      )}

      {modal && (
        <ExpenseModal
          expense={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
