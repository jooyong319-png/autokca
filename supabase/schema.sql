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
