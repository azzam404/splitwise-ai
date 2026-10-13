import { categoryMeta } from '../utils/categories'
import { formatINR } from '../utils/money'

const dateParts = (iso) => {
  const d = new Date(iso)
  return { month: d.toLocaleString('en-IN', { month: 'short' }), day: d.getDate() }
}

// What this expense means for the current user: lent, borrowed or not involved.
function yourShare(expense, userId) {
  const mine = expense.splits.find((s) => s.user.id === userId)?.amount ?? 0
  if (expense.paidBy.id === userId) {
    const lent = expense.amount - mine
    return lent > 0 ? { tone: 'text-emerald-600', label: 'you lent', amount: lent } : null
  }
  return mine > 0 ? { tone: 'text-orange-600', label: 'you borrowed', amount: mine } : null
}

export default function ExpenseList({ expenses, currentUser, onEdit, onDelete }) {
  if (!expenses.length) {
    return <p className="py-8 text-center text-sm text-slate-500">No expenses yet. Add the first one!</p>
  }

  return (
    <ul className="divide-y divide-slate-100">
      {expenses.map((e) => {
        const { month, day } = dateParts(e.date)
        const cat = categoryMeta(e.category)
        const share = yourShare(e, currentUser.id)
        const payer = e.paidBy.id === currentUser.id ? 'You' : e.paidBy.name

        return (
          <li key={e._id} className="group flex items-center gap-2 py-3 sm:gap-3">
            <div className="w-10 shrink-0 text-center leading-tight">
              <div className="text-[11px] uppercase text-slate-500">{month}</div>
              <div className="text-lg font-semibold">{day}</div>
            </div>
            <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xl sm:flex" title={cat.label}>
              {cat.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{e.description}</div>
              <div className="text-xs text-slate-500">
                {payer} paid {formatINR(e.amount)}
              </div>
            </div>
            <div className="text-right">
              {share ? (
                <>
                  <div className={`text-xs ${share.tone}`}>{share.label}</div>
                  <div className={`text-sm font-semibold ${share.tone}`}>{formatINR(share.amount)}</div>
                </>
              ) : (
                <div className="text-xs text-slate-400">not involved</div>
              )}
            </div>
            <div className="flex shrink-0 flex-col gap-0.5 sm:flex-row sm:gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-within:opacity-100">
              <button onClick={() => onEdit(e)} className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100" aria-label={`Edit ${e.description}`}>
                Edit
              </button>
              <button onClick={() => onDelete(e)} className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50" aria-label={`Delete ${e.description}`}>
                Delete
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
