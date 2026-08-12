/** 검색·공유용 문구 생성.
 *
 *  브리프 §6 — 이 사이트는 **질문 문장 자체가 검색 쿼리**라서 SEO 궁합이 좋다.
 *  "화장실 갈 때 휴대폰 가져가나요"는 사람들이 실제로 치는 말이다.
 *  그래서 제목의 앞부분은 질문 원문을 그대로 두고, 뒤에 결과를 붙인다.
 *
 *  ⚠️ 한국어 활용은 하지 않는다. 선택지를 인용부호에 그대로 넣는다 —
 *  "들고 간다"를 "들고 갑니다"로 바꾸려면 활용 규칙이 필요하고, 그건 반드시 어딘가 틀린다.
 */

import type { Question } from './questions';
import type { Tally } from './votes';

export interface Outcome {
  label: string;
  percent: number;
  total: number;
}

export function outcome(question: Question, tally: Tally): Outcome | null {
  if (!tally.live) return null;
  const total = tally.a + tally.b;
  if (total === 0) return null;
  const aWins = tally.a >= tally.b;
  return {
    label: aWins ? question.a : question.b,
    percent: Math.round(((aWins ? tally.a : tally.b) / total) * 100),
    total,
  };
}

export function pageTitle(question: Question, tally: Tally): string {
  const o = outcome(question, tally);
  return o ? `${question.q} — ${o.percent}%가 "${o.label}"` : question.q;
}

/** 스니펫에 걸리는 형태로 쓴다 — "응답자 N명 중 P%가 …" */
export function pageDescription(question: Question, tally: Tally): string {
  const o = outcome(question, tally);
  if (!o) return `${question.q} 투표하고 다른 사람들 생각을 바로 확인하세요.`;
  return (
    `응답자 ${o.total.toLocaleString('ko-KR')}명 중 ${o.percent}%가 "${o.label}"를 골랐습니다. `
    + `${question.q}`
  );
}
