import type { Question } from './questions';
import { outcome } from './seo';
import { SITE } from './site';
import type { Tally } from './votes';

/* 공유 카드(브리프 §7·원칙 4).
 *
 * 커뮤니티에 링크를 던졌을 때 미리보기가 예쁘냐가 클릭률을 몇 배 가른다.
 * 그리고 사람들은 링크가 아니라 **스크린샷**을 퍼간다 — 그래서
 * 🔴 **브랜드와 도메인 워터마크가 카드 안에 반드시 들어간다.** 그게 무료 광고다.
 *
 * 도메인은 하드코딩하지 않는다(브리프 §10) — SITE.url에서 뽑는다.
 */

export const SEAL = '#c4302b';
export const INK = '#161514';
export const PAPER = '#fcfbf8';
export const ROOM = '#e9e5dc';

export function domainLabel(): string {
  return SITE.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

/** 투표 도장 — 도형만 쓰므로 폰트와 무관하게 언제나 그려진다 */
export function Seal({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="28" fill="none" stroke={SEAL} strokeWidth="4" />
      <circle cx="32" cy="21.5" r="7.5" fill="none" stroke={SEAL} strokeWidth="3.6" />
      <line x1="32" y1="32" x2="32" y2="41" stroke={SEAL} strokeWidth="3.6" />
      <line x1="20" y1="43" x2="44" y2="43" stroke={SEAL} strokeWidth="3.6" />
    </svg>
  );
}

/** 한글 폰트가 없을 때 — 한글을 한 글자도 넣지 않는다(두부 방지) */
export function LatinFallbackCard() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        padding: 56,
        background: ROOM,
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 28,
          background: PAPER,
          border: '1px solid #dcd6c9',
        }}
      >
        <Seal size={190} />
        <div
          style={{
            display: 'flex',
            fontSize: 76,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: INK,
          }}
        >
          OTTOKE
          <span style={{ color: SEAL }}>?!</span>
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: '#8a837a' }}>{domainLabel()}</div>
      </div>
    </div>
  );
}

/** 사이트 대표 카드 — 홈 전용.
 *
 *  🔴 홈 OG에 첫 질문을 그리면 홈이 그 질문 페이지처럼 보인다(개선문서 §4-1).
 *  브랜드 검색·브랜드 공유에서 사이트가 무엇인지 전달되지 않는다.
 *  질문별 카드는 `/q/[slug]`가 담당한다. */
export function SiteCard() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        padding: 56,
        background: ROOM,
        fontFamily: 'OGKorean',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 22,
          background: PAPER,
          border: '1px solid #dcd6c9',
        }}
      >
        <Seal size={150} />
        <div
          style={{
            display: 'flex',
            fontSize: 92,
            fontWeight: 700,
            letterSpacing: '-0.05em',
            color: INK,
          }}
        >
          오또케<span style={{ color: SEAL }}>?!</span>
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: SEAL,
          }}
        >
          이거 나만 그래?
        </div>
        <div style={{ display: 'flex', fontSize: 26, color: '#8a837a' }}>
          한 줄 질문에 투표하고 결과를 바로 확인 · {domainLabel()}
        </div>
      </div>
    </div>
  );
}

/** 질문 카드 — 질문 / 비율 / 참여자 수 / 워터마크 */
export function QuestionCard({
  question,
  tally,
  docNo,
}: {
  question: Question;
  tally: Tally;
  docNo: string;
}) {
  const o = outcome(question, tally);
  const total = tally.a + tally.b;
  const pctA = total > 0 ? Math.round((tally.a / total) * 100) : 50;
  const pctB = 100 - pctA;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        padding: 56,
        background: ROOM,
        fontFamily: 'OGKorean',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: PAPER,
          border: '1px solid #dcd6c9',
          padding: '44px 56px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            borderBottom: `4px solid ${INK}`,
            paddingBottom: 16,
            color: '#55504a',
            fontSize: 24,
          }}
        >
          <span>{docNo}</span>
          <span style={{ display: 'flex', fontWeight: 700, color: INK, fontSize: 32 }}>
            오또케<span style={{ color: SEAL }}>?!</span>
          </span>
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            fontSize: question.q.length > 26 ? 54 : 64,
            fontWeight: 700,
            color: INK,
            lineHeight: 1.32,
            letterSpacing: '-0.04em',
            /* 화면과 같은 한국어 줄바꿈 규칙(§1-1). 없으면 "축의금 5 / 만원"으로 끊긴다. */
            wordBreak: 'keep-all',
          }}
        >
          {question.q}
        </div>

        {/* 비율 막대 — 다수파만 인주색 */}
        {o ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(
              [
                ['a', question.a, pctA],
                ['b', question.b, pctB],
              ] as const
            ).map(([key, name, pct]) => {
              const isLead = pctA >= pctB ? key === 'a' : key === 'b';
              return (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 30,
                      fontWeight: 700,
                      color: isLead ? SEAL : '#55504a',
                    }}
                  >
                    <span>{name}</span>
                    <span>{pct}%</span>
                  </div>
                  <div style={{ display: 'flex', height: 16, background: '#f1eee6' }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: isLead ? SEAL : '#8a837a',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              border: `3px solid ${INK}`,
              fontSize: 30,
              fontWeight: 700,
              color: INK,
            }}
          >
            <span style={{ padding: '14px 24px' }}>{question.a}</span>
            <span style={{ padding: '14px 24px', borderLeft: `3px solid ${INK}` }}>
              {question.b}
            </span>
          </div>
        )}

        {/* 🔴 워터마크 — 캡처가 광고가 되게 하는 유일한 장치 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: 22,
            fontSize: 24,
            color: '#8a837a',
          }}
        >
          <span>
            {o ? `응답자 ${o.total.toLocaleString('ko-KR')}명` : '아직 응답 없음'} ·{' '}
            {domainLabel()}
          </span>
          <div style={{ display: 'flex', marginLeft: 'auto' }}>
            <Seal size={64} />
          </div>
        </div>
      </div>
    </div>
  );
}
