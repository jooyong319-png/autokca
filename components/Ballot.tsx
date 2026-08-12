'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Question } from '@/lib/questions';
import type { Tally } from '@/lib/votes';
import { SITE, TURNOUT_THRESHOLD } from '@/lib/site';
import { useVoteState } from './voteState';
import styles from './Ballot.module.css';

type Choice = 'a' | 'b';

interface Props {
  question: Question;
  docNo: string;
  tally: Tally;
  /** 피드 안에서는 h2로 — 한 페이지에 h1이 여러 개면 안 된다 */
  heading?: 'h1' | 'h2';
}

const VOTED_KEY = 'ottoke:voted';
const RECORD_KEY = 'ottoke:record';

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 저장이 막혀 있어도 투표 자체는 되어야 한다 */
  }
}

export function Ballot({ question, docNo, tally: initial, heading = 'h1' }: Props) {
  const [tally, setTally] = useState<Tally>(initial);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [thud, setThud] = useState(false);
  const [copied, setCopied] = useState(false);
  const busy = useRef(false);
  const counted = useRef(false);

  /* 🔴 투표 여부의 진실은 **서버 쿠키**에 있다. localStorage는 첫 화면을 빠르게 그리는
     힌트로만 쓰고, 서버 응답이 오면 그 값으로 덮는다. 둘이 어긋나면 사용자가
     "투표한 것처럼 보이는데 댓글도 못 쓰고 다시 투표도 못 하는" 상태에 갇힌다. */
  const { state: server } = useVoteState(question.id, true);

  useEffect(() => {
    const mine = readJSON<Record<string, Choice>>(VOTED_KEY, {})[question.id];
    if (mine) setChoice(mine);
  }, [question.id]);

  useEffect(() => {
    if (!server) return;
    setChoice(server.myVote);
    if (server.live) setTally({ a: server.a, b: server.b, live: true });

    const voted = readJSON<Record<string, Choice>>(VOTED_KEY, {});
    if (server.myVote) {
      voted[question.id] = server.myVote;
    } else {
      delete voted[question.id];
      delete voted[`${question.id}:counted`];
    }
    writeJSON(VOTED_KEY, voted);
  }, [question.id, server]);

  const vote = useCallback(
    async (ch: Choice) => {
      if (choice || busy.current) return;
      busy.current = true;

      setChoice(ch);
      setThud(true);
      setTimeout(() => setThud(false), 340);
      setTally(t => ({ ...t, [ch]: t[ch] + 1 } as Tally));

      try {
        const res = await fetch('/api/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: question.id, choice: ch }),
        });
        if (res.ok) {
          const next = (await res.json()) as Tally & { myVote: Choice | null };
          if (next.myVote) setChoice(next.myVote);
          if (next.live) setTally({ a: next.a, b: next.b, live: true });
          const voted = readJSON<Record<string, Choice>>(VOTED_KEY, {});
          voted[question.id] = next.myVote ?? ch;
          writeJSON(VOTED_KEY, voted);
        }
      } catch {
        /* 집계가 실패해도 화면은 그대로 둔다 */
      } finally {
        busy.current = false;
      }
    },
    [choice, question.id],
  );

  const total = tally.a + tally.b;
  /* 🔴 결과는 항상 보여준다(브리프 §6). 수치가 텍스트로 나와 있어야
     스니펫에 걸리고, 수치만 있는 빈 페이지가 되지 않게 댓글이 본문을 채운다. */
  const hasResult = tally.live && total > 0;
  const pctA = total > 0 ? (tally.a / total) * 100 : 50;
  const pctB = 100 - pctA;
  const lead: Choice = pctA >= pctB ? 'a' : 'b';
  const myPct = choice === 'a' ? pctA : pctB;

  /* 내 기록 — 다수파였던 적 */
  useEffect(() => {
    if (!choice || !hasResult || counted.current) return;
    const voted = readJSON<Record<string, Choice>>(VOTED_KEY, {});
    const mark = `${question.id}:counted`;
    if (voted[mark]) {
      counted.current = true;
      return;
    }
    const rec = readJSON<{ n: number; major: number }>(RECORD_KEY, { n: 0, major: 0 });
    rec.n += 1;
    if (choice === lead) rec.major += 1;
    writeJSON(RECORD_KEY, rec);
    voted[mark] = choice;
    writeJSON(VOTED_KEY, voted);
    counted.current = true;
  }, [choice, hasResult, lead, question.id]);

  /* 🔴 캡처가 곧 광고다(브리프 §4). 복사 문구에 도메인이 반드시 들어간다. */
  const share = useCallback(async () => {
    const pct = (p: number) => `${p.toFixed(0)}%`;
    const text = hasResult
      ? `${question.q}\n${question.a} ${pct(pctA)} · ${question.b} ${pct(pctB)}\n${SITE.wordmark} ${SITE.url}/q/${question.slug}`
      : `${question.q}\n${SITE.wordmark} ${SITE.url}/q/${question.slug}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [hasResult, pctA, pctB, question]);

  const Heading = heading;

  const bar = (key: Choice, name: string, pct: number) => (
    <div className={`${styles.bar} ${lead === key ? styles.lead : ''}`}>
      <div className={styles.barTop}>
        <span className={styles.barName}>
          {name}
          {choice === key && <span className={styles.mineTag}>내 표</span>}
        </span>
        <span className={styles.barPct}>{pct.toFixed(0)}%</span>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct.toFixed(1)}%` }} />
      </div>
    </div>
  );

  return (
    <section className={`${styles.ballot} ${thud ? styles.thud : ''}`} id={question.slug}>
      <div className={styles.docline}>
        <span className={styles.docNo}>{docNo}</span>
        <span>{question.kind === 'serious' ? '안건' : '별건'}</span>
      </div>

      <Heading className={styles.question}>{question.q}</Heading>

      <div className={styles.choices}>
        {(['a', 'b'] as const).map(key => (
          <button
            key={key}
            type="button"
            className={styles.choice}
            onClick={() => vote(key)}
            disabled={choice !== null}
            aria-pressed={choice === key}
          >
            <span className={styles.name}>{question[key]}</span>
            <span className={styles.box}>
              {/* 관공서 기표 부호(卜)가 아니라 브랜드 글자 「오」다 */}
              <span
                className={`${styles.seal} ${choice === key ? styles.sealOn : ''}`}
                aria-hidden="true"
              >
                오
              </span>
            </span>
          </button>
        ))}
      </div>

      {hasResult ? (
        <div className={styles.tally}>
          {bar('a', question.a, pctA)}
          {bar('b', question.b, pctB)}

          {/* 🔴 수치를 문장으로도 쓴다 — 스니펫에 걸리는 형태(브리프 §6) */}
          <p className={styles.turnout}>
            응답자 {total.toLocaleString('ko-KR')}명 중{' '}
            <strong>{Math.round(lead === 'a' ? pctA : pctB)}%</strong>가 &ldquo;
            {lead === 'a' ? question.a : question.b}&rdquo;를 골랐습니다.
            {total < TURNOUT_THRESHOLD && ' 아직 표가 적습니다.'}
          </p>

          {choice && (
            <p className={styles.verdict}>
              {choice === lead
                ? `무난하네요. 재미없어요. (${Math.round(myPct)}%)`
                : `축하합니다. 당신은 이상한 사람입니다. (${Math.round(myPct)}%)`}
            </p>
          )}
        </div>
      ) : (
        <p className={styles.turnout}>
          {tally.live
            ? '아직 아무도 안 눌렀습니다. 첫 표를 던져 보세요.'
            : '집계 서버가 연결되지 않아 결과를 표시하지 않습니다.'}
        </p>
      )}

      <div className={styles.acts}>
        <button type="button" className={`${styles.btn} ${styles.btnSeal}`} onClick={share}>
          {copied ? '복사했습니다' : '결과 복사'}
        </button>
        <a className={styles.btn} href={`/q/${encodeURIComponent(question.slug)}`}>
          이 질문만 보기 →
        </a>
      </div>
    </section>
  );
}
