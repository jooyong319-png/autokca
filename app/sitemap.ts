import type { MetadataRoute } from 'next';
import { QUESTIONS, TOPICS } from '@/lib/questions';
import { SITE } from '@/lib/site';

/* 질문이 계속 늘어난다. 빌드 시각에 고정되면 새 질문이 사이트맵에 안 들어간다. */
export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = SITE.effectiveDate;
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
    /* 질문 페이지 — thin content는 각 페이지가 스스로 noindex를 낸다(브리프 §6).
       사이트맵에는 넣어 둔다: 크롤은 오게 하고 색인 여부만 페이지가 결정한다. */
    ...QUESTIONS.map(q => ({
      url: `${SITE.url}/q/${encodeURIComponent(q.slug)}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
