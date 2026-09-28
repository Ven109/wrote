/** Locale and time zone used to format numbers and dates (identical on server and client during hydration). */
export interface FormatLocale {
  locale: string
  timeZone: string
}

export const DEFAULT_FORMAT_LOCALE: FormatLocale = { locale: 'en-US', timeZone: 'UTC' }

/** First usable language tag of an `Accept-Language` header, e.g. `de-DE,de;q=0.9` → `de-DE`. */
export function localeFromHeader(header: string | undefined): string | null {
  const tag = header?.split(',')[0]?.split(';')[0]?.trim()
  if (!tag || tag === '*') return null
  return supported(tag) ? tag : null
}

/** A valid IANA time zone, or null. */
export function validTimeZone(zone: string | null | undefined): string | null {
  if (!zone) return null
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone })
    return zone
  }
  catch {
    return null
  }
}

function supported(tag: string): boolean {
  try {
    return Intl.NumberFormat.supportedLocalesOf(tag).length > 0
  }
  catch {
    return false
  }
}

export function formatNumber(value: number, { locale }: FormatLocale): string {
  return new Intl.NumberFormat(locale).format(value)
}

/** Calendar date, e.g. `28.9.2026` (de) or `9/28/2026` (en-US). */
export function formatDate(value: string | Date, { locale, timeZone }: FormatLocale): string {
  return new Date(value).toLocaleDateString(locale, { timeZone })
}

/** Date and time, e.g. `Sep 28, 2026, 6:27 PM`. */
export function formatDateTime(value: string | Date, { locale, timeZone }: FormatLocale): string {
  return new Date(value).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone })
}
