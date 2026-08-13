import { NextResponse } from 'next/server';
import { readVotedIds } from '@/lib/cookies';
import { docNumber, feedOrder } from '@/lib/questions';
import { readAllCommentCounts, readAllTopComments } from '@/lib/comments';
import { readAllTallies, readTally } from '@/lib/votes';

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

  /* 서버 렌더와 같은 순서여야 한다 — 순서가 어긋나면 같은 질문이 두 번 나온다 */
  const [tallies, commentCounts, tops] = await Promise.all([
    readAllTallies(),
    readAllCommentCounts(),
    readAllTopComments(),
  ]);
  /* 🔴 이 라우트는 이미 `force-dynamic`이라 **쿠키를 읽어도 잃을 캐시가 없다.**
     홈(`/`)은 ISR이라 쿠키를 못 읽는다 — 그래서 홈은 안건 1장만 서버에서 심고
     나머지는 여기서 개인화해 내려준다(7차 §4-3의 ISR 충돌을 이렇게 우회했다). */
  const votedIds = readVotedIds(request);
  const order = feedOrder(
    exclude,
    id => {
      const t = tallies.get(id);
      return t ? t.a + t.b : 0;
    },
    id => votedIds.has(id),
  );
  const slice = order.slice(offset, offset + PAGE);

  const items = await Promise.all(
    slice.map(async question => ({
      question,
      docNo: docNumber(question),
      tally: await readTally(question.id),
      commentCount: commentCounts.get(question.id) ?? 0,
      tops: tops.get(question.id),
    })),
  );

  return NextResponse.json({
    items,
    nextOffset: offset + slice.length,
    done: offset + slice.length >= order.length,
  });
}
