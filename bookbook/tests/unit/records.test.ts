import { expect, it, vi, afterEach } from 'vitest'
import type { Book, ReadingRecord } from '../../src/types'
const mocks = vi.hoisted(() => ({
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  batchUpdate: vi.fn(),
  commit: vi.fn().mockResolvedValue(undefined),
  doc: vi.fn().mockReturnValue('record-ref'),
}))
vi.mock('../../src/services/firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  ...mocks,
  collection: vi.fn(),
  onSnapshot: vi.fn(),
  Timestamp: class {},
  writeBatch: vi.fn(() => ({ update: mocks.batchUpdate, commit: mocks.commit })),
}))
import { saveCompletion, removeReading } from '../../src/services/records'
afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})
it('uses identical completion timestamps in Firestore and local state, preserving them on edits', async () => {
  vi.stubGlobal('navigator', { onLine: true })
  const date = new Date(2025, 0, 1)
  const record: ReadingRecord = {
    id: 'record',
    bookId: 'book',
    userId: 'user',
    status: 'READING',
    startedAt: date,
    createdAt: date,
    updatedAt: date,
  }
  const completion = { startedAt: date, finishedAt: date, rating: 4, review: '' }
  const saved = await saveCompletion(record, completion)
  expect(saved.completedAt).toBe(mocks.updateDoc.mock.calls[0][1].completedAt)
  const edited = await saveCompletion(saved, { ...completion, review: 'A thought' })
  expect(edited.completedAt).toBe(saved.completedAt)
  expect(mocks.updateDoc.mock.calls[1][1].completedAt).toBe(saved.completedAt)
})

it('persists enriched book metadata and completion in one batch', async () => {
  vi.stubGlobal('navigator', { onLine: true })
  const date = new Date(2025, 0, 1)
  const record: ReadingRecord = {
    id: 'record',
    bookId: 'book',
    userId: 'user',
    status: 'READING',
    startedAt: date,
    createdAt: date,
    updatedAt: date,
  }
  const book: Book = {
    id: 'book',
    isbn: '9780000000001',
    title: 'Cosmos',
    authors: [],
    publisher: '',
    thumbnail: '',
    pageCount: 720,
    genre: 'Science',
  }
  const saved = await saveCompletion(
    record,
    {
      startedAt: date,
      finishedAt: date,
      rating: 4,
      review: '',
    },
    book,
  )
  expect(mocks.batchUpdate).toHaveBeenCalledWith('record-ref', { pageCount: 720, genre: 'Science' })
  expect(mocks.batchUpdate).toHaveBeenCalledWith(
    'record-ref',
    expect.objectContaining({
      status: 'COMPLETED',
      completedAt: saved.completedAt,
    }),
  )
  expect(mocks.commit).toHaveBeenCalledTimes(1)
  expect(mocks.updateDoc).not.toHaveBeenCalled()
})

it('removes only the selected reading record and rejects completed records', async () => {
  vi.stubGlobal('navigator', { onLine: true })
  const date = new Date(2025, 0, 1)
  const record: ReadingRecord = {
    id: 'reading-record',
    bookId: 'shared-book',
    userId: 'user',
    status: 'READING',
    startedAt: date,
    createdAt: date,
    updatedAt: date,
  }
  await removeReading(record)
  expect(mocks.doc).toHaveBeenCalledWith({}, 'users', 'user', 'records', 'reading-record')
  expect(mocks.deleteDoc).toHaveBeenCalledTimes(1)
  await removeReading({ ...record, status: 'COMPLETED' })
  expect(mocks.deleteDoc).toHaveBeenCalledTimes(2)
})
