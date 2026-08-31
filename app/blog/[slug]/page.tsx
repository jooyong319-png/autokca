import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BreadcrumbJsonLd, PostJsonLd } from '@/components/JsonLd';
import { catalog } from '@/lib/catalog';
import { posts, postBySlug } from '@/lib/posts';
import { SITE } from '@/lib/site';
import styles from '../../legal.module.css';

export const revalidate = 3600;
/* 글은 코드에 있으므로 배포 시점에 전부 안다 — 온디맨드로 만들 것이 없다.
   모르는 슬러그는 404가 맞다(질문과 달리 나중에 생기지 않는다). */
export const dynamicParams = false;

function decode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function generateStaticParams() {
  return posts().map(p => ({ slug: p.slug }));
}

interface Params {
  params: { slug: string };
}

export function generateMetadata({ params }: Params): Metadata {
  const post = postBySlug(decode(params.slug));
  if (!post) return {};
  const canonical = `${SITE.url}/blog/${encodeURIComponent(post.slug)}`;
  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical },
    openGraph: {
      title: post.title,
      description: post.summary,
      url: canonical,
      type: 'article',
      publishedTime: post.published,
      ...(post.updated ? { modifiedTime: post.updated } : {}),
    },
  };
}

export default async function BlogPost({ params }: Params) {
  const post = postBySlug(decode(params.slug));
  if (!post) notFound();

  /* 관련 안건은 **실제로 있는 것만** 링크한다. 슬러그를 잘못 적으면 404로 내보내게 되는데,
     그건 크롤러에게도 사용자에게도 깨진 링크다. */
  const all = await catalog();
  const related = post.questions
    .map(slug => all.find(q => q.slug === slug))
    .filter((q): q is NonNullable<typeof q> => Boolean(q));

  const Body = post.body;

  return (
    <>
      <BreadcrumbJsonLd
        trail={[
          { name: SITE.name, path: '/' },
          { name: '읽을거리', path: '/blog' },
          { name: post.title, path: `/blog/${encodeURIComponent(post.slug)}` },
        ]}
      />
      <PostJsonLd post={post} />

      <article className={styles.doc}>
        <header className={styles.head}>
          <h1 className={styles.title}>{post.title}</h1>
          <span className={styles.effective}>
            {post.published}
            {post.updated ? ` · ${post.updated} 수정` : ''}
            {post.snapshot ? ` · 집계 ${post.snapshot} 기준` : ''}
          </span>
        </header>

        <Body />

        {related.length > 0 && (
          <div className={styles.contact}>
            <strong>이 글에서 다룬 안건</strong>
            <br />
            {related.map(q => (
              <span key={q.id}>
                <a href={`/q/${encodeURIComponent(q.slug)}`}>{q.q}</a>
                <br />
              </span>
            ))}
          </div>
        )}
      </article>
    </>
  );
}
