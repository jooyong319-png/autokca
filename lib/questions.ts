/* 질문 큐 — 이 프로젝트의 자산이자 최대 리스크(브리프 §3).
 *
 * 질문이 떨어지면 사이트가 죽는다. 큐가 30개 밑으로 내려가면 다음 묶음을 채운다.
 *
 * ─── 두 갈래로 굴린다 (브리프 §3, 비중 진지 3 : 병맛 7) ───────────────
 *  · `serious` = 유입 담당. 실제 논쟁거리라 검색된다. 검색 착지 페이지가 된다
 *  · `meme`    = 체류·공유 담당. 웃긴다. 투표 직후 다음 자리에 배치해 PV를 늘린다
 *
 * ─── 질문 작성 규칙 ──────────────────────────────────────────────
 *  1. 답이 둘로 갈려야 한다. 90:10이 뻔한 질문은 재미가 없다
 *  2. 어느 쪽을 골라도 부끄럽지 않아야 한다 — 한쪽을 고르면 이상한 사람이 되는 질문은 만들지 않는다
 *  3. 선택지는 짧게. 투표 칸 왼쪽에 한 줄로 들어가야 한다
 *  4. 🔴 **성별 갈등·정치 진영·종교는 넣지 않는다.** 논쟁은 되지만 모더레이션 부담이
 *     폭발하고, 초반 첫인상이 거기서 망가진다. 우리는 사람 손이 거의 안 들어가는
 *     모더레이션을 전제로 설계했다(lib/comments.ts)
 *
 * ⚠️ `id`는 집계 테이블의 키다. **배포 후 절대 바꾸지 않는다** — 바꾸면 표가 사라진다.
 * ⚠️ `slug`은 URL이다. 바꾸면 색인과 외부 링크가 깨진다. 역시 배포 후 고정이다.
 */

export type TopicSlug =
  | 'money'
  | 'work'
  | 'manners'
  | 'life'
  | 'office'
  | 'commute'
  | 'food'
  | 'messenger';

/** 질문의 역할. 외부 노출 필터링에도 쓴다(딱칼크에는 serious만 노출). */
export type Kind = 'serious' | 'meme';

export interface Question {
  /** 집계 키 — 배포 후 고정 */
  id: string;
  /** URL 슬러그(한글) — 질문 문장 자체가 검색 쿼리다(브리프 §6). 배포 후 고정 */
  slug: string;
  topic: TopicSlug;
  kind: Kind;
  q: string;
  /** 예 쪽 표시 문구 */
  a: string;
  /** 아니오 쪽 표시 문구 */
  b: string;
}

export interface Topic {
  slug: TopicSlug;
  name: string;
  description: string;
}

export const TOPICS: Topic[] = [
  { slug: 'money', name: '돈', description: '한국인이 가장 의견이 갈리는 주제.' },
  { slug: 'work', name: '일', description: '근무 조건과 제도에 관한 논쟁.' },
  { slug: 'manners', name: '예의', description: '해도 되나 안 되나 갈리는 것들.' },
  { slug: 'life', name: '인생', description: '결혼·집·아이 같은 큰 선택.' },
  { slug: 'office', name: '사무실', description: '자리와 화장실에서의 습관.' },
  { slug: 'commute', name: '출퇴근', description: '출근길과 퇴근 직전의 행동.' },
  { slug: 'food', name: '먹는 것', description: '점심시간의 사소한 진실.' },
  { slug: 'messenger', name: '메신저', description: '업무 카톡에서 벌어지는 일들.' },
];

/* 배열 순서 = 피드 순서. index 0이 첫 화면에 걸린다.
   새 질문은 **위에** 넣는다 — 재방문자가 새것을 먼저 본다. */
