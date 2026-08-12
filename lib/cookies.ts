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
