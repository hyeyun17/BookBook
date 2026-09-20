# BookBook · 북북

독후감조차 부담스러운 현대인을 위한 가벼운 독서 기록 앱입니다. 기존 React + Vite + TypeScript 시작 프로젝트 위에 구현했습니다.

## 실행

Node.js 22.12 이상을 사용합니다. 현재 작업 폴더는 `C:\project\bookbook\bookbook`입니다.

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Firebase 설정이 없으면 로그인 화면에서 **로컬 미리보기**를 선택할 수 있습니다. 이 모드는 Google 로그인이나 클라우드 저장을 흉내 내지 않으며, 별도 localStorage에만 기록을 저장합니다. 샘플 책이나 독서 기록은 자동으로 생성하지 않습니다. 검색은 이 모드에서도 실제 YES24 서버 키가 필요합니다.

## 환경변수

`.env.local`에 다음 값을 설정하고 개발 서버를 다시 시작합니다.

| 변수                        | 용도                               |
| --------------------------- | ---------------------------------- |
| `VITE_FIREBASE_API_KEY`     | Firebase 웹 앱 API 키              |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase 인증 도메인               |
| `VITE_FIREBASE_PROJECT_ID`  | Firebase 프로젝트 ID               |
| `VITE_FIREBASE_APP_ID`      | Firebase 웹 앱 ID                  |
| `YES24_API_KEY`             | YES24 Open API 키, 서버에서만 사용 |

YES24 키는 `VITE_` 접두사를 붙이면 안 됩니다. `/api/books` 서버 함수가 YES24 요청을 대행하며 브라우저 번들에 키를 포함하지 않습니다. 검색 결과는 5분, ISBN 상세 정보는 24시간 서버와 세션 캐시에 저장하고, 서버 요청 간격을 조절해 YES24의 초당 10회 한도를 넘지 않도록 합니다. 상세 정보가 없으면 300페이지·미분류로 처리합니다.

## Firebase 연결

1. Firebase 콘솔에서 웹 앱을 등록하고 위 네 가지 설정을 복사합니다.
2. Authentication → Sign-in method에서 Google을 활성화합니다.
3. Authentication → Settings → Authorized domains에 localhost와 실제 배포 도메인을 등록합니다.
4. Cloud Firestore 데이터베이스를 만들고 저장소 위치를 선택합니다.
5. `firestore.rules`를 Firebase 콘솔의 Rules 탭에 적용하거나 Firebase CLI로 배포합니다.

```powershell
firebase deploy --only firestore:rules --project YOUR_PROJECT_ID
```

데이터는 `users/{uid}/books/{bookId}`, `users/{uid}/records/{recordId}`에 분리됩니다. 클라이언트의 userId 필터에만 의존하지 않고 규칙에서 로그인한 uid와 경로 uid를 검사합니다. 책 추가는 책 정보와 기록을 한 배치로 저장합니다. 실제 계정 간 데이터 격리는 Firebase 프로젝트 연결 후 두 계정으로 확인해야 합니다.

## Vercel 배포

1. Vercel에서 이 프로젝트 폴더를 연결합니다. 저장소 최상위가 `C:\project\bookbook`에 대응한다면 Root Directory는 `bookbook`으로 설정합니다.
2. Framework Preset은 Vite, Build Command는 `npm run build`, Output Directory는 `dist`입니다.
3. 위 환경변수를 Preview / Production 환경에 각각 설정합니다.
4. 배포 후 배포 도메인을 Firebase Authorized domains에 추가합니다.

```powershell
vercel
vercel --prod
```

`vercel.json`에 SPA 라우팅을 설정했으며 `/api/books`와 정적 파일은 SPA fallback에서 제외됩니다. `api/books.ts`는 Vercel Node 함수입니다. 실제 배포에는 Vercel 로그인과 프로젝트 선택이 필요합니다. `npm run preview`는 정적 빌드 확인용이므로 서버 API를 실행하지 않습니다. 전체 기능은 `npm run dev` 또는 Vercel 환경에서 확인합니다.

## 구조

