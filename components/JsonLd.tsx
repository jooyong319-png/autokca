import type { Comment } from '@/lib/comments';
import type { Question } from '@/lib/questions';
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
        /* 댓글은 익명이라 author를 지어내지 않는다 — 실제로 모르는 값이다 */
        comment: comments.slice(0, 20).map(c => ({
          '@type': 'Comment',
          text: c.body,
          ...(c.createdAt ? { dateCreated: c.createdAt } : {}),
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
