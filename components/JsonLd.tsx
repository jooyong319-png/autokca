import type { Comment } from '@/lib/comments';
import type { Post } from '@/lib/posts';
import { QUESTIONS_PUBLISHED, type Question } from '@/lib/questions';
import { outcome } from '@/lib/seo';
import { SITE } from '@/lib/site';
import type { Tally } from '@/lib/votes';

/* 구조화 데이터.
 *
 * 🔴 **FAQPage·QAPage는 쓰지 않는다.** FAQPage는 "자주 묻는 질문에 대한 답"이고
 *    QAPage는 이용자가 답을 작성하는 Q&A 사이트용이다. 오또케는 여론을 묻는 투표다.
 *    오용하면 리치리절트 자격이 박탈되거나 수동 조치를 받는다.
 *
 *    대신 **DiscussionForumPosting**을 쓴다(브리프 §6). 댓글이 달린 토론 게시물이라는
 *    성격이 정확히 맞고, 구글이 "포럼 토론" 리치리절트로 다룬다.
 */

function Script({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function WebSiteJsonLd() {
  return (
    <Script
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE.name,
        alternateName: ['오또케?!', 'Ottoke'],
        url: SITE.url,
        description: SITE.description,
        inLanguage: 'ko-KR',
      }}
    />
  );
}

export interface Crumb {
  name: string;
  path: string;
}

export function BreadcrumbJsonLd({ trail }: { trail: Crumb[] }) {
  return (
    <Script
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: trail.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: c.name,
          /* 홈 canonical은 슬래시가 없다. 붙이면 같은 페이지를 두 URL로 가리킨다. */
          item: c.path === '/' ? SITE.url : `${SITE.url}${c.path}`,
        })),
      }}
    />
  );
}

/** 읽을거리 — `BlogPosting`.
 *
 *  🔴 질문 페이지의 `DiscussionForumPosting`과 **성격이 다르다.** 저건 사람들이 모여
 *     떠든 스레드고, 이건 운영자가 쓴 글이다. 같은 타입으로 묶으면 둘 다 부정확해진다.
 *
 *  ⚠️ `datePublished`는 여기서도 필수다(질문 페이지에서 빠뜨려 GSC 오류를 냈다).
 *     `Post.published`가 실제 작성일이라 지어낼 여지가 없다. */
export function PostJsonLd({ post }: { post: Post }) {
  const url = `${SITE.url}/blog/${encodeURIComponent(post.slug)}`;
  return (
    <Script
      data={{
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        '@id': url,
        url,
        mainEntityOfPage: url,
        headline: post.title,
        description: post.summary,
        inLanguage: 'ko-KR',
        datePublished: post.published,
        dateModified: post.updated || post.published,
        author: { '@type': 'Organization', name: SITE.name, url: SITE.url },
        publisher: { '@type': 'Organization', name: SITE.name, url: SITE.url },
      }}
    />
  );
}

/** 질문 페이지 — 투표 결과를 본문으로, 댓글을 답글로 넘긴다. */
export function DiscussionJsonLd({
  question,
  tally,
  comments,
}: {
  question: Question;
  tally: Tally;
  comments: Comment[];
}) {
  const o = outcome(question, tally);
  const url = `${SITE.url}/q/${encodeURIComponent(question.slug)}`;
  /* 가장 최근 댓글 시각. 정렬 순서를 가정하지 않고 최댓값을 고른다 —
     `listComments`의 정렬이 바뀌어도 여기가 조용히 틀리지 않는다. */
  const newest = comments.reduce<string>(
    (max, c) => (c.createdAt && c.createdAt > max ? c.createdAt : max),
    '',
  );

  return (
    <Script
      data={{
        '@context': 'https://schema.org',
        '@type': 'DiscussionForumPosting',
        '@id': url,
        url,
        headline: question.q,
        inLanguage: 'ko-KR',
        articleBody: o
          ? `응답자 ${o.total}명 중 ${o.percent}%가 "${o.label}"를 골랐습니다.`
          : question.q,
        author: { '@type': 'Organization', name: SITE.name, url: SITE.url },
        /* 🔴 **필수 항목이다.** 빠져 있어서 GSC가 "유효하지 않음 — 리치 결과에
           표시되지 않습니다"를 냈다(2026-08-24 감지). 코드에 박힌 안건은 전부
           같은 날 작성됐고, 관리 화면에서 발행한 안건은 자기 등록일을 갖는다. */
        datePublished: question.published || QUESTIONS_PUBLISHED,
        /* 이 페이지의 내용이 마지막으로 **실제로 바뀐** 시점 = 마지막 댓글이 달린 때.
           댓글이 없으면 게시일 그대로다. 크롤러에게 재방문 이유를 주는 값이라
           빌드 시각 같은 걸 넣으면 안 된다 — 내용이 안 바뀌었는데 바뀌었다고 말하는 것이다. */
        ...(newest ? { dateModified: newest } : {}),
        interactionStatistic: [
          {
            '@type': 'InteractionCounter',
            interactionType: 'https://schema.org/VoteAction',
            userInteractionCount: tally.a + tally.b,
          },
          {
            '@type': 'InteractionCounter',
            interactionType: 'https://schema.org/CommentAction',
            userInteractionCount: comments.length,
          },
        ],
        /* 🔴 `author`를 비워 뒀더니 GSC가 "더 많은 기능이 표시되거나 더 관련성 높은
           쿼리에 최적화될 수 있습니다"로 경고했다(경로: comment).
           전에는 "익명이라 지어내지 않는다"고 판단했는데, **익명이라고 적는 것은
           지어내는 게 아니라 사실을 적는 것이다.** 이 사이트는 이름을 아예 받지 않으므로
           "익명"이 정확한 값이다. 없는 이름을 만들어 넣는 것과는 다르다. */
        comment: comments.slice(0, 20).map(c => ({
          '@type': 'Comment',
          text: c.body,
          author: { '@type': 'Person', name: '익명' },
          /* 구글 포럼 문서가 쓰는 항목명은 `datePublished`다(schema.org는 둘 다 받는다) */
          ...(c.createdAt ? { datePublished: c.createdAt } : {}),
          ...(c.likes > 0
            ? {
                interactionStatistic: {
                  '@type': 'InteractionCounter',
                  interactionType: 'https://schema.org/LikeAction',
                  userInteractionCount: c.likes,
                },
              }
            : {}),
        })),
      }}
    />
  );
}
