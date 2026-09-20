import { useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { enrichBook } from '../services/books'
import { auth, logout } from '../services/firebase'
import {
  emptyLibrary,
  newRecord,
  readLocal,
  removeReading,
  saveCompletion,
  saveNew,
  subscribeLibrary,
  writeLocal,
} from '../services/records'
import type { LibraryData, User } from '../types'
import { LibraryContext } from './library'
import { validateCompletion } from '../utils/reading'

const previewUser: User = { uid: 'local-preview', displayName: '?낆꽌媛', email: '' }
export function LibraryProvider({ children }: { children: ReactNode }) {
  const [preview, setPreview] = useState(
    !auth && sessionStorage.getItem('bookbook-preview') === 'true',
  )
  const [user, setUser] = useState<User | null>(preview ? previewUser : null)
  const [data, setData] = useState<LibraryData>(preview ? readLocal() : emptyLibrary)
  const [loading, setLoading] = useState(!!auth)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(
      auth,
      (next) => {
        setData(emptyLibrary)
        setError('')
        setLoading(!!next)
        setUser(
          next
            ? {
                uid: next.uid,
                displayName: next.displayName || '?낆꽌媛',
                email: next.email || '',
                ...(next.photoURL ? { photoURL: next.photoURL } : {}),
              }
            : null,
        )
      },
      () => {
        setError('濡쒓렇???곹깭瑜??뺤씤?섏? 紐삵뻽?댁슂. ?덈줈怨좎묠??二쇱꽭??')
        setLoading(false)
      },
    )
  }, [])
  useEffect(() => {
    if (!user || preview) return
    return subscribeLibrary(
      user.uid,
      (next) => {
        setData(next)
        setLoading(false)
        setError('')
      },
      () => {
        setError('湲곕줉??遺덈윭?ㅼ? 紐삵뻽?댁슂. ?ㅽ듃?뚰겕? ??μ냼 ?곌껐???뺤씤?????덈줈怨좎묠??二쇱꽭??')
        setLoading(false)
      },
    )
  }, [user, preview])
  function localUpdate(next: LibraryData) {
    writeLocal(next)
    setData(next)
  }
  return (
    <LibraryContext.Provider
      value={{
        ...data,
        user,
        loading,
        error,
        preview,
        startPreview: () => {
          sessionStorage.setItem('bookbook-preview', 'true')
          setPreview(true)
          setUser(previewUser)
          setData(readLocal())
        },
        signOut: async () => {
          await logout()
          sessionStorage.removeItem('bookbook-preview')
          setPreview(false)
          setUser(null)
          setData(emptyLibrary)
        },
        startReading: async (book) => {
          if (!user) throw new Error('濡쒓렇?몄씠 ?꾩슂?댁슂.')
          const record = newRecord(book, user.uid)
          if (preview)
            localUpdate({
              books: [...data.books.filter((b) => b.id !== book.id), book],
              records: [...data.records, record],
            })
          else {
            await saveNew(book, record)
            setData((previous) => ({
              books: [...previous.books.filter((b) => b.id !== book.id), book],
              records: [...previous.records.filter((r) => r.id !== record.id), record],
            }))
          }
          return record
        },
        stopReading: async (record) => {
          if (!user || record.userId !== user.uid || record.status !== 'READING')
            throw new Error('??湲곕줉???쒓굅?????놁뼱??')
          if (preview) {
            localUpdate({ ...data, records: data.records.filter((r) => r.id !== record.id) })
          } else {
            await removeReading(record)
            setData((previous) => ({
              ...previous,
              records: previous.records.filter((r) => r.id !== record.id),
            }))
          }
        },
        deleteRecord: async (record) => {
          if (!user || record.userId !== user.uid)
            throw new Error('\uCC45 \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC5B4\uC694.')
          if (preview) {
            localUpdate({ ...data, records: data.records.filter((r) => r.id !== record.id) })
          } else {
            await removeReading(record)
            setData((previous) => ({
              ...previous,
              records: previous.records.filter((r) => r.id !== record.id),
            }))
          }
        },
        complete: async (record, values) => {
          if (!user || record.userId !== user.uid)
            throw new Error('\uCC45 \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC5B4\uC694.')
          const invalid = validateCompletion(values.startedAt, values.finishedAt, values.rating)
          if (invalid) throw new Error(invalid)
          const book = data.books.find((b) => b.id === record.bookId)
          if (!book) throw new Error('梨??뺣낫瑜?李얠쓣 ???놁뼱??')
          const { usedFallback, ...enriched } = await enrichBook(book)
          const updated = {
            ...record,
            ...values,
            status: 'COMPLETED' as const,
            completedAt: record.completedAt || new Date(),
            updatedAt: new Date(),
          }
          if (preview)
            localUpdate({
              ...data,
              books: data.books.map((b) => (b.id === enriched.id ? enriched : b)),
              records: data.records.map((r) => (r.id === record.id ? updated : r)),
            })
          else {
            const saved = await saveCompletion(record, values, enriched)
            setData((previous) => ({
              ...previous,
              books: previous.books.map((b) => (b.id === enriched.id ? enriched : b)),
              records: previous.records.map((r) => (r.id === record.id ? saved : r)),
            }))
          }
          if (import.meta.env.DEV) {
            const { title, isbn, pageCount } = enriched
            console.info("[BookBook] 책 페이지 수", { title, isbn, pageCount, usedFallback })
          }
        },
      }}
    >
      {children}
    </LibraryContext.Provider>
  )
}
