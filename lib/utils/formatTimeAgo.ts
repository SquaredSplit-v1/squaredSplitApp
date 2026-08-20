export function formatTimeAgo(isoDate: string): string {
  const then = new Date(isoDate).getTime()
  const now = Date.now()
  const diffSec = Math.max(0, Math.floor((now - then) / 1000))

  if (diffSec < 60) return 'Just now'
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60)
    return m === 1 ? '1 min ago' : `${m} mins ago`
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600)
    return h === 1 ? '1 hour ago' : `${h} hours ago`
  }
  if (diffSec < 604800) {
    const d = Math.floor(diffSec / 86400)
    return d === 1 ? '1 day ago' : `${d} days ago`
  }

  return new Date(isoDate).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
}
