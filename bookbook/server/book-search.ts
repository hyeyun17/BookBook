import type { Book } from '../src/types/index.js'

interface Yes24Item {
  itemId?: number
  title?: string
  author?: string
  publisher?: string
  isbn10?: string
  isbn13?: string
  cover?: string
  pages?: number | null
  categoryName?: string | null
  category?: string | null
  categoryPath?: string | null
  goodsSortNm?: string | null
}
interface Yes24Response {
  data?: {
    items?: Yes24Item[]
    data?: Yes24Item[]
    categories?: Yes24Category[]
    currentPage?: number
    pageSize?: number
    totalCount?: number
  }
}
interface Yes24Category {
  categoryId?: string | number
  categoryName?: string | null
  categoryFullPath?: string
}

export const FALLBACK_PAGE_COUNT = 300
export const FALLBACK_GENRE = '\uBBF8\uBD84\uB958'
const SEARCH_TTL = 5 * 60 * 1000
const DETAIL_TTL = 24 * 60 * 60 * 1000
const CATEGORY_TTL = 24 * 60 * 60 * 1000
const RECOMMENDATION_TTL = 60 * 60 * 1000
const MIN_REQUEST_INTERVAL = 110
type Cached<T> = { expiresAt: number; value: T }
const searchCache = new Map<string, Cached<{ books: Book[]; hasMore: boolean }>>()
const detailCache = new Map<string, Cached<Book & { usedFallback: boolean }>>()
const categoryCache = new Map<string, Cached<Yes24Category[]>>()
const recommendationCache = new Map<string, Cached<{ genre: string; books: Book[] }>>()
let requestQueue = Promise.resolve()
let nextRequestAt = 0

function scheduleRequest<T>(request: () => Promise<T>) {
  const run = requestQueue.then(async () => {
    const wait = Math.max(0, nextRequestAt - Date.now())
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait))
    nextRequestAt = Date.now() + MIN_REQUEST_INTERVAL
    return request()
  })
  requestQueue = run.then(() => undefined, () => undefined)
  return run
}
function isbnOf(item: Yes24Item) {
  return item.isbn13?.trim() || item.isbn10?.trim() || ''
}
function leafCategory(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return ''
  return value.split(/\s*[-|>]\s*/).map((part) => part.trim()).filter(Boolean).at(-1) || ''
}
function genreOf(item: Yes24Item) {
  const value = item.categoryName || item.category || item.categoryPath || item.goodsSortNm
  if (typeof value !== 'string' || !value.trim()) return FALLBACK_GENRE
  const categories = value.split(/\s*[-|>]\s*/).map((category) => category.trim()).filter(Boolean)
  return categories.at(-1) || FALLBACK_GENRE
}
export function normalizeYes24Book(item: Yes24Item): Book {
  const isbn = isbnOf(item)
  const title = item.title?.trim() || 'Untitled'
  const authors = item.author?.split(/[,;|]/).map((author) => author.trim()).filter(Boolean)
  const id = isbn || String(item.itemId || encodeURIComponent(`${title}-${item.author || ''}`))
  const validPages = typeof item.pages === 'number' && Number.isFinite(item.pages) && item.pages > 0
  return {
    id,
    isbn,
    title,
    authors: authors?.length ? authors : ['Unknown author'],
    publisher: item.publisher?.trim() || 'Unknown publisher',
    thumbnail: item.cover?.replace(/^http:/, 'https:') || '',
    pageCount: validPages ? item.pages! : FALLBACK_PAGE_COUNT,
    genre: genreOf(item),
  }
}
async function yes24<T>(url: URL, key: string): Promise<T> {
  const response = await scheduleRequest(() =>
    fetch(url, { headers: { 'X-Api-Key': key, Accept: 'application/json' }, signal: AbortSignal.timeout(10000) }),
  )
  if (!response.ok) {
    const error = new Error('YES24 request failed') as Error & { status?: number }
    error.status = response.status
    throw error
  }
  return (await response.json()) as T
}
function validPage(page: unknown) {
  const value = Number(page || 1)
  return Number.isInteger(value) && value >= 1 && value <= 50 ? value : null
}
export async function bookSearch(query: unknown, page: unknown, key?: string) {
  const term = typeof query === 'string' ? query.trim() : ''
  const pageNumber = validPage(page)
  if (!term || term.length > 100 || pageNumber === null) return { status: 400, body: { error: 'Invalid search parameters' } }
  if (!key) return { status: 503, body: { error: 'Book search is not configured' } }
  const cacheKey = `${term.toLocaleLowerCase()}|${pageNumber}`
  const cached = searchCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return { status: 200, body: cached.value }
  try {
    const url = new URL('https://apis.yes24.com/v1/goods/itemList')
    url.search = new URLSearchParams({ query: term, category: 'BOOK', sort: 'DEFAULT', page: String(pageNumber), pageSize: '20', detail: 'N' }).toString()
    const data = await yes24<Yes24Response>(url, key)
    const value = {
      books: (data.data?.items || []).map(normalizeYes24Book),
      hasMore: pageNumber < 50 && (data.data?.currentPage || pageNumber) * (data.data?.pageSize || 20) < (data.data?.totalCount || 0),
    }
    searchCache.set(cacheKey, { expiresAt: Date.now() + SEARCH_TTL, value })
    return { status: 200, body: value }
  } catch (error) {
    const status = (error as { status?: number }).status
    return { status: status === 429 ? 429 : 502, body: { error: 'Book search unavailable' } }
  }
}
export async function bookDetail(isbn: unknown, key?: string) {
  const normalizedIsbn = typeof isbn === 'string' ? isbn.replace(/[^0-9Xx]/g, '') : ''
  if (!normalizedIsbn || normalizedIsbn.length < 10 || normalizedIsbn.length > 13) return { status: 400, body: { error: 'Invalid ISBN' } }
  if (!key) return { status: 503, body: { error: 'Book detail is not configured' } }
  const cached = detailCache.get(normalizedIsbn)
  if (cached && cached.expiresAt > Date.now()) return { status: 200, body: { book: cached.value } }
  try {
    const url = new URL('https://apis.yes24.com/v1/goods/itemDetail')
    url.search = new URLSearchParams({ searchType: normalizedIsbn.length === 10 ? 'ISBN10' : 'ISBN13', query: normalizedIsbn, detail: 'Y' }).toString()
    const data = await yes24<Yes24Response>(url, key)
    const item = data.data?.items?.[0]
    if (!item) return { status: 200, body: { book: null } }
    const normalized = normalizeYes24Book(item)
    const validPages = typeof item.pages === 'number' && Number.isFinite(item.pages) && item.pages > 0
    const book = { ...normalized, usedFallback: !validPages }
    detailCache.set(normalizedIsbn, { expiresAt: Date.now() + DETAIL_TTL, value: book })
    return { status: 200, body: { book } }
  } catch (error) {
    const status = (error as { status?: number }).status
    return { status: status === 429 ? 429 : 502, body: { error: 'Book detail unavailable' } }
  }
}

