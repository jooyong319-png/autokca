import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { catalog } from '@/lib/catalog';
import { allDrafts, setPublished } from '@/lib/drafts';
import {
  SAME_QUESTION,
  WEEKLY_LIMIT,
  checkAi,
  checkContext,
  encodeNote,
  forbiddenWord,
  similarity,
} from '@/lib/questionGuard';
import { QUESTIONS } from '@/lib/questions';
import { rpc } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* 질문 자동 발행 — **주간 자동 수집만 부른다.**
 *
 * 🔴 2026-11-04부터 **통과하면 바로 사이트에 올라간다**(사용자 결정: 사람 손 없이).
 *    검수는 `lib/questionGuard.ts`가 대신한다. 내리는 건 `/admin`의 발행 취소이고,
 *    전부 멈추려면 환경변수 `AUTO_PUBLISH=off` — 그러면 예전처럼 대기함에만 쌓인다.
 *
 * 🔴 왜 별도 토큰인가: 클라우드 에이전트에는 `.env.local`이 없다. 그렇다고
 *    `SUPABASE_SERVICE_ROLE_KEY`를 루틴에 넣으면 **RLS를 우회하는 전체 권한 키가
 *    루틴 설정과 실행 로그에 남는다.** `ADMIN_TOKEN`도 안 된다 — 그건 발행까지 할 수 있다.
 *
 *    `INGEST_TOKEN`을 아는 쪽이 할 수 있는 일은 **검사를 통과한 새 질문을 주당 한도까지 올리는 것뿐**이다.
 *    기존 질문·표·댓글은 건드릴 수 없다. 새면 토큰을 바꾸고 `/admin`에서 내린다.
 *
 * 🔴 여기가 **자동 생성 콘텐츠가 들어오는 경계**다. 생산자를 믿지 않고 여기서 검증한다 —
 *    DB 제약만 믿으면 형식이 틀린 값이 500으로 튀고 원인을 찾기 어렵다.
 */

const TOPICS = new Set([
  'money', 'work', 'manners', 'life', 'office', 'commute', 'food', 'messenger',
]);

/** 선택지 길이 상한. 투표 칸 한 줄에 들어가야 한다 — 기존 최장이 11자다. */
const MAX_CHOICE = 14;
const MAX_Q = 60;

const ID_RE = /^[a-z0-9][a-z0-9-]{1,40}$/;
/** 슬러그는 한글을 쓴다. 공백·슬래시·물음표만 막으면 URL로 쓸 수 있다. */
const SLUG_BAD = /[\s/?#&%]/;

function authorized(request: Request): boolean {
  const want = process.env.INGEST_TOKEN?.trim();
  /* 토큰 미설정이면 아무도 통과 못 한다 */
  if (!want) return false;
  const got = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!got) return false;
  const a = Buffer.from(got, 'utf8');
  const b = Buffer.from(want, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

const takenIds = new Set(QUESTIONS.map(q => q.id));
const takenSlugs = new Set(QUESTIONS.map(q => q.slug));

export async function POST(request: Request) {
  if (!authorized(request)) return new NextResponse(null, { status: 404 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const items = Array.isArray(payload) ? payload : [payload];
  if (items.length === 0 || items.length > 30) {
    return NextResponse.json({ error: '1~30개만 보낼 수 있습니다.' }, { status: 400 });
  }

  const added: string[] = [];
  const published: string[] = [];
  const skipped: { id: string; why: string }[] = [];

  const auto = process.env.AUTO_PUBLISH?.trim() !== 'off';
  /* 이미 사이트에 있는 질문 문장. 이번 묶음에서 올린 것도 쌓아 서로 겹치지 않게 한다 */
  const live = (await catalog()).map(x => x.q);
  const weekAgo = Date.now() - 6 * 24 * 60 * 60 * 1000;
  let room =
    WEEKLY_LIMIT -
    (await allDrafts()).filter(d => d.publishedAt && Date.parse(d.publishedAt) > weekAgo).length;

  for (const raw of items) {
    const r = (raw ?? {}) as Record<string, unknown>;
    const str = (k: string) => (typeof r[k] === 'string' ? (r[k] as string).trim() : '');
    const id = str('id');
    const slug = str('slug');
    const q = str('q');
    const a = str('a');
    const b = str('b');
    const topic = str('topic');
    const kind = str('kind');
    const note = str('note').slice(0, 200);
    const checked = checkAi(r.ai);
    /* 배경 문단도 필수다 — 색인을 여는 조건이라(lib/tiers.ts) 없으면 검색에 안 나간다 */
    const ctx = checkContext(r.context);
    const word = forbiddenWord(
      q, a, b,
      'ai' in checked ? checked.ai.why : '',
      'context' in ctx ? ctx.context : '',
    );

    const bad =
      !ID_RE.test(id) ? 'id 형식(영문 kebab, 2~41자)' :
      !slug || SLUG_BAD.test(slug) || slug.length > 40 ? 'slug 형식(공백·/·?·# 금지, 40자 이내)' :
      !q || q.length > MAX_Q ? `질문 길이(1~${MAX_Q}자)` :
      !a || a.length > MAX_CHOICE ? `선택지 a 길이(1~${MAX_CHOICE}자)` :
      !b || b.length > MAX_CHOICE ? `선택지 b 길이(1~${MAX_CHOICE}자)` :
      a === b ? '선택지가 같다' :
      !TOPICS.has(topic) ? 'topic 값' :
      kind !== 'serious' && kind !== 'meme' ? 'kind 값' :
      /* 🔴 코드에 이미 있는 키는 받지 않는다. id가 겹치면 기존 질문의 표에 붙고
         slug이 겹치면 URL이 충돌한다 — 발행 후에는 못 고친다. */
      takenIds.has(id) ? '기존 질문과 id 중복' :
      takenSlugs.has(slug) ? '기존 질문과 slug 중복' :
      'error' in checked ? checked.error :
      'error' in ctx ? ctx.error :
      word ? `금지 소재("${word}")` :
      live.some(x => similarity(x, q) >= SAME_QUESTION) ? '이미 있는 질문과 거의 같다' :
      auto && room <= 0 ? `이번 주 한도(${WEEKLY_LIMIT}개) 초과` :
      null;

    if (bad || 'error' in checked || 'error' in ctx) {
      skipped.push({ id: id || '(id 없음)', why: bad ?? '' });
      continue;
    }

    const ok = await rpc(
      'add_draft',
      {
        d_id: id,
        d_slug: slug,
        d_q: q,
        d_a: a,
        d_b: b,
        d_topic: topic,
        d_kind: kind,
        d_note: encodeNote(note, checked.ai, ctx.context),
      },
      false,
    );
    if (ok === null) {
      return NextResponse.json(
        { error: '집계 서버가 연결되지 않았습니다.', added, skipped },
        { status: 503 },
      );
    }
    /* `add_draft` 는 `on conflict do nothing` 이라 이미 있으면 false를 준다 */
    if (ok !== true) {
      skipped.push({ id, why: 'id나 slug이 이미 대기함·발행분에 있음' });
      continue;
    }
    added.push(id);
    live.push(q);
    if (auto && (await setPublished(id, true))) {
      published.push(id);
      room -= 1;
    }
  }

  return NextResponse.json({ added: added.length, published, skipped, ids: added });
}
