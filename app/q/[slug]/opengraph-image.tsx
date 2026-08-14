import { LatinFallbackCard, QuestionCard } from '@/lib/ogCard';
import { OG_CACHE, OG_SIZE, koreanFont } from '@/lib/ogFont';
import { docNumber } from '@/lib/questions';
import { findBySlug } from '@/lib/catalog';
import { readTally } from '@/lib/votes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const alt = '오또케 투표 결과';
export const size = OG_SIZE;
export const contentType = 'image/png';

/** 질문별 카드(브리프 §7) — 커뮤니티에 링크를 던질 때 미리보기가 클릭률을 가른다. */
export default async function Image({ params }: { params: { slug: string } }) {
  const { ImageResponse } = await import('next/og');
  const font = await koreanFont();
  if (!font) return new ImageResponse(<LatinFallbackCard />, { ...size, headers: OG_CACHE });

  let slug = params.slug;
  try {
    slug = decodeURIComponent(slug);
  } catch {
    /* 잘못된 인코딩이면 원문 그대로 조회한다 */
  }

  const question = await findBySlug(slug);
  if (!question) {
    return new ImageResponse(<LatinFallbackCard />, { ...size, headers: OG_CACHE });
  }

  const tally = await readTally(question.id);

  return new ImageResponse(
    <QuestionCard question={question} tally={tally} docNo={docNumber(question)} />,
    {
      ...size,
      headers: OG_CACHE,
      fonts: [{ name: 'OGKorean', data: font, weight: 700, style: 'normal' }],
    },
  );
}
