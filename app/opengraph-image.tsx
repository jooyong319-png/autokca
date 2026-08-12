import { LatinFallbackCard, QuestionCard } from '@/lib/ogCard';
import { OG_CACHE, OG_SIZE, koreanFont } from '@/lib/ogFont';
import { docNumber, leadQuestion } from '@/lib/questions';
import { readTally } from '@/lib/votes';

export const runtime = 'nodejs';

/* 🔴 빌드 시각에 프리렌더하지 않는다. `@vercel/og`가 Windows에서 자기 내장 폰트 경로를
   잘못 만들어(ERR_INVALID_URL) **프로덕션 빌드 자체를 실패시킨다.**
   요청 시 생성으로 돌리면 빌드는 어디서든 통과하고, 비용은 OG_CACHE가 흡수한다. */
export const dynamic = 'force-dynamic';

export const alt = '오또케 — 이거 나만 그래?';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  const { ImageResponse } = await import('next/og');
  const font = await koreanFont();
  if (!font) return new ImageResponse(<LatinFallbackCard />, { ...size, headers: OG_CACHE });

  const question = leadQuestion();
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
