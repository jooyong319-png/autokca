import type { ReactNode } from 'react';
import { post as weddingMoney } from './축의금은-금액이-아니라-거리';

/* 읽을거리(블로그).
 *
 * 🔴 **왜 필요한가:** 이 사이트의 콘텐츠는 전부 **사용자 참여에 걸려 있었다.**
 *    질문 페이지는 표 5개 + 댓글 2개를 넘겨야 색인이 열린다(`lib/tiers.ts`).
 *    사람이 안 오면 색인할 게 하나도 없고, 색인이 없으면 사람이 안 온다.
 *    글은 그 고리 **바깥**에 있는 유일한 콘텐츠다 — 쓰는 순간 색인 대상이 된다.
 *
 * 🔴 **글은 코드에 둔다**(DB가 아니다). 이유 둘:
 *    ① 의존성을 늘리지 않는다. MDX를 붙이면 `next`·`react`·`react-dom` 셋뿐이라는
 *       원칙이 깨진다. TSX 모듈이면 파서도 런타임도 필요 없다.
 *    ② 글은 질문과 성격이 다르다. 질문은 매주 수십 개가 쏟아져 `/admin` 컨펌이 필요하지만,
 *       글은 드물게 나오고 **한 번 쓰면 오래 간다.** 리뷰는 커밋이 하면 된다.
 *
 * ⚠️ **대량 자동 생성은 하지 않는다.** 구글이 "scaled content abuse"로 명시해 막는다.
 *    수동 조치를 맞으면 색인이 영구히 닫힌다 — 글을 쓰는 목적과 정확히 반대다.
 *    쓸 수 있는 것은 **우리만 가진 데이터**(우리 집계와 우리 댓글)를 다룬 글뿐이다.
 */

export interface Post {
  /** URL. 한글을 쓴다 — 질문 슬러그와 같은 이유로 문장 자체가 검색어다 */
  slug: string;
  title: string;
  /** 목록·검색결과·OG에 쓰는 한 줄 */
  summary: string;
  /** 처음 게시한 날(ISO). 🔴 **실제 날짜만** — 최신으로 보이려고 당기지 않는다 */
  published: string;
  /** 내용을 실제로 고친 날. 오타 수정에는 올리지 않는다 */
  updated?: string;
  /** 이 글이 다루는 안건 슬러그. 본문 끝 "관련 안건"과 내부 링크에 쓴다 */
  questions: string[];
  /** 🔴 집계를 인용한 글은 **언제 기준인지** 반드시 남긴다(제1원칙).
   *  표는 계속 늘어나므로, 날짜 없는 수치는 시간이 지나면 거짓이 된다. */
  snapshot?: string;
  body: () => ReactNode;
}

/* 새 글은 여기에 추가한다. 최신순 정렬은 `published`가 하므로 순서는 상관없다. */
const ALL: readonly Post[] = [weddingMoney];

/** 최신순. 미래 날짜는 내보내지 않는다 — 예약 발행을 실수로 노출하지 않기 위해서다. */
export function posts(): Post[] {
  const today = new Date().toISOString().slice(0, 10);
  return [...ALL]
    .filter(p => p.published <= today)
    .sort((a, b) => (a.published < b.published ? 1 : -1));
}

export function postBySlug(slug: string): Post | undefined {
  return posts().find(p => p.slug === slug);
}
