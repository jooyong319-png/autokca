import type { Post } from './index';
import styles from '@/app/legal.module.css';

/* 🔴 이 글의 인용문은 **전부 실제 댓글 원문**이다. 오타·말줄임까지 그대로 둔다.
 *    다듬으면 읽기는 좋아지지만 그 순간 "우리가 쓴 말"이 된다 —
 *    이 글의 값어치는 문장력이 아니라 **남이 실제로 한 말**이라는 데 있다.
 *    수치도 2026-08-24 집계 그대로다(`snapshot`).
 */

function Body() {
  return (
    <>
      <p className={styles.lead}>
        축의금 5만원이 적은지 물었습니다. <strong>10명 중 8명이 &ldquo;적다&rdquo;</strong>고
        답했습니다. 그런데 댓글을 읽어 보니 다투는 지점이 금액이 아니었습니다.
      </p>

      <h2>먼저 숫자</h2>
      <p>
        두 질문을 나란히 두면 이렇게 됩니다. 2026년 8월 24일 기준입니다.
      </p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr><th>질문</th><th>결과</th><th>표</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><a href="/q/%EC%B6%95%EC%9D%98%EA%B8%88-5%EB%A7%8C%EC%9B%90">친구 결혼식 축의금 5만원이면 적나요?</a></td>
              <td><strong>적다 80%</strong> · 괜찮다 20%</td>
              <td>10표</td>
            </tr>
            <tr>
              <td><a href="/q/%EC%B6%95%EC%9D%98%EA%B8%88%EB%A7%8C-%EB%B3%B4%EB%82%B4%EA%B8%B0">결혼식 안 가고 축의금만 보내도 되나요?</a></td>
              <td><strong>괜찮다 86%</strong> · 가야 한다 14%</td>
              <td>7표</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className={styles.notice}>
        <strong>표본이 작습니다.</strong> 10표와 7표입니다. 여론조사가 아니라
        이 사이트에 와서 스스로 투표한 사람의 집계입니다. 숫자보다 아래 댓글이
        읽을 만합니다.
      </p>

      <h2>&ldquo;적다&rdquo; 쪽은 식대를 계산합니다</h2>
      <p>
        적다고 답한 쪽의 근거는 거의 하나로 모였습니다. 밥값입니다.
      </p>
      <ul>
        <li>&ldquo;5만원 너무 적지..식대가 5만우너이 넘어요!!&rdquo;</li>
        <li>&ldquo;솔직히 요즘..식대가 5만원 이상인데 5만원 내는 건 좀..&rdquo;</li>
        <li>&ldquo;너~무 적다..ㄹㅇ...&rdquo;</li>
      </ul>
      <p>
        축의금을 <strong>참석 비용</strong>으로 계산하는 관점입니다.
        내가 먹은 밥값보다 적게 내면 상대가 손해를 본다는 것이죠.
      </p>

      <h2>&ldquo;괜찮다&rdquo; 쪽은 관계를 계산합니다</h2>
      <p>
        반대쪽은 금액을 아예 언급하지 않습니다.
      </p>
      <ul>
        <li>&ldquo;뭐...아예 안친하고 안갈거면 뭐..&rdquo;</li>
        <li>&ldquo;친한 친구가 아닐수도 있기에 정성비용&rdquo;</li>
      </ul>
      <p>
        <strong>&ldquo;안 친하면&rdquo;</strong>이 조건입니다.
        5만원이 적정한지가 아니라, 5만원을 낼 만한 사이인지를 따집니다.
      </p>

      <h2>양쪽이 같은 말을 하고 있었습니다</h2>
      <p>
        재미있는 건 &ldquo;적다&rdquo;를 고른 사람도 같은 조건을 답니다.
      </p>
      <ul>
        <li>
          &ldquo;적긴하죠. 솔직히 5만원은 결혼식 안가고 카톡으로 보내는데
          안친한사람이다 정도..?&rdquo;
        </li>
      </ul>
      <p>
        <strong>적다고 답했지만 조건부입니다.</strong> 안 가고, 안 친하면 5만원이 성립한다는
        것이죠. 그러니까 이 논쟁은 금액 논쟁처럼 보이지만 실제로는{' '}
        <strong>관계 거리를 얼마로 환산할 것인가</strong>의 문제입니다.
        같은 5만원이 &ldquo;안 친한 사람에게는 적정&rdquo;이고 &ldquo;친구에게는 부족&rdquo;입니다.
      </p>

      <h2>그래서 두 번째 질문이 갈렸습니다</h2>
      <p>
        &ldquo;결혼식 안 가고 축의금만 보내도 되나&rdquo;에는 86%가 괜찮다고 했습니다.
        여기서도 근거는 같습니다 — &ldquo;안친하면 ㄱㅊ..하다 생각&rdquo;.
      </p>
      <p>
        더 이상한 건 <strong>반대쪽에 투표한 사람의 댓글</strong>입니다.
      </p>
      <ul>
        <li>
          &ldquo;만약 회사사람이거나 가기 애매하면 축의금만 보내도 되지 않으..?&rdquo;
          <br />
          <small>— &ldquo;가야 한다&rdquo;에 투표</small>
        </li>
      </ul>
      <p>
        가야 한다고 눌러 놓고 예외를 먼저 답니다. 원칙은 &ldquo;가야 한다&rdquo;인데
        현실은 &ldquo;애매하면 안 가도 된다&rdquo;는 것이죠.
        이 사이트가 투표와 댓글을 같이 보여주는 이유가 여기 있습니다.{' '}
        <strong>버튼은 둘 중 하나만 누르지만 사람은 그렇게 생각하지 않습니다.</strong>
      </p>

      <h2>정리</h2>
      <ul>
        <li>축의금 5만원 — <strong>10명 중 8명이 적다</strong></li>
        <li>다만 양쪽 다 <strong>&ldquo;안 친하면&rdquo;</strong>을 조건으로 답니다</li>
        <li>
          그러니 다투는 대상은 금액이 아니라 <strong>친밀도의 환산율</strong>입니다.
          상대와 내가 같은 거리에 있다고 생각하지 않으면 얼마를 내든 어긋납니다
        </li>
      </ul>
      <p>
        본인 생각은 어느 쪽인지, 직접 눌러 보시면 지금 비율이 바로 보입니다.
      </p>
    </>
  );
}

export const post: Post = {
  slug: '축의금은-금액이-아니라-거리',
  title: '축의금 5만원 논쟁은 사실 금액 얘기가 아니었다',
  summary:
    '10명 중 8명이 "적다"고 답했습니다. 그런데 댓글을 읽어 보니 양쪽 다 "안 친하면"을 조건으로 달고 있었습니다. 실제 집계와 댓글 원문.',
  published: '2026-08-24',
  questions: ['축의금-5만원', '축의금만-보내기'],
  snapshot: '2026-08-24',
  body: Body,
};