export const QUESTIONS: Question[] = [
  // ─────────────────────────────────────────────────────────────
  // 진지 — 유입 담당 (검색되는 실제 논쟁거리)
  // ─────────────────────────────────────────────────────────────
  { id: 'wedding-gift-50', slug: '축의금-5만원', topic: 'money', kind: 'serious',
    q: '친구 결혼식 축의금 5만원이면 적나요?', a: '적다', b: '괜찮다' },
  { id: 'gift-only-no-show', slug: '축의금만-보내기', topic: 'manners', kind: 'serious',
    q: '결혼식 안 가고 축의금만 보내도 되나요?', a: '괜찮다', b: '가야 한다' },
  { id: 'first-date-split', slug: '소개팅-비용-반반', topic: 'money', kind: 'serious',
    q: '소개팅 첫 만남 비용은 반반이 맞나요?', a: '반반이 맞다', b: '아니다' },
  { id: 'noise-upstairs', slug: '층간소음-직접-올라가기', topic: 'manners', kind: 'serious',
    q: '층간소음, 직접 올라가서 말해도 되나요?', a: '올라가도 된다', b: '관리실을 통해야 한다' },
  { id: 'holiday-pay-abolish', slug: '주휴수당-폐지', topic: 'work', kind: 'serious',
    q: '주휴수당을 폐지해야 하나요?', a: '폐지해야 한다', b: '유지해야 한다' },
  { id: 'four-day-week', slug: '주-4일제', topic: 'work', kind: 'serious',
    q: '주 4일제 도입에 찬성하나요?', a: '찬성', b: '반대' },
  { id: 'retire-65', slug: '정년-65세', topic: 'work', kind: 'serious',
    q: '정년을 65세로 연장해야 하나요?', a: '연장해야 한다', b: '반대' },
  { id: 'min-wage-by-sector', slug: '최저임금-업종별-차등', topic: 'work', kind: 'serious',
    q: '최저임금을 업종별로 다르게 정해야 하나요?', a: '차등이 맞다', b: '일률이 맞다' },
  { id: 'dinner-is-work', slug: '회식도-근무', topic: 'work', kind: 'serious',
    q: '회식도 근무의 연장인가요?', a: '근무다', b: '아니다' },
  { id: 'open-salary', slug: '사내-연봉-공개', topic: 'money', kind: 'serious',
    q: '회사에서 서로 연봉을 공개해야 하나요?', a: '공개해야 한다', b: '반대' },
  { id: 'wfh-keep', slug: '재택근무-계속', topic: 'work', kind: 'serious',
    q: '재택근무를 계속 허용해야 하나요?', a: '허용해야 한다', b: '출근이 맞다' },
  { id: 'dad-leave-year', slug: '남성-육아휴직-1년', topic: 'work', kind: 'serious',
    q: '남성도 육아휴직 1년을 쓰는 게 당연해져야 하나요?', a: '당연해져야 한다', b: '아니다' },
  { id: 'halfday-for-clinic', slug: '병원-반차-눈치', topic: 'work', kind: 'serious',
    q: '병원 가려고 반차 쓰는 게 눈치 보일 일인가요?', a: '눈치 보인다', b: '당연한 권리다' },
  { id: 'property-tax-abolish', slug: '종부세-폐지', topic: 'money', kind: 'serious',
    q: '종합부동산세를 폐지해야 하나요?', a: '폐지해야 한다', b: '유지해야 한다' },
  { id: 'buy-house-now', slug: '지금-집-사기', topic: 'life', kind: 'serious',
    q: '지금 집 사는 게 맞나요?', a: '사야 한다', b: '기다려야 한다' },
  { id: 'keep-subscription', slug: '청약통장-유지', topic: 'money', kind: 'serious',
    q: '주택청약통장을 계속 유지하는 게 맞나요?', a: '유지가 맞다', b: '깨는 게 낫다' },
  { id: 'pension-reform', slug: '국민연금-더-내고-더-받기', topic: 'money', kind: 'serious',
    q: '국민연금, 더 내고 더 받는 방향이 맞나요?', a: '맞다', b: '아니다' },
  { id: 'parents-allowance', slug: '부모님-용돈', topic: 'money', kind: 'serious',
    q: '부모님께 매달 용돈을 드려야 하나요?', a: '드려야 한다', b: '형편대로' },
  { id: 'help-from-parents', slug: '부모-도움-집-구매', topic: 'life', kind: 'serious',
    q: '부모님 도움 받아 집 사는 거 괜찮나요?', a: '괜찮다', b: '스스로 해야 한다' },
  { id: 'no-kids-zone', slug: '노키즈존', topic: 'manners', kind: 'serious',
    q: '노키즈존을 허용해야 하나요?', a: '허용해야 한다', b: '차별이다' },
  { id: 'pet-in-restaurant', slug: '식당-반려동물', topic: 'manners', kind: 'serious',
    q: '일반 식당에 반려동물을 데려와도 되나요?', a: '괜찮다', b: '안 된다' },
  { id: 'pregnant-seat-empty', slug: '임산부석-비어있을때', topic: 'manners', kind: 'serious',
    q: '지하철 임산부석, 비어 있으면 앉아도 되나요?', a: '앉아도 된다', b: '비워둬야 한다' },
  { id: 'cafe-four-hours', slug: '카페-4시간', topic: 'manners', kind: 'serious',
    q: '카페에서 커피 한 잔 시키고 4시간 있어도 되나요?', a: '괜찮다', b: '실례다' },
  { id: 'delivery-fee-3000', slug: '배달비-3천원', topic: 'money', kind: 'serious',
    q: '배달비 3,000원, 비싼가요?', a: '비싸다', b: '적정하다' },
  { id: 'tipping-korea', slug: '한국-팁-문화', topic: 'money', kind: 'serious',
    q: '한국에도 팁 문화가 생기는 게 괜찮나요?', a: '괜찮다', b: '반대' },
  { id: 'kickboard-sidewalk', slug: '전동킥보드-인도-주행', topic: 'manners', kind: 'serious',
    q: '전동킥보드 인도 주행을 금지해야 하나요?', a: '금지해야 한다', b: '허용해도 된다' },
  { id: 'condolence-amount-ask', slug: '경조사비-얼마', topic: 'money', kind: 'serious',
    q: '경조사비를 얼마 낼지 남에게 물어보나요?', a: '물어본다', b: '알아서 낸다' },
  { id: 'in-laws-first', slug: '명절-시댁-먼저', topic: 'life', kind: 'serious',
    q: '명절에 어느 한쪽 집을 먼저 가는 순서가 정해져 있어야 하나요?', a: '정해도 된다', b: '번갈아야 한다' },
  { id: 'marriage-optional', slug: '결혼-안-해도-되나', topic: 'life', kind: 'serious',
    q: '결혼 안 하고 사는 것도 괜찮나요?', a: '괜찮다', b: '하는 게 낫다' },
  { id: 'live-near-office', slug: '회사-근처-살기', topic: 'life', kind: 'serious',
    q: '회사 근처에 사는 게 낫나요?', a: '가까운 게 낫다', b: '멀어도 괜찮다' },
  { id: 'leave-reason', slug: '연차-사유-말하기', topic: 'work', kind: 'serious',
    q: '연차 쓸 때 사유를 말해야 하나요?', a: '말해야 한다', b: '말할 필요 없다' },
  { id: 'after-hours-message', slug: '퇴근-후-업무-연락', topic: 'work', kind: 'serious',
    q: '퇴근 후 업무 연락에 답해야 하나요?', a: '답해야 한다', b: '안 해도 된다' },

  // ─────────────────────────────────────────────────────────────
  // 병맛 — 체류·공유 담당
  // ─────────────────────────────────────────────────────────────
  { id: 'phone-toilet', slug: '화장실-휴대폰', topic: 'office', kind: 'meme',
    q: '화장실 갈 때 휴대폰 들고 가나요?', a: '들고 간다', b: '안 들고 간다' },
  { id: 'video-camera', slug: '화상회의-카메라', topic: 'office', kind: 'meme',
    q: '화상회의에서 카메라 켜라고 하면 켜나요?', a: '켠다', b: '어떻게든 안 켠다' },
  { id: 'meeting-other-tab', slug: '회의중-딴창', topic: 'office', kind: 'meme',
    q: '회의 중에 다른 창 보나요?', a: '본다', b: '안 본다' },
  { id: 'any-questions', slug: '질문-있으신가요', topic: 'office', kind: 'meme',
    q: '"질문 있으신가요?" 하면 질문하나요?', a: '한다', b: '절대 안 한다' },
  { id: 'meeting-notes', slug: '회의록-자원', topic: 'office', kind: 'meme',
    q: '회의록 작성을 자원하나요?', a: '자원한다', b: '눈을 피한다' },
  { id: 'unread-material', slug: '회의자료-읽은척', topic: 'office', kind: 'meme',
    q: '안 읽은 회의 자료를 읽은 척한 적 있나요?', a: '있다', b: '없다' },
  { id: 'mute-fail', slug: '음소거-실패', topic: 'office', kind: 'meme',
    q: '음소거인 줄 알고 말한 적 있나요?', a: '있다', b: '없다' },
  { id: 'meeting-bathroom', slug: '회의중-화장실', topic: 'office', kind: 'meme',
    q: '회의 중 화장실 가고 싶으면 참나요?', a: '참는다', b: '나간다' },
  { id: 'silent-meeting', slug: '한마디도-안한-회의', topic: 'office', kind: 'meme',
    q: '한마디도 안 하고 끝낸 회의가 더 많나요?', a: '그렇다', b: '아니다' },
  { id: 'screen-switch', slug: '상사-지나갈때-화면', topic: 'office', kind: 'meme',
    q: '상사가 지나갈 때 화면을 바꾸나요?', a: '바꾼다', b: '안 바꾼다' },
  { id: 'boss-kakao-speed', slug: '상사-카톡-답장-속도', topic: 'messenger', kind: 'meme',
    q: '상사 카톡을 읽고 바로 답하나요?', a: '바로 답한다', b: '조금 뜸 들인다' },
  { id: 'emoji-reply', slug: '이모티콘에-이모티콘', topic: 'messenger', kind: 'meme',
    q: '상사가 보낸 이모티콘에 이모티콘으로 답하나요?', a: '이모티콘으로', b: '텍스트로만' },
  { id: 'leave-dinner-first', slug: '회식-먼저-일어나기', topic: 'manners', kind: 'meme',
    q: '회식에서 먼저 일어나 본 적 있나요?', a: '있다', b: '없다' },
  { id: 'fake-laugh', slug: '안웃긴-농담에-웃기', topic: 'manners', kind: 'meme',
    q: '안 웃긴 농담에 웃어준 적 있나요?', a: '있다', b: '없다' },
  { id: 'peek-screen', slug: '옆자리-화면-보기', topic: 'office', kind: 'meme',
    q: '옆자리 화면을 본 적 있나요?', a: '있다', b: '없다' },
  { id: 'elevator-boss', slug: '엘리베이터-상사-단둘', topic: 'manners', kind: 'meme',
    q: '엘리베이터에 상사와 단둘이면 말을 거나요?', a: '말을 건다', b: '휴대폰을 본다' },
  { id: 'speak-freely', slug: '편하게-말해', topic: 'manners', kind: 'meme',
    q: '"편하게 말해"라고 하면 편하게 말하나요?', a: '편하게 말한다', b: '더 조심한다' },
  { id: 'private-meetup', slug: '회사사람-사적-만남', topic: 'manners', kind: 'meme',
    q: '회사 사람과 사적으로 만나나요?', a: '만난다', b: '안 만난다' },
  { id: 'nep', slug: '넵', topic: 'messenger', kind: 'meme',
    q: '업무 카톡에 "넵" 쓰나요?', a: '쓴다', b: '안 쓴다' },
  { id: 'hoho-count', slug: 'ㅎㅎ-개수-고민', topic: 'messenger', kind: 'meme',
    q: '"ㅎㅎ"를 몇 개 쓸지 고민한 적 있나요?', a: '있다', b: '없다' },
  { id: 'leave-group-chat', slug: '단톡방-나가기', topic: 'messenger', kind: 'meme',
    q: '단톡방을 나가본 적 있나요?', a: '있다', b: '없다' },
  { id: 'multi-profile', slug: '멀티프로필', topic: 'messenger', kind: 'meme',
    q: '회사 사람에게 프로필을 다 보여주나요?', a: '다 보여준다', b: '멀티프로필을 쓴다' },
  { id: 'boss-profile-stalk', slug: '상사-프로필-몰래보기', topic: 'messenger', kind: 'meme',
    q: '상사 프로필을 몰래 본 적 있나요?', a: '있다', b: '없다' },
  { id: 'can-we-talk', slug: '잠시-통화-가능하세요', topic: 'messenger', kind: 'meme',
    q: '"잠시 통화 가능하세요?"를 받으면 심장이 뛰나요?', a: '뛴다', b: '안 뛴다' },
  { id: 'unanswered-now', slug: '답-안한-메시지', topic: 'messenger', kind: 'meme',
    q: '읽고 답 안 한 업무 메시지가 지금 있나요?', a: '있다', b: '없다' },
  { id: 'lunch-decider', slug: '점심-메뉴-정하는-사람', topic: 'food', kind: 'meme',
    q: '점심 메뉴를 정하는 사람이 되고 싶나요?', a: '되고 싶다', b: '절대 싫다' },
  { id: 'lunch-alone', slug: '점심-혼자-먹고-싶은-날', topic: 'food', kind: 'meme',
    q: '점심을 혼자 먹고 싶은 날이 있나요?', a: '있다', b: '없다' },
  { id: 'lunch-nap', slug: '점심시간-낮잠', topic: 'food', kind: 'meme',
    q: '점심시간에 낮잠 자나요?', a: '잔다', b: '안 잔다' },
  { id: 'someone-snack', slug: '남의-간식', topic: 'food', kind: 'meme',
    q: '남의 간식을 먹어본 적 있나요?', a: '있다', b: '없다' },
  { id: 'delivery-smell', slug: '사무실-배달-냄새', topic: 'food', kind: 'meme',
    q: '사무실에서 배달 먹을 때 냄새를 신경 쓰나요?', a: '신경 쓴다', b: '안 쓴다' },
  { id: 'packed-lunch', slug: '도시락-싸기', topic: 'food', kind: 'meme',
    q: '점심값을 아끼려고 도시락 싸본 적 있나요?', a: '있다', b: '없다' },
  { id: 'coat-5min', slug: '퇴근-5분전-짐-챙기기', topic: 'commute', kind: 'meme',
    q: '퇴근 5분 전에 짐을 챙기나요?', a: '챙긴다', b: '정시에 챙긴다' },
  { id: 'run-when-late', slug: '지각할때-뛰기', topic: 'commute', kind: 'meme',
    q: '지각할 것 같으면 뛰나요?', a: '뛴다', b: '안 뛴다' },
  { id: 'ontime-leave-guilt', slug: '정시퇴근-눈치', topic: 'commute', kind: 'meme',
    q: '정시 퇴근이 눈치 보이나요?', a: '보인다', b: '안 보인다' },
  { id: 'calc-leaving-time', slug: '출근하며-퇴근시간-계산', topic: 'commute', kind: 'meme',
    q: '출근하면서 퇴근 시간을 계산하나요?', a: '계산한다', b: '안 한다' },
  { id: 'bathroom-at-home', slug: '화장실은-집에서', topic: 'commute', kind: 'meme',
    q: '화장실은 집에서 해결하고 나오나요?', a: '집에서', b: '회사에서' },
  { id: 'monday-sick', slug: '월요일-아침-아픔', topic: 'commute', kind: 'meme',
    q: '월요일 아침에 이유 없이 아픈 적 있나요?', a: '있다', b: '없다' },
  { id: 'friday-afternoon', slug: '금요일-오후-집중력', topic: 'commute', kind: 'meme',
    q: '금요일 오후에 일이 손에 잡히나요?', a: '잡힌다', b: '안 잡힌다' },
  { id: 'check-before-arrive', slug: '도착전-메시지-확인', topic: 'commute', kind: 'meme',
    q: '회사 도착 전에 업무 메시지를 미리 확인하나요?', a: '확인한다', b: '안 한다' },
  { id: 'long-bathroom', slug: '화장실-오래-있기', topic: 'office', kind: 'meme',
    q: '화장실에서 필요보다 오래 있어본 적 있나요?', a: '있다', b: '없다' },
  { id: 'wait-next-stall', slug: '옆칸-사람-기다리기', topic: 'office', kind: 'meme',
    q: '옆 칸에 사람이 있으면 나가는 걸 기다리나요?', a: '기다린다', b: '그냥 나간다' },
  { id: 'favorite-floor', slug: '화장실-층-정해두기', topic: 'office', kind: 'meme',
    q: '어느 층 화장실이 좋은지 정해뒀나요?', a: '정해뒀다', b: '아니다' },
  { id: 'shoes-off', slug: '자리에서-신발-벗기', topic: 'office', kind: 'meme',
    q: '자리에서 신발 벗나요?', a: '벗는다', b: '안 벗는다' },
  { id: 'office-temp', slug: '사무실-추운게-나은가', topic: 'office', kind: 'meme',
    q: '사무실은 추운 편이 나은가요?', a: '추운 게 낫다', b: '더운 게 낫다' },
  { id: 'wash-cup', slug: '회사컵-매일-씻기', topic: 'office', kind: 'meme',
    q: '회사 컵을 매일 씻나요?', a: '매일 씻는다', b: '며칠에 한 번' },
  { id: 'close-button', slug: '엘리베이터-닫힘-버튼', topic: 'manners', kind: 'meme',
    q: '엘리베이터 닫힘 버튼을 누르나요?', a: '누른다', b: '안 누른다' },
  { id: 'hold-for-runner', slug: '뛰어오는-사람-문-잡아주기', topic: 'manners', kind: 'meme',
    q: '멀리서 뛰어오는 사람을 위해 문을 잡아주나요?', a: '잡아준다', b: '그냥 닫는다' },
  { id: 'stairs-two-floors', slug: '2층-계단', topic: 'manners', kind: 'meme',
    q: '2층은 계단으로 가나요?', a: '계단', b: '엘리베이터' },
  { id: 'elevator-mirror', slug: '엘리베이터-거울', topic: 'manners', kind: 'meme',
    q: '엘리베이터에서 거울을 보나요?', a: '본다', b: '안 본다' },
  { id: 'bathroom-greeting', slug: '화장실에서-인사', topic: 'manners', kind: 'meme',
    q: '화장실에서 아는 사람을 만나면 인사하나요?', a: '인사한다', b: '모른 척한다' },
  { id: 'wfh-clothes', slug: '재택-옷-갈아입기', topic: 'work', kind: 'meme',
    q: '재택근무 때 옷을 갈아입나요?', a: '갈아입는다', b: '그대로 있는다' },
  { id: 'mouse-jiggle', slug: '마우스-흔들기', topic: 'work', kind: 'meme',
    q: '자리 비운 걸 안 들키려고 마우스를 움직여본 적 있나요?', a: '있다', b: '없다' },
  { id: 'twenty-tabs', slug: '탭-20개', topic: 'work', kind: 'meme',
    q: '브라우저 탭이 20개를 넘나요?', a: '넘는다', b: '안 넘는다' },
  { id: 'messy-desktop', slug: '바탕화면-파일', topic: 'work', kind: 'meme',
    q: '바탕화면에 파일이 쌓여 있나요?', a: '쌓여 있다', b: '깔끔하다' },
  { id: 'final-final', slug: '최종-최종', topic: 'work', kind: 'meme',
    q: '파일 이름에 "최종"을 두 번 이상 쓴 적 있나요?', a: '있다', b: '없다' },
  { id: 'unread-mail', slug: '안읽은-메일-100개', topic: 'work', kind: 'meme',
    q: '안 읽은 메일이 100개를 넘나요?', a: '넘는다', b: '안 넘는다' },
  { id: 'youtube-on', slug: '업무중-유튜브', topic: 'work', kind: 'meme',
    q: '업무 중에 유튜브를 켜두나요?', a: '켜둔다', b: '안 켠다' },
  { id: 'personal-on-work-pc', slug: '회사컴-개인일', topic: 'work', kind: 'meme',
    q: '회사 컴퓨터로 개인 일을 본 적 있나요?', a: '있다', b: '없다' },
  { id: 'wfh-better', slug: '재택이-더-편한가', topic: 'work', kind: 'meme',
    q: '재택이 더 편한가요?', a: '재택', b: '출근' },
  { id: 'payday-check', slug: '월급날-통장-확인', topic: 'money', kind: 'meme',
    q: '월급날에 통장을 확인하나요?', a: '확인한다', b: '안 본다' },
  { id: 'tell-salary', slug: '친구에게-월급-말하기', topic: 'money', kind: 'meme',
    q: '월급이 얼마인지 친구에게 말한 적 있나요?', a: '있다', b: '없다' },
  { id: 'first-number', slug: '연봉협상-숫자-먼저', topic: 'money', kind: 'meme',
    q: '연봉 협상에서 숫자를 먼저 말하나요?', a: '먼저 말한다', b: '기다린다' },
  { id: 'gray-expense', slug: '애매한-경비-청구', topic: 'money', kind: 'meme',
    q: '경비 청구에 애매한 걸 넣어본 적 있나요?', a: '있다', b: '없다' },
  { id: 'after-quitting', slug: '퇴사하면-뭐할지', topic: 'life', kind: 'meme',
    q: '퇴사하면 뭘 할지 생각해본 적 있나요?', a: '있다', b: '없다' },
  { id: 'job-site-month', slug: '한달내-이직사이트', topic: 'life', kind: 'meme',
    q: '최근 한 달 안에 이직 사이트를 본 적 있나요?', a: '있다', b: '없다' },
  { id: 'buy-lotto', slug: '로또-사나요', topic: 'money', kind: 'meme',
    q: '로또를 사나요?', a: '산다', b: '안 산다' },
  { id: 'use-all-leave', slug: '연차-다-쓰기', topic: 'work', kind: 'meme',
    q: '연차를 다 쓰나요?', a: '다 쓴다', b: '남긴다' },
  { id: 'weekend-work-thought', slug: '주말에-회사-생각', topic: 'life', kind: 'meme',
    q: '주말에 회사 생각이 나나요?', a: '난다', b: '안 난다' },
  { id: 'sunday-evening', slug: '일요일-저녁-우울', topic: 'life', kind: 'meme',
    q: '일요일 저녁이 우울한가요?', a: '우울하다', b: '괜찮다' },
  { id: 'vacation-reply', slug: '휴가중-업무-연락', topic: 'life', kind: 'meme',
    q: '휴가 중에 온 업무 연락에 답하나요?', a: '답한다', b: '안 답한다' },
  { id: 'saturday-holiday', slug: '빨간날-토요일-손해', topic: 'life', kind: 'meme',
    q: '빨간날이 토요일이면 손해라고 느끼나요?', a: '손해다', b: '아니다' },
];

