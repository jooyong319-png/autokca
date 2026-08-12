import type { Metadata, Viewport } from 'next';
import { WebSiteJsonLd } from '@/components/JsonLd';
import { SITE } from '@/lib/site';
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
  /* 검색엔진 소유 확인 — **코드를 고치지 않고 환경변수만 추가**하면 된다.
   *
   *  Vercel에 GOOGLE_SITE_VERIFICATION / NAVER_SITE_VERIFICATION을 넣고 재배포하면
   *  meta 태그가 생긴다. HTML에 그대로 노출되는 값이라 비밀이 아니고,
   *  서버에서 메타데이터를 만들 때 읽으므로 NEXT_PUBLIC_ 접두사가 필요 없다.
   *
   *  ⚠️ 한국 서비스라 **네이버 비중이 크다**. 구글만 하고 끝내지 말 것. */
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : {}),
    ...(process.env.NAVER_SITE_VERIFICATION
      ? { other: { 'naver-site-verification': process.env.NAVER_SITE_VERIFICATION } }
      : {}),
  },

  /* 기본 팔레트는 라이트다. 다크는 CSS가 OS 설정을 따라간다. */
  other: { 'format-detection': 'telephone=no' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#e9e5dc' },
    { media: '(prefers-color-scheme: dark)', color: '#131210' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <WebSiteJsonLd />
        <div className="stage">
          <header className="masthead">
            <a className="wordmark" href="/">
              오또케<em>?!</em>
            </a>
            <span className="masthead-date">{SITE.tagline}</span>
          </header>

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
