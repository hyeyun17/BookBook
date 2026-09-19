import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { arrangeShelves, indexBooks, spineWidth } from '../utils/reading'
import type { Book, ReadingRecord } from '../types'
const colors = ['#526052', '#B2A58A', '#867669', '#6D7774', '#A18A72', '#C1BBA6', '#787D65']
export function Bookshelf({
  records,
  books,
  newId,
  onSelect,
}: {
  records: ReadingRecord[]
  books: Book[]
  newId?: string
  onSelect: (record: ReadingRecord) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const booksById = useMemo(() => indexBooks(books), [books])
  const [width, setWidth] = useState(0)
  const scrolled = useRef<string | undefined>(undefined)
  useLayoutEffect(() => {
    const observer = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width))
    observer.observe(ref.current!)
    return () => observer.disconnect()
  }, [])
  useLayoutEffect(() => {
    if (width && newId && scrolled.current !== newId) {
      const inserted = ref.current?.querySelector('.spine-enter')
      if (inserted) {
        inserted.scrollIntoView({ block: 'center', behavior: 'instant' })
        scrolled.current = newId
      }
    }
  }, [width, newId])
  const rows = arrangeShelves(records, books, Math.max(0, width - 32))
  const previousRows = arrangeShelves(
    records.filter((r) => r.id !== newId),
    books,
    Math.max(0, width - 32),
  )
  return (
    <div className="bookshelf" ref={ref}>
      {width > 0 &&
        rows.map((row, index) => {
          const newShelf = !!newId && index >= previousRows.length
          return (
            <div
              key={row[0]?.id || 'empty'}
              className={`shelf-row ${newShelf ? 'shelf-enter' : ''}`}
            >
              <div className="shelf-books">
                {row.map((record) => {
                  const book = booksById.get(record.bookId)
                  if (!book) return null
                  const hash = [...book.id].reduce((n, c) => n + c.charCodeAt(0), 0)
                  return (
                    <button
                      key={record.id}
                      className={`book-spine ${newId === record.id ? 'spine-enter' : ''}`}
                      style={
                        {
                          width: spineWidth(book.pageCount),
                          height: 166 + (hash % 44),
                          backgroundColor: colors[hash % colors.length],
                          '--enter-delay': newShelf ? '550ms' : '100ms',
                        } as CSSProperties
                      }
                      onClick={() => onSelect(record)}
                      aria-label={`${book.title}, ${record.rating}점, 기록 보기`}
                    >
                      <span className="spine-mark">b.</span>
                      <strong>{book.title}</strong>
                      <small>{book.authors[0]}</small>
                    </button>
                  )
                })}
                {!records.length && (
                  <div className="empty-shelf">
                    <div className="outline-books">
                      <i />
                      <i />
                      <i />
                    </div>
                    <p>당신의 첫 번째 책을 기다리고 있어요.</p>
                    <span>다 읽은 책들이 이곳에 차곡차곡 쌓여요.</span>
                  </div>
                )}
              </div>
              <div className="shelf-board" />
              <span className="shelf-number">{String(index + 1).padStart(2, '0')}</span>
            </div>
          )
        })}
    </div>
  )
}
