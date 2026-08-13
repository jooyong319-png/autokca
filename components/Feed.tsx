'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Question } from '@/lib/questions';
import type { Tally } from '@/lib/votes';
import type { TopPair } from '@/lib/comments';
import { AdSlot } from './AdSlot';
import { Ballot } from './Ballot';
import styles from './Feed.module.css';

export interface FeedItem {
  question: Question;
  docNo: string;
  tally: Tally;
  /** 카드에 "왜 그런지 N"으로 뜬다 — 상세로 넘어갈 동기(2차 §5) */
  commentCount: number;
  /** 양 진영 1위 댓글 미리보기(6차 §2-1). 서버에서 실어 보낸다 —
   *  클라이언트가 나중에 채우면 카드 높이가 바뀌어 스냅 위치가 흔들린다. */
  tops?: TopPair;
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

  /* 다음/이전 안건으로 이동. 키보드 핸들러는 붙이지 않는다 —
     네이티브가 이미 처리하고, 붙이면 Space·PageDown 기본 동작과 싸운다(§2-3).
   *
   * 🔴 **인덱스가 아니라 기하로 찾는다.**
   *   전에는 `slides[current - 1 + dir]`로 움직였다. 그건 스냅이 켜진 홈에서만 맞다 —
   *   상세 페이지에는 `.slide`가 없고(스냅 꺼짐) 진행 인디케이터도 안 도니 `current`가
   *   1에 멈춰 있어서 항상 두 번째 카드로 뛰었다. 게다가 상세에서는 사용자가 피드
   *   **위쪽**(주 카드·댓글)에 있으므로 인덱스에 시작점이 없다.
   *
   *   화면 기준으로 "머리글 아래로 아직 안 올라온 첫 카드"를 다음으로 잡으면
   *   스냅 여부·시작 위치와 무관하게 언제나 맞는다. */
  const go = useCallback((dir: 1 | -1) => {
    if (!wrap.current) return;
    const slides = Array.from(wrap.current.querySelectorAll<HTMLElement>(`.${styles.slide}`));
    /* 스냅이 없으면 카드(section) 자체가 정지점이다 */
    const stops = slides.length
      ? slides
      : Array.from(wrap.current.querySelectorAll<HTMLElement>(':scope > section'));
    if (!stops.length) return;

    /* 고정 머리글에 가려지는 영역. `--header-clear`(62.4px)보다 살짝 크게 둬서
       이미 정렬된 카드를 "다음"으로 오인하지 않게 한다. */
    const LINE = 72;
    const target =
      dir === 1
        ? stops.find(el => el.getBoundingClientRect().top > LINE)
        : [...stops].reverse().find(el => el.getBoundingClientRect().bottom < LINE);

    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else if (dir === 1) window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }, []);

  return (
    <div ref={wrap} className={styles.wrap}>
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
              tops={item.tops}
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

      {/* 🔴 홈·상세 **둘 다** 띄운다. 전에는 `snap`일 때만(=홈만) 나왔고 데스크톱 전용이라
          상세에서는 다음 안건으로 갈 수단이 아예 없었다 — 사유를 올리면 상세로 자동
          이동시키므로(8차) 나가는 길이 없으면 갇힌다. */}
      <div className={styles.nav}>
        <button type="button" className={styles.navBtn} onClick={() => go(-1)} aria-label="이전 안건">
          ↑
        </button>
        <button
          type="button"
          className={`${styles.navBtn} ${styles.navNext}`}
          onClick={() => go(1)}
          aria-label="다음 안건"
        >
          <span className={styles.navLabel}>다음 안건</span>
          <span aria-hidden="true">↓</span>
        </button>
      </div>
    </div>
  );
}
