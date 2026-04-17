export function generateCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount)
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-AU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function canLeave(leaveRestriction: string, eventDate: string | null): { allowed: boolean; reason?: string } {
  if (leaveRestriction === 'never') {
    return { allowed: false, reason: 'The organiser has disabled leaving this event.' }
  }
  if (leaveRestriction === 'none' || !eventDate) {
    return { allowed: true }
  }

  const daysMap: Record<string, number> = { '1_day': 1, '3_days': 3, '7_days': 7 }
  const requiredDays = daysMap[leaveRestriction] ?? 0
  const daysUntil = (new Date(eventDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)

  if (daysUntil > requiredDays) return { allowed: true }

  const label = requiredDays === 1 ? '1 day' : `${requiredDays} days`
  return { allowed: false, reason: `You can only leave up to ${label} before the event.` }
}

export const LEAVE_RESTRICTION_LABELS: Record<string, string> = {
  none: 'Anytime',
  '1_day': 'Up to 1 day before',
  '3_days': 'Up to 3 days before',
  '7_days': 'Up to 7 days before',
  never: 'Never',
}
