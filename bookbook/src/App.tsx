import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes, Link } from 'react-router-dom'
import { LibraryProvider } from './context/LibraryContext'
import { useLibrary } from './context/library'
import { Layout } from './components/Layout'
const Home = lazy(() => import('./pages/Home').then((module) => ({ default: module.Home })))
const Reading = lazy(() => import('./pages/Reading').then((module) => ({ default: module.Reading })))
const Library = lazy(() => import('./pages/Library').then((module) => ({ default: module.Library })))
const MyPage = lazy(() => import('./pages/MyPage').then((module) => ({ default: module.MyPage })))
const Search = lazy(() => import('./pages/Search').then((module) => ({ default: module.Search })))
const Complete = lazy(() => import('./pages/Complete').then((module) => ({ default: module.Complete })))
const Login = lazy(() => import('./pages/Login').then((module) => ({ default: module.Login })))
import { PwaStatus } from './components/PwaStatus'
import { ScrollReset } from './components/ScrollReset'
function AppRoutes() {
  const { loading, user, error } = useLibrary()
  if (loading)
    return (
      <div className="app-loading" role="status">
        <span className="wordmark">bookbook.</span>
        <p>나의 책장을 펼치는 중…</p>
      </div>
    )
  if (!user)
    return (
      <>
        {error && (
          <p className="global-error" role="alert">
            {error}
          </p>
        )}
        <Login />
      </>
    )
  return (
    <Suspense fallback={<div className="app-loading" role="status"><span className="wordmark">bookbook.</span></div>}>
      <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="reading" element={<Reading />} />
        <Route path="library" element={<Library />} />
        <Route path="mypage" element={<MyPage />} />
        <Route path="search" element={<Search />} />
        <Route path="record/:id" element={<Complete />} />
        <Route
          path="*"
          element={
            <div className="empty-state">
              <h1>이 페이지는 책장에 없네요.</h1>
              <Link to="/" className="primary-button">
                홈으로
              </Link>
            </div>
          }
        />
      </Route>
      </Routes>
    </Suspense>
  )
}
export default function App() {
  return (
    <BrowserRouter>
      <ScrollReset />
      <LibraryProvider>
        <AppRoutes />
        <PwaStatus />
      </LibraryProvider>
    </BrowserRouter>
  )
}
