# 오또케

**이거 나만 그래?** — 한 줄 질문에 예/아니오로 투표하고, 투표한 사람만 댓글을 쓰는 사이트.

> 🔴 **기준 문서는 `ottoke-project-brief.md`다.** 구현 판단이 갈리면 그 문서의
> "설계 원칙"과 "MVP 범위"로 결정한다. 이 README는 그 결정이 코드에 어떻게 반영됐는지를 적는다.

## 돌려보기

```bash
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_SITE_URL만 있으면 뜬다
npm run dev
```

**Supabase 없이도 돌아간다.** 집계가 없으면 결과를 감추고 *"집계 서버가 연결되지 않아
결과를 표시하지 않습니다"* 라고 화면에 밝힌다. 가짜 숫자를 채우지 않는다.

## 집계·댓글 붙이기 (Supabase)

> 🔴 **오또케 전용 프로젝트를 새로 만든다.** 다른 사이트와 같은 프로젝트를 쓰지 않는다.
> `service_role` 키는 **프로젝트 단위 전권**이라, 오또케에 넣은 키가 유출되면 같은 프로젝트의
> 다른 데이터까지 다 열린다. 오또케는 UGC를 받아서 공격 표면이 더 넓다.
> 그리고 개인정보처리방침에 **처리위탁 대상과 보관 국가**를 명시해야 하는데,
> 프로젝트가 섞이면 어느 데이터가 어디 있는지 문서로 못 쓴다.

