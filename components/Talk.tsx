'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Comment } from '@/lib/comments';
import type { Question } from '@/lib/questions';
import { takeOf } from '@/lib/ai';
import { VOTE_EVENT, readVotes } from '@/lib/aiMatch';
import { COMMENT_EVENT, TALK_OPEN, type CommentDetail } from '@/lib/talk';
import { CardSay } from './CardSay';
import { useVoteState } from './voteState';
import styles from './Talk.module.css';

/** 넓은 화면에서만 옆 칸이 된다 — Feed.module.css / globals.css의 값과 같아야 한다 */
const WIDE = '(min-width: 1200px)';
const LIKED_KEY = 'ottoke:liked';

/* 댓글 칸 — 피드 카드마다 붙는다(2026-11-04).
 *
 * 전에는 댓글을 보려면 상세 페이지로 가야 했고, 카드에서 한 줄 쓰면 0.9초 뒤 상세로 끌려갔다.
 * 이제 피드 안에서 끝난다:
 *   · PC 홈(`side`)  — 카드 오른쪽에 붙은 칸. **읽기·쓰기·추천이 한 화면에** 다 있다.
 *                      목록만 칸 안에서 스크롤되고 입력칸은 아래에 고정된다
 *   · 상세 페이지(`initial`) — 주 카드 옆(PC)·아래(휴대폰)에 **항상 펼쳐 둔다.**
 *                      서버가 댓글을 실어 보낸다 — 댓글이 이 페이지의 본문이라 크롤러가 읽어야 한다
 *                      (브리프 §6). 예전 `Comments` 섹션을 대신한다
 *   · 그 밖(휴대폰 피드) — 평소엔 아무것도 그리지 않다가 `TALK_OPEN`이 오면
 *                      아래에서 올라오는 창(<dialog>)으로 연다
 *
 * 🔴 **맨 위는 AI의 한마디다.** 대부분의 안건이 댓글 0개라 사람 댓글만 두면 칸이 빈다.
 * 🔴 **투표 전에는 AI의 선택과 진영 이름을 가린다** — 카드의 `.voices`, AiBox와 같은 규칙(밴드왜건).
 * 🔴 댓글은 **필요할 때만** 받는다 — 옆 칸이면 화면 근처에 왔을 때, 창이면 열 때. 118장이
 *    한꺼번에 받아 오면 안 된다.
 *
 * ⚠️ 옆 칸 안의 스크롤은 의도한 것이다. 카드 안에 스크롤을 만들지 않는 규칙(Feed.module.css
 *    overflow 주석)은 **투표용지**의 내용이 갇히는 문제 때문이었다. 이 칸은 넘쳐도 투표에
 *    필요한 것이 갇히지 않고, `overscroll-behavior: contain`으로 피드 스냅과 섞이지 않게 한다.
 */
interface Props {
  question: Question;
  /** 넓은 화면에서 카드 옆에 붙인다(홈·상세 아래 피드) */
  side?: boolean;
  /** 상세 페이지 — 서버가 받은 댓글. 있으면 항상 펼쳐진 칸으로 그린다 */
  initial?: Comment[];
}

