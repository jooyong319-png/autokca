'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  /** 한 화면 = 한 질문으로 넘길지(3차 §2).
   *  홈만 켠다. **상세 페이지는 끈다** — 댓글이 있어 자유 스크롤이 필요하다(§2-8). */
  snap?: boolean;
  /** 전체 질문 수 — 진행 인디케이터에 쓴다 */
  total?: number;
}

/* 🔴 브리프 원칙 2 — 투표 후 홈으로 돌려보내지 않는다.
 *
 *  결과 바로 아래에 다음 질문이 붙는다. 방문자 1명이 3개를 누르느냐 12개를 누르느냐가
 *  매출을 4배 가르므로(원칙 1), 이 컴포넌트가 이 사이트의 수익 구조 그 자체다.
 *
 *  스크롤 위치를 건드리지 않는다 — 밑에 덧붙이기만 한다. 위로 끼워 넣으면
 *  읽던 자리가 튀고, 그 순간 이탈한다.
 */
export function Feed({ initial, excludeId, startOffset, snap = false, total }: Props) {
  const [items, setItems] = useState<FeedItem[]>(initial);
  const [offset, setOffset] = useState(startOffset);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [current, setCurrent] = useState(1);
  /* 진행 표시가 들어갈 sticky 헤더 안의 자리(4차 §3-1). layout.tsx가 비워 둔다.
     서버 렌더에는 없다 — 어차피 `current`가 클라이언트 상태라 서버에서 그릴 값이 없다. */
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const loading = useRef(false);
  const sentinel = useRef<HTMLDivElement | null>(null);
  const wrap = useRef<HTMLDivElement | null>(null);

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
    if (!snap) return;
    setSlot(document.getElementById('feed-progress-slot'));
  }, [snap]);

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

  /* 지금 몇 번째 카드를 보고 있는지 — 진행 인디케이터용(§2-7).
     화면 중앙을 지나는 슬라이드 하나만 현재로 잡는다. */
  useEffect(() => {
    if (!snap || !wrap.current) return;
    const slides = Array.from(wrap.current.querySelectorAll<HTMLElement>(`.${styles.slide}`));
    if (!slides.length) return;

    const observer = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = slides.indexOf(e.target as HTMLElement);
          if (i >= 0) setCurrent(i + 1);
        }
      },
      /* 화면 중앙 한 줄만 관찰선으로 쓴다 — 두 카드가 동시에 걸리지 않는다 */
      { rootMargin: '-50% 0px -50% 0px' },
    );
    slides.forEach(x => observer.observe(x));
    return () => observer.disconnect();
  }, [items.length, snap]);

  /* 데스크톱 보조 이동. 키보드 핸들러는 붙이지 않는다 —
     네이티브가 이미 처리하고, 붙이면 Space·PageDown 기본 동작과 싸운다(§2-3). */
  const go = useCallback(
    (dir: 1 | -1) => {
      if (!wrap.current) return;
      const slides = Array.from(wrap.current.querySelectorAll<HTMLElement>(`.${styles.slide}`));
      const next = slides[current - 1 + dir];
      if (next) next.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [current],
  );

  return (
    <div ref={wrap} className={snap ? 'snap-feed' : undefined}>
      {/* 🔴 sticky 헤더 안으로 포털(4차 §3-1). 전에는 헤더 아래 따로 떠 있어
          소속이 불분명했다. 자리를 못 찾으면 아무것도 그리지 않는다 —
          진행 표시는 보조 정보라 없어도 이동에 지장이 없다. */}
      {snap && slot &&
        createPortal(
          <span className={styles.progress}>
            제 <b>{current}</b>호 · 전체 {(total ?? items.length).toLocaleString('ko-KR')}건
          </span>,
          slot,
        )}

      {items.map((item, i) => {
        const card = (
          <>
            <Ballot
              question={item.question}
              docNo={item.docNo}
              tally={item.tally}
              commentCount={item.commentCount}
              heading="h2"
            />
            {/* 🔴 방식 B — 카드 하단 배너(3차 §4). 광고 전용 슬라이드(방식 A)는
                전면이 광고라 이탈률이 크게 오른다. 같은 화면 안, 카드 아래에 둔다.
                4장마다 하나만 — 그 이상은 화면 대비 광고 비율 정책에 걸린다.
                환경변수가 없으면 AdSlot이 null이라 빈 상자가 생기지 않는다. */}
            {(i + 1) % 4 === 0 && <AdSlot />}
          </>
        );
        return snap ? (
          <div key={item.question.id} className={styles.slide}>
            {card}
            {/* 다음이 있다는 신호. 첫 장에만 — 103장 전부면 소음이다(4차 §3-2) */}
            {i === 0 && <p className={styles.cue}>↓ 다음 안건</p>}
          </div>
        ) : (
          <Fragment key={item.question.id}>{card}</Fragment>
        );
      })}

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

      {snap && (
        <div className={styles.nav}>
          <button type="button" className={styles.navBtn} onClick={() => go(-1)} aria-label="이전 질문">
            ↑
          </button>
          <button type="button" className={styles.navBtn} onClick={() => go(1)} aria-label="다음 질문">
            ↓
          </button>
        </div>
      )}
    </div>
  );
}
