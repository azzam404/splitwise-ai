export default function UndoToast({ pending, onUndo }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-40 flex justify-center">
      {pending && (
        <div className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-xl bg-slate-900 py-2 pr-2 pl-4 text-sm text-white shadow-xl">
          <span className="min-w-0 truncate">{pending.message}</span>
          <button
            type="button"
            onClick={onUndo}
            className="shrink-0 rounded-lg px-3 py-2 font-semibold text-brand-100 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-brand-100"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  )
}
