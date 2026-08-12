import type { Metadata } from 'next';
import { Certificate } from './Certificate';
import { QUESTIONS, TOPICS } from '@/lib/questions';
import { SITE } from '@/lib/site';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: '내 성향 확인서',
  description: '지금까지 투표한 내역으로 발급되는 확인서. 이 브라우저에 저장된 기록만 씁니다.',
  /* 내용이 브라우저마다 다르고 서버에는 아무것도 없다 — 색인할 게 없다. */
  robots: { index: false, follow: true },
  alternates: { canonical: `${SITE.url}/me` },
};

export default function MePage() {
  return (
    <Certificate
      questions={QUESTIONS.map(q => ({ id: q.id, topic: q.topic }))}
      topics={TOPICS.map(t => ({ slug: t.slug, name: t.name }))}
    />
  );
}
