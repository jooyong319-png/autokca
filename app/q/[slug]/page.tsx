import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Ballot } from '@/components/Ballot';
import { Comments } from '@/components/Comments';
import { CommentLanding } from '@/components/CommentLanding';
import { Feed, type FeedItem } from '@/components/Feed';
import { BreadcrumbJsonLd, DiscussionJsonLd } from '@/components/JsonLd';
import {
  commentCounts,
  listComments,
  readAllCommentCounts,
  readAllTopComments,
  topComment,
} from '@/lib/comments';
import { docNumber, feedOrder, topicBySlug } from '@/lib/questions';
import { catalog, findBySlug } from '@/lib/catalog';
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

/* 🔴 병합 목록으로 만든다 — 관리 화면에서 발행한 안건도 프리렌더 대상이다.
   빌드 이후에 발행된 것은 여기 없지만 `dynamicParams: true`가 온디맨드로 렌더한다. */
export async function generateStaticParams() {
  return (await catalog()).map(q => ({ slug: q.slug }));
}

export const dynamicParams = true;

interface Params {
  params: { slug: string };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const question = await findBySlug(decode(params.slug));
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
  const all = await catalog();
  const question = all.find(q => q.slug === slug);
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
  const order = feedOrder(all, question.id, id => {
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

      {/* 카드에서 사유를 올리고 넘어온 경우에만 동작한다(세션 값이 있을 때).
          검색으로 직접 들어온 사람에게는 아무 일도 일어나지 않는다. */}
      <CommentLanding />

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

      {/* 🔴 8차 §3-1(5단계)·§4 — 이탈 경로를 **명확히** 둔다.
          카드에서 사유를 올리면 이 페이지로 자동 이동하는데, 나가는 길이 안 보이면
          "상세에 갇힌다". 댓글을 읽고 나면 바로 다음 안건으로 넘어갈 수 있어야 한다.
          앵커가 아니라 실제로 아래에 이어지는 피드가 있으므로 표지만 세운다. */}
      <p className="handoff">
        <a href={`#${seed[0]?.question.slug ?? ''}`}>↓ 다음 안건으로</a>
      </p>

      {/* 여기서도 다음 질문으로 이어진다 — 원칙 2 */}
      <Feed initial={seed} excludeId={question.id} startOffset={2} />
    </>
  );
}
