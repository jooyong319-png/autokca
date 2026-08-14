import type { Metadata } from 'next';
import { PROCESSORS, SITE, processors } from '@/lib/site';
import styles from '../legal.module.css';

export const metadata: Metadata = {
  title: '개인정보처리방침',
  description: `${SITE.name}가 어떤 정보를 어떻게 다루는지 밝힙니다.`,
  alternates: { canonical: `${SITE.url}/privacy` },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <article className={styles.doc}>
      <header className={styles.head}>
        <h1 className={styles.title}>개인정보처리방침</h1>
        <span className={styles.effective}>시행일 {SITE.effectiveDate}</span>
      </header>

      {/* 다 채우면 이 경고가 사라진다 — 손으로 지우는 걸 잊지 않도록 상태에서 뽑는다 */}
      {(!SITE.privacyOfficer || PROCESSORS.some(p => p.region.includes('미정'))) && (
        <p className={styles.notice}>
          ⚠️ <strong>배포 전에 채울 것</strong> — 아래 붉은 칸이 비어 있습니다
          {!SITE.privacyOfficer && ' · 개인정보 보호책임자 표기'}
          {PROCESSORS.some(p => p.region.includes('미정')) && ' · Supabase 리전'}. 이 문서는 실제
          데이터 흐름에 맞춰 작성했지만 법률 자문이 아니므로, 공개 전 한 번 검토하십시오.
        </p>
      )}

      <p className={styles.lead}>
        {SITE.name}는 <strong>회원가입도 로그인도 없는 사이트</strong>입니다. 이름·연락처·
        생년월일 같은 것을 받지 않습니다. 아래는 그래도 남는 정보에 관한 설명입니다.
      </p>

      <h2>1. 수집하는 정보와 수집 방법</h2>

      <h3>가. 이용자가 직접 입력하는 것</h3>
      <ul>
        <li>
          <strong>댓글 본문</strong> — 투표한 질문에 남기는 80자 이내의 글.
          작성자를 식별할 수 있는 정보(닉네임·IP)를 함께 저장하지 않습니다.
        </li>
      </ul>

      <h3>나. 자동으로 생성·저장되는 것</h3>
      <ul>
        <li>
          <strong>투표 쿠키</strong> — 어느 질문에 어느 쪽으로 투표했는지를 담은 쿠키
          (<code>v_질문ID</code>). 중복 투표를 막고, 댓글을 어느 진영에 넣을지 정하는 데
          씁니다. HttpOnly로 설정되어 스크립트가 읽을 수 없습니다.
        </li>
        <li>
          <strong>댓글 작성 쿠키</strong> — 한 질문에 댓글을 이미 남겼는지 표시
          (<code>c_질문ID</code>). 도배를 막기 위해 씁니다.
        </li>
        <li>
          <strong>서버 접속 기록</strong> — 호스팅 사업자(Vercel)의 서버 로그에 IP 주소,
          브라우저 종류, 요청 시각, 요청 경로가 자동 기록됩니다. 저희가 별도로 수집하거나
          다른 정보와 결합하지 않습니다.
        </li>
      </ul>

      <h3>다. 이용자의 브라우저에만 남고 서버로 보내지 않는 것</h3>
      <p>
        아래는 <strong>브라우저 로컬 저장소에만</strong> 저장되며 서버로 전송되지 않습니다.
        브라우저 데이터를 지우면 함께 사라집니다.
      </p>
      <ul>
        <li>내 투표 내역과 &ldquo;다수파였던 적&rdquo; 기록</li>
        <li>어떤 댓글에 &ldquo;오케&rdquo;를 눌렀는지</li>
      </ul>

      <h2>2. 이용 목적</h2>
      <ul>
        <li>질문별 중복 투표 방지 및 득표 집계</li>
        <li>댓글의 게시와 진영(어느 쪽에 투표했는지) 표시</li>
        <li>스팸·도배·불법 게시물 차단</li>
        <li>서비스 운영과 장애 대응</li>
      </ul>
      <p>
        위 목적 외로는 이용하지 않으며, <strong>광고·마케팅 목적으로 이용하거나
        제3자에게 판매하지 않습니다.</strong>
      </p>

      <h2>3. 보유 기간과 파기</h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>항목</th>
              <th>보유 기간</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>투표·댓글 쿠키</td>
              <td>설정 시점부터 400일. 브라우저에서 직접 삭제할 수 있습니다.</td>
            </tr>
            <tr>
              <td>댓글 본문</td>
              <td>삭제 요청이 있거나 서비스가 종료될 때까지</td>
            </tr>
            <tr>
              <td>서버 접속 기록</td>
              <td>호스팅 사업자의 정책에 따름 (저희가 별도 보관하지 않습니다)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>4. 처리위탁 및 국외 이전</h2>
      <p>서비스 제공을 위해 아래 사업자에게 처리를 위탁하고 있습니다.</p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>수탁자</th>
              <th>위탁 업무</th>
              <th>보관 국가</th>
            </tr>
          </thead>
          <tbody>
            {processors().map(p => (
              <tr key={p.name}>
                <td>{p.name}</td>
                <td>{p.task}</td>
                <td>
                  {p.region.includes('미정') ? (
                    <span className={styles.fill}>{p.region}</span>
                  ) : (
                    p.region
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>5. 이용자의 권리와 행사 방법</h2>
      <p>
        이용자는 자신이 남긴 댓글의 <strong>삭제를 요청</strong>할 수 있습니다.
        아래 연락처로 <strong>해당 댓글이 달린 질문과 본문 내용</strong>을 알려주시면
        확인 후 지체 없이 삭제합니다.
      </p>
      <p>
        다만 이 사이트는 작성자를 식별하는 정보를 저장하지 않기 때문에,
        <strong> 본인이 쓴 글임을 확인할 수 있는 수단이 본문 내용 외에는 없습니다.</strong>
        이는 개인정보를 최소로 수집한 결과이며, 본인 확인이 어려운 요청은
        내용의 위법성 여부를 기준으로 처리합니다.
      </p>
      <p>
        쿠키는 브라우저 설정에서 직접 차단·삭제할 수 있습니다. 다만 투표 쿠키를 차단하면
        중복 투표 방지가 동작하지 않아 투표와 댓글 작성이 제한될 수 있습니다.
      </p>

      <h2>6. 만 14세 미만 아동</h2>
      <p>
        {SITE.name}는 만 14세 미만 아동을 대상으로 하지 않으며, 아동의 개인정보를
        의도적으로 수집하지 않습니다.
      </p>

      <h2>7. 안전성 확보 조치</h2>
      <ul>
        <li>투표 쿠키는 HttpOnly로 설정하여 스크립트 접근을 차단합니다.</li>
        <li>댓글 본문은 링크·연락처가 포함되면 저장 단계에서 거부합니다.</li>
        <li>집계·댓글 데이터베이스는 서버 전용 키로만 접근하며, 브라우저에 키를 노출하지 않습니다.</li>
      </ul>

      <h2>8. 방침의 변경</h2>
      <p>
        이 방침을 변경할 때에는 변경 내용과 시행일을 이 페이지에 게시합니다.
        중요한 변경은 시행 7일 전에 알립니다.
      </p>

      <h2>9. 개인정보 보호책임자</h2>
      <p>
        아래 연락처로 개인정보 처리에 관한 문의, 열람·삭제 요청, 고충 처리를 접수합니다.
      </p>
      <div className={styles.contact}>
        {/* 개인정보 보호법 제30조 ①6은 "성명 또는 부서의 명칭과 연락처"를 요구한다.
            실명이 유일한 답은 아니다 — 사업자등록을 하면 상호로 갈아끼우는 게 깔끔하다.
            사업장 주소는 이 조항의 기재사항이 아니므로 넣지 않는다.
            (전자상거래법 제10조의 주소 표시 의무는 통신판매업자 대상이고,
             오또케는 재화·용역을 판매하지 않는다.) */}
        책임자{' '}
        {SITE.privacyOfficer ? (
          SITE.privacyOfficer
        ) : (
          <span className={styles.fill}>lib/site.ts의 privacyOfficer를 채우세요</span>
        )}
        <br />
        연락처 <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        <br />
        <br />
        개인정보 침해에 대한 신고·상담이 필요하시면 개인정보침해신고센터(privacy.kisa.or.kr,
        국번없이 118) 또는 개인정보분쟁조정위원회(kopico.go.kr, 1833-6972)에 문의하실 수
        있습니다.
      </div>
    </article>
  );
}
