import type { IncomingMessage, ServerResponse } from 'node:http'
import { bookSearch } from '../server/book-search.js'
export default async function handler(request: IncomingMessage, response: ServerResponse) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    response.statusCode = 405
    response.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }
  response.setHeader('Cache-Control', 'no-store')
  try {
    const url = new URL(request.url || '/', 'http://localhost')
    const result = await bookSearch(
      url.searchParams.get('query'),
      url.searchParams.get('page'),
      process.env.KAKAO_REST_API_KEY,
    )
    response.statusCode = result.status
    response.end(JSON.stringify(result.body))
  } catch {
    response.statusCode = 502
    response.end(JSON.stringify({ error: 'Book search unavailable' }))
  }
}
