import { useCallback, useEffect, useState } from 'react'
import { Circle, HandCoins, Pencil, Receipt, Trash2, Undo2, UserPlus, Users } from 'lucide-react'
import api, { errorMessage } from '../api/client'
import { formatINR } from '../utils/money'
import { Alert, Button, Card, Spinner } from './ui'

const PAGE_SIZE = 30

const ICONS = {
  'group.created': Users,
  'member.joined': UserPlus,
  'expense.created': Receipt,
  'expense.updated': Pencil,
  'expense.deleted': Trash2,
  'settlement.created': HandCoins,
  'settlement.deleted': Undo2,
}

const AI_SOURCES = { 'ai-text': 'with AI quick add', 'ai-receipt': 'from a scanned receipt' }

function describe(entry, you, actorName) {
  const d = entry.details || {}
  const amount = <span className="font-semibold">{formatINR(d.amount)}</span>
  const what = <span className="font-medium">“{d.description}”</span>
  const person = (name) => (name === you ? 'you' : name)

  switch (entry.type) {
    case 'group.created':
      return 'created the group'
    case 'member.joined':
      return 'joined the group'
    case 'expense.created':
      return (
        <>
          added {what} for {amount}
          {AI_SOURCES[d.createdVia] && <span className="text-slate-500"> {AI_SOURCES[d.createdVia]}</span>}
        </>
      )
    case 'expense.updated':
      return d.previousAmount ? (
        <>
          changed {what} from {formatINR(d.previousAmount)} to {amount}
        </>
      ) : (
        <>edited {what}</>
      )
    case 'expense.deleted':
      return (
        <>
          deleted {what} ({formatINR(d.amount)})
        </>
      )
    case 'settlement.created':
      // Usually the payer records their own payment: "Rahul paid you ₹850".
      return d.fromName === actorName ? (
        <>
          paid {person(d.toName)} {amount}
        </>
      ) : (
        <>
          recorded {person(d.fromName)} paying {person(d.toName)} {amount}
        </>
      )
    case 'settlement.deleted':
      return (
        <>
          removed a payment of {amount} from {person(d.fromName)} to {person(d.toName)}
        </>
      )
    default:
      return 'did something'
  }
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
const UNITS = [
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
]

function timeAgo(iso) {
  const seconds = (new Date(iso) - Date.now()) / 1000
  if (Math.abs(seconds) >= 7 * 86400) {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}

export default function ActivityFeed({ groupId, currentUser, refreshKey }) {
  const [entries, setEntries] = useState(null)
  const [page, setPage] = useState({ current: 0, pages: 0 })
  const [error, setError] = useState('')

  const fetchPage = useCallback(
    (pageNumber) => api.get(`/groups/${groupId}/activity`, { params: { page: pageNumber, limit: PAGE_SIZE } }),
    [groupId],
  )

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data } = await fetchPage(1)
        if (cancelled) return
        setEntries(data.activity)
        setPage({ current: data.page, pages: data.pages })
        setError('')
      } catch (err) {
        if (!cancelled) setError(errorMessage(err))
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [fetchPage, refreshKey])

  async function loadMore() {
    try {
      const { data } = await fetchPage(page.current + 1)
      setEntries((prev) => [...prev, ...data.activity])
      setPage({ current: data.page, pages: data.pages })
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  if (error && !entries) return <Alert>{error}</Alert>
  if (!entries) return <Spinner />

  return (
    <Card>
      <h3 className="mb-3 font-semibold">Activity</h3>
      <Alert>{error}</Alert>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">Nothing has happened in this group yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {entries.map((entry) => {
            const isYou = entry.actor?.id === currentUser.id
            const Icon = ICONS[entry.type] || Circle
            return (
              <li key={entry._id} className="flex gap-3 py-3 text-sm">
                <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <p className="break-words">
                    <span className="font-medium">{isYou ? 'You' : entry.actor?.name || 'Former member'}</span>{' '}
                    {describe(entry, currentUser.name, entry.actor?.name)}
                  </p>
                  <time dateTime={entry.createdAt} className="text-xs text-slate-500" title={new Date(entry.createdAt).toLocaleString('en-IN')}>
                    {timeAgo(entry.createdAt)}
                  </time>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {page.current < page.pages && (
        <div className="pt-3 text-center">
          <Button variant="secondary" onClick={loadMore}>
            Load more
          </Button>
        </div>
      )}
    </Card>
  )
}
