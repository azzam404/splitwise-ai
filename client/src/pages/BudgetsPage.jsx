import { useCallback, useEffect, useState } from 'react'
import api, { errorMessage } from '../api/client'
import { Alert, Button, Card, Spinner } from '../components/ui'
import MonthPicker from '../components/MonthPicker'
import BudgetProgress from '../components/BudgetProgress'
import { CATEGORIES } from '../utils/categories'
import { formatINR, toPaise, toRupeeString } from '../utils/money'
import { monthLabel, shiftMonth, thisMonth } from '../utils/months'

const ROWS = [{ value: 'overall', label: 'Overall (all categories)', icon: '📊' }, ...CATEGORIES]

function BudgetRow({ row, budget, onSave, onRemove }) {
  const [draft, setDraft] = useState(budget ? toRupeeString(budget.limit) : '')
  const [busy, setBusy] = useState(false)
  const changed = draft.trim() !== (budget ? toRupeeString(budget.limit) : '')
  const valid = toPaise(draft) > 0

  async function run(action) {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-0 flex-1 text-sm font-medium">
          <span aria-hidden="true">{row.icon}</span> {row.label}
        </span>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (changed && valid) run(() => onSave(row.value, toPaise(draft)))
          }}
        >
          <label className="sr-only" htmlFor={`limit-${row.value}`}>
            {row.label} limit in rupees
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-sm text-slate-500">₹</span>
            <input
              id={`limit-${row.value}`}
              inputMode="decimal"
              placeholder="No limit"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-32 rounded-md border border-slate-300 py-1.5 pr-2 pl-6 text-right text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <Button type="submit" className="!px-3 !py-1.5" disabled={!changed || !valid || busy}>
            Save
          </Button>
          {budget && (
            <Button type="button" variant="ghost" className="!px-2 !py-1.5 text-red-600" disabled={busy} onClick={() => run(() => onRemove(budget))}>
              Remove
            </Button>
          )}
        </form>
      </div>
      {budget && (
        <div className="mt-2">
          <BudgetProgress budget={budget} />
        </div>
      )}
    </li>
  )
}

export default function BudgetsPage() {
  const [month, setMonth] = useState(thisMonth)
  // Budgets are tagged with the month they belong to, so switching months shows a spinner.
  const [loaded, setLoaded] = useState({ month: null, list: [] })
  const budgets = loaded.month === month ? loaded.list : null
  const setBudgets = (update) => setLoaded((prev) => ({ month: prev.month, list: update(prev.list) }))
  const [error, setError] = useState('')
  const [copying, setCopying] = useState(false)

  const load = useCallback(async (forMonth) => {
    const { data } = await api.get('/budgets', { params: { month: forMonth } })
    return data.budgets
  }, [])

  useEffect(() => {
    let cancelled = false
    load(month)
      .then((list) => !cancelled && setLoaded({ month, list }))
      .catch((err) => !cancelled && setError(errorMessage(err)))
    return () => {
      cancelled = true
    }
  }, [month, load])

  async function save(category, limit) {
    setError('')
    try {
      const { data } = await api.put('/budgets', { month, category, limit })
      setBudgets((prev) => [...prev.filter((b) => b.category !== category), data.budget])
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function remove(budget) {
    setError('')
    try {
      await api.delete(`/budgets/${budget._id}`)
      setBudgets((prev) => prev.filter((b) => b._id !== budget._id))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function copyFromLastMonth() {
    setError('')
    setCopying(true)
    try {
      const previous = await load(shiftMonth(month, -1))
      if (!previous.length) {
        setError(`No budgets were set for ${monthLabel(shiftMonth(month, -1))}.`)
        return
      }
      await Promise.all(previous.map((b) => api.put('/budgets', { month, category: b.category, limit: b.limit })))
      setLoaded({ month, list: await load(month) })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setCopying(false)
    }
  }

  const byCategory = Object.fromEntries((budgets || []).map((b) => [b.category, b]))
  const totalLimits = (budgets || []).filter((b) => b.category !== 'overall').reduce((t, b) => t + b.limit, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Budgets</h1>
          <p className="text-sm text-slate-500">Monthly limits on your share of spending. You'll get an alert at 80%.</p>
        </div>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      <Alert>{error}</Alert>

      {budgets === null ? (
        <Spinner />
      ) : (
        <Card>
          {budgets.length === 0 && (
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm">
              <span>No budgets for {monthLabel(month)} yet.</span>
              <Button variant="secondary" className="!py-1" onClick={copyFromLastMonth} disabled={copying}>
                {copying ? 'Copying…' : 'Copy last month’s budgets'}
              </Button>
            </div>
          )}
          <ul className="divide-y divide-slate-100">
            {ROWS.map((row) => (
              // Keyed by month so drafts reset when switching months.
              <BudgetRow key={`${month}-${row.value}`} row={row} budget={byCategory[row.value]} onSave={save} onRemove={remove} />
            ))}
          </ul>
          {totalLimits > 0 && (
            <p className="mt-3 text-xs text-slate-500">Category limits add up to {formatINR(totalLimits)}.</p>
          )}
        </Card>
      )}
    </div>
  )
}
