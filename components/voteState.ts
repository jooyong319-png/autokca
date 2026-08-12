'use client';

import { useEffect, useState } from 'react';
import type { Tally } from '@/lib/votes';

/** 서버가 알려주는 기표 상태 — 화면은 이 값으로 자기를 고친다. */
export interface VoteState extends Tally {
  myVote: 'a' | 'b' | null;
  /** 이 안건에 의견을 이미 기재했는지 */
  wrote: boolean;
}

/* Ballot과 Comments가 같은 안건에 대해 각각 물어보면 요청이 두 번 나간다.
   같은 id면 같은 약속을 돌려줘서 한 번만 나가게 한다. */
const inflight = new Map<string, Promise<VoteState | null>>();

export function fetchVoteState(questionId: string): Promise<VoteState | null> {
  const cached = inflight.get(questionId);
  if (cached) return cached;

  const promise = fetch(`/api/vote?id=${encodeURIComponent(questionId)}`, {
    cache: 'no-store',
  })
    .then(res => (res.ok ? (res.json() as Promise<VoteState>) : null))
    .catch(() => null)
    /* 응답이 오면 캐시를 비운다 — 기표 후 다시 물어볼 수 있어야 한다 */
    .finally(() => inflight.delete(questionId));

  inflight.set(questionId, promise);
  return promise;
}

/** 서버 기준 기표 상태. 아직 못 받았으면 `pending`이 true. */
export function useVoteState(questionId: string, enabled: boolean) {
  const [state, setState] = useState<VoteState | null>(null);
  const [pending, setPending] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setPending(false);
      return;
    }
    let alive = true;
    setPending(true);
    fetchVoteState(questionId).then(next => {
      if (!alive) return;
      setState(next);
      setPending(false);
    });
    return () => {
      alive = false;
    };
  }, [enabled, questionId]);

  return { state, pending, setState };
}
