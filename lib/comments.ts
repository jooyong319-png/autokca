/** 기타 의견(댓글).
 *
 *  이 파일이 이 사이트의 유일한 UGC다. 모더레이션에 사람 손이 들어가지 않게
 *  **받는 단계에서 거른다** — 아래 validate()가 그 관문이다.
 *  통과한 뒤의 관리는 신고 누적 자동 숨김(DB의 report_threshold)에 맡긴다.
 */

import { firstRow, isConfigured, rpc } from './supabase';

export interface Comment {
  id: number;
  /** 이 의견을 쓴 사람이 어디에 기표했는지. 댓글이 개표의 연장이 되게 하는 핵심 정보다. */
  side: 'a' | 'b';
  body: string;
  likes: number;
  createdAt: string;
}

export const MAX_LENGTH = 80;
const MIN_LENGTH = 2;

/** 제로폭·비가시 문자. 글자 사이에 끼워 금칙어 필터를 우회하는 수법이 있어 먼저 지운다.
 *
 *  정규식 문자 클래스로 쓰지 않는 이유: 소스에 실제 문자가 박히면 눈에 보이지 않아
 *  나중에 아무도 그 줄을 고칠 수 없다. 코드포인트로 적어 소스를 전부 ASCII로 유지한다.
 *  ZWSP · ZWNJ · ZWJ · WORD JOINER · BOM */
const INVISIBLE = new Set([0x200b, 0x200c, 0x200d, 0x2060, 0xfeff]);

function stripInvisible(text: string): string {
  let out = '';
  for (const ch of text) {
    if (!INVISIBLE.has(ch.codePointAt(0) ?? 0)) out += ch;
  }
  return out;
}

/** 링크는 스팸의 대부분이다. 80자 안에서 링크를 넣을 이유도 없다. */
const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|kr|co|io|me|gg|xyz|shop|top)\b)/i;

/** 연락처 유도 — 개인정보가 본문에 남는 것도 함께 막는다 */
const CONTACT =
  /(010[-\s]?\d{3,4}[-\s]?\d{4}|[\w.+-]+@[\w-]+\.[a-z]{2,}|카톡\s*아이디|오픈\s*채팅)/i;

/** 최소 방어선. 완벽할 수 없고, 완벽하게 만들려 하면 정상 의견이 막힌다. */
const BANNED = [
  '씨발', '시발', '새끼', '병신', '지랄', '좆', '보지', '자지',
  '섹스', '야동', '도박', '카지노', '토토', '대출문의', '몸캠',
];

export type Validation =
  | { ok: false; reason: string }
  | { ok: true; body: string };

export function validate(raw: unknown): Validation {
  if (typeof raw !== 'string') return { ok: false, reason: '의견을 입력하십시오.' };

  const body = stripInvisible(raw).replace(/\s+/g, ' ').trim();

  if (body.length < MIN_LENGTH) return { ok: false, reason: '너무 짧습니다.' };
  if (body.length > MAX_LENGTH) {
    return { ok: false, reason: `${MAX_LENGTH}자 이내로 기재하십시오.` };
  }
  if (LINK.test(body)) return { ok: false, reason: '링크는 기재할 수 없습니다.' };
  if (CONTACT.test(body)) return { ok: false, reason: '연락처는 기재할 수 없습니다.' };

  const flat = body.replace(/\s/g, '');
  if (BANNED.some(w => flat.includes(w))) {
    return { ok: false, reason: '기재할 수 없는 표현이 있습니다.' };
  }
  /* 같은 글자 10번 이상 반복 — 도배 */
  if (/(.)\1{9,}/.test(flat)) return { ok: false, reason: '같은 글자를 너무 반복했습니다.' };

  return { ok: true, body };
}

function shape(raw: unknown): Comment | null {
  const row = firstRow(raw);
  if (!row) return null;
  const side = row.side === 'a' || row.side === 'b' ? row.side : null;
  if (typeof row.id !== 'number' || typeof row.body !== 'string' || !side) return null;
  return {
    id: row.id,
    side,
    body: row.body,
    likes: typeof row.likes === 'number' ? row.likes : 0,
    createdAt: typeof row.created_at === 'string' ? row.created_at : '',
  };
}

/** @param fresh 폴링으로 부를 때는 캐시를 쓰면 새 의견이 안 보인다 */
export async function listComments(
  questionId: string,
  limit = 50,
  fresh = false,
): Promise<Comment[]> {
  const raw = await rpc('list_comments', { qid: questionId, lim: limit }, fresh ? false : 60);
  if (!Array.isArray(raw)) return [];
  return raw.map(r => shape(r)).filter((c): c is Comment => c !== null);
}

export async function addComment(
  questionId: string,
  side: 'a' | 'b',
  body: string,
): Promise<Comment | null> {
  const raw = await rpc('add_comment', { qid: questionId, sd: side, txt: body }, false);
  return raw === null ? null : shape(raw);
}

/** 🔴 진영별 최고 추천 1개 — "상대편 최고 추천"을 상단에 노출하는 데 쓴다(브리프 §4).
 *  최신 목록 안에 없을 수도 있으므로 별도로 조회한다. */
export async function topComment(
  questionId: string,
  side: 'a' | 'b',
  fresh = false,
): Promise<Comment | null> {
  const raw = await rpc('top_comment', { qid: questionId, sd: side }, fresh ? false : 60);
  return raw === null ? null : shape(raw);
}

/** 진영별 댓글 수 — 2열 머리글에 쓴다. 목록은 50개로 잘리므로 개수는 따로 센다. */
export async function commentCounts(
  questionId: string,
  fresh = false,
): Promise<{ a: number; b: number }> {
  const raw = await rpc('comment_counts', { qid: questionId }, fresh ? false : 60);
  const row = firstRow(raw);
  return {
    a: typeof row?.a === 'number' ? row.a : 0,
    b: typeof row?.b === 'number' ? row.b : 0,
  };
}

/** 질문별 댓글 수 전체 — 사이트맵이 thin content를 걸러낼 때 쓴다.
 *  없는 질문은 맵에 안 들어간다(= 0건). */
export async function readAllCommentCounts(): Promise<Map<string, number>> {
  const raw = await rpc('all_comment_counts', {}, 300);
  const out = new Map<string, number>();
  if (!Array.isArray(raw)) return out;
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    if (typeof r.question_id === 'string' && typeof r.n === 'number') {
      out.set(r.question_id, r.n);
    }
  }
  return out;
}

/** 갱신된 공감 수. 실패하면 null. */
export async function likeComment(id: number): Promise<number | null> {
  const raw = await rpc('like_comment', { cid: id }, false);
  if (raw === null) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'number' ? value : null;
}

/** 신고 접수. 임계치에 닿아 숨겨졌으면 true. */
export async function reportComment(id: number): Promise<boolean> {
  const raw = await rpc('report_comment', { cid: id }, false);
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === true;
}

export { isConfigured };
