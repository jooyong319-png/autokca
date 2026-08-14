import { docNumber, feedOrder } from '@/lib/questions';
import { QUESTIONS } from '@/lib/questions';
import styles from './not-found.module.css';

/* 🔴 커스텀 404가 필요한 이유 두 개.
 *
 *  1) **Next 기본 에러 페이지는 다크다.** 프레임워크가
 *     `@media (prefers-color-scheme: dark) { body { background: #000 } }`를 직접 넣는다.
 *     사이트는 라이트 하나로 고정했는데(globals.css 테마 주석) 404만 새까맣게 나왔다.
 *     레이아웃이 감싸고 있어서 헤더·푸터는 밝고 가운데만 검은 더 이상한 상태였다.
 *
 *  2) **막힌 길이었다.** 브리프 원칙 2가 "투표 후 홈으로 돌려보내지 않는다"인데
 *     404는 아예 아무 데도 안 보냈다. 영문 "This page could not be found" 한 줄이었다.
 *     검색·외부 링크로 들어온 사람이 여기서 끝난다 — 세션당 PV가 매출을 가르는
 *     구조에서(원칙 1) 가장 아까운 이탈이다.
 *
 * 🔴 **여기서는 DB를 읽지 않는다. 클라이언트 컴포넌트도 쓰지 않는다.**
 *
 *    처음엔 홈처럼 집계를 받아 `<Feed>`(클라이언트)로 투표용지를 깔았는데,
 *    **페이지 안에서 `notFound()`가 던져지는 경로**(`/q/<없는슬러그>`·`/c/<없는주제>`)에서는
 *    클라이언트 컴포넌트가 서버 렌더되지 않아 통지만 남고 안건이 통째로 사라졌다.
 *    라우트가 아예 없는 `/nonexistent`에서는 정상이라 더 헷갈렸다.
 *    실측: sentinel·ballots 마커가 `/q/<없는슬러그>`에서 0, `/nonexistent`에서만 존재.
 *
 *    하필 잘못된 질문 주소가 **가장 흔한 404**라, 거기서 회수가 안 되면 의미가 없다.
 *    그래서 **질문이 코드에 있다는 점**(`lib/questions.ts`, DB에 없다)을 이용해
 *    순수 서버 컴포넌트 링크 목록으로 만들었다. 어떤 404 경로에서도 항상 나온다.
 *
 *    부수 효과로 크롤러에게 내부 링크를 주고(404에서 링크 자산이 끊기지 않는다),
 *    하이드레이션 불일치 위험도 없다. 목록에서 상세로 가면 거기에 투표용지·댓글·
 *    이어지는 피드가 다 있으므로 깔때기는 오히려 정상 경로로 합쳐진다.
 */

/** 반송 통지 아래에 붙이는 안건 수. 링크뿐이라 가벼워서 좀 넉넉히 준다. */
const OFFER = 8;

export default function NotFound() {
  /* `votesOf`를 넘기지 않는다 — 집계를 읽지 않으므로 배열 순서를 그대로 쓴다.
     진지 1 : 병맛 2 교차는 그대로 유지된다. */
  /* 🔴 여기서는 **코드의 103개만** 쓴다(`catalog()`를 부르지 않는다).
     404는 데이터 의존이 0이어야 어떤 경로에서도 렌더된다 — 이 파일 상단 주석 참고.
     DB를 부르면 `notFound()` 경로에서 실패할 때 404가 빈 화면이 된다. */
  const offers = feedOrder(QUESTIONS).slice(0, OFFER);

  return (
    <>
      <section className={styles.notice}>
        <div className={styles.docline}>
          <span>제0호</span>
          <span>반송</span>
        </div>

        <h1 className={styles.title}>이 안건은 존재하지 않습니다</h1>

        <p className={styles.body}>
          주소를 잘못 적으셨거나, 애초에 상정된 바 없는 안건입니다.
          <br />
          아래에서 실재하는 안건에 기표하실 수 있습니다.
        </p>

        <div className={styles.acts}>
          <a className={`${styles.btn} ${styles.btnSeal}`} href="/">
            기표소로 →
          </a>
          <a className={styles.btn} href="/q">
            전체 안건 보기
          </a>
        </div>
      </section>

      <section className={styles.offer} aria-labelledby="상정된-안건">
        <h2 className={styles.offerHead} id="상정된-안건">
          상정된 안건
        </h2>
        <ul className={styles.list}>
          {offers.map(q => (
            <li key={q.id}>
              <a className={styles.row} href={`/q/${encodeURIComponent(q.slug)}`}>
                <span className={styles.rowNo}>{docNumber(q)}</span>
                <span className={styles.rowQ}>{q.q}</span>
                <span className={styles.rowKind}>
                  {q.kind === 'serious' ? '안건' : '별건'}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
