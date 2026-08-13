'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MAX_LENGTH } from '@/lib/comments';
import { markLanding } from './CommentLanding';
import styles from './CardSay.module.css';

/* 🔴 7차 §3 — 투표 직후 카드 안에서 바로 한 줄 쓰게 한다.
 *
 *  전에는 `투표 → 링크 클릭 → 상세 이동 → 스크롤 → 입력창 발견`이었다.
 *  단계마다 이탈하고, **투표 직후가 가장 말하고 싶은 순간**인데 30초만 지나면 사라진다.
 *  댓글은 이 사이트의 본문이자(SEO) 차별점이자(진영 분리) 재방문 이유다.
 *
 *  규칙(§3-3):
 *   · 결과를 먼저 보여준 **뒤에** 나타난다 — 결과가 투표의 보상이다.
 *     건너뛰고 입력창을 먼저 띄우면 거래처럼 느껴진다. CSS 애니메이션으로 0.3s 늦춘다.
 *   · **자동 포커스 금지** — 모바일에서 키보드가 즉시 올라오면 화면 절반이 가려져
 *     방금 받은 결과를 볼 수 없다.
 *   · **다음 안건으로 가는 조건이 되지 않는다.** 매번 글을 요구하면 3개쯤에서 지친다.
 *     대부분은 그냥 누르고 넘어가며 그게 정상이다. 유도는 하되 우회로는 항상 열려 있다.
 *   · `textarea`가 아니라 한 줄 `input` — 큰 상자는 "글을 써야 한다"는 부담을 준다.
 */

interface Props {
  questionId: string;
  /** 올린 뒤 이동할 상세 페이지의 슬러그 */
  slug: string;
  /** 내가 기표한 쪽의 이름. "이 쪽으로 올라갑니다"에 쓴다. */
  sideLabel: string;
  /** 상황별 유도 문구(§3-4). 소수파일 때가 가장 잘 작동한다. */
  placeholder: string;
  /** 올린 뒤 카드가 상태를 갱신하도록 — 기표 잠금(번복 불가)도 이때부터다. */
  onWrote: () => void;
}

export function CardSay({ questionId, slug, sideLabel, placeholder, onWrote }: Props) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  /** 서버가 돌려준 **실제** 댓글. 낙관적 표시가 아니라 확정된 값이다 →
   *  8차 §7의 "롤백 처리"가 필요 없다(확인되지 않은 상태를 애초에 보여주지 않는다). */
  const [posted, setPosted] = useState<{ id: number; body: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (busy || !body.trim()) return;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch('/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          /* 🔴 진영을 보내지 않는다. 서버가 기표 쿠키에서 읽는다 —
             클라이언트가 보내면 투표 없이 아무 진영으로 쓸 수 있다. */
          body: JSON.stringify({ id: questionId, body }),
        });
        if (res.ok) {
          const created = (await res.json().catch(() => null)) as
            | { id: number; body: string; side: string }
            | null;
          setPosted(created ? { id: created.id, body: created.body } : { id: 0, body });
          setBody('');
          onWrote();
          /* 🔴 올린 뒤 **상세의 진영 칼럼으로 데려간다.**
           *
           *  방금 쓴 한마디가 어느 진영에 어떻게 걸렸는지 보는 것이 이 사이트의 보상이고
           *  (진영 분리가 최대 차별점, 브리프 §4), 반대편 의견도 거기서 처음 마주친다.
           *
           *  브리프 원칙 2("돌려보내지 않는다")와 어긋나지 않는다 — 상세 페이지 아래에
           *  **이어지는 피드가 그대로 있어서** 스크롤이 끊기지 않고 PV는 오히려 늘어난다.
           *
           *  ⚠️ 도착한 화면에 자기 댓글이 있어야 한다. 상세는 ISR 300초 + 목록 60초 캐시라
           *  서버 HTML에는 없을 수 있다 → `Comments`가 마운트 즉시 한 번 받아오도록 고쳤다. */
          /* 🔴 **0.9초 기다린 뒤** 이동한다(8차 §3-2).
             누르자마자 화면이 바뀌면 등록됐는지 확인하지 못한 채 페이지가 전환되고,
             모바일에서 한 번 깜빡이면 "오류가 났나" 하는 불안을 준다.
             위에서 실제 댓글을 이미 그려 뒀으므로 그걸 눈으로 확인할 시간이다.

             🔴 **URL에 해시를 넣지 않는다.** 해시가 있으면 브라우저가 즉시 그 위치로
             점프해서 질문(본문)을 못 보고 지나간다. 대신 목표를 세션에 남기고
             상세의 `CommentLanding`이 "최상단 착지 → 잠깐 → 아래로 스크롤"을 연출한다. */
          if (created?.id) markLanding(created.id);
          window.setTimeout(() => {
            router.push(`/q/${encodeURIComponent(slug)}`);
          }, 900);
          return;
        }
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? '올리지 못했습니다.');
      } catch {
        setError('연결이 끊겼습니다. 잠시 후 다시.');
      } finally {
        setBusy(false);
      }
    },
    [body, busy, onWrote, questionId, router, slug],
  );

  if (posted) {
    /* 등록 확인 → 이동. 서버가 돌려준 실제 본문을 그대로 보여준다. */
    return (
      <div className={styles.done}>
        <p className={styles.doneBody}>&ldquo;{posted.body}&rdquo;</p>
        <p className={styles.doneMeta}>
          &ldquo;{sideLabel}&rdquo; 쪽에 접수했습니다 · 반대편 의견을 보러 갑니다…
        </p>
      </div>
    );
  }

  const over = body.length > MAX_LENGTH;

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.row}>
        <input
          className={styles.input}
          type="text"
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={placeholder}
          maxLength={MAX_LENGTH + 20}
          enterKeyHint="send"
          aria-label="이 안건에 대한 사유"
        />
        <button
          type="submit"
          className={styles.send}
          disabled={busy || over || body.trim().length === 0}
        >
          올리기
        </button>
      </div>
      <p className={styles.meta}>
        {error ? (
          <span className={styles.error}>{error}</span>
        ) : (
          <>
            <span className={over ? styles.error : undefined}>
              {body.length}/{MAX_LENGTH}
            </span>
            <span className={styles.dot}>·</span>
            <span>&ldquo;{sideLabel}&rdquo; 쪽으로 올라갑니다</span>
          </>
        )}
      </p>
    </form>
  );
}
