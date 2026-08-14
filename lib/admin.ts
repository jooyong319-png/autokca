import { timingSafeEqual } from 'node:crypto';

/* 운영자 전용 통로.
 *
 * 🔴 이건 **방문자용 로그인이 아니다.** 브리프 원칙 3(로그인 금지)은 투표하는 사람에게
 *    마찰을 만들지 말라는 것이고, 관리 화면은 그 대상이 아니다.
 *
 * 🔴 Vercel 비밀번호 보호를 쓰지 않은 이유: Deployment Protection은 **배포 단위**라
 *    `/admin`만 잠글 수 없다. 프로덕션을 보호하려면 사이트 전체가 잠긴다.
 *    게다가 Pro 플랜 + 월 $150 애드온이고 최소 30일 유지 조건이 붙는다.
 */

const COOKIE = 'ottoke_admin';

/** 상수 시간 비교. 길이가 다르면 바로 false를 주되, 같은 길이에서는 조기 반환하지 않는다 —
 *  `===`는 첫 불일치에서 멈춰서 응답 시간으로 앞자리를 하나씩 알아낼 수 있다. */
function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a, 'utf8');
  const y = Buffer.from(b, 'utf8');
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

function secret(): string | null {
  const v = process.env.ADMIN_TOKEN?.trim();
  return v ? v : null;
}

/** 주어진 값이 운영자 토큰과 같은가.
 *
 *  🔴 토큰이 설정돼 있지 않으면 **아무도 통과시키지 않는다.**
 *  환경변수를 안 넣은 배포에서 관리 화면이 열려 있으면 최악이다.
 *
 *  서버 컴포넌트(`cookies()`)와 라우트 핸들러(`Request`) 양쪽에서 같은 함수를 쓴다 —
 *  검사가 두 벌이 되면 한쪽만 고쳐져 화면은 막혔는데 API가 열리는 일이 생긴다. */
export function isAdminToken(value: string | undefined | null): boolean {
  const s = secret();
  if (!s || !value) return false;
  return sameSecret(value, s);
}

/** 라우트 핸들러용 — 요청 쿠키에서 읽어 판단 */
export function isAdmin(request: Request): boolean {
  const jar = request.headers.get('cookie');
  if (!jar) return false;
  for (const part of jar.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === COOKIE) return isAdminToken(decodeURIComponent(rest.join('=')));
  }
  return false;
}

export const ADMIN_COOKIE = COOKIE;

export const ADMIN_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  /* 짧게 잡는다. 운영자 통로라 오래 열어 둘 이유가 없고,
     기기를 잃었을 때 노출 창이 작아야 한다. */
  maxAge: 60 * 60 * 24 * 14,
};
