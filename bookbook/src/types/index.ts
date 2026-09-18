export interface Book {
  id: string
  isbn: string
  title: string
  authors: string[]
  publisher: string
  thumbnail: string
  genre?: string
  pageCount: number
}

export interface ReadingRecord {
  id: string
  bookId: string
  userId: string
  status: 'READING' | 'COMPLETED'
  startedAt: Date
  finishedAt?: Date
  completedAt?: Date
  rating?: number
  review?: string
  createdAt: Date
  updatedAt: Date
}

export interface User {
  uid: string
  displayName: string
  email: string
  photoURL?: string
}
export interface LibraryData {
  books: Book[]
  records: ReadingRecord[]
}
export interface Completion {
  startedAt: Date
  finishedAt: Date
  rating: number
  review: string
}
