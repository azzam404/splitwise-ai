import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { errorMessage } from '../api/client'
import { Alert, Button, Card, Input, Spinner } from '../components/ui'

export default function GroupsPage() {
  const [groups, setGroups] = useState(null)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')

  useEffect(() => {
    api
      .get('/groups')
      .then(({ data }) => setGroups(data.groups))
      .catch((err) => setError(errorMessage(err)))
  }, [])

  async function createGroup(e) {
    e.preventDefault()
    setError('')
    try {
      const { data } = await api.post('/groups', { name })
      setGroups((prev) => [data.group, ...prev])
      setName('')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function joinGroup(e) {
    e.preventDefault()
    setError('')
    try {
      const { data } = await api.post(`/groups/join/${code.trim()}`)
      setGroups((prev) => [data.group, ...prev.filter((g) => g._id !== data.group._id)])
      setCode('')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Your groups</h1>
      <Alert>{error}</Alert>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <form onSubmit={createGroup} className="space-y-3">
            <Input id="group-name" label="New group" placeholder="e.g. Goa Trip" value={name} onChange={(e) => setName(e.target.value)} required />
            <Button type="submit">Create group</Button>
          </form>
        </Card>
        <Card>
          <form onSubmit={joinGroup} className="space-y-3">
            <Input id="invite-code" label="Join with invite code" placeholder="e.g. 3FA9C1D2" value={code} onChange={(e) => setCode(e.target.value)} required />
            <Button type="submit" variant="secondary">
              Join group
            </Button>
          </form>
        </Card>
      </div>

      {groups === null && !error ? (
        <Spinner />
      ) : groups?.length === 0 ? (
        <p className="py-8 text-center text-slate-500">No groups yet. Create one or join with an invite code.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {groups?.map((g) => (
            <li key={g._id}>
              <Link to={`/groups/${g._id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <h2 className="font-semibold">{g.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {g.members.length} member{g.members.length === 1 ? '' : 's'}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
