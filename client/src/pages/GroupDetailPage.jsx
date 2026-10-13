import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { errorMessage } from '../api/client'
import { Alert, Button, Card, Spinner } from '../components/ui'

export default function GroupDetailPage() {
  const { id } = useParams()
  const [group, setGroup] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api
      .get(`/groups/${id}`)
      .then(({ data }) => setGroup(data.group))
      .catch((err) => setError(errorMessage(err)))
  }, [id])

  async function copyCode() {
    await navigator.clipboard.writeText(group.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (error) return <Alert>{error}</Alert>
  if (!group) return <Spinner />

  return (
    <div className="space-y-6">
      <div>
        <Link to="/groups" className="text-sm text-brand-600 hover:underline">
          ← All groups
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{group.name}</h1>
        {group.description && <p className="text-slate-600">{group.description}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <h2 className="mb-2 font-semibold">Expenses</h2>
          <p className="text-sm text-slate-500">Expense tracking is coming in the next milestone.</p>
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="mb-2 font-semibold">Invite friends</h2>
            <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-100 px-3 py-2">
              <code className="font-mono text-lg tracking-widest">{group.inviteCode}</code>
              <Button variant="secondary" onClick={copyCode}>
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </Card>
          <Card>
            <h2 className="mb-2 font-semibold">Members ({group.members.length})</h2>
            <ul className="space-y-2">
              {group.members.map((m) => (
                <li key={m.id} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                    {m.name[0]?.toUpperCase()}
                  </span>
                  <div className="text-sm">
                    <div className="font-medium">{m.name}</div>
                    <div className="text-slate-500">{m.email}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
