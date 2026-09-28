import { DEFAULT_FORMAT_LOCALE, formatDate, formatDateTime, formatNumber, localeFromHeader, validTimeZone, type FormatLocale } from '~/utils/format'

export const TIME_ZONE_COOKIE = 'wrote-tz'

/**
 * The locale for numbers and dates. The server derives it from the request (Accept-Language, the time zone
 * cookie) and hands it to the client in the payload, so hydration renders the same text; after mounting,
 * the client switches to the browser's own locale (see `plugins/format-locale.client.ts`).
 */
export function useFormatLocale() {
  return useState<FormatLocale>('format-locale', () => {
    if (import.meta.client) return browserFormatLocale()
    return {
      locale: localeFromHeader(useRequestHeaders(['accept-language'])['accept-language']) ?? DEFAULT_FORMAT_LOCALE.locale,
      timeZone: validTimeZone(useCookie(TIME_ZONE_COOKIE).value) ?? DEFAULT_FORMAT_LOCALE.timeZone,
    }
  })
}

export function browserFormatLocale(): FormatLocale {
  const options = Intl.DateTimeFormat().resolvedOptions()
  return { locale: navigator.language || options.locale, timeZone: options.timeZone }
}

/** Formatters bound to the current locale; safe to use in SSR-rendered templates. */
export function useFormat() {
  const current = useFormatLocale()
  return {
    number: (value: number) => formatNumber(value, current.value),
    date: (value: string | Date) => formatDate(value, current.value),
    dateTime: (value: string | Date) => formatDateTime(value, current.value),
  }
}
