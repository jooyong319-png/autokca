/** 투표 집계 — 저장하는 것은 안건별 카운터 두 개뿐이다. */

import { firstRow, isConfigured, rpc } from './supabase';

export interface Tally {
  a: number;
  b: number;
  /** 집계 서버가 붙어 있는지. false면 화면에서 득표율을 감춘다(가짜 숫자를 채우지 않는다). */
  live: boolean;
}

export { isConfigured };

const EMPTY: Tally = { a: 0, b: 0, live: false };

function shape(raw: unknown): Tally {
  const row = firstRow(raw);
  if (!row) return EMPTY;
  return {
    a: typeof row.a === 'number' ? row.a : 0,
    b: typeof row.b === 'number' ? row.b : 0,
    live: true,
  };
}

/** 현재 집계 읽기 — 서버에서 그릴 때 쓴다(결과가 HTML에 담겨야 색인된다). */
export async function readTally(questionId: string): Promise<Tally> {
  const raw = await rpc('read_tally', { qid: questionId }, 60);
  return raw === null ? EMPTY : shape(raw);
}

/** 전체 집계 한 번에 — 집계 페이지(/best)용.
 *  질문마다 readTally를 부르면 100번 왕복한다. 없는 질문은 맵에 안 들어간다. */
export async function readAllTallies(): Promise<Map<string, Tally>> {
  const raw = await rpc('all_tallies', {}, 300);
  const out = new Map<string, Tally>();
  if (!Array.isArray(raw)) return out;
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    if (typeof r.question_id !== 'string') continue;
    out.set(r.question_id, {
      a: typeof r.a === 'number' ? r.a : 0,
      b: typeof r.b === 'number' ? r.b : 0,
      live: true,
    });
  }
  return out;
}

/** 한 표 넣고 갱신된 집계 받기 — 동시 투표가 유실되지 않게 DB 함수에서 원자적으로 처리한다. */
export async function castVote(questionId: string, choice: 'a' | 'b'): Promise<Tally> {
  const raw = await rpc('cast_vote', { qid: questionId, ch: choice }, false);
  return raw === null ? EMPTY : shape(raw);
}

/** 기표 번복 — 한 쪽에서 빼고 다른 쪽에 더한다.
 *
 *  🔴 **취소는 없다.** 표를 되돌리는 함수를 만들지 않는다 —
 *  집계에서 표가 사라지면 "아까 N명이었는데" 같은 의심이 생기고, 그건 이 사이트가
 *  파는 유일한 것(집계 신뢰)을 깎는다. 마음이 바뀌면 다른 쪽으로 옮기면 된다.
 *
 *  감소와 증가를 DB 함수 한 번에 맡긴다. 두 번 왕복하면 그 사이에 합계가 틀린다. */
export async function changeVote(
  questionId: string,
  from: 'a' | 'b',
  to: 'a' | 'b',
): Promise<Tally> {
  const raw = await rpc('change_vote', { qid: questionId, from_ch: from, to_ch: to }, false);
  return raw === null ? EMPTY : shape(raw);
}
