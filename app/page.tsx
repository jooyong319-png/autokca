import type { Metadata } from 'next';
import { Feed, type FeedItem } from '@/components/Feed';
import { docNumber, feedOrder } from '@/lib/questions';
import { SITE } from '@/lib/site';
import { readAllCommentCounts } from '@/lib/comments';
import { readAllTallies, readTally } from '@/lib/votes';

/* 득표율이 살아 있는 느낌을 주면서 요청 수도 감당되는 값 */
export const revalidate = 60;

/** 서버에서 미리 그리는 개수. 첫 화면이 비어 보이지 않을 만큼만. */
const SEED = 3;

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
  const [tallies, commentCounts] = await Promise.all([
    readAllTallies(),
    readAllCommentCounts(),
  ]);
  const votesOf = (id: string) => {
    const t = tallies.get(id);
    return t ? t.a + t.b : 0;
  };
  const order = feedOrder(undefined, votesOf);
  const seed: FeedItem[] = await Promise.all(
    order.slice(0, SEED).map(async question => ({
      question,
      docNo: docNumber(question),
      tally: await readTally(question.id),
      commentCount: commentCounts.get(question.id) ?? 0,
    })),
  );

  return <Feed initial={seed} startOffset={SEED} />;
}
