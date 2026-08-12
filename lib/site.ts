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
export const PROCESSORS = [
  { name: 'Vercel Inc.', task: '웹사이트 호스팅 및 서버 로그 처리', region: '미국' },
  /* ap-northeast-2(서울). **국내 보관이라 Supabase 쪽은 국외 이전이 아니다.**
     리전을 옮기면 방침의 국외 이전 고지가 달라지므로 여기와 /privacy를 같이 고쳐야 한다. */
  { name: 'Supabase Inc.', task: '투표 집계 및 댓글 저장', region: '대한민국(서울)' },
] as const;
