import { aiOf } from './ai';

/* AI 일치율 — "왜 이걸 해야 하지?"에 대한 답(브리프 §0).
 *
 * 투표 하나하나는 보상이 짧다. **10개를 찍으면 "AI랑 얼마나 같은 사람인지" 판정**이 나온다는
 * 목표가 있어야 다음 카드로 넘어갈 이유가 생긴다(원칙 1, PV/세션).
 *
 * 🔴 브라우저에만 있다. 기표 기록(`ottoke:voted`)과 AI 답(`lib/ai.ts`)을 맞춰 볼 뿐,
 *    서버는 누가 AI와 같았는지 모른다 — `/me` 확인서와 같은 원칙이다.
 * 🔴 AI가 기권한 안건은 세지 않는다. 같은 편인지 판단할 근거가 없다.
 */

/** 판정까지 찍어야 하는 개수 */
export const MATCH_GOAL = 10;

/** 기표가 저장될 때 Ballot이 쏘는 이벤트. 도장판·댓글 칸이 이걸 듣고 다시 읽는다. */
export const VOTE_EVENT = 'ottoke:vote';

export type Mark = 'same' | 'diff';

export interface Match {
  /** 기표 순서대로 — 도장판에 찍히는 순서다 */
  marks: Mark[];
  same: number;
  n: number;
}

export const EMPTY_MATCH: Match = { marks: [], same: 0, n: 0 };

/** 안건 id → 내가 고른 쪽. `<id>:counted`는 다수파 기록용 표식이라 거른다. */
export function readVotes(): Map<string, 'a' | 'b'> {
  const out = new Map<string, 'a' | 'b'>();
  try {
    const raw = localStorage.getItem('ottoke:voted');
    if (!raw) return out;
    for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, unknown>)) {
      if (k.endsWith(':counted')) continue;
      if (v === 'a' || v === 'b') out.set(k, v);
    }
  } catch {
    /* 읽을 수 없으면 빈 기록 */
  }
  return out;
}

const PICKS_KEY = 'ottoke:ai-picks';

function readPicks(): Record<string, 'a' | 'b'> {
  try {
    return JSON.parse(localStorage.getItem(PICKS_KEY) ?? '{}') as Record<string, 'a' | 'b'>;
  } catch {
    return {};
  }
}

/** 🔴 자동 발행분의 AI 선택은 코드의 표(`lib/ai.ts`)에 없다. 도장판은 어느 페이지에서든
 *  기표 기록만으로 계산해야 하므로, 카드가 그려질 때 브라우저에 남겨 둔다. */
export function rememberPick(id: string, pick: 'a' | 'b'): void {
  try {
    const picks = readPicks();
    if (picks[id] === pick) return;
    picks[id] = pick;
    localStorage.setItem(PICKS_KEY, JSON.stringify(picks));
  } catch {
    /* 저장이 막혀 있으면 그 안건만 판정에서 빠진다 */
  }
}

export function readMatch(): Match {
  const marks: Mark[] = [];
  const picks = readPicks();
  readVotes().forEach((choice, id) => {
    const pick = aiOf(id)?.pick ?? picks[id];
    if (pick) marks.push(pick === choice ? 'same' : 'diff');
  });
  const same = marks.filter(m => m === 'same').length;
  return { marks, same, n: marks.length };
}

export function announceVote(): void {
  try {
    window.dispatchEvent(new Event(VOTE_EVENT));
  } catch {
    /* 서버 렌더 등 window가 없을 때 */
  }
}

/** 판정 문구 — 건방진 AI 말투(lib/ai.ts 주석). 놀리는 대상은 "님"이지 집단이 아니다. */
export function matchVerdict(pct: number): string {
  if (pct >= 80) return 'AI랑 거의 같아요. 혹시 로봇이세요?';
  if (pct >= 60) return 'AI랑 꽤 통하네요. 사람치고 계산적이에요.';
  if (pct >= 40) return '반반이에요. AI도 님을 못 읽겠대요.';
  if (pct >= 20) return 'AI랑 잘 안 맞아요. 인간 인증 완료.';
  return 'AI가 님을 전혀 이해 못 해요. 아주 사람다워요.';
}