/* ─── 조회 ───────────────────────────────────────────────────── */

const BY_SLUG = new Map(QUESTIONS.map(q => [q.slug, q]));
const BY_ID = new Map(QUESTIONS.map(q => [q.id, q]));

export function questionBySlug(slug: string): Question | undefined {
  return BY_SLUG.get(slug);
}

export function questionById(id: string): Question | undefined {
  return BY_ID.get(id);
}

export function topicBySlug(slug: string): Topic | undefined {
  return TOPICS.find(t => t.slug === slug);
}

export function byTopic(slug: TopicSlug): Question[] {
  return QUESTIONS.filter(q => q.topic === slug);
}

export function byKind(kind: Kind): Question[] {
  return QUESTIONS.filter(q => q.kind === kind);
}

/** 🔴 피드 순서 — 원칙 1·2의 핵심.
 *
 *  검색으로 들어온 사람은 진지 질문에 착지한다(브리프 §3). 그 사람이 투표한 직후
 *  **다음 자리에 병맛을 배치**해서 한 번 더 누르게 만든다. 진지만 이어지면 무겁고,
 *  병맛만 이어지면 가볍다. 그래서 **진지 1 : 병맛 2**로 번갈아 짠다.
 *
 *  `votesOf`를 넘기면 **각 갈래 안에서 표가 많은 순**으로 세운다(개선문서 §5-2).
 *  0표 질문이 첫 화면에 오면 죽은 사이트로 보인다 — 초기에는 이게 첫인상을 좌우한다.
 *  진지/병맛 리듬은 유지하면서 각 갈래의 앞자리만 채워진 질문으로 바꾸는 것이다.
 *
 *  @param excludeId 지금 보고 있는 질문 — 피드에서 뺀다
 *  @param votesOf   질문 id → 총 표 수. 없으면 배열 순서를 그대로 쓴다
 */
