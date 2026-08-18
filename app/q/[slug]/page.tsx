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

  const [tally, counts] = await Promise.all([
    readTally(question.id),
    commentCounts(question.id),
  ]);

  /* 🔴 thin content 방어(브리프 §6 · 개선문서 §4-2). 기준은 `lib/tiers.ts` 한 곳에 있다.
     표만 있고 댓글이 없으면 본문이 수치 두 줄뿐이라 여전히 빈 페이지다 —
     본문을 채우는 건 댓글이다. 쌓이면 자동으로 색인이 열린다.

     🔴 **개수를 세는 것과 있는지 보는 것은 다르다.** 여기는 `listComments(id, 1)`의
     길이를 썼다. 댓글 1개 이상이 기준일 때는 우연히 맞았지만, 기준이 2개로 오르자
     길이가 최대 1이라 **어떤 페이지도 통과할 수 없게** 됐다.
     사이트맵은 `readAllCommentCounts()`로 진짜 개수를 세므로 둘이 어긋났다 —
     사이트맵은 "크롤하라"는데 페이지는 `noindex`를 다는 상태였다.
     같은 판정에는 같은 입력을 쓴다. */
  const thin = !indexable(tally, counts.a + counts.b);

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
      {/* 🔴 `key`로 **안건이 바뀌면 상태를 통째로 버린다.**
       *
       *  `/q/A` → `/q/B`는 **같은 라우트 세그먼트**라 React가 컴포넌트를 재사용한다.
       *  그런데 이 세 컴포넌트는 props로 초기 상태를 잡는다(`useState(initial)`) —
       *  초기값은 마운트 때만 쓰이므로 **A의 집계·댓글·피드가 그대로 남는다.**
       *  특히 `Comments`의 폴링은 기존 목록에 **병합**하므로 A의 댓글이 B 페이지에 섞인다.
       *
       *  effect 의존성에 `question.id`를 넣는 것으로는 부족하다 — 서버 응답이 오기 전까지
       *  낡은 값이 보이고, 집계가 죽어 있으면 영영 안 고쳐진다.
       *  `key`가 바뀌면 React가 새 인스턴스를 만들어 그런 창이 아예 없다. */}
      <Ballot
        key={question.id}
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
        key={question.id}
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

      {/* 여기서도 다음 질문으로 이어진다 — 원칙 2.
          🔴 `snap`을 켠다. 전에는 껐는데("댓글이 있어 자유 스크롤") 스냅 지점은
          `.slide`, 즉 **아래 이어지는 카드에만** 붙는다 — 위의 질문과 댓글은 이
          컴포넌트 밖이라 애초에 대상이 아니었다. 끌 이유가 없었고, 같은 카드가
          홈에서는 한 장씩 걸리고 상세에서는 안 걸려 스크롤이 고장 난 것처럼 보였다.
          `progress`(헤더 진행 표시·첫 장 힌트)는 홈 전용이라 여기서는 켜지 않는다. */}
      <Feed key={question.id} initial={seed} excludeId={question.id} startOffset={2} snap />
    </>
  );
}
