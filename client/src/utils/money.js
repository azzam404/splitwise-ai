// The API works in integer paise; the UI shows and accepts rupees.

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

export function formatINR(paise) {
  return inr.format((paise || 0) / 100)
}

// Parses a rupee string like "1,250.5" into paise, or returns NaN if invalid.
export function toPaise(rupees) {
  const value = Number(String(rupees).replace(/,/g, '').trim())
  if (String(rupees).trim() === '' || !Number.isFinite(value)) return NaN
  return Math.round(value * 100)
}

export function toRupeeString(paise) {
  return (paise / 100).toFixed(2).replace(/\.00$/, '')
}
