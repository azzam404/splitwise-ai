import { useEffect, useRef, useState } from 'react'
import api, { errorMessage } from '../api/client'
import { useAiStore } from '../store/aiStore'
import { downscaleImage } from '../utils/image'
import { Alert, Button } from './ui'

const today = () => new Date().toLocaleDateString('en-CA')

const EXAMPLES = ['Paid 1200 for dinner with everyone', 'Cab 450 yesterday, split with me and one friend', 'Groceries 2,300, I owe 60% and the rest 40%']

// The group's expense composer: natural-language and receipt-photo entry, with the plain form as a
// fallback. Calls onDraft with the AI's draft, which the parent opens in the expense form for review.
export default function AiQuickAdd({ group, onDraft, onManual }) {
  const { enabled, load } = useAiStore()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(null) // 'text' | 'receipt' | null
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  useEffect(() => {
    load()
  }, [load])

  if (enabled === null) return null
  if (!enabled) {
    // Without AI, the plain form is the only way in, so it becomes the primary action.
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-3">
        <p className="text-sm text-slate-600">AI quick-add is off: the server has no Anthropic API key configured.</p>
        <Button onClick={onManual}>Add expense</Button>
      </div>
    )
  }

  async function submitText(e) {
    e.preventDefault()
    setError('')
    setBusy('text')
    try {
      const { data } = await api.post(`/groups/${group._id}/ai/parse-expense`, { text, today: today() })
      setText('')
      // The review screen echoes the original sentence next to what the AI read from it.
      onDraft({ ...data, source: 'text', input: text.trim() })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function scanReceipt(file) {
    if (!file) return
    setError('')
    setBusy('receipt')
    try {
      const image = await downscaleImage(file)
      const form = new FormData()
      form.append('receipt', image, 'receipt.jpg')
      form.append('today', today())
      const { data } = await api.post(`/groups/${group._id}/ai/scan-receipt`, form)
      onDraft({ ...data, source: 'receipt' })
    } catch (err) {
      setError(err.response ? errorMessage(err) : err.message)
    } finally {
      setBusy(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-brand-100 bg-brand-50/60 p-3">
      <form onSubmit={submitText} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="ai-text" className="sr-only">
          Describe an expense
        </label>
        <input
          id="ai-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Try: "${EXAMPLES[0]}"`}
          maxLength={500}
          disabled={Boolean(busy)}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={Boolean(busy) || text.trim().length < 3} className="flex-1 sm:flex-none">
            {busy === 'text' ? 'Reading…' : 'Quick add'}
          </Button>
          <Button type="button" variant="secondary" disabled={Boolean(busy)} onClick={() => fileRef.current?.click()} className="flex-1 sm:flex-none">
            {busy === 'receipt' ? 'Scanning…' : 'Scan receipt'}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => scanReceipt(e.target.files?.[0])}
            aria-label="Upload a receipt photo"
          />
        </div>
      </form>
      <Alert>{error}</Alert>
      <p className="text-xs text-slate-600">
        AI fills in the form for you to check — nothing is saved until you confirm. Or{' '}
        <button type="button" onClick={onManual} className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-600">
          add it manually
        </button>
        .
      </p>
    </div>
  )
}
