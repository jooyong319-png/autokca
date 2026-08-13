/** 요청 쿠키 읽기 — 기표 여부의 **단일 진실**이 여기에 있다.
 *
 *  화면(localStorage)과 서버(쿠키)가 각자 판단하면 둘이 어긋나고, 어긋나면 사용자가 갇힌다.
 *  그래서 API가 쿠키를 읽어 알려주고 화면이 그 값으로 맞춘다.
 */

/** 쿠키 이름에 쓸 수 있게 안건 id를 정리한다(id는 이미 kebab-case지만 방어한다). */
export function idSlug(id: string): string {
  return id.replace(/[^a-z0-9-]/gi, '');
}

export function voteCookieName(id: string): string {
  return `v_${idSlug(id)}`;
}

export function commentCookieName(id: string): string {
  return `c_${idSlug(id)}`;
}

/** 이 사람이 기표한 안건 전체(7차 §4-3 미투표 우선 정렬용).
 *
 *  쿠키는 **기표한 안건에만** 있으므로 이름을 훑으면 된다 — 질문 103개를 순회할 필요가 없다.
 *  `voteCookieName`이 `v_<id>` 형태이고 안건 id가 kebab-case라 접두사만 떼면 원래 id다. */
export function readVotedIds(request: Request): Set<string> {
  const out = new Set<string>();
  const jar = request.headers.get('cookie');
  if (!jar) return out;
  for (const part of jar.split(';')) {
    const name = part.trim().split('=')[0];
    if (name.startsWith('v_') && name.length > 2) out.add(name.slice(2));
  }
  return out;
}

/** 번복 횟수(7차 §2-5). 질문당 3회까지. */
export function revisionCookieName(id: string): string {
  return `r_${idSlug(id)}`;
}

/** 번복 쿨다운. 🔴 값이 아니라 **쿠키의 만료 자체가 쿨다운**이다 —
 *  타임스탬프를 넣고 비교하면 시계 차이·문자열 파싱이 새 실패 지점이 된다.
 *  이 쿠키가 있으면 아직 쿨다운 중이라는 뜻이고, 없으면 끝난 것이다. */
export function cooldownCookieName(id: string): string {
  return `rc_${idSlug(id)}`;
}

/** 지금까지 몇 번 번복했는지. 숫자가 아니면 0으로 본다. */
export function readRevisions(request: Request, id: string): number {
  const raw = readCookie(request, revisionCookieName(id));
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

export function readCookie(request: Request, name: string): string | null {
  const jar = request.headers.get('cookie');
  if (!jar) return null;
  for (const part of jar.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

/** 이 안건에 어느 쪽으로 기표했는지. 안 했으면 null. */
export function readVote(request: Request, id: string): 'a' | 'b' | null {
  const value = readCookie(request, voteCookieName(id));
  return value === 'a' || value === 'b' ? value : null;
}
