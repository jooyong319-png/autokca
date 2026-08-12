'use client';

import { useEffect, useRef } from 'react';
import styles from './AdSlot.module.css';

/* 인피드 광고 슬롯(2차 §3).
 *
 * 🔴 **광고 전략이 바뀐 지점을 기록해 둔다.** 브리프는 "세션당 PV가 매출을 결정한다"고
 *    했지만, 무한 스크롤이면 **아무리 스크롤해도 1 PV**다. 상세 하단에도 피드가 붙어
 *    페이지 이동이 거의 없다. 그래서 목표는 PV가 아니라 **노출(impression)**이고,
 *    애드센스는 노출 기준이므로 무한 스크롤이 오히려 유리하다.
 *
 * 🔴 **환경변수가 없으면 아무것도 그리지 않는다.** 승인 전에 자리만 잡아 두면
 *    빈 상자가 카드 사이에 끼어 리듬이 깨진다 — 광고보다 나쁜 상태다.
 *    승인 후 NEXT_PUBLIC_ADSENSE_CLIENT / NEXT_PUBLIC_ADSENSE_SLOT을 넣으면 켜진다.
 *
 * 🔴 카드 3~4개마다 하나만. 그 이상은 화면 대비 광고 비율 정책에 걸린다.
 */
export function AdSlot() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const slot = process.env.NEXT_PUBLIC_ADSENSE_SLOT;
  const ref = useRef<HTMLModElement | null>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!client || !slot || pushed.current) return;
    pushed.current = true;
    try {
      /* 애드센스 스크립트가 로드된 뒤에만 밀어 넣는다.
         무한 스크롤에서 슬롯이 늘어나므로 슬롯마다 한 번씩 호출해야 한다. */
      const w = window as unknown as { adsbygoogle?: unknown[] };
      (w.adsbygoogle = w.adsbygoogle ?? []).push({});
    } catch {
      /* 광고가 안 떠도 사이트는 돌아간다 */
    }
  }, [client, slot]);

  if (!client || !slot) return null;

  return (
    /* 질문 카드와 같은 종이 카드로 감싼다 — 스크롤 리듬을 유지한다(§3) */
    <aside className={styles.card} aria-label="광고">
      <span className={styles.label}>광고</span>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="fluid"
        data-ad-layout-key="-fb+5w+4e-db+86"
      />
    </aside>
  );
}
