import type { AiTake } from './ai';

/* 자동 발행의 문지기(2026-11-04).
 *
 * 사용자가 "자동 수집 + 자동 발행, 사람 손 없이"로 결정했다. 전에는 사람이 `/admin`에서
 * 체크했고(wiki/question-inbox.md), 그 검수를 **기계로 잡을 수 있는 만큼** 여기로 옮겼다.
 *
 * 🔴 잡지 못하는 것: **재미.** "회의록 작성을 자원하나요?" 같은 습관 조사는 형식상 멀쩡하다.
 *    그건 수집 작업 지시문의 작성 규칙이 맡고, 내리는 건 `/admin`의 발행 취소다.
 * 🔴 `id`·`slug`은 발행 후 못 고친다. 그래서 통과 못 하면 **대기시키지 않고 거절**한다 —
 *    대기함은 이제 아무도 보지 않는다.
 */

/** 규칙 4(성별 갈등·정치 진영·종교). 애매하면 막는다 — 오탐은 다음 주 다른 소재로 메워진다. */
const OFF_LIMITS = [
  '남자', '여자', '남성', '여성', '남녀', '페미', '한남', '김치녀', '군필', '군대', '군복무', '군 복무',
  '대통령', '국회', '정당', '여당', '야당', '민주당', '국민의힘', '좌파', '우파', '보수', '진보', '탄핵', '선거',
  '기독교', '천주교', '불교', '이슬람', '교회', '목사', '스님', '종교',
  '전라도', '경상도', '장애인', '외국인', '조선족', '동성애',
];
/** 욕설·성인·도박(lib/comments.ts의 금칙어와 같은 범위) */
const BANNED = [
  '씨발', '시발', '새끼', '병신', '지랄', '좆', '보지', '자지', '섹스', '야동', '도박', '카지노', '토토',
];

export function forbiddenWord(...texts: string[]): string | null {
  const flat = texts.join(' ');
  return [...OFF_LIMITS, ...BANNED].find(w => flat.includes(w)) ?? null;
}

function bigrams(text: string): Set<string> {
  const flat = text.replace(/[^가-힣a-zA-Z0-9]/g, '');
  const out = new Set<string>();
  for (let i = 0; i < flat.length - 1; i += 1) out.add(flat.slice(i, i + 2));
  return out;
}

/** 두 문장의 글자쌍 겹침(0~1). 표현만 살짝 바꾼 같은 질문을 잡는다. */
export function similarity(x: string, y: string): number {
  const a = bigrams(x);
  const b = bigrams(y);
  if (a.size === 0 || b.size === 0) return 0;
  let both = 0;
  a.forEach(g => {
    if (b.has(g)) both += 1;
  });
  return both / (a.size + b.size - both);
}

/** 이 값 이상이면 같은 질문으로 본다. 실제 후보의 "회사 비품" 중복쌍이 0.6을 넘는다. */
export const SAME_QUESTION = 0.55;

/** 최근 6일 동안 자동으로 올릴 수 있는 개수. 토큰이 새거나 수집 작업이 고장 나도 피해가 여기서 멈춘다. */
export const WEEKLY_LIMIT = 10;

export type AiFields = Pick<AiTake, 'pick' | 'guess' | 'why'>;

/** AI 답 검사. 🔴 자동 발행분은 기권을 받지 않는다 — AI가 못 찍을 소재면 애초에 쓰지 않는다. */
export function checkAi(raw: unknown): { ai: AiFields } | { error: string } {
  const r = (raw ?? {}) as Record<string, unknown>;
  const why = typeof r.why === 'string' ? r.why.trim() : '';
  if (r.pick !== 'a' && r.pick !== 'b') return { error: 'ai.pick은 a 또는 b(기권 불가)' };
  if (typeof r.guess !== 'number' || !Number.isInteger(r.guess) || r.guess < 1 || r.guess > 99) {
    return { error: 'ai.guess는 1~99 정수' };
  }
  if (why.length < 2 || why.length > 40) return { error: 'ai.why는 2~40자' };
  /* 말투 규칙(lib/ai.ts): 격식체 정리문은 사용자가 "AI스럽다"고 돌려보낸 틀이다 */
  if (/(습니다|입니다)[.!?]?$/.test(why)) return { error: 'ai.why가 격식체(건방진 말투로)' };
  return { ai: { pick: r.pick, guess: r.guess, why } };
}

/* AI 답은 `drafts.note`의 뒤쪽에 붙여 저장한다.
 *
 * 🔴 칼럼을 새로 만들지 않은 이유: 운영 DB에 DDL을 넣을 경로가 없다(Supabase 대시보드에서
 *    사람이 실행해야 한다). "사람 손 없이"가 요구사항이라 이미 있는 칸을 쓴다.
 *    나중에 칼럼으로 옮겨도 이 두 함수만 고치면 된다. */
const AI_MARK = '\n@ai ';

export function encodeNote(note: string, ai: AiFields): string {
  return `${note}${AI_MARK}${JSON.stringify(ai)}`;
}

export function decodeNote(stored: string): { note: string; ai: AiFields | null } {
  const at = stored.indexOf(AI_MARK);
  if (at < 0) return { note: stored, ai: null };
  try {
    const parsed = checkAi(JSON.parse(stored.slice(at + AI_MARK.length)));
    return { note: stored.slice(0, at), ai: 'ai' in parsed ? parsed.ai : null };
  } catch {
    return { note: stored.slice(0, at), ai: null };
  }
}
