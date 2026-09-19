import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Plus } from 'lucide-react'
import { Modal } from './Modal'
import { BookCover } from './BookCover'
import { Rating } from './Rating'
import { useLibrary } from '../context/library'
import { formatDate } from '../utils/reading'
import type { ReadingRecord } from '../types'
export function RecordDetails({ record, onClose }: { record: ReadingRecord; onClose: () => void }) {
  const { books, startReading, stopReading, deleteRecord } = useLibrary()
  const book = books.find((b) => b.id === record.bookId)
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!book) return null
  const completed = record.status === 'COMPLETED'
  return (
    <Modal
      title={book.title}
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <div className="detail-heading">
        <BookCover book={book} />
        <span className="eyebrow">{completed ? 'FINISHED READING' : 'CURRENTLY READING'}</span>
        <h2>{book.title}</h2>
        <p>
          {book.authors.join(' · ')} <span className="divider">/</span> {book.publisher}
        </p>
        {book.genre && book.genre !== '미분류' && <span className="tag">{book.genre}</span>}
      </div>
      <dl className="record-dates">
        <div>
          <dt>읽기 시작일</dt>
          <dd>{formatDate(record.startedAt)}</dd>
        </div>
        {completed && (
          <div>
            <dt>완독일</dt>
            <dd>{formatDate(record.finishedAt)}</dd>
          </div>
        )}
      </dl>
      {completed ? (
        <>
          <Rating value={record.rating || 0} />
          {record.review ? (
            <div className="review-text">
              <h3>내 기록</h3>
              <p>{record.review}</p>
            </div>
          ) : (
            <button
              className="text-button"
              onClick={() => navigate(`/record/${record.id}?review=true`)}
            >
              <Plus size={16} /> 독후감 쓰기
            </button>
          )}
          <div className="detail-actions">
            <button className="secondary-button" onClick={() => navigate(`/record/${record.id}`)}>
              날짜·기록 수정
            </button>
            <button
              className="primary-button"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  const next = await startReading(book)
                  navigate('/reading', { state: { newId: next.id } })
                  onClose()
                } catch {
                  setError('다시 읽기를 시작하지 못했어요. 다시 시도해 주세요.')
                  setBusy(false)
                }
              }}
            >
              {busy ? '추가 중…' : '다시 읽기'}
              <ArrowUpRight size={17} />
            </button>
          </div>
          <button
            className="text-button delete-record-button"
            disabled={busy}
            onClick={async () => {
              if (busy) return
              setBusy(true)
              setError('')
              try {
                await deleteRecord(record)
                onClose()
              } catch {
                setError(
                  '\uAE30\uB85D\uC744 \uC0AD\uC81C\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694. \uC5F0\uACB0\uC744 \uD655\uC778\uD558\uACE0 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.',
                )
                setBusy(false)
              }
            }}
          >
            {busy ? '\uCC98\uB9AC \uC911?' : '\uC0AD\uC81C\uD560\uB798\uC694'}
          </button>
        </>
      ) : (
        <>
          <button
            className="primary-button full-width"
            disabled={busy}
            onClick={() => navigate(`/record/${record.id}`)}
          >
            다 읽었어요 <ArrowUpRight size={18} />
          </button>
          <button
            className="text-button stop-reading-button"
            disabled={busy}
            onClick={async () => {
              if (busy) return
              setBusy(true)
              setError('')
              try {
                await stopReading(record)
                onClose()
              } catch {
                setError('기록을 제거하지 못했어요. 연결을 확인하고 다시 시도해 주세요.')
                setBusy(false)
              }
            }}
          >
            {busy ? '처리 중…' : '그만 읽을래요'}
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </Modal>
  )
}
