import { LatinFallbackCard, SiteCard } from '@/lib/ogCard';
import { OG_CACHE, OG_SIZE, koreanFont } from '@/lib/ogFont';

export const runtime = 'nodejs';

/* 🔴 빌드 시각에 프리렌더하지 않는다. `@vercel/og`가 Windows에서 자기 내장 폰트 경로를
   잘못 만들어(ERR_INVALID_URL) **프로덕션 빌드 자체를 실패시킨다.**
   요청 시 생성으로 돌리면 빌드는 어디서든 통과하고, 비용은 OG_CACHE가 흡수한다. */
export const dynamic = 'force-dynamic';

export const alt = '오또케 — 이거 나만 그래?';
export const size = OG_SIZE;
export const contentType = 'image/png';

/* 🔴 홈은 **사이트 대표 카드**를 낸다. 첫 질문을 그리면 홈이 그 질문 페이지처럼 보이고,
   브랜드 공유에서 사이트 정체가 전달되지 않는다(개선문서 §4-1). */
export default async function Image() {
  const { ImageResponse } = await import('next/og');
  const font = await koreanFont();
  if (!font) return new ImageResponse(<LatinFallbackCard />, { ...size, headers: OG_CACHE });

  return new ImageResponse(<SiteCard />, {
    ...size,
    headers: OG_CACHE,
    fonts: [{ name: 'OGKorean', data: font, weight: 700, style: 'normal' }],
  });
}
