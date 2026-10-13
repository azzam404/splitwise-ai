// Mirrors the server's expense categories (server/src/models/Expense.js).
export const CATEGORIES = [
  { value: 'food', label: 'Food & dining', icon: '🍽️' },
  { value: 'groceries', label: 'Groceries', icon: '🛒' },
  { value: 'travel', label: 'Travel', icon: '✈️' },
  { value: 'transport', label: 'Transport', icon: '🚕' },
  { value: 'rent', label: 'Rent', icon: '🏠' },
  { value: 'utilities', label: 'Utilities', icon: '💡' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎬' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️' },
  { value: 'health', label: 'Health', icon: '💊' },
  { value: 'other', label: 'Other', icon: '🧾' },
]

export const categoryMeta = (value) => CATEGORIES.find((c) => c.value === value) || CATEGORIES.at(-1)
