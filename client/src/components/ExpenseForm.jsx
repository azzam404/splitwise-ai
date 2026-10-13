import { useMemo, useState } from 'react'
import api, { errorMessage } from '../api/client'
import { CATEGORIES } from '../utils/categories'
import { formatINR, toPaise, toRupeeString } from '../utils/money'
import { Alert, Button, Input } from './ui'

const SPLIT_TYPES = [
  { value: 'equal', label: 'Equally' },
  { value: 'exact', label: 'Exact amounts' },
  { value: 'percentage', label: 'Percentages' },
]

// Local calendar date as YYYY-MM-DD (toISOString would use UTC and can be off by a day).
const today = () => new Date().toLocaleDateString('en-CA')

function initialState(group, currentUser, expense, aiDraft) {
  const memberIds = group.members.map((m) => m.id)
  if (aiDraft) {
    // AI drafts use the API's shape (paise, user ids); convert to form values.
    const d = aiDraft.draft
    const byUser = Object.fromEntries(d.participants.map((p) => [p.user, p]))
    return {
      description: d.description,
      amount: toRupeeString(d.amount),
      category: d.category,
      paidBy: d.paidBy,
      date: d.date,
      splitType: d.splitType,
      selected: Object.fromEntries(memberIds.map((id) => [id, Boolean(byUser[id])])),
      exact: Object.fromEntries(d.participants.filter((p) => p.amount != null).map((p) => [p.user, toRupeeString(p.amount)])),
      percent: Object.fromEntries(d.participants.filter((p) => p.percent != null).map((p) => [p.user, String(p.percent)])),
    }
  }
  if (!expense) {
    return {
      description: '',
      amount: '',
      category: 'food',
      paidBy: currentUser.id,
      date: today(),
      splitType: 'equal',
      selected: Object.fromEntries(memberIds.map((id) => [id, true])),
      exact: {},
      percent: {},
    }
  }
  const byUser = Object.fromEntries(expense.splits.map((s) => [s.user.id, s]))
  return {
    description: expense.description,
    amount: toRupeeString(expense.amount),
    category: expense.category,
    paidBy: expense.paidBy.id,
    date: expense.date.slice(0, 10),
    splitType: expense.splitType,
    selected: Object.fromEntries(memberIds.map((id) => [id, Boolean(byUser[id])])),
    exact: Object.fromEntries(expense.splits.map((s) => [s.user.id, toRupeeString(s.amount)])),
    percent: Object.fromEntries(expense.splits.map((s) => [s.user.id, s.percent != null ? String(s.percent) : ''])),
  }
}

