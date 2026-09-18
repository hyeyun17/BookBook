import { test, expect, type Page } from '@playwright/test'

const fixture = {
  isbn: '8937460440 9788937460449',
  title: '데미안',
  authors: ['헤르만 헤세'],
  publisher: '민음사',
  thumbnail: '',
}
async function enter(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: '로컬 미리보기', exact: true }).click()
}
async function mockSearch(page: Page) {
  await page.route('**/api/books?**', (route) =>
    route.fulfill({ json: { documents: [fixture], meta: { is_end: true } } }),
  )
  await page.route('https://www.googleapis.com/books/**', (route) =>
    route.fulfill({
      json: {
        items: [
          {
            volumeInfo: {
              industryIdentifiers: [{ identifier: '9788937460449' }],
              pageCount: 240,
              categories: ['Fiction'],
            },
          },
        ],
      },
    }),
  )
}
async function addBook(page: Page) {
  await page.getByRole('link', { name: '책 추가', exact: true }).click()
  await page.getByRole('textbox', { name: '책 제목 또는 저자', exact: true }).fill('데미안')
  await page.getByRole('button', { name: '검색', exact: true }).click()
  await page.locator('.search-result').click()
  await page.getByRole('button', { name: '책 읽기', exact: true }).click()
  await expect(page).toHaveURL(/\/reading$/)
}
test('rating-only completion, persistence, optional review and rereading', async ({ page }) => {
  await mockSearch(page)
  await enter(page)
  await expect(page.getByRole('button', { name: '다음 연도' })).toBeDisabled()
  await addBook(page)
  await page.locator('.reading-card.is-current').click()
  await page.getByRole('button', { name: '다 읽었어요' }).click()
  await expect(page.locator('textarea')).toHaveCount(0)
  await page.getByRole('button', { name: '기록하기', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('별점')
  await page.getByRole('button', { name: '4점', exact: true }).click()
  await page.getByRole('button', { name: '기록하기', exact: true }).click()
  await expect(page.locator('.book-spine')).toHaveCount(1)
  await page.reload()
  await expect(page.locator('.book-spine')).toHaveCount(1)
  await page.locator('.book-spine').click()
  await page.getByRole('button', { name: '독후감 쓰기' }).click()
  await page.getByRole('textbox', { name: '내 기록', exact: true }).fill('다시 만나고 싶은 문장.')
  await page.getByRole('button', { name: '수정하기' }).click()
  await page.locator('.book-spine').click()
  await expect(page.locator('.review-text')).toContainText('다시 만나고 싶은 문장.')
  await page.getByRole('button', { name: '다시 읽기', exact: true }).click()
  await expect(page.locator('.reading-card')).toHaveCount(1)
  await page.getByRole('link', { name: '라이브러리', exact: true }).click()
  await expect(page.locator('.library-book')).toHaveCount(1)
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bookbook-preview-v1')!))
  expect(stored.books).toHaveLength(1)
  expect(stored.records).toHaveLength(2)
})
test('search error is actionable and empty library is searchable', async ({ page }) => {
  await enter(page)
  await page.route('**/api/books?**', (route) =>
    route.fulfill({ status: 503, json: { error: 'not configured' } }),
  )
  await page.getByRole('link', { name: '책 추가', exact: true }).click()
  await page.getByRole('textbox', { name: '책 제목 또는 저자', exact: true }).fill('책')
  await page.getByRole('button', { name: '검색', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Kakao')
  await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible()
  await page.getByRole('link', { name: '라이브러리', exact: true }).click()
  await page.getByRole('textbox', { name: '내 책 제목 또는 저자 검색' }).fill('없는 책')
  await expect(page.getByText('일치하는 책이 없어요')).toBeVisible()
})
test('multiple reading books select the latest and navigate both directions', async ({ page }) => {
  await mockSearch(page)
  await enter(page)
  await addBook(page)
  await addBook(page)
  await expect(page.locator('.reading-card')).toHaveCount(2)
  await expect(page.getByRole('button', { name: '다음 책', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: '이전 책', exact: true }).click()
  await expect(page.getByRole('button', { name: '이전 책', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: '다음 책', exact: true })).toBeEnabled()
})
test('shelves wrap, library filters and statistics include all completed records', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  await page.evaluate(() => {
    const now = new Date()
    const year = now.getFullYear()
    const books = Array.from({ length: 24 }, (_, i) => ({
      id: String(i),
      isbn: String(i),
      title: `책 ${String(i).padStart(2, '0')}`,
      authors: [i % 2 ? '작가 하나' : '작가 둘'],
      publisher: '북북출판',
      thumbnail: '',
      genre: i % 2 ? 'Fiction' : '미분류',
      pageCount: 300 + i * 7,
    }))
    const records = books.map((b, i) => ({
      id: `r${i}`,
      bookId: b.id,
      userId: 'local-preview',
      status: 'COMPLETED',
      startedAt: new Date(year, 0, 1),
      finishedAt: new Date(year, 0, i + 1),
      completedAt: new Date(year, 0, i + 1),
      rating: (i % 5) + 1,
      review: '',
      createdAt: new Date(year, 0, 1),
      updatedAt: now,
    }))
    localStorage.setItem('bookbook-preview-v1', JSON.stringify({ books, records }))
    sessionStorage.setItem('bookbook-preview', 'true')
  })
  await page.reload()
  await expect(page.locator('.book-spine')).toHaveCount(24)
  expect(await page.locator('.shelf-row').count()).toBeGreaterThan(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({ path: testInfo.outputPath('home.png'), fullPage: true })
  await page.getByRole('link', { name: '라이브러리', exact: true }).click()
  await expect(page.locator('.library-book')).toHaveCount(24)
  await page.getByRole('textbox', { name: '내 책 제목 또는 저자 검색' }).fill('작가 하나')
  await expect(page.locator('.library-book')).toHaveCount(12)
  await page.getByRole('combobox', { name: '정렬' }).selectOption('highest')
  await expect(
    page.locator('.library-book').first().getByRole('img', { name: '5점 / 5점' }),
  ).toBeVisible()
  await page.getByRole('link', { name: '마이페이지', exact: true }).click()
  await expect(page.locator('.stats-grid')).toContainText('24')
  await expect(page.locator('.genre-row')).toContainText('100%')
  await page.screenshot({ path: testInfo.outputPath('stats.png'), fullPage: true })
})
