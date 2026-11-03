'use client';

import { useEffect, useState } from 'react';
import { EMPTY_MATCH, VOTE_EVENT, readMatch, type Match } from '@/lib/aiMatch';

/** AI 일치 기록. 서버 렌더와 첫 페인트에서는 빈 기록이다 — 기록은 브라우저에만 있다.
 *  같은 페이지의 다른 카드에서 찍어도(VOTE_EVENT), 다른 탭에서 찍어도(storage) 다시 읽는다. */
export function useMatch(): Match {
  const [match, setMatch] = useState<Match>(EMPTY_MATCH);
  useEffect(() => {
    const read = () => setMatch(readMatch());
    read();
    window.addEventListener(VOTE_EVENT, read);
    window.addEventListener('storage', read);
    return () => {
      window.removeEventListener(VOTE_EVENT, read);
      window.removeEventListener('storage', read);
    };
  }, []);
  return match;
}
