import { useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, logout } from '../services/firebase'
import {
  emptyLibrary,
  newRecord,
  readLocal,
  saveCompletion,
  saveNew,
  subscribeLibrary,
  writeLocal,
} from '../services/records'
import type { LibraryData, User } from '../types'
import { LibraryContext } from './library'
import { validateCompletion } from '../utils/reading'

const previewUser: User = { uid: 'local-preview', displayName: '독서가', email: '' }
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
                displayName: next.displayName || '독서가',
                email: next.email || '',
                ...(next.photoURL ? { photoURL: next.photoURL } : {}),
              }
            : null,
        )
      },
      () => {
        setError('로그인 상태를 확인하지 못했어요. 새로고침해 주세요.')
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
        setError('기록을 불러오지 못했어요. 네트워크와 저장소 연결을 확인한 뒤 새로고침해 주세요.')
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
          if (!user) throw new Error('로그인이 필요해요.')
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
        complete: async (record, values) => {
          if (!user || record.userId !== user.uid) throw new Error('이 기록을 수정할 수 없어요.')
          const invalid = validateCompletion(values.startedAt, values.finishedAt, values.rating)
          if (invalid) throw new Error(invalid)
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
              records: data.records.map((r) => (r.id === record.id ? updated : r)),
            })
          else {
            const saved = await saveCompletion(record, values)
            setData((previous) => ({
              ...previous,
              records: previous.records.map((r) => (r.id === record.id ? saved : r)),
            }))
          }
        },
      }}
    >
      {children}
    </LibraryContext.Provider>
  )
}
