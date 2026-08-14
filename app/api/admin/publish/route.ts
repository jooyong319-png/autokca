import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { setPublished } from '@/lib/drafts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* 후보 발행 / 발행 취소.
 *
 * 🔴 **화면만 가리고 API가 열려 있으면 의미가 없다.** 관리 화면과 같은 검사를 여기서도 한다 —
 *    `/admin`이 404를 내도 이 엔드포인트를 직접 부르면 질문이 발행될 수 있다.
 *
 * 🔴 발행 취소는 **표를 지우지 않는다**(DB 함수도 그렇게 짰다). 화면에서 내릴 뿐이다.
 *    집계에서 표가 사라지면 "아까 N명이었는데"라는 의심이 생기고, 그건 이 사이트가
 *    파는 유일한 것을 깎는다.
 */
export async function POST(request: Request) {
  if (!isAdmin(request)) {
    return new NextResponse(null, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const { id, publish } = (body ?? {}) as { id?: unknown; publish?: unknown };
  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
  }
  if (typeof publish !== 'boolean') {
    return NextResponse.json({ error: 'publish는 true/false여야 합니다.' }, { status: 400 });
  }

  const ok = await setPublished(id, publish);
  if (!ok) {
    return NextResponse.json(
      { error: '반영하지 못했습니다. 집계 서버 연결을 확인하세요.' },
      { status: 503 },
    );
  }
  return NextResponse.json({ id, published: publish });
}
