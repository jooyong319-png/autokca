import type { Metadata, Viewport } from 'next';
import { WebSiteJsonLd } from '@/components/JsonLd';
import { TotalVotes } from '@/components/TotalVotes';
import { SITE, VERIFICATION } from '@/lib/site';
import { HeaderNav } from '@/components/HeaderNav';
import { Analytics } from '@/components/Analytics';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.wordmark} — ${SITE.tagline}`,
    template: `%s — ${SITE.wordmark}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: SITE.name,
    title: `${SITE.wordmark} — ${SITE.tagline}`,
    description: SITE.description,
    url: SITE.url,
  },
  /* 검색엔진 소유 확인 — 값은 `lib/site.ts`의 `VERIFICATION`에 있다.
   *  비밀이 아니라 코드에 기본값을 두고, 환경변수가 있으면 그쪽이 이긴다(거기 주석 참고). */
  verification: {
    google: VERIFICATION.google,
    other: { 'naver-site-verification': VERIFICATION.naver },
  },

  /* 기본 팔레트는 라이트다. 다크는 CSS가 OS 설정을 따라간다. */
  other: { 'format-detection': 'telephone=no' },
};

export const viewport: Viewport = {
  /* 라이트 하나만 쓰므로 색도 하나다(globals.css 테마 주석).
     모바일 브라우저 상단 바 색 — 기표소 배경과 같은 값이라 화면이 이어져 보인다. */
  themeColor: '#e9e5dc',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      {/* 🔴 분석 태그는 **`<head>`에 생 `<script>`로** 들어간다(`components/Analytics.tsx`).
          `next/script`를 쓰면 HTML에 실제 태그가 안 들어가 구글이 감지하지 못한다.
          App Router에서는 `<head>`를 직접 열어 넣을 수 있다. */}
      <head>
        <Analytics />
      </head>
      <body>
        <WebSiteJsonLd />
        {/* 🔴 7차 §5-3 — `sticky`에서 `fixed`로 바꿨다.
         *
         *  증상은 문서가 맞았다(스크롤하면 헤더가 사라진다). 원인은 달랐다:
         *  `overflow-y: scroll` 컨테이너 때문이 **아니다** — 이 사이트는 문서(html)를
         *  스크롤 컨테이너로 쓴다(4차에 문서화). 진짜 원인은 **sticky의 containing block**이
         *  `.masthead`(높이 약 78px)라는 것이었다. 바가 51px이니 27px만 스크롤하면
         *  sticky 구간이 끝나고 그대로 밀려 올라갔다.
         *
         *  그래서 문서가 제안한 별도 스크롤 컨테이너는 채택하지 않는다 — 그러면
         *  헤더·푸터가 컨테이너 밖으로 밀려 레이아웃을 다시 짜야 한다.
         *  `fixed`는 부모와 무관하게 뷰포트에 붙으므로 원인만 정확히 제거한다.
         *
         *  ⚠️ `fixed`는 흐름에서 빠지므로 `.stage`가 그만큼 위로 올라온다 →
         *     globals.css에서 `.stage`에 `padding-top`으로 자리를 만든다.
         */}
        <header className="masthead">
          <div className="masthead-bar">
            <a className="wordmark" href="/">
              오또케<em>?!</em>
            </a>
            <HeaderNav />
            {/* 홈 피드의 진행 표시("제 1호 · 전체 103건")가 포털로 들어오는 자리(4차 §3-1).
                다른 페이지에서는 빈 span으로 남는다. */}
            <span id="feed-progress-slot" className="masthead-slot" />
          </div>
        </header>

        <div className="stage">
          {/* 태그라인은 고정하지 않는다 — 화면을 잡아먹는다(2차 §6-4의 판단 유지) */}
          <p className="masthead-tagline">{SITE.tagline}</p>

          {children}

          <footer className="site-footer">
            <nav className="footer-nav" aria-label="사이트 링크">
              <a href="/">투표하기</a>
              <a href="/q">질문 전체</a>
              <a href="/best">집계</a>
              <a href="/me">내 확인서</a>
              <a href="/about">소개</a>
              <a href="/terms">이용약관</a>
              {/* 개인정보처리방침은 법령상 다른 항목과 구분해 표시한다 */}
              <a href="/privacy" className="footer-strong">
                개인정보처리방침
              </a>
            </nav>
            <p style={{ margin: 0 }}>
              <TotalVotes />
              질문은 오또케가 씁니다. 집계는 실제 투표 수이지만{' '}
              <strong>여론조사가 아닙니다</strong> — 스스로 투표한 사람만 집계됩니다.
            </p>
            <p style={{ margin: 0 }}>
              문의 · 게시물 삭제 요청 <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
