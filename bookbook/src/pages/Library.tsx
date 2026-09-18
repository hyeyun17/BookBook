import { useState } from 'react'
import { Search, LibraryBig } from 'lucide-react'
import { useLibrary } from '../context/library'
import { BookCover } from '../components/BookCover'
import { Rating } from '../components/Rating'
import { RecordDetails } from '../components/RecordDetails'
import type { ReadingRecord } from '../types'
export function Library() {
  const { books, records } = useLibrary()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('newest')
  const [selected, setSelected] = useState<ReadingRecord | null>(null)
  const completed = records.filter((r) => r.status === 'COMPLETED')
  const filtered = completed
    .filter((r) => {
      const b = books.find((b) => b.id === r.bookId)
      return (
        b &&
        `${b.title} ${b.authors.join(' ')}`
          .toLocaleLowerCase()
          .includes(query.trim().toLocaleLowerCase())
      )
    })
    .sort((a, b) =>
      sort === 'oldest'
        ? +a.finishedAt! - +b.finishedAt!
        : sort === 'highest'
          ? (b.rating || 0) - (a.rating || 0)
          : sort === 'lowest'
            ? (a.rating || 0) - (b.rating || 0)
            : +b.finishedAt! - +a.finishedAt!,
    )
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">A COLLECTION OF YOUR DAYS</span>
          <h1>지나온 모든 페이지.</h1>
          <p>나를 채워온 {completed.length}권의 이야기.</p>
        </div>
      </div>
      <div className="library-tools">
        <div className="search-field">
          <Search size={18} />
          <input
            aria-label="내 책 제목 또는 저자 검색"
            placeholder="내 책에서 제목, 저자 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select aria-label="정렬" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">최신순</option>
          <option value="oldest">오래된순</option>
          <option value="highest">평점 높은순</option>
          <option value="lowest">평점 낮은순</option>
        </select>
      </div>
      <div className="library-grid">
        {filtered.map((record) => {
          const book = books.find((b) => b.id === record.bookId)!
          return (
            <button className="library-book" key={record.id} onClick={() => setSelected(record)}>
              <BookCover book={book} />
              <h2>{book.title}</h2>
              <p>{book.authors.join(' · ')}</p>
              <Rating value={record.rating || 0} />
            </button>
          )
        })}
      </div>
      {!filtered.length && (
        <div className="empty-state">
          <LibraryBig size={36} strokeWidth={1} />
          <h2>{query ? '일치하는 책이 없어요' : '읽은 책이 나의 기록이 되는 곳'}</h2>
          <p>{query ? '다른 제목이나 저자로 찾아보세요.' : '완독한 책들이 이곳에 모여요.'}</p>
        </div>
      )}
      {selected && (
        <RecordDetails
          record={records.find((r) => r.id === selected.id) || selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
