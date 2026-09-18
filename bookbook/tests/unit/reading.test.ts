import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  arrangeShelves,
  completedIn,
  dateInput,
  parseDate,
  spineWidth,
  statistics,
  validateCompletion,
} from '../../src/utils/reading'
import { normalizeBook, enrichBook } from '../../src/services/books'
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
    expect(await enrichBook(book)).toEqual(book)
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
    expect(await enrichBook(book)).toMatchObject({ pageCount: 240, genre: 'Literature' })
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
