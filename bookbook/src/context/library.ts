import { createContext, useContext } from 'react'
import type { Book, Completion, LibraryData, ReadingRecord, User } from '../types'
export interface LibraryContextValue extends LibraryData {
  user: User | null
  loading: boolean
  error: string
  preview: boolean
  startPreview: () => void
  signOut: () => Promise<void>
  startReading: (book: Book) => Promise<ReadingRecord>
  complete: (record: ReadingRecord, values: Completion) => Promise<void>
}
export const LibraryContext = createContext<LibraryContextValue | null>(null)
export function useLibrary() {
  const context = useContext(LibraryContext)
  if (!context) throw new Error('LibraryProvider is required')
  return context
}
