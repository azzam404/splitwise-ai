import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import api, { errorMessage } from '../api/client'
import { formatINR, toPaise, toRupeeString } from '../utils/money'
import { Alert, Button, Input } from './ui'

const today = () => new Date().toLocaleDateString('en-CA')

// The current user's largest suggested payment, so an unprefilled form starts in the right
// direction (a user who is owed should not default to paying someone).
function mySuggestion(simplified, userId) {
  return simplified.filter((p) => p.from.id === userId || p.to.id === userId).sort((a, b) => b.amount - a.amount)[0]
}

// Records a repayment between two members; `prefill` comes from a suggested payment.
export default function SettleUpForm({ group, currentUser, prefill, onSaved, onCancel }) {
  const others = group.members.filter((m) => m.id !== currentUser.id)
  const [form, setForm] = useState({
    from: prefill?.from.id ?? currentUser.id,
    to: prefill?.to.id ?? others[0]?.id ?? '',
    amount: prefill ? toRupeeString(prefill.amount) : '',
    date: today(),
    note: '',
  })
  // A ref, not state: the balances request below must see edits made while it was in flight.
  const touched = useRef(Boolean(prefill))
  const [balances, setBalances] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (patch) => {
    touched.current = true
    setForm((f) => ({ ...f, ...patch }))
  }

  // Balances drive the default direction and the "after this payment" preview. The form still
  // works without them, so a failed load is silent.
  useEffect(() => {
    let cancelled = false
    api
      .get(`/groups/${group._id}/balances`)
      .then(({ data }) => {
        if (cancelled) return
        setBalances(Object.fromEntries(data.balances.map((b) => [b.user.id, b.net])))
        const s = mySuggestion(data.simplified, currentUser.id)
        if (s && !touched.current) {
          setForm((f) => ({ ...f, from: s.from.id, to: s.to.id, amount: toRupeeString(s.amount) }))
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [group._id, currentUser.id])

  async function handleSubmit(e) {
    e.preventDefault()
    const amount = toPaise(form.amount)
    if (!(amount > 0)) return setError('Enter the amount that was paid')
    if (form.from === form.to) return setError('Choose two different people')
    setError('')
    setSaving(true)
    try {
      await api.post(`/groups/${group._id}/settlements`, { ...form, amount, note: form.note.trim() || undefined })
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  const name = (m) => (m.id === currentUser.id ? 'You' : m.name)
  const selectClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100'

  // A payment raises the payer's net balance and lowers the receiver's by the same amount.
  const amount = toPaise(form.amount)
  const preview =
    balances && amount > 0 && form.from !== form.to
      ? [form.from, form.to].map((id) => {
          const net = (balances[id] ?? 0) + (id === form.from ? amount : -amount)
          const you = id === currentUser.id
          const who = you ? 'You' : group.members.find((m) => m.id === id)?.name
          const status = net === 0 ? 'settled' : net > 0 ? `${you ? 'get' : 'gets'} back ${formatINR(net)}` : `${you ? 'owe' : 'owes'} ${formatINR(-net)}`
          return { id, who, status, tone: net === 0 ? 'text-slate-700' : net > 0 ? 'text-emerald-700' : 'text-orange-700' }
        })
      : null

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Alert>{error}</Alert>
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Who paid</span>
          <select className={selectClass} value={form.from} onChange={(e) => set({ from: e.target.value })}>
            {group.members.map((m) => (
              <option key={m.id} value={m.id}>
                {name(m)}
              </option>
            ))}
          </select>
        </label>
        <ArrowRight className="mb-2.5 h-4 w-4 text-slate-500" aria-hidden="true" />
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Paid to</span>
          <select className={selectClass} value={form.to} onChange={(e) => set({ to: e.target.value })}>
            {group.members.map((m) => (
              <option key={m.id} value={m.id}>
                {name(m)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input id="settle-amount" label="Amount (₹)" inputMode="decimal" placeholder="0.00" value={form.amount} onChange={(e) => set({ amount: e.target.value })} required />
        <Input id="settle-date" label="Date" type="date" max={today()} value={form.date} onChange={(e) => set({ date: e.target.value })} required />
      </div>
      <Input id="settle-note" label="Note (optional)" placeholder="e.g. UPI, cash" maxLength={200} value={form.note} onChange={(e) => set({ note: e.target.value })} />
      {preview && (
        <div aria-live="polite" className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <p className="mb-1 text-xs font-medium text-slate-600">After this payment</p>
          <ul className="space-y-0.5">
            {preview.map((p) => (
              <li key={p.id} className="flex justify-between gap-3">
                <span className="min-w-0 truncate font-medium text-slate-800">{p.who}</span>
                <span className={`shrink-0 tabular-nums ${p.tone}`}>{p.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Record payment'}
        </Button>
      </div>
    </form>
  )
}
