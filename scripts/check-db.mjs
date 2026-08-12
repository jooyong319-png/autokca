/* Supabase 연결 점검.
 *
 * 세팅에서 제일 자주 막히는 건 "키는 넣었는데 되는지 모르겠다"다.
 * 이 스크립트는 환경변수부터 RPC 하나하나까지 순서대로 확인하고, 어디서 끊겼는지 말해 준다.
 *
 *   npm run check:db
 *
 * 쓰기 검증은 `__selftest__`라는 가짜 질문 id로 한다. 사이트는 `lib/questions.ts`에 없는 id를
 * 거부하므로 이 행은 화면에 절대 나오지 않는다. 지우고 싶으면 스크립트가 알려주는 SQL 한 줄.
 */

import { readFileSync } from 'node:fs';

const TEST_ID = '__selftest__';
const ok = (s) => `  \x1b[32m✓\x1b[0m ${s}`;
const bad = (s) => `  \x1b[31m✗\x1b[0m ${s}`;
const info = (s) => `  \x1b[90m·\x1b[0m ${s}`;

/** .env.local을 직접 읽는다 — 의존성을 추가하지 않기 위해 */
function loadEnv() {
  const env = { ...process.env };
  try {
    const text = readFileSync('.env.local', 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      const value = m[2].trim().replace(/^["']|["']$/g, '');
      if (value) env[m[1]] = value;
    }
  } catch {
    /* 파일이 없으면 process.env만 쓴다 */
  }
  return env;
}

const env = loadEnv();
const url = env.SUPABASE_URL?.replace(/\/$/, '');
const key = env.SUPABASE_SERVICE_ROLE_KEY;

let failed = false;
const fail = (msg, hint) => {
  failed = true;
  console.log(bad(msg));
  if (hint) console.log(info(hint));
};

console.log('\n환경변수');

if (!env.NEXT_PUBLIC_SITE_URL) {
  console.log(bad('NEXT_PUBLIC_SITE_URL 없음'));
  console.log(info('없으면 canonical·사이트맵·OG가 localhost를 가리킨다'));
} else {
  console.log(ok(`NEXT_PUBLIC_SITE_URL = ${env.NEXT_PUBLIC_SITE_URL}`));
}

if (!url) {
  fail('SUPABASE_URL 없음', '.env.local에 추가하세요. 없으면 사이트는 결과를 감춘 상태로 돌아갑니다.');
} else if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) {
  fail(`SUPABASE_URL 형식이 이상함: ${url}`,
       'https://<프로젝트ID>.supabase.co 형식이어야 합니다. https:// 빠지면 Invalid URL이 납니다.');
} else {
  console.log(ok(`SUPABASE_URL = ${url}`));
}

/* 키 종류 세 가지를 구분한다.
     · `sb_secret_…`      신형 secret — 권장
     · `eyJ…`             구형 service_role JWT — **신규 프로젝트에서는 꺼져 있을 수 있다**
     · `sb_publishable_…` anon 대응 — RLS에 막혀 쓰기가 실패한다 (제일 흔한 실수) */
let legacyJwt = false;

if (!key) {
  fail('SUPABASE_SERVICE_ROLE_KEY 없음');
} else if (key.startsWith('sb_publishable_')) {
  fail('publishable(anon) 키가 들어 있음',
       'secret 키가 필요합니다. anon 키는 RLS에 막혀 집계를 못 씁니다.');
} else if (key.startsWith('sb_secret_')) {
  console.log(ok(`SUPABASE_SERVICE_ROLE_KEY = ${key.slice(0, 14)}… (신형 secret)`));
} else if (key.startsWith('eyJ')) {
  legacyJwt = true;
  /* JWT는 암호화가 아니라 인코딩이다 — 페이로드에서 역할·프로젝트·만료를 바로 읽을 수 있다.
     "다른 프로젝트 키를 붙였다"는 사고를 여기서 잡는다. */
  const parts = key.split('.');
  let payload = null;
  try {
    payload = JSON.parse(Buffer.from(parts[1] ?? '', 'base64url').toString('utf8'));
  } catch {
    /* 해독이 안 되면 아래에서 형식 문제로 보고한다 */
  }

  if (parts.length !== 3 || !payload) {
    fail('구형 JWT인데 형태가 깨졌음', '복사할 때 앞뒤가 잘렸는지 확인하세요.');
  } else {
    const urlRef = (url.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/) ?? [])[1];
    if (payload.role !== 'service_role') {
      fail(`키의 역할이 service_role이 아님 (role: ${payload.role})`,
           'anon 키로는 집계를 쓸 수 없습니다.');
    } else if (urlRef && payload.ref && urlRef !== payload.ref) {
      fail('URL과 키가 서로 다른 프로젝트',
           `URL은 ${urlRef}, 키는 ${payload.ref} 입니다.`);
    } else if (payload.exp && payload.exp * 1000 < Date.now()) {
      fail('키가 만료됨', new Date(payload.exp * 1000).toISOString().slice(0, 10));
    } else {
      console.log(ok(`SUPABASE_SERVICE_ROLE_KEY = eyJ… (구형 JWT · role ${payload.role})`));
      console.log(info('신규 프로젝트는 구형 JWT가 꺼져 있을 수 있습니다. 실패하면 sb_secret_ 키를 쓰세요.'));
    }
  }
} else {
  console.log(ok(`SUPABASE_SERVICE_ROLE_KEY = ${key.slice(0, 12)}… (형식은 못 알아봤지만 시도합니다)`));
}

