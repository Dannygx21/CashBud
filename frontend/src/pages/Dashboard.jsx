import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import api from '../api/client'

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

const pct = (n) => `${(n * 100).toFixed(1)}%`

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ─── Year Summary Cards ──────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, positive }) {
  const isPositive = positive ?? value >= 0
  return (
    <div className="card p-5 fade-up">
      <p className="label mb-2">{label}</p>
      <p className={`font-display text-3xl italic tracking-tight ${isPositive ? 'text-ink-900' : 'text-coral'}`}>
        {fmt(value)}
      </p>
      {sub && <p className="text-xs text-ink-400 font-mono mt-1">{sub}</p>}
    </div>
  )
}

// ─── Month Row ───────────────────────────────────────────────────────────────

function MonthRow({ month, index }) {
  const hasData = month.income > 0
  return (
    <tr className={`border-b border-ink-100 transition-colors hover:bg-ink-50 ${!hasData ? 'opacity-30' : ''}`}>
      <td className="px-4 py-3 text-sm font-medium text-ink-900">{MONTHS[month.month - 1]}</td>
      <td className="px-4 py-3 text-sm font-mono text-sage-dark">{hasData ? fmt(month.income) : '—'}</td>
      <td className="px-4 py-3 text-sm font-mono text-coral">{hasData ? fmt(month.expenses) : '—'}</td>
      <td className={`px-4 py-3 text-sm font-mono ${month.netProfit >= 0 ? 'text-sage-dark' : 'text-coral'}`}>
        {hasData ? fmt(month.netProfit) : '—'}
      </td>
      <td className="px-4 py-3 text-sm font-mono text-blue-600 hidden sm:table-cell">{hasData ? fmt(month.totalSavings) : '—'}</td>
      <td className="px-4 py-3 text-sm font-mono text-violet-600 hidden sm:table-cell">{hasData ? fmt(month.investments) : '—'}</td>
      <td className="px-4 py-3 text-sm font-mono text-ink-400 hidden sm:table-cell">{hasData ? pct(month.totalSavingsPct) : '—'}</td>
    </tr>
  )
}

// ─── Category Breakdown ──────────────────────────────────────────────────────

function CategoryBreakdown({ months }) {
  const totals = months.reduce((acc, m) => {
    const cats = m.categories || {}
    Object.entries(cats).forEach(([k, v]) => { acc[k] = (acc[k] || 0) + v })
    return acc
  }, {})

  const items = [
    { label: 'Food',            value: totals.food,           color: 'bg-amber-400' },
    { label: 'Wants',           value: totals.wants,          color: 'bg-violet-400' },
    { label: 'Grocery',         value: totals.grocery,        color: 'bg-sage' },
    { label: 'Gas',             value: totals.gas,            color: 'bg-blue-400' },
    { label: 'Subscriptions',   value: totals.subscription,   color: 'bg-indigo-400' },
    { label: 'Entertainment',   value: totals.entertainment,  color: 'bg-pink-400' },
    { label: 'Memberships',     value: totals.membership,     color: 'bg-orange-400' },
    { label: 'Needs',           value: totals.needs,          color: 'bg-ink-400' },
    { label: 'Bills & Loans',   value: totals.billLoanCredit, color: 'bg-coral' },
  ].filter(i => i.value > 0).sort((a, b) => b.value - a.value)

  const total = items.reduce((s, i) => s + i.value, 0)

  return (
    <div className="card p-6 fade-up">
      <p className="label mb-5">Spending Breakdown · YTD</p>
      <div className="space-y-3">
        {items.map(({ label, value, color }) => (
          <div key={label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-ink-700 font-medium">{label}</span>
              <span className="font-mono text-ink-500">{fmt(value)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${color}`}
                style={{ width: `${total > 0 ? (value / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get(`/dashboard?year=${year}`)
      .then(r => setData(r.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [year])

  const months = data?.months || []
  const activeMonths = months.filter(m => m.income > 0)

  const totalIncome   = activeMonths.reduce((s, m) => s + m.income, 0)
  const totalExpenses = activeMonths.reduce((s, m) => s + m.expenses, 0)
  const totalSavings  = activeMonths.reduce((s, m) => s + m.totalSavings, 0)
  const netProfit     = totalIncome - totalExpenses

  const chartData = months.map((m, i) => ({
    name: MONTHS[i],
    Income:   m.income,
    Expenses: m.expenses,
    Savings:  m.totalSavings,
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <p className="font-display text-3xl italic text-ink-300 mb-2">Loading…</p>
          <p className="text-xs text-ink-400 font-mono">fetching dashboard</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="flex items-end justify-between mb-8 fade-up">
        <div>
          <p className="label mb-1">Overview</p>
          <h1 className="font-display text-2xl sm:text-4xl italic text-ink-900">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setYear(y => y - 1)}
            className="btn-ghost text-xs px-3"
          >
            ←
          </button>
          <span className="font-mono text-sm text-ink-700 w-12 text-center">{year}</span>
          <button
            onClick={() => setYear(y => y + 1)}
            disabled={year >= currentYear}
            className="btn-ghost text-xs px-3 disabled:opacity-30"
          >
            →
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <SummaryCard label="Total Income"   value={totalIncome}   positive={true} />
        <SummaryCard label="Total Expenses" value={totalExpenses} positive={false} />
        <SummaryCard label="Net Profit"     value={netProfit}     />
        <SummaryCard label="Total Savings"  value={totalSavings}  positive={true} />
      </div>

      {/* Bar chart */}
      <div className="card p-6 mb-8 fade-up">
        <p className="label mb-5">Monthly Overview</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} barGap={4} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#eeede9" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8f8d85' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#8f8d85' }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(val, name) => [fmt(val), name]}
              contentStyle={{ borderRadius: '12px', border: '1px solid #eeede9', fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            <Bar dataKey="Income"   fill="#4d7c6b" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Expenses" fill="#e85d4a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Savings"  fill="#60a5fa" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Month table + category breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Month-by-month table */}
        <div className="lg:col-span-2 card overflow-hidden fade-up">
          <div className="px-5 py-4 border-b border-ink-100">
            <p className="label">Month by Month</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50">
                  {[
                    { h: 'Month',    hide: false },
                    { h: 'Income',   hide: false },
                    { h: 'Expenses', hide: false },
                    { h: 'Net',      hide: false },
                    { h: 'Savings',  hide: true  },
                    { h: 'Invested', hide: true  },
                    { h: 'Save %',   hide: true  },
                  ].map(({ h, hide }) => (
                    <th key={h} className={`px-4 py-2.5 text-xs font-medium text-ink-400 uppercase tracking-wide${hide ? ' hidden sm:table-cell' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {months.map((m, i) => <MonthRow key={i} month={m} index={i} />)}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category breakdown */}
        <CategoryBreakdown months={months} />

      </div>
    </div>
  )
}
