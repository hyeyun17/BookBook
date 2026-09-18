import { collection, doc, onSnapshot, Timestamp, writeBatch, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { Book, Completion, LibraryData, ReadingRecord } from '../types'
import { validateCompletion } from '../utils/reading'

export const emptyLibrary: LibraryData = { books: [], records: [] }
const localKey = 'bookbook-preview-v1'
export function readLocal(): LibraryData {
  try {
    const data = JSON.parse(localStorage.getItem(localKey) || 'null')
    if (!data || !Array.isArray(data.books) || !Array.isArray(data.records)) return emptyLibrary
    return {
      books: data.books,
      records: data.records.map((r: ReadingRecord) => ({
        ...r,
        startedAt: new Date(r.startedAt),
        finishedAt: r.finishedAt ? new Date(r.finishedAt) : undefined,
        completedAt: r.completedAt ? new Date(r.completedAt) : undefined,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      })),
    }
  } catch {
    return emptyLibrary
  }
}
export function writeLocal(data: LibraryData) {
  localStorage.setItem(localKey, JSON.stringify(data))
}
export function subscribeLibrary(
  uid: string,
  onData: (data: LibraryData) => void,
  onError: (error: Error) => void,
) {
  if (!db) throw new Error('Firebase 연결 설정이 필요합니다.')
  let books: Book[] | null = null
  let records: ReadingRecord[] | null = null
  const emit = () => {
    if (books && records) onData({ books, records })
  }
  const stopBooks = onSnapshot(
    collection(db, 'users', uid, 'books'),
    (snap) => {
      books = snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Book)
      emit()
    },
    onError,
  )
  const stopRecords = onSnapshot(
    collection(db, 'users', uid, 'records'),
    (snap) => {
      records = snap.docs.map((d) => {
        const raw = d.data()
        const asDate = (key: string) =>
          raw[key] instanceof Timestamp ? raw[key].toDate() : new Date(raw[key])
        return {
          ...raw,
          id: d.id,
          startedAt: asDate('startedAt'),
          finishedAt: raw.finishedAt ? asDate('finishedAt') : undefined,
          completedAt: raw.completedAt ? asDate('completedAt') : undefined,
          createdAt: asDate('createdAt'),
          updatedAt: asDate('updatedAt'),
        } as ReadingRecord
      })
      emit()
    },
    onError,
  )
  return () => {
    stopBooks()
    stopRecords()
  }
}
export function newRecord(book: Book, uid: string): ReadingRecord {
  const now = new Date()
  return {
    id: crypto.randomUUID(),
    bookId: book.id,
    userId: uid,
    status: 'READING',
    startedAt: now,
    createdAt: now,
    updatedAt: now,
  }
}
export async function saveNew(book: Book, record: ReadingRecord) {
  if (!db) throw new Error('Firebase 연결 설정이 필요합니다.')
  if (!navigator.onLine) throw new Error('인터넷 연결 후 다시 시도해 주세요.')
  const batch = writeBatch(db)
  batch.set(doc(db, 'users', record.userId, 'books', book.id), book)
  batch.set(doc(db, 'users', record.userId, 'records', record.id), record)
  await batch.commit()
}
export async function saveCompletion(record: ReadingRecord, completion: Completion) {
  const error = validateCompletion(completion.startedAt, completion.finishedAt, completion.rating)
  if (error) throw new Error(error)
  if (!db) throw new Error('Firebase 연결 설정이 필요합니다.')
  if (!navigator.onLine) throw new Error('인터넷 연결 후 다시 시도해 주세요.')
  const changes = {
    ...completion,
    status: 'COMPLETED' as const,
    completedAt: record.completedAt || new Date(),
    updatedAt: new Date(),
  }
  await updateDoc(doc(db, 'users', record.userId, 'records', record.id), changes)
  return { ...record, ...changes }
}
