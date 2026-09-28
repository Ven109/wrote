/** After hydration, format with the browser's locale and remember its time zone for the next server render. */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:suspense:resolve', () => {
    const browser = browserFormatLocale()
    useFormatLocale().value = browser
    useCookie(TIME_ZONE_COOKIE, { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' }).value = browser.timeZone
  })
})
