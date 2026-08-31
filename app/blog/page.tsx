import type { Metadata } from 'next';
import { posts } from '@/lib/posts';
import { SITE } from '@/lib/site';
import styles from '../legal.module.css';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: '읽을거리',
  description:
    '오또케 집계와 댓글을 놓고 쓴 글. 숫자보다 "왜 그렇게 답했는지"가 재미있어서 따로 정리합니다.',
  alternates: { canonical: `${SITE.url}/blog` },
};

export default function BlogIndex() {
  const list = posts();
  return (
    <article className={styles.doc}>
      <header className={styles.head}>
        <h1 className={styles.title}>읽을거리</h1>
        <span className={styles.effective}>{list.length}편</span>
      </header>

      <p className={styles.lead}>
        투표 결과와 댓글을 놓고 쓴 글입니다. 인용한 댓글은 <strong>실제로 달린 원문</strong>이고,
        수치에는 언제 기준인지 함께 적습니다.
      </p>

      {list.length === 0 ? (
        <p>아직 올린 글이 없습니다.</p>
      ) : (
        <ul>
          {list.map(p => (
            <li key={p.slug} style={{ marginBottom: '1.1rem' }}>
              <a href={`/blog/${encodeURIComponent(p.slug)}`}>
                <strong>{p.title}</strong>
              </a>
              <br />
              {p.summary}
              <br />
              <small>{p.published}</small>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
