import type { Comment } from './comments';

/* 댓글 칸(`Talk`)과 카드(`Ballot`)·입력칸(`CardSay`) 사이의 신호.
 *
 * 셋은 형제 컴포넌트라 props로 잇기 어렵다. 같은 문서 안의 이벤트로 주고받는다
 * (도장판의 `VOTE_EVENT`와 같은 방식, lib/aiMatch.ts).
 */

/** "이 안건의 댓글을 열어라" — 휴대폰에서는 아래에서 올라오는 창이 열린다 */
export const TALK_OPEN = 'ottoke:talk-open';
/** 댓글이 올라갔다 — 칸은 목록 맨 위에 붙이고, 카드는 기표를 잠근다 */
export const COMMENT_EVENT = 'ottoke:comment';

export interface CommentDetail {
  questionId: string;
  comment: Comment;
}

function emit(name: string, detail: unknown): void {
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  } catch {
    /* window가 없을 때 */
  }
}

export function openTalk(questionId: string): void {
  emit(TALK_OPEN, { questionId });
}

export function announceComment(questionId: string, comment: Comment): void {
  emit(COMMENT_EVENT, { questionId, comment } satisfies CommentDetail);
}
