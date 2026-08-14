import type { Metadata } from 'next';
import { Feed, type FeedItem } from '@/components/Feed';
import { docNumber, feedOrder, questionOfDay, seoulDayKey } from '@/lib/questions';
import { catalog } from '@/lib/catalog';
import { SITE } from '@/lib/site';
import { readAllCommentCounts, readAllTopComments } from '@/lib/comments';
import { readAllTallies, readTally } from '@/lib/votes';

/* 득표율이 살아 있는 느낌을 주면서 요청 수도 감당되는 값 */
export const revalidate = 60;

/** 🔴 서버에서 미리 그리는 개수 **1장**(3장에서 줄였다, 7차 §4-3).
 *
 *  홈은 ISR(`revalidate = 60`)이라 **쿠키를 읽을 수 없다** — 읽는 순간 매 요청 렌더가 되고,
 *  홈은 이 사이트에서 가장 많이 열리는 페이지다. 그래서 "미투표 우선"을 홈에서는 못 한다.
 *
 *  대신 서버가 심는 카드를 1장으로 줄이고, 2장부터는 `/api/feed`(이미 dynamic)가
 *  쿠키를 읽어 **미투표를 앞으로** 정렬해 내려준다. 이미 투표한 카드가 앞에 올 수 있는
 *  경우는 이 첫 1장뿐이고, 그 카드에는 "처리됨" 도장이 찍혀 "또 나왔네"가 아니라
 *  "내가 처리한 건"으로 읽힌다(§4-3(2)).
 *
 *  한 화면 = 한 카드이므로 1장만 심어도 첫 화면이 비어 보이지 않는다.
 *  sentinel이 600px 앞에서 미리 받아오므로 스크롤이 멈추지도 않는다. */
const SEED = 1;

/* 🔴 홈 제목을 첫 질문 제목으로 두면 안 된다(개선문서 §4-1).
 *
 *  · 브랜드 검색("오또케")에서 사이트가 무엇인지 전달되지 않는다
 *  · 같은 제목이 홈과 /q/[slug] 두 URL에 붙어 중복으로 읽힌다
 *
 *  질문별 제목·OG는 `/q/[slug]`가 담당한다. 홈은 사이트를 설명한다. */
export const metadata: Metadata = {
  title: {
    absolute: `${SITE.wordmark} — ${SITE.tagline}`,
  },
  description: SITE.description,
  alternates: { canonical: SITE.url },
  openGraph: {
    title: `${SITE.wordmark} — ${SITE.tagline}`,
    description: SITE.description,
    url: SITE.url,
  },
};

export default async function HomePage() {
  /* 표를 한 번에 받아 피드 앞자리를 채워진 질문으로 세운다(§5-2).
     질문마다 readTally를 부르면 100번 왕복한다. */
  const [tallies, commentCounts, tops, all] = await Promise.all([
    readAllTallies(),
    readAllCommentCounts(),
    readAllTopComments(),
    /* 코드 103개 + 관리 화면에서 발행한 안건 */
    catalog(),
  ]);
  const votesOf = (id: string) => {
    const t = tallies.get(id);
    return t ? t.a + t.b : 0;
  };
  const order = feedOrder(all, undefined, votesOf);

  /* 🔴 홈 첫 카드는 **상위권 안에서 매일 회전**한다(`questionOfDay`).
   *
   *  전에는 표 1위가 그대로 첫 카드였는데, 첫 카드가 노출을 가장 많이 받아 표를 가장
   *  많이 얻고 그래서 계속 첫 카드가 되는 잠금이 생겼다. 신규 방문자는 영원히 같은
   *  첫인상을 받는다.
   *
   *  0표짜리는 후보에서 뺀다 — 첫 화면이 "아직 아무도 안 눌렀습니다"면 죽은 사이트로 보인다.
   *  후보가 2개 미만이면 회전하지 않고 기존 순서를 그대로 쓴다(돌릴 만큼 쌓이지 않았다).
   *
   *  🔴 **날짜로 정한다**(`Math.random()`이 아니다). 무작위면 새로고침마다 바뀌어
   *  ISR 캐시가 무의미해지고 "오늘의 안건"으로 인식되지도 않는다.
   *  하루 종일 같은 값이라 `revalidate = 60` 캐시가 그대로 유효하다. */
  const rankedSerious = order.filter(q => q.kind === 'serious' && votesOf(q.id) > 0);
  const featured = questionOfDay(rankedSerious, seoulDayKey());
  const lead = featured ? [featured, ...order.filter(q => q.id !== featured.id)] : order;

  const seed: FeedItem[] = await Promise.all(
    lead.slice(0, SEED).map(async question => ({
      question,
      docNo: docNumber(question),
      tally: await readTally(question.id),
      commentCount: commentCounts.get(question.id) ?? 0,
      tops: tops.get(question.id),
    })),
  );

  /* 한 화면 = 한 질문(3차 §2-8). **상세 페이지도 같이 켠다** — 스냅 지점은 이어지는
     안건 카드에만 붙고 상세의 질문·댓글은 이 컴포넌트 밖이라 자유 스크롤 그대로다.
     홈에서만 다른 것은 헤더 진행 표시와 첫 장 힌트(`progress`)다. */
  /* 🔴 `excludeId`로 심은 카드를 피드에서 뺀다. 홈의 순서(개인화 없음)와
     `/api/feed`의 순서(개인화)가 다르므로, 빼지 않으면 같은 안건이 두 번 나온다.
     그래서 `startOffset`도 0이다 — 개인화된 목록의 처음부터 받는다. */
  return (
    <Feed
      initial={seed}
      excludeId={seed[0]?.question.id}
      startOffset={0}
      snap
      /* 헤더 진행 표시("제 N호 · 전체 N건")와 첫 장 힌트는 홈에서만 낸다 — 아래 주석 참고 */
      progress
      total={order.length}
    />
  );
}
