import { useEffect, useState } from 'react'
import api from '../api/client'
import { formatINR } from '../utils/money'

function NetLine({ net }) {
  if (net === 0) return <p className="text-lg font-semibold text-slate-800">You're settled up</p>
  const owed = net > 0
  return (
    <p className="text-lg text-slate-800">
      {owed ? 'You are owed ' : 'You owe '}
      <span className={`font-semibold tabular-nums ${owed ? 'text-emerald-700' : 'text-orange-700'}`}>
        {formatINR(Math.abs(net))}
      </span>
    </p>
  )
}

function PaymentsLine({ simplified, pairwise }) {
  if (simplified === 0) return <p className="text-sm text-slate-600">Nobody owes anything right now</p>
  const plural = (n) => `${n} payment${n === 1 ? '' : 's'}`
  return (
    <p className="text-sm text-slate-700">
      Settles in <span className="font-semibold text-slate-900">{plural(simplified)}</span>
      {pairwise > simplified && ` instead of ${pairwise}`}
    </p>
  )
}

// Where the current user stands in the group, shown above the tabs so the outcome is visible first.
export default function GroupSummary({ groupId, currentUser, refreshKey, onShowPayments }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false
    api
      .get(`/groups/${groupId}/balances`)
      .then(({ data }) => !cancelled && setData(data))
      // The Balances tab reports load errors; the summary just stays in its placeholder state.
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [groupId, refreshKey])

  const mine = data?.balances.find((b) => b.user.id === currentUser.id)

  return (
    <section
      aria-label="Group summary"
      aria-busy={!data}
      className="flex min-h-[5.5rem] flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5"
    >
      {data ? (
        <>
          <div>
            <NetLine net={mine?.net ?? 0} />
            <p className="text-sm text-slate-500">
              Group spending so far <span className="tabular-nums">{formatINR(data.totalSpent)}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-slate-100 pt-3 sm:justify-end sm:border-0 sm:pt-0">
            <PaymentsLine simplified={data.simplified.length} pairwise={data.pairwise.length} />
            {onShowPayments && data.simplified.length > 0 && (
              <button
                type="button"
                onClick={onShowPayments}
                // Negative margin keeps the label aligned with the text when the button wraps onto its own line.
                className="-mx-2 rounded-md px-2 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                View payments
              </button>
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-500">Working out balances…</p>
      )}
    </section>
  )
}
