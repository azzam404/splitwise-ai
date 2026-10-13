import { useEffect, useState } from 'react'
import api, { errorMessage } from '../api/client'
import { formatINR } from '../utils/money'
import { Alert, Button, Card, Spinner } from './ui'

function YourSummary({ net }) {
  if (net === 0) {
    return <p className="text-lg font-semibold text-slate-700">You're all settled up 🎉</p>
  }
  const owed = net > 0
  return (
    <p className="text-lg">
      {owed ? 'You are owed ' : 'You owe '}
      <span className={`font-bold ${owed ? 'text-emerald-600' : 'text-orange-600'}`}>{formatINR(Math.abs(net))}</span>
      {' in total'}
    </p>
  )
}

function MemberBalances({ balances, currentUser }) {
  const max = Math.max(1, ...balances.map((b) => Math.abs(b.net)))
  return (
    <ul className="space-y-3">
      {balances.map((b) => {
        const owed = b.net > 0
        const width = `${(Math.abs(b.net) / max) * 100}%`
        return (
          <li key={b.user.id}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">{b.user.id === currentUser.id ? 'You' : b.user.name}</span>
              <span className={b.net === 0 ? 'text-slate-400' : owed ? 'text-emerald-600' : 'text-orange-600'}>
                {b.net === 0 ? 'settled' : `${owed ? 'gets back' : 'owes'} ${formatINR(Math.abs(b.net))}`}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className={`h-2 rounded-full ${owed ? 'bg-emerald-500' : 'bg-orange-400'}`} style={{ width: b.net ? width : 0 }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default function BalancesPanel({ groupId, currentUser, refreshKey, onSettle }) {
  const [data, setData] = useState(null)
  const [settlements, setSettlements] = useState([])
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [balances, history] = await Promise.all([
          api.get(`/groups/${groupId}/balances`),
          api.get(`/groups/${groupId}/settlements`),
        ])
        if (cancelled) return
        setData(balances.data)
        setSettlements(history.data.settlements)
        setError('')
      } catch (err) {
        if (!cancelled) setError(errorMessage(err))
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [groupId, refreshKey, reload])

  async function deleteSettlement(s) {
    if (!window.confirm('Delete this payment? Balances will be recalculated.')) return
    try {
      await api.delete(`/settlements/${s._id}`)
      setReload((n) => n + 1)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  if (error && !data) return <Alert>{error}</Alert>
  if (!data) return <Spinner />

  const mine = data.balances.find((b) => b.user.id === currentUser.id)
  const name = (u) => (u.id === currentUser.id ? 'You' : u.name)
  const saved = data.pairwise.length - data.simplified.length

  return (
    <div className="space-y-4">
      <Alert>{error}</Alert>
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <YourSummary net={mine?.net ?? 0} />
          <p className="text-sm text-slate-500">Group spending so far: {formatINR(data.totalSpent)}</p>
        </div>
        <Button variant="secondary" onClick={() => onSettle(null)}>
          Record a payment
        </Button>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold">Balances</h3>
          <MemberBalances balances={data.balances} currentUser={currentUser} />
        </Card>

        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">Suggested payments</h3>
            {saved > 0 && (
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                {data.simplified.length} instead of {data.pairwise.length} payments
              </span>
            )}
          </div>
          {data.simplified.length === 0 ? (
            <p className="text-sm text-slate-500">Nobody owes anything right now.</p>
          ) : (
            <ul className="space-y-2">
              {data.simplified.map((p) => (
                <li key={`${p.from.id}-${p.to.id}`} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <span className="min-w-0 text-sm">
                    <span className="font-medium">{name(p.from)}</span>
                    {p.from.id === currentUser.id ? ' pay ' : ' pays '}
                    <span className="font-medium">{name(p.to)}</span>{' '}
                    <span className="font-semibold">{formatINR(p.amount)}</span>
                  </span>
                  <Button variant="ghost" className="shrink-0 !px-2 !py-1 text-brand-700" onClick={() => onSettle(p)}>
                    Settle
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {saved > 0 && (
            <p className="mt-3 text-xs text-slate-500">
              Debt simplification combines everyone's debts so the group settles with {saved} fewer payment{saved === 1 ? '' : 's'}.
            </p>
          )}
        </Card>
      </div>

      <Card>
        <h3 className="mb-3 font-semibold">Payment history</h3>
        {settlements.length === 0 ? (
          <p className="text-sm text-slate-500">No payments recorded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {settlements.map((s) => (
              <li key={s._id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <span className="font-medium">{name(s.from)}</span> paid <span className="font-medium">{name(s.to)}</span>{' '}
                  <span className="font-semibold text-emerald-600">{formatINR(s.amount)}</span>
                  <div className="text-xs text-slate-500">
                    {new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {s.note && ` · ${s.note}`}
                  </div>
                </div>
                <button onClick={() => deleteSettlement(s)} className="shrink-0 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
