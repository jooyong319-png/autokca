import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/JsonLd';
import { TOPICS } from '@/lib/questions';
import { catalog } from '@/lib/catalog';
import { SITE } from '@/lib/site';
import styles from './archive.module.css';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: '질문 전체',
  description: `${SITE.name}가 지금까지 물어본 질문 전체. 투표하고 결과를 바로 확인하세요.`,
  alternates: { canonical: `${SITE.url}/q` },
};

export default async function QuestionIndex() {
  const all = await catalog();
  return (
    <>
      <BreadcrumbJsonLd
        trail={[
          { name: SITE.name, path: '/' },
          { name: '질문 전체', path: '/q' },
        ]}
      />

      <section className={styles.header}>
        <h1 className={styles.title}>질문 전체</h1>
        <p className={styles.sub}>아무거나 눌러도 됩니다. 순서는 없습니다.</p>
        <p className={styles.count}>
          질문 {all.length}개 · 논쟁 {all.filter(q => q.kind === 'serious').length}개 ·
          {' '}그냥 궁금한 것 {all.filter(q => q.kind === 'meme').length}개
        </p>
      </section>

      <nav className={styles.topicNav} aria-label="주제">
        <a href="/q" className={styles.topicOn}>전체</a>
        {TOPICS.map(t => (
          <a key={t.slug} href={`/c/${t.slug}`}>{t.name}</a>
        ))}
      </nav>

      <ol className={styles.list}>
        {all.map(q => (
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
