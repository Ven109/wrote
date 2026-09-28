import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime, formatNumber, localeFromHeader, validTimeZone } from './format'

const de = { locale: 'de-DE', timeZone: 'Europe/Berlin' }
const us = { locale: 'en-US', timeZone: 'UTC' }

describe('format', () => {
  it('reads the preferred language from Accept-Language', () => {
    expect(localeFromHeader('de-DE,de;q=0.9,en;q=0.8')).toBe('de-DE')
    expect(localeFromHeader('en')).toBe('en')
    expect(localeFromHeader('*')).toBeNull()
    expect(localeFromHeader('not a locale!')).toBeNull()
    expect(localeFromHeader(undefined)).toBeNull()
  })

  it('accepts only valid time zones', () => {
    expect(validTimeZone('Europe/Berlin')).toBe('Europe/Berlin')
    expect(validTimeZone('Mars/Olympus')).toBeNull()
    expect(validTimeZone(undefined)).toBeNull()
  })

  it('formats numbers and dates with the given locale and time zone', () => {
    expect(formatNumber(12345, de)).toBe('12.345')
    expect(formatNumber(12345, us)).toBe('12,345')
    expect(formatDate('2026-09-28T18:27:25Z', de)).toBe('28.9.2026')
    expect(formatDate('2026-09-28T23:30:00Z', de)).toBe('29.9.2026')
    expect(formatDate('2026-09-28T23:30:00Z', us)).toBe('9/28/2026')
    expect(formatDateTime('2026-09-28T18:27:25Z', us)).toBe('Sep 28, 2026, 6:27 PM')
  })
})
