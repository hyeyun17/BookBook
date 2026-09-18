import { expect, it, vi, afterEach } from 'vitest'
import type { ReadingRecord } from '../../src/types'
const mocks = vi.hoisted(() => ({
  updateDoc: vi.fn().mockResolvedValue(undefined),
  doc: vi.fn().mockReturnValue('record-ref'),
}))
vi.mock('../../src/services/firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  ...mocks,
  collection: vi.fn(),
  onSnapshot: vi.fn(),
  Timestamp: class {},
  writeBatch: vi.fn(),
}))
import { saveCompletion } from '../../src/services/records'
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
