import type { Metadata } from 'next';
import { SITE } from '@/lib/site';
import styles from '../legal.module.css';

export const metadata: Metadata = {
  title: '이용약관',
  description: `${SITE.name} 이용약관 — 투표와 댓글에 관한 규칙.`,
  alternates: { canonical: `${SITE.url}/terms` },
};

export default function TermsPage() {
  return (
    <article className={styles.doc}>
      <header className={styles.head}>
        <h1 className={styles.title}>이용약관</h1>
        <span className={styles.effective}>시행일 {SITE.effectiveDate}</span>
      </header>

      <p className={styles.lead}>
        {SITE.name}({SITE.url})를 이용하시면 이 약관에 동의한 것으로 봅니다.
        회원가입이 없으므로 별도의 가입 절차나 동의 절차를 두지 않습니다.
      </p>

      <h2>제1조 (서비스의 내용)</h2>
      <ol>
        <li>
          {SITE.name}는 한 줄 질문에 대한 이용자의 투표를 집계해 결과를 보여주는 서비스입니다.
        </li>
        <li>질문은 운영자가 작성합니다. 현재 이용자가 질문을 등록할 수 없습니다.</li>
        <li>
          투표를 마친 이용자는 해당 질문에 <strong>댓글</strong>을 80자 이내로 한 건
          남길 수 있습니다. 댓글은 <strong>자신이 투표한 쪽</strong>에만 등록되며,
          반대쪽 댓글은 읽기만 할 수 있습니다.
        </li>
        <li>
          지난 질문도 계속 투표를 받습니다. 마감되는 질문은 없습니다.
        </li>
      </ol>

      <h2>제2조 (집계 결과의 성격)</h2>
      <p className={styles.notice}>
        <strong>이 사이트의 집계는 여론조사가 아닙니다.</strong> 표본을 설계해 추출한 것이
        아니라, 사이트를 방문해 스스로 투표한 사람만 집계된 결과입니다. 따라서 특정 집단이나
        국민 전체의 의견을 대표하지 않으며, 통계적 대표성이 없습니다.
      </p>
      <ol>
        <li>
          표시되는 득표율은 실제 투표 수를 그대로 계산한 값입니다. 임의로 조정하거나
          가공하지 않습니다.
        </li>
        <li>
          다만 중복 투표 방지는 쿠키에 의존하므로 완전하지 않습니다. 브라우저를 바꾸거나
          쿠키를 삭제하면 다시 투표할 수 있습니다.
        </li>
        <li>
          집계 결과를 인용하실 때에는 위 두 가지 한계를 함께 밝혀 주시기를 부탁드립니다.
        </li>
      </ol>

      <h2>제3조 (금지되는 게시물)</h2>
      <p>댓글에 다음 내용을 기재할 수 없습니다.</p>
      <ul>
        <li>타인을 모욕·비방하거나 명예를 훼손하는 내용</li>
        <li>특정 개인을 알아볼 수 있게 하는 내용, 타인의 개인정보</li>
        <li>차별·혐오 표현, 폭력이나 범죄를 조장하는 내용</li>
        <li>음란물, 청소년에게 유해한 내용</li>
        <li>광고, 홍보, 링크, 연락처, 도박·대출 등 영리 목적의 유인</li>
        <li>같은 내용의 반복 게시, 도배, 자동화된 대량 기재</li>
        <li>타인의 저작권 등 권리를 침해하는 내용</li>
        <li>그 밖에 법령을 위반하는 내용</li>
      </ul>

      <h2>제4조 (게시물의 관리)</h2>
      <ol>
        <li>
          링크·연락처가 포함된 댓글, 금지어가 포함된 댓글, 같은 글자를 과도하게 반복한 댓글은
          <strong> 기재 단계에서 자동으로 거부</strong>됩니다.
        </li>
        <li>
          이용자의 <strong>신고가 일정 횟수 이상 누적된 댓글은 자동으로 숨겨집니다.</strong>
          운영자의 개별 판단을 기다리지 않습니다.
        </li>
        <li>
          운영자는 제3조를 위반한 게시물을 사전 통지 없이 삭제하거나 숨길 수 있습니다.
          작성자를 식별하는 정보를 저장하지 않으므로 개별 통지는 불가능합니다.
        </li>
        <li>
          자동 처리로 정상적인 댓글이 거부·숨김된 경우 제7조의 연락처로 알려주시면
          확인하겠습니다.
        </li>
      </ol>

      <h2>제5조 (게시물의 권리)</h2>
      <ol>
        <li>댓글의 저작권은 작성자에게 있습니다.</li>
        <li>
          운영자는 해당 댓글을 이 사이트에 게시하고, 질문 목록에 계속 보존하는 범위에서
          이용합니다. 그 외의 목적으로 이용하거나 제3자에게 제공하지 않습니다.
        </li>
      </ol>

      <h2>제6조 (서비스의 변경과 중단)</h2>
      <ol>
        <li>
          운영자는 서비스의 내용을 변경하거나 중단할 수 있습니다. 무상으로 제공되는
          서비스이므로 이에 대해 별도의 보상을 하지 않습니다.
        </li>
        <li>
          시스템 점검, 장애, 위탁 사업자의 사정으로 서비스가 일시 중단될 수 있습니다.
        </li>
        <li>
          집계 서버에 장애가 발생하면 득표율이 표시되지 않을 수 있습니다. 이 경우 화면에
          그 사실을 밝힙니다.
        </li>
      </ol>

      <h2>제7조 (문의와 분쟁)</h2>
      <p>
        게시물 삭제 요청, 오류 신고, 그 밖의 문의는{' '}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>로 보내주십시오.
      </p>
      <p>
        이 약관에 명시되지 않은 사항은 관계 법령과 상관습에 따릅니다. 서비스 이용과 관련한
        분쟁은 대한민국 법을 적용합니다.
      </p>

      <div className={styles.contact}>
        시행일 {SITE.effectiveDate}
        <br />
        문의 <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
      </div>
    </article>
  );
}
