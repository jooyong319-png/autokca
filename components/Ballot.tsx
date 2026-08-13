'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Question } from '@/lib/questions';
import type { Tally } from '@/lib/votes';
import { SITE } from '@/lib/site';
import { resultNotice, showsResult, showsVerdict, stageOf, totalOf } from '@/lib/tiers';
import { useVoteState } from './voteState';
import styles from './Ballot.module.css';

type Choice = 'a' | 'b';

interface Props {
  question: Question;
  docNo: string;
  tally: Tally;
  /** 피드 안에서는 h2로 — 한 페이지에 h1이 여러 개면 안 된다 */
  heading?: 'h1' | 'h2';
  /** 이 질문의 전용 페이지인가.
   *
   *  🔴 true면 "이 질문만 보기"를 감춘다 — 이미 그 페이지인데 자기 자신을 가리키고 있었다.
   *  대신 `nextSlug`로 다음 질문으로 보낸다. 검색 유입은 대부분 상세로 착지하므로
   *  여기서 이어지지 않으면 1PV로 끝난다(브리프 원칙 1). */
  standalone?: boolean;
  /** 상세 페이지에서 아래 피드의 첫 질문 슬러그. 같은 화면 안이라 앵커로 보낸다. */
  nextSlug?: string;
  /** 이 질문의 댓글 수. 카드에서 상세로 넘어갈 동기다(2차 §5) —
   *  댓글은 체류시간이자 SEO 본문이라 상세 유입이 곧 사이트 성장이다. */
  commentCount?: number;
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

export function Ballot({
  question,
  docNo,
  tally: initial,
  heading = 'h1',
  standalone = false,
  nextSlug,
  commentCount = 0,
}: Props) {
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

  const total = totalOf(tally);
  const stage = stageOf(tally);
  const voted = choice !== null;

  /* 🔴 두 조건을 모두 넘어야 결과를 보여준다.
   *
   *  1) 표본 임계치 — 1표에 100%는 유머가 아니라 버그로 읽힌다(lib/tiers.ts)
   *  2) 내가 투표했는가 — 먼저 보면 투표할 이유가 사라지고 다수 쪽으로 표가 쏠린다
   *
   *  수치가 검색 스니펫에서 사라지는 건 아니다. title·description·OG가 담당한다
   *  (lib/seo.ts). 페이지 본문의 두께는 댓글이 채우고, 그래도 얇으면 noindex가 걸린다. */
  const hasResult = showsResult(stage) && voted;
  const notice = resultNotice(tally, voted);
  const pctA = total > 0 ? (tally.a / total) * 100 : 50;
  const pctB = 100 - pctA;
  const lead: Choice = pctA >= pctB ? 'a' : 'b';
  const myPct = choice === 'a' ? pctA : pctB;

  /* 내 기록 — 다수파였던 적 */
  useEffect(() => {
    if (!choice || !showsResult(stage) || counted.current) return;
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
  }, [choice, lead, question.id, stage]);

  /* 🔴 캡처가 곧 광고다(브리프 원칙 4). 문구에 도메인이 반드시 들어간다.
   *
   *  결과 수치는 **임계치를 넘겼을 때만** 넣는다 — "1명 중 100%"를 퍼뜨리면 죽은 사이트로 보인다.
   *  마지막에 "당신은 어느 쪽?"을 붙인다(§2-2): 수치만 있으면 아직 투표 안 한 사람이
   *  링크를 누를 이유가 없다.
   *
   *  모바일에서는 네이티브 공유 시트를 연다 — 한국에서 공유의 대부분이 카톡인데
   *  텍스트를 복사해 붙이는 건 마찰이 크다. 미지원 브라우저는 클립보드로 떨어진다. */
  const share = useCallback(async () => {
    const pct = (p: number) => `${p.toFixed(0)}%`;
    const lines = [question.q];
    if (showsResult(stage)) {
      lines.push(`${question.a} ${pct(pctA)} · ${question.b} ${pct(pctB)}`);
    }
    lines.push('당신은 어느 쪽?');

    const url = `${SITE.url}/q/${encodeURIComponent(question.slug)}`;
    const text = `${lines.join('\n')}\n${SITE.wordmark} ${url}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: question.q, text: lines.join('\n'), url });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* 사용자가 공유 시트를 닫아도 여기로 온다 — 실패로 표시하지 않는다 */
      setCopied(false);
    }
  }, [pctA, pctB, question, stage]);

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
    /* 전역 `ballot` 클래스는 `.stage:has(.ballot)`가 종이 폭을 넓히는 데 쓴다(globals.css).
       투표용지가 있는 페이지(홈·상세)만 넓어지고, 목록(`/q`·`/best`·`/c`)과
       법적 고지는 산문이라 720px로 남는다. */
    <section
      className={`ballot ${styles.ballot} ${standalone ? styles.standalone : ''} ${
        thud ? styles.thud : ''
      }`}
      id={question.slug}
    >
      <div className={styles.docline}>
        <span className={styles.docNo}>{docNo}</span>
        <span>{question.kind === 'serious' ? '안건' : '별건'}</span>
      </div>

      <Heading className={styles.question}>{question.q}</Heading>

      {!voted && <p className={styles.hint}>도장을 찍어 주세요</p>}

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
              {/* 🔴 빈 칸이 "표가 깨진 것처럼" 보이던 문제(2차 §4).
                  점선 원으로 도장 자리를 표시한다. 도장이 찍히면 감춘다. */}
              <span
                className={`${styles.slot} ${choice === key ? styles.slotHidden : ''}`}
                aria-hidden="true"
              >
                <span>오</span>
              </span>
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

      {/* 🔴 참여자 수는 **임계치와 무관하게 항상** 보여준다(2차 §5).
          감출 것은 퍼센트지 참여 규모가 아니다. 0표면 아무것도 안 그린다. */}
      <p className={styles.stats}>
        {total > 0 && (
          <span>
            <b>{total.toLocaleString('ko-KR')}명</b> 참여
          </span>
        )}
        {total > 0 && <span className={styles.statDot}>·</span>}
        {/* 🔴 0개일 때도 자리를 비우지 않는다(3차 §3) — "남기기"로 작성을 유도한다.
            댓글은 체류시간이자 SEO 본문이고, 상세 유입이 곧 사이트 성장이다.
            상세의 댓글 섹션으로 앵커 이동한다. */}
        <a
          className={styles.statLink}
          href={`/q/${encodeURIComponent(question.slug)}#왜-그런지`}
        >
          {commentCount > 0 ? (
            <>
              왜 그런지 <b>{commentCount}</b>
            </>
          ) : (
            <>왜 그런지 남기기</>
          )}
        </a>
      </p>

      {hasResult ? (
        <div className={styles.tally}>
          {bar('a', question.a, pctA)}
          {bar('b', question.b, pctB)}

          {/* 수치를 문장으로도 쓴다 — 스니펫에 걸리는 형태(브리프 §6) */}
          <p className={styles.turnout}>
            응답자 {total.toLocaleString('ko-KR')}명 중{' '}
            <strong>{Math.round(lead === 'a' ? pctA : pctB)}%</strong>가 &ldquo;
            {lead === 'a' ? question.a : question.b}&rdquo;를 골랐습니다.
          </p>

          {/* 판정은 50표부터 — 20표에서 "이상한 사람"이라고 하면 근거가 없다 */}
          {showsVerdict(stage) ? (
            <p className={styles.verdict}>
              {choice === lead
                ? `무난하네요. 재미없어요. (${Math.round(myPct)}%)`
                : `축하합니다. 당신은 이상한 사람입니다. (${Math.round(myPct)}%)`}
            </p>
          ) : (
            <p className={styles.turnout}>
              판정은 {50}표부터 내립니다. 아직 개표가 덜 됐습니다.
            </p>
          )}
        </div>
      ) : (
        notice && <p className={styles.turnout}>{notice}</p>
      )}

      <div className={styles.acts}>
        <button type="button" className={`${styles.btn} ${styles.btnSeal}`} onClick={share}>
          {copied ? '복사했습니다' : '공유'}
        </button>

        {/* 🔴 상세 페이지에서 "이 질문만 보기"는 자기 자신을 가리킨다.
            검색 유입은 대부분 상세로 착지하므로 여기서 다음으로 이어져야 1PV로 끝나지 않는다.
            아래 피드가 같은 화면에 있으니 앵커로 보낸다 — 페이지를 다시 받을 이유가 없다. */}
        {standalone ? (
          nextSlug && (
            <a className={styles.btn} href={`#${nextSlug}`}>
              다음 질문 →
            </a>
          )
        ) : (
          <a className={styles.btn} href={`/q/${encodeURIComponent(question.slug)}`}>
            이 질문만 보기 →
          </a>
        )}
      </div>
    </section>
  );
}
