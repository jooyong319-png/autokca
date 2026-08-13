'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { topicBySlug, type Question } from '@/lib/questions';
import type { TopPair } from '@/lib/comments';
import { CardSay } from './CardSay';
import type { Tally } from '@/lib/votes';
import { SITE } from '@/lib/site';
import { TIER, resultNotice, showsResult, showsVerdict, stageOf, totalOf } from '@/lib/tiers';
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
  /** 양 진영 1위 댓글 — 카드에 한 줄씩 미리보기(6차 §2-1).
   *
   *  🔴 **서버에서 받아 넘긴다.** 클라이언트가 나중에 채우면 카드 높이가 바뀌고
   *  그게 scroll-snap 위치를 무너뜨린다. */
  tops?: TopPair;
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
  tops,
}: Props) {
  const [tally, setTally] = useState<Tally>(initial);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [thud, setThud] = useState(false);
  const [copied, setCopied] = useState(false);
  /** 서버가 기표를 거절한 이유. 잠긴 상태에서 다른 쪽을 누르면 채워진다. */
  const [denied, setDenied] = useState<string | null>(null);
  /** 이 카드에서 방금 사유를 올렸는지. 서버 값(`server.wrote`)과 OR로 합친다 —
   *  올린 직후 다시 물어보지 않고도 기표가 잠겨야 한다. */
  const [justWrote, setJustWrote] = useState(false);
  const busy = useRef(false);

  /* 🔴 투표 여부의 진실은 **서버 쿠키**에 있다. localStorage는 첫 화면을 빠르게 그리는
     힌트로만 쓰고, 서버 응답이 오면 그 값으로 덮는다. 둘이 어긋나면 사용자가
     "투표한 것처럼 보이는데 댓글도 못 쓰고 다시 투표도 못 하는" 상태에 갇힌다. */
  const { state: server } = useVoteState(question.id, true);
  /* 🔴 사유를 제출하면 기표가 잠긴다. 진영이 기표 쿠키에서 나오므로 번복하면
     내가 쓴 의견이 "반대편" 칼럼에 남는다(`/api/vote` 주석).
     서버 응답이 오기 전에는 **잠기지 않은 것으로 본다** — 낙관해도 서버가 409로
     되돌리고 이유를 알려주므로 사용자가 갇히지 않는다. 반대로 비관하면
     아직 사유를 안 쓴 사람도 잠긴 화면을 잠깐 보게 된다. */
  const locked = justWrote || (server?.wrote ?? false);

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
      if (busy.current) return;
      /* 같은 쪽을 다시 누른 것 — 아무 일도 하지 않는다.
         취소가 없으므로 "다시 눌러 해제"가 되면 안 된다. */
      if (choice === ch) return;
      /* 사유를 제출한 뒤에는 잠긴다 — 진영이 기표 쿠키에서 나오므로 여기서 바꾸면
         내가 쓴 의견이 "반대편" 칼럼에 남는다(`/api/vote` 주석 참고). */
      if (choice !== null && locked) return;
      busy.current = true;
      setDenied(null);

      /* 실패했을 때 되돌릴 값 — 번복은 두 칸이 동시에 움직이므로 낙관적 갱신을
         되돌리지 않으면 합계가 화면에서만 틀어진다. */
      const prevChoice = choice;
      const prevTally = tally;

      setChoice(ch);
      setThud(true);
      setTimeout(() => setThud(false), 340);

      /* 도장이 찍히는 촉감(6차 §2-4). 10ms — 알림이 아니라 "눌렸다"는 확인이다.
         🔴 사파리·데스크톱에는 없는 API라 있는지 확인하고 부른다.
         일부 브라우저는 사용자 제스처 없이 부르면 콘솔 경고를 내므로 클릭 핸들러 안에서만 쓴다. */
      try {
        navigator.vibrate?.(10);
      } catch {
        /* 진동이 막혀 있어도 투표는 되어야 한다 */
      }
      /* 번복이면 **옮긴다**(한 쪽 -1, 다른 쪽 +1). 신규면 더하기만.
         합계가 늘어나면 안 된다 — 번복은 표를 만드는 것이 아니다. */
      setTally(t => {
        const next = { ...t };
        if (prevChoice) next[prevChoice] = Math.max(0, next[prevChoice] - 1);
        next[ch] = next[ch] + 1;
        return next as Tally;
      });

      try {
        const res = await fetch('/api/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: question.id, choice: ch }),
        });
        const next = (await res.json().catch(() => null)) as
          | (Tally & { myVote: Choice | null; error?: string; note?: string })
          | null;

        if (res.ok && next) {
          /* 번복 직후 카피(7차 §2-6). 서버가 남은 횟수까지 넣어 준다 —
             몇 번 남았는지는 서버 쿠키만 알고 있으므로 화면이 셀 수 없다. */
          if (next.note) setDenied(next.note);
          if (next.myVote) setChoice(next.myVote);
          if (next.live) setTally({ a: next.a, b: next.b, live: true });
          const voted = readJSON<Record<string, Choice>>(VOTED_KEY, {});
          voted[question.id] = next.myVote ?? ch;
          writeJSON(VOTED_KEY, voted);
        } else if (next) {
          /* 서버가 거절했다(사유 제출 후 번복, 집계 서버 다운 등).
             **서버 상태가 진실이므로** 그 값으로 맞추고 이유를 보여준다. */
          setChoice(next.myVote);
          setTally(next.live ? { a: next.a, b: next.b, live: true } : prevTally);
          setDenied(next.error ?? '기표를 반영하지 못했습니다.');
          const voted = readJSON<Record<string, Choice>>(VOTED_KEY, {});
          if (next.myVote) {
            voted[question.id] = next.myVote;
          } else {
            /* 반영되지 않았으므로 힌트도 지운다 — 남겨 두면 다음 마운트에서
               "기표한 것처럼 보이는데 다시 기표도 못 하는" 상태가 된다. */
            delete voted[question.id];
            delete voted[`${question.id}:counted`];
          }
          writeJSON(VOTED_KEY, voted);
        } else {
          setChoice(prevChoice);
          setTally(prevTally);
        }
      } catch {
        /* 🔴 네트워크 오류는 **성공했는지 알 수 없다.** 화면을 그대로 두고
           다음 마운트의 GET이 쿠키 기준으로 고치게 맡긴다. 여기서 되돌리면
           실제로는 반영된 표를 화면에서만 지우게 된다. */
      } finally {
        busy.current = false;
      }
    },
    [choice, locked, tally, question.id],
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

  /* 내 기록 — 다수파였던 적.
   *
   *  🔴 번복을 지원하므로 **마운트 단위 ref로 막을 수 없다.** 어느 선택으로 반영했는지를
   *  localStorage(`<id>:counted`)에 남기고 그것과 다를 때만 손댄다.
   *  번복이면 **총 횟수(n)는 그대로 두고 다수파 여부만 고친다** — 한 사람이 한 번 참여한
   *  것이지 두 번이 아니다. 여기서 n을 또 늘리면 /me의 확인서가 부풀려진다. */
  useEffect(() => {
    if (!choice || !showsResult(stage)) return;
    const voted = readJSON<Record<string, Choice>>(VOTED_KEY, {});
    const mark = `${question.id}:counted`;
    const prev = voted[mark];
    if (prev === choice) return;

    const rec = readJSON<{ n: number; major: number }>(RECORD_KEY, { n: 0, major: 0 });
    if (!prev) {
      rec.n += 1;
      if (choice === lead) rec.major += 1;
    } else {
      const wasMajor = prev === lead;
      const nowMajor = choice === lead;
      if (!wasMajor && nowMajor) rec.major += 1;
      if (wasMajor && !nowMajor) rec.major = Math.max(0, rec.major - 1);
    }
    writeJSON(RECORD_KEY, rec);
    voted[mark] = choice;
    writeJSON(VOTED_KEY, voted);
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
  const topic = topicBySlug(question.topic);

  /* 🔴 상황별 유도 문구(7차 §3-4). **소수파일 때가 가장 잘 작동한다** —
     사람은 자기가 소수일 때 설명하고 싶어진다.
     팽팽한 구간(45~55%)을 먼저 보는 이유: 소수파여도 반반이면 "소수 의견"이 아니다. */
  const sayPlaceholder = (() => {
    if (!choice) return '왜 그런지 한 줄로';
    if (Math.abs(myPct - 50) <= 5) return '지금 딱 반반입니다. 한 표의 근거를.';
    if (myPct < 50) return '소수 의견이십니다. 사유를 밝혀 주십시오.';
    return '다들 그렇다는데, 이유는요?';
  })();

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
        {/* 🔴 태그 필드를 새로 만들지 않았다 — `topic`이 이미 있고 주제 허브(`/c/[topic]`)까지
            돌아간다(6차 §2-2는 "추가하면 됩니다"라고 했지만 이미 있었다).
            분류에서 주제 허브로 보내면 카드가 크롤 경로도 된다. */}
        <span className={styles.doclineRight}>
          {topic && (
            <a className={styles.topicTag} href={`/c/${topic.slug}`}>
              {topic.name}
            </a>
          )}
          <span>{question.kind === 'serious' ? '안건' : '별건'}</span>
        </span>
      </div>

      <Heading className={styles.question}>{question.q}</Heading>

      {/* 🔴 자리를 항상 차지한다 — 상태에 따라 나타났다 사라지면 카드 높이가 바뀌고
          scroll-snap 위치가 흔들린다. 문구만 갈아 끼운다. */}
      <p className={`${styles.hint} ${denied ? styles.hintDenied : ''}`}>
        {denied
          ? denied
          : !voted
            ? '도장을 찍어 주세요'
            : locked
              ? '사유를 제출하셨으므로 기표를 번복할 수 없습니다'
              : '다른 쪽을 눌러 번복할 수 있습니다. 취소는 되지 않습니다'}
      </p>

      <div className={styles.choices}>
        {(['a', 'b'] as const).map(key => (
          <button
            key={key}
            type="button"
            className={styles.choice}
            onClick={() => vote(key)}
            /* 🔴 기표 후에도 **잠기지 않았으면 눌릴 수 있어야 한다**(번복).
               잠긴 뒤에만 비활성으로 둔다. 같은 쪽을 다시 누르면 `vote`가 무시한다 —
               취소가 없으므로 "다시 눌러 해제"가 되어선 안 된다. */
            disabled={voted && locked}
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

          {/* 🔴 숫자를 하드코딩하지 않는다. 여기 `50`이 박혀 있어서 임계치를 내렸을 때
              화면 문구만 옛 값으로 남을 수 있었다 — 임계치는 `lib/tiers.ts` 단일 소스다. */}
          {showsVerdict(stage) ? (
            <p className={styles.verdict}>
              {choice === lead
                ? `무난하네요. 재미없어요. (${Math.round(myPct)}%)`
                : `축하합니다. 당신은 이상한 사람입니다. (${Math.round(myPct)}%)`}
            </p>
          ) : (
            <p className={styles.turnout}>
              판정은 {TIER.VERDICT}표부터 내립니다. 아직 개표가 덜 됐습니다.
            </p>
          )}
        </div>
      ) : (
        notice && <p className={styles.turnout}>{notice}</p>
      )}

      {/* 🔴 진영 분리가 최대 차별점인데(브리프 §4) 지금은 상세에 들어가야만 보인다.
          카드에 한 줄씩 올려 **피드에서 바로 드러나게** 한다(6차 §2-1).

          댓글이 없어도 **자리를 비우지 않는다** — 카드마다 높이가 들쭉날쭉해지고,
          scroll-snap에서는 그게 스냅 위치를 흔든다. 대신 빈 상태 문구로 작성을 유도한다.

          ⚠️ 투표 전에는 진영 이름을 밝히지 않는다. 어느 쪽 의견이 우세한지 먼저 보이면
          밴드왜건이 생긴다 — 막대를 투표 후에만 보여주는 것과 같은 이유다. */}
      <div className={styles.voices}>
        {(['a', 'b'] as const).map(key => {
          const top = tops?.[key];
          return (
            <a
              key={key}
              className={`${styles.voice} ${choice === key ? styles.voiceMine : ''}`}
              href={`/q/${encodeURIComponent(question.slug)}#왜-그런지`}
            >
              <span className={styles.voiceSide}>
                {voted ? question[key] : key === 'a' ? '한쪽' : '다른쪽'}
              </span>
              {top ? (
                <>
                  <span className={styles.voiceBody}>{top.body}</span>
                  <span className={styles.voiceLikes}>오케 {top.likes}</span>
                </>
              ) : (
                <span className={styles.voiceEmpty}>
                  아직 이유를 밝힌 사람이 없습니다
                </span>
              )}
            </a>
          );
        })}
      </div>

      {/* 🔴 투표 직후 카드 안에서 바로 한 줄(7차 §3).
       *  결과가 나온 뒤에만 띄운다 — 결과가 투표의 보상이고, 개표 중인 상태에서
       *  입력창을 띄우면 **무엇에 반응해서 쓰라는 것인지** 알 수 없다(§1).
       *  이미 썼으면 감춘다(1안건 1의견). */}
      {/* ⚠️ 상세 페이지의 **주** 카드에서는 렌더하지 않는다 — 그 페이지에는 아래에
          진짜 댓글 섹션(`Comments`)의 입력 폼이 이미 있어서 같은 화면에 입력창이 둘이 된다.
          이어지는 피드의 카드들은 각자 다른 안건이므로 그대로 보여준다. */}
      {!standalone && hasResult && choice && !locked && (
        <CardSay
          questionId={question.id}
          slug={question.slug}
          sideLabel={question[choice]}
          placeholder={sayPlaceholder}
          onWrote={() => setJustWrote(true)}
        />
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
