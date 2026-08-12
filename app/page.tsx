import type { Metadata } from 'next';
import { Feed, type FeedItem } from '@/components/Feed';
import { docNumber, feedOrder, leadQuestion } from '@/lib/questions';
import { pageDescription, pageTitle } from '@/lib/seo';
import { SITE } from '@/lib/site';
import { readTally } from '@/lib/votes';

/* 득표율이 살아 있는 느낌을 주면서 요청 수도 감당되는 값 */
export const revalidate = 60;

/** 서버에서 미리 그리는 개수. 첫 화면이 비어 보이지 않을 만큼만. */
const SEED = 3;

export async function generateMetadata(): Promise<Metadata> {
  const question = leadQuestion();
  const tally = await readTally(question.id);
  const title = pageTitle(question, tally);
  const description = pageDescription(question, tally);
  return {
    title,
    description,
    alternates: { canonical: SITE.url },
    openGraph: { title, description, url: SITE.url },
  };
}

export default async function HomePage() {
  const order = feedOrder();
  const seed: FeedItem[] = await Promise.all(
    order.slice(0, SEED).map(async question => ({
      question,
      docNo: docNumber(question),
      tally: await readTally(question.id),
    })),
  );

  return <Feed initial={seed} startOffset={SEED} />;
}
