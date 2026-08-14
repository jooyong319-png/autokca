import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { ADMIN_COOKIE, isAdminToken } from '@/lib/admin';
import { allDrafts } from '@/lib/drafts';
import { QUESTIONS } from '@/lib/questions';
import { AdminList } from './AdminList';

/* 관리 화면. 매 요청 렌더 — 방금 바꾼 게 바로 보여야 한다. */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '안건 발행',
  /* 색인 금지. `robots.txt`에도 막아 두지만 메타로도 못 박는다 —
     robots.txt는 크롤 요청을 막을 뿐 이미 알려진 URL의 색인을 막지 못한다. */
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  /* 🔴 쿠키가 없거나 틀리면 **404**. 401이면 "여기 관리 화면이 있다"고 알려주는 셈이다. */
  if (!isAdminToken(cookies().get(ADMIN_COOKIE)?.value)) notFound();

  const drafts = await allDrafts();
  const waiting = drafts.filter(d => !d.publishedAt);
  const live = drafts.filter(d => d.publishedAt);

  /* 코드에 박힌 기존 질문의 id·slug. 후보가 이걸 침범하면 화면에서 먼저 경고한다 —
     발행 후에는 못 고치므로 여기서 잡아야 한다. */
  const takenIds = new Set(QUESTIONS.map(q => q.id));
  const takenSlugs = new Set(QUESTIONS.map(q => q.slug));

  return (
    <AdminList
      waiting={waiting}
      live={live}
      base={QUESTIONS.length}
      takenIds={[...takenIds]}
      takenSlugs={[...takenSlugs]}
    />
  );
}
