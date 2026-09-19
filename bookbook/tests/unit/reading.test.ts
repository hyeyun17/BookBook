import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import {
  arrangeShelves,
  completedIn,
  dateInput,
  parseDate,
  spineWidth,
  statistics,
  validateCompletion,
} from '../../src/utils/reading'
import { normalizeBook, searchBooks } from '../../src/services/books'
import { bookSearch } from '../../server/book-search'
import type { Book, ReadingRecord } from '../../src/types'
const book: Book = {
  id: 'one',
  isbn: '9788937460449',
  title: '데미안',
  authors: ['헤르만 헤세'],
  publisher: '민음사',
  thumbnail: '',
  pageCount: 300,
  genre: 'Fiction',
}
const record = (id: string, finishedAt: Date): ReadingRecord => ({
  id,
  bookId: book.id,
  userId: 'user',
  status: 'COMPLETED',
  startedAt: new Date(2025, 0, 1),
  finishedAt,
  rating: 4,
  createdAt: new Date(2025, 0, 1),
  updatedAt: finishedAt,
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.useRealTimers()
})
describe('reading calculations', () => {
  it('uses continuous bounded spine widths', () => {
    expect(spineWidth(301) - spineWidth(300)).toBeCloseTo(0.07)
    expect(spineWidth(1)).toBe(28)
    expect(spineWidth(10000)).toBe(66)
    expect(spineWidth(NaN)).toBe(spineWidth(300))
  })
  it('adds shelves without losing reading order, including rereads', () => {
    const records = Array.from({ length: 5 }, (_, i) => record(String(i), new Date(2026, 0, i + 1)))
    const rows = arrangeShelves(records, [book], 95)
    expect(rows.map((row) => row.length)).toEqual([2, 2, 1])
    expect(rows.flat().map((r) => r.id)).toEqual(records.map((r) => r.id))
    expect(arrangeShelves([], [], 300)).toEqual([[]])
  })
  it('counts by finished date, counts rereads, excludes unknown genres', () => {
    const records = [
      record('1', new Date(2026, 0, 2)),
      record('2', new Date(2026, 0, 3)),
      { ...record('3', new Date(2026, 2, 5)), bookId: 'unknown', rating: 2 },
      record('4', new Date(2025, 11, 31)),
    ]
    const stats = statistics(
      records,
      [book, { ...book, id: 'unknown', genre: '미분류', pageCount: 120 }],
      2026,
    )
    expect(stats.count).toBe(3)
    expect(stats.pages).toBe(720)
    expect(stats.months.slice(0, 3)).toEqual([2, 0, 1])
    expect(stats.genres).toEqual([['Fiction', 2]])
    expect(stats.average).toBeCloseTo(10 / 3)
    expect(completedIn(records, 2025)).toHaveLength(1)
  })
  it('validates dates and requires only a rating, not a review', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 18))
    expect(validateCompletion(parseDate('2026-09-01'), parseDate('2026-09-18'), 4)).toBe('')
    expect(validateCompletion(parseDate('2026-09-01'), parseDate('2026-09-18'), 0)).not.toBe('')
    expect(validateCompletion(parseDate('2026-09-18'), parseDate('2026-09-01'), 4)).not.toBe('')
    expect(validateCompletion(parseDate('2026-09-18'), parseDate('2026-09-19'), 4)).not.toBe('')
    expect(dateInput(parseDate('2026-01-01'))).toBe('2026-01-01')
  })
})
describe('book API boundaries', () => {
  let enrichBook: typeof import('../../src/services/books').enrichBook
  beforeEach(async () => {
    vi.stubEnv('VITE_GOOGLE_BOOKS_API_KEY', 'test-books-key')
    vi.resetModules()
    ;({ enrichBook } = await import('../../src/services/books'))
  })
  it('passes the configured key and selected ISBN to Google Books', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) })
    vi.stubGlobal('fetch', fetch)
    await enrichBook(book)
    const url = new URL(fetch.mock.calls[0][0])
    expect(url.searchParams.get('key')).toBe('test-books-key')
    expect(url.searchParams.get('q')).toBe(`isbn:${book.isbn}`)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('uses fallback without an anonymous request when the key is missing', async () => {
    vi.stubEnv('VITE_GOOGLE_BOOKS_API_KEY', '')
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    expect(await enrichBook(book)).toMatchObject({ pageCount: 300, usedFallback: true })
    expect(fetch).not.toHaveBeenCalled()
  })
  it('searches using only the Kakao proxy', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        documents: [{ isbn: book.isbn }, { isbn: '9780000000002' }],
        meta: { is_end: true },
      }),
    })
    vi.stubGlobal('fetch', fetch)
    expect((await searchBooks('test', 1)).books).toHaveLength(2)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toBe('/api/books?query=test&page=1')
  })
  it('caches concurrent and repeated requests, including rate limits', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 429 })
    vi.stubGlobal('fetch', fetch)
    const results = await Promise.all([enrichBook(book), enrichBook(book)])
    await enrichBook(book)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(results[0]).toMatchObject({ pageCount: 300, genre: '미분류', usedFallback: true })
  })
  it('skips Google for missing ISBNs and resets old metadata', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    expect(await enrichBook({ ...book, isbn: '', pageCount: 900 })).toMatchObject({
      pageCount: 300,
      genre: '미분류',
      usedFallback: true,
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('prefers ISBN13 and provides missing-field defaults', () => {
    expect(normalizeBook({ isbn: '8937460440 9788937460449' })).toMatchObject({
      id: '9788937460449',
      pageCount: 300,
      genre: '미분류',
    })
    expect(normalizeBook({ title: 'No ISBN' }).id).not.toBe('')
  })
  it('keeps safe defaults when Google Books fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect(await enrichBook(book)).toMatchObject({
      pageCount: 300,
      genre: '미분류',
      usedFallback: true,
    })
  })
  it('does not use metadata from a different ISBN', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              volumeInfo: { industryIdentifiers: [{ identifier: 'different' }], pageCount: 900 },
            },
          ],
        }),
      }),
    )
    expect((await enrichBook(book)).pageCount).toBe(300)
  })
  it('merges matching Google Books metadata', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              volumeInfo: {
                industryIdentifiers: [{ identifier: book.isbn }],
                pageCount: 240,
                categories: ['Literature'],
              },
            },
          ],
        }),
      }),
    )
    expect(await enrichBook(book)).toMatchObject({
      pageCount: 240,
      genre: 'Literature',
      usedFallback: false,
    })
    await enrichBook(book)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('rejects invalid server requests and missing credentials', async () => {
    expect((await bookSearch('', 1, 'key')).status).toBe(400)
    expect((await bookSearch('book', 51, 'key')).status).toBe(400)
    expect((await bookSearch('book', 1)).status).toBe(503)
  })
  it('hides upstream errors and preserves rate limiting', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }))
    expect((await bookSearch('book', 1, 'secret')).status).toBe(429)
  })
})
