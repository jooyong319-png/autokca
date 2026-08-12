/** Supabase REST(PostgREST) 호출 — SDK를 넣지 않는 이유는 하는 일이
 *  "함수 몇 개 부르기"뿐이라 의존성 값이 없기 때문이다.
 *
 *  ⚠️ 환경변수가 없으면 모든 호출이 null을 돌려준다. 사이트는 그 상태로도 돌아가야 한다 —
 *  Supabase 프로젝트를 만들기 전에 `npm run dev`로 화면을 볼 수 있어야 하니까.
 */

function config(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ''), key };
}

export function isConfigured(): boolean {
  return config() !== null;
}

/** @param revalidate 초 단위 캐시. false면 캐시하지 않는다(쓰기). */
export async function rpc(
  fn: string,
  body: unknown,
  revalidate: number | false,
): Promise<unknown | null> {
  const cfg = config();
  if (!cfg) return null;

  try {
    const res = await fetch(`${cfg.url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      ...(revalidate === false
        ? { cache: 'no-store' as const }
        : { next: { revalidate } }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    // 집계나 의견이 죽어도 질문은 보여야 한다
    return null;
  }
}

/** PostgREST 함수 반환은 단일 값이거나 행 배열이다. 첫 행만 필요할 때. */
export function firstRow(raw: unknown): Record<string, unknown> | null {
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== 'object') return null;
  return row as Record<string, unknown>;
}
