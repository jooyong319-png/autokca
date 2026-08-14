import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/JsonLd';
import { catalog } from '@/lib/catalog';
import { SITE } from '@/lib/site';
import { readAllTallies } from '@/lib/votes';
import styles from '../q/archive.module.css';

export const revalidate = 1800;

export const metadata: Metadata = {
  title: '가장 의견이 갈린 질문 TOP 10',
  description:
    '오또케에서 가장 팽팽했던 질문과 가장 한쪽으로 몰린 질문. 실제 투표 수로 집계했습니다.',
  alternates: { canonical: `${SITE.url}/best` },
};

const TOP = 10;
const MIN_VOTES = 10;

/* 집계 페이지로 롱테일을 잡는다(브리프 §6).
   "가장 의견이 갈린 질문" 같은 검색어는 개별 질문과 다른 쿼리다. */
export default async function BestPage() {
  const tallies = await readAllTallies();

  const scored = (await catalog()).map(q => {
    const t = tallies.get(q.id);
    const total = t ? t.a + t.b : 0;
    const pctA = total > 0 ? (t!.a / total) * 100 : 50;
    return {
      q,
      total,
      pctA,
      /* 50%에서 멀어질수록 한쪽으로 몰린 것. 팽팽함은 이 값이 작은 쪽. */
      gap: Math.abs(50 - pctA),
    };
  }).filter(x => x.total >= MIN_VOTES);

  const divided = [...scored].sort((a, b) => a.gap - b.gap).slice(0, TOP);
  const lopsided = [...scored].sort((a, b) => b.gap - a.gap).slice(0, TOP);
  const busiest = [...scored].sort((a, b) => b.total - a.total).slice(0, TOP);

  const row = (x: (typeof scored)[number], note: string) => (
    <li key={x.q.id} className={styles.item}>
      <span className={styles.itemDate}>{note}</span>
      <a className={styles.itemLink} href={`/q/${encodeURIComponent(x.q.slug)}`}>
        {x.q.q}
      </a>
      <span className={styles.itemOptions}>
        {x.q.a} {Math.round(x.pctA)}% · {x.q.b} {Math.round(100 - x.pctA)}% ·
        {' '}{x.total.toLocaleString('ko-KR')}명
      </span>
    </li>
  );

  return (
    <>
      <BreadcrumbJsonLd
        trail={[
          { name: SITE.name, path: '/' },
          { name: '집계', path: '/best' },
        ]}
      />

      <section className={styles.header}>
        <h1 className={styles.title}>가장 의견이 갈린 질문</h1>
        <p className={styles.sub}>
          실제 투표 수로 집계했습니다. {MIN_VOTES}표 미만은 빼놓았습니다 — 표 세 개로 순위를
          매기면 그건 순위가 아닙니다.
        </p>
      </section>

      {scored.length === 0 ? (
        <p className={styles.empty}>
          아직 순위를 낼 만큼 표가 모이지 않았습니다. 표가 쌓이면 여기가 채워집니다.
        </p>
      ) : (
        <>
          <section className={styles.header}>
            <h2 className={styles.title} style={{ fontSize: '1.15rem' }}>
              팽팽한 질문 TOP {divided.length}
            </h2>
            <p className={styles.sub}>50:50에 가장 가까운 것들. 싸움이 제일 잘 납니다.</p>
          </section>
          <ol className={styles.list}>{divided.map(x => row(x, '팽팽'))}</ol>

          <section className={styles.header}>
            <h2 className={styles.title} style={{ fontSize: '1.15rem' }}>
              한쪽으로 몰린 질문 TOP {lopsided.length}
            </h2>
            <p className={styles.sub}>여기서 소수파면 꽤 특이한 사람입니다.</p>
          </section>
          <ol className={styles.list}>{lopsided.map(x => row(x, '몰림'))}</ol>

          <section className={styles.header}>
            <h2 className={styles.title} style={{ fontSize: '1.15rem' }}>
              표가 가장 많은 질문 TOP {busiest.length}
            </h2>
          </section>
          <ol className={styles.list}>{busiest.map(x => row(x, '인기'))}</ol>
        </>
      )}
    </>
  );
}
