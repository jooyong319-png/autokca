import { NextResponse } from 'next/server';
import { catalog } from '@/lib/catalog';
import { readAllTallies } from '@/lib/votes';

export const runtime = 'nodejs';
export const revalidate = 300;

/** 사이트 전체 누적 표 수(개선문서 §5-3).
 *
 *  개별 질문의 표가 적어도 사이트 전체는 살아 있게 보이는 장치다.
 *  클라이언트에서 불러 쓴다 — 레이아웃에 넣어 서버에서 그리면 정적 페이지
 *  (/about, /terms 등)까지 매 요청 렌더로 바뀐다. 장식 하나 때문에 그럴 이유가 없다.
 */
export async function GET() {
  const tallies = await readAllTallies();
  let votes = 0;
  for (const t of tallies.values()) votes += t.a + t.b;

  return NextResponse.json({
    votes,
    questions: (await catalog()).length,
    live: tallies.size > 0 || votes > 0,
  });
}
