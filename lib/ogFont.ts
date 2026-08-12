import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** OG 이미지용 한글 폰트.
 *
 *  🔴 `next/og`에 내장된 폰트는 **라틴 전용**(noto-sans-v27-latin-regular)이라
 *  한글을 그리려면 파일을 직접 넘겨야 한다. 안 넘기면 전부 두부(□)로 나온다.
 *  Malgun Gothic 같은 시스템 폰트를 프로젝트에 복사하는 것은 재배포 라이선스 위반이다.
 *  넣는 방법은 `assets/README.md`.
 */
/* satori는 ttf·otf·woff를 읽는다. **variable 폰트는 못 읽으므로 static을 넣어야 한다** —
   PretendardVariable.ttf를 넣으면 조용히 폴백으로 떨어진다. 확장자는 둘 다 받아준다. */
const CANDIDATES = ['og-korean.otf', 'og-korean.ttf'];

export async function koreanFont(): Promise<ArrayBuffer | null> {
  for (const name of CANDIDATES) {
    try {
      const buf = await readFile(join(process.cwd(), 'assets', name));
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    } catch {
      /* 다음 후보를 시도한다 */
    }
  }
  return null;
}

/** 요청 시 생성이라 캐시를 직접 지정한다. */
export const OG_CACHE = {
  'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
};

export const OG_SIZE = { width: 1200, height: 630 };
