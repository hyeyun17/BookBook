export async function bookSearch(query: unknown, page: unknown, key?: string) {
  const term = typeof query === 'string' ? query.trim() : ''
  const pageNumber = Number(page || 1)
  if (
    !term ||
    term.length > 100 ||
    !Number.isInteger(pageNumber) ||
    pageNumber < 1 ||
    pageNumber > 50
  )
    return { status: 400, body: { error: 'Invalid search parameters' } }
  if (!key) return { status: 503, body: { error: 'Book search is not configured' } }
  try {
    const url = new URL('https://dapi.kakao.com/v3/search/book')
    url.search = new URLSearchParams({
      query: term,
      page: String(pageNumber),
      size: '20',
      sort: 'accuracy',
    }).toString()
    const response = await fetch(url, {
      headers: { Authorization: `KakaoAK ${key}` },
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok)
      return {
        status: response.status === 429 ? 429 : 502,
        body: { error: 'Book search unavailable' },
      }
    const data = await response.json()
    return { status: 200, body: data }
  } catch {
    return { status: 502, body: { error: 'Book search unavailable' } }
  }
}
