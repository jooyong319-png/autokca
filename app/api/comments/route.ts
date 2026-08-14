import { NextResponse } from 'next/server';
import { commentCookieName, readCookie, readVote } from '@/lib/cookies';
import { validIds } from '@/lib/catalog';
import { addComment, commentCounts, listComments, topComment, validate } from '@/lib/comments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* 🔴 모듈 상수가 아니라 **요청마다** 만든다 — 관리 화면에서 발행한 안건도
   유효해야 한다. 상수로 두면 새 안건에 투표·댓글이 404로 막힌다.
   `catalog()`는 60초 fetch 캐시라 왕복이 매번 생기지는 않는다. */

/** 의견 목록 — 화면이 몇 초마다 다시 부른다(폴링).
 *
 *  Supabase Realtime을 쓰지 않는 이유: 브라우저에 SDK를 넣어야 하고(번들 증가),
 *  anon 키를 노출하고 RLS를 열어야 한다. 지금은 DB를 **서버만** 만지는 구조인데
 *  그게 다 새 공격 표면이 된다. 의견 피드에서 0.2초와 6초의 차이는 체감되지 않는다.
 *  진짜 실시간 채팅방을 만들 때 그때 Realtime을 도입한다. */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id || !(await validIds()).has(id)) {
    return NextResponse.json({ error: '없는 질문입니다.' }, { status: 404 });
  }
  /* tops·counts를 함께 준다 — 진영 머리글과 "반대편 1위"가 폴링으로도 갱신돼야 한다.
     따로 요청하면 왕복이 세 번이 된다. */
  const [comments, topA, topB, counts] = await Promise.all([
    listComments(id, 50, true),
    topComment(id, 'a', true),
    topComment(id, 'b', true),
    commentCounts(id, true),
  ]);
  return NextResponse.json({ comments, tops: { a: topA, b: topB }, counts });
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const { id, body } = (payload ?? {}) as { id?: unknown; body?: unknown };

  if (typeof id !== 'string' || !(await validIds()).has(id)) {
    return NextResponse.json({ error: '없는 질문입니다.' }, { status: 404 });
  }

  /* 🔴 진영은 클라이언트가 보내는 값이 아니라 **기표 쿠키에서 읽는다.**
     클라이언트를 믿으면 투표하지 않고도 아무 진영으로 댓글을 달 수 있다. */
  const side = readVote(request, id);
  if (!side) {
    return NextResponse.json(
      { error: '투표부터 하세요.' },
      { status: 403 },
    );
  }

  /* 1안건 1의견 — 도배를 쿠키로 막는다. 완벽하지 않지만 로그인을 요구하지 않는 대가다. */
  const wroteCookie = commentCookieName(id);
  if (readCookie(request, wroteCookie)) {
    return NextResponse.json(
      { error: '할 말은 이미 하셨습니다.' },
      { status: 409 },
    );
  }

  const checked = validate(body);
  if (!checked.ok) {
    return NextResponse.json({ error: checked.reason }, { status: 422 });
  }

  const comment = await addComment(id, side, checked.body);
  if (!comment) {
    return NextResponse.json(
      { error: '의견 서버가 연결되지 않았습니다.' },
      { status: 503 },
    );
  }

  const res = NextResponse.json(comment, { status: 201 });
  res.cookies.set(wroteCookie, '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 400,
  });
  return res;
}
