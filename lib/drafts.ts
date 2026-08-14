import { rpc } from './supabase';
import type { Kind, TopicSlug } from './questions';

/* 질문 후보와 발행분.
 *
 * 🔴 **기존 103개는 코드(`lib/questions.ts`)에 그대로 있다.** 여기는 그 뒤에 추가되는 것만이다.
 *    전부 DB로 옮기지 않은 이유: Supabase가 죽으면 질문이 하나도 없는 빈 사이트가 된다.
 *    코드의 103개가 항상 있는 바닥이고 이 테이블이 그 위에 얹힌다.
 */

export interface Draft {
  id: string;
  slug: string;
  q: string;
  a: string;
  b: string;
  topic: TopicSlug;
  kind: Kind;
  publishedAt: string | null;
  note: string;
  createdAt: string;
}

const TOPICS = new Set([
  'money', 'work', 'manners', 'life', 'office', 'commute', 'food', 'messenger',
]);

function shape(raw: unknown): Draft | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const need = ['id', 'slug', 'q', 'a', 'b', 'topic', 'kind'] as const;
  for (const k of need) if (typeof r[k] !== 'string' || !r[k]) return null;
  /* DB 제약과 별개로 여기서도 막는다 — 값이 이상하면 화면이 깨지는 게 아니라 조용히 빠진다 */
  if (!TOPICS.has(r.topic as string)) return null;
  if (r.kind !== 'serious' && r.kind !== 'meme') return null;
  return {
    id: r.id as string,
    slug: r.slug as string,
    q: r.q as string,
    a: r.a as string,
    b: r.b as string,
    topic: r.topic as TopicSlug,
    kind: r.kind as Kind,
    publishedAt: typeof r.published_at === 'string' ? r.published_at : null,
    note: typeof r.note === 'string' ? r.note : '',
    createdAt: typeof r.created_at === 'string' ? r.created_at : '',
  };
}

/** 관리 화면용 — 대기 + 발행 전체. 캐시하지 않는다(방금 바꾼 게 바로 보여야 한다). */
export async function allDrafts(): Promise<Draft[]> {
  const raw = await rpc('all_drafts', {}, false);
  if (!Array.isArray(raw)) return [];
  return raw.map(shape).filter((d): d is Draft => d !== null);
}

/** 사이트가 코드의 103개와 합쳐 쓸 **발행분만**.
 *
 *  ⚠️ 60초 캐시. 발행 직후 반영이 조금 늦을 수 있는데, 그게 매 요청 DB 왕복보다 낫다.
 *  관리 화면은 위 `allDrafts()`로 캐시 없이 본다. */
export async function publishedDrafts(): Promise<Draft[]> {
  const raw = await rpc('published_questions', {}, 60);
  if (!Array.isArray(raw)) return [];
  return raw.map(shape).filter((d): d is Draft => d !== null);
}

/** 체크박스 on/off. 🔴 발행 취소는 **표를 지우지 않는다** — 화면에서 내릴 뿐이다. */
export async function setPublished(id: string, on: boolean): Promise<boolean> {
  const raw = await rpc('set_draft_published', { d_id: id, on_off: on }, false);
  return raw === true;
}
