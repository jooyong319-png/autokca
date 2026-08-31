import { NextResponse } from 'next/server';
import { catalog } from '@/lib/catalog';
import { readAllCommentCounts } from '@/lib/comments';
import { QUESTIONS } from '@/lib/questions';
import { TIER, indexable } from '@/lib/tiers';
import { readAllTallies } from '@/lib/votes';

export const runtime = 'nodejs';
export const revalidate = 300;

const EMPTY = { a: 0, b: 0, live: false } as const;

/** 사이트 전체 누적 표 수(개선문서 §5-3).
 *
 *  개별 질문의 표가 적어도 사이트 전체는 살아 있게 보이는 장치다.
 *  클라이언트에서 불러 쓴다 — 레이아웃에 넣어 서버에서 그리면 정적 페이지
 *  (/about, /terms 등)까지 매 요청 렌더로 바뀐다. 장식 하나 때문에 그럴 이유가 없다.
 *
 *  🔴 **응답이 스스로를 설명하게 만든다**(2026-09-01).
 *
 *  주간 점검이 두 번 연속 같은 오탐을 냈다: "API는 118인데 `lib/questions.ts`에는 103개뿐,
 *  DB에 옛 질문 15개가 남아 있는 듯 — 정합성 확인 필요."
 *  둘이 다른 게 **정상**이다. `questions`는 `catalog().length`(코드 + 관리 화면 발행분)다.
 *
 *  위키에 적어 두는 것으로는 안 고쳐졌다 — 점검하는 쪽이 그 문서를 읽는다는 보장이 없다.
 *  그래서 **숫자 옆에 출처를 같이 실어 보낸다.** 문서를 안 읽어도 응답만 보면
 *  118 = 103 + 15라는 게 드러난다. 설명이 필요한 데이터는 설명을 데리고 다녀야 한다.
 *
 *  `indexed`도 같은 이유다. 점검이 색인 문턱을 "20표 + 댓글 1개"로 보고했는데
 *  2026-08-18에 5표 + 댓글 2개로 내렸다. 기준을 응답에 실으면 어긋날 수가 없다.
 */
export async function GET() {
  const [tallies, commentCounts, all] = await Promise.all([
    readAllTallies(),
    readAllCommentCounts(),
    catalog(),
  ]);

  let votes = 0;
  for (const t of tallies.values()) votes += t.a + t.b;

  const indexed = all.filter(q =>
    indexable(tallies.get(q.id) ?? EMPTY, commentCounts.get(q.id) ?? 0),
  ).length;

  return NextResponse.json({
    votes,
    questions: all.length,
    /* 🔴 `questions`가 `code`보다 큰 것은 정상이다. 작으면 그때가 이상 신호다 —
       코드에 박힌 바닥이 무너졌다는 뜻이기 때문이다. */
    source: {
      code: QUESTIONS.length,
      published: all.length - QUESTIONS.length,
    },
    /** 색인이 열린 질문 수(사이트맵에 들어가는 것과 같은 판정) */
    indexed,
    /** 그 판정에 쓰는 기준. 바뀌면 여기도 같이 바뀐다(`lib/tiers.ts` 단일 소스) */
    indexThreshold: { votes: TIER.INDEX, comments: TIER.INDEX_COMMENTS },
    live: tallies.size > 0 || votes > 0,
  });
}
