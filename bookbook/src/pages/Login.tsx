import { useState } from 'react'
import { BookOpen, ArrowUpRight } from 'lucide-react'
import { firebaseConfigured, loginWithGoogle } from '../services/firebase'
import { useLibrary } from '../context/library'
export function Login() {
  const { startPreview } = useLibrary()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <main className="login-page">
      <a href="/" className="wordmark">
        bookbook.
      </a>
      <div className="login-copy">
        <span className="eyebrow">YOUR OWN LITTLE BOOKSHELF</span>
        <h1>
          읽는 일은 가볍게.
          <br />
          <span className="serif-accent">남는 것은 오래도록.</span>
        </h1>
        <p>
          독후감이 아니어도, 별 하나면 충분해요.
          <br />
          나의 속도로 읽고, 나만의 책장을 채워보세요.
        </p>
        <div className="login-books" aria-hidden="true">
          <i>작은 읽기의 기쁨</i>
          <i>나만의 속도로</i>
          <i>BOOKBOOK</i>
          <i>책과 함께한 시간</i>
          <i>한 권의 세계</i>
        </div>
        <BookOpen size={24} strokeWidth={1.3} />
        {firebaseConfigured ? (
          <button
            className="primary-button full-width"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              setError('')
              try {
                await loginWithGoogle()
              } catch {
                setError(
                  '로그인하지 못했어요. 팝업 허용과 네트워크를 확인한 뒤 다시 시도해 주세요.',
                )
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? '로그인 중…' : 'Google로 시작하기'}
            <ArrowUpRight size={18} />
          </button>
        ) : (
          <>
            <p className="setup-notice">
              서비스 연결을 준비 중이에요.
              <br />
              로컬 미리보기에서 화면과 기록 흐름을 확인할 수 있어요.
            </p>
            <button className="primary-button full-width" onClick={startPreview}>
              로컬 미리보기 <ArrowUpRight size={18} />
            </button>
            <small>Google 로그인·클라우드 저장은 Firebase 설정 후 제공됩니다.</small>
          </>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
      <span className="login-footer">한 권씩, 나만의 속도로. &nbsp; © BOOKBOOK</span>
    </main>
  )
}
