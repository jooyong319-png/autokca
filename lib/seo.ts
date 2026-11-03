/** 검색·공유용 문구 생성.
 *
 *  브리프 §6 — 이 사이트는 **질문 문장 자체가 검색 쿼리**라서 SEO 궁합이 좋다.
 *  "화장실 갈 때 휴대폰 가져가나요"는 사람들이 실제로 치는 말이다.
 *  그래서 제목의 앞부분은 질문 원문을 그대로 두고, 뒤에 결과를 붙인다.
 *
 *  ⚠️ 한국어 활용은 하지 않는다. 선택지를 인용부호에 그대로 넣는다 —
 *  "들고 간다"를 "들고 갑니다"로 바꾸려면 활용 규칙이 필요하고, 그건 반드시 어딘가 틀린다.
 */

import { takeOf } from './ai';
import type { Question } from './questions';
import { showsResult, stageOf, totalOf } from './tiers';
import type { Tally } from './votes';

export interface Outcome {
  label: string;
  percent: number;
  total: number;
}

/** 🔴 여기 한 곳에 임계치를 물려 두면 제목·설명·OG 카드·구조화 데이터가 같이 움직인다.
 *  표가 적으면 **null을 돌려준다** — 각 호출부가 "결과 없음" 분기를 이미 갖고 있다.
 *  1표에 100%를 내보내던 사고가 여기서 막힌다. */
export function outcome(question: Question, tally: Tally): Outcome | null {
  if (!showsResult(stageOf(tally))) return null;
  const total = totalOf(tally);
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

/** 스니펫에 걸리는 형태로 쓴다 — "응답자 N명 중 P%가 …"
 *
 *  화면은 투표 전에 결과를 감추지만(개선문서 §1-3) **메타는 감추지 않는다.**
 *  검색결과에 뜨는 숫자가 클릭 이유가 되고, 그건 밴드왜건과 무관하다.
 *  단 임계치 미만이면 outcome()이 null이라 여기서도 숫자가 안 나간다. */
export function pageDescription(question: Question, tally: Tally): string {
  const o = outcome(question, tally);
  const ai = takeOf(question);
  /* 🔴 AI의 **선택**은 여기서도 밝히지 않는다(투표 전 비공개, 브리프 §0). 예측 수치만 쓴다.
     기권한 안건에 "찍었다"고 쓰면 거짓이므로 문구를 나눈다. */
  if (!o) {
    const hook = ai?.pick ? 'AI는 벌써 찍었어요. ' : ai ? 'AI는 예측만 해 뒀어요. ' : '';
    return `${question.q} ${hook}당신은 어느 쪽인가요? 투표하고 확인해 보세요.`;
  }
  return (
    `응답자 ${o.total.toLocaleString('ko-KR')}명 중 ${o.percent}%가 "${o.label}"를 골랐습니다. `
    + (ai ? `AI 예측은 "${question.a}" ${ai.guess}%. ` : '')
    + `${question.q} 당신은 어느 쪽인가요?`
  );
}
