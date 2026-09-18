import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Search as SearchIcon, BookOpen } from 'lucide-react'
import { searchBooks, enrichBook } from '../services/books'
import { useLibrary } from '../context/library'
import { BookCover } from '../components/BookCover'
import { Modal } from '../components/Modal'
import type { Book } from '../types'
export function Search() {
  const navigate = useNavigate()
  const { startReading } = useLibrary()
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [books, setBooks] = useState<Book[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Book | null>(null)
  const [enriching, setEnriching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState('')
  const controller = useRef<AbortController | null>(null)
  const selection = useRef(0)
  useEffect(
    () => () => {
      controller.current?.abort()
      selection.current++
    },
    [],
  )
  async function search(nextPage = 1) {
    const term = nextPage === 1 ? query.trim() : submitted
    if (!term) return
    controller.current?.abort()
    const active = new AbortController()
    controller.current = active
    setLoading(true)
    setError('')
    setSubmitted(term)
    if (nextPage === 1) setBooks([])
    try {
      const result = await searchBooks(term, nextPage, active.signal)
      if (active.signal.aborted) return
      setBooks((previous) =>
        nextPage === 1
          ? result.books
          : [...previous, ...result.books.filter((b) => !previous.some((p) => p.id === b.id))],
      )
      setHasMore(result.hasMore)
      setPage(nextPage)
    } catch (e) {
      if (!active.signal.aborted) setError(e instanceof Error ? e.message : '검색하지 못했어요.')
    } finally {
      if (!active.signal.aborted) setLoading(false)
    }
  }
  async function select(book: Book) {
    const request = ++selection.current
    setSelected(book)
    setEnriching(true)
    setModalError('')
    const enriched = await enrichBook(book)
    if (request === selection.current) {
      setSelected(enriched)
      setEnriching(false)
    }
  }
  return (
    <div className="page narrow-page">
      <button className="text-button back-link" onClick={() => navigate('/')}>
        <ArrowLeft size={17} /> 내 책장
      </button>
      <div className="page-heading">
        <div>
          <span className="eyebrow">FIND YOUR NEXT CHAPTER</span>
          <h1>어떤 책을 읽어볼까요?</h1>
          <p>제목이나 저자로 다음 한 권을 찾아보세요.</p>
        </div>
      </div>
      <form
        className="search-field large-search"
        onSubmit={(e) => {
          e.preventDefault()
          void search()
        }}
      >
        <SearchIcon size={21} />
        <input
          aria-label="책 제목 또는 저자"
          placeholder="책 제목 또는 저자 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={100}
        />
        <button type="submit" disabled={!query.trim() || loading}>
          검색
        </button>
      </form>
      {submitted && (
        <div className="results-heading">
          <span>“{submitted}” 검색 결과</span>
          <small>{books.length}권</small>
        </div>
      )}
      {error && (
        <div className="error-state" role="alert">
          <p>{error}</p>
          <button className="secondary-button" onClick={() => void search()}>
            다시 시도
          </button>
        </div>
      )}
      <div className="search-results">
        {books.map((book) => (
          <button className="search-result" key={book.id} onClick={() => void select(book)}>
            <BookCover book={book} />
            <div>
              <h2>{book.title}</h2>
              <p>{book.authors.join(' · ')}</p>
              <small>{book.publisher}</small>
            </div>
            <ArrowUpRight size={18} />
          </button>
        ))}
      </div>
      {loading && (
        <p className="loading-state" role="status">
          책을 찾고 있어요…
        </p>
      )}
      {!loading && !error && !books.length && (
        <div className="empty-state">
          <BookOpen size={36} strokeWidth={1} />
          <h2>{submitted ? '아직 찾지 못했어요' : '새로운 이야기가 기다리고 있어요'}</h2>
          <p>
            {submitted
              ? '다른 제목이나 저자로 검색해 보세요.'
              : '기억에 남은 제목, 좋아하는 작가부터 시작해 볼까요?'}
          </p>
        </div>
      )}
      {hasMore && !loading && !error && (
        <button className="secondary-button load-more" onClick={() => void search(page + 1)}>
          더 보기
        </button>
      )}
      {selected && (
        <Modal
          title={selected.title}
          onClose={() => {
            if (!saving) {
              selection.current++
              setSelected(null)
            }
          }}
        >
          <div className="detail-heading">
            <BookCover book={selected} />
            <span className="eyebrow">YOUR NEXT READ</span>
            <h2>{selected.title}</h2>
            <p>{selected.authors.join(' · ')}</p>
            <small>{selected.publisher}</small>
            {selected.genre !== '미분류' && <span className="tag">{selected.genre}</span>}
          </div>
          {enriching && (
            <p className="muted" role="status">
              책 정보를 확인하고 있어요…
            </p>
          )}
          <button
            className="primary-button full-width"
            disabled={saving || enriching}
            onClick={async () => {
              setSaving(true)
              try {
                const record = await startReading(selected)
                navigate('/reading', { state: { newId: record.id } })
              } catch {
                setModalError('책을 추가하지 못했어요. 연결을 확인하고 다시 시도해 주세요.')
                setSaving(false)
              }
            }}
          >
            {saving ? '추가 중…' : '책 읽기'}
            <ArrowUpRight size={18} />
          </button>
          {modalError && (
            <p className="error" role="alert">
              {modalError}
            </p>
          )}
        </Modal>
      )}
    </div>
  )
}
