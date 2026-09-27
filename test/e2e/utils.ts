import type { Page } from '@playwright/test'

/** Navigates and waits until Vue has hydrated the page, so clicks trigger handlers. */
export async function gotoHydrated(page: Page, url: string): Promise<void> {
  await page.goto(url)
  await page.waitForFunction(() => Boolean((document.querySelector('#__nuxt') as { __vue_app__?: unknown } | null)?.__vue_app__))
}
