import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { bookSearch } from './server/book-search.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: 'firebase-firestore', test: /@firebase[\\/]firestore/, priority: 20 },
              { name: 'firebase-auth', test: /@firebase[\\/]auth/, priority: 20 },
              { name: 'vendor', test: /node_modules/, priority: 0 },
            ],
          },
        },
      },
    },
    plugins: [
      react(),
      {
        name: 'bookbook-local-api',
        configureServer(server) {
          server.middlewares.use('/api/books', async (request, response) => {
            if (request.method !== 'GET') {
              response.statusCode = 405
              response.end()
              return
            }
            const url = new URL(request.url || '/', 'http://localhost')
            const result = await bookSearch(
              url.searchParams.get('query'),
              url.searchParams.get('page'),
              env.KAKAO_REST_API_KEY,
            )
            response.statusCode = result.status
            response.setHeader('Content-Type', 'application/json; charset=utf-8')
            response.setHeader('Cache-Control', 'no-store')
            response.end(JSON.stringify(result.body))
          })
        },
      },
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'BookBook · 북북',
          short_name: 'BookBook',
          description: '한 권씩, 나만의 속도로. 가벼운 개인 독서 기록.',
          lang: 'ko',
          theme_color: '#35463B',
          background_color: '#F7F4EE',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/pwa-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
          navigateFallbackDenylist: [/^\/api\//],
          maximumFileSizeToCacheInBytes: 4000000,
        },
      }),
    ],
  }
})
