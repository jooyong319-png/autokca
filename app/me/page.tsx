import type { Metadata } from 'next';
import { Certificate } from './Certificate';
import { QUESTIONS, TOPICS, docNumber } from '@/lib/questions';
import { SITE } from '@/lib/site';
import { readAllTallies } from '@/lib/votes';

/* 🔴 3600 → 300으로 낮췄다. 기표 내역에 **현재 비율**을 붙이므로 1시간 낡은 값은
   "지금 이렇다"는 말과 어긋난다. 이 페이지는 누구에게나 같은 HTML이라(개인화는 전부
   클라이언트에서 일어난다) ISR 캐시 효율은 그대로다. */
export const revalidate = 300;

export const metadata: Metadata = {
  title: '내 성향 확인서',
  description: '지금까지 투표한 내역으로 발급되는 확인서. 이 브라우저에 저장된 기록만 씁니다.',
  /* 내용이 브라우저마다 다르고 서버에는 아무것도 없다 — 색인할 게 없다. */
  robots: { index: false, follow: true },
  alternates: { canonical: `${SITE.url}/me` },
};

export default async function MePage() {
  /* 🔴 서버는 **누가 무엇을 골랐는지 모른다.** 안건 목록과 집계만 내려주고,
     "내가 어디에 기표했는지"는 브라우저의 `ottoke:voted`가 안다.
     그 둘을 맞추는 일은 클라이언트에서 일어난다 — 그래서 로그인이 필요 없다. */
  const tallies = await readAllTallies();

  return (
    <Certificate
      questions={QUESTIONS.map(q => ({
        id: q.id,
        topic: q.topic,
        slug: q.slug,
        docNo: docNumber(q),
        q: q.q,
        a: q.a,
        b: q.b,
        /* 집계가 죽어 있으면 `live: false`가 내려가고 화면이 비율을 감춘다 */
        tally: tallies.get(q.id) ?? { a: 0, b: 0, live: false },
      }))}
      topics={TOPICS.map(t => ({ slug: t.slug, name: t.name }))}
    />
  );
}