```text
src/
  pages/          Home, Search, Reading, Complete, Library, MyPage, Login
  components/     책장, 책 표지, 모달, 평점, 연도 선택, 내비게이션, PWA 상태
  context/        인증 및 사용자별 독서 데이터 상태
  services/       Firebase, Firestore, YES24 검색·상세
  types/          Book, ReadingRecord, User, Completion
  utils/          날짜, 책등 너비, 선반 배치, 통계, 입력 검증
  index.css       전역 컬러 토큰과 반응형 UI
api/books.ts      Vercel API 진입점
server/           로컬 개발/Vercel 공용 YES24 핸들러
public/           PWA 아이콘
firestore.rules   사용자별 데이터 접근 및 기록 검증
```

라우트: `/`, `/reading`, `/library`, `/mypage`, `/search`, `/record/:id`.

## 동작 원칙

- 기본 배경 `#F7F4EE`, 본문 `#252420`, 인터랙션 `#35463B`를 CSS 변수로 공유합니다.
- 별점 1~5점만으로 완독할 수 있으며 독후감 입력은 펼쳤을 때만 표시합니다.
- 동일 bookId로 여러 독서 기록을 생성하므로 재독이 이전 기록을 덮어쓰지 않습니다.
- 책장 연도와 월별 통계는 `finishedAt` 기준입니다. 책장 순서는 최초 완독 저장 시각 `completedAt`을 사용하여 날짜·독후감을 수정해도 순서가 바뀌지 않습니다.
- 책등 너비는 `clamp(28, 22 + pageCount × 0.07, 66)` 픽셀입니다.
- ResizeObserver로 실제 너비를 측정하고 선반을 추가합니다. 새 선반의 등장 후 책 삽입을 지연 실행합니다.
- 읽는 중 화면은 CSS scroll-snap 기반으로 터치 스와이프와 이전/다음 버튼을 지원합니다.
- 라이브러리는 완독 기록 기준이며 재독도 별도 기록으로 표시합니다. 모바일에서는 3열입니다.
- 장르 통계는 YES24 응답의 카테고리를 대표 장르로 사용하고 미분류를 제외합니다.
- PWA는 앱 파일만 캐시합니다. 검색 결과·인증 응답·사용자 기록을 서비스 워커에 캐시하지 않습니다. 클라우드 오프라인 편집은 MVP 범위에 포함하지 않습니다.
- PWA 새 버전은 사용자에게 업데이트 버튼을 보여주어 작성 중인 폼을 강제로 새로고침하지 않습니다.

## 검증

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd test
npm.cmd run test:e2e
npm.cmd run format
```

Playwright 테스트는 로컬 Chrome을 사용하며, 없다면 `npx playwright install chrome`으로 설치합니다. 테스트의 외부 API 응답은 명시적인 fixture로 대체하고, 실제 기록 흐름·브라우저 저장·모바일 레이아웃을 검증합니다. 단위 테스트는 페이지 수 기본값, ISBN 매칭, 연속적인 책등 너비, 자동 선반 배치, 연도·장르 통계, 날짜·별점 검증, 서버 API 오류 처리를 검증합니다.

실서비스 최종 확인은 Firebase/YES24 환경변수 설정 후 Google 로그인, 실 검색, 사용자별 데이터 격리, 실제 기기 PWA 설치, Vercel 배포 URL에서 직접 수행해야 합니다.

## 공식 참고 문서

- [Firebase Google 로그인](https://firebase.google.com/docs/auth/web/google-signin)
- [Firestore Security Rules](https://firebase.google.com/docs/rules/basics)
- [YES24 Open API](https://developers.yes24.com/docs)
- [YES24 API 상품 상세](https://developers.yes24.com/api-doc/goods-item-detail)
- [Vite PWA](https://vite-pwa-org.netlify.app/guide/)
- [Vercel Node Functions](https://vercel.com/docs/functions/runtimes/node-js)

PWA 프로덕션 검증은 `npm run build` 후 별도 터미널에서 `npm run preview -- --host 127.0.0.1`을 실행하고 `npm run test:pwa`로 수행합니다. 서비스 워커 등록, manifest, 오프라인 재진입 및 SPA 경로 fallback을 검사합니다.
