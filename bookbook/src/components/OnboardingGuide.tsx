import { useState } from 'react'
import { Search, BookOpen, Check, BarChart3, ChevronRight } from 'lucide-react'
import { Modal } from './Modal'

const steps = [
  {
    title: '책을 찾아 서재에 추가하기',
    description: '검색창에서 제목이나 작가를 검색해요. 책을 선택하고 책 읽기를 누르면 읽는 중인 책으로 추가돼요.',
  },
  {
    title: '다 읽은 책 기록하기',
    description: '읽는 중인 책을 선택해요. 완독 날짜, 별점, 감상을 남기면 책장에 완독 기록이 쌓여요.',
  },
  {
    title: '나만의 독서 흐름 확인하기',
    description: '홈에서는 읽은 책을 책장으로 확인하고, 마이페이지에서는 독서 통계와 추천 도서를 확인해요.',
  },
]

function GuideVisual({ step }: { step: number }) {
  if (step === 0) return <div className="guide-visual guide-search"><div className="guide-search-box"><Search size={15} /><span>데미안</span><i /></div><div className="guide-search-result"><div /><strong>데미안</strong><small>헤르만 헤세 · 민음사</small></div></div>
  if (step === 1) return <div className="guide-visual guide-record"><div className="guide-mini-book"><BookOpen size={21} /></div><div className="guide-record-card"><strong>기록하기</strong><span>완독 날짜　2026. 09. 20</span><div className="guide-stars">★ ★ ★ ★ ★</div><b><Check size={12} /> 저장했어요</b></div></div>
  return <div className="guide-visual guide-shelf"><div className="guide-mini-shelf"><i /><i /><i /><i /></div><div className="guide-donut"><span /></div><BarChart3 size={18} /></div>
}

export function OnboardingGuide({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const finish = () => { localStorage.setItem('bookbook-onboarding-v1', 'done'); onDone() }
  return <Modal title="BookBook 이용 안내" onClose={finish}>
    <div className="onboarding-guide">
      <div className="onboarding-progress"><span>{String(step + 1).padStart(2, '0')}</span><i /><small>03</small></div>
      <GuideVisual step={step} />
      <div className="onboarding-copy"><span className="eyebrow">BOOKBOOK GUIDE</span><h2>{steps[step].title}</h2><p>{steps[step].description}</p></div>
      <div className="onboarding-actions"><button className="text-button" onClick={finish}>건너뛰기</button><button className="primary-button" onClick={() => step === steps.length - 1 ? finish() : setStep(step + 1)}>{step === steps.length - 1 ? '시작하기' : '다음'}<ChevronRight size={16} /></button></div>
    </div>
  </Modal>
}