import { monthLabel, shiftMonth, thisMonth } from '../utils/months'

export default function MonthPicker({ value, onChange }) {
  const isCurrent = value >= thisMonth()
  const arrow = 'rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40'
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
      <button className={arrow} onClick={() => onChange(shiftMonth(value, -1))} aria-label="Previous month">
        ‹
      </button>
      <span className="min-w-32 text-center text-sm font-medium" aria-live="polite">
        {monthLabel(value)}
      </span>
      <button className={arrow} onClick={() => onChange(shiftMonth(value, 1))} disabled={isCurrent} aria-label="Next month">
        ›
      </button>
    </div>
  )
}
