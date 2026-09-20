import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, BookOpen, Files, Star, ArrowUpRight, Gauge, Settings, UserRound, Trash2 } from 'lucide-react'
import { useLibrary } from '../context/library'
import { currentYear, statistics } from '../utils/reading'
import { YearSelector } from '../components/YearSelector'
import { Modal } from '../components/Modal'
export function MyPage() {
  const { records, books, user, signOut, deleteAccount } = useLibrary()
  const navigate = useNavigate()
  const [year, setYear] = useState(currentYear())
  const [error, setError] = useState('')
  const [accountOpen, setAccountOpen] = useState(false)
  const [withdrawConfirm, setWithdrawConfirm] = useState(false)
  const [accountBusy, setAccountBusy] = useState(false)
  const stats = useMemo(() => statistics(records, books, year), [books, records, year])
  const genreTotal = stats.genres.reduce((sum, [, count]) => sum + count, 0)
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">A PORTRAIT IN BOOKS</span>
          <h1>책으로 들여다본 나.</h1>
          <p>{user?.displayName}님의 읽는 시간들을 모았어요.</p>
        </div>
        <button className="text-button account-button" onClick={() => setAccountOpen(true)}>
          <Settings size={16} /> 계정 설정
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {accountOpen && (
        <Modal title="계정 설정" onClose={() => { setAccountOpen(false); setWithdrawConfirm(false) }}>
          <div className="account-modal-heading"><UserRound size={20} /><div><h2>계정 설정</h2><p>{user?.displayName}</p></div></div>
          <div className="profile-info">
            <span className="account-section-label">프로필 정보</span>
            <dl><div><dt>이름</dt><dd>{user?.displayName || '미설정'}</dd></div><div><dt>이메일</dt><dd>{user?.email || '미리보기 계정'}</dd></div></dl>
          </div>
          <details className="usage-guide">
            <summary>이용 안내</summary>
            <ol><li>검색에서 책을 찾아 <b>책 읽기</b>를 눌러 서재에 추가해요.</li><li>다 읽은 뒤 책을 선택하고 날짜와 별점을 기록해요.</li><li>홈과 마이페이지에서 독서 통계와 추천 도서를 확인할 수 있어요.</li></ol>
            <button className="text-button guide-replay-button" onClick={() => { localStorage.removeItem(`bookbook-onboarding-v1-${user?.uid || 'guest'}`); setAccountOpen(false); navigate('/') }}>팝업 안내 다시 보기</button>
          </details>
          {!withdrawConfirm ? <div className="account-actions">
            <button className="secondary-button" onClick={async () => { setAccountBusy(true); try { await signOut() } catch { setError('로그아웃하지 못했어요. 다시 시도해 주세요.') } finally { setAccountBusy(false) } }} disabled={accountBusy}><LogOut size={16} /> 로그아웃하기</button>
            <button className="text-button account-danger" onClick={() => setWithdrawConfirm(true)}><Trash2 size={15} /> 회원 탈퇴하기</button>
          </div> : <div className="withdraw-confirm">
            <h3>정말 탈퇴할까요?</h3><p>저장된 독서 기록과 계정을 다시 복구할 수 없어요.</p>
            <div><button className="text-button" onClick={() => setWithdrawConfirm(false)}>돌아가기</button><button className="danger-button" onClick={async () => { setAccountBusy(true); try { await deleteAccount() } catch { setError('최근 로그인 후 다시 시도해 주세요.') } finally { setAccountBusy(false) } }} disabled={accountBusy}>탈퇴하기</button></div>
          </div>}
        </Modal>
      )}
      <div className="stats-toolbar">
        <YearSelector year={year} onChange={setYear} />
        <span className="eyebrow">YOUR YEAR IN BOOKS</span>
      </div>
      <div className="stats-grid">
        <div>
          <BookOpen size={19} />
          <span>읽은 책</span>
          <strong>
            {stats.count}
            <small>권</small>
          </strong>
        </div>
        <div>
          <Files size={19} />
          <span>읽은 페이지</span>
          <strong>
            {stats.pages.toLocaleString()}
            <small>쪽</small>
          </strong>
        </div>
        <div>
          <Star size={19} />
          <span>평균 평점</span>
          <strong>
            {stats.count ? stats.average.toFixed(1) : '—'}
            <small>/ 5</small>
          </strong>
        </div>
        <div><Gauge size={19} /><span>하루 평균 독서량</span><strong>{stats.averagePagesPerDay ? Math.round(stats.averagePagesPerDay).toLocaleString() : '0'}<small>쪽/일</small></strong></div>
      </div>
      <section className="chart-section">
        <div className="section-heading">
          <h2>매달 쌓이는 이야기</h2>
          <span>월별 완독 책 수</span>
        </div>
        <div className="monthly-chart" aria-label={`${year}년 월별 완독 책 수`}>
          {stats.months.map((count, index) => (
            <div className="month-column" key={index}>
              <span className="month-value">{count || ''}</span>
              <div className="bar-space">
                <div
                  className="month-bar"
                  style={{
                    height: `${count ? Math.max(5, (count / Math.max(1, ...stats.months)) * 100) : 2}%`,
                  }}
                />
              </div>
              <span>{index + 1}월</span>
              <span className="sr-only">{count}권</span>
            </div>
          ))}
        </div>
        {!stats.count && <p className="chart-note">첫 완독을 기록하면 한 해의 흐름이 나타나요.</p>}
      </section>
      <section className="genre-section">
        <div>
          <span className="eyebrow">YOUR FAVORITE SHELF</span>
          <h2>자주 머문 세계</h2>
          <p>
            {stats.genres.length ? (
              <>
                가장 많이 읽은 장르는
                <br />
                <strong>{stats.genres[0][0]}</strong>이에요.
              </>
            ) : (
              <>
                아직 발견 중이에요.
                <br />
                읽은 책과 함께 취향이 쌓여요.
              </>
            )}
          </p>
          <ArrowUpRight size={22} />
        </div>
        <div className="genre-donut-wrap">
          {stats.genres.length ? <>
            <div className="genre-donut" style={{ background: 'conic-gradient(' + stats.genres.map(([, count], index) => { const begin = stats.genres.slice(0, index).reduce((sum, [, value]) => sum + value, 0); const colors = ['#35463b', '#8b9984', '#b6a58b', '#9b907d', '#c7bfb0']; return colors[index % colors.length] + ' ' + begin / genreTotal * 100 + '% ' + (begin + count) / genreTotal * 100 + '%' }).join(', ') + ')' }}><div className="genre-donut-center"><strong>{stats.genres[0][0]}</strong></div></div>
            <div className="genre-legend">{stats.genres.map(([genre, count], index) => <div className="genre-legend-row" key={genre}><span className="genre-swatch" style={{ background: ['#35463b', '#8b9984', '#b6a58b', '#9b907d', '#c7bfb0'][index % 5] }} /><span>{genre}</span><small>{Math.round(count / genreTotal * 100)}%</small></div>)}</div>
          </> : <p className="muted">완독한 책이 쌓이면 장르별 비율을 보여드려요.</p>}
          <small className="muted">장르 정보가 없는 책은 비율에서 제외됩니다.</small>
        </div>
      </section>
    </div>
  )
}