/** @param voted 이미 기표한 안건인지. 주면 **미투표를 앞으로** 보낸다(7차 §4-3).
 *
 *  🔴 정렬은 **갈래(진지/병맛) 안에서만** 한다. 아래 교차 배치가 그대로 유지되어야
 *  진지 1 : 병맛 2 비중이 깨지지 않는다(7차 §7 훼손 금지 항목).
 *
 *  🔴 투표한 것을 **숨기지 않는다.** 3표일 때 던졌는데 지금 200표가 됐으면 보러 오고,
 *  그게 핵심 재방문 이유다. 순서만 뒤로 보낸다.
 */
/** @param all 대상 목록. **코드 103개가 아니라 `catalog()`의 병합 결과를 넘긴다** —
 *  관리 화면에서 발행한 안건도 피드에 나와야 한다.
 *  모듈 상수를 직접 읽지 않는 이유가 이것이다. */
export function feedOrder(
  all: readonly Question[],
  excludeId?: string,
  votesOf?: (id: string) => number,
  voted?: (id: string) => boolean,
): Question[] {
  const pick = (kind: Kind) => {
    const list = all.filter(q => q.kind === kind && q.id !== excludeId);
    if (!votesOf && !voted) return list;
    /* 같은 순위면 원래 배열 순서를 지킨다 — 매 요청마다 순서가 흔들리면
       무한 스크롤에서 같은 질문이 두 번 나올 수 있다. */
    return list
      .map((q, i) => ({ q, i, v: votesOf ? votesOf(q.id) : 0, d: voted?.(q.id) ? 1 : 0 }))
      .sort((x, y) => x.d - y.d || y.v - x.v || x.i - y.i)
      .map(x => x.q);
  };

  const serious = pick('serious');
  const meme = pick('meme');
  const out: Question[] = [];

  let s = 0;
  let m = 0;
  while (s < serious.length || m < meme.length) {
    if (s < serious.length) out.push(serious[s++]);
    if (m < meme.length) out.push(meme[m++]);
    if (m < meme.length) out.push(meme[m++]);
  }
  return out;
}

