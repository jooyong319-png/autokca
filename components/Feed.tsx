'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import type { Question } from '@/lib/questions';
import type { Tally } from '@/lib/votes';
import { AdSlot } from './AdSlot';
import { Ballot } from './Ballot';
import styles from './Feed.module.css';

export interface FeedItem {
  question: Question;
  docNo: string;
  tally: Tally;
  /** 카드에 "왜 그런지 N"으로 뜬다 — 상세로 넘어갈 동기(2차 §5) */
  commentCount: number;
}

interface Props {
  initial: FeedItem[];
  /** 위에 이미 붙어 있는 질문 — 피드에서 뺀다 */
  excludeId?: string;
  /** 서버가 미리 그린 개수. 여기서부터 이어 받는다. */
  startOffset: number;
}

/* 🔴 브리프 원칙 2 — 투표 후 홈으로 돌려보내지 않는다.
 *
 *  결과 바로 아래에 다음 질문이 붙는다. 방문자 1명이 3개를 누르느냐 12개를 누르느냐가
 *  매출을 4배 가르므로(원칙 1), 이 컴포넌트가 이 사이트의 수익 구조 그 자체다.
 *
 *  스크롤 위치를 건드리지 않는다 — 밑에 덧붙이기만 한다. 위로 끼워 넣으면
 *  읽던 자리가 튀고, 그 순간 이탈한다.
 */
export function Feed({ initial, excludeId, startOffset }: Props) {
  const [items, setItems] = useState<FeedItem[]>(initial);
  const [offset, setOffset] = useState(startOffset);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const loading = useRef(false);
  const sentinel = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loading.current || done) return;
    loading.current = true;
    setFailed(false);
    try {
      const params = new URLSearchParams({ offset: String(offset) });
      if (excludeId) params.set('exclude', excludeId);
      const res = await fetch(`/api/feed?${params}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('feed');
      const data = (await res.json()) as {
        items: FeedItem[];
        nextOffset: number;
        done: boolean;
      };
      setItems(prev => [...prev, ...data.items]);
      setOffset(data.nextOffset);
      setDone(data.done);
    } catch {
      /* 실패해도 이미 있는 질문은 그대로 둔다. 다시 시도할 버튼만 준다. */
      setFailed(true);
    } finally {
      loading.current = false;
    }
  }, [done, excludeId, offset]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || done) return;

    /* 화면에 닿기 전에 미리 받아 둔다 — 스크롤이 멈추면 안 된다 */
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) loadMore();
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [done, loadMore]);

  return (
    <>
      {items.map((item, i) => (
        <Fragment key={item.question.id}>
          <Ballot
            question={item.question}
            docNo={item.docNo}
            tally={item.tally}
            commentCount={item.commentCount}
            heading="h2"
          />
          {/* 카드 4개마다 광고 하나. 그 이상은 화면 대비 광고 비율 정책에 걸린다(2차 §3).
              환경변수가 없으면 AdSlot이 null을 돌려주므로 빈 상자가 생기지 않는다. */}
          {(i + 1) % 4 === 0 && <AdSlot />}
        </Fragment>
      ))}

      {!done && (
        <div ref={sentinel} className={styles.sentinel}>
          {failed ? (
            <button type="button" className={styles.retry} onClick={loadMore}>
              다음 질문을 못 불러왔습니다. 다시 시도
            </button>
          ) : (
            <span className={styles.loading}>다음 질문을 가져오는 중…</span>
          )}
        </div>
      )}

      {done && (
        <p className={styles.end}>
          질문을 다 보셨습니다. 새 질문은 계속 올라옵니다.
          <br />
          <a className={styles.endLink} href="/me">
            내 성향 확인서 보기 →
          </a>
        </p>
      )}
    </>
  );
}
