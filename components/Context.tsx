import type { AiTake } from '@/lib/ai';
import styles from './Context.module.css';

/* 🔴 **참여가 없어도 페이지가 완성되게 하는 조각**(2026-09-01).
 *
 *  웬스테이지(자매 프로젝트)는 한 달에 542명이 들어오는데 오또케는 21명이었다.
 *  같은 사람이 같은 시기에 만들었으니 마케팅 차이가 아니다. 구조가 달랐다:
 *
 *    · 웬스테이지 — 공연 정보를 **정리해 주는** 사이트. 방문자가 0명이어도 페이지가 완성돼 있다
 *    · 오또케     — 사람이 **채워주길 기다리는** 사이트. 0표면 질문 한 줄과 버튼 두 개뿐이다
 *
 *  그래서 유통 문제가 아니라 콘텐츠 구조 문제였다. 배경 문단이 그 격차를 메운다 —
 *  표가 하나도 없어도 읽을 것이 있고, 검색어와 맞물릴 문장이 생긴다.
 *
 *  ⚠️ 없으면 **아무것도 그리지 않는다.** 빈 제목만 남으면 미완성으로 보인다.
 */
/* AI의 답 — 상세 페이지 본문용(브리프 §0).
 *
 * 카드 안의 AI 칸(`AiBox`)은 투표 전에 선택을 가린다. 그러면 크롤러는 AI의 이유를 못 읽는다.
 * 그래서 여기서는 **접힌 채로** 본문에 넣는다 — HTML에는 있고, 사람은 펼쳐야 본다.
 * 펼치는 건 본인 선택이라 밴드왜건 규칙(투표 전엔 가린다)을 깨지 않는다.
 *
 * ⚠️ 기권(`pick: null`)이면 이유가 없으므로 예측만 쓴다. */
export function AiNote({ take, a, b }: { take?: AiTake | null; a: string; b: string }) {
  if (!take) return null;
  return (
    <section className={styles.box} aria-labelledby="ai-take">
      <h2 id="ai-take" className={styles.head}>AI의 답</h2>
      <details className={styles.fold}>
        <summary className={styles.summary}>펼치면 AI 답이 나와요. 투표 전이면 스포입니다</summary>
        <p className={styles.body}>
          {take.pick
            ? `AI의 선택은 "${take.pick === 'a' ? a : b}". ${take.why} `
            : '이건 AI도 안 찍었어요. 싸움 나요. '}
          &ldquo;{a}&rdquo;를 고를 사람은 {take.guess}%로 찍었어요
          ({take.at.split('-').join('.')} 작성, 이후 고치지 않음).
        </p>
      </details>
    </section>
  );
}

export function Context({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <section className={styles.box} aria-labelledby="why-split">
      {/* h2인 이유: 상세 페이지의 h1은 질문이고 이건 그 아래 절이다.
          "왜 갈리나"가 검색어와 겹치지는 않지만, 문서 구조가 맞아야 본문으로 읽힌다. */}
      <h2 id="why-split" className={styles.head}>왜 갈리나</h2>
      <p className={styles.body}>{text}</p>
    </section>
  );
}
