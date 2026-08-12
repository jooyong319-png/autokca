import type { Metadata } from 'next';
import { QUESTIONS, byKind } from '@/lib/questions';
import { SITE } from '@/lib/site';
import styles from '../legal.module.css';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: '오또케는 무엇인가',
  description:
    '한 줄 질문에 투표하고 결과를 바로 확인하는 사이트. 질문은 누가 쓰고, 집계는 어떻게 하며, 무엇을 하지 않는지.',
  alternates: { canonical: `${SITE.url}/about` },
};

export default function AboutPage() {
  return (
    <article className={styles.doc}>
      <header className={styles.head}>
        <h1 className={styles.title}>오또케는 무엇인가</h1>
        <span className={styles.effective}>
          질문 {QUESTIONS.length}개 · 논쟁 {byKind('serious').length}개 ·
          {' '}그냥 궁금한 것 {byKind('meme').length}개
        </span>
      </header>

      <p className={styles.lead}>
        <strong>이거 나만 그래?</strong>
        <br />
        한 줄 질문에 예/아니오로 투표하면 결과가 바로 보입니다.
        나만 그런 줄 알았던 것들을 확인하는 곳입니다.
      </p>

      <h2>질문은 누가 쓰나</h2>
      <p>
        운영자가 씁니다. 지금은 이용자가 질문을 등록할 수 없습니다 —
        초반부터 자유 제출을 열면 스팸과 저품질로 첫인상이 망가지기 때문입니다.
        나중에 제출을 받되 승인 절차를 둘 예정입니다.
      </p>
      <p>
        질문을 쓸 때 지키는 규칙이 있습니다.
      </p>
      <ul>
        <li>
          <strong>답이 둘로 갈려야 합니다.</strong> 90:10으로 뻔한 질문은 재미가 없습니다.
        </li>
        <li>
          사소한 습관과 눈치를 건드립니다. <strong>능력·수입·외모는 건드리지 않습니다.</strong>
        </li>
        <li>
          <strong>어느 쪽을 골라도 부끄럽지 않아야 합니다.</strong> 한쪽을 고르면 이상한 사람이
          되는 질문은 만들지 않습니다.
        </li>
      </ul>

      <h2>집계는 어떻게 하나</h2>
      <p>
        표시되는 득표율은 <strong>실제 투표 수를 그대로 계산한 값</strong>입니다. 보정하거나
        가공하지 않습니다. 표가 적을 때는 참여자 수를 감추고 비율만 보여줍니다 —
        &ldquo;7명이 투표했습니다&rdquo;는 알려드릴 가치가 없다고 판단했습니다.
      </p>
      <p className={styles.notice}>
        <strong>다만 이것은 여론조사가 아닙니다.</strong> 표본을 설계해 추출한 게 아니라,
        이 사이트에 와서 스스로 투표한 사람만 집계됩니다. 국민 전체나 특정 집단의 의견을
        대표하지 않습니다. 인용하실 때 이 점을 함께 밝혀주십시오.
      </p>
      <p>
        중복 투표는 쿠키로 막습니다. 완전하지 않습니다 — 브라우저를 바꾸면 다시 투표할 수
        있습니다. 완전하게 막으려면 로그인을 요구해야 하는데, 그건 이 사이트가 하지 않기로 한
        일입니다.
      </p>

      <h2>계정을 만들지 않습니다</h2>
      <p>
        회원가입도 로그인도 없습니다. 이름·연락처·생년월일을 받지 않습니다.
        &ldquo;다수파였던 적 61%&rdquo; 같은 내 기록은 <strong>서버가 아니라 이 브라우저에만</strong>{' '}
        저장됩니다. 브라우저 데이터를 지우면 함께 사라지고, 저희는 복구할 수 없습니다.
      </p>
      <p>
        자세한 내용은 <a href="/privacy">개인정보처리방침</a>에 있습니다.
      </p>

      <h2>댓글</h2>
      <p>
        투표를 마치면 80자 이내로 한 줄 남길 수 있습니다. 각 의견에는{' '}
        <strong>어느 쪽에 투표한 쪽인지 표시</strong>됩니다. 그게 이 사이트에서 제일 재미있는
        부분이라고 생각합니다 — 결과보다 &ldquo;왜 그런지&rdquo;가 궁금하니까요.
      </p>
      <p>
        광고·링크·연락처는 기재 단계에서 거부됩니다. 신고가 누적된 의견은 자동으로 숨겨집니다.
        규칙은 <a href="/terms">이용약관</a>에 있습니다.
      </p>

      <h2>안 하는 것</h2>
      <ul>
        <li>
<strong>출석 보상·포인트·배지.</strong> 그런 걸 붙이는 순간 사이트가 구차해집니다.
        </li>
        <li>
<strong>훈계.</strong> 숫자만 보여드립니다. 판단은 알아서 하십시오.
        </li>
        <li>
<strong>진짜 평가.</strong> 소수파에게 &ldquo;이상한 사람&rdquo;이라고 하긴 하는데,
          그건 농담입니다. 비율 말고는 아무것도 모릅니다.
        </li>
        <li>
<strong>숫자 지어내기.</strong> 집계가 죽으면 결과를 감추고 죽었다고 씁니다.
        </li>
      </ul>

      <h2>이름</h2>
      <p>
        <strong>오또케</strong> — 뭘 어떡해야 할지 모를 때 내는 소리이고, 동시에
        만사 오케(OK)이기도 합니다. 투표 도장에 찍히는 글자가{' '}
        <strong>「오」</strong>인 이유도 그것입니다.
      </p>

      <div className={styles.contact}>
        문의 · 게시물 삭제 요청 <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        <br />
        <a href="/terms">이용약관</a> · <a href="/privacy">개인정보처리방침</a>
      </div>
    </article>
  );
}
