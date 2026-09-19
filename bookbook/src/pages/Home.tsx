import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Plus, BookOpen } from 'lucide-react'
import { useLibrary } from '../context/library'
import { currentYear, completedIn, indexBooks } from '../utils/reading'
import { YearSelector } from '../components/YearSelector'
import { Bookshelf } from '../components/Bookshelf'
import { RecordDetails } from '../components/RecordDetails'
import type { ReadingRecord } from '../types'
export function Home() {
  const { records, books, user } = useLibrary()
  const location = useLocation()
  const navigate = useNavigate()
  const [arrival] = useState<{ newId?: string; year?: number }>(location.state || {})
  const [year, setYear] = useState(arrival.year || currentYear())
  const [selected, setSelected] = useState<ReadingRecord | null>(null)
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
        <div className="reading-note">
          <span className="eyebrow">A SMALL NOTE</span>
          <p>
            어떤 책은 읽고 나서야
            <br />내 안에 있던 문장이 된다.
          </p>
          <small>{user?.displayName}님의 다음 한 권을 기다리며</small>
        </div>
      </section>
      {selected && (
        <RecordDetails
          record={records.find((r) => r.id === selected.id) || selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
