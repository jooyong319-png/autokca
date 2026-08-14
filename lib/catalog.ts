import { QUESTIONS, type Question } from './questions';
import { publishedDrafts } from './drafts';

/* 사이트가 실제로 쓰는 안건 목록 = **코드 103개 + DB 발행분**.
 *
 * 🔴 왜 두 곳인가: 전부 DB로 옮기면 Supabase가 죽는 순간 **질문이 하나도 없는 빈 사이트**가
 *    된다. 지금 설계는 집계만 감추고 질문은 보인다(제1원칙의 "죽으면 감추고 밝힌다"와 같은 결).
 *    코드의 103개가 항상 있는 바닥이고, 관리 화면에서 발행한 것이 그 위에 얹힌다.
 *    DB가 죽으면 `publishedDrafts()`가 빈 배열을 주고 사이트는 103개로 계속 돈다.
 *
 * 🔴 `questions.ts`는 **순수 데이터 모듈로 남긴다**(DB를 모른다). 병합은 여기서만 한다 —
 *    그래야 `questions.ts`를 읽는 자동화·검증 스크립트가 DB 없이도 돌아간다.
 *
 * ⚠️ `publishedDrafts()`는 60초 fetch 캐시를 쓴다. 그래서 한 요청에서 여러 번 불러도
 *    왕복은 한 번이고, `force-dynamic` 라우트에서도 캐시가 적용된다.
 */

/** 코드 + 발행분. 충돌은 **코드가 이긴다**. */
export async function catalog(): Promise<Question[]> {
  const extra = await publishedDrafts();
  if (extra.length === 0) return QUESTIONS;

  /* 🔴 코드에 이미 있는 id·slug은 버린다. id가 겹치면 기존 질문의 표에 붙고,
     slug이 겹치면 URL이 충돌한다. 관리 화면이 체크박스를 잠가 미리 막지만,
     DB를 직접 건드리는 경우까지 막으려면 여기서도 걸러야 한다. */
  const ids = new Set(QUESTIONS.map(q => q.id));
  const slugs = new Set(QUESTIONS.map(q => q.slug));

  const add: Question[] = [];
  for (const d of extra) {
    if (ids.has(d.id) || slugs.has(d.slug)) continue;
    ids.add(d.id);
    slugs.add(d.slug);
    add.push({ id: d.id, slug: d.slug, topic: d.topic, kind: d.kind, q: d.q, a: d.a, b: d.b });
  }
  return [...QUESTIONS, ...add];
}

export async function findBySlug(slug: string): Promise<Question | undefined> {
  return (await catalog()).find(q => q.slug === slug);
}

/** API가 "있는 안건인가"를 판정할 때 쓴다. */
export async function validIds(): Promise<Set<string>> {
  return new Set((await catalog()).map(q => q.id));
}

export async function byTopicAsync(topic: string): Promise<Question[]> {
  return (await catalog()).filter(q => q.topic === topic);
}
