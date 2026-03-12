import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Income', 'Food', 'Wants', 'Grocery', 'Gas',
  'Subscription', 'Entertainment', 'Membership', 'Needs',
  'Bill/Loan/Credit', 'Investment', 'Savings', 'Balance', 'Transaction',
]

const CATEGORY_COLORS = {
  Income:            'bg-sage/10 text-sage-dark',
  Food:              'bg-amber-50 text-amber-700',
  Wants:             'bg-violet-50 text-violet-700',
  Grocery:           'bg-green-50 text-green-700',
  Gas:               'bg-blue-50 text-blue-700',
  Subscription:      'bg-indigo-50 text-indigo-700',
  Entertainment:     'bg-pink-50 text-pink-700',
  Membership:        'bg-orange-50 text-orange-700',
  Needs:             'bg-ink-100 text-ink-600',
  'Bill/Loan/Credit':'bg-coral/10 text-coral',
  Investment:        'bg-violet-50 text-violet-700',
  Savings:           'bg-blue-50 text-blue-700',
  Balance:           'bg-ink-100 text-ink-400',
  Transaction:       'bg-ink-100 text-ink-400',
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

function currentYearMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// ─── Add Transaction Modal ────────────────────────────────────────────────────

// Auto-suggest the "to" category based on account category
const TO_CATEGORY = {
  Loan:        'Bill/Loan/Credit',
  Credit:      'Transaction',
  Savings:     'Savings',
  Checking:    'Balance',
  Investments: 'Investment',
}

function AccountSelect({ accounts, value, onChange, required }) {
  return (
    <select className="input" value={value} onChange={onChange} required={required}>
      <option value="">Select account…</option>
      {accounts.map(a => (
        <option key={a._id} value={a._id}>{a.displayName} ({a.type})</option>
      ))}
    </select>
  )
}

function AddTransactionModal({ onClose, onCreated, selectedMonth }) {
  const [year, mon] = selectedMonth.split('-')
  const [mode, setMode] = useState('single') // 'single' | 'paired'

  // Shared fields
  const [date, setDate]           = useState(`${year}-${mon}-01`)
  const [amount, setAmount]       = useState('')
  const [description, setDesc]    = useState('')

  // Single-mode fields
  const [single, setSingle] = useState({
    accountId: '', account: '', accountType: 'Debit',
    category: 'Food', crDr: 'Credit',
  })

  // Paired-mode fields
  const [from, setFrom] = useState({ accountId: '', account: '', accountType: '' })
  const [to, setTo]     = useState({ accountId: '', account: '', accountType: '', category: 'Bill/Loan/Credit' })

  const [accounts, setAccounts] = useState([])
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    api.get('/accounts').then(({ data }) => setAccounts(data)).catch(() => {})
  }, [])

  const handleSingleAccount = (e) => {
    const a = accounts.find(x => x._id === e.target.value)
    if (!a) return
    setSingle(s => ({ ...s, accountId: a._id, account: a.displayName, accountType: a.type }))
  }

  const handleFromAccount = (e) => {
    const a = accounts.find(x => x._id === e.target.value)
    if (!a) return
    setFrom({ accountId: a._id, account: a.displayName, accountType: a.type })
  }

  const handleToAccount = (e) => {
    const a = accounts.find(x => x._id === e.target.value)
    if (!a) return
    setTo(t => ({
      ...t,
      accountId:   a._id,
      account:     a.displayName,
      accountType: a.type,
      category:    TO_CATEGORY[a.category] || 'Bill/Loan/Credit',
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const amt = parseFloat(amount)

      if (mode === 'paired') {
        const { data } = await api.post('/transactions', {
          date,
          paired: {
            primary:   { ...to,   description, crDr: 'Debit',  amount: amt },
            secondary: { ...from, description, crDr: 'Credit', amount: amt, category: 'Balance' },
          },
        })
        onCreated(data)
      } else {
        const { data } = await api.post('/transactions', { ...single, date, description, amount: amt })
        onCreated(data)
      }

      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create transaction.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-ink-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md p-7 fade-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-2xl italic text-ink-900">New Transaction</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700 transition-colors text-lg">✕</button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 p-1 bg-ink-100 rounded-lg mb-5">
          {['single', 'paired'].map(m => (
            <button
              key={m} type="button"
              onClick={() => setMode(m)}
              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${mode === m ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-600'}`}
            >
              {m === 'single' ? 'Single Entry' : 'Payment / Transfer'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Shared: date + amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label mb-1.5 block">Date</label>
              <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="label mb-1.5 block">Amount</label>
              <input type="number" step="0.01" min="0" className="input" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required />
            </div>
          </div>

          {mode === 'paired' ? (
            <>
              {/* From account (source — money leaves) */}
              <div>
                <label className="label mb-1.5 block">
                  From <span className="normal-case font-normal text-ink-400">— money leaves this account</span>
                </label>
                <AccountSelect accounts={accounts} value={from.accountId} onChange={handleFromAccount} required />
              </div>

              {/* To account (destination — debt paid or balance received) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label mb-1.5 block">
                    To <span className="normal-case font-normal text-ink-400">— paid / received</span>
                  </label>
                  <AccountSelect accounts={accounts} value={to.accountId} onChange={handleToAccount} required />
                </div>
                <div>
                  <label className="label mb-1.5 block">Category</label>
                  <select className="input" value={to.category} onChange={e => setTo(t => ({ ...t, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Single account */}
              <div>
                <label className="label mb-1.5 block">Account</label>
                <AccountSelect accounts={accounts} value={single.accountId} onChange={handleSingleAccount} required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label mb-1.5 block">Category</label>
                  <select className="input" value={single.category} onChange={e => setSingle(s => ({ ...s, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label mb-1.5 block">CR / DR</label>
                  <select className="input" value={single.crDr} onChange={e => setSingle(s => ({ ...s, crDr: e.target.value }))}>
                    <option>Credit</option>
                    <option>Debit</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Shared: description */}
          <div>
            <label className="label mb-1.5 block">Description</label>
            <input
              className="input"
              placeholder={mode === 'paired' ? 'e.g. Student Loan Payment' : 'e.g. Chipotle'}
              value={description}
              onChange={e => setDesc(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-coral bg-coral/10 rounded-lg px-4 py-2.5">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
              {saving ? 'Saving…' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TransactionRow({ txn, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const isIncome = txn.crDr === 'Debit'

  return (
    <div className="flex items-center justify-between px-5 py-3.5 rounded-xl hover:bg-ink-50 group transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0 text-center w-10">
          <p className="text-xs font-mono text-ink-400">{fmtDate(txn.date)}</p>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-900 truncate">{txn.description}</p>
          <p className="text-xs text-ink-400 truncate">{txn.account}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[txn.category] || 'bg-ink-100 text-ink-500'}`}>
          {txn.category}
        </span>
        <span className={`text-sm font-mono font-medium w-24 text-right ${isIncome ? 'text-sage-dark' : 'text-coral'}`}>
          {isIncome ? '+' : '-'}{fmt(txn.amount)}
        </span>
        {confirming ? (
          <div className="flex gap-1">
            <button onClick={() => onDelete(txn._id)} className="text-xs px-2 py-1 rounded-lg bg-coral text-white hover:bg-coral/80 transition-colors">Delete</button>
            <button onClick={() => setConfirming(false)} className="text-xs px-2 py-1 rounded-lg text-ink-500 hover:bg-ink-100 transition-colors">Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-ink-400 hover:text-coral px-2 py-1 rounded-lg hover:bg-ink-100"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Transactions() {
  const [month, setMonth]             = useState(currentYearMonth)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]         = useState(true)
  const [showModal, setShowModal]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ month })
      if (categoryFilter) params.set('category', categoryFilter)
      const { data } = await api.get(`/transactions?${params}`)
      setTransactions(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [month, categoryFilter])

  useEffect(() => { load() }, [load])

  const handleDelete = useCallback(async (id) => {
    await api.delete(`/transactions/${id}`)
    setTransactions(prev => prev.filter(t => t._id !== id))
  }, [])

  const handleCreated = useCallback((result) => {
    if (result.primary && result.secondary) {
      setTransactions(prev => [result.primary, result.secondary, ...prev])
    } else {
      setTransactions(prev => [result, ...prev])
    }
  }, [])

  // Period summary
  const income   = transactions.filter(t => t.crDr === 'Debit' && t.category === 'Income').reduce((s, t) => s + t.amount, 0)
  const spent    = transactions.filter(t => t.crDr === 'Credit').reduce((s, t) => s + t.amount, 0)
  const saved    = transactions.filter(t => t.crDr === 'Debit' && t.category === 'Savings').reduce((s, t) => s + t.amount, 0)

  // Month navigator
  const [navYear, navMon] = month.split('-').map(Number)
  const prevMonth = () => {
    const d = new Date(navYear, navMon - 2)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const nextMonth = () => {
    const d = new Date(navYear, navMon)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="flex items-end justify-between mb-8 fade-up">
        <div>
          <p className="label mb-1">History</p>
          <h1 className="font-display text-4xl italic text-ink-900">Transactions</h1>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">+ Add</button>
      </div>

      {/* Month nav + filter */}
      <div className="flex items-center gap-3 mb-6 fade-up">
        <div className="flex items-center gap-1 card px-3 py-1.5">
          <button onClick={prevMonth} className="text-ink-400 hover:text-ink-900 px-1 transition-colors">←</button>
          <span className="font-mono text-sm text-ink-700 w-28 text-center">
            {MONTHS[navMon - 1]} {navYear}
          </span>
          <button onClick={nextMonth} className="text-ink-400 hover:text-ink-900 px-1 transition-colors">→</button>
        </div>

        <select
          className="input max-w-[180px]"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Period summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Income',  value: income, color: 'text-sage-dark' },
          { label: 'Spent',   value: spent,  color: 'text-coral'     },
          { label: 'Saved',   value: saved,  color: 'text-blue-600'  },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4 fade-up">
            <p className="label mb-1">{label}</p>
            <p className={`font-display text-2xl italic tracking-tight ${color}`}>{fmt(value)}</p>
          </div>
        ))}
      </div>

      {/* Transaction list */}
      <div className="card fade-up">
        {loading ? (
          <div className="py-16 text-center">
            <p className="font-display text-2xl italic text-ink-300">Loading…</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-display text-2xl italic text-ink-300 mb-2">No transactions</p>
            <p className="text-sm text-ink-400">Add one to get started</p>
          </div>
        ) : (
          <div className="px-2 py-2">
            {transactions.map(txn => (
              <TransactionRow key={txn._id} txn={txn} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <AddTransactionModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
          selectedMonth={month}
        />
      )}
    </div>
  )
}
