/** Static app-wide constants: supported languages, time zones, support + store links. */

// import at bottom to avoid a cycle in constants consumers that import early
import { Platform } from 'react-native'

export const SUPPORT_EMAIL = 'support@squaredsplit.app'

export interface LanguageOption {
  code: string
  label: string
  native: string
}

/** Matches the Figma "Select language" sheet. App UI stays English for now —
 *  the selection is stored on the profile and feeds i18n when it lands. */
export const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English (default)', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'es', label: 'Spanish', native: 'Español' },
  { code: 'fr', label: 'French', native: 'Français' },
  { code: 'de', label: 'German', native: 'Deutsch' },
  { code: 'ja', label: 'Japanese', native: '日本語' },
]

export interface TimezoneOption {
  id: string
  label: string
}

export const TIME_ZONES: TimezoneOption[] = [
  { id: 'Asia/Kolkata', label: 'India (IST)' },
  { id: 'Asia/Dubai', label: 'Dubai (GST)' },
  { id: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { id: 'Asia/Karachi', label: 'Pakistan (PKT)' },
  { id: 'Asia/Dhaka', label: 'Bangladesh (BST)' },
  { id: 'Asia/Kathmandu', label: 'Nepal (NPT)' },
  { id: 'Asia/Colombo', label: 'Sri Lanka (MVT/+5:30)' },
  { id: 'Europe/London', label: 'UK (GMT/BST)' },
  { id: 'Europe/Berlin', label: 'Central Europe (CET)' },
  { id: 'America/New_York', label: 'US Eastern (ET)' },
  { id: 'America/Chicago', label: 'US Central (CT)' },
  { id: 'America/Los_Angeles', label: 'US Pacific (PT)' },
  { id: 'Australia/Sydney', label: 'Australia Eastern (AET)' },
  { id: 'UTC', label: 'UTC' },
]

/** Device time zone, if it matches a supported option. */
export function detectedTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null
  } catch {
    return null
  }
}

// Store links — iOS App Store id is the live ASC app (6801000587).
export const APP_STORE_ID = '6801000587'
export const PLAY_PACKAGE = 'com.squaredsplit.app'

export function rateAppUrl(): string {
  return Platform.select({
    ios: `itms-apps://itunes.apple.com/app/id${APP_STORE_ID}?action=write-review`,
    android: `market://details?id=${PLAY_PACKAGE}`,
    default: `https://apps.apple.com/app/id${APP_STORE_ID}`,
  }) as string
}

export function appStoreListingUrl(): string {
  return `https://apps.apple.com/app/id${APP_STORE_ID}`
}
