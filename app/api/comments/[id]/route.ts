import { NextResponse } from 'next/server';
import { likeComment, reportComment } from '@/lib/comments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Params {
  params: { id: string };
}

/** 공감·신고. 둘 다 카운터 하나를 올리는 일이라 한 라우트로 묶는다. */
export async function PATCH(request: Request, { params }: Params) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: '없는 의견입니다.' }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const { action } = (payload ?? {}) as { action?: unknown };

  if (action === 'like') {
    /* 중복 공감은 브라우저(로컬스토리지)에서만 막는다. 의견마다 쿠키를 굽는 건
       현실적이지 않고, 공감 수가 몇 개 부풀는 것은 감당할 수 있는 오차다. */
    const likes = await likeComment(id);
    if (likes === null) {
      return NextResponse.json({ error: '공감을 반영하지 못했습니다.' }, { status: 503 });
    }
    return NextResponse.json({ likes });
  }

  if (action === 'report') {
    const hidden = await reportComment(id);
    return NextResponse.json({ hidden });
  }

  return NextResponse.json({ error: '알 수 없는 요청입니다.' }, { status: 400 });
}
