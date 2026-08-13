import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Ballot } from '@/components/Ballot';
import { Comments } from '@/components/Comments';
import { Feed, type FeedItem } from '@/components/Feed';
import { BreadcrumbJsonLd, DiscussionJsonLd } from '@/components/JsonLd';
import {
  commentCounts,
  listComments,
  readAllCommentCounts,
  readAllTopComments,
  topComment,
} from '@/lib/comments';
import { QUESTIONS, docNumber, feedOrder, questionBySlug, topicBySlug } from '@/lib/questions';
import { pageDescription, pageTitle } from '@/lib/seo';
import { SITE } from '@/lib/site';
import { indexable } from '@/lib/tiers';
import { isConfigured } from '@/lib/supabase';
import { readAllTallies, readTally } from '@/lib/votes';

export const revalidate = 300;

/** 한글 슬러그는 URL에서 퍼센트 인코딩돼 온다 */
function decode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function generateStaticParams() {
  return QUESTIONS.map(q => ({ slug: q.slug }));
}

export const dynamicParams = true;

interface Params {
  params: { slug: string };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const question = questionBySlug(decode(params.slug));
  if (!question) return {};

  const [tally, comments] = await Promise.all([
    readTally(question.id),
    listComments(question.id, 1),
  ]);

  /* 🔴 thin content 방어(브리프 §6 · 개선문서 §4-2).
     기준은 **표 20개 이상 그리고 댓글 1개 이상**이다. 표만 있고 댓글이 없으면
     본문이 수치 두 줄뿐이라 여전히 빈 페이지다 — 본문을 채우는 건 댓글이다.
     쌓이면 자동으로 색인이 열린다. */
  const thin = !indexable(tally, comments.length);

  const canonical = `${SITE.url}/q/${encodeURIComponent(question.slug)}`;
  return {
    title: pageTitle(question, tally),
    description: pageDescription(question, tally),
    alternates: { canonical },
    robots: thin ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: pageTitle(question, tally),
      url: canonical,
      /* 명시하지 않으면 Next가 라우트 세그먼트를 한 번 더 인코딩해
         `%25EC…` 같은 이중 인코딩 URL을 만든다. 지금 코드는 우연히 동작하지만
         운에 맡길 일이 아니다. */
      images: [`${canonical}/opengraph-image`],
    },
  };
}

export default async function QuestionPage({ params }: Params) {
  const slug = decode(params.slug);
  const question = questionBySlug(slug);
  if (!question) notFound();

  const [tally, comments, topA, topB, counts] = await Promise.all([
    readTally(question.id),
    listComments(question.id),
    topComment(question.id, 'a'),
    topComment(question.id, 'b'),
    commentCounts(question.id),
  ]);

  const topic = topicBySlug(question.topic);
  const [tallies, allCommentCounts, allTops] = await Promise.all([
    readAllTallies(),
    readAllCommentCounts(),
    readAllTopComments(),
  ]);
  const order = feedOrder(question.id, id => {
    const t = tallies.get(id);
    return t ? t.a + t.b : 0;
  });
  const seed: FeedItem[] = await Promise.all(
    order.slice(0, 2).map(async q => ({
      question: q,
      docNo: docNumber(q),
      tally: await readTally(q.id),
      commentCount: allCommentCounts.get(q.id) ?? 0,
      tops: allTops.get(q.id),
    })),
  );

  return (
    <>
      <BreadcrumbJsonLd
        trail={[
          { name: SITE.name, path: '/' },
          { name: '질문 전체', path: '/q' },
          ...(topic ? [{ name: topic.name, path: `/c/${topic.slug}` }] : []),
          { name: question.q, path: `/q/${encodeURIComponent(question.slug)}` },
        ]}
      />
      <DiscussionJsonLd question={question} tally={tally} comments={comments} />

      {/* `tops`는 이미 받아 온 topA·topB를 재사용한다 — 배치 RPC를 또 부르지 않는다.
          아래 Comments도 같은 값을 쓰므로 카드와 댓글 섹션의 1위가 어긋나지 않는다. */}
      <Ballot
        question={question}
        docNo={docNumber(question)}
        tally={tally}
        standalone
        nextSlug={seed[0]?.question.slug}
        commentCount={counts.a + counts.b}
        tops={{
          a: topA && { id: topA.id, body: topA.body, likes: topA.likes },
          b: topB && { id: topB.id, body: topB.body, likes: topB.likes },
        }}
      />

      {/* 댓글이 곧 본문이다(브리프 §6) — 전용 페이지에만 붙인다 */}
      <Comments
        question={question}
        initial={comments}
        tops={{ a: topA, b: topB }}
        counts={counts}
        live={isConfigured()}
      />

      {/* 여기서도 다음 질문으로 이어진다 — 원칙 2 */}
      <Feed initial={seed} excludeId={question.id} startOffset={2} />
    </>
  );
}
