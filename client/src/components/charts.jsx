import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { categoryMeta } from '../utils/categories'
import { formatINR } from '../utils/money'
import { monthLabel } from '../utils/months'

const compactINR = (paise) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 }).format(paise / 100)

/**
 * Spending by category as a sorted horizontal bar list: one hue (magnitude, not identity),
 * each row labelled with its value so nothing relies on reading bar length alone.
 */
export function CategoryBars({ data }) {
  if (!data.length) return <p className="py-6 text-center text-sm text-slate-500">No spending this month.</p>
  const max = Math.max(...data.map((d) => d.amount))
  return (
    <ul className="space-y-2.5">
      {data.map((d) => {
        const meta = categoryMeta(d.category)
        return (
          <li key={d.category} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3 text-sm" title={`${meta.label}: ${formatINR(d.amount)}`}>
            <span className="flex min-w-0 items-center gap-1.5 text-slate-700">
              <meta.icon className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.75} aria-hidden="true" />
              <span className="truncate">{meta.label}</span>
            </span>
            <span className="h-3 rounded-r bg-slate-50">
              <span className="block h-3 rounded-r bg-series-1" style={{ width: `${Math.max(2, (d.amount / max) * 100)}%` }} />
            </span>
            <span className="text-right font-medium tabular-nums text-slate-800">{formatINR(d.amount)}</span>
          </li>
        )
      })}
    </ul>
  )
}

function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { month, amount } = payload[0].payload
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      <div className="text-slate-500">{monthLabel(month)}</div>
      <div className="font-semibold text-slate-800">{formatINR(amount)}</div>
    </div>
  )
}

// Monthly spending trend: single series, one y-axis, recessive grid, hover tooltip.
export function TrendChart({ data }) {
  return (
    <div className="h-56" role="img" aria-label={`Monthly spending: ${data.map((d) => `${monthLabel(d.month, 'short')} ${formatINR(d.amount)}`).join(', ')}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="#eef0f3" />
          <XAxis
            dataKey="month"
            tickFormatter={(m) => monthLabel(m, 'short')}
            tickLine={false}
            axisLine={{ stroke: '#cbd5e1' }}
            tick={{ fill: '#64748b', fontSize: 12 }}
          />
          <YAxis
            tickFormatter={compactINR}
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fill: '#64748b', fontSize: 12 }}
            allowDecimals={false}
          />
          <Tooltip content={<TrendTooltip />} cursor={{ fill: '#f1f5f9' }} />
          <Bar dataKey="amount" fill="var(--color-series-1)" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
