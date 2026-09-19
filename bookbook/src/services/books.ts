import type { Book } from '../types'

interface KakaoBook {
  isbn?: string
  title?: string
  authors?: string[]
  publisher?: string
  thumbnail?: string
  url?: string
}
export function normalizeBook(raw: KakaoBook): Book {
  const isbns = (raw.isbn ?? '').split(/\s+/).filter(Boolean)
  const isbn = isbns.find((i) => i.length === 13) ?? isbns[0] ?? ''
  const fallbackId = encodeURIComponent(
    raw.url || `${raw.title}-${raw.authors?.join(',')}`,
  ).replaceAll('.', '_')
  return {
    id: isbn || fallbackId,
    isbn,
    title: raw.title || '제목 없음',
    authors: raw.authors?.length ? raw.authors : ['저자 정보 없음'],
    publisher: raw.publisher || '출판사 정보 없음',
    thumbnail: raw.thumbnail?.replace(/^http:/, 'https:') || '',
    pageCount: 300,
    genre: '미분류',
  }
}
export async function searchBooks(
  query: string,
  page: number,
  signal?: AbortSignal,
): Promise<{ books: Book[]; hasMore: boolean }> {
  const response = await fetch(`/api/books?query=${encodeURIComponent(query)}&page=${page}`, {
    signal,
  })
  if (!response.ok) {
    if (response.status === 503)
      throw new Error('책 검색 연결이 아직 준비되지 않았어요. Kakao API 환경변수를 설정해 주세요.')
    if (response.status === 429) throw new Error('검색 요청이 많아요. 잠시 후 다시 시도해 주세요.')
    throw new Error('책을 검색하지 못했어요. 잠시 후 다시 시도해 주세요.')
  }
  const data = await response.json()
  if (!Array.isArray(data.documents)) throw new Error('검색 응답을 읽지 못했어요.')
  return { books: data.documents.map(normalizeBook), hasMore: page < 50 && !data.meta?.is_end }
}
interface BookMetadata {
  pageCount: number
  genre: string
  usedFallback: boolean
}
interface GoogleVolume {
  volumeInfo?: {
    industryIdentifiers?: { identifier: string }[]
    pageCount?: number
    categories?: string[]
  }
}
const fallbackMetadata: BookMetadata = { pageCount: 300, genre: '미분류', usedFallback: true }
// Cache promises as well as results so concurrent saves share one ISBN request.
// Failures are cached for this app session too, avoiding repeated 429 requests.
const metadataCache = new Map<string, Promise<BookMetadata>>()

async function fetchMetadata(isbn: string): Promise<BookMetadata> {
  try {
    const key = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY?.trim()
    if (!key) return fallbackMetadata
    const params = new URLSearchParams({ q: `isbn:${isbn}`, key })
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return fallbackMetadata
    const data: { items?: GoogleVolume[] } = await response.json()
    const info = data.items?.find((item) =>
      item.volumeInfo?.industryIdentifiers?.some((i) => i.identifier === isbn),
    )?.volumeInfo
    const validPages =
      typeof info?.pageCount === 'number' && Number.isFinite(info.pageCount) && info.pageCount > 0
    const genre = info?.categories
      ?.find((category) => typeof category === 'string' && category.trim().length > 0)
      ?.trim()
    return {
      pageCount: validPages ? info!.pageCount! : 300,
      genre: genre || '미분류',
      usedFallback: !validPages,
    }
  } catch {
    return fallbackMetadata
  }
}

export async function enrichBook(book: Book): Promise<Book & { usedFallback: boolean }> {
  const isbn = book.isbn.trim()
  if (!isbn) return { ...book, ...fallbackMetadata }
  let metadata = metadataCache.get(isbn)
  if (!metadata) {
    metadata = fetchMetadata(isbn)
    metadataCache.set(isbn, metadata)
  }
  return { ...book, ...(await metadata) }
}
