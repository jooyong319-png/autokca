import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Ballot } from '@/components/Ballot';
import { Comments } from '@/components/Comments';
import { Feed, type FeedItem } from '@/components/Feed';
import { BreadcrumbJsonLd, DiscussionJsonLd } from '@/components/JsonLd';
import { commentCounts, listComments, topComment } from '@/lib/comments';
import { QUESTIONS, docNumber, feedOrder, questionBySlug, topicBySlug } from '@/lib/questions';
import { pageDescription, pageTitle } from '@/lib/seo';
import { INDEX_MIN_COMMENTS, INDEX_MIN_VOTES, SITE } from '@/lib/site';
import { isConfigured } from '@/lib/supabase';
import { readTally } from '@/lib/votes';

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
  const total = tally.a + tally.b;

  /* 🔴 thin content 방어(브리프 §6). 투표·댓글이 적은 페이지를 대량 색인시키면
     "수치만 있는 빈 페이지"로 평가돼 사이트 전체가 내려간다.
     쌓이면 자동으로 색인이 열린다. */
  const thin = total < INDEX_MIN_VOTES && comments.length < INDEX_MIN_COMMENTS;

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
  const order = feedOrder(question.id);
  const seed: FeedItem[] = await Promise.all(
    order.slice(0, 2).map(async q => ({
      question: q,
      docNo: docNumber(q),
      tally: await readTally(q.id),
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

      <Ballot question={question} docNo={docNumber(question)} tally={tally} />

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
