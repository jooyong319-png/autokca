'use client';

import { useCallback, useState } from 'react';
import { MAX_LENGTH } from '@/lib/comments';
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
  /** 내가 기표한 쪽의 이름. "이 쪽으로 올라갑니다"에 쓴다. */
  sideLabel: string;
  /** 상황별 유도 문구(§3-4). 소수파일 때가 가장 잘 작동한다. */
  placeholder: string;
  /** 올린 뒤 카드가 상태를 갱신하도록 — 기표 잠금(번복 불가)도 이때부터다. */
  onWrote: () => void;
}

export function CardSay({ questionId, sideLabel, placeholder, onWrote }: Props) {
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
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
          setDone(true);
          setBody('');
          onWrote();
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
    [body, busy, onWrote, questionId],
  );

  if (done) {
    return (
      <p className={styles.done}>
        접수했습니다. &ldquo;{sideLabel}&rdquo; 쪽에 기재되었습니다.
      </p>
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
