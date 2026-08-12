import type { MetadataRoute } from 'next';
import { readAllCommentCounts } from '@/lib/comments';
import { QUESTIONS, TOPICS } from '@/lib/questions';
import { SITE } from '@/lib/site';
import { indexable } from '@/lib/tiers';
import { readAllTallies } from '@/lib/votes';

/* 질문이 계속 늘어난다. 빌드 시각에 고정되면 새 질문이 사이트맵에 안 들어간다. */
export const revalidate = 3600;

const EMPTY = { a: 0, b: 0, live: false } as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = SITE.effectiveDate;

  /* 🔴 색인 임계치를 넘긴 질문만 넣는다(개선문서 §4-2).
     페이지가 스스로 noindex를 내는데 사이트맵에는 넣어 두면,
     검색엔진에 "이걸 보라"고 한 뒤 "보지 마라"고 하는 셈이다 —
     크롤 예산만 태우고 사이트 품질 평가에 도움이 안 된다.
     집계가 안 붙어 있으면 질문을 아예 넣지 않는다(전부 thin으로 취급). */
  const [tallies, commentCounts] = await Promise.all([
    readAllTallies(),
    readAllCommentCounts(),
  ]);

  const published = QUESTIONS.filter(q =>
    indexable(tallies.get(q.id) ?? EMPTY, commentCounts.get(q.id) ?? 0),
  );

  return [
    { url: SITE.url, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE.url}/q`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE.url}/best`, changeFrequency: 'daily' as const, priority: 0.7 },
    ...TOPICS.map(t => ({
      url: `${SITE.url}/c/${t.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    { url: `${SITE.url}/about`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${SITE.url}/terms`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.2 },
    { url: `${SITE.url}/privacy`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.2 },
    ...published.map(q => ({
      url: `${SITE.url}/q/${encodeURIComponent(q.slug)}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