if (failed || !url || !key) {
  console.log('\n환경변수부터 채워야 다음 단계를 볼 수 있습니다.\n');
  process.exit(1);
}

async function rpc(fn, body) {
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, ok: res.ok, data };
}

console.log('\n연결');
{
  const r = await rpc('read_tally', { qid: TEST_ID });
  if (r.status === 401 || r.status === 403) {
    const msg = typeof r.data === 'object' && r.data ? r.data.message : '';
    fail(`인증 실패 (${r.status}) ${msg ? `— ${msg}` : ''}`);
    /* 🔴 실제로 겪은 사고: 구조가 멀쩡하고 ref·role·만료가 다 맞는 JWT인데도
       "Invalid API key"가 났다. 원인은 **그 프로젝트에서 레거시 JWT 키가 비활성**이었던 것.
       신규 프로젝트는 sb_publishable_/sb_secret_ 체계를 기본으로 쓴다. */
    if (legacyJwt) {
      console.log(info('구형 JWT를 쓰고 있습니다. 키 자체가 멀쩡해도 이 에러가 납니다 —'));
      console.log(info('이 프로젝트에서 **레거시 JWT 키가 비활성**일 가능성이 큽니다.'));
      console.log(info('→ Project Settings → API Keys 에서 `sb_secret_…` 키로 바꾸세요.'));
    } else {
      console.log(info('키가 이 프로젝트 것인지, 앞뒤가 잘리지 않았는지 확인하세요.'));
    }
    process.exit(1);
  }
  if (r.status === 404) {
    fail('read_tally 함수가 없음 (404)',
         'supabase/schema.sql을 SQL Editor에 붙여 실행하세요. 아직 안 만든 상태입니다.');
    process.exit(1);
  }
  if (!r.ok) {
    fail(`예상 못 한 응답 ${r.status}`, JSON.stringify(r.data).slice(0, 300));
    process.exit(1);
  }
  console.log(ok('연결·인증·스키마 확인'));
}

console.log('\n함수');
const checks = [
  ['read_tally',     { qid: TEST_ID }],
  ['all_tallies',    {}],
  ['list_comments',  { qid: TEST_ID, lim: 5 }],
  ['top_comment',    { qid: TEST_ID, sd: 'a' }],
  ['comment_counts', { qid: TEST_ID }],
];
for (const [fn, body] of checks) {
  const r = await rpc(fn, body);
  if (r.ok) console.log(ok(fn));
  else fail(`${fn} — ${r.status}`, JSON.stringify(r.data).slice(0, 200));
}

console.log('\n쓰기 (가짜 질문 id로만)');
{
  const before = await rpc('read_tally', { qid: TEST_ID });
  const a0 = Array.isArray(before.data) ? (before.data[0]?.a ?? 0) : 0;

  const v = await rpc('cast_vote', { qid: TEST_ID, ch: 'a' });
  const a1 = Array.isArray(v.data) ? (v.data[0]?.a ?? -1) : -1;
  if (v.ok && a1 === a0 + 1) console.log(ok(`cast_vote — 표가 ${a0} → ${a1}로 올랐다`));
  else fail('cast_vote', JSON.stringify(v.data).slice(0, 200));

  const c = await rpc('add_comment', { qid: TEST_ID, sd: 'a', txt: '연결 점검용 댓글' });
  const cid = Array.isArray(c.data) ? c.data[0]?.id : null;
  if (c.ok && cid) console.log(ok(`add_comment — id ${cid}`));
  else fail('add_comment', JSON.stringify(c.data).slice(0, 200));

  if (cid) {
    const l = await rpc('like_comment', { cid });
    if (l.ok) console.log(ok(`like_comment — 공감 ${JSON.stringify(l.data)}`));
    else fail('like_comment', JSON.stringify(l.data).slice(0, 200));

    const t = await rpc('top_comment', { qid: TEST_ID, sd: 'a' });
    const found = Array.isArray(t.data) && t.data.length > 0;
    if (t.ok && found) console.log(ok('top_comment — 방금 쓴 댓글이 1위로 잡힘'));
    else fail('top_comment가 방금 쓴 댓글을 못 찾음', JSON.stringify(t.data).slice(0, 200));

    /* 신고 임계치(3)를 확인한다 — 자동 숨김이 실제로 도는지 */
    let hidden = false;
    for (let i = 0; i < 3; i++) {
      const r = await rpc('report_comment', { cid });
      hidden = Array.isArray(r.data) ? r.data[0] === true : r.data === true;
    }
    if (hidden) console.log(ok('report_comment — 신고 3회에 자동 숨김 동작'));
    else fail('신고 3회에도 숨겨지지 않음', 'report_threshold() 값을 확인하세요.');
  }
}

console.log(`
${failed ? '\x1b[31m일부 실패\x1b[0m' : '\x1b[32m전부 통과\x1b[0m'} — 점검용 행을 지우려면 SQL Editor에서:

  delete from public.comments where question_id = '${TEST_ID}';
  delete from public.tallies  where question_id = '${TEST_ID}';
`);

process.exit(failed ? 1 : 0);
