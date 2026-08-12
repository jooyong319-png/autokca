'use client';

import { useCallback, useEffect, useState } from 'react';
import { SITE } from '@/lib/site';
import styles from './certificate.module.css';

export interface QuestionMeta {
  id: string;
  topic: string;
}

export interface TopicMeta {
  slug: string;
  name: string;
}

interface Props {
  /** 공개된 안건의 id·주제. 서버가 넘긴다 — 브라우저는 내 기록만 안다. */
  questions: QuestionMeta[];
  topics: TopicMeta[];
}

/** 내 기표 기록 — 이름을 Record로 두면 TS 내장 유틸리티 타입을 가린다 */
interface VoteRecord {
  n: number;
  major: number;
}

function readVoted(): Set<string> {
  try {
    const raw = localStorage.getItem('ottoke:voted');
    if (!raw) return new Set();
    const map = JSON.parse(raw) as Record<string, unknown>;
    return new Set(Object.keys(map).filter(k => !k.endsWith(':counted')));
  } catch {
    return new Set();
  }
}

function readRecord(): VoteRecord {
  try {
    const raw = localStorage.getItem('ottoke:record');
    if (!raw) return { n: 0, major: 0 };
    const r = JSON.parse(raw) as Partial<VoteRecord>;
    return {
      n: typeof r.n === 'number' ? r.n : 0,
      major: typeof r.major === 'number' ? r.major : 0,
    };
  } catch {
    return { n: 0, major: 0 };
  }
}

/* 도장 — 파비콘과 같은 도형. 「오」를 글자로 넣지 않는 이유는 폰트 의존을 없애기 위해서다. */
function Stamp() {
  return (
    <svg className={styles.stamp} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="28" fill="none" stroke="var(--seal)" strokeWidth="4" />
      <circle cx="32" cy="21.5" r="7.5" fill="none" stroke="var(--seal)" strokeWidth="3.6" />
      <line x1="32" y1="32" x2="32" y2="41" stroke="var(--seal)" strokeWidth="3.6" />
      <line x1="20" y1="43" x2="44" y2="43" stroke="var(--seal)" strokeWidth="3.6" />
    </svg>
  );
}

export function Certificate({ questions, topics }: Props) {
  const [voted, setVoted] = useState<Set<string> | null>(null);
  const [record, setRecord] = useState<VoteRecord>({ n: 0, major: 0 });
  const [copied, setCopied] = useState(false);

  /* 기록은 전부 브라우저에만 있다 — 서버는 누가 무엇을 골랐는지 모른다 */
  useEffect(() => {
    setVoted(readVoted());
    setRecord(readRecord());
  }, []);

  const total = voted?.size ?? 0;
  const majorPct = record.n > 0 ? Math.round((record.major / record.n) * 100) : null;

  const byTopic = topics
    .map(t => {
      const ids = questions.filter(q => q.topic === t.slug);
      const done = ids.filter(q => voted?.has(q.id)).length;
      return { ...t, done, all: ids.length };
    })
    .filter(t => t.all > 0)
    .sort((a, b) => b.done - a.done);

  const share = useCallback(async () => {
    const lines = [
      '내 성향 확인서',
      `투표 ${total}개`,
      majorPct === null ? '다수파 비율 산정 불가' : `다수파였던 적 ${majorPct}%`,
      `${SITE.wordmark} ${SITE.url}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [majorPct, total]);

  /* 서버 렌더에서는 기록을 모른다 — 껍데기만 두고 값은 마운트 뒤에 채운다 */
  if (voted === null) {
    return (
      <article className={styles.cert}>
        <div className={styles.docline}>
          <span>제OO호</span>
          <span>발급 대기</span>
        </div>
        <h1 className={styles.title}>투표성향확인서</h1>
      </article>
    );
  }

  return (
    <article className={styles.cert}>
      <div className={styles.docline}>
        <span>제{String(total).padStart(3, '0')}호</span>
        <span>투표 {total}건 기준</span>
      </div>

      <h1 className={styles.title}>투표성향확인서</h1>

      {total === 0 ? (
        <div className={styles.empty}>
          <p>
            아직 투표한 질문이 없습니다.
            <br />
            확인서는 투표 기록이 있어야 발급됩니다.
          </p>
          <a className={`${styles.btn} ${styles.btnSeal}`} href="/">
            투표 시작하기 →
          </a>
        </div>
      ) : (
        <>
          <table className={styles.table}>
            <tbody>
              <tr>
                <th>투표한 질문</th>
                <td>
                  <span className={`${styles.figure} ${styles.big}`}>{total}</span>
                  <span className={styles.figure}> / {questions.length}개</span>
                </td>
              </tr>
              <tr>
                <th>다수파였던 적</th>
                <td>
                  {majorPct === null ? (
                    <span className={styles.figure}>집계 전이라 산정할 수 없습니다</span>
                  ) : (
                    <>
                      <span className={`${styles.figure} ${styles.big}`}>{majorPct}%</span>
                      <span className={styles.figure}> ({record.major}/{record.n})</span>
                    </>
                  )}
                </td>
              </tr>
              <tr>
                <th>성향</th>
                <td>
                  {majorPct === null
                    ? '판정 보류'
                    : majorPct >= 70
                      ? '대세를 따르는 편'
                      : majorPct >= 45
                        ? '반반'
                        : '소수파에 자주 속하는 편'}
                </td>
              </tr>
            </tbody>
          </table>

          <div className={styles.breakdown}>
            {byTopic.map(t => (
              <div key={t.slug} className={styles.row}>
                <span className={styles.rowName}>{t.name}</span>
                <span className={styles.rowTrack}>
                  <span
                    className={styles.rowFill}
                    style={{ width: `${((t.done / t.all) * 100).toFixed(0)}%` }}
                  />
                </span>
                <span className={styles.rowNum}>
                  {t.done}/{t.all}
                </span>
              </div>
            ))}
          </div>

          <p className={styles.statement}>
            위 사람은 위와 같이 투표하였으며,
            <br />
            그것이 <strong>만사 오케</strong>임을 확인합니다.
          </p>

          <div className={styles.issuer}>
            <span className={styles.issuerName}>오또케</span>
            <Stamp />
          </div>

          <div className={styles.acts}>
            <button type="button" className={`${styles.btn} ${styles.btnSeal}`} onClick={share}>
              {copied ? '복사했습니다' : '확인서 복사'}
            </button>
            <a className={styles.btn} href="/">
              계속 투표하기 →
            </a>
          </div>
        </>
      )}

      <p className={styles.note}>
        ※ 이 확인서는 이 브라우저에 저장된 기록만으로 만들어집니다. 서버는 누가 무엇을
        골랐는지 알지 못하며, 브라우저 데이터를 지우면 기록도 함께 사라집니다.
        <br />※ 아무런 법적 효력이 없습니다.
      </p>
    </article>
  );
}
