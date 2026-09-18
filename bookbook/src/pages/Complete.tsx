import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Plus, Minus } from 'lucide-react'
import { useLibrary } from '../context/library'
import { BookCover } from '../components/BookCover'
import { Rating } from '../components/Rating'
import { dateInput, parseDate, validateCompletion } from '../utils/reading'
import type { Book, ReadingRecord } from '../types'
export function Complete() {
  const { id } = useParams()
  const { records, books } = useLibrary()
  const record = records.find((r) => r.id === id)
  const book = books.find((b) => b.id === record?.bookId)
  if (!record || !book)
    return (
      <div className="empty-state">
        <h1>기록을 찾을 수 없어요.</h1>
        <Link to="/reading" className="text-button">
          읽는 중으로 돌아가기
        </Link>
      </div>
    )
  return <CompletionForm key={record.id} record={record} book={book} />
}
function CompletionForm({ record, book }: { record: ReadingRecord; book: Book }) {
  const { complete } = useLibrary()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [started, setStarted] = useState(dateInput(record.startedAt))
  const [finished, setFinished] = useState(dateInput(record.finishedAt || new Date()))
  const [rating, setRating] = useState(record.rating || 0)
  const [review, setReview] = useState(record.review || '')
  const [showReview, setShowReview] = useState(!!record.review || params.has('review'))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const editing = record.status === 'COMPLETED'
  return (
    <div className="page completion-page">
      <Link className="text-button back-link" to={editing ? '/library' : '/reading'}>
        <ArrowLeft size={17} /> {editing ? '라이브러리' : '읽는 중'}
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {editing ? 'YOUR READING MEMORY' : 'ONE MORE BOOK, ONE MORE WORLD'}
          </span>
          <h1>{editing ? '나의 기록 다듬기.' : '한 권을 다 읽었네요.'}</h1>
          <p>
            {editing
              ? '함께한 날짜와 마음에 남은 기록을 수정해 보세요.'
              : '별점 하나면 충분해요. 이 시간을 책장에 남겨볼까요?'}
          </p>
        </div>
      </div>
      <div className="completion-book">
        <BookCover book={book} />
        <div>
          <h2>{book.title}</h2>
          <p>{book.authors.join(' · ')}</p>
        </div>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          const values = {
            startedAt: parseDate(started),
            finishedAt: parseDate(finished),
            rating,
            review: review.trim(),
          }
          const invalid = validateCompletion(values.startedAt, values.finishedAt, rating)
          if (invalid) {
            setError(invalid)
            return
          }
          setBusy(true)
          setError('')
          try {
            await complete(record, values)
            navigate('/', {
              state: {
                newId: editing ? undefined : record.id,
                year: values.finishedAt.getFullYear(),
              },
            })
          } catch (e) {
            setError(e instanceof Error ? e.message : '기록을 저장하지 못했어요.')
            setBusy(false)
          }
        }}
      >
        <div className="date-fields">
          <label>
            읽기 시작일
            <input
              aria-label="읽기 시작일"
              type="date"
              required
              max={finished || dateInput()}
              value={started}
              onChange={(e) => setStarted(e.target.value)}
            />
          </label>
          <label>
            완독일
            <input
              aria-label="완독일"
              type="date"
              required
              min={started}
              max={dateInput()}
              value={finished}
              onChange={(e) => setFinished(e.target.value)}
            />
          </label>
        </div>
        <div className="rating-section">
          <h3>이 책, 어땠나요?</h3>
          <Rating value={rating} onChange={setRating} />
          <p>
            {
              [
                '별점을 선택해 주세요',
                '나와는 조금 달랐어요',
                '가볍게 읽었어요',
                '괜찮은 시간이었어요',
                '오래 기억하고 싶어요',
                '다시 만나고 싶은 책이에요',
              ][rating]
            }
          </p>
        </div>
        <button
          type="button"
          className="text-button review-toggle"
          aria-expanded={showReview}
          aria-controls="review-input"
          onClick={() => setShowReview(!showReview)}
        >
          {showReview ? <Minus size={17} /> : <Plus size={17} />} 독후감 쓰기 <small>선택</small>
        </button>
        {showReview && (
          <div className="review-input" id="review-input">
            <label className="sr-only" htmlFor="review">
              내 기록
            </label>
            <textarea
              id="review"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="마음에 남은 문장이나 짧은 생각. 한 줄이어도 좋아요."
              maxLength={10000}
              rows={5}
            />
            <small>{review.length.toLocaleString()} / 10,000</small>
          </div>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="primary-button full-width" disabled={busy}>
          {busy ? '저장 중…' : editing ? '수정하기' : '기록하기'}
          <ArrowUpRight size={18} />
        </button>
        <p className="form-note">독후감 없이도 기록은 충분해요.</p>
      </form>
    </div>
  )
}
