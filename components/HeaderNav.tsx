'use client';

import { usePathname } from 'next/navigation';
import styles from './HeaderNav.module.css';

/* 🔴 7차 §5 — 헤더에 이동 수단이 없어서 `/best`·`/q`·`/me`가 만들어져 있는데도
 *  사용자가 존재를 알 수 없었다. 사이트맵에는 있으니 크롤러만 알고 있던 상태다.
 *
 *  헤더에는 **3개만** 둔다(§5-2). 소개·약관·개인정보는 푸터에 이미 있다 —
 *  헤더에 6개를 넣으면 선택 피로만 생긴다.
 *
 *  클라이언트 컴포넌트인 이유는 현재 위치 표시(§5-5) 하나뿐이다.
 *  `usePathname()`은 정적 프리렌더에서도 실제 경로를 준다(통합 위키 `nextjs.md`).
 */

const ITEMS = [
  { href: '/best', label: '집계' },
  { href: '/q', label: '안건' },
  { href: '/me', label: '확인서' },
] as const;

export function HeaderNav() {
  const path = usePathname();

  return (
    <nav className={styles.nav} aria-label="주요 메뉴">
      {ITEMS.map(item => {
        /* `/q`는 `/q/[slug]`의 부모다. 상세 페이지에서 "안건"에 밑줄이 켜지면
           지금 목록에 있는 것처럼 읽히므로 **정확히 일치할 때만** 표시한다. */
        const current = path === item.href;
        return (
          <a
            key={item.href}
            href={item.href}
            className={`${styles.item} ${current ? styles.current : ''}`}
            aria-current={current ? 'page' : undefined}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
