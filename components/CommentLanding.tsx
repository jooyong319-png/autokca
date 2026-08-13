'use client';

import { useEffect } from 'react';

/* 🔴 카드에서 사유를 올리고 상세로 넘어왔을 때의 착지 연출.
 *
 *  8차는 `/q/{slug}#c-{id}`로 보내라고 했고 그렇게 했더니 **댓글로 툭 점프**해서
 *  질문(본문)을 아예 못 보고 지나갔다. 방금 무엇에 답했는지 화면에서 사라지는 것이다.
 *
 *  그래서 순서를 바꿨다: **본문을 먼저 보여주고 → 아래로 내려간다.**
 *    최상단 착지(질문이 보인다) → 0.7초 → 내 댓글까지 smooth 스크롤 → 2초 강조
 *
 *  ⚠️ URL에 해시를 넣지 않는다. 해시가 있으면 브라우저가 **즉시** 그 위치로 점프해서
 *     "위에서 시작"이 성립하지 않는다. 대신 `sessionStorage`로 목표를 넘긴다 —
 *     쿼리 파라미터를 쓰면 `useSearchParams()`가 필요하고 그 순간 상세 페이지가
 *     ISR을 잃는다(매 요청 렌더). 세션 저장소는 클라이언트 전용이라 렌더에 영향이 없다.
 *
 *  ⚠️ 강조를 `:target`이 아니라 클래스로 하는 이유: 해시가 없으니 `:target`이 애초에
 *     안 걸리고, 이 연출은 **우리가 타이밍을 잡아야** 한다(도착하는 순간 켜져야 한다).
 *     직접 `#c-N` 링크로 들어온 경우는 그대로 `:target`이 담당한다 — URL이 진실인 경우와
 *     한 번만 재생하는 연출은 성질이 다르므로 각자에 맞는 수단을 쓴다.
 *     세션 값을 **즉시 소비**하므로 새로고침으로 연출이 반복되지 않는다(그게 맞다).
 */

const KEY = 'ottoke:land';
/** 본문을 눈에 담을 시간. 너무 짧으면 점프와 구분이 안 되고, 길면 답답하다. */
const PAUSE = 700;
/** 서버 HTML에 내 댓글이 없을 수 있다(ISR 캐시) — `Comments`의 마운트 조회가 채운다.
 *  그때까지 짧게 기다린다. 안 나타나면 조용히 포기한다(최상단에 그대로 있으면 된다). */
const WAIT_STEP = 120;
const WAIT_MAX = 4000;

/** 카드에서 사유를 올릴 때 이 함수로 목표를 남긴다. */
export function markLanding(commentId: number): void {
  try {
    sessionStorage.setItem(KEY, String(commentId));
  } catch {
    /* 저장이 막혀 있어도 이동 자체는 되어야 한다 — 연출만 생략된다 */
  }
}

export function CommentLanding() {
  useEffect(() => {
    let target: string | null = null;
    try {
      target = sessionStorage.getItem(KEY);
      if (target) sessionStorage.removeItem(KEY);
    } catch {
      return;
    }
    if (!target) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let timers: number[] = [];
    let waited = 0;

    const land = (el: HTMLElement) => {
      el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      el.classList.add('landed');
      /* 강조를 걷어낸다. 남겨 두면 나중에 이 페이지를 다시 볼 때 왜 칠해져 있는지 알 수 없다. */
      timers.push(window.setTimeout(() => el.classList.remove('landed'), 2400));
    };

    const seek = () => {
      const el = document.getElementById(`c-${target}`);
      if (el) {
        land(el);
        return;
      }
      waited += WAIT_STEP;
      if (waited < WAIT_MAX) timers.push(window.setTimeout(seek, WAIT_STEP));
    };

    /* reduced-motion이면 뜸들이지 않는다 — 연출이 목적이 아니라 위치가 목적이다 */
    timers.push(window.setTimeout(seek, reduced ? 0 : PAUSE));

    return () => {
      timers.forEach(window.clearTimeout);
      timers = [];
    };
  }, []);

  return null;
}
