import type { Book, ReadingRecord } from '../types'

export const currentYear = () => new Date().getFullYear()
export const indexBooks = (books: Book[]) => new Map(books.map((book) => [book.id, book]))
export function dateInput(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export const parseDate = (value: string) => new Date(`${value}T12:00:00`)
export const formatDate = (date?: Date) =>
  date
    ? new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(
        date,
      )
    : '—'
export const spineWidth = (pages: number) =>
  Math.min(66, Math.max(28, 22 + (Number.isFinite(pages) && pages > 0 ? pages : 300) * 0.07))
export const completedIn = (records: ReadingRecord[], year: number) =>
  records.filter((r) => r.status === 'COMPLETED' && r.finishedAt?.getFullYear() === year)
export function arrangeShelves(records: ReadingRecord[], books: Book[], width: number) {
  const rows: ReadingRecord[][] = [[]]
  const booksById = indexBooks(books)
  let used = 0
  for (const record of records) {
    const size = spineWidth(booksById.get(record.bookId)?.pageCount ?? 300) + 4
    if (used + size > width && rows.at(-1)!.length) {
      rows.push([])
      used = 0
    }
    rows.at(-1)!.push(record)
    used += size
  }
  return rows
}
export function statistics(records: ReadingRecord[], books: Book[], year: number) {
  const completed = completedIn(records, year)
  const months = Array<number>(12).fill(0)
  const genres: Record<string, number> = {}
  const booksById = indexBooks(books)
  let pages = 0
  for (const record of completed) {
    const book = booksById.get(record.bookId)
    pages += book?.pageCount ?? 300
    months[record.finishedAt!.getMonth()]++
    if (book?.genre && book.genre !== '미분류') genres[book.genre] = (genres[book.genre] ?? 0) + 1
  }
  const rated = completed.filter((r) => r.rating)
  return {
    count: completed.length,
    pages,
    average: rated.length ? rated.reduce((sum, r) => sum + r.rating!, 0) / rated.length : 0,
    months,
    genres: Object.entries(genres).sort((a, b) => b[1] - a[1]),
  }
}
export function validateCompletion(startedAt: Date, finishedAt: Date, rating: number) {
  if (!Number.isFinite(+startedAt) || !Number.isFinite(+finishedAt))
    return '읽기 시작일과 완독일을 입력해 주세요.'
  if (dateInput(finishedAt) > dateInput()) return '완독일은 오늘보다 이후일 수 없어요.'
  if (startedAt > finishedAt) return '완독일은 읽기 시작일보다 빠를 수 없어요.'
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return '별점을 선택해 주세요.'
  return ''
}
