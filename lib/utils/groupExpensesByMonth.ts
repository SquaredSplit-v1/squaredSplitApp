export interface MonthGroup<T> {
  key: string
  label: string
  items: T[]
}

function monthLabel(date: Date): string {
  const month = new Intl.DateTimeFormat('en-GB', { month: 'long' }).format(date)
  const year = date.getFullYear() % 100
  return `${month}' ${String(year).padStart(2, '0')}`
}

export function groupByMonth<T extends { createdAt: string }>(items: T[]): MonthGroup<T>[] {
  const sorted = [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const map = new Map<string, MonthGroup<T>>()
  for (const item of sorted) {
    const d = new Date(item.createdAt)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const existing = map.get(key)
    if (existing) {
      existing.items.push(item)
    } else {
      map.set(key, { key, label: monthLabel(d), items: [item] })
    }
  }

  return [...map.values()]
}

export function formatExpenseDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 60) return `${Math.max(1, diffMin)} mins ago`
  if (diffMin < 60 * 24) return `${Math.floor(diffMin / 60)} hours ago`
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(d)
}
