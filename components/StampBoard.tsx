import { MATCH_GOAL, type Match } from '@/lib/aiMatch';
import styles from './StampBoard.module.css';

/* 도장판 — 판정까지 남은 칸(브리프 §0).
 *
 * 쿠폰 도장판의 문법을 빌린다. "10칸을 채우면 무언가 나온다"는 설명 없이도 읽힌다.
 * 칸마다 **AI랑 같은 편이었는지**가 색으로 남는다 — 검은 도장 = 같은 편, 인주 = 반대편.
 * 큰 판에서는 색만으로 구분하지 않도록 반대편 도장을 기울인다. 작은 판(AI 칸 안)은
 * 바로 옆 문구가 숫자로 같은 말을 한다. 화면 낭독기는 `aria-label`로 읽는다.
 *
 * 10개를 넘기면 앞의 10칸을 그대로 둔다. 판정은 전체 기록으로 계속 갱신된다.
 */
export function StampBoard({ match, size = 'big' }: { match: Match; size?: 'big' | 'small' }) {
  const slots = Array.from({ length: MATCH_GOAL }, (_, i) => match.marks[i] ?? null);
  return (
    <span
      className={`${styles.board} ${size === 'small' ? styles.small : ''}`}
      role="img"
      aria-label={`AI랑 같은 편 ${match.same}번, 반대편 ${match.n - match.same}번. 판정까지 ${Math.max(
        0,
        MATCH_GOAL - match.n,
      )}개`}
    >
      {slots.map((m, i) => (
        <span
          key={i}
          className={`${styles.slot} ${m === 'same' ? styles.same : m === 'diff' ? styles.diff : ''}`}
          aria-hidden="true"
        >
          {m ? '오' : ''}
        </span>
      ))}
    </span>
  );
}
