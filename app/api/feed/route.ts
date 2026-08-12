import { NextResponse } from 'next/server';
import { docNumber, feedOrder } from '@/lib/questions';
import { readTally } from '@/lib/votes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGE = 3;
const MAX_OFFSET = 500;

/** 무한 스크롤용 다음 묶음(브리프 원칙 2).
 *
 *  홈으로 돌려보내지 않고 **바로 아래에 다음 질문을 붙인다.** 세션당 PV가 매출을
 *  결정하므로(원칙 1) 이 라우트가 이 사이트에서 가장 중요한 API다.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const exclude = params.get('exclude') ?? undefined;
  const offset = Math.min(Math.max(Number(params.get('offset') ?? 0) || 0, 0), MAX_OFFSET);

  const order = feedOrder(exclude);
  const slice = order.slice(offset, offset + PAGE);

  const items = await Promise.all(
    slice.map(async question => ({
      question,
      docNo: docNumber(question),
      tally: await readTally(question.id),
    })),
  );

  return NextResponse.json({
    items,
    nextOffset: offset + slice.length,
    done: offset + slice.length >= order.length,
  });
}
