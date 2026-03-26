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
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

const fmtDateInput = (d) => {
  const dt = new Date(d)
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

function currentYearMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// ─── Pay Period Helpers ───────────────────────────────────────────────────────

/**
 * Returns an array of { label, start, end } period objects that overlap the given month.
 * start/end are Date objects (start inclusive, end inclusive).
 */
function computePeriods(grouping, year, month, anchorDate) {
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd   = new Date(year, month, 0) // last day of month

  if (grouping === 'monthly') {
    return [{ label: MONTHS[month - 1] + ' ' + year, start: monthStart, end: monthEnd }]
  }

  if (grouping === 'weekly') {
    const periods = []
    let cur = new Date(monthStart)
    while (cur <= monthEnd) {
      const start = new Date(cur)
      const end   = new Date(cur)
      end.setDate(end.getDate() + 6)
      if (end > monthEnd) end.setTime(monthEnd.getTime())
      periods.push({
        label: fmtDate(start) + ' – ' + fmtDate(end),
        start,
        end,
      })
      cur.setDate(cur.getDate() + 7)
    }
    return periods
  }

  if (grouping === 'bimonthly') {
    const mid    = new Date(year, month - 1, 14)
    const midP1  = new Date(year, month - 1, 15)
    return [
      { label: fmtDate(monthStart) + ' – ' + fmtDate(mid), start: monthStart, end: mid },
      { label: fmtDate(midP1) + ' – ' + fmtDate(monthEnd), start: midP1,      end: monthEnd },
    ]
  }

  if (grouping === 'payperiod' && anchorDate) {
    const raw    = new Date(anchorDate)
    const anchor = new Date(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate())
    const MS_DAY    = 86400000
    const MS_PERIOD = 14 * MS_DAY

    // Assign each pay period to the month where its midpoint (day 7) falls.
    // This ensures each period belongs to exactly one month with no duplication.
    const diffMs = monthStart.getTime() - anchor.getTime()
    // Start two periods before monthStart to catch periods whose midpoint lands in this month
    let curStart = new Date(anchor.getTime() + (Math.floor(diffMs / MS_PERIOD) - 2) * MS_PERIOD)

    const result = []
    const limit  = new Date(monthEnd.getTime() + MS_PERIOD) // stop well past month end
    while (curStart <= limit) {
      const midpoint = new Date(curStart.getTime() + 7 * MS_DAY)
      if (midpoint >= monthStart && midpoint <= monthEnd) {
        const start = new Date(curStart)
        const end   = new Date(curStart.getTime() + 13 * MS_DAY)
        result.push({ label: fmtDate(start) + ' – ' + fmtDate(end), start, end })
      }
      curStart = new Date(curStart.getTime() + MS_PERIOD)
    }
    return result
  }

  return [{ label: MONTHS[month - 1] + ' ' + year, start: monthStart, end: monthEnd }]
}

function txInPeriod(tx, period) {
  const raw = new Date(tx.date)
  const d   = new Date(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate())
  return d >= period.start && d <= period.end
}

function periodStats(txns) {
  const income = txns.filter(t => t.crDr === 'Debit'  && t.category === 'Income') .reduce((s, t) => s + t.amount, 0)
  const spent  = txns.filter(t => t.crDr === 'Credit')                             .reduce((s, t) => s + t.amount, 0)
  const saved  = txns.filter(t => t.crDr === 'Debit'  && t.category === 'Savings').reduce((s, t) => s + t.amount, 0)
  return { income, spent, saved }
}

// ─── Auto-suggest "to" category ──────────────────────────────────────────────

const TO_CATEGORY = {
  Loan:        'Bill/Loan/Credit',
  Credit:      'Transaction',
  Savings:     'Savings',
  Checking:    'Balance',
  Investments: 'Investment',
}

// ─── CR/DR Hint ───────────────────────────────────────────────────────────────

const CRDR_HINTS = {
  Credit: {
    Credit: 'Credit account + Credit — you charged/used this account. Balance owed goes up.',
    Debit:  'Credit account + Debit — you made a payment. Balance owed goes down.',
  },
  Debit: {
    Credit: 'Debit account + Credit — money left this account (purchase, withdrawal).',
    Debit:  'Debit account + Debit — money entered this account (income, transfer in).',
  },
}

function CrDrHint({ accountType, crDr }) {
  const hint = CRDR_HINTS[accountType]?.[crDr]
  if (!hint) return null
  return (
    <p className="text-xs text-ink-400 mt-1 leading-snug">{hint}</p>
  )
}

// ─── Account Select ───────────────────────────────────────────────────────────

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

// ─── Add Transaction Modal ────────────────────────────────────────────────────

function AddTransactionModal({ onClose, onCreated, selectedMonth }) {
  const [year, mon] = selectedMonth.split('-')
  const [mode, setMode] = useState('single') // 'single' | 'paired'

  const [date, setDate]        = useState(`${year}-${mon}-01`)
  const [amount, setAmount]    = useState('')
  const [description, setDesc] = useState('')

  const [single, setSingle] = useState({
    accountId: '', account: '', accountType: 'Debit',
    category: 'Food', crDr: 'Credit',
  })

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
              <div>
                <label className="label mb-1.5 block">
                  From <span className="normal-case font-normal text-ink-400">— money leaves this account</span>
                </label>
                <AccountSelect accounts={accounts} value={from.accountId} onChange={handleFromAccount} required />
              </div>

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
                  <CrDrHint accountType={single.accountType} crDr={single.crDr} />
                </div>
              </div>
            </>
          )}

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

