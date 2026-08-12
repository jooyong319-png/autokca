/** 표본 임계치 — 표가 적을 때 무엇을 감출지 정하는 **단일 소스**.
 *
 *  🔴 왜 필요한가: 1표에 "100%가 적다"를 띄우면 유머가 아니라 **버그로 읽힌다.**
 *  그게 메타 설명에까지 들어가 카카오톡 미리보기에 "응답자 1명 중 100%"가 나가면
 *  링크를 받은 사람은 죽은 사이트라고 판단한다. 실제로 그 상태로 배포됐었다.
 *
 *  이 파일 하나만 고치면 화면·제목·설명·OG·구조화 데이터가 같이 움직인다.
 *  숫자를 여기저기 흩어 놓으면 반드시 한 곳이 어긋난다.
 *
 *  0표가 "부끄러운 상태"가 아니라 **"개표 전"이라는 정상 상태**가 되게 하는 것이 핵심이다.
 */

import type { Tally } from './votes';

export const TIER = {
  /** 이 표 수 미만이면 퍼센트·막대를 감춘다. 표 몇 개로 낸 비율은 비율이 아니다. */
  RESULT: 20,
  /** 이 표 수 미만이면 판정 카피("이상한 사람입니다")를 감춘다.
   *  20표에서 소수파 판정을 내리는 건 근거가 약하다. */
  VERDICT: 50,
  /** 이 표 수 미만이면 색인하지 않는다(thin content). */
  INDEX: 20,
} as const;

export type Stage =
  /** 집계 서버가 안 붙었다 */
  | 'offline'
  /** 0표 */
  | 'empty'
  /** 1~19표 — 개표 중 */
  | 'counting'
  /** 20~49표 — 비율은 공개, 판정은 보류 */
  | 'partial'
  /** 50표 이상 — 전부 공개 */
  | 'full';

export function totalOf(tally: Tally): number {
  return tally.a + tally.b;
}

export function stageOf(tally: Tally): Stage {
  if (!tally.live) return 'offline';
  const total = totalOf(tally);
  if (total === 0) return 'empty';
  if (total < TIER.RESULT) return 'counting';
  if (total < TIER.VERDICT) return 'partial';
  return 'full';
}

/** 퍼센트·막대를 내보낼 단계인가 */
export function showsResult(stage: Stage): boolean {
  return stage === 'partial' || stage === 'full';
}

/** 판정 카피를 내보낼 단계인가 */
export function showsVerdict(stage: Stage): boolean {
  return stage === 'full';
}

/** 색인해도 될 만큼 쌓였는가(브리프 §6 thin content).
 *
 *  🔴 **또는**가 아니라 **그리고**가 되면 안 된다 — 표만 있고 댓글이 없는 페이지는
 *  수치 두 줄뿐이라 여전히 빈 페이지다. 본문을 채우는 건 댓글이다. */
export function indexable(tally: Tally, commentCount: number): boolean {
  return tally.live && totalOf(tally) >= TIER.INDEX && commentCount > 0;
}

/** 결과 자리에 들어갈 한 줄. 단계와 "내가 투표했는가"에 따라 갈린다.
 *
 *  퍼센트를 보여줄 단계여도 **투표하기 전에는 감춘다**(개선문서 §1-3):
 *  결과를 먼저 보면 투표할 이유가 사라지고, 밴드왜건으로 다수 쪽에 표가 쏠린다.
 *  대신 참여자 수는 알려 준다 — 그게 투표할 이유가 된다.
 */
export function resultNotice(tally: Tally, voted: boolean): string | null {
  const stage = stageOf(tally);
  const total = totalOf(tally);

  switch (stage) {
    case 'offline':
      return '집계 서버가 연결되지 않아 결과를 표시하지 않습니다.';
    case 'empty':
      return '아직 아무도 안 눌렀습니다. 첫 표를 던져 보세요.';
    case 'counting':
      return `개표 중입니다. 아직 ${total}표라 발표할 수 없습니다.`;
    default:
      if (!voted) {
        return `지금까지 ${total.toLocaleString('ko-KR')}명이 투표했습니다. 도장을 찍으면 결과가 보입니다.`;
      }
      return null; // 막대와 개표 문장이 대신 들어간다
  }
}
