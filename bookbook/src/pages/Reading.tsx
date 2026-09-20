import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, BookOpen } from 'lucide-react'
import { indexBooks } from '../utils/reading'
import { useLibrary } from '../context/library'
import { BookCover } from '../components/BookCover'
import { RecordDetails } from '../components/RecordDetails'
import type { ReadingRecord } from '../types'
export function Reading() {
  const { books, records } = useLibrary()
  const booksById = useMemo(() => indexBooks(books), [books])
  const reading = useMemo(
    () => records.filter((r) => r.status === 'READING').sort((a, b) => +a.createdAt - +b.createdAt),
    [records],
  )
  const { state } = useLocation()
  const [index, setIndex] = useState(() =>
    Math.max(0, state?.newId ? reading.findIndex((r) => r.id === state.newId) : 0),
  )
  const [selected, setSelected] = useState<ReadingRecord | null>(null)
  const rail = useRef<HTMLDivElement>(null)
  const activeIndex = Math.min(index, Math.max(0, reading.length - 1))
  useEffect(() => {
    const children = rail.current?.children
    if (children && state?.newId)
      (children[reading.findIndex((r) => r.id === state.newId)] as HTMLElement)?.scrollIntoView({
        behavior: 'instant',
        block: 'nearest',
        inline: 'center',
      })
  }, [state?.newId, reading])
  function move(next: number) {
    ;(rail.current?.children[next] as HTMLElement)?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }
  return (
    <div className="page reading-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">BETWEEN THE PAGES</span>
          <h1>읽고 있는 순간.</h1>
          <p>끝까지 서두르지 않아도 괜찮아요.</p>
        </div>
        <Link to="/search" className="secondary-button">
          <Plus size={17} /> 책 추가
        </Link>
      </div>
      {reading.length ? (
        <>
          <div
            className="reading-carousel"
            ref={rail}
            onScroll={() => {
              const el = rail.current!
              const middle = el.scrollLeft + el.clientWidth / 2
              let nearest = 0
              let distance = Infinity
              Array.from(el.children).forEach((child, i) => {
                const card = child as HTMLElement
                const d = Math.abs(card.offsetLeft + card.offsetWidth / 2 - middle)
                if (d < distance) {
                  nearest = i
                  distance = d
                }
              })
              setIndex((current) => (current === nearest ? current : nearest))
            }}
          >
            {reading.map((record, i) => {
              const book = booksById.get(record.bookId)
              return book ? (
                <button
                  className={`reading-card ${i === activeIndex ? 'is-current' : ''} ${state?.newId === record.id ? 'reading-enter' : ''}`}
                  key={record.id}
                  onClick={() => (i === activeIndex ? setSelected(record) : move(i))}
                  aria-label={`${book.title}, ${i === activeIndex ? '상세 보기' : '이 책으로 이동'}`}
                >
                  <BookCover book={book} />
                  <span className="eyebrow">READING {String(i + 1).padStart(2, '0')}</span>
                  <h2>{book.title}</h2>
                  <p>{book.authors.join(' · ')}</p>
                </button>
              ) : null
            })}
          </div>
          <div className="carousel-controls">
            <button
              className="icon-button"
              aria-label="이전 책"
              disabled={activeIndex === 0}
              onClick={() => move(activeIndex - 1)}
            >
              <ChevronLeft />
            </button>
            <span>
              {String(activeIndex + 1).padStart(2, '0')} <i>/</i>{' '}
              {String(reading.length).padStart(2, '0')}
            </span>
            <button
              className="icon-button"
              aria-label="다음 책"
              disabled={activeIndex === reading.length - 1}
              onClick={() => move(activeIndex + 1)}
            >
              <ChevronRight />
            </button>
          </div>
          <p className="carousel-hint">좌우로 넘겨보세요. 책을 누르면 기록할 수 있어요.</p>
        </>
      ) : (
        <div className="empty-state">
          <BookOpen size={40} strokeWidth={1} />
          <h2>다음 한 권을 위한 자리</h2>
          <p>읽고 싶은 책을 추가하고 가볍게 시작해 보세요.</p>
          <Link to="/search" className="primary-button">
            <Plus size={17} /> 책 찾기
          </Link>
        </div>
      )}
      {selected && <RecordDetails record={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
