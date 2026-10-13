export function Button({ variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-500/60',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
  }
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    />
  )
}

export function Input({ label, id, error, ...props }) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        id={id}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}

export function Card({ className = '', ...props }) {
  return <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`} {...props} />
}

export function Alert({ children }) {
  if (!children) return null
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {children}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex justify-center py-12" aria-label="Loading">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
    </div>
  )
}
