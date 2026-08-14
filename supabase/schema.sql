-- 오또케 투표 집계 스키마
--
-- Supabase 프로젝트를 만든 뒤 SQL Editor에 그대로 붙여 실행한다.
-- 질문별 카운터 두 개 + 댓글. 댓글이 생긴 순간부터 모더레이션 의무와
-- 개인정보처리방침이 따라온다 — 부담은 받는 단계에서 거르는 방식으로 깎았다(lib/comments.ts).

create table if not exists public.tallies (
  question_id text primary key,
  a           integer not null default 0,
  b           integer not null default 0,
  updated_at  timestamptz not null default now()
);

-- RLS를 켜고 정책을 두지 않는다. 아래 함수만 security definer로 뚫어
-- 서비스 키를 가진 서버에서만 집계를 만지게 한다.
alter table public.tallies enable row level security;

-- 집계 읽기
create or replace function public.read_tally(qid text)
returns table (a integer, b integer)
language sql
security definer
set search_path = public
as $$
  select coalesce(t.a, 0), coalesce(t.b, 0)
  from (select qid) q
  left join public.tallies t on t.question_id = qid;
$$;

-- 한 표 넣기. upsert + 원자적 증가를 한 문장으로 처리한다 —
-- 읽고 나서 쓰면 동시 투표가 유실된다.
create or replace function public.cast_vote(qid text, ch text)
returns table (a integer, b integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  if ch not in ('a', 'b') then
    raise exception 'choice must be a or b, got %', ch;
  end if;

  insert into public.tallies as t (question_id, a, b)
  values (qid, case when ch = 'a' then 1 else 0 end,
               case when ch = 'b' then 1 else 0 end)
  on conflict (question_id) do update
    set a = t.a + case when ch = 'a' then 1 else 0 end,
        b = t.b + case when ch = 'b' then 1 else 0 end,
        updated_at = now();

  return query
    select t.a, t.b from public.tallies t where t.question_id = qid;
end;
$$;

-- ─── 기타 의견(댓글) ──────────────────────────────────────────────
--
-- ⚠️ 여기서부터 이 사이트에 사용자 텍스트가 생긴다. 그 대가로 딸려오는 것:
--    모더레이션 의무 · 애드센스 UGC 정책 · 개인정보처리방침 필수.
--    사람 손이 최소로 들어가게 구조로 막는다 — 기표한 사람만, 80자, 링크 금지,
--    1안건 1개, 신고 누적 시 자동 숨김.

create table if not exists public.comments (
  id          bigserial primary key,
  question_id text        not null,
  side        text        not null check (side in ('a', 'b')),
  body        text        not null check (char_length(body) between 2 and 80),
  likes       integer     not null default 0,
  reports     integer     not null default 0,
  hidden      boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- 목록은 항상 "안건 하나의 안 숨겨진 의견을 최신순으로"라서 이 인덱스 하나면 된다
create index if not exists comments_visible_idx
  on public.comments (question_id, created_at desc)
  where not hidden;

alter table public.comments enable row level security;

/* 신고가 이만큼 쌓이면 자동으로 숨긴다. 운영자가 매일 볼 수 없다는 전제로 잡은 값 —
   낮으면 정상 의견이 사라지고, 높으면 욕설이 오래 남는다. */
create or replace function public.report_threshold() returns integer
language sql immutable as $$ select 3 $$;

create or replace function public.list_comments(qid text, lim integer default 50)
returns table (id bigint, side text, body text, likes integer, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select c.id, c.side, c.body, c.likes, c.created_at
  from public.comments c
  where c.question_id = qid and not c.hidden
  order by c.created_at desc
  limit least(greatest(lim, 1), 200);
$$;

create or replace function public.add_comment(qid text, sd text, txt text)
returns table (id bigint, side text, body text, likes integer, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare new_id bigint;
begin
  if sd not in ('a', 'b') then
    raise exception 'side must be a or b, got %', sd;
  end if;

  insert into public.comments (question_id, side, body)
  values (qid, sd, btrim(txt))
  returning comments.id into new_id;

  return query
    select c.id, c.side, c.body, c.likes, c.created_at
    from public.comments c where c.id = new_id;
end;
$$;

create or replace function public.like_comment(cid bigint)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.comments set likes = likes + 1
  where id = cid and not hidden
  returning likes;
$$;

-- 신고는 카운터를 올리고, 임계치에 닿는 순간 같은 문장에서 숨긴다
create or replace function public.report_comment(cid bigint)
returns boolean
language sql
security definer
set search_path = public
as $$
  update public.comments
  set reports = reports + 1,
      hidden  = (reports + 1) >= public.report_threshold()
  where id = cid
  returning hidden;
$$;

-- anon 역할에는 아무 권한도 주지 않는다. 서버(서비스 키)만 호출한다.
revoke all on function public.read_tally(text) from anon, authenticated;
revoke all on function public.cast_vote(text, text) from anon, authenticated;

-- 기표 번복 — 한 쪽을 빼고 다른 쪽에 더한다. **취소는 없다**(함수 자체를 만들지 않는다).
--
-- 🔴 합계가 늘어나면 안 된다. 번복은 표를 옮기는 것이지 새로 만드는 것이 아니다.
--    그래서 감소와 증가를 **한 update 안에서** 한다 — 두 번 부르면 그 사이에 합계가 틀린다.
--
-- ⚠️ 빼려는 쪽이 이미 0인 경우: 쿠키는 "이 사람은 기표했다"고 하는데 DB에는 그 표가 없는
--    상태다(집계를 초기화했거나 검증 데이터를 지웠을 때 실제로 생긴다).
--    그때 0에서 더 빼면 음수가 되고, 그냥 더하기만 하면 합계가 1 늘어난다.
--    **음수를 만들지 않는 쪽을 택한다** — 음수 득표는 화면에서 즉시 버그로 읽히고
--    퍼센트 계산까지 망가진다. 이 경우는 DB가 이미 표를 잃은 상태이므로
--    합계가 1 늘어나는 것이 아니라 잃었던 유권자 1명이 제자리를 찾는 것에 가깝다.
create or replace function public.change_vote(qid text, from_ch text, to_ch text)
returns table (a integer, b integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  if from_ch not in ('a', 'b') or to_ch not in ('a', 'b') then
    raise exception 'choice must be a or b, got % -> %', from_ch, to_ch;
  end if;

  -- 같은 쪽을 다시 누른 것 — 아무것도 하지 않고 현재 집계만 돌려준다
  if from_ch = to_ch then
    return query select t.a, t.b from public.tallies t where t.question_id = qid;
    return;
  end if;

  update public.tallies as t
     set a = case
               when to_ch = 'a' then t.a + 1
               when t.a > 0     then t.a - 1
               else 0
             end,
         b = case
               when to_ch = 'b' then t.b + 1
               when t.b > 0     then t.b - 1
               else 0
             end,
         updated_at = now()
   where t.question_id = qid;

  return query
    select t.a, t.b from public.tallies t where t.question_id = qid;
end;
$$;
revoke all on function public.change_vote(text, text, text) from anon, authenticated;
revoke all on function public.list_comments(text, integer) from anon, authenticated;
revoke all on function public.add_comment(text, text, text) from anon, authenticated;
revoke all on function public.like_comment(bigint) from anon, authenticated;
revoke all on function public.report_comment(bigint) from anon, authenticated;

-- 전체 집계 한 번에 — 집계 페이지(/best)가 질문 100개의 득표를 한 요청으로 받는다.
-- 질문마다 read_tally를 부르면 100번 왕복한다.
--
-- ⚠️ PostgREST의 max-rows 기본값은 1000이다. 질문이 1000개를 넘으면 여기서 조용히 잘린다.
--    그때는 이 함수에 페이지네이션을 넣거나 집계를 미리 계산해 둘 것.
create or replace function public.all_tallies()
returns table (question_id text, a integer, b integer)
language sql
security definer
set search_path = public
as $$
  select t.question_id, t.a, t.b from public.tallies t;
$$;

-- 진영별 최고 추천 댓글 1개.
-- 🔴 "상대편 최고 추천"을 항상 상단에 노출하는 데 쓴다(브리프 §4) —
--    에코챔버를 막고, 반박 욕구가 참여율을 올린다.
--    최신 50개 안에 없을 수도 있으므로 목록과 별도로 조회한다.
create or replace function public.top_comment(qid text, sd text)
returns table (id bigint, side text, body text, likes integer, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select c.id, c.side, c.body, c.likes, c.created_at
  from public.comments c
  where c.question_id = qid and c.side = sd and not c.hidden
  order by c.likes desc, c.created_at desc
  limit 1;
$$;

-- 진영별 댓글 수 — 2열 머리글에 표시한다
create or replace function public.comment_counts(qid text)
returns table (a integer, b integer)
language sql
security definer
set search_path = public
as $$
  select
    count(*) filter (where c.side = 'a')::integer,
    count(*) filter (where c.side = 'b')::integer
  from public.comments c
  where c.question_id = qid and not c.hidden;
$$;

revoke all on function public.all_tallies() from anon, authenticated;
revoke all on function public.top_comment(text, text) from anon, authenticated;
revoke all on function public.comment_counts(text) from anon, authenticated;

-- 질문별 댓글 수 한 번에 — 사이트맵이 thin content를 걸러내는 데 쓴다.
-- 질문마다 comment_counts를 부르면 100번 왕복한다.
-- ⚠️ PostgREST max-rows 기본 1000. 질문이 1000개를 넘으면 조용히 잘린다.
create or replace function public.all_comment_counts()
returns table (question_id text, n integer)
language sql
security definer
set search_path = public
as $$
  select c.question_id, count(*)::integer
  from public.comments c
  where not c.hidden
  group by c.question_id;
$$;

revoke all on function public.all_comment_counts() from anon, authenticated;

-- 질문·진영별 최고 추천 댓글을 **한 번에** — 피드 카드의 댓글 미리보기에 쓴다(6차 §2-1).
-- 카드마다 top_comment를 두 번씩 부르면 3장만 그려도 왕복이 6번이다.
--
-- 🔴 미리보기를 **서버에서** 넣어야 하는 이유: 클라이언트가 나중에 채우면 카드 높이가
--    바뀌고, 그게 scroll-snap 위치를 무너뜨린다. 사용자가 방금 맞춘 자리에서 밀려난다.
--
-- distinct on (question_id, side)로 진영별 1행만 남긴다. order by의 앞 두 칼럼이
-- distinct on과 같아야 한다(Postgres 요구사항).
-- 정렬 기준은 top_comment와 동일하게 유지한다 — 상세와 카드가 다른 댓글을 1위로
-- 보여주면 사용자가 버그로 읽는다.
-- ⚠️ PostgREST max-rows 기본 1000. 질문 1000개를 넘으면 조용히 잘린다(all_tallies와 동일).
create or replace function public.all_top_comments()
returns table (question_id text, side text, id bigint, body text, likes integer)
language sql
security definer
set search_path = public
as $$
  select distinct on (c.question_id, c.side)
         c.question_id, c.side, c.id, c.body, c.likes
  from public.comments c
  where not c.hidden
  order by c.question_id, c.side, c.likes desc, c.created_at desc;
$$;
revoke all on function public.all_top_comments() from anon, authenticated;

-- ─── 질문 후보·발행 (2026-08-15) ──────────────────────────────────
--
-- 🔴 **기존 103개는 코드(`lib/questions.ts`)에 그대로 둔다.** 여기는 그 뒤에 추가되는 것만 담는다.
--
--    왜 전부 옮기지 않는가: 질문이 전부 DB에 있으면 Supabase가 죽는 순간 **질문이 하나도
--    없는 빈 사이트**가 된다. 지금 설계는 집계만 감추고 질문은 보인다 — 그 내성을 유지한다.
--    코드의 103개가 항상 있는 바닥이고, 이 테이블은 그 위에 얹힌다.
--
-- 🔴 `id`는 `tallies.question_id`·`comments.question_id`와 같은 키다. 발행 후 절대 바꾸지 않는다.
--    바꾸면 그 질문의 표와 댓글이 통째로 끊긴다.
create table if not exists public.drafts (
  id          text primary key,
  slug        text not null unique,
  q           text not null,
  a           text not null,
  b           text not null,
  topic       text not null check (topic in
                ('money','work','manners','life','office','commute','food','messenger')),
  kind        text not null check (kind in ('serious','meme')),
  -- null이면 대기, 값이 있으면 발행 시각. 발행된 것만 사이트에 나간다.
  published_at timestamptz,
  -- 자동 수집이 남기는 근거 한 줄(사람이 검수할 때 본다)
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists drafts_published_idx on public.drafts (published_at);

-- 발행된 질문만. 사이트가 코드의 103개와 **합쳐서** 쓴다.
create or replace function public.published_questions()
returns table (id text, slug text, q text, a text, b text, topic text, kind text)
language sql
security definer
set search_path = public
as $$
  select d.id, d.slug, d.q, d.a, d.b, d.topic, d.kind
  from public.drafts d
  where d.published_at is not null
  order by d.published_at;
$$;
revoke all on function public.published_questions() from anon, authenticated;

-- 대기 중 + 발행됨 전체. **관리 화면에서만** 쓴다.
create or replace function public.all_drafts()
returns table (id text, slug text, q text, a text, b text, topic text, kind text,
               published_at timestamptz, note text, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select d.id, d.slug, d.q, d.a, d.b, d.topic, d.kind, d.published_at, d.note, d.created_at
  from public.drafts d
  order by d.published_at nulls first, d.created_at desc;
$$;
revoke all on function public.all_drafts() from anon, authenticated;

-- 후보 적재(자동 수집이 부른다). id가 겹치면 아무것도 하지 않는다 —
-- 이미 발행된 질문을 덮어써서 문구가 바뀌면 이미 던져진 표가 다른 질문의 답이 되어 버린다.
create or replace function public.add_draft(
  d_id text, d_slug text, d_q text, d_a text, d_b text,
  d_topic text, d_kind text, d_note text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.drafts (id, slug, q, a, b, topic, kind, note)
  values (d_id, d_slug, d_q, d_a, d_b, d_topic, d_kind, d_note)
  on conflict do nothing;
  return found;
end;
$$;
revoke all on function public.add_draft(text, text, text, text, text, text, text, text)
  from anon, authenticated;

-- 발행 / 발행 취소. 🔴 **발행 취소는 표를 지우지 않는다** — 화면에서 내릴 뿐이다.
-- 표를 지우면 "아까 N명이었는데"가 되고 그건 집계 신뢰를 깎는다.
create or replace function public.set_draft_published(d_id text, on_off boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.drafts
     set published_at = case when on_off then coalesce(published_at, now()) else null end
   where id = d_id;
  return found;
end;
$$;
revoke all on function public.set_draft_published(text, boolean) from anon, authenticated;
