# assets

브라우저로 내려가지 않는다. **서버에서 읽는 자원**만 둔다.
(브라우저가 받아야 하는 파일은 `public/`에 둔다.)

## `og-korean.otf` — OG 이미지용 한글 폰트 ✅ 들어 있음

**Pretendard Bold v1.3.9** (OFL 1.1). `app/**/opengraph-image.tsx`가 읽어
공유 카드에 질문을 그린다.

### 왜 파일을 직접 넣어야 하나

`next/og`에 내장된 폰트는 **라틴 전용**(`noto-sans-v27-latin-regular.ttf`)이라
한글 글리프가 아예 없다. 안 넘기면 질문이 전부 두부(□)로 나온다.
그리고 Windows의 `malgun.ttf`(맑은 고딕)는 **재배포 라이선스 위반**이라 쓸 수 없다.

### 교체할 때 주의

- 🔴 **static 폰트를 넣는다.** satori는 **variable 폰트를 못 읽는다** —
  `PretendardVariable.ttf`를 넣으면 조용히 폴백(한글 없는 카드)으로 떨어진다
- `.otf`·`.ttf` 둘 다 받는다 (`lib/ogFont.ts`의 `CANDIDATES`)
- 없어도 사이트는 정상 동작한다. OG만 한글 없는 버전(도장 + `OTTOKE?!` + 도메인)이 된다

### 라이선스

OFL 1.1. 전문은 `public/fonts/Pretendard-LICENSE.txt`.
Reserved Font Name이 "Pretendard"이므로 **폰트를 수정해 배포할 때는 이름을 바꿔야 한다.**
그대로 쓰는 것은 제약이 없다.

## 배포 시 주의

`next.config.mjs`의 `outputFileTracingIncludes`가 이 폴더를 OG 라우트 두 곳에 포함시킨다.
설정을 지우면 Vercel 빌드에서 파일이 빠지고 폴백 이미지가 나간다.

## 알려진 문제

로컬 **Windows** dev/build에서는 `@vercel/og`가 자기 내장 폰트 경로를 잘못 만들어
`ERR_INVALID_URL`로 죽는다(Windows 한정). 그래서 OG 라우트를 빌드 프리렌더에서 뺐다.
**첫 배포 때 `/opengraph-image`와 `/q/<슬러그>/opengraph-image`를 눈으로 확인할 것.**
