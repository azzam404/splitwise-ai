import { useState } from 'react'
import api, { errorMessage } from '../api/client'
import { toPaise, toRupeeString } from '../utils/money'
import { Alert, Button, Input } from './ui'

const today = () => new Date().toLocaleDateString('en-CA')

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
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  async function handleSubmit(e) {
    e.preventDefault()
    const amount = toPaise(form.amount)
    if (!(amount > 0)) return setError('Enter an amount')
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
        <span className="pb-2 text-slate-400" aria-hidden="true">
          →
        </span>
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
