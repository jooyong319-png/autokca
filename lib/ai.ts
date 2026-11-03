/* AI의 답 — "AI vs 사람들"(브리프 §0).
 *
 * 질문마다 AI가 **먼저** 고르고, 사람들이 어떻게 갈릴지 예측해 둔다.
 * 사람은 투표한 뒤 AI가 맞혔는지를 본다.
 *
 * 🔴 **AI는 표가 아니다.** 이 값은 집계(`tallies`)에 절대 들어가지 않는다.
 *    화면에서도 항상 "AI"라고 밝히고 사람 막대와 구분한다(제1원칙, 6차 §3).
 * 🔴 **예측을 고쳐 쓰지 않는다.** 결과를 보고 맞춰 고치면 "AI가 틀렸다"가 의미를 잃는다.
 *    틀리는 게 상품이다(wiki/decisions.md). 새 질문의 답은 **추가만** 한다.
 *    2026-11-04부터 새 질문의 답은 여기가 아니라 자동 수집과 함께 DB로 들어온다(lib/drafts.ts).
 * 🔴 사이트에서 AI를 실시간으로 부르지 않는다 — 질문을 쓸 때 같이 만들어 여기 박는다.
 *
 * 정책·제도 질문(세금·연금·임금·정년 등)은 **기권**(`pick: null`)하고 예측만 한다.
 * AI가 한쪽을 편들면 사이트가 정치색을 띤다. 질문 작성 규칙 4(lib/questions.ts)와 같은 이유다.
 *
 * `why`는 말투로 웃긴다(브리프 §5). **사실 주장을 쓰지 않는다** — "평균 7만원" 같은 문장은
 * 출처가 필요하고, 틀리면 숫자를 지어낸 것이 된다.
 *
 * 🔴 말투는 **건방진 AI**다. 틀렸을 때 재미있으려면 맞을 때 잘난 척해야 한다.
 *    · 짧게. 독자를 놀리거나 되묻는다("안 들고 간다는 분들, 거짓말이죠?")
 *    · 쓰지 않는다: "A는 B입니다"식 격언 · "A가 아니라 B" · "저는 손이 없어서" 같은 AI 농담.
 *      초안이 전부 이 틀이라 사용자가 "AI스럽다"고 돌려보냈다(2026-11-01)
 *    · 놀리는 대상은 독자의 습관까지다. 특정 집단을 깎지 않는다(질문 작성 규칙 2)
 */

export interface AiTake {
  /** AI의 선택. null = 기권(예측만 한다) */
  pick: 'a' | 'b' | null;
  /** AI가 예측한 "a를 고를 사람" 비율(%, 0~100) */
  guess: number;
  /** 한 줄 이유. 기권이면 빈 문자열 */
  why: string;
  /** 작성일(ISO). 예측 옆에 붙인다 — 나중에 고친 게 아님을 보여준다 */
  at: string;
}

/** 코드에 박힌 103개의 작성일. Claude(Anthropic)가 썼다.
 *  10-29 초안의 문구를 11-01 공개 전에 다시 썼다 — 공개된 뒤로는 고치지 않는다. */
const FIRST_BATCH = '2026-11-01';

type Row = [pick: 'a' | 'b' | null, guess: number, why: string];

/** 관리 화면에서 발행한 15개와 2026-11-04에 코드로 넣은 질문의 작성일. */
const SECOND_BATCH = '2026-11-04';