export function Talk({ question, side = false, initial }: Props) {
  const page = initial !== undefined;
  const root = useRef<HTMLElement | null>(null);
  const dialog = useRef<HTMLDialogElement | null>(null);
  const [wide, setWide] = useState(false);
  /* 상세는 서버 HTML이 ISR로 최대 몇 분 낡을 수 있어 마운트하자마자 한 번 더 받아 합친다 */
  const [wanted, setWanted] = useState(page);
  const [items, setItems] = useState<Comment[] | null>(initial ?? null);
  /* 🔴 `items !== null`로 "받았는지"를 판단하면 안 된다 — 방금 쓴 댓글이 먼저 들어오면
     목록이 생겨서 기존 댓글을 영영 안 받는다(실제로 창에 내 댓글 1개만 보였다) */
  const [loaded, setLoaded] = useState(false);
  const [fresh, setFresh] = useState<number | null>(null);
  const [mine, setMine] = useState<'a' | 'b' | null>(null);
  const [wroteNow, setWroteNow] = useState(false);
  const [liked, setLiked] = useState<Record<number, boolean>>({});
  const [reported, setReported] = useState<Record<number, boolean>>({});
  const ai = takeOf(question);
  const inline = page || (side && wide);

  /* 기재 여부는 서버 쿠키가 진실이다. 카드와 같은 요청을 공유한다(voteState.ts) */
  const { state: server } = useVoteState(question.id, wanted);
  const wrote = wroteNow || server?.wrote === true;

  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    const read = () => setMine(readVotes().get(question.id) ?? null);
    read();
    try {
      setLiked(JSON.parse(localStorage.getItem(LIKED_KEY) ?? '{}') as Record<number, boolean>);
    } catch {
      /* 추천 기록이 없어도 읽기는 된다 */
    }
    const onComment = (e: Event) => {
      const d = (e as CustomEvent<CommentDetail>).detail;
      if (d?.questionId !== question.id) return;
      setWroteNow(true);
      setFresh(d.comment.id);
      setItems(prev => [d.comment, ...(prev ?? []).filter(c => c.id !== d.comment.id)]);
    };
    const onOpen = (e: Event) => {
      if ((e as CustomEvent<{ questionId: string }>).detail?.questionId !== question.id) return;
      setWanted(true);
      if (page) return;
      /* 옆 칸이면 이미 보인다 — 창을 열지 않는다 */
      if (window.matchMedia(WIDE).matches && side) return;
      const d = dialog.current;
      if (d && !d.open) d.showModal();
    };
    window.addEventListener(VOTE_EVENT, read);
    window.addEventListener(COMMENT_EVENT, onComment);
    window.addEventListener(TALK_OPEN, onOpen);
    return () => {
      window.removeEventListener(VOTE_EVENT, read);
      window.removeEventListener(COMMENT_EVENT, onComment);
      window.removeEventListener(TALK_OPEN, onOpen);
    };
  }, [page, question.id, side]);

  /* 옆 칸 — 화면 근처에 오면 받는다 */
  useEffect(() => {
    const node = root.current;
    if (!inline || !node || wanted) return;
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) setWanted(true);
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [inline, wanted]);

  useEffect(() => {
    if (!wanted || loaded) return;
    let alive = true;
    fetch(`/api/comments?id=${encodeURIComponent(question.id)}`, { cache: 'no-store' })
      .then(res => (res.ok ? (res.json() as Promise<{ comments: Comment[] }>) : null))
      .then(data => {
        if (!alive) return;
        setLoaded(true);
        /* 그사이 방금 쓴 댓글이 먼저 들어왔으면 지우지 않고 합친다 */
        setItems(prev => {
          const seen = new Map((data?.comments ?? []).map(c => [c.id, c]));
          (prev ?? []).forEach(c => seen.set(c.id, c));
          return [...seen.values()];
        });
      })
      .catch(() => {
        if (!alive) return;
        setLoaded(true);
        setItems(prev => prev ?? []);
      });
    return () => {
      alive = false;
    };
  }, [wanted, loaded, question.id]);

  const like = useCallback(
    async (id: number) => {
      if (liked[id]) return;
      const next = { ...liked, [id]: true };
      setLiked(next);
      try {
        localStorage.setItem(LIKED_KEY, JSON.stringify(next));
      } catch {
        /* 저장이 막혀도 추천은 보낸다 */
      }
      setItems(prev => prev?.map(c => (c.id === id ? { ...c, likes: c.likes + 1 } : c)) ?? prev);
      try {
        await fetch(`/api/comments/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'like' }),
        });
      } catch {
        /* 되돌리지 않는다 — 되돌리면 화면이 튄다(Comments.tsx와 같은 판단) */
      }
    },
    [liked],
  );

  /* 신고 — 기준 횟수가 차면 서버가 숨긴다(`report_threshold()`, schema.sql) */
  const report = useCallback(async (id: number) => {
    setReported(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/comments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'report' }),
      });
      const { hidden } = (await res.json().catch(() => ({}))) as { hidden?: boolean };
      if (hidden) setItems(prev => prev?.filter(c => c.id !== id) ?? prev);
    } catch {
      /* 재시도해도 결과가 같아 알리지 않는다 */
    }
  }, []);

  const voted = mine !== null;
  /* 방금 쓴 것 → 추천순 → 최신순 */
  const sorted = (items ?? [])
    .slice()
    .sort((x, y) => (y.id === fresh ? 1 : 0) - (x.id === fresh ? 1 : 0) || y.likes - x.likes || y.id - x.id);

  const aiLine = !ai
    ? null
    : !ai.pick
      ? '이건 안 찍을래요. 싸움 나요.'
      : voted
        ? ai.why
        : 'AI도 한마디 해 놨어요. 도장 찍으면 보여요.';

  const body = (
    <>
      <ul className={styles.list}>
        {aiLine && (
          <li className={`${styles.item} ${styles.ai}`}>
            <span className={styles.who}>
              <span className={styles.aiTag}>AI</span>
              {voted && ai?.pick && <span className={styles.side}>{question[ai.pick]} 쪽</span>}
            </span>
            <p className={styles.body}>{aiLine}</p>
          </li>
        )}

        {sorted.map(c => (
          <li
            key={c.id}
            className={`${styles.item} ${voted && c.side === mine ? styles.ours : ''} ${
              c.id === fresh ? styles.fresh : ''
            }`}
          >
            <span className={styles.who}>
              <span className={styles.side}>
                {voted ? `${question[c.side]} 쪽` : c.side === 'a' ? '한쪽' : '다른쪽'}
              </span>
              {c.id === fresh && <span className={styles.freshTag}>방금 쓴 댓글</span>}
            </span>
            <p className={styles.body}>{c.body}</p>
            <span className={styles.tools}>
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
            </span>
          </li>
        ))}

        {!loaded && wanted && <li className={styles.empty}>댓글 불러오는 중…</li>}
        {items !== null && items.length === 0 && (
          <li className={styles.empty}>
            {voted
              ? '사람 말은 아직 없어요. 아래에 한 줄 남기면 AI 말고 1등이에요.'
              : '사람 말은 아직 없어요. 도장 찍고 AI한테 한마디 해 주세요.'}
          </li>
        )}
      </ul>

      {/* 쓰기 — 투표한 사람만, 한 안건에 한 번(1안건 1의견). 진영은 서버가 기표 쿠키에서 정한다 */}
      <div className={styles.foot}>
        {!mine ? (
          <p className={styles.gate}>댓글은 도장 찍은 사람만 쓸 수 있어요.</p>
        ) : wrote ? (
          <p className={styles.gate}>이 질문엔 이미 한마디 하셨어요.</p>
        ) : (
          <CardSay
            questionId={question.id}
            sideLabel={question[mine]}
            placeholder="왜 그런지 한 줄로"
            onWrote={() => setWroteNow(true)}
          />
        )}
      </div>
    </>
  );

  const head = (
    <div className={styles.head}>
      <h3 className={styles.title}>댓글</h3>
      {items && items.length > 0 && <span className={styles.count}>{items.length}개</span>}
      {!inline && (
        <button type="button" className={styles.close} onClick={() => dialog.current?.close()}>
          닫기
        </button>
      )}
    </div>
  );

  if (inline) {
    return (
      /* `id="왜-그런지"` — 예전 댓글 섹션의 앵커. 공유된 링크·카드의 링크가 여기로 온다 */
      <aside
        ref={root}
        id={page ? '왜-그런지' : undefined}
        className={`${styles.talk} ${page ? styles.page : ''}`}
        aria-label="이 질문의 댓글"
      >
        {head}
        {body}
      </aside>
    );
  }

  /* 창 — 바깥(배경)을 누르면 닫힌다. Esc와 포커스 가두기는 <dialog>가 해 준다 */
  return (
    <dialog
      ref={dialog}
      className={styles.sheet}
      aria-label={`${question.q} — 댓글`}
      onClick={e => {
        if (e.target === e.currentTarget) dialog.current?.close();
      }}
    >
      <div className={styles.sheetInner}>
        <p className={styles.sheetQ}>{question.q}</p>
        {head}
        {wanted && body}
      </div>
    </dialog>
  );
}
