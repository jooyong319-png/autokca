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

/* 🔴 UX 게이트와 SEO 게이트는 **목적이 다르므로 값이 달라야 한다**(6차 §1-1).
 *
 *  · UX  — 사용자에게 결과를 언제 보여줄지. "민망하지 않을 최소선"만 넘기면 된다
 *  · SEO — 크롤러에게 페이지를 언제 열지. 얇은 페이지 색인을 막는 것이라 보수적이어도 된다
 *
 *  **사용자는 결과를 보는데 크롤러는 아직 못 보는 상태가 정상이다.**
 *  RESULT와 INDEX가 둘 다 20이라 사실상 한 게이트였고, 그래서 화면이 비면
 *  색인도 같이 막혀 둘을 따로 조절할 수 없었다.
 *
 *  2026-08-13 하향: RESULT 20 → 5, VERDICT 50 → 20.
 *  근거는 원래 목적이 "1표에 100%"를 막는 것이었는데(위 주석) 값이 과하게 높아
 *  **카드에 채울 내용을 통째로 가리는 부작용**이 났다는 것이다.
 *  실측: 상위 카드가 4표라 막대·판정이 전부 0개였고, 투표해도 "개표 중입니다"만 떴다.
 *  투표의 보상이 결과인데 그걸 안 주면 다음 카드로 넘어갈 이유도 사라진다.
 *  5표면 "1명 중 100%"류의 민망함은 피해진다.
 */
export const TIER = {
  /** 이 표 수 미만이면 퍼센트·막대를 감춘다. 표 몇 개로 낸 비율은 비율이 아니다. */
  RESULT: 5,
  /** 이 표 수 미만이면 판정 카피("이상한 사람입니다")를 감춘다.
   *  표현이 단정적이라 비율 공개보다 보수적으로 둔다. */
  VERDICT: 20,
  /** 이 표 수 미만이면 색인하지 않는다(thin content).
   *
   *  🔴 2026-08-18 하향: 20 → 5. 동시에 댓글 조건을 1 → 2로 올렸다.
   *
   *  전에는 "SEO는 보수적이어도 된다"(6차 §1-2)를 근거로 20을 유지했다.
   *  그 판단의 전제는 **표가 자연히 쌓인다**는 것이었는데, 콜드스타트에서 틀렸다:
   *
   *    색인 안 됨 → 검색 유입 없음 → 표 안 쌓임 → 색인 안 됨
   *
   *  실측(2026-08-18, 110개 안건 · 153표): 색인이 열린 페이지 **0개**.
   *  최다 득표가 9표라 문턱을 10으로 낮춰도 여전히 0개였다. 20은 보수적인 게 아니라
   *  **닫혀 있는 것**이었다. 구글 서치콘솔이 크롤한 9개 전부 'NOINDEX로 제외'로 잡혔고
   *  그 9개는 표 6~9 · 댓글 1~2로 빈 페이지가 아니었다.
   *
   *  🔴 대신 **무게를 표에서 댓글로 옮겼다.** 검색한 사람에게 값어치가 있는 것은
   *     득표수가 아니라 **남의 말**이다. 20표 + 댓글 1개보다 8표 + 댓글 2개가
   *     읽을 게 많은 페이지다. 얇은 페이지를 막는다는 목적은 그대로고,
   *     무엇으로 두께를 재는지를 바꾼 것이다. */
  INDEX: 5,
  /** 색인에 필요한 최소 댓글 수. **본문을 채우는 건 댓글이다.**
   *  1개면 "ㅋㅋ" 한 줄짜리도 통과한다 — 두 명 이상이 말을 얹은 것을 최소선으로 본다. */
  INDEX_COMMENTS: 2,
} as const;

export type Stage =
  /** 집계 서버가 안 붙었다 */
  | 'offline'
  /** 0표 */
  | 'empty'
  /** 1~4표 — 개표 중 */
  | 'counting'
  /** 5~19표 — 비율은 공개, 판정은 보류 */
  | 'partial'
  /** 20표 이상 — 전부 공개 */
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
 *  🔴 **또는**가 아니라 **그리고**다 — 표만 있고 댓글이 없는 페이지는 수치 두 줄뿐이라
 *  여전히 빈 페이지다. 본문을 채우는 건 댓글이다.
 *
 *  표 조건(5)이 `RESULT`와 같은 값인 것은 우연이 아니다: 그 아래는 화면에
 *  "개표 중입니다"만 나오므로, 검색으로 들어온 사람이 **결과를 못 보는 페이지**가
 *  색인되는 셈이다. 색인을 여는 최소선은 "페이지가 제 모습을 갖춘 시점"이다. */
export function indexable(tally: Tally, commentCount: number): boolean {
  return (
    tally.live && totalOf(tally) >= TIER.INDEX && commentCount >= TIER.INDEX_COMMENTS
  );
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
