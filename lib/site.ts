/** 사이트 운영 정보.
 *
 *  🔴 **도메인을 하드코딩하지 않는다**(브리프 §10). `autokca.com`은 사람들이
 *  "auto + kca"로 오독하는 문제가 있어 교체 가능성이 열려 있다. 주소는 환경변수로만 다루고,
 *  코드·문서·카피에는 한글 브랜드 **「오또케」**를 쓴다.
 *
 *  Vercel에는 `NEXT_PUBLIC_SITE_URL`을 등록할 것. 없으면 로컬 주소로 떨어진다 —
 *  운영에서 이 폴백이 쓰이면 canonical·사이트맵·OG가 전부 localhost를 가리키므로
 *  배포 전 체크리스트에 넣어 두었다.
 */

const FALLBACK = 'http://localhost:3000';

function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return FALLBACK;
  return raw.replace(/\/$/, '');
}

export const SITE = {
  /** 브랜드 표기는 한글이다. 로마자는 주소로만 쓴다. */
  name: '오또케',
  wordmark: '오또케?!',
  url: siteUrl(),
  tagline: '이거 나만 그래?',
  description:
    '한 줄 질문에 예/아니오로 투표하고, 투표한 사람만 댓글을 씁니다. '
    + '나만 그런 줄 알았던 것들을 확인하세요.',
  /** 🔴 비워둘 수 없다 — 개인정보 보호법 제30조 ①6의 필수 기재사항(연락처).
   *  UGC를 받는 사이트라 삭제 요청·분쟁 창구로도 실제로 쓰인다. */
  email: 'devju546@gmail.com',
  /** 개인정보 보호책임자 표기. 제30조 ①6은 "성명 **또는** 부서의 명칭"을 요구하므로
   *  실명이 유일한 답은 아니다. 사업자등록을 하면 상호로 갈아끼우는 게 깔끔하다.
   *  ⚠️ **사업장 주소는 넣지 않는다** — 제30조 기재사항이 아니다. 주소 표시 의무는
   *  전자상거래법 제10조(통신판매업자)에서 나오고, 오또케는 재화·용역을 팔지 않는다. */
  privacyOfficer: 'JuDev',
  /** 방침·약관 시행일. 내용을 고치면 이 날짜도 함께 올릴 것. */
  effectiveDate: '2026-08-11',
} as const;

/* 표본 임계치는 `lib/tiers.ts`에 있다.
   여기에도 두면 두 곳이 어긋난다 — 실제로 TURNOUT_THRESHOLD가 새 체계와 겹쳐 있었다. */

/** 처리위탁 현황 — 개인정보처리방침이 그대로 참조한다.
 *  ⚠️ 실제로 붙이는 업체·리전이 바뀌면 **여기와 방침을 같이** 고쳐야 한다. */
/* ─── 검색엔진 소유 확인 · 방문 통계 ──────────────────────────
 *
 * 🔴 이 값들은 **비밀이 아니다.** 셋 다 HTML에 그대로 박혀 누구나 볼 수 있다
 *    (소유 확인 meta 2종, GA 측정 ID). 그래서 코드에 기본값으로 둔다.
 *
 *    환경변수만 쓰던 방식에서 바꿨다: 대시보드에 세 개를 따로 넣어야 하고,
 *    하나라도 빠지면 조용히 태그가 사라지는데 화면으로는 알 수 없다.
 *    코드에 있으면 배포와 함께 반드시 나가고 git 이력에도 남는다.
 *
 *    환경변수가 있으면 그쪽이 이긴다 — 도메인을 옮기거나 재발급받았을 때
 *    코드를 고치지 않고 덮어쓸 수 있게 남겨 둔다.
 */
export const VERIFICATION = {
  /** Google Search Console (2026-08-14 발급) */
  google:
    process.env.GOOGLE_SITE_VERIFICATION?.trim() ||
    '0Mvr32IAbPGe4A48f68r6NNURo_db5XRKt8ZIxFpqU8',
  /** 네이버 서치어드바이저 (2026-08-15 발급).
   *  ⚠️ 한국 서비스라 네이버 비중이 크다 — 구글만 하고 끝내지 않는다. */
  naver:
    process.env.NAVER_SITE_VERIFICATION?.trim() ||
    '83144607fa2dcca9f08c452fb85a7260f37de1d4',
} as const;

/** GA4 측정 ID. 실제 로드는 운영 배포에서만 일어난다(`components/Analytics.tsx`). */
export const GA_ID = process.env.GA_MEASUREMENT_ID?.trim() || 'G-3G3YE7VYBS';

export const PROCESSORS = [
  { name: 'Vercel Inc.', task: '웹사이트 호스팅 및 서버 로그 처리', region: '미국' },
  /* ap-northeast-2(서울). **국내 보관이라 Supabase 쪽은 국외 이전이 아니다.**
     리전을 옮기면 방침의 국외 이전 고지가 달라지므로 여기와 /privacy를 같이 고쳐야 한다. */
  { name: 'Supabase Inc.', task: '투표 집계 및 댓글 저장', region: '대한민국(서울)' },
] as const;

/** 실제로 쓰는 처리 위탁 업체 목록.
 *
 *  🔴 Google Analytics는 **쓸 때만** 넣는다. 개인정보 처리방침은 실제와 맞아야 한다 —
 *  안 쓰는 업체를 적어 두면 방침이 부정확해지고, 반대로 쓰는데 안 적으면 법령 위반이다.
 *  `GA_MEASUREMENT_ID`가 설정된 배포에서만 목록에 들어간다.
 *
 *  ⚠️ 이 판단은 **서버에서만** 유효하다(환경변수를 읽는다). `/privacy`는 서버 컴포넌트다. */
export interface Processor {
  name: string;
  task: string;
  region: string;
}

export function processors(): readonly Processor[] {
  /* `PROCESSORS`는 `as const`라 원소 타입이 리터럴이다 — 그대로 펼치면 새 항목을
     넣을 수 없다. 여기서 한 번 넓힌다. */
  const base: Processor[] = [...PROCESSORS];
  if (GA_ID) {
    base.push({
      name: 'Google LLC',
      task: '방문 통계 분석(Google Analytics)',
      region: '미국',
    });
  }
  return base;
}