const TAKES_2: Record<string, Row> = {
  'office-ac-28': ['b', 30, '28도에서 일하라는 건 일하지 말라는 말이죠.'],
  'subway-ac-off-request': ['b', 28, '옆 사람은 땀 흘리는데 끄라고요?'],
  'summer-vacation-3days': ['a', 76, '주말 붙여도 닷새잖아요. 짐 풀면 끝나요.'],
  'electricity-progressive-rate': [null, 62, ''],
  'vacation-photo-groupchat': ['b', 18, '부장님 "좋겠네" 답장 받고 싶어요?'],
  'hair-loss-insurance': [null, 50, ''],
  'cardigan-at-office': ['a', 65, '의자에 걸린 그 겉옷, 작년부터 있었죠?'],
  'lunch-outside-heatwave': ['b', 35, '밥 먹으러 나갔다가 익어서 오게요?'],
  'ac-remote-secret-swap': ['a', 42, '없다고요? 그럼 그 온도 누가 바꿨어요.'],
  'arrive-early-appointment': ['a', 52, '일찍 가서 카페 찾는 거 다 알아요.'],
  'walk-on-moving-walkway': ['a', 60, '걸을 거면 무빙워크를 왜 타요.'],
  'fridge-name-label': ['a', 58, '안 쓰면 내 요거트 누가 먹어도 할 말 없어요.'],
  'profile-photo-change': ['b', 22, '그 사진 몇 년 전 얼굴이에요? 솔직히요.'],
  'personal-tumbler-office': ['b', 38, '그 텀블러 언제 씻었어요?'],
  'post-vacation-blues': ['b', 12, '잡힌다는 분, 휴가 안 다녀오셨죠?'],

  // 남의 답이 궁금한 질문(lib/questions.ts 끝)
  'ex-wedding-invite': ['b', 22, '가서 뭐 하게요. 밥 먹게요?'],
  'same-partner-next-life': ['b', 48, '옆에 있으면 눈치 보고 찍겠죠.'],
  'partner-ex-friends': ['b', 25, '쿨한 척은 얼마나 가요?'],
  'friend-partner-cheating': ['b', 68, '말했다가 님만 나쁜 사람 돼요.'],
  'couple-location-share': ['b', 30, '어디 갈 데 있어요?'],
  'partner-meal-my-friend': ['a', 55, '밥만 먹는다는데 왜 떨어요?'],
  'live-together-first': ['a', 60, '양말 벗는 곳은 살아 봐야 알죠.'],
  'confess-by-kakao': ['a', 28, '까이고 얼굴 볼 자신 있어요?'],
  'breakup-by-kakao': ['b', 18, '만나서 울 거 감당돼요?'],
  'marry-love-or-money': ['b', 45, '월세를 사랑으로 내요?'],
  'parents-oppose-partner': ['b', 25, '부모님 카드는 계속 쓰죠?'],
  'call-future-self': ['a', 75, '로또 번호부터 물을 거잖아요.'],
  'back-to-twenty': ['a', 70, '또 똑같이 살 거면서요.'],
  'long-poor-short-rich': ['b', 40, '70살 넘어서 뭐 하게요?'],
  'invisible-or-teleport': ['b', 30, '투명인간 돼서 뭐 하려고요?'],
  'forever-summer-winter': ['b', 45, '냉방비는 누가 내줘요?'],
  'give-up-kakao-delivery': ['a', 35, '배달이 사람보다 소중하죠?'],
  'no-phone-million': ['a', 58, '사흘째에 편의점 가겠죠.'],
  'dog-or-cat': ['a', 52, '집사 소리 듣고 좋아요?'],
  'skip-friend-wedding': ['b', 30, '축의금 장부 아직 있죠?'],
  'friend-never-pays': ['b', 42, '말할 용기 있었으면 벌써 했죠.'],
  'more-pay-no-weekend': ['b', 30, '주말에 뭐 하는데요?'],
  'lotto-next-day-work': ['b', 30, '사직서 문구 벌써 썼죠?'],
  'share-streaming-password': ['a', 65, '그 친구 님 시청 기록 다 봐요.'],
  'return-birthday-gift': ['b', 35, '장부는 마음속에 있죠?'],
  'luxury-or-travel': ['b', 22, '사진 남고 카드값도 남아요.'],
  'hire-wedding-guests': ['a', 40, '남들 눈이 그렇게 무서워요?'],
  'noshow-penalty': ['a', 80, '전화 한 통이 그렇게 어려워요?'],
  'relatives-nagging': ['b', 45, '연봉 물어보면 뭐라고 할 건데요?'],
  'living-cost-to-parents': ['a', 58, '엄마 밥값은 계산해 봤어요?'],
  'subway-phone-call': ['b', 25, '그 얘기 저도 다 들었어요.'],
  'cafe-bag-leave': ['b', 20, '그 자리 임대료 내셨어요?'],
  'airplane-seat-recline': ['b', 62, '뒷사람 무릎은 생각해 봤어요?'],
  'office-romance-secret': ['b', 30, '다들 벌써 알아요.'],
  'quit-by-kakao': ['b', 20, '다음 회사 평판 조회는요?'],
  'tangsuyuk-sauce': ['b', 45, '붓기 전에 물어는 봤어요?'],
  'mint-choco': ['a', 58, '치약 맛 아는 것도 재주네요.'],
  'pineapple-pizza': ['a', 55, '먹어 보고 말한 거 맞죠?'],
  'ramen-or-tteokbokki': ['a', 60, '떡볶이 고른 분, 위는 괜찮아요?'],
  'jjajang-or-jjamppong': ['b', 50, '결국 남의 거 뺏어 먹잖아요.'],
  'bungeoppang-head-tail': ['a', 65, '어차피 다 먹으면서 따져요?'],
  'ai-apology-letter': ['a', 38, '님이 쓰면 더 못 쓰잖아요.'],
  'ai-does-work-less-pay': ['b', 30, '일 안 하고 다 받고 싶은 거죠?'],
  'date-an-ai': ['a', 28, '님 애인보다 답장은 빠르죠.'],
  'ai-wedding-speech': ['a', 45, '어차피 다들 안 들어요.'],
  'ai-life-decisions': ['b', 18, '지금까지는 잘하셨어요?'],
  'doctor-or-ai': ['a', 78, '검색부터 하실 거면서요.'],
};

