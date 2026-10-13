import { formatINR } from '../utils/money'

// Status is never colour alone: each state has an icon and a text label too.
const STATUS = {
  ok: { icon: '✓', label: 'On track', bar: 'bg-status-good', text: 'text-emerald-700' },
  warning: { icon: '!', label: 'Close to limit', bar: 'bg-status-warning', text: 'text-amber-700' },
  over: { icon: '✕', label: 'Over budget', bar: 'bg-status-critical', text: 'text-red-700' },
}

export function StatusBadge({ status }) {
  const s = STATUS[status]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${s.text}`}>
      <span aria-hidden="true" className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] text-white ${s.bar}`}>
        {s.icon}
      </span>
      {s.label}
    </span>
  )
}

export default function BudgetProgress({ budget }) {
  const s = STATUS[budget.status]
  const width = `${Math.min(100, budget.percent)}%`
  return (
    <div>
      <div
        className="h-2 rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, Math.round(budget.percent))}
        aria-label={`${budget.percent}% of budget used`}
      >
        <div className={`h-2 rounded-full ${s.bar}`} style={{ width }} />
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 text-xs text-slate-600">
        <span>
          {formatINR(budget.spent)} of {formatINR(budget.limit)} · {budget.percent}%
        </span>
        <span className="flex items-center gap-2">
          <StatusBadge status={budget.status} />
          <span className="text-slate-500">
            {budget.remaining >= 0 ? `${formatINR(budget.remaining)} left` : `${formatINR(-budget.remaining)} over`}
          </span>
        </span>
      </div>
    </div>
  )
}
