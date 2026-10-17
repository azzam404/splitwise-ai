import { useCallback, useEffect, useRef, useState } from 'react'

const UNDO_WINDOW_MS = 5000

// Deletes wait a few seconds before reaching the server so they can be undone without a restore
// endpoint. Only one delete is pending at a time: starting another (or unmounting) sends the
// previous one immediately. If the tab is closed inside the window the delete simply never
// happens, which is the safe direction for money records.
export function useUndoableDelete() {
  const [pending, setPending] = useState(null)
  const pendingRef = useRef(null)
  const timer = useRef(null)

  const commit = useCallback(() => {
    const p = pendingRef.current
    if (!p) return
    clearTimeout(timer.current)
    pendingRef.current = null
    setPending(null)
    p.commit()
  }, [])

  const schedule = useCallback(
    (p) => {
      commit()
      pendingRef.current = p
      setPending(p)
      timer.current = setTimeout(commit, UNDO_WINDOW_MS)
    },
    [commit],
  )

  const undo = useCallback(() => {
    const p = pendingRef.current
    if (!p) return
    clearTimeout(timer.current)
    pendingRef.current = null
    setPending(null)
    p.restore()
  }, [])

  useEffect(() => commit, [commit])

  return { pending, schedule, undo }
}
