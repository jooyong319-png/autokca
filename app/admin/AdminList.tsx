'use client';

import { useCallback, useState } from 'react';
import type { Draft } from '@/lib/drafts';
import styles from './admin.module.css';

interface Props {
  waiting: Draft[];
  live: Draft[];
  /** 코드에 박힌 기존 질문 수 */
  base: number;
  takenIds: string[];
  takenSlugs: string[];
}

/* 체크하면 바로 발행된다. 배포가 필요 없다.
 *
 * 🔴 낙관적으로 옮기지 않는다 — 서버가 확인해 준 뒤에 목록을 옮긴다.
 *    발행은 되돌리기가 싼 동작이 아니다(발행되는 순간 표가 붙기 시작한다).
 *    "된 것처럼 보였는데 안 된" 상태가 가장 나쁘다.
 */
export function AdminList({ waiting, live, base, takenIds, takenSlugs }: Props) {
  const [rows, setRows] = useState({ waiting, live });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ids = new Set(takenIds);
  const slugs = new Set(takenSlugs);

  const toggle = useCallback(async (d: Draft, publish: boolean) => {
    setBusy(d.id);
    setError(null);
    try {
      const res = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: d.id, publish }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? '반영하지 못했습니다.');
        return;
      }
      /* 서버가 확인해 준 뒤에만 옮긴다 */
      setRows(prev =>
        publish
          ? {
              waiting: prev.waiting.filter(x => x.id !== d.id),
              live: [...prev.live, { ...d, publishedAt: new Date().toISOString() }],
            }
          : {
              waiting: [{ ...d, publishedAt: null }, ...prev.waiting],
              live: prev.live.filter(x => x.id !== d.id),
            },
      );
    } catch {
      setError('연결이 끊겼습니다.');
    } finally {
      setBusy(null);
    }
  }, []);

  const card = (d: Draft, published: boolean) => {
    /* 🔴 코드에 이미 있는 id·slug이면 발행하면 안 된다.
       id가 겹치면 기존 질문의 표에 붙고, slug이 겹치면 URL이 충돌한다. */
    const clashId = ids.has(d.id);
    const clashSlug = slugs.has(d.slug);
    const blocked = clashId || clashSlug;

    return (
      <li key={d.id} className={styles.item}>
        <label className={styles.row}>
          <input
            type="checkbox"
            className={styles.check}
            checked={published}
            disabled={busy === d.id || (!published && blocked)}
            onChange={e => toggle(d, e.target.checked)}
          />
          <span className={styles.body}>
            <span className={styles.q}>{d.q}</span>
            <span className={styles.meta}>
              <span className={d.kind === 'serious' ? styles.tagSerious : styles.tagMeme}>
                {d.kind === 'serious' ? '안건' : '별건'}
              </span>
              <span className={styles.topic}>#{d.topic}</span>
              <span className={styles.choice}>{d.a}</span>
              <span className={styles.slash}>/</span>
              <span className={styles.choice}>{d.b}</span>
            </span>
            <span className={styles.keys}>
              <code className={clashId ? styles.clash : undefined}>{d.id}</code>
              <span className={styles.slash}>·</span>
              <code className={clashSlug ? styles.clash : undefined}>{d.slug}</code>
            </span>
            {d.note && <span className={styles.note}>{d.note}</span>}
            {blocked && (
              <span className={styles.blocked}>
                {clashId && '기존 질문과 id가 겹칩니다 — 발행하면 그 질문의 표에 붙습니다. '}
                {clashSlug && 'slug이 겹칩니다 — URL이 충돌합니다. '}
                DB에서 값을 고친 뒤 발행하세요.
              </span>
            )}
          </span>
        </label>
      </li>
    );
  };

  return (
    <section className={styles.sheet}>
      <div className={styles.head}>
        <h1 className={styles.title}>안건 발행</h1>
        <span className={styles.count}>
          코드 {base} · 발행 {rows.live.length} · 대기 {rows.waiting.length}
        </span>
      </div>

      <p className={styles.lead}>
        체크하면 <strong>바로 사이트에 올라갑니다</strong>(배포 불필요).
        체크를 풀면 화면에서 내려가지만 <strong>표는 지워지지 않습니다</strong> —
        집계에서 표가 사라지면 신뢰가 깎입니다.
      </p>

      {error && <p className={styles.error}>{error}</p>}

      <h2 className={styles.section}>대기 {rows.waiting.length}건</h2>
      {rows.waiting.length === 0 ? (
        <p className={styles.empty}>
          대기 중인 후보가 없습니다. 수요일 자동 수집이 채웁니다.
        </p>
      ) : (
        <ul className={styles.list}>{rows.waiting.map(d => card(d, false))}</ul>
      )}

      <h2 className={styles.section}>발행됨 {rows.live.length}건</h2>
      {rows.live.length === 0 ? (
        <p className={styles.empty}>아직 발행한 후보가 없습니다.</p>
      ) : (
        <ul className={styles.list}>{rows.live.map(d => card(d, true))}</ul>
      )}
    </section>
  );
}