// ─── Edit Transaction Modal ───────────────────────────────────────────────────

function EditTransactionModal({ txn, onClose, onSaved }) {
  const [form, setForm] = useState({
    description: txn.description,
    category:    txn.category,
    date:        fmtDateInput(txn.date),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const { data } = await api.put(`/transactions/${txn._id}`, form)
      onSaved(data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-ink-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md p-7 fade-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-2xl italic text-ink-900">Edit Transaction</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700 transition-colors text-lg">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label mb-1.5 block">Date</label>
            <input type="date" className="input" value={form.date} onChange={e => set('date', e.target.value)} required />
          </div>

          <div>
            <label className="label mb-1.5 block">Description</label>
            <input className="input" value={form.description} onChange={e => set('description', e.target.value)} required />
          </div>

          <div>
            <label className="label mb-1.5 block">Category</label>
            <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className="text-xs text-ink-400 bg-ink-50 rounded-lg px-4 py-2.5">
            Amount and account cannot be changed. Delete and re-add if needed.
          </div>

          {error && <p className="text-sm text-coral bg-coral/10 rounded-lg px-4 py-2.5">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TransactionRow({ txn, onDelete, onEdit }) {
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

      <div className="flex items-center gap-2 shrink-0">
        <span className={`hidden sm:inline text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[txn.category] || 'bg-ink-100 text-ink-500'}`}>
          {txn.category}
        </span>
        <span className={`text-sm font-mono font-medium w-20 text-right ${isIncome ? 'text-sage-dark' : 'text-coral'}`}>
          {isIncome ? '+' : '-'}{fmt(txn.amount)}
        </span>
        {confirming ? (
          <div className="flex gap-1">
            <button onClick={() => onDelete(txn._id)} className="text-xs px-2 py-1 rounded-lg bg-coral text-white hover:bg-coral/80 transition-colors">Delete</button>
            <button onClick={() => setConfirming(false)} className="text-xs px-2 py-1 rounded-lg text-ink-500 hover:bg-ink-100 transition-colors">Cancel</button>
          </div>
        ) : (
          <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(txn)}
              className="text-xs text-ink-400 hover:text-ink-600 px-2 py-1 rounded-lg hover:bg-ink-100"
            >
              edit
            </button>
            <button
              onClick={() => setConfirming(true)}
              className="text-xs text-ink-400 hover:text-coral px-2 py-1 rounded-lg hover:bg-ink-100"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Period Section ───────────────────────────────────────────────────────────

function PeriodSection({ period, transactions, onDelete, onEdit, index }) {
  const { income, spent, saved } = periodStats(transactions)
  return (
    <div className="card fade-up mb-4" style={{ animationDelay: `${index * 40}ms` }}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-ink-100">
        <span className="text-xs font-medium text-ink-600">{period.label}</span>
        <div className="flex gap-3 text-xs font-mono">
          {income > 0 && <span className="text-sage-dark">+{fmt(income)}</span>}
          {spent  > 0 && <span className="text-coral">-{fmt(spent)}</span>}
          {saved  > 0 && <span className="text-blue-600">saved {fmt(saved)}</span>}
        </div>
      </div>
      {transactions.length === 0 ? (
        <p className="px-5 py-4 text-xs text-ink-300 italic">No transactions this period.</p>
      ) : (
        <div className="px-2 py-2">
          {transactions.map(txn => (
            <TransactionRow key={txn._id} txn={txn} onDelete={onDelete} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Transactions() {
  const [month, setMonth]               = useState(currentYearMonth)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(true)
  const [showAdd, setShowAdd]           = useState(false)
  const [editTxn, setEditTxn]           = useState(null)
  const [profile, setProfile]           = useState(null)

  // Load user profile for grouping settings; once loaded, transactions re-fetch via load()
  useEffect(() => {
    api.get('/profile')
      .then(({ data }) => setProfile(data))
      .catch(() => setProfile({}))  // fall back to empty so load() proceeds
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (categoryFilter) params.set('category', categoryFilter)

      // When pay period grouping is active, periods may span across month
      // boundaries — fetch the full range covered by all visible periods.
      if (profile && profile.transactionGrouping !== 'monthly') {
        const [y, m] = month.split('-').map(Number)
        const ps = computePeriods(profile.transactionGrouping, y, m, profile.paycheckAnchorDate)
        if (ps.length) {
          const rangeStart = ps[0].start
          const rangeEnd   = ps[ps.length - 1].end
          // Format as ISO date strings (UTC midnight)
          const pad = n => String(n).padStart(2, '0')
          const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
          params.set('startDate', toISO(rangeStart) + 'T00:00:00.000Z')
          params.set('endDate',   toISO(rangeEnd)   + 'T23:59:59.999Z')
        } else {
          params.set('month', month)
        }
      } else {
        params.set('month', month)
      }

      const { data } = await api.get(`/transactions?${params}`)
      setTransactions(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [month, categoryFilter, profile])

  useEffect(() => { load() }, [load])

  const handleDelete = useCallback(async (id) => {
    await api.delete(`/transactions/${id}`)
    setTransactions(prev => prev.filter(t => t._id !== id && t.linkedId !== id))
  }, [])

  const handleCreated = useCallback((result) => {
    if (result.primary && result.secondary) {
      setTransactions(prev => [result.primary, result.secondary, ...prev])
    } else {
      setTransactions(prev => [result, ...prev])
    }
  }, [])

  const handleSaved = useCallback((updated) => {
    setTransactions(prev => prev.map(t => t._id === updated._id ? updated : t))
  }, [])

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

  // Overall month summaries — restrict to the calendar month even when fetching a wider range
  const calMonthStart = new Date(Date.UTC(navYear, navMon - 1, 1))
  const calMonthEnd   = new Date(Date.UTC(navYear, navMon, 1))
  const monthTxns = transactions.filter(t => {
    const d = new Date(t.date)
    return d >= calMonthStart && d < calMonthEnd
  })
  const income = monthTxns.filter(t => t.crDr === 'Debit'  && t.category === 'Income') .reduce((s, t) => s + t.amount, 0)
  const spent  = monthTxns.filter(t => t.crDr === 'Credit')                             .reduce((s, t) => s + t.amount, 0)
  const saved  = monthTxns.filter(t => t.crDr === 'Debit'  && t.category === 'Savings').reduce((s, t) => s + t.amount, 0)

  // Compute periods from profile settings
  const grouping = profile?.transactionGrouping || 'monthly'
  const periods  = computePeriods(grouping, navYear, navMon, profile?.paycheckAnchorDate)
  const useGroups = grouping !== 'monthly'

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="flex items-end justify-between mb-8 fade-up">
        <div>
          <p className="label mb-1">History</p>
          <h1 className="font-display text-2xl sm:text-4xl italic text-ink-900">Transactions</h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add</button>
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

      {/* Monthly summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Income', value: income, color: 'text-sage-dark' },
          { label: 'Spent',  value: spent,  color: 'text-coral'     },
          { label: 'Saved',  value: saved,  color: 'text-blue-600'  },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4 fade-up">
            <p className="label mb-1">{label}</p>
            <p className={`font-display text-xl sm:text-2xl italic tracking-tight ${color}`}>{fmt(value)}</p>
          </div>
        ))}
      </div>

      {/* Transaction list */}
      {loading ? (
        <div className="card py-16 text-center fade-up">
          <p className="font-display text-2xl italic text-ink-300">Loading…</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="card py-16 text-center fade-up">
          <p className="font-display text-2xl italic text-ink-300 mb-2">No transactions</p>
          <p className="text-sm text-ink-400">Add one to get started</p>
        </div>
      ) : useGroups ? (
        periods.map((period, i) => (
          <PeriodSection
            key={period.label}
            index={i}
            period={period}
            transactions={transactions.filter(t => txInPeriod(t, period))}
            onDelete={handleDelete}
            onEdit={setEditTxn}
          />
        ))
      ) : (
        <div className="card fade-up">
          <div className="px-2 py-2">
            {transactions.map(txn => (
              <TransactionRow key={txn._id} txn={txn} onDelete={handleDelete} onEdit={setEditTxn} />
            ))}
          </div>
        </div>
      )}

      {showAdd && (
        <AddTransactionModal
          onClose={() => setShowAdd(false)}
          onCreated={handleCreated}
          selectedMonth={month}
        />
      )}

      {editTxn && (
        <EditTransactionModal
          txn={editTxn}
          onClose={() => setEditTxn(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}