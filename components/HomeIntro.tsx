'use client';

import { MATCH_GOAL, matchVerdict } from '@/lib/aiMatch';
import { StampBoard } from './StampBoard';
import { useMatch } from './useMatch';
import styles from './HomeIntro.module.css';

/* 홈 첫 화면의 안내문 — "들어와서 이걸 왜 해야 하는지 모르겠다"(사용자, 2026-11-04)에 대한 답.
 *
 * 전에는 홈이 설명 없이 첫 카드부터 시작했다. 투표 사이트는 흔해서 질문 한 줄로는
 * 이유가 안 생긴다. 여기서 세 가지만 말한다: AI가 먼저 찍었다 → 10개 찍어라 → 판정이 나온다.
 *
 * 🔴 짧게 둔다. 이 아래가 첫 카드고, 375×667에서 기표칸 윗부분이 보여야 바로 누른다.
 * 🔴 다시 온 사람에게는 같은 자리가 **진행 상황**이 된다(도장판이 채워져 있다).
 *    h1은 이 사이트가 무엇인지 말하는 문장이라 홈의 h1으로도 맞다(카드 질문은 h2).
 */
export function HomeIntro() {
  const match = useMatch();
  const left = MATCH_GOAL - match.n;
  const pct = match.n > 0 ? Math.round((match.same / match.n) * 100) : 0;

  return (
    <section className={styles.intro}>
      <h1 className={styles.title}>AI가 먼저 찍어 놨어요</h1>
      <p className={styles.lead}>
        질문마다 AI가 답을 고르고, 사람들이 어떻게 갈릴지도 예측해 뒀어요.
        님이 {MATCH_GOAL}개 찍으면 AI랑 얼마나 같은 사람인지 판정해 드려요.
      </p>
      <div className={styles.row}>
        <StampBoard match={match} />
        <p className={styles.status} aria-live="polite">
          {left > 0 ? (
            match.n === 0 ? (
              '아래 질문부터 찍어 보세요'
            ) : (
              <>
                판정까지 <b>{left}개</b>
              </>
            )
          ) : (
            <>
              <b>AI랑 {pct}% 같음.</b> {matchVerdict(pct)}{' '}
              <a href="/me">확인서 보기</a>
            </>
          )}
        </p>
      </div>
      <p className={styles.legend}>검은 도장은 AI랑 같은 편, 빨간 도장은 반대편이에요.</p>
    </section>
  );
}
