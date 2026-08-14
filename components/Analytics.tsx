import { GA_ID, SITE } from '@/lib/site';

/* 🔴 서드파티 태그는 **생 `<script>`로 `<head>`에 박는다.** `next/script`를 쓰지 않는다.
 *
 *  딱칼크에서 겪은 함정(통합 위키 `nextjs.md`): App Router에서 `strategy="afterInteractive"`가
 *  만드는 SSR 응답에는 preload 힌트와 **RSC 페이로드 문자열**뿐이고, 실제 `<script>`는
 *  하이드레이션 후에 JS가 주입한다. 그래서 이렇게 갈린다.
 *
 *    · 실제 브라우저        → 동작함 (`/g/collect`까지 정상)
 *    · 구글 태그 감지·심사  → **못 봄** (HTML만 읽고 하이드레이션을 기다리지 않는다)
 *
 *  `curl | grep googletagmanager`는 preload·RSC 문자열에도 걸려서 **통과한다** —
 *  그래서 "배포됐다"고 착각하기 쉽다. 검증하려면 문자열이 아니라 **형태**를 봐야 한다
 *  (진짜 `<script>` 태그인지, `</head>` 앞인지).
 *
 *  `async`라 렌더를 막지 않으므로 `next/script`를 쓸 이득이 애초에 거의 없다.
 *  `beforeInteractive`는 HTML에 들어가지만 렌더를 막아서 분석 태그에는 과하다.
 */

export function Analytics() {
  const id = GA_ID;
  if (!id) return null;

  /* 🔴 `NODE_ENV`로 가르면 안 된다. `npm run build` 결과물은 **로컬에서도 전부 `production`**이라
     내 발자국이 지표에 섞인다. Vercel의 `VERCEL_ENV`는 운영 배포에서만 `'production'`이고
     프리뷰·로컬은 비어 있다. 정적 생성이면 이 판단이 빌드 시점에 확정돼 HTML에 박힌다.

     ⚠️ 이 파일은 **서버 컴포넌트**다. 그래서 `NEXT_PUBLIC_` 접두사를 쓰지 않는다 —
     측정 ID는 어차피 HTML에 박히므로 비밀은 아니지만, 접두사를 붙이면 클라이언트
     번들에도 불필요하게 들어간다. */
  if (process.env.VERCEL_ENV !== 'production') return null;

  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${id}`} />
      <script
        /* 🔴 라우트 이동을 **수동으로 추적하지 않는다.**
           GA4의 향상된 측정에 "브라우저 기록 이벤트 기반 페이지 변경"이 기본으로 켜져 있고,
           App Router는 `pushState`로 이동하므로 자동으로 잡힌다.
           여기에 `usePathname()`으로 `page_view`를 또 쏘면 **이중 집계**가 된다.
           (GA4 속성에서 그 옵션을 끈 경우에만 수동 추적이 필요하다.)

           `anonymize_ip`는 GA4에서 기본이라 따로 켜지 않는다. */
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}',{send_page_view:true});`,
        }}
      />
    </>
  );
}

/** 개인정보 처리방침에 적을 수 있도록, 실제로 쓰는지 여기서 한 번에 판단한다. */
export const analyticsEnabled = Boolean(GA_ID);

export const ANALYTICS_NOTE = `${SITE.name}은 방문 통계를 위해 Google Analytics를 사용합니다.`;