const TAKES: Record<string, Row> = {
  // ─── 진지 ───────────────────────────────────────────────────
  'wedding-gift-50': ['b', 45, '밥 안 먹고 오면 되잖아요.'],
  'gift-only-no-show': ['a', 62, '주말 하루가 더 비싸요. 계산 안 해 보셨죠?'],
  'first-date-split': ['a', 58, '누가 낼지 눈치 볼 시간에 애프터나 잡으세요.'],
  'noise-upstairs': ['b', 35, '올라가서 말 잘할 자신 있어요? 없잖아요.'],
  'holiday-pay-abolish': [null, 40, ''],
  'four-day-week': [null, 72, ''],
  'retire-65': [null, 55, ''],
  'min-wage-by-sector': [null, 45, ''],
  'dinner-is-work': ['a', 68, '부장님 앞에서 고기 굽는데 그게 쉬는 거예요?'],
  'open-salary': ['b', 38, '옆자리 연봉 알고도 내일 웃으면서 출근할 수 있어요?'],
  'wfh-keep': ['a', 74, '잠옷 입고 일해 보고도 반대한다고요?'],
  'dad-leave-year': [null, 63, ''],
  'halfday-for-clinic': ['b', 30, '감기한테 일정 좀 미뤄 달라고 해 보시든가요.'],
  'property-tax-abolish': [null, 45, ''],
  'buy-house-now': [null, 40, ''],
  'keep-subscription': [null, 60, ''],
  'pension-reform': [null, 42, ''],
  'parents-allowance': ['b', 35, '효도도 통장에 돈이 있어야 하죠.'],
  'help-from-parents': ['a', 66, '그 집값을 혼자 모으겠다고요? 몇 살까지 사시게요.'],
  'no-kids-zone': [null, 58, ''],
  'pet-in-restaurant': ['b', 34, '귀엽죠. 옆 테이블 생각은 안 하시네요.'],
  'pregnant-seat-empty': ['b', 40, '두 정거장 서서 간다고 안 죽어요.'],
  'cafe-four-hours': ['b', 42, '4시간이면 사장님이 님 얼굴 외웠어요.'],
  'delivery-fee-3000': ['a', 70, '3천원이면 라면이 몇 개예요. 세어 봤어요?'],
  'tipping-korea': ['b', 15, '메뉴판 가격에도 벌벌 떨면서 팁을요?'],
  'kickboard-sidewalk': ['a', 82, '뒤에서 쌩 지나가는 거 당해 봤으면 이런 질문 안 해요.'],
  'condolence-amount-ask': ['a', 61, '혼자 정했다가 제일 적게 내면 어쩌려고요.'],
  'in-laws-first': ['b', 25, '매년 같은 집 먼저요? 그 집은 좋겠네요.'],
  'marriage-optional': ['a', 78, '이걸 아직도 허락받아야 해요?'],
  'live-near-office': ['a', 64, '왕복 세 시간 타면서 워라밸 얘기는 하지 맙시다.'],
  'leave-reason': ['b', 28, '"개인 사정" 네 글자면 끝나요. 뭘 더 쓰려고요.'],
  'after-hours-message': ['b', 33, '읽씹이 왜 무서워요. 퇴근했잖아요.'],

  // ─── 병맛 ───────────────────────────────────────────────────
  'phone-toilet': ['a', 75, '안 들고 간다는 분들, 거짓말이죠?'],
  'video-camera': ['a', 55, '켜라는데 안 켤 배짱 있어요?'],
  'meeting-other-tab': ['a', 70, '지금도 보고 있잖아요, 다른 창.'],
  'any-questions': ['b', 18, '회의 5분 늘리는 사람이 되고 싶어요?'],
  'meeting-notes': ['b', 15, '자원한다고요? 신입이세요?'],
  'unread-material': ['a', 72, '없다고 찍으면 제가 믿을 줄 알았어요?'],
  'mute-fail': ['a', 45, '있잖아요. 그날 다 들었어요.'],
  'meeting-bathroom': ['a', 60, '일어나는 순간 다 쳐다볼 텐데요?'],
  'silent-meeting': ['a', 62, '말 꺼내면 님 일 되는 거 아시잖아요.'],
  'screen-switch': ['a', 55, '잘못한 것도 없으면서 왜 바꿔요. 근데 바꾸죠?'],
  'boss-kakao-speed': ['a', 52, '1 없어졌는데 어떻게 버텨요.'],
  'emoji-reply': ['a', 60, '이모티콘에 "네"라고 치는 사람이 더 무서워요.'],
  'leave-dinner-first': ['a', 55, '막차 핑계 한 번도 안 써 봤어요? 설마.'],
  'fake-laugh': ['a', 90, '없다고 찍으면 사회생활 안 해 본 거예요.'],
  'peek-screen': ['a', 65, '일부러 본 건 아니라고 하시겠죠.'],
  'elevator-boss': ['b', 35, '말 걸어서 뭐 하게요. 날씨 얘기?'],
  'speak-freely': ['b', 22, '진짜 편하게 말했다가 어떻게 되는지 아시잖아요.'],
  'private-meetup': ['a', 48, '만나서 또 회사 욕 하는 거 다 알아요.'],
  'nep': ['a', 85, '"네"만 보내면 화난 줄 알아요. 몰랐어요?'],
  'hoho-count': ['a', 62, 'ㅎ 하나 보내면 싸우자는 건데 당연히 고민하죠.'],
  'leave-group-chat': ['a', 58, '다들 한 번씩 나갔다가 다시 초대당해요.'],
  'multi-profile': ['b', 45, '부장님이 님 여행 사진 볼 일이 뭐 있어요.'],
  'boss-profile-stalk': ['a', 66, '배경 바뀌면 눌러 보잖아요. 티 안 나서 다행이죠.'],
  'can-we-talk': ['a', 78, '카톡으로 될 일을 왜 통화로 해요. 불길하죠.'],
  'unanswered-now': ['a', 70, '그 메시지 답은 안 하고 이거 누르고 있네요.'],
  'lunch-decider': ['b', 20, '맛없으면 누구 탓 되는지 아시죠?'],
  'lunch-alone': ['a', 80, '없다고요? 회사 사람들이 그렇게 좋아요?'],
  'lunch-nap': ['b', 40, '엎드려 자면 볼에 소매 자국 남아요.'],
  'someone-snack': ['a', 45, '그 과자 주인이 찾고 있던데요.'],
  'delivery-smell': ['a', 70, '떡볶이 시켜 놓고 당당할 수 있어요?'],
  'packed-lunch': ['a', 55, '딱 사흘 쌌죠?'],
  'coat-5min': ['a', 60, '5분 남았는데 아직도 일하는 척하게요?'],
  'run-when-late': ['a', 64, '뛰어서 1분 벌고 땀으로 다 들켜요.'],
  'ontime-leave-guilt': ['a', 55, '"먼저 가보겠습니다" 목소리 작아지는 거 들렸어요.'],
  'calc-leaving-time': ['a', 60, '9시 1분에 벌써 세고 있잖아요.'],
  'bathroom-at-home': ['a', 52, '회사 화장실에서 옆 칸 기다려 본 사람은 알죠.'],
  'monday-sick': ['a', 63, '금요일 저녁엔 멀쩡했으면서요.'],
  'friday-afternoon': ['b', 22, '잡힌다는 분, 상사 보라고 찍은 거죠?'],
  'check-before-arrive': ['a', 58, '지하철에서 미리 혈압 올리는 타입이시네요.'],
  'long-bathroom': ['a', 72, '5분이면 끝날 일을 15분 앉아 있잖아요.'],
  'wait-next-stall': ['a', 58, '손 씻다 마주치면 그 어색함 감당 돼요?'],
  'favorite-floor': ['a', 45, '몇 층이 한산한지 벌써 떠올렸죠?'],
  'shoes-off': ['a', 50, '책상 밑이라 안 보일 것 같죠. 냄새는 보여요.'],
  'office-temp': ['a', 55, '더우면 벗는 데 한계가 있어요. 회사잖아요.'],
  'wash-cup': ['b', 48, '며칠 됐어요? 솔직히요.'],
  'close-button': ['a', 72, '혼자 타도 누르잖아요. 왜 그렇게 급해요.'],
  'hold-for-runner': ['a', 62, '그냥 닫았다가 그 사람이랑 사무실에서 마주치면요?'],
  'stairs-two-floors': ['a', 52, '2층 가려고 엘리베이터 기다리는 거 다 봤어요.'],
  'elevator-mirror': ['a', 75, '앞머리 만지고 있었잖아요.'],
  'bathroom-greeting': ['b', 45, '거기서 "식사하셨어요?" 하게요?'],
  'wfh-clothes': ['b', 35, '카메라 켜라고 하면 그때 위에만 입으면 되잖아요.'],
  'mouse-jiggle': ['a', 30, '초록불 꺼질까 봐 떠는 거 귀엽네요.'],
  'twenty-tabs': ['a', 55, '닫으면 되는데 못 닫죠. 언젠간 볼 거라면서요.'],
  'messy-desktop': ['a', 60, '"임시" 폴더 안에 "임시2" 있죠?'],
  'final-final': ['a', 80, '최종_진짜최종_이거로.pptx 말하는 거예요.'],
  'unread-mail': ['a', 55, '빨간 숫자 안 보이는 척 잘하시네요.'],
  'youtube-on': ['a', 45, '일하는 데 노동요가 필요하다면서요.'],
  'personal-on-work-pc': ['a', 85, '쇼핑 탭 아직 열려 있던데요.'],
  'wfh-better': ['a', 75, '침대가 열 걸음 거리인데 뭘 물어요.'],
  'payday-check': ['a', 82, '확인하고 사흘 뒤에 또 보죠. 왜 줄었나.'],
  'tell-salary': ['a', 55, '술 들어가면 다 말하잖아요.'],
  'first-number': ['b', 30, '먼저 말했다가 깎이면 누구한테 따지려고요.'],
  'gray-expense': ['b', 32, '없다고 찍었어요. 감사팀 볼까 봐요.'],
  'after-quitting': ['a', 92, '없다는 분, 사장님이시죠?'],
  'job-site-month': ['a', 55, '구경만 했다고요? 이력서 고친 건요?'],
  'buy-lotto': ['b', 45, '그 돈으로 치킨 드세요. 치킨은 확실하잖아요.'],
  'use-all-leave': ['a', 58, '남긴다고 누가 상 줘요?'],
  'weekend-work-thought': ['a', 68, '일요일 오후에 벌써 메일 열어 봤죠?'],
  'sunday-evening': ['a', 74, '뻔한 걸 왜 물어요.'],
  'vacation-reply': ['b', 48, '해변에서 엑셀 열 거예요?'],
  'saturday-holiday': ['a', 86, '이건 사기당한 기분 맞아요.'],
};

export function aiOf(id: string): AiTake | null {
  const row = TAKES[id] ?? TAKES_2[id];
  if (!row) return null;
  const [pick, guess, why] = row;
  return { pick, guess, why, at: TAKES[id] ? FIRST_BATCH : SECOND_BATCH };
}

/** 안건의 AI 답. 자동 발행분은 질문에 실려 오고(`question.ai`), 그 전 것은 위 표에 있다.
 *  🔴 화면은 `aiOf`가 아니라 이걸 쓴다. 표만 보면 자동 발행분의 AI 칸이 비어 버린다. */
export function takeOf(question: { id: string; ai?: AiTake | null }): AiTake | null {
  return question.ai ?? aiOf(question.id);
}

/** 예측과 실제의 차이(%p). AI가 맞혔다고 말하는 기준이다. */
export const AI_HIT = 5;
