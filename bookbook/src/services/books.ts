import type { Book } from '../types'

export interface Yes24Book {
  isbn10?: string
  isbn13?: string
  itemId?: number
  title?: string
  author?: string
  publisher?: string
  cover?: string
  pages?: number | null
  categoryName?: string | null
  category?: string | null
  categoryPath?: string | null
  goodsSortNm?: string | null
}
const FALLBACK_PAGE_COUNT = 300
const FALLBACK_GENRE = '\uBBF8\uBD84\uB958'
interface BookMetadata { pageCount: number; genre: string; usedFallback: boolean }
interface DetailResponse { book?: (Book & { usedFallback?: boolean }) | null }

export function normalizeBook(raw: Yes24Book): Book {
  const isbn = (raw.isbn13 || raw.isbn10 || '').trim()
  const title = raw.title?.trim() || 'Untitled'
  const authors = raw.author?.split(/[,;|]/).map((author) => author.trim()).filter(Boolean)
  const validPages = typeof raw.pages === 'number' && Number.isFinite(raw.pages) && raw.pages > 0
  const category = raw.categoryName || raw.category || raw.categoryPath || raw.goodsSortNm
  return {
    id: isbn || String(raw.itemId || encodeURIComponent(`${title}-${raw.author || ''}`)),
    isbn,
    title,
    authors: authors?.length ? authors : ['Unknown author'],
    publisher: raw.publisher?.trim() || 'Unknown publisher',
    thumbnail: raw.cover?.replace(/^http:/, 'https:') || '',
    pageCount: validPages ? raw.pages! : FALLBACK_PAGE_COUNT,
    genre: category?.trim() || FALLBACK_GENRE,
  }
}
export async function searchBooks(query: string, page: number, signal?: AbortSignal): Promise<{ books: Book[]; hasMore: boolean }> {
  const response = await fetch(`/api/books?query=${encodeURIComponent(query)}&page=${page}`, { signal })
  if (!response.ok) {
    if (response.status === 503) throw new Error('YES24 API is not configured.')
    if (response.status === 429) throw new Error('Too many requests. Please try again shortly.')
    throw new Error('Unable to search books. Please try again.')
  }
  const data = (await response.json()) as { books?: Book[]; hasMore?: boolean }
  if (!Array.isArray(data.books)) throw new Error('Invalid book search response.')
  return { books: data.books, hasMore: Boolean(data.hasMore) }
}
const metadataCache = new Map<string, Promise<BookMetadata>>()
const storageKey = (isbn: string) => `bookbook-yes24-metadata-${isbn}`
function fallbackMetadata(): BookMetadata { return { pageCount: FALLBACK_PAGE_COUNT, genre: FALLBACK_GENRE, usedFallback: true } }
function readStoredMetadata(isbn: string): BookMetadata | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey(isbn)) || 'null') as BookMetadata | null
    return value && Number.isFinite(value.pageCount) && typeof value.genre === 'string' ? value : null
  } catch { return null }
}
function storeMetadata(isbn: string, metadata: BookMetadata) {
  try { sessionStorage.setItem(storageKey(isbn), JSON.stringify(metadata)) } catch { /* storage is optional */ }
}
async function fetchMetadata(isbn: string): Promise<BookMetadata> {
  const stored = readStoredMetadata(isbn)
  if (stored) return stored
  try {
    const response = await fetch(`/api/books?isbn=${encodeURIComponent(isbn)}`, { signal: AbortSignal.timeout(10000) })
    if (!response.ok) { const metadata = fallbackMetadata(); storeMetadata(isbn, metadata); return metadata }
    const detail = ((await response.json()) as DetailResponse).book
    const validPages = typeof detail?.pageCount === 'number' && Number.isFinite(detail.pageCount) && detail.pageCount > 0
    const metadata = { pageCount: validPages ? detail!.pageCount : FALLBACK_PAGE_COUNT, genre: detail?.genre?.trim() || FALLBACK_GENRE, usedFallback: Boolean(detail?.usedFallback) || !validPages }
    storeMetadata(isbn, metadata)
    return metadata
  } catch {
    const metadata = fallbackMetadata()
    storeMetadata(isbn, metadata)
    return metadata
  }
}
export async function enrichBook(book: Book): Promise<Book & { usedFallback: boolean }> {
  const isbn = book.isbn.trim()
  if (!isbn) return { ...book, ...fallbackMetadata() }
  let metadata = metadataCache.get(isbn)
  if (!metadata) { metadata = fetchMetadata(isbn); metadataCache.set(isbn, metadata) }
  return { ...book, ...(await metadata) }
}
