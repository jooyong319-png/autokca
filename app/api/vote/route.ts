import { NextResponse } from 'next/server';
import { commentCookieName, readCookie, readVote, voteCookieName } from '@/lib/cookies';
import { QUESTIONS } from '@/lib/questions';
import { castVote, readTally } from '@/lib/votes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID = new Set(QUESTIONS.map(q => q.id));

/** 화면이 마운트 때 부르는 것 — **기표 여부의 진실을 서버에서 받아 간다.**
 *  localStorage만 믿으면 쿠키와 어긋났을 때 사용자가 기표도 의견도 못 하는 상태에 갇힌다. */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id || !VALID.has(id)) {
    return NextResponse.json({ error: '없는 질문입니다.' }, { status: 404 });
  }

  const tally = await readTally(id);
  return NextResponse.json({
    ...tally,
    myVote: readVote(request, id),
    /* 의견을 이미 기재했는지도 함께 — 이것도 쿠키가 진실이다 */
    wrote: readCookie(request, commentCookieName(id)) !== null,
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const { id, choice } = (body ?? {}) as { id?: unknown; choice?: unknown };

  if (typeof id !== 'string' || !VALID.has(id)) {
    return NextResponse.json({ error: '없는 질문입니다.' }, { status: 404 });
  }
  if (choice !== 'a' && choice !== 'b') {
    return NextResponse.json({ error: '선택은 a 또는 b여야 합니다.' }, { status: 400 });
  }

  /* 이미 기표한 안건이면 표를 더하지 않고 현재 집계와 **원래 기표**를 돌려준다.
     화면이 이 값으로 자기 상태를 고칠 수 있어야 한다. */
  const already = readVote(request, id);
  if (already) {
    const tally = await readTally(id);
    return NextResponse.json({ ...tally, myVote: already });
  }

  const tally = await castVote(id, choice);
  const res = NextResponse.json({ ...tally, myVote: choice });
  res.cookies.set(voteCookieName(id), choice, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 400,
  });
  return res;
}
