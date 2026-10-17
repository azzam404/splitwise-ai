import { CarTaxiFront, Clapperboard, House, Lightbulb, Pill, Plane, Receipt, ShoppingBag, ShoppingCart, Utensils } from 'lucide-react'

// Mirrors the server's expense categories (server/src/models/Expense.js).
// `icon` is a lucide component, drawn in one stroke weight rather than platform emoji.
export const CATEGORIES = [
  { value: 'food', label: 'Food & dining', icon: Utensils },
  { value: 'groceries', label: 'Groceries', icon: ShoppingCart },
  { value: 'travel', label: 'Travel', icon: Plane },
  { value: 'transport', label: 'Transport', icon: CarTaxiFront },
  { value: 'rent', label: 'Rent', icon: House },
  { value: 'utilities', label: 'Utilities', icon: Lightbulb },
  { value: 'entertainment', label: 'Entertainment', icon: Clapperboard },
  { value: 'shopping', label: 'Shopping', icon: ShoppingBag },
  { value: 'health', label: 'Health', icon: Pill },
  { value: 'other', label: 'Other', icon: Receipt },
]

export const categoryMeta = (value) => CATEGORIES.find((c) => c.value === value) || CATEGORIES.at(-1)
