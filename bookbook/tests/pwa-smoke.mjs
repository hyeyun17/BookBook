import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('http://127.0.0.1:4173/')
  await page.getByRole('button', { name: '로컬 미리보기', exact: true }).click()
  await page.locator('.shelf-board').waitFor()
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await page.locator('.shelf-board').waitFor()
  assert.equal(await page.evaluate(() => !!navigator.serviceWorker.controller), true)
  const manifest = await page.evaluate(async () => (await fetch('/manifest.webmanifest')).json())
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.icons.length, 3)
  assert.equal(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--color-background')
        .trim()
        .toUpperCase(),
    ),
    '#F7F4EE',
  )
  await page.screenshot({ path: 'test-results/pwa-home.png', fullPage: true })
  await context.setOffline(true)
  await page.reload()
  await page.locator('.shelf-board').waitFor()
  assert.match(await page.locator('.pwa-notice').innerText(), /오프라인/)
  await page.getByRole('link', { name: '라이브러리', exact: true }).click()
  await page.reload()
  await page.locator('.library-tools').waitFor()
  assert.deepEqual(errors, [])
  console.log(
    'PASS: production bundle, manifest, service worker control, offline reload and SPA navigation',
  )
} finally {
  await browser.close()
}
