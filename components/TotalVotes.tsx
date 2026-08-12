'use client';

import { useEffect, useState } from 'react';

/** "지금까지 N표" — 개별 질문이 0표여도 사이트 전체는 활성으로 보이게 하는 장치.
 *
 *  값이 0이거나 못 받아오면 **아무것도 그리지 않는다.** "지금까지 0표"는
 *  안 보여주는 것보다 나쁘다. */
export function TotalVotes() {
  const [votes, setVotes] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/stats')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (alive && d && typeof d.votes === 'number' && d.votes > 0) setVotes(d.votes);
      })
      .catch(() => {
        /* 장식이라 실패를 알리지 않는다 */
      });
    return () => {
      alive = false;
    };
  }, []);

  if (votes === null) return null;
  return <>지금까지 {votes.toLocaleString('ko-KR')}표 · </>;
}
