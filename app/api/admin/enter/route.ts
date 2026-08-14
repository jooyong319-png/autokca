import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, ADMIN_COOKIE_OPTS, isAdminToken } from '@/lib/admin';
import { SITE } from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* 관리 화면 입구. `?k=<토큰>`으로 한 번 들어오면 쿠키를 심고 `/admin`으로 보낸다.
 *
 * 🔴 **토큰을 URL에 오래 두지 않는다.** 쿼리스트링은 브라우저 기록·서버 접근 로그·
 *    리퍼러 헤더에 남는다. 확인 즉시 httpOnly 쿠키로 바꾸고 리다이렉트해서
 *    주소창에서 치운다.
 *
 * 🔴 실패하면 **404**를 낸다. 401이면 "여기 관리 화면이 있다"고 알려주는 셈이다.
 *    없는 페이지처럼 보이는 편이 낫다.
 */
export async function GET(request: Request) {
  const k = new URL(request.url).searchParams.get('k');
  if (!isAdminToken(k)) {
    return new NextResponse(null, { status: 404 });
  }

  const res = NextResponse.redirect(new URL('/admin', SITE.url), { status: 303 });
  res.cookies.set(ADMIN_COOKIE, k as string, ADMIN_COOKIE_OPTS);
  return res;
}
