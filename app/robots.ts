import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    /* 🔴 `/admin`도 막는다. 다만 robots.txt는 **크롤 요청을 막을 뿐** 이미 알려진 URL의
       색인을 못 막는다 — 그래서 페이지 자체에도 `noindex`를 걸었다.
       그리고 robots.txt는 공개 파일이라 여기 적는 순간 경로를 알리는 셈이기도 하다.
       실제 방어는 토큰이고, 이건 크롤러가 헛수고하지 않게 하는 예의다. */
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/admin'] }],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
