/* 배포 직후 점검.
 *
 *   npm run check:deploy https://autokca.com
 *
 * 여기서 제일 자주 나는 사고는 **NEXT_PUBLIC_SITE_URL을 Vercel에 안 넣는 것**이다.
 * 그러면 사이트는 멀쩡히 뜨는데 canonical·사이트맵·OG가 전부 localhost를 가리켜
 * 검색엔진에 아무것도 등록되지 않는다. 눈으로는 안 보인다. 그래서 이 스크립트가 있다.
 */

const base = (process.argv[2] || '').replace(/\/$/, '');
if (!base || !/^https?:\/\//.test(base)) {
  console.log('\n사용법: npm run check:deploy https://autokca.com\n');
  process.exit(1);
}

const host = new URL(base).host;
const ok = s => `  \x1b[32m✓\x1b[0m ${s}`;
const bad = s => `  \x1b[31m✗\x1b[0m ${s}`;
const info = s => `  \x1b[90m·\x1b[0m ${s}`;
let failed = false;
const fail = (m, hint) => {
  failed = true;
  console.log(bad(m));
  if (hint) console.log(info(hint));
};

const get = (path, init) =>
  fetch(base + path, { redirect: 'manual', ...init }).catch(e => ({ ok: false, status: 0, _err: e }));

console.log(`\n${host} 점검\n`);

/* ── 0. 🔴 이 주소가 다른 데로 리다이렉트되나 ───────
   apex↔www가 어긋나면 사이트는 멀쩡히 뜨는데 canonical·사이트맵·**OG 이미지 URL**이
   전부 308이 된다. 카카오톡·페이스북은 이미지 리다이렉트를 안 따라가는 경우가 있어
   공유 카드가 안 뜬다 — 공유가 주 유입 경로인 사이트에서 제일 아픈 실패다. */
{
  const r = await get('/');
  if (r.status >= 300 && r.status < 400) {
    const loc = r.headers?.get('location') ?? '(없음)';
    let target = '';
    try {
      target = new URL(loc).host;
    } catch {
      /* 상대 경로면 호스트가 없다 */
    }

    console.log(bad(`이 주소가 ${r.status}로 리다이렉트됩니다 → ${loc}`));
    if (target && target !== host) {
      const apexVsWww = target.replace(/^www\./, '') === host.replace(/^www\./, '');
      if (apexVsWww) {
        console.log(info(`apex↔www 불일치입니다. 실제 서비스 도메인은 ${target} 입니다.`));
        console.log(info('둘 중 하나를 고르세요 —'));
        console.log(info(`  (1) Vercel → Settings → Domains 에서 ${host} 를 Primary로 바꾼다`));
        console.log(info(`  (2) NEXT_PUBLIC_SITE_URL 을 https://${target} 로 바꾸고 재배포한다`));
        console.log(info('무엇을 골라도 **환경변수와 실제 도메인이 같아야** 합니다.'));
      }
      console.log(info(`지금 상태를 보려면: npm run check:deploy https://${target}`));
    }
    console.log('');
    process.exit(1);
  }
}

/* ── 1. 기본 라우트 ─────────────────────────────── */
console.log('라우트');
const routes = ['/', '/q', '/best', '/me', '/about', '/terms', '/privacy', '/robots.txt', '/sitemap.xml'];
for (const p of routes) {
  const r = await get(p);
  if (r.status === 200) console.log(ok(`${p}`));
  else fail(`${p} → ${r.status || r._err?.message}`);
}

/* ── 2. 🔴 환경변수가 실제로 들어갔나 ─────────────── */
console.log('\n환경변수가 반영됐나');
{
  const xml = await (await get('/sitemap.xml')).text?.() ?? '';
  if (/localhost/.test(xml)) {
    fail('사이트맵이 localhost를 가리킨다',
         'Vercel에 NEXT_PUBLIC_SITE_URL을 등록하고 **재배포**하세요. 빌드 시각에 박히는 값입니다.');
  } else if (xml.includes(base)) {
    console.log(ok(`사이트맵이 ${host}를 가리킨다`));
    console.log(info(`URL ${(xml.match(/<loc>/g) || []).length}개`));
  } else {
    const loc = (xml.match(/<loc>([^<]+)<\/loc>/) || [])[1] ?? '';
    let sitemapHost = '';
    try {
      sitemapHost = new URL(loc).host;
    } catch {
      /* 파싱 실패 */
    }
    fail(
      `사이트맵이 ${sitemapHost || '다른 도메인'}을 가리킨다 (여기는 ${host})`,
      'NEXT_PUBLIC_SITE_URL과 실제 서비스 도메인이 어긋났습니다. '
        + 'canonical·사이트맵·OG 이미지 URL이 전부 리다이렉트를 타게 됩니다.',
    );
  }

  const home = await (await get('/')).text?.() ?? '';
  const canon = (home.match(/rel="canonical" href="([^"]+)"/) || [])[1];
  if (!canon) fail('canonical 태그가 없다');
  else if (canon.includes('localhost')) fail(`canonical이 localhost다 (${canon})`);
  else console.log(ok(`canonical = ${canon}`));
}

