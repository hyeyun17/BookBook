import { useState } from 'react'
import { LogOut, BookOpen, Files, Star, ArrowUpRight } from 'lucide-react'
import { useLibrary } from '../context/library'
import { currentYear, statistics } from '../utils/reading'
import { YearSelector } from '../components/YearSelector'
export function MyPage() {
  const { records, books, user, signOut, preview } = useLibrary()
  const [year, setYear] = useState(currentYear())
  const [error, setError] = useState('')
  const stats = statistics(records, books, year)
  const genreTotal = stats.genres.reduce((sum, [, count]) => sum + count, 0)
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">A PORTRAIT IN BOOKS</span>
          <h1>책으로 들여다본 나.</h1>
          <p>{user?.displayName}님의 읽는 시간들을 모았어요.</p>
        </div>
        <button
          className="text-button logout-button"
          onClick={async () => {
            try {
              await signOut()
            } catch {
              setError('로그아웃하지 못했어요. 다시 시도해 주세요.')
            }
          }}
        >
          <LogOut size={16} />
          {preview ? '미리보기 종료' : '로그아웃'}
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
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
        <div className="genre-bars">
          {stats.genres.length ? (
            stats.genres.map(([genre, count]) => (
              <div className="genre-row" key={genre}>
                <div>
                  <span>{genre}</span>
                  <small>
                    {count}권 · {Math.round((count / genreTotal) * 100)}%
                  </small>
                </div>
                <div className="genre-track">
                  <i style={{ width: `${(count / genreTotal) * 100}%` }} />
                </div>
              </div>
            ))
          ) : (
            <p className="muted">
              장르 정보가 있는 책을 완독하면
              <br />
              이곳에 장르별 비율이 표시돼요.
            </p>
          )}
          <small className="muted">장르 정보가 없는 책은 비율에서 제외됩니다.</small>
        </div>
      </section>
    </div>
  )
}
