import { NextResponse } from 'next/server';
import {
  commentCookieName,
  cooldownCookieName,
  readCookie,
  readRevisions,
  readVote,
  revisionCookieName,
  voteCookieName,
} from '@/lib/cookies';
import { QUESTIONS } from '@/lib/questions';
import { castVote, changeVote, readTally } from '@/lib/votes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID = new Set(QUESTIONS.map(q => q.id));

/* 신규 기표와 번복이 같은 옵션을 써야 한다 — 따로 적으면 번복할 때
   만료나 path가 어긋나서 쿠키가 갈라진다. */
const COUNT_DOWN = '집계 서버가 연결되지 않아 기표를 반영하지 못했습니다. 잠시 후 다시 시도해 주세요.';

/* 🔴 7차 §2-5 남용 방지. 번복의 목적은 **오터치 복구**다 —
   scroll-snap 피드에서 스크롤 중 잘못 눌렀는데 되돌릴 수 없으면, 그 사람은
   반대 진영에 갇혀 댓글조차 못 쓴다. 그 목적에 3회면 충분하고,
   그 이상은 집계를 흔드는 놀이가 된다. */
const MAX_REVISIONS = 3;
/* 쿨다운 4초 — 도장이 옮겨 가는 애니메이션을 볼 시간이다(§2-5) */
const COOLDOWN_SEC = 4;

/* 카피는 공문서 톤(§2-6) */
const MSG = {
  moved: '말을 바꾸셨습니다. 기록에 남습니다.',
  spent: '이제 그만 정하시죠.',
  wrote: '이미 한마디까지 하셨습니다. 이제 와서 말을 바꾸시면 곤란합니다.',
  cooling: '방금 바꾸셨습니다. 잠시 후에 다시.',
} as const;

const VOTE_COOKIE = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 400,
};

/** 화면이 마운트 때 부르는 것 — **기표 여부의 진실을 서버에서 받아 간다.**
 *  localStorage만 믿으면 쿠키와 어긋났을 때 사용자가 기표도 의견도 못 하는 상태에 갇힌다. */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id || !VALID.has(id)) {
    return NextResponse.json({ error: '없는 질문입니다.' }, { status: 404 });
  }

  const tally = await readTally(id, true);
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

  const already = readVote(request, id);

  /* 같은 쪽을 다시 누른 것 — 표를 더하지 않고 현재 상태만 돌려준다.
     화면이 이 값으로 자기를 고칠 수 있어야 한다. */
  if (already === choice) {
    const tally = await readTally(id, true);
    return NextResponse.json({ ...tally, myVote: already });
  }

  /* 🔴 번복 — 한 쪽에서 빼고 다른 쪽에 더한다. **취소는 없다**(그런 경로를 만들지 않는다).
   *
   *  다만 **사유를 이미 남겼으면 잠근다.** 진영은 이 기표 쿠키에서 읽으므로
   *  (`/api/comments` POST) 여기서 진영을 바꾸면 **자기가 쓴 의견이 "반대편" 칼럼에 남는다.**
   *  자기 주장이 상대 진영 것으로 표시되는 상태라 화면이 앞뒤가 안 맞게 된다.
   *  의견은 그 시점의 판단을 기록한 것이니 옮기지도 않는다.
   *  → 사유를 내기 전까지는 얼마든지 바꾸고, 낸 뒤에는 그 입장에 남는다. */
  if (already) {
    /* 쿨다운 — 쿠키가 남아 있으면 아직 끝나지 않았다 */
    if (readCookie(request, cooldownCookieName(id))) {
      return NextResponse.json(
        { ...(await readTally(id, true)), myVote: already, error: MSG.cooling },
        { status: 429 },
      );
    }

    const revisions = readRevisions(request, id);
    if (revisions >= MAX_REVISIONS) {
      return NextResponse.json(
        { ...(await readTally(id, true)), myVote: already, error: MSG.spent },
        { status: 409 },
      );
    }

    if (readCookie(request, commentCookieName(id))) {
      const tally = await readTally(id, true);
      return NextResponse.json(
        {
          ...tally,
          myVote: already,
          error: MSG.wrote,
        },
        { status: 409 },
      );
    }

    const moved = await changeVote(id, already, choice);
    /* 🔴 집계에 반영되지 않았으면 **쿠키를 바꾸지 않는다.**
       바꿔 버리면 쿠키는 새 진영, DB는 옛 진영이 되어 영구히 어긋난다 —
       그 사람의 표는 반대쪽에 남아 있는데 화면과 댓글 진영은 새 쪽을 가리킨다. */
    if (!moved.live) {
      return NextResponse.json(
        { ...(await readTally(id, true)), myVote: already, error: COUNT_DOWN },
        { status: 503 },
      );
    }
    const left = MAX_REVISIONS - (revisions + 1);
    const res = NextResponse.json({
      ...moved,
      myVote: choice,
      /* 🔴 "기록에 남습니다"는 실제로 남기므로 참이다 — 아래 번복 횟수 쿠키가 그 기록이다.
         카피가 사실이 아니면 그것도 숫자를 지어내는 일이다. */
      note: left > 0 ? `${MSG.moved} (남은 번복 ${left}회)` : `${MSG.moved} ${MSG.spent}`,
    });
    res.cookies.set(voteCookieName(id), choice, VOTE_COOKIE);
    res.cookies.set(revisionCookieName(id), String(revisions + 1), VOTE_COOKIE);
    res.cookies.set(cooldownCookieName(id), '1', { ...VOTE_COOKIE, maxAge: COOLDOWN_SEC });
    return res;
  }

  const tally = await castVote(id, choice);
  /* 🔴 같은 이유로 신규 기표도 반영을 확인한 뒤에 쿠키를 심는다.
     전에는 집계가 죽어 있어도 쿠키가 박혀서 **표는 세지 않은 채 기표한 것으로 남았고**,
     서버가 돌아온 뒤에도 다시 기표할 수 없었다. */
  if (!tally.live) {
    return NextResponse.json({ ...tally, myVote: null, error: COUNT_DOWN }, { status: 503 });
  }
  const res = NextResponse.json({ ...tally, myVote: choice });
  res.cookies.set(voteCookieName(id), choice, VOTE_COOKIE);
  return res;
}