/* ── 3. 집계 서버가 붙었나 ──────────────────────── */
console.log('\n집계 서버');
{
  const r = await get('/api/vote?id=phone-toilet');
  if (r.status !== 200) {
    fail(`/api/vote → ${r.status}`);
  } else {
    const d = await r.json();
    if (d.live) console.log(ok(`집계 연결됨 (현재 ${d.a + d.b}표)`));
    else fail('집계 서버가 안 붙었다 (live: false)',
              'Vercel에 SUPABASE_URL·SUPABASE_SERVICE_ROLE_KEY를 등록하고 재배포하세요.');
  }
}

/* ── 4. 질문 페이지 + 구조화 데이터 ──────────────── */
console.log('\n질문 페이지');
{
  const slug = encodeURIComponent('축의금-5만원');
  const r = await get(`/q/${slug}`);
  if (r.status !== 200) {
    fail(`/q/축의금-5만원 → ${r.status}`);
  } else {
    const html = await r.text();
    console.log(ok('한글 슬러그 라우트'));
    console.log(
      /"@type":"DiscussionForumPosting"/.test(html)
        ? ok('DiscussionForumPosting')
        : bad('구조화 데이터 없음'),
    );
    const robots = (html.match(/name="robots" content="([^"]+)"/) || [])[1];
    console.log(info(`robots: ${robots ?? '(없음 = index)'}${
      robots?.includes('noindex') ? ' — 표가 적어서 정상입니다(thin content 게이트)' : ''}`));
  }
  const r404 = await get(`/q/${encodeURIComponent('없는질문입니다')}`);
  console.log(r404.status === 404 ? ok('없는 슬러그 → 404') : bad(`없는 슬러그 → ${r404.status} (soft-404)`));
}

/* ── 5. OG 이미지 ───────────────────────────────── */
console.log('\nOG 이미지');
for (const p of ['/opengraph-image', `/q/${encodeURIComponent('축의금-5만원')}/opengraph-image`]) {
  const r = await get(p);
  if (r.status !== 200) {
    fail(`${p} → ${r.status}`, 'Vercel 함수 로그를 확인하세요.');
    continue;
  }
  const buf = Buffer.from(await r.arrayBuffer());
  const isPng = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const kb = Math.round(buf.length / 1024);
  if (!isPng) fail(`${p} — PNG가 아니다`);
  else console.log(ok(`${p} · ${kb}KB`));
}
console.log(info('한글이 실제로 그려졌는지는 눈으로 봐야 합니다 —'));
console.log(info('폰트가 안 먹으면 한글 대신 "OTTOKE?!"만 있는 폴백이 나갑니다.'));

/* ── 5-2. 검색엔진 소유 확인 ─────────────────────── */
console.log('\n검색엔진 소유 확인');
{
  const html = await (await get('/')).text();
  const g = /name="google-site-verification"/.test(html);
  const n = /name="naver-site-verification"/.test(html);
  console.log(g ? ok('google-site-verification') : info('google-site-verification 없음 (GSC 등록 전)'));
  console.log(n ? ok('naver-site-verification') : info('naver-site-verification 없음 (네이버 등록 전)'));
  if (!n) console.log(info('한국 서비스라 네이버 비중이 큽니다. 구글만 하고 끝내지 마세요.'));
}

/* ── 6. 보안 헤더 ───────────────────────────────── */
console.log('\n헤더');
{
  const r = await get('/');
  const want = {
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'x-frame-options': 'SAMEORIGIN',
  };
  for (const [k, v] of Object.entries(want)) {
    const got = r.headers?.get(k);
    console.log(got === v ? ok(`${k}: ${got}`) : bad(`${k}: ${got ?? '없음'} (기대 ${v})`));
  }
  const robotsTag = r.headers?.get('x-robots-tag');
  if (robotsTag) {
    console.log(info(`x-robots-tag: ${robotsTag} — 프리뷰 배포입니다. 프로덕션이면 없어야 합니다.`));
  }
}

console.log(`\n${failed ? '\x1b[31m일부 실패 — 위 항목을 보세요\x1b[0m' : '\x1b[32m전부 통과\x1b[0m'}\n`);
process.exit(failed ? 1 : 0);
