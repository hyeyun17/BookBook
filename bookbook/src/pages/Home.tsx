import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Plus, BookOpen } from 'lucide-react'
import { useLibrary } from '../context/library'
import { currentYear, completedIn, indexBooks } from '../utils/reading'
import { getRecommendations } from '../services/books'
import type { Book } from '../types'
import { YearSelector } from '../components/YearSelector'
import { Bookshelf } from '../components/Bookshelf'
import { BookCover } from '../components/BookCover'
import { OnboardingGuide } from '../components/OnboardingGuide'
import { RecordDetails } from '../components/RecordDetails'
import type { ReadingRecord } from '../types'
const readingNotes = [
  '어떤 책은 답보다 좋은 질문을 남긴다.',
  '한 페이지의 집중이 하루의 방향을 바꾼다.',
  '천천히 읽은 문장은 오래 마음에 머문다.',
  '책장을 넘기는 일은 나를 만나는 일이다.',
  '오늘의 한 문장이 내일의 나를 만든다.',
  '읽는 사람의 시간은 조용히 깊어진다.',
  '좋은 책은 다 읽은 뒤에도 계속된다.',
  '한 권의 책에는 아직 만나지 못한 내가 있다.',
  '마음이 머문 문장은 쉽게 사라지지 않는다.',
  '읽기는 세상을 넓히고 나를 단단하게 한다.',
  '한 줄을 읽어도 충분히 멀리 갈 수 있다.',
  '책과 함께한 시간은 사라지지 않는다.',
  '가끔은 책이 나보다 먼저 나를 알아본다.',
  '읽는 속도보다 마음에 남는 깊이가 중요하다.',
  '오늘 펼친 책이 새로운 계절을 연다.',
  '문장 하나가 마음의 작은 불빛이 된다.',
  '책은 혼자 있는 시간을 다정하게 만든다.',
  '읽고 멈추는 순간 생각이 자란다.',
  '좋은 이야기는 삶을 보는 눈을 바꼼다.',
  '한 권씩 쌓인 시간이 결국 나의 이야기가 된다.',
]
export function Home() {
  const { records, books, user } = useLibrary()
  const location = useLocation()
  const navigate = useNavigate()
  const [arrival] = useState<{ newId?: string; year?: number }>(location.state || {})
  const [year, setYear] = useState(arrival.year || currentYear())
  const [selected, setSelected] = useState<ReadingRecord | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem(`bookbook-onboarding-v1-${user?.uid || 'guest'}`))
  const [recommendations, setRecommendations] = useState<Book[]>([])
  const [readingNote] = useState(
    () => readingNotes[Math.floor(Math.random() * readingNotes.length)],
  )
  useEffect(() => {
    if (location.state) navigate('.', { replace: true, state: null })
  }, [location.state, navigate])
  const booksById = useMemo(() => indexBooks(books), [books])
  const completed = useMemo(
    () =>
      completedIn(records, year).sort(
        (a, b) => +(a.completedAt || a.finishedAt!) - +(b.completedAt || b.finishedAt!),
      ),
    [records, year],
  )
  const shelfRecords = completed
  const reading = useMemo(() => records.filter((r) => r.status === 'READING'), [records])
  const favoriteGenre = useMemo(() => {
    const counts = new Map<string, { count: number; latest: number }>()
    for (const record of records) {
      if (record.status !== 'COMPLETED') continue
      const genre = booksById.get(record.bookId)?.genre
      if (!genre || genre === '미분류') continue
      const current = counts.get(genre) || { count: 0, latest: 0 }
      counts.set(genre, { count: current.count + 1, latest: Math.max(current.latest, +(record.finishedAt || 0)) })
    }
    return [...counts.entries()].sort((a, b) => b[1].count - a[1].count || b[1].latest - a[1].latest)[0]?.[0] || ''
  }, [booksById, records])
  const finishedIsbns = useMemo(() => new Set(records.map((record) => booksById.get(record.bookId)?.isbn).filter(Boolean)), [booksById, records])
  useEffect(() => {
    if (!favoriteGenre) { setRecommendations([]); return }
    const controller = new AbortController()
    getRecommendations(favoriteGenre, controller.signal).then(setRecommendations).catch(() => setRecommendations([]))
    return () => controller.abort()
  }, [favoriteGenre])
  const visibleRecommendations = recommendations.filter((book) => !book.isbn || !finishedIsbns.has(book.isbn)).slice(0, 3)
  return (
    <div className="page home-page">
      <section className="page-heading">
        <div>
          <span className="eyebrow">MY LITTLE READING ROOM</span>
          <h1>
            한 권씩 쌓이는,
            <br />
            <span className="serif-accent">나만의 책장.</span>
          </h1>
          <p>
            긴 글이 아니어도 괜찮아요.
            <br className="mobile-only" /> 읽은 시간은 책으로 남으니까.
          </p>
        </div>
        <Link to="/search" className="primary-button">
          <Plus size={18} /> 책 추가
        </Link>
      </section>
      <section className="shelf-section" aria-label={`${year}년 책장`}>
        <div className="shelf-toolbar">
          <YearSelector year={year} onChange={setYear} />
          <span className="shelf-count">
            올해의 책장 <b>{completed.length}</b>권
          </span>
        </div>
        <Bookshelf
          records={shelfRecords}
          books={books}
          newId={arrival.newId}
          onSelect={setSelected}
        />
        <div className="shelf-caption">
          <span>{year} READING COLLECTION</span>
          <span>책 한 권, 나의 한 조각.</span>
        </div>
      </section>
      <section className="home-bottom">
        <div className="reading-summary">
          <div className="section-label">
            <BookOpen size={18} />
            <h2>지금 읽고 있어요</h2>
            <span>{reading.length}</span>
          </div>
          {reading.length ? (
            <Link to="/reading" className="current-reading-link">
              <div>
                <strong>{booksById.get(reading.at(-1)?.bookId || '')?.title}</strong>
                <p>
                  {reading.length > 1
                    ? `외 ${reading.length - 1}권과 함께하는 중`
                    : '서두르지 않고, 나의 속도로.'}
                </p>
              </div>
              <ArrowUpRight size={22} />
            </Link>
          ) : (
            <Link to="/search" className="current-reading-link">
              <div>
                <strong>다음 이야기를 만나볼까요?</strong>
                <p>읽고 싶은 책을 찾아 시작해 보세요.</p>
              </div>
              <ArrowUpRight size={22} />
            </Link>
          )}
        </div>

      </section>
      {favoriteGenre && (
        <section className="recommendation-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">PERSONAL PICKS</span>
              <h2>많이 읽은 장르에서 골라봤어요</h2>
            </div>
            <span>{favoriteGenre}</span>
          </div>
          {visibleRecommendations.length ? (
            <div className="recommendation-grid">
            {visibleRecommendations.map((book) => (
              <article className="recommendation-card" key={book.id}>
                <BookCover book={book} />
                <div>
                  <strong>{book.title}</strong>
                  <p>{book.authors.join(', ')}</p>
                  <small>{book.publisher}</small>
                </div>
              </article>
            ))}
            </div>
          ) : (
            <p className="recommendation-empty">이 장르의 추천 도서를 불러오는 중이거나 준비된 책이 없어요.</p>
          )}
        </section>
      )}
      <section className="reading-note standalone-note">

          <span className="eyebrow">A SMALL NOTE</span>
          <p>
            {readingNote.split('\n').map((line, index) => (
              <span key={line}>
                {index > 0 && <br />}
                {line}
              </span>
            ))}
          </p>
          <small>{user?.displayName}님의 다음 한 권을 기다리며</small>
      </section>
      {showOnboarding && <OnboardingGuide onDone={() => { localStorage.setItem(`bookbook-onboarding-v1-${user?.uid || 'guest'}`, 'done'); setShowOnboarding(false) }} />}
      {selected && (
        <RecordDetails
          record={records.find((r) => r.id === selected.id) || selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