function AiNotice({ aiDraft }) {
  const { notes = [], items = [], source } = aiDraft
  return (
    <div className="space-y-1 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-slate-700">
      <p className="font-medium text-brand-700">
        ✨ Filled in from your {source === 'receipt' ? 'receipt' : 'description'}. Please check before saving.
      </p>
      {notes.length > 0 && (
        <ul className="list-disc pl-5 text-xs text-slate-600">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      {items.length > 0 && (
        <details className="text-xs text-slate-600">
          <summary className="cursor-pointer">Items on the receipt ({items.length})</summary>
          <ul className="mt-1 space-y-0.5">
            {items.map((item, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="truncate">{item.name}</span>
                <span className="tabular-nums">{formatINR(item.amount)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

export default function ExpenseForm({ group, currentUser, expense, aiDraft, onSaved, onCancel }) {
  const [form, setForm] = useState(() => initialState(group, currentUser, expense, aiDraft))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const setIn = (key, id, value) => setForm((f) => ({ ...f, [key]: { ...f[key], [id]: value } }))

  const amountPaise = toPaise(form.amount)
  const participants = group.members.filter((m) => form.selected[m.id])

  // Live check that the split adds up before we hit the API.
  const summary = useMemo(() => {
    if (!participants.length) return { ok: false, text: 'Pick at least one person' }
    if (!(amountPaise > 0)) return { ok: false, text: 'Enter an amount' }
    if (form.splitType === 'equal') {
      return { ok: true, text: `${formatINR(Math.floor(amountPaise / participants.length))} per person` }
    }
    if (form.splitType === 'exact') {
      const total = participants.reduce((t, m) => t + (toPaise(form.exact[m.id] ?? '') || 0), 0)
      const left = amountPaise - total
      return left === 0
        ? { ok: true, text: 'Amounts add up ✓' }
        : { ok: false, text: `${formatINR(Math.abs(left))} ${left > 0 ? 'left to assign' : 'over the total'}` }
    }
    const total = participants.reduce((t, m) => t + (Number(form.percent[m.id]) || 0), 0)
    const left = Math.round((100 - total) * 100) / 100
    return Math.abs(left) <= 0.01
      ? { ok: true, text: 'Percentages add up to 100% ✓' }
      : { ok: false, text: `${Math.abs(left)}% ${left > 0 ? 'left to assign' : 'over 100%'}` }
  }, [participants, amountPaise, form.splitType, form.exact, form.percent])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!summary.ok) return setError(summary.text)
    setError('')
    setSaving(true)

    const payload = {
      description: form.description.trim(),
      amount: amountPaise,
      category: form.category,
      paidBy: form.paidBy,
      date: form.date,
      splitType: form.splitType,
      participants: participants.map((m) => ({
        user: m.id,
        ...(form.splitType === 'exact' && { amount: toPaise(form.exact[m.id] ?? '') || 0 }),
        ...(form.splitType === 'percentage' && { percent: Number(form.percent[m.id]) || 0 }),
      })),
      ...(aiDraft && { createdVia: aiDraft.draft.createdVia }),
    }

    try {
      const { data } = expense
        ? await api.patch(`/expenses/${expense._id}`, payload)
        : await api.post(`/groups/${group._id}/expenses`, payload)
      onSaved(data.expense)
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  const selectClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {aiDraft && <AiNotice aiDraft={aiDraft} />}
      <Alert>{error}</Alert>

      <Input
        id="description"
        label="Description"
        placeholder="e.g. Dinner at Fisherman's Wharf"
        value={form.description}
        onChange={(e) => set({ description: e.target.value })}
        required
        maxLength={120}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          id="amount"
          label="Amount (₹)"
          inputMode="decimal"
          placeholder="0.00"
          value={form.amount}
          onChange={(e) => set({ amount: e.target.value })}
          required
        />
        <Input id="date" label="Date" type="date" value={form.date} max={today()} onChange={(e) => set({ date: e.target.value })} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Paid by</span>
          <select className={selectClass} value={form.paidBy} onChange={(e) => set({ paidBy: e.target.value })}>
            {group.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id === currentUser.id ? 'You' : m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Category</span>
          <select className={selectClass} value={form.category} onChange={(e) => set({ category: e.target.value })}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">Split</legend>
        <div className="mb-3 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
          {SPLIT_TYPES.map((t) => (
            <button
              type="button"
              key={t.value}
              onClick={() => set({ splitType: t.value })}
              className={`rounded-md px-2 py-1.5 text-xs font-medium sm:text-sm ${
                form.splitType === t.value ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {group.members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-3 py-2">
              <input
                type="checkbox"
                id={`p-${m.id}`}
                checked={Boolean(form.selected[m.id])}
                onChange={(e) => setIn('selected', m.id, e.target.checked)}
                className="h-4 w-4 accent-brand-600"
              />
              <label htmlFor={`p-${m.id}`} className="flex-1 text-sm">
                {m.id === currentUser.id ? 'You' : m.name}
              </label>
              {form.splitType === 'exact' && (
                <input
                  aria-label={`Amount for ${m.name}`}
                  inputMode="decimal"
                  placeholder="0.00"
                  disabled={!form.selected[m.id]}
                  value={form.exact[m.id] ?? ''}
                  onChange={(e) => setIn('exact', m.id, e.target.value)}
                  className="w-24 rounded-md border border-slate-300 px-2 py-1 text-right text-sm disabled:bg-slate-50"
                />
              )}
              {form.splitType === 'percentage' && (
                <div className="flex items-center gap-1">
                  <input
                    aria-label={`Percent for ${m.name}`}
                    inputMode="decimal"
                    placeholder="0"
                    disabled={!form.selected[m.id]}
                    value={form.percent[m.id] ?? ''}
                    onChange={(e) => setIn('percent', m.id, e.target.value)}
                    className="w-16 rounded-md border border-slate-300 px-2 py-1 text-right text-sm disabled:bg-slate-50"
                  />
                  <span className="text-sm text-slate-500">%</span>
                </div>
              )}
            </li>
          ))}
        </ul>
        <p className={`mt-2 text-sm ${summary.ok ? 'text-emerald-600' : 'text-amber-600'}`}>{summary.text}</p>
      </fieldset>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : expense ? 'Save changes' : 'Add expense'}
        </Button>
      </div>
    </form>
  )
}
