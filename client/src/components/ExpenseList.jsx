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
    return lent > 0 ? { tone: 'text-emerald-700', label: 'you lent', amount: lent } : null
  }
  return mine > 0 ? { tone: 'text-orange-700', label: 'you borrowed', amount: mine } : null
}

export default function ExpenseList({ expenses, currentUser, onEdit, onDelete }) {
  if (!expenses.length) {
    return <p className="py-8 text-center text-sm text-slate-500">No expenses yet. Add the first one above.</p>
  }

  return (
    <ul className="divide-y divide-slate-100">
      {expenses.map((e) => {
        const { month, day } = dateParts(e.date)
        const cat = categoryMeta(e.category)
        const share = yourShare(e, currentUser.id)
        const payer = e.paidBy.id === currentUser.id ? 'You' : e.paidBy.name

        return (
          <li key={e._id} className="group flex items-center gap-1">
            {/* The whole row opens the expense; on phones that is the only way to edit or delete it,
                which keeps two tiny adjacent buttons out of every row. */}
            <button
              type="button"
              onClick={() => onEdit(e)}
              className="-mx-2 flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-3 text-left hover:bg-slate-50 sm:gap-3"
            >
              <span className="block w-10 shrink-0 text-center leading-tight">
                <span className="block text-[11px] uppercase text-slate-500">{month}</span>
                <span className="block text-lg font-semibold">{day}</span>
              </span>
              <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 sm:flex" title={cat.label}>
                <cat.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className="block min-w-0 flex-1">
                <span className="block truncate font-medium">{e.description}</span>
                <span className="block text-xs text-slate-500">
                  {payer} paid {formatINR(e.amount)}
                </span>
              </span>
              <span className="block shrink-0 text-right">
                {share ? (
                  <>
                    <span className={`block text-xs ${share.tone}`}>{share.label}</span>
                    <span className={`block text-sm font-semibold tabular-nums ${share.tone}`}>{formatINR(share.amount)}</span>
                  </>
                ) : (
                  <span className="block text-xs text-slate-500">not involved</span>
                )}
              </span>
            </button>
            <div className="hidden shrink-0 gap-1 sm:flex sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-within:opacity-100">
              <button onClick={() => onEdit(e)} className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100" aria-label={`Edit ${e.description}`}>
                Edit
              </button>
              <button onClick={() => onDelete(e)} className="rounded-md px-2 py-1 text-xs text-red-700 hover:bg-red-50" aria-label={`Delete ${e.description}`}>
                Delete
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
