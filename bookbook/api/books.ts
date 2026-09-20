import type { IncomingMessage, ServerResponse } from 'node:http'
import { bookDetail, bookRecommendations, bookSearch } from '../server/book-search.js'

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    response.statusCode = 405
    response.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  try {
    const url = new URL(request.url || '/', 'http://localhost')
    const result = url.searchParams.has('recommend')
      ? await bookRecommendations(url.searchParams.get('recommend'), process.env.YES24_API_KEY)
      : url.searchParams.has('isbn')
        ? await bookDetail(url.searchParams.get('isbn'), process.env.YES24_API_KEY)
        : await bookSearch(
          url.searchParams.get('query'),
          url.searchParams.get('page'),
          process.env.YES24_API_KEY,
        )
    response.statusCode = result.status
    response.setHeader(
      'Cache-Control',
      result.status === 200 ? 'public, max-age=300, stale-while-revalidate=600' : 'no-store',
    )
    response.end(JSON.stringify(result.body))
  } catch {
    response.statusCode = 502
    response.end(JSON.stringify({ error: 'Book service unavailable' }))
  }
}
