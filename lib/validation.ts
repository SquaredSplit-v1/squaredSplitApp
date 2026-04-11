export interface CountryCode {
  name: string
  flag: string
  dial: string // e.g. "+91"
  iso: string // e.g. "IN"
  minDigits: number
  maxDigits: number
  pattern?: RegExp // optional: stricter validation
}

export const COUNTRIES: CountryCode[] = [
  {
    name: 'India',
    flag: '🇮🇳',
    dial: '+91',
    iso: 'IN',
    minDigits: 10,
    maxDigits: 10,
    pattern: /^[6-9]\d{9}$/,
  },
  { name: 'United States', flag: '🇺🇸', dial: '+1', iso: 'US', minDigits: 10, maxDigits: 10 },
  { name: 'United Kingdom', flag: '🇬🇧', dial: '+44', iso: 'GB', minDigits: 10, maxDigits: 10 },
  { name: 'UAE', flag: '🇦🇪', dial: '+971', iso: 'AE', minDigits: 9, maxDigits: 9 },
  { name: 'Singapore', flag: '🇸🇬', dial: '+65', iso: 'SG', minDigits: 8, maxDigits: 8 },
  { name: 'Australia', flag: '🇦🇺', dial: '+61', iso: 'AU', minDigits: 9, maxDigits: 9 },
  { name: 'Canada', flag: '🇨🇦', dial: '+1', iso: 'CA', minDigits: 10, maxDigits: 10 },
  { name: 'Germany', flag: '🇩🇪', dial: '+49', iso: 'DE', minDigits: 10, maxDigits: 11 },
  { name: 'France', flag: '🇫🇷', dial: '+33', iso: 'FR', minDigits: 9, maxDigits: 9 },
  { name: 'Japan', flag: '🇯🇵', dial: '+81', iso: 'JP', minDigits: 10, maxDigits: 10 },
]

export const DEFAULT_COUNTRY = COUNTRIES[0] // India +91

/**
 * Validates a stripped phone number (digits only) against a country's rules.
 */
export function isValidPhoneNumber(digits: string, country: CountryCode): boolean {
  if (digits.length < country.minDigits || digits.length > country.maxDigits) return false
  if (country.pattern) return country.pattern.test(digits)
  return true
}

/**
 * Formats digits for display inside the input field.
 * India: 98765 43210 → "98765 43210"
 * US:    2025551234  → "202 555 1234"
 * Generic: raw
 */
export function formatPhoneDisplay(digits: string, country: CountryCode): string {
  if (country.iso === 'IN' || country.iso === 'CA' || country.iso === 'US') {
    if (country.iso === 'IN') {
      // XXXXX XXXXX
      const p1 = digits.slice(0, 5)
      const p2 = digits.slice(5, 10)
      return p2 ? `${p1} ${p2}` : p1
    } else {
      // XXX XXX XXXX
      const p1 = digits.slice(0, 3)
      const p2 = digits.slice(3, 6)
      const p3 = digits.slice(6, 10)
      let out = p1
      if (p2) out += ` ${p2}`
      if (p3) out += ` ${p3}`
      return out
    }
  }
  return digits
}

/**
 * Returns the full E.164 number for the API call.
 */
export function toE164(digits: string, country: CountryCode): string {
  return `${country.dial}${digits}`
}
