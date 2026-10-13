// Months are 'YYYY-MM' strings, matching the API.

export const thisMonth = () => new Date().toLocaleDateString('en-CA').slice(0, 7)

export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return d.toISOString().slice(0, 7)
}

export function monthLabel(month, style = 'long') {
  const [y, m] = month.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', {
    month: style,
    year: style === 'long' ? 'numeric' : undefined,
    timeZone: 'UTC',
  })
}
