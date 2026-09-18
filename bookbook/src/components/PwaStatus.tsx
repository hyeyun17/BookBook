import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
export function PwaStatus() {
  const [online, setOnline] = useState(navigator.onLine)
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  if (!online)
    return (
      <div className="pwa-notice" role="status">
        오프라인이에요. 검색과 클라우드 저장은 연결 후 이용해 주세요.
      </div>
    )
  if (!needRefresh) return null
  return (
    <div className="pwa-notice" role="status">
      <span>새 버전이 준비되었어요. 작성 중인 기록을 저장한 뒤 업데이트해 주세요.</span>
      <button onClick={() => void updateServiceWorker(true)}>업데이트</button>
      <button onClick={() => setNeedRefresh(false)}>나중에</button>
    </div>
  )
}
