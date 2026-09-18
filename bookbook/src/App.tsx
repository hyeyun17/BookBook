import { BrowserRouter, Route, Routes, Link } from 'react-router-dom'
import { LibraryProvider } from './context/LibraryContext'
import { useLibrary } from './context/library'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Reading } from './pages/Reading'
import { Library } from './pages/Library'
import { MyPage } from './pages/MyPage'
import { Search } from './pages/Search'
import { Complete } from './pages/Complete'
import { Login } from './pages/Login'
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