export async function bookRecommendations(genre: unknown, key?: string) {
  const requestedGenre = typeof genre === 'string' ? genre.trim() : ''
  if (!requestedGenre || requestedGenre.length > 80) return { status: 400, body: { error: 'Invalid recommendation parameters' } }
  if (!key) return { status: 503, body: { error: 'Book recommendations are not configured' } }
  const cachedRecommendation = recommendationCache.get(requestedGenre)
  if (cachedRecommendation && cachedRecommendation.expiresAt > Date.now()) return { status: 200, body: cachedRecommendation.value }
  try {
    let categories = categoryCache.get('all')?.value
    const categoryEntry = categoryCache.get('all')
    if (!categories || !categoryEntry || categoryEntry.expiresAt <= Date.now()) {
      const categoryUrl = new URL('https://apis.yes24.com/v1/category/list')
      const categoryData = await yes24<Yes24Response>(categoryUrl, key)
      categories = categoryData.data?.categories || (categoryData.data?.items as unknown as Yes24Category[] | undefined) || (categoryData.data?.data as Yes24Category[] | undefined) || []
      categoryCache.set('all', { expiresAt: Date.now() + CATEGORY_TTL, value: categories })
    }
    const matches = (categories || []).filter((category) => {
      const name = leafCategory(category.categoryFullPath || category.categoryName)
      return name === requestedGenre || category.categoryName?.trim() === requestedGenre
    })
    const category = matches.sort((a, b) => String(b.categoryFullPath || '').length - String(a.categoryFullPath || '').length)[0]
    if (!category?.categoryId) {
      const value = { genre: requestedGenre, books: [] }
      recommendationCache.set(requestedGenre, { expiresAt: Date.now() + RECOMMENDATION_TTL, value })
      return { status: 200, body: value }
    }
    const bestsellerUrl = new URL('https://apis.yes24.com/v1/category/bestseller')
    bestsellerUrl.search = new URLSearchParams({ categoryId: String(category.categoryId), page: '1', pageSize: '20', detail: 'Y' }).toString()
    const bestsellerData = await yes24<Yes24Response>(bestsellerUrl, key)
    const items = bestsellerData.data?.items || bestsellerData.data?.data || []
    const value = { genre: requestedGenre, books: items.map(normalizeYes24Book).slice(0, 3) }
    recommendationCache.set(requestedGenre, { expiresAt: Date.now() + RECOMMENDATION_TTL, value })
    return { status: 200, body: value }
  } catch (error) {
    const status = (error as { status?: number }).status
    return { status: status === 429 ? 429 : 502, body: { error: 'Book recommendations unavailable' } }
  }
}
