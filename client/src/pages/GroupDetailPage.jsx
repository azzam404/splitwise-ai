import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { errorMessage } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { Alert, Button, Card, Spinner } from '../components/ui'
import Modal from '../components/Modal'
import ExpenseForm from '../components/ExpenseForm'
import ExpenseList from '../components/ExpenseList'

const PAGE_SIZE = 20

export default function GroupDetailPage() {
  const { id } = useParams()
  const currentUser = useAuthStore((s) => s.user)
  const [group, setGroup] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [page, setPage] = useState({ current: 0, pages: 0 })
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  // null = closed, {} = new expense, {expense} = editing
  const [editor, setEditor] = useState(null)

  const loadExpenses = useCallback(
    async (pageNumber) => {
      const { data } = await api.get(`/groups/${id}/expenses`, { params: { page: pageNumber, limit: PAGE_SIZE } })
      setExpenses((prev) => (pageNumber === 1 ? data.expenses : [...prev, ...data.expenses]))
      setPage({ current: data.page, pages: data.pages })
    },
    [id],
  )

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [{ data }] = await Promise.all([api.get(`/groups/${id}`), loadExpenses(1)])
        if (!cancelled) setGroup(data.group)
      } catch (err) {
        if (!cancelled) setError(errorMessage(err))
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, loadExpenses])

  async function copyCode() {
    await navigator.clipboard.writeText(group.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function handleSaved() {
    setEditor(null)
    // Reload from the first page so ordering by date stays correct.
    loadExpenses(1).catch((err) => setError(errorMessage(err)))
  }

  async function handleDelete(expense) {
    if (!window.confirm(`Delete "${expense.description}"?`)) return
    try {
      await api.delete(`/expenses/${expense._id}`)
      setExpenses((prev) => prev.filter((e) => e._id !== expense._id))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const closeEditor = useCallback(() => setEditor(null), [])

  if (error && !group) return <Alert>{error}</Alert>
  if (!group) return <Spinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/groups" className="text-sm text-brand-600 hover:underline">
            ← All groups
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{group.name}</h1>
          {group.description && <p className="text-slate-600">{group.description}</p>}
        </div>
        <Button onClick={() => setEditor({})}>+ Add expense</Button>
      </div>

      <Alert>{error}</Alert>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <h2 className="mb-2 font-semibold">Expenses</h2>
          <ExpenseList
            expenses={expenses}
            currentUser={currentUser}
            onEdit={(expense) => setEditor({ expense })}
            onDelete={handleDelete}
          />
          {page.current < page.pages && (
            <div className="pt-3 text-center">
              <Button variant="secondary" onClick={() => loadExpenses(page.current + 1).catch((err) => setError(errorMessage(err)))}>
                Load more
              </Button>
            </div>
          )}
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

      {editor && (
        <Modal title={editor.expense ? 'Edit expense' : 'Add expense'} onClose={closeEditor}>
          <ExpenseForm
            group={group}
            currentUser={currentUser}
            expense={editor.expense}
            onSaved={handleSaved}
            onCancel={closeEditor}
          />
        </Modal>
      )}
    </div>
  )
}
