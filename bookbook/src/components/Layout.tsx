import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { BookOpen, House, LibraryBig, UserRound, ArrowUpRight } from 'lucide-react'
import { useLibrary } from '../context/library'
const nav = [
  { to: '/', label: '홈', icon: House },
  { to: '/reading', label: '읽는 중', icon: BookOpen },
  { to: '/library', label: '라이브러리', icon: LibraryBig },
  { to: '/mypage', label: '마이페이지', icon: UserRound },
]
export function Layout() {
  const { preview, user, error } = useLibrary()
  const { pathname } = useLocation()
  const activeIndex = nav.findIndex(({ to }) =>
    to === '/' ? pathname === '/' : pathname.startsWith(to),
  )
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link to="/" className="wordmark" aria-label="BookBook 홈">
          bookbook<span className="logo-dot">.</span>
        </Link>
        <span className="brand-caption">읽은 만큼, 나다워지는 곳.</span>
        <Link to="/mypage" className="profile-link">
          <span>{user?.displayName.slice(0, 1)}</span>
          <span className="profile-name">나의 독서 공간</span>
          <ArrowUpRight size={15} />
        </Link>
      </header>
      {preview && (
        <div className="preview-notice">로컬 미리보기 · 기록은 이 브라우저에만 저장돼요.</div>
      )}
      {error && (
        <div className="global-error" role="alert">
          {error}
        </div>
      )}
      <main id="main-content">
        <div className="page-transition" key={pathname}>
          <Outlet />
        </div>
      </main>
      <footer className="site-footer">
        <span>한 권씩, 나만의 속도로.</span>
        <span>BOOKBOOK — YOUR READING ROOM</span>
      </footer>
      <nav className="bottom-nav" aria-label="주 메뉴">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}>
            <Icon size={21} strokeWidth={1.6} />
            <span>{label}</span>
          </NavLink>
        ))}
        {activeIndex >= 0 && (
          <span
            className="nav-dot"
            style={{ '--nav-index': activeIndex } as CSSProperties}
            aria-hidden="true"
          />
        )}
      </nav>
    </div>
  )
}
