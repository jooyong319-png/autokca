'use client';

import { useEffect, useState } from 'react';
import { takeOf } from '@/lib/ai';
import { readVotes } from '@/lib/aiMatch';
import type { Question } from '@/lib/questions';
import styles from './AiRowTag.module.css';

/* 목록 한 줄의 AI 표시(`/q`·`/best`·`/c`). 목록에서도 이 사이트가 뭘 하는 곳인지 보이게 한다.
 *
 * 🔴 **투표 전에는 AI의 선택을 밝히지 않는다**(브리프 §0). 내가 찍은 질문에서만 공개한다.
 *    내 기표는 브라우저에만 있으므로 서버 렌더는 항상 가린 상태다.
 * 발행 직후라 AI 답이 아직 없는 안건은 아무것도 그리지 않는다.
 */
export function AiRowTag({ question }: { question: Question }) {
  const [mine, setMine] = useState<'a' | 'b' | null>(null);
  useEffect(() => {
    setMine(readVotes().get(question.id) ?? null);
  }, [question.id]);

  const ai = takeOf(question);
  if (!ai) return null;

  return (
    <span className={styles.row}>
      <span className={styles.tag}>AI</span>
      {!ai.pick ? (
        '기권했어요'
      ) : !mine ? (
        '벌써 찍었어요'
      ) : (
        <>
          &ldquo;{question[ai.pick]}&rdquo;
          <b className={styles.side}>{mine === ai.pick ? '같은 편' : '반대편'}</b>
        </>
      )}
    </span>
  );
}
