import type { AiTake } from '@/lib/ai';
import { AI_HIT } from '@/lib/ai';
import { TIER } from '@/lib/tiers';
import { MATCH_GOAL, matchVerdict } from '@/lib/aiMatch';
import { StampBoard } from './StampBoard';
import { useMatch } from './useMatch';
import styles from './AiBox.module.css';

interface Props {
  take: AiTake;
  /** 예 / 아니오 쪽 표시 문구 */
  a: string;
  b: string;
  choice: 'a' | 'b' | null;
  /** 비율을 공개해도 되는가(`showsResult`) */
  showResult: boolean;
  /** "빗나갔다"를 단정해도 되는가(`showsVerdict`) */
  showVerdict: boolean;
  /** 실제 "a" 비율(%) */
  pctA: number;
  /** 작성일 줄을 보일지. 피드 카드는 높이 예산이 빠듯해서 상세에서만 보인다
   *  (architecture.md "레이아웃 예산은 가장 큰 상태에서 잡는다") */
  showDate?: boolean;
}

/* "AI vs 사람들"의 본체(브리프 §0).
 *
 * 🔴 **투표 전에는 AI의 선택을 가린다.** 결과 막대를 투표 후에만 보여주는 것과 같은 이유다 —
 *    먼저 보면 AI 쪽으로 쏠리거나, 일부러 반대로 찍는다(밴드왜건).
 *    대신 "이미 골랐다"는 사실은 보여준다. 그게 도장을 찍을 이유가 된다.
 *
 * 🔴 **두 줄을 항상 차지한다.** 투표 전·후 줄 수가 같아야 하이드레이션 때 카드 높이가
 *    덜 흔들린다(scroll-snap).
 *
 * 🔴 결과 막대보다 **위**에 둔다. 처음엔 아래에 뒀는데 375×667에서 투표 직후 화면 밖으로
 *    밀려났다 — 이 컨셉의 보상이 바로 이 칸인데 스크롤해야 보였다.
 *    예측 수치의 시각화는 따로 막대를 그리지 않고 결과 막대 위 **눈금**으로 얹는다(Ballot `bar`).
 *    AI용 막대를 따로 그리면 AI가 표를 던진 것처럼 읽힌다 — AI는 표가 아니다.
 */
export function AiBox({ take, a, b, choice, showResult, showVerdict, pctA, showDate = false }: Props) {
  const voted = choice !== null;
  const actual = Math.round(pctA);
  const gap = Math.abs(actual - take.guess);
  const match = useMatch();
  const left = MATCH_GOAL - match.n;
  const matchPct = match.n > 0 ? Math.round((match.same / match.n) * 100) : 0;

  const pickLine = (() => {
    if (!voted) {
      return take.pick
        ? 'AI는 벌써 찍었어요. 님은요?'
        : '이건 AI도 안 찍었어요. 예측만 해 뒀어요.';
    }
    if (!take.pick) return '이건 안 찍을래요. 싸움 나요.';
    return (
      <>
        <span className={styles.side}>{choice === take.pick ? '같은 편' : '반대편'}</span>
        <b>&ldquo;{take.pick === 'a' ? a : b}&rdquo;</b> — {take.why}
      </>
    );
  })();

  const guessLine = (() => {
    if (!voted) return 'AI 예측은 도장 찍어야 보여 드려요';
    if (!showResult) {
      return `AI 예측 “${a}” ${take.guess}% · 실제는 ${TIER.RESULT}표 모이면 까요`;
    }
    const head = `AI 예측 “${a}” ${take.guess}% → 실제 ${actual}%`;
    if (!showVerdict) return head;
    return gap <= AI_HIT ? `${head} · AI가 맞혔어요. 좀 재수 없네요` : `${head} · AI ${gap}%p 빗나감. 아는 척하더니`;
  })();

  return (
    <div className={styles.box}>
      <p className={styles.head}>
        <span className={styles.tag}>AI</span>
        <span className={styles.pick}>{pickLine}</span>
      </p>
      <p className={styles.guess}>
        {/* 결과 막대 위 눈금과 같은 모양 — 그 선이 AI 예측이라는 범례다 */}
        {voted && showResult && <span className={styles.legend} aria-hidden="true" />}
        {guessLine}
      </p>

      {/* 🔴 판정까지의 진행 — 투표의 보상 자리에서 **다음 카드로 갈 이유**를 다시 말한다.
          홈 안내문(HomeIntro)은 첫 카드 뒤로 사라지므로 목표가 여기서 이어져야 한다. */}
      {voted && (
        <p className={styles.match}>
          <StampBoard match={match} size="small" />
          <span>
            {!take.pick
              ? '이건 판정에 안 들어가요'
              : left > 0
                ? `AI 판정까지 ${left}개`
                : <>AI랑 {matchPct}% 같음. {matchVerdict(matchPct)} <a href="/me">확인서</a></>}
          </span>
        </p>
      )}

      {showDate && (
        <p className={styles.at}>AI 답변 {take.at.split('-').join('.')} 작성 · 이후 고치지 않습니다</p>
      )}
    </div>
  );
}
