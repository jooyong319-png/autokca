import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BreadcrumbJsonLd } from '@/components/JsonLd';
import { TOPICS, topicBySlug } from '@/lib/questions';
import { byTopicAsync } from '@/lib/catalog';
import { SITE } from '@/lib/site';
import styles from '../../q/archive.module.css';

export const revalidate = 3600;

export function generateStaticParams() {
  return TOPICS.map(t => ({ topic: t.slug }));
}

interface Params {
  params: { topic: string };
}

export function generateMetadata({ params }: Params): Metadata {
  const topic = topicBySlug(params.topic);
  if (!topic) return {};
  return {
    title: `${topic.name} 관련 투표 모음`,
    description: `${topic.description} ${topic.name} 관련 질문과 투표 결과를 모았습니다.`,
    alternates: { canonical: `${SITE.url}/c/${topic.slug}` },
  };
}

/* 집계 페이지로 롱테일을 잡는다(브리프 §6) — "돈 관련 투표 모음" 같은 검색어. */
export default async function TopicPage({ params }: Params) {
  const topic = topicBySlug(params.topic);
  if (!topic) notFound();

  const items = await byTopicAsync(topic.slug);

  return (
    <>
      <BreadcrumbJsonLd
        trail={[
          { name: SITE.name, path: '/' },
          { name: '질문 전체', path: '/q' },
          { name: topic.name, path: `/c/${topic.slug}` },
        ]}
      />

      <section className={styles.header}>
        <h1 className={styles.title}>{topic.name} 관련 투표 모음</h1>
        <p className={styles.sub}>{topic.description}</p>
        <p className={styles.count}>질문 {items.length}개</p>
      </section>

      <nav className={styles.topicNav} aria-label="주제">
        <a href="/q">전체</a>
        {TOPICS.map(t => (
          <a
            key={t.slug}
            href={`/c/${t.slug}`}
            className={t.slug === topic.slug ? styles.topicOn : undefined}
          >
            {t.name}
          </a>
        ))}
      </nav>

      <ol className={styles.list}>
        {items.map(q => (
          <li key={q.id} className={styles.item}>
            <span className={styles.itemDate}>
              {q.kind === 'serious' ? '논쟁' : '별건'}
            </span>
            <a className={styles.itemLink} href={`/q/${encodeURIComponent(q.slug)}`}>
              {q.q}
            </a>
            <span className={styles.itemOptions}>{q.a} · {q.b}</span>
          </li>
        ))}
      </ol>
    </>
  );
}