1. [supabase.com](https://supabase.com) → **New project**
   - **Region: Northeast Asia (Seoul)** — 한국 사용자 대상이라 지연이 줄어든다.
     여기서 고른 리전을 `lib/site.ts`의 `PROCESSORS`와 `/privacy`에 적어야 한다
   - 무료 플랜은 조직당 활성 프로젝트 수에 제한이 있다. 막히면 새 조직을 만든다
2. **SQL Editor**에 `supabase/schema.sql` 전체를 붙여 실행
   - 테이블 2개(`tallies`·`comments`) + 함수 9개가 만들어진다
   - `create ... if not exists` / `create or replace`라서 **여러 번 실행해도 안전하다**
3. **Project Settings → API Keys**에서 두 값을 복사해 `.env.local`에 넣는다
   ```
   SUPABASE_URL=https://xxxxxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
   ```
   - 🔴 **`sb_secret_…` 를 쓴다.** `sb_publishable_…`는 anon 대응이라 RLS에 막힌다
   - 🔴 **구형 JWT(`eyJ…`)를 쓰지 말 것.** 신규 프로젝트는 **레거시 JWT 키가 비활성**이라,
     역할·프로젝트 ref·만료가 다 맞는 멀쩡한 키인데도 `401 Invalid API key`가 난다.
     (2026-08-11에 실제로 여기서 막혔다. `npm run check:db`가 이 경우를 짚어 준다)
4. **연결 확인**
   ```bash
   npm run check:db
   ```
   환경변수 → 인증 → 함수 9개 → 실제 쓰기(투표·댓글·공감·신고 자동 숨김)까지 순서대로 확인하고
   어디서 끊겼는지 알려준다. 쓰기 검증은 `__selftest__`라는 가짜 질문 id로만 하고,
   지우는 SQL을 마지막에 출력한다
5. Vercel 환경변수에 같은 두 값 + `NEXT_PUBLIC_SITE_URL` 등록
6. `/privacy`의 붉은 칸(운영자 성명·주소·**리전**) 채우기

## 설계 원칙이 코드에 들어간 곳

| 브리프 | 구현 |
|---|---|
| 원칙 1·2 — 세션당 PV가 매출, 홈으로 돌려보내지 않는다 | `components/Feed.tsx` + `app/api/feed` — 결과 아래에 다음 질문이 자동으로 붙는다 |
| §3 — 진지 3 : 병맛 7, 두 갈래로 굴린다 | `lib/questions.ts`의 `kind` + `feedOrder()`가 **진지 1 : 병맛 2**로 번갈아 짠다 |
| §4 — 진영 분리 댓글 | `components/Comments.tsx` — 2열, 내 쪽만 작성, **반대편 1위를 항상 상단** |
| §5 — 유머는 말투에 | `Ballot`의 판정 문구, 댓글 게이트/빈 상태 문구 |
| 원칙 4 — 사람들은 스크린샷을 퍼간다 | `lib/ogCard.tsx` — 질문·비율·응답자 수 + **도메인 워터마크** |
| §6 — 질문 문장이 검색 쿼리 | 한글 슬러그 `/q/축의금-5만원` · `lib/seo.ts`가 수치를 문장으로 |
| §6 — thin content 주의 | 투표 30·댓글 3 미달이면 `noindex`(`lib/site.ts`의 임계치) |
| §6 — 집계 페이지 | `/best` — 팽팽한 질문 / 몰린 질문 / 표 많은 질문 |
| §10 — 도메인 하드코딩 금지 | `NEXT_PUBLIC_SITE_URL` 하나만 바꾸면 교체된다 |

## 구조

| 경로 | 역할 |
|---|---|
| `lib/questions.ts` | **질문 큐 + 슬러그 + kind + `feedOrder()`.** 이 프로젝트의 자산 |
| `lib/supabase.ts` | PostgREST 호출 한 곳. 환경변수 없으면 전부 null |
| `lib/votes.ts` | 집계 읽기/쓰기 · `readAllTallies`(/best용) |
| `lib/comments.ts` | 댓글 + **입력 검증(모더레이션의 관문)** |
| `lib/ogCard.tsx` | 공유 카드 — 워터마크가 여기 있다 |
| `components/Feed.tsx` | 무한 스크롤 |
| `components/Ballot.tsx` | 투표용지 한 장 |
| `components/Comments.tsx` | 진영 분리 댓글 |
| `components/voteState.ts` | **투표 여부의 진실을 서버에서 받아 오는 곳** |
| `app/q/[slug]/` | 질문 페이지(검색 착지) + 댓글 + 이어지는 피드 |
| `app/best/` | 집계 페이지 |
| `app/me/` | 성향 확인서. 브라우저 기록만 · noindex |

## 손대기 전에 알아야 할 것

- 🔴 **질문 `id`를 바꾸지 않는다** — 집계 테이블의 키다. 바꾸면 표가 사라진다
- 🔴 **`slug`도 바꾸지 않는다** — URL이다. 바꾸면 색인과 외부 링크가 깨진다
- 🔴 **투표 여부는 쿠키가 진실이다.** localStorage는 첫 화면용 힌트일 뿐이고
  `GET /api/vote`의 응답으로 덮는다. 되돌리면 둘이 어긋나 사용자가
  "투표한 것처럼 보이는데 댓글도 못 쓰고 다시 투표도 못 하는" 상태에 갇힌다
- 🔴 **댓글 진영은 클라이언트 값이 아니라 httpOnly 쿠키에서 읽는다.**
  클라이언트를 믿으면 투표 없이 아무 진영으로 쓸 수 있다
- **질문에 성별 갈등·정치 진영·종교를 넣지 않는다.** 논쟁은 되지만 모더레이션 부담이
  폭발하고 첫인상이 거기서 망가진다 (`lib/questions.ts` 규칙 4)

## 알려진 함정

- **지금은 모든 질문 페이지가 `noindex`다.** thin content 게이트(투표 30·댓글 3) 때문이다.
  닭-달걀처럼 보이지만 브리프 §8이 답이다 — **트래픽은 커뮤니티 시딩으로 만든다.**
  시딩으로 표가 쌓이면 색인이 자동으로 열린다. SEO보다 시딩이 먼저다
- **OG 이미지는 로컬 Windows에서 검증할 수 없다.** `@vercel/og`가 자기 내장 폰트 경로를
  잘못 만들어 죽는다(Windows 한정). 그래서 빌드 프리렌더에서 뺐다.
  **첫 배포 때 `/opengraph-image`를 눈으로 확인할 것**
- **OG 폰트를 교체할 땐 static을 넣어야 한다.** satori는 variable 폰트를 못 읽어서
  `PretendardVariable.ttf`를 넣으면 조용히 한글 없는 폴백으로 떨어진다 → `assets/README.md`
- **dev 서버가 돌 때 `npm run build`를 하지 말 것.** 같은 `.next/`를 써서 dev가
  `MODULE_NOT_FOUND`로 500을 낸다. dev를 내리고 `.next`를 지운 뒤 빌드한다

## 운영

- [ ] **큐가 30개 밑으로 떨어지면 다음 묶음을 쓴다.** 생성은 자동, **발행은 수동**(브리프 §3)
- [ ] 참여자 수는 100표 미달이면 감춘다 (`TURNOUT_THRESHOLD`)
- [ ] 애드센스는 트래픽 안정화 후. 딱칼크가 승인된 계정에 사이트를 추가하는 편이 쉽다
- [ ] 금칙어 목록은 최소 방어선이다. 완벽하게 만들려 하면 정상 댓글이 막힌다 —
      신고 3회 자동 숨김이 2차 방어선인 걸 전제로 둔 값이다

## 배포 전 체크리스트

- [ ] 🔴 `/privacy`의 붉은 칸 — `lib/site.ts`의 `privacyOfficer`와 `PROCESSORS[].region`.
      **둘을 채우면 페이지 상단 경고가 자동으로 사라진다**
      - 개인정보 보호법 제30조 ①6은 **"성명 또는 부서의 명칭과 연락처"** 를 요구한다.
        실명이 유일한 답은 아니고, 사업자등록을 하면 상호로 갈아끼우면 된다
      - ⚠️ **사업장 주소는 넣지 않는다.** 제30조 기재사항이 아니다.
        주소 표시 의무는 전자상거래법 제10조(통신판매업자) 것이고, 오또케는 재화·용역을 팔지 않는다
      - 이메일은 비워둘 수 없다(같은 조항의 연락처). UGC 삭제 요청 창구로도 실제로 쓰인다
- [ ] `NEXT_PUBLIC_SITE_URL` (없으면 canonical·사이트맵·OG가 localhost를 가리킨다)
- [ ] Supabase 환경변수
- [ ] `assets/og-korean.ttf`
- [ ] GSC·네이버 서치어드바이저 등록 + 사이트맵 제출

## 배포

저장소: https://github.com/jooyong319-png/autokca

1. **Vercel → Add New → Project → 이 저장소 Import**
   - 프레임워크는 Next.js로 자동 감지된다. 빌드 설정을 손댈 필요 없다
2. **환경변수 3개 등록** (Production + Preview 둘 다)
   | 이름 | 값 |
   |---|---|
   | `NEXT_PUBLIC_SITE_URL` | `https://autokca.com` |
   | `SUPABASE_URL` | `.env.local`에서 복사 |
   | `SUPABASE_SERVICE_ROLE_KEY` | `.env.local`에서 복사 (`sb_secret_…`) |
   > 🔴 `NEXT_PUBLIC_SITE_URL`은 **빌드 시각에 박힌다.** 나중에 추가하면 **재배포해야** 반영된다.
   > 빠뜨리면 사이트는 멀쩡히 뜨는데 canonical·사이트맵·OG가 전부 localhost를 가리킨다 —
   > 눈으로는 안 보이고 검색엔진에만 안 잡힌다

   **Sensitive(쓰기 전용) 설정은 `SUPABASE_SERVICE_ROLE_KEY` 하나만 켠다.**
   - `SUPABASE_SERVICE_ROLE_KEY` — ✅ RLS를 우회하는 전권 키다. 다시 못 읽는 게 맞다.
     값을 확인할 일이 생기면 Supabase 대시보드에서 다시 복사하거나 키를 회전시킨다
   - `SUPABASE_URL` — ❌ 비밀이 아니다. 켜도 얻는 게 없고 확인만 불편해진다
   - `NEXT_PUBLIC_SITE_URL` — ❌ **절대 켜지 않는다.** `NEXT_PUBLIC_`은 **클라이언트 번들에
     박혀 모든 브라우저로 나간다는 뜻**이다. 구조적으로 공개된 값이라 Sensitive는 의미가 없고,
     "가려졌다"는 착각만 만든다
3. **Settings → Domains 에 `autokca.com` 추가**
   - `autokca.com`은 이미 Vercel 네임서버를 쓰고 A 레코드도 Vercel을 가리킨다(확인: 2026-08-10).
     **DNS 작업이 필요 없다**
   - 🔴 **apex를 Primary로 둔다.** Vercel은 `www`를 정본으로 잡는 경우가 있는데
     (2026-08-12 실제로 그렇게 됐다), 그러면 `NEXT_PUBLIC_SITE_URL`과 어긋나
     canonical·사이트맵·**OG 이미지 URL이 전부 308**이 된다.
     카카오톡·페이스북은 이미지 리다이렉트를 안 따라가는 경우가 있어 **공유 카드가 안 뜬다** —
     공유가 주 유입 경로인 사이트에서 제일 아픈 실패다.
     www를 정본으로 쓰고 싶으면 `NEXT_PUBLIC_SITE_URL`을 www 주소로 바꾸고 재배포한다.
     **무엇을 골라도 환경변수와 실제 도메인이 같아야 한다**
4. **배포 확인**
   ```bash
   npm run check:deploy https://autokca.com
   ```
   라우트 · 환경변수 반영 · 집계 연결 · 한글 슬러그 · 구조화 데이터 · soft-404 ·
   OG 이미지 · 보안 헤더를 한 번에 본다
5. **OG 이미지는 눈으로 확인한다** — 폰트가 안 먹으면 한글 대신 `OTTOKE?!`만 나온다
   - `https://autokca.com/opengraph-image`
   - `https://autokca.com/q/축의금-5만원/opengraph-image`

### 프리뷰 배포

프리뷰는 **살려 두고 색인만 막는다**(`X-Robots-Tag: noindex`).
프로덕션의 `*.vercel.app` 별칭만 정규 도메인으로 301한다 —
조건 없이 걸면 브랜치 프리뷰까지 프로덕션으로 날아가 미리보기가 무용지물이 된다.
