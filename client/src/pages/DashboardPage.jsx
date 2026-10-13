import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { errorMessage } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { Alert, Card, Spinner } from '../components/ui'
import MonthPicker from '../components/MonthPicker'
import BudgetProgress, { StatusBadge } from '../components/BudgetProgress'
import { CategoryBars, TrendChart } from '../components/charts'
import AiInsights from '../components/AiInsights'
import { categoryMeta } from '../utils/categories'
import { formatINR } from '../utils/money'
import { monthLabel, thisMonth } from '../utils/months'

function StatTile({ label, value, tone = 'text-slate-900', children }) {
  return (
    <Card className="!p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${tone}`}>{value}</div>
      {children && <div className="mt-1 text-xs text-slate-500">{children}</div>}
    </Card>
  )
}

function ChangeVsLastMonth({ current, previous }) {
  if (!previous) return <>No spending last month</>
  const change = Math.round(((current - previous) / previous) * 100)
  if (change === 0) return <>Same as last month</>
  return (
    <>
      <span aria-hidden="true">{change > 0 ? '▲' : '▼'}</span> {Math.abs(change)}% {change > 0 ? 'more' : 'less'} than last month
    </>
  )
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [month, setMonth] = useState(thisMonth)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await api.get('/dashboard/summary', { params: { month } })
        if (!cancelled) {
          setData(res.data)
          setError('')
        }
      } catch (err) {
        if (!cancelled) setError(errorMessage(err))
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [month])

  const overall = data?.budgets.find((b) => b.category === 'overall')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Hi {user?.name.split(' ')[0]} 👋</h1>
          <p className="text-sm text-slate-500">Your share of spending across all groups.</p>
        </div>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      <Alert>{error}</Alert>
      {!data ? (
        !error && <Spinner />
      ) : (
        <>
          {data.alerts.length > 0 && (
            <div role="status" className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h2 className="text-sm font-semibold text-amber-900">Budget alerts</h2>
              <ul className="space-y-1">
                {data.alerts.map((a) => (
                  <li key={a._id} className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                    <StatusBadge status={a.status} />
                    <span>
                      {a.category === 'overall' ? 'Overall budget' : categoryMeta(a.category).label}: {formatINR(a.spent)} of{' '}
                      {formatINR(a.limit)} ({a.percent}%)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label={`Spent in ${monthLabel(month, 'short')}`} value={formatINR(data.totalSpent)}>
              <ChangeVsLastMonth current={data.totalSpent} previous={data.previousMonthSpent} />
            </StatTile>
            <StatTile label="You are owed" value={formatINR(data.balances.owedToYou)} tone="text-emerald-600">
              Across all groups
            </StatTile>
            <StatTile label="You owe" value={formatINR(data.balances.youOwe)} tone="text-orange-600">
              Across all groups
            </StatTile>
            <StatTile label="Monthly budget" value={overall ? `${overall.percent}%` : '—'}>
              {overall ? (
                `${formatINR(overall.spent)} of ${formatINR(overall.limit)}`
              ) : (
                <Link to="/budgets" className="text-brand-600 hover:underline">
                  Set a budget
                </Link>
              )}
            </StatTile>
          </div>

          <AiInsights key={month} month={month} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-4 font-semibold">Spending by category</h2>
              <CategoryBars data={data.byCategory} />
            </Card>
            <Card>
              <h2 className="mb-2 font-semibold">Last 6 months</h2>
              <TrendChart data={data.trend} />
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">Budgets</h2>
                <Link to="/budgets" className="text-sm text-brand-600 hover:underline">
                  Manage
                </Link>
              </div>
              {data.budgets.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No budgets for this month.{' '}
                  <Link to="/budgets" className="text-brand-600 hover:underline">
                    Set one
                  </Link>{' '}
                  to get alerts before you overspend.
                </p>
              ) : (
                <ul className="space-y-4">
                  {data.budgets.map((b) => (
                    <li key={b._id}>
                      <div className="mb-1 text-sm font-medium">
                        {b.category === 'overall' ? 'Overall' : `${categoryMeta(b.category).icon} ${categoryMeta(b.category).label}`}
                      </div>
                      <BudgetProgress budget={b} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <h2 className="mb-3 font-semibold">Group balances</h2>
              {data.balances.groups.length === 0 ? (
                <p className="text-sm text-slate-500">You're settled up everywhere 🎉</p>
              ) : (
                <ul className="space-y-2">
                  {data.balances.groups.map(({ group, net }) => (
                    <li key={group._id}>
                      <Link to={`/groups/${group._id}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                        <span className="font-medium">{group.name}</span>
                        <span className={net > 0 ? 'text-emerald-600' : 'text-orange-600'}>
                          {net > 0 ? 'owed ' : 'you owe '}
                          {formatINR(Math.abs(net))}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card>
            <h2 className="mb-3 font-semibold">Recent expenses</h2>
            {data.recentExpenses.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nothing yet. <Link to="/groups" className="text-brand-600 hover:underline">Open a group</Link> to add an expense.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.recentExpenses.map((e) => (
                  <li key={e._id} className="flex items-center gap-3 py-2 text-sm">
                    <span aria-hidden="true" className="text-lg">
                      {categoryMeta(e.category).icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{e.description}</div>
                      <div className="text-xs text-slate-500">
                        {e.group?.name} · {new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium tabular-nums">{formatINR(e.yourShare)}</div>
                      <div className="text-xs text-slate-500">of {formatINR(e.amount)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
