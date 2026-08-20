export interface RawContact {
  id: string
  name: string
  phones: string[]
}

/** Prefer the name saved on the device for this phone, else the app profile name. */
export function labelForMatchedPhone(
  phone: string,
  profileDisplayName: string,
  raw: RawContact[]
): string {
  const c = raw.find(r => r.phones.includes(phone))
  const local = c?.name?.trim()
  return (local || profileDisplayName).trim()
}

/**
 * Normalizes a phone number to E.164 format for consistent matching.
 * Strips all non-digit characters, then prepends + if missing.
 * Falls back to null if the result is too short to be a real number.
 */
export function normalizePhone(raw: string, defaultCountryCode = '91'): string | null {
  const digits = raw.replace(/\D/g, '')

  if (digits.length < 7) return null

  // Already has country code (10+ digits with common country code lengths)
  if (digits.length >= 10) {
    // If starts with 0, strip it and add country code
    if (digits.startsWith('0')) {
      return `+${defaultCountryCode}${digits.slice(1)}`
    }
    // If 10 digits, assume local number — prepend country code
    if (digits.length === 10) {
      return `+${defaultCountryCode}${digits}`
    }
    return `+${digits}`
  }

  return null
}

/**
 * Deduplicates an array of phone strings.
 * Preserves first occurrence.
 */
export function dedupePhones(phones: string[]): string[] {
  return [...new Set(phones)]
}
