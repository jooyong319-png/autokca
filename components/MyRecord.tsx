'use client';

import { useEffect, useState } from 'react';

/** 내 기록 — 계정 없이 이 브라우저에만 쌓인다.
 *  서버에 두지 않는 이유는 로그인을 요구하지 않기 위해서다. 마찰이 재방문을 죽인다. */
export function MyRecord() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('ottoke:record');
      const rec = raw ? (JSON.parse(raw) as { n: number; major: number }) : { n: 0, major: 0 };
      setLabel(
        rec.n === 0 ? '아직 기록이 없습니다' : `${Math.round((rec.major / rec.n) * 100)}%`,
      );
    } catch {
      setLabel('기록을 읽을 수 없습니다');
    }
  }, []);

  return (
    <div className="slip">
      <h2>내 기록</h2>
      <p>
        {label === null
          ? ' '
          : label.endsWith('%')
            ? <>다수파였던 적 <span className="figure">{label}</span></>
            : label}
      </p>
    </div>
  );
}
