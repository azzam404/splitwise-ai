import { ChevronLeft, ChevronRight } from 'lucide-react'
import { monthLabel, shiftMonth, thisMonth } from '../utils/months'

export default function MonthPicker({ value, onChange }) {
  const isCurrent = value >= thisMonth()
  const arrow = 'rounded-md p-1.5 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40'
  return (
    <div className="inline-flex max-w-full items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
      <button className={arrow} onClick={() => onChange(shiftMonth(value, -1))} aria-label="Previous month">
        <ChevronLeft className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
      </button>
      <span className="min-w-0 text-center text-sm font-medium sm:min-w-32" aria-live="polite">
        {monthLabel(value)}
      </span>
      <button className={arrow} onClick={() => onChange(shiftMonth(value, 1))} disabled={isCurrent} aria-label="Next month">
        <ChevronRight className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  )
}
