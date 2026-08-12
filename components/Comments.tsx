'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Comment } from '@/lib/comments';
import { MAX_LENGTH } from '@/lib/comments';
import type { Question } from '@/lib/questions';
import { useVoteState } from './voteState';
import styles from './Comments.module.css';

type Side = 'a' | 'b';

interface Props {
  question: Question;
  initial: Comment[];
  /** 진영별 최고 추천 — 상대편 것을 상단에 노출한다(브리프 §4) */
  tops: { a: Comment | null; b: Comment | null };
  counts: { a: number; b: number };
  /** 집계·댓글 서버가 붙어 있는지 */
  live: boolean;
}

const LIKED_KEY = 'ottoke:liked';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 저장이 막혀 있어도 기재는 되어야 한다 */
  }
}

function ago(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';
  const min = Math.floor((Date.now() - then) / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

/* 🔴 진영 분리 댓글(브리프 §4) — 이 사이트의 가장 큰 차별점.
 *
 *  · 댓글을 두 진영 2열로 나눈다
 *  · 내가 투표한 쪽에만 쓸 수 있다. 반대쪽은 읽기 전용
 *  · **상대편 최고 추천 1개를 항상 상단에** — 에코챔버를 막고 반박 욕구로 참여율을 올린다
 */
export function Comments({ question, initial, tops, counts, live }: Props) {
  const [items, setItems] = useState<Comment[]>(initial);
  const [top, setTop] = useState(tops);
  const [tally, setTally] = useState(counts);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [wroteNow, setWroteNow] = useState(false);
  const [liked, setLiked] = useState<Record<number, boolean>>({});
  const [reported, setReported] = useState<Record<number, boolean>>({});

  /* 투표 여부·기재 여부는 서버 쿠키가 진실이다. Ballot과 같은 요청을 공유한다. */
  const { state: server, pending } = useVoteState(question.id, true);
  const myVote = server?.myVote ?? null;
  const wrote = wroteNow || server?.wrote === true;
  const ready = !pending;

  useEffect(() => {
    setLiked(read<Record<number, boolean>>(LIKED_KEY, {}));
  }, []);

  /* 남이 쓴 게 자동으로 올라와야 대화처럼 읽힌다. 탭이 숨으면 멈춘다.
     Realtime을 쓰지 않는 이유는 app/api/comments/route.ts에 적었다. */
  useEffect(() => {
    if (!live) return;
    let alive = true;
    let timer: number | undefined;

    const pull = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/comments?id=${encodeURIComponent(question.id)}`, {
          cache: 'no-store',
        });
        if (!res.ok || !alive) return;
        const data = (await res.json()) as {
          comments: Comment[];
          tops?: { a: Comment | null; b: Comment | null };
          counts?: { a: number; b: number };
        };
        setItems(prev => {
          const seen = new Map(prev.map(c => [c.id, c]));
          data.comments.forEach(c => seen.set(c.id, c));
          return [...seen.values()].sort((x, y) => y.id - x.id);
        });
        if (data.tops) setTop(data.tops);
        if (data.counts) setTally(data.counts);
      } catch {
        /* 다음 주기에 다시 시도한다 */
      }
    };

    const start = () => {
      window.clearInterval(timer);
      timer = window.setInterval(pull, 6000);
    };
    const onVisible = () => {
      if (document.hidden) window.clearInterval(timer);
      else {
        pull();
        start();
      }
    };

    start();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [live, question.id]);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (sending || !draft.trim()) return;
      setSending(true);
      setError(null);
      try {
        const res = await fetch('/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: question.id, body: draft }),
        });
        if (res.status === 201) {
          const created = (await res.json()) as Comment;
          setItems(prev => [created, ...prev]);
          setTally(t => ({ ...t, [created.side]: t[created.side] + 1 }));
          setDraft('');
          setWroteNow(true);
        } else {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setError(data.error ?? '못 올렸습니다.');
          if (res.status === 409) setWroteNow(true);
        }
      } catch {
        setError('연결에 실패했습니다. 잠시 후 다시.');
      } finally {
        setSending(false);
      }
    },
    [draft, question.id, sending],
  );

  const like = useCallback(
    async (id: number) => {
      if (liked[id]) return;
      const next = { ...liked, [id]: true };
      setLiked(next);
      write(LIKED_KEY, next);
      const bump = (c: Comment) => (c.id === id ? { ...c, likes: c.likes + 1 } : c);
      setItems(prev => prev.map(bump));
      setTop(t => ({ a: t.a ? bump(t.a) : null, b: t.b ? bump(t.b) : null }));

      try {
        const res = await fetch(`/api/comments/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'like' }),
        });
        if (res.ok) {
          const { likes } = (await res.json()) as { likes: number };
          const set = (c: Comment) => (c.id === id ? { ...c, likes } : c);
          setItems(prev => prev.map(set));
          setTop(t => ({ a: t.a ? set(t.a) : null, b: t.b ? set(t.b) : null }));
        }
      } catch {
        /* 실패해도 되돌리지 않는다 — 되돌리면 화면이 튄다 */
      }
    },
    [liked],
  );

  const report = useCallback(async (id: number) => {
    setReported(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/comments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'report' }),
      });
      const { hidden } = (await res.json().catch(() => ({}))) as { hidden?: boolean };
      if (hidden) {
        setItems(prev => prev.filter(c => c.id !== id));
        setTop(t => ({ a: t.a?.id === id ? null : t.a, b: t.b?.id === id ? null : t.b }));
      }
    } catch {
      /* 재시도해도 결과가 같아 알리지 않는다 */
    }
  }, []);

  const remain = MAX_LENGTH - draft.length;
  const canWrite = ready && myVote !== null && !wrote && live;
  const total = tally.a + tally.b;
  const opposite: Side | null = myVote === 'a' ? 'b' : myVote === 'b' ? 'a' : null;
  const crossTop = opposite ? top[opposite] : null;

  const commentItem = (c: Comment) => (
    <li key={c.id} className={styles.item}>
      <p className={styles.body}>{c.body}</p>
      <div className={styles.meta}>
        <span className={styles.when}>{ago(c.createdAt)}</span>
        <button
          type="button"
          className={`${styles.tool} ${liked[c.id] ? styles.liked : ''}`}
          onClick={() => like(c.id)}
          disabled={liked[c.id]}
        >
          오케 {c.likes}
        </button>
        <button
          type="button"
          className={`${styles.tool} ${styles.report}`}
          onClick={() => report(c.id)}
          disabled={reported[c.id]}
        >
          {reported[c.id] ? '신고함' : '신고'}
        </button>
      </div>
    </li>
  );

  const column = (side: Side) => {
    const list = items.filter(c => c.side === side);
    const isMine = myVote === side;
    return (
      <div className={`${styles.column} ${isMine ? styles.mine : ''}`}>
        <div className={styles.columnHead}>
          <span className={styles.columnName}>
            {question[side]}
            {isMine ? ' 쪽' : ''}
          </span>
          <span className={styles.columnNum}>{tally[side]}</span>
        </div>
        {list.length > 0 ? (
          <ul className={styles.list}>{list.map(commentItem)}</ul>
        ) : (
          <p className={styles.empty}>
            {/* 서버 렌더에서는 내 진영을 모른다 — 그때 "반대쪽"이라고 단정하면
                양쪽에 같은 문구가 찍힌다. 투표 전에는 중립으로 쓴다. */}
            {myVote === null
              ? '아직 조용합니다.'
              : isMine
                ? '이 쪽은 아직 조용합니다.'
                : '반대쪽은 할 말이 없나 봅니다.'}
          </p>
        )}
      </div>
    );
  };

  return (
    <section className={styles.sheet} id="왜-그런지">
      <div className={styles.head}>
        <h2 className={styles.title}>왜 그런지</h2>
        <span className={styles.count}>
          {total > 0 ? `${total.toLocaleString('ko-KR')}명이 한마디` : ''}
        </span>
      </div>

      {/* 🔴 상대편 최고 추천 — 항상 상단 */}
      {crossTop && opposite && (
        <div className={styles.crossTop}>
          <span className={styles.crossLabel}>
            반대편 1위 · &ldquo;{question[opposite]}&rdquo; 쪽
          </span>
          <p className={styles.crossBody}>{crossTop.body}</p>
          <div className={styles.meta}>
            <button
              type="button"
              className={`${styles.tool} ${liked[crossTop.id] ? styles.liked : ''}`}
              onClick={() => like(crossTop.id)}
              disabled={liked[crossTop.id]}
            >
              오케 {crossTop.likes}
            </button>
          </div>
        </div>
      )}

      {canWrite && myVote && (
        <form className={styles.form} onSubmit={submit}>
          <span className={styles.formSide}>
            &ldquo;{question[myVote]}&rdquo; 쪽으로 올라갑니다
          </span>
          <div className={styles.field}>
            <input
              className={styles.input}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              maxLength={MAX_LENGTH + 20}
              placeholder="왜 그런지 한 줄로"
              aria-label="내 의견"
              autoComplete="off"
            />
            <button
              type="submit"
              className={styles.submit}
              disabled={sending || draft.trim().length < 2 || remain < 0}
            >
              {sending ? '올리는 중' : '올리기'}
            </button>
          </div>
          <div className={styles.formFoot}>
            <span className={error ? styles.error : undefined}>
              {error ?? '링크와 연락처는 막습니다. 광고는 티가 납니다.'}
            </span>
            <span className={`${styles.remain} ${remain < 0 ? styles.over : ''}`}>{remain}</span>
          </div>
        </form>
      )}

      {ready && !canWrite && (
        <p className={styles.gate}>
          {!live
            ? '댓글 서버가 아직 안 붙었습니다.'
            : myVote === null
              ? '투표부터 하세요. 남의 말만 읽고 가는 건 반칙입니다.'
              : '할 말은 이미 하셨습니다.'}
        </p>
      )}

      {total === 0 && ready && (
        <p className={styles.empty}>아무도 할 말이 없나 봅니다.</p>
      )}

      <div className={styles.columns}>
        {column('a')}
        {column('b')}
      </div>
    </section>
  );
}