/** 첫 화면에 걸리는 질문. 배열 첫 항목을 쓴다. */
export function leadQuestion(): Question {
  return QUESTIONS[0];
}

/** 큐에 남은 질문 수 — 30개 밑이면 다음 묶음을 채울 때다(브리프 §3). */
export function questionCount(): number {
  return QUESTIONS.length;
}

/** 관공서 문서번호 — 투표용지의 정색 장치.
 *  날짜가 아니라 질문에 매인 번호라야 아카이브에서도 같은 값이 나온다. */
/** 오늘 날짜(KST) — `YYYY-MM-DD`.
 *
 *  🔴 UTC를 그대로 쓰면 **오전 9시에 안건이 바뀐다.** 한국 사용자에게는 자정에 바뀌어야
 *  "오늘의 안건"이 말이 된다. 서버가 어느 시간대에 있든(Vercel은 UTC) 같은 값이 나오게
 *  UTC+9로 옮겨서 날짜만 뗀다. */
export function seoulDayKey(now: Date = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** `YYYY-MM-DD` → 에포크 기준 날짜 번호.
 *
 *  🔴 해시가 아니라 **순번**을 쓴다. 해시로 인덱싱하면 충돌 때문에 이틀 연속 같은 안건이
 *  나올 수 있다(실측: 21일 중 8/19·8/20이 같았다). 그러면 "매일 바뀐다"가 깨진다.
 *  순번을 나머지 연산하면 후보를 **한 바퀴 돌 때까지 겹치지 않고** 고르게 노출된다. */
function dayNumber(dayKey: string): number {
  return Math.floor(Date.parse(`${dayKey}T00:00:00Z`) / 86400000);
}

/** 홈 첫 카드로 올릴 "오늘의 안건" 후보 수. */
const ROTATE_POOL = 8;

/** 🔴 홈 첫 카드를 **상위권 안에서 매일 회전**시킨다.
 *
 *  왜 필요한가: 전에는 표가 가장 많은 진지 질문이 그대로 첫 카드였다. 그런데 첫 카드가
 *  노출을 가장 많이 받으니 표를 가장 많이 얻고, 그래서 계속 첫 카드다 —
 *  **1등이 1등이라서 계속 1등**이 되는 잠금이 생긴다.
 *  재방문자는 미투표 우선 정렬이 풀어 주지만 **신규 방문자는 영원히 같은 첫인상**을 받고,
 *  브리프 §3이 원한 시의성("매일 방문할 이유")을 만들 장치가 없었다.
 *
 *  왜 무작위가 아닌가: `Math.random()`이면 새로고침마다 바뀌어 ISR 캐시가 무의미해지고
 *  사용자도 "오늘의 안건"으로 인식하지 못한다. 날짜로 정하면 하루 종일 같은 값이라
 *  캐시가 그대로 유효하다.
 *
 *  왜 전체가 아니라 상위권인가: 완전 회전이면 0표짜리가 첫 화면에 올 수 있고,
 *  그건 "죽은 사이트" 인상을 준다. 검증된 것 안에서만 돌린다.
 *
 *  ⚠️ 후보를 **id 순으로 정렬한 뒤** 인덱싱한다. 표 순서로 인덱싱하면 하루 중에 표가
 *     움직일 때마다 "오늘의 안건"이 바뀐다 — 오후에 첫 카드가 갈리면 버그로 읽힌다.
 *
 *  ⚠️ 순서만 정한다. **집계는 건드리지 않는다**(제1원칙).
 *
 *  @param ranked 표 많은 순으로 정렬된 진지 질문
 *  @returns 오늘의 안건. 후보가 2개 미만이면 `null`(회전할 만큼 쌓이지 않았다)
 */
export function questionOfDay(ranked: Question[], dayKey: string): Question | null {
  /* 0표짜리는 후보에서 뺀다 — 첫 화면이 "아직 아무도 안 눌렀습니다"면 안 된다.
     표 정보를 모르는 호출(정렬 없이 넘긴 경우)에서는 그대로 상위 N개를 쓴다. */
  const pool = ranked.slice(0, ROTATE_POOL);
  if (pool.length < 2) return null;

  const stable = [...pool].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
  return stable[dayNumber(dayKey) % stable.length];
}

export function docNumber(question: Question): string {
  let hash = 0;
  for (const ch of question.id) hash = (hash * 31 + ch.codePointAt(0)!) % 10000;
  const index = QUESTIONS.findIndex(q => q.id === question.id) + 1;
  return `제${String(index).padStart(3, '0')}-${String(hash).padStart(4, '0')}호`;
}
