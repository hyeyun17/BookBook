import { useState } from 'react'
import type { Book } from '../types'
export function BookCover({ book, className = '' }: { book: Book; className?: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className={`book-cover ${className}`}>
      {book.thumbnail && !failed ? (
        <img
          src={book.thumbnail}
          alt={`${book.title} 표지`}
          onError={() => setFailed(true)}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="cover-placeholder">
          <span>BOOKBOOK EDITION</span>
          <strong>{book.title}</strong>
          <i />
          <small>{book.authors.join(' · ')}</small>
        </div>
      )}
    </div>
  )
}
