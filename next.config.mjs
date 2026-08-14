/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  /* OG 이미지 라우트가 런타임에 fs로 읽는 폰트 파일. 이게 없으면 Vercel 번들에서
     빠져나가 공유 이미지가 폴백(한글 없는 버전)으로 떨어진다. assets/README.md 참고. */
  experimental: {
    outputFileTracingIncludes: {
      '/opengraph-image': ['./assets/**'],
      '/q/[slug]/opengraph-image': ['./assets/**'],
    },
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          /* 🔴 `X-Frame-Options: SAMEORIGIN`을 **CSP로 교체**했다.
           *
           *  구글 태그 어시스턴트는 사이트를 `tagassistant.google.com` 안에 **iframe으로 띄워서**
           *  검사한다. SAMEORIGIN은 다른 오리진의 프레이밍을 전부 막으므로 어시스턴트가
           *  페이지를 못 열고, GA 태그가 멀쩡해도 "감지되지 않음"이 뜬다.
           *  (딱칼크에서 실제로 겪었다 — 통합 위키 `nextjs.md`)
           *
           *  `X-Frame-Options`에는 예외를 둘 수 없다(`ALLOW-FROM`은 폐기됐다).
           *  CSP `frame-ancestors`는 허용 목록을 받는다. 나열한 도메인 외에는 그대로
           *  차단되므로 클릭재킹 방어 수준은 유지된다.
           *
           *  ⚠️ 두 헤더가 함께 있으면 브라우저마다 우선순위가 갈리므로
           *     `X-Frame-Options`는 **제거**한다. 남겨 두면 CSP가 무력해질 수 있다. */
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://tagassistant.google.com https://tagmanager.google.com",
          },
        ],
      },
    ];
  },

  /* 프로덕션의 vercel.app 별칭만 정규 도메인으로 보낸다.
   *
   * 🔴 조건 없이 걸면 **브랜치 프리뷰까지 프로덕션으로 날아가 미리보기가 무용지물이 된다.**
   *    프리뷰는 위 X-Robots-Tag로 색인만 막고 살려 둔다.
   * 🔴 목적지를 하드코딩하지 않는다(브리프 §10) — NEXT_PUBLIC_SITE_URL을 쓴다.
   *    투표 API는 리다이렉트하면 POST가 깨지므로 제외한다. */
  async redirects() {
    const canonical = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
    if (process.env.VERCEL_ENV !== 'production' || !canonical) return [];
    if (canonical.includes('vercel.app') || canonical.startsWith('http://localhost')) return [];

    return [
      {
        source: '/:path((?!api/).*)',
        has: [{ type: 'host', value: '(?<sub>.*)\\.vercel\\.app' }],
        destination: `${canonical}/:path`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
