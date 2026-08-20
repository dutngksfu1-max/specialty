# 인수인계서 — 클래스렌즈

> 작성일: 2026-08-19 (최종 갱신: 2026-08-20, **B-1 안전 보정 완료 시점**)
> 받는 사람: 이 프로젝트를 이어서 개발할 개발자
>
> ⚠️ **이 문서의 4·5절은 Phase 0 시점 기준으로 쓰였습니다.**
> 현재 진행 상황은 아래 "현재 상태" 표와 `docs/decisions.md` 변경 이력을 보세요.

---

## 0. 30초 요약

| 항목 | 내용 |
|---|---|
| 제품 | 초등교사용 **교직 성향·업무 스타일 탐색 플랫폼** "클래스렌즈" |
| 쓰이는 곳 | 교사 연수 강의 (아이스브레이킹 · 자기이해 · 동료 대화 소재) |
| MVP | 40문항(10×4 Part) · 5점 척도 · 4축 → 16개 결과 프로필 |
| 현재 상태 | **Phase 1~5 완료 + Phase 6 진행 중.** 콘텐츠 3.1.0 B-1 안전 보정 완료 |
| 다음 할 일 | C 교사 인지 인터뷰·익명 파일럿 → 근거 확보 후 B-2 최종 보정 |
| 배포 주소 | `https://specialty-nu.vercel.app` (DEC-022 확정) |
| 가장 큰 함정 | ① 기존 성격유형 검사 관련 표현 노출 금지 ② 엔진에 콘텐츠 하드코딩 금지 |

코드 작업의 다음 단계는 막히지 않았지만, **B-2 최종 보정은 실제 교사 인터뷰와 익명 파일럿 근거가 생길 때까지 차단**되어 있습니다.
진행 방법과 기록지는 `docs/content/teacher-style-v1-validation.md`와 `docs/content/teacher-style-v1-interview-sheet.md`를 따릅니다.

---

## 1. 저장소 현황

```
specialty/                     ← 저장소 폴더
├─ AGENTS.md                   ← AI 에이전트용 규칙 요약 (작업 전 필독)
├─ HANDOVER.md                 ← 이 문서
└─ docs/
   ├─ PRD.md                   요구사항 SSOT
   ├─ design.md                디자인 SSOT (색·간격·컴포넌트·금지 패턴)
   ├─ architecture.md          구조 SSOT (계층·타입·채점·Repository·PWA)
   ├─ decisions.md             결정 기록 32건 (DEC-001~031 + 002b)
   └─ content/
      └─ teacher-style-v1.md   콘텐츠 작성 양식 (실제 문항 없음)
```

**소스 코드는 한 줄도 없습니다.** Phase 1이 프로젝트 초기화부터 시작합니다.

### 문서 읽는 순서 (처음 오신 분)

```
1. HANDOVER.md (이 문서)      — 전체 지도
2. AGENTS.md                   — 지켜야 할 규칙 (10분)
3. docs/PRD.md                 — 무엇을 만드는가
4. docs/architecture.md        — 어떻게 만드는가  ← 코딩 전 필수
5. docs/design.md              — 어떻게 보이는가  ← UI 작업 전 필수
6. docs/decisions.md           — 왜 이렇게 정했는가 / 무엇이 미정인가
```

---

## 2. 절대 규칙 5가지 (위반 시 되돌려야 함)

| # | 규칙 | 확인 방법 |
|---|---|---|
| 1 | **기존 성격유형 검사의 명칭·4글자 유형 코드를 어디에도 노출하지 않는다** (UI·URL·metadata·OG·manifest·결과 이미지 포함) | `grep -rEni "\bmbti\b\|\b[EI][NS][TF][JP]\b" src/ public/` → 0건 |
| 2 | **개인정보를 서버로 보내지 않는다.** 닉네임·응답·결과는 브라우저 로컬에만 | 네트워크 탭에 응답 전송 요청 없음 |
| 3 | **엔진과 콘텐츠를 분리한다.** 문항 수(40)·Part 수(4)·척도(5)·점수 범위(20)를 코드에 하드코딩하지 않는다 | 새 검사 폴더 추가만으로 검사 2종 노출되는지 실험 |
| 4 | **의존 방향을 지킨다.** `domain/`은 react·next·idb·supabase를 import하지 않는다 | `pnpm lint` (ESLint가 검사) |
| 5 | **채점은 동기 순수 함수.** `async`·I/O·`Date.now()`·`Math.random()` 금지 | 같은 입력 → 항상 같은 출력 (Vitest) |

> 규칙 3이 이 프로젝트의 존재 이유입니다. 검사를 계속 추가할 수 있는 플랫폼을 만드는 것이 목표이며,
> 첫 검사에 맞춰 짠 코드는 나중에 전부 다시 써야 합니다.

---

## 3. 확정 사양 (바꾸려면 새 DEC 필요)

### 3.1 채점 규칙 — **변경 금지**

```
centered  = 응답값 - 3                      1→-2  2→-1  3→0  4→+1  5→+2
rawScore  = Σ (centered × polarity × weight)
weight    = 전부 1                          (임의 가중치 금지)
범위      = 축당 10문항 → -20 ~ +20

강도 구간 (DEC-002b)   |rawScore|  0~4 균형 / 5~12 뚜렷 / 13~20 매우 뚜렷
방향                   >0 positive / <0 negative / =0 → axis.defaultPole
동점(0)                isBalanced = true, 0~4 전체는 화면 서술에서 한쪽으로 단정하지 않음 (DEC-046)
연속 점수              반드시 보존. 이산 결과 키만 남기지 않음
```

검증용 계산 예시 3개(양수 +14 / 음수 -12 / 정확히 0)가
`docs/architecture.md` 5.3절에 계산표까지 실려 있습니다. **그대로 테스트로 옮기세요.**

### 3.2 기술 스택 — 2026-08 기준 확인 완료

| 영역 | 선택 | 버전 | DEC |
|---|---|---|---|
| 프레임워크 | Next.js App Router + Turbopack | 16.3.x | — |
| 런타임 | React / react-dom | 19.2.x | — |
| 언어 | TypeScript strict | 5.x | — |
| 스타일 | Tailwind CSS (CSS-first `@theme`, OKLCH) | 4.3.x | DEC-011 |
| UI primitive | shadcn/ui — **Base UI가 기본** (2026-07~) | latest | — |
| 검증 | Zod | 4.4.x | — |
| 저장 | `idb` | 8.x | DEC-006 |
| PWA | `@serwist/turbopack` | Serwist 10+ | DEC-007 |
| 이미지 | `html-to-image` | 1.11.x | DEC-008 |
| 폰트 | Pretendard Variable (local) | — | DEC-012 |
| 테스트 | Vitest (+ `fake-indexeddb`) | latest | DEC-017 |
| 패키지 매니저 | pnpm | latest | DEC-016 |
| 배포 | Vercel | — | — |

**새 dependency는 사용자 승인 후에만 추가합니다.**
전역 상태 라이브러리(Redux·Zustand·Jotai 등)는 도입하지 않습니다 — Context + useState로 충분합니다.

### 3.3 확정된 제품 결정

| DEC | 주제 | 결정 |
|---|---|---|
| 001 / 046 | 동점·균형 처리 | 내부 키는 `defaultPole`로 유지하되 화면은 균형 서술·중립 안내 사용 |
| 002 / 002b | 축 강도 | 3구간 라벨, 경계 0~4 / 5~12 / 13~20 |
| 044 | 브랜딩 | 클래스렌즈 (IndexedDB 식별자 `searchteachermind`는 호환성을 위해 유지) |
| 006 | 저장 | idb |
| 007 | PWA | @serwist/turbopack |
| 008 | 결과 이미지 | html-to-image (1080×1350) |
| 010 | 재검사 | **최신 1개만 유지** (덮어쓰기) |
| 011 | 색상 | 세이지 그린 테마 + 웜 뉴트럴 + 클레이 포인트 |

---

## 4. 미결정 사항 통합 질문지

> **이 절을 그대로 복사해 클라이언트(강사)에게 한 번에 보내면 됩니다.**
> 각 항목에 추천안이 있으므로, 이견이 없으면 "추천안대로"라고만 답해도 진행 가능합니다.
> 상세 배경은 `docs/decisions.md`의 해당 DEC 번호를 보세요.

### 그룹 A — Phase 1 착수 전에 필요 (1건)

| # | 질문 | 선택지 | 추천 |
|---|---|---|---|
| **A-1** (DEC-030) | Pretendard 폰트 파일을 어떻게 준비할까요? | ① Variable 전체 파일 1개를 `public/fonts/`에 둔다<br>② 한글 서브셋을 만들어 용량을 줄인다<br>③ 정적 weight 파일 3개(400/600/700) | **①** — 파일 하나로 모든 굵기 커버, 관리 단순. 용량이 문제되면 나중에 ②로 전환 |

> A-1이 정해지지 않아도 시스템 폰트로 Phase 1을 시작할 수 있습니다. 다만 초반에 넣는 편이 편합니다.

### 그룹 B — Phase 2(랜딩·검사 화면) 전에 필요 (5건)

| # | 질문 | 선택지 | 추천 |
|---|---|---|---|
| **B-1** (DEC-025) | 로고를 어떤 형태로 할까요? | ① 텍스트 워드마크만 (Pretendard 조판)<br>② 심볼 + 워드마크<br>③ 외부 디자이너 의뢰 | **①** — editorial 디자인 방향과 잘 맞고 추가 비용 없음. 나중에 ②로 올리기 쉬움 |
| **B-2** (DEC-026) | 랜딩에 "준비 중"으로 보여 줄 검사 3개의 이름은? | ① 협업 스타일 / 수업 운영 리듬 / 교직 가치관<br>② 실제 개발 예정 순서대로 직접 지정<br>③ 준비 중 카드를 없앰 | **②** — 실제로 만들 계획이 있는 것만 노출해야 신뢰를 잃지 않음. ①을 초안으로 활용 |
| **B-3** (DEC-027) | Hero 문구와 FAQ 4~6개를 누가 쓸까요? | ① 개발자가 초안 작성 → 검수<br>② 직접 작성 | **①** — 분량이 작아 검수가 빠름 |
| **B-4** (DEC-028) | **이 검사가 표준화된 심리검사가 아님을 안내할까요?** | ① 검사 시작 화면 + 결과 하단에 짧게 명시<br>② FAQ에만 넣음<br>③ 안내 없음 | **①** — 강의에서 공식적으로 쓰이므로, 과잉 해석을 막는 한 줄이 오히려 신뢰를 높입니다. ③은 권하지 않습니다 |
| **B-5** (DEC-029) | "응답이 서버로 안 가고 브라우저에만 저장된다"는 안내를 어디에? | ① 닉네임 옆 + 검사 소개 + Footer (3곳)<br>② Footer와 FAQ만<br>③ 개인정보 처리방침 페이지 별도 제작 | **①** — 이 서비스의 강점이므로 눈에 띄게. ③은 서버 저장이 없는 MVP엔 과함 |

### 그룹 C — Phase 4(실제 콘텐츠) 전에 필요 (3건) ⭐ 가장 오래 걸림

| # | 질문 | 선택지 | 추천 |
|---|---|---|---|
| **C-1** (DEC-023) ⭐ | **4개 축을 각각 무엇으로 정의할까요?** (축 이름 + 양 끝 스타일 이름 + 설명) | ① 강사가 직접 정의<br>② 개발자가 초안 4축 제안 → 수정<br>③ 외부 전문가 자문 | **② 후 ①** — 백지보다 초안 수정이 빠름. **기존 성격유형 검사의 축을 그대로 옮기는 것은 금지** |
| **C-2** (DEC-024) | 40문항 + 16개 결과 텍스트를 누가 쓸까요? | ① 전부 클라이언트<br>② 전부 개발자 초안 → 검수<br>③ 문항은 클라이언트, 결과 텍스트는 개발자 초안 | **③** — 문항은 현장 감각이, 결과 텍스트는 분량(A4 15~20쪽)이 관건 |
| **C-3** (DEC-020) | MVP 검사의 정식 제목은? (서비스명과 별개) | ① "나의 교직 스타일 탐색"<br>② "교실 운영 리듬 검사"<br>③ 축이 정해진 뒤 함께 확정 | **③** — 실제 축·문항과 톤이 맞아야 함 |

**C-1이 이 프로젝트 최대 블로커입니다.** 축이 정해져야 문항도 결과 프로필도 쓸 수 있습니다.
Phase 1~3은 fixture로 진행되므로 병렬로 준비하시면 일정이 겹치지 않습니다.

### 그룹 D — Phase 5~6(배포) 전에 필요 (3건)

| # | 질문 | 선택지 | 추천 |
|---|---|---|---|
| **D-1** (DEC-031) | PWA 아이콘·파비콘을 누가 만들까요? | ① 워드마크 기반 단순 아이콘을 개발자가 생성<br>② 디자이너 의뢰<br>③ placeholder 후 교체 | **①** — B-1에서 텍스트 워드마크를 택하면 같은 톤으로 제작 가능. ③은 교체를 잊기 쉬움 |
| **D-2** (DEC-022) | 배포 주소는? | ① Vercel 기본 도메인(`*.vercel.app`)<br>② 별도 도메인 구매 | **①로 시작 → 실사용 시작하면 ②** (주소에도 금지 표현 사용 불가) |
| **D-3** (DEC-021) | 다크 모드를 지원할까요? | ① MVP는 라이트 전용 (토큰 구조는 대응 가능하게 준비됨)<br>② 처음부터 함께 구현 | **①** — 검증 조합이 두 배가 되어 MVP 일정에 부담 |

### 그룹 E — 확인만 받으면 되는 항목 (11건, 일괄 확인 가능)

제가 기본값으로 정해 둔 것입니다. **이견이 없으면 "전부 그대로"라고 답하시면 됩니다.**

| DEC | 항목 | 기본값 | 이유 |
|---|---|---|---|
| 004 | 축 식별자 | 엔진은 중립 `axisId`만, 이름은 콘텐츠 소유 | 엔진이 특정 검사에 묶이지 않게 |
| 005 | Part 이동 | Part별 라우트 `/run/[part]` | 브라우저 뒤로가기 = 이전 Part |
| 009 | 닉네임 | 선택 입력(1~12자), 비우면 '선생님' | 로그인처럼 보이지 않게 |
| 012 | 폰트 | Pretendard Variable (로컬) | 한글 가독성 + 오프라인 동일 표시 |
| 013 | 결과 공유 | MVP는 이미지 저장만 | URL 공유는 서버 렌더가 필요해짐 |
| 014 | 미응답 | 전 문항 응답해야 결과 확인 | 부분 응답은 점수를 왜곡 |
| 015 | 데이터 보존 | 무기한 + 수동 삭제 버튼 | 자동 삭제는 사용자를 당황시킴 |
| 016 | 패키지 매니저 | pnpm | 설치 빠름, Vercel 자동 인식 |
| 017 | 테스트 | Vitest (채점 우선) | 채점이 조용히 틀리면 아무도 모름 |
| 018 | 척도 라벨 | 양 끝만 표시(중간은 스크린리더용 라벨 제공) | 360px에 5개 라벨은 안 들어감 |
| 019 | Analytics | 수집 안 함 | 개인정보 원칙과 일관 |

---

## 5. Phase 1 착수 절차 (복사해서 바로 실행)

### 5.1 환경 확인

```bash
node -v      # v20 이상 (v22 LTS 권장)
pnpm -v      # 없으면: npm i -g pnpm
git --version
```

### 5.2 프로젝트 초기화

```bash
cd /path/to/specialty

# Next.js 초기화 (현재 폴더에, docs/는 유지됨)
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --turbopack --import-alias "@/*"

# 핵심 의존성
pnpm add zod idb html-to-image
pnpm add -D vitest @vitest/coverage-v8 fake-indexeddb

# PWA (Phase 5에서 실제 설정, 설치는 미리 해 둬도 무방)
pnpm add @serwist/turbopack serwist

# shadcn/ui (Base UI 기본)
pnpm dlx shadcn@latest init
```

### 5.3 Phase 1 작업 순서

| 순서 | 작업 | 산출물 | 완료 판정 |
|---|---|---|---|
| 1 | `tsconfig.json` strict 확인, path alias `@/*` | — | `pnpm build` 통과 |
| 2 | ESLint 계층 규칙 추가 | `eslint.config.mjs` | `domain/`에서 react import 시 에러 |
| 3 | 공통 타입 | `src/domain/shared/{result,ids}.ts` | — |
| 4 | 도메인 모델 | `src/domain/assessment/model/*` | `architecture.md` 4.2절 그대로 |
| 5 | 오류 타입 | `src/domain/assessment/errors/*` | 코드 10종 |
| 6 | **채점 순수 함수** | `src/domain/assessment/scoring/*` | ← 여기가 핵심 |
| 7 | **채점 테스트** | `scoring.test.ts` | `architecture.md` 5.3 예시 A/B/C + 경계값 |
| 8 | port 인터페이스 | `src/domain/assessment/ports/*` | Repository + Catalog |
| 9 | Zod 스키마 | `src/infrastructure/content/contentPackageSchema.ts` | 무결성 검증 10항목 |
| 10 | **fixture 콘텐츠** | `.../packages/teacher-style-v1/` | 40문항 더미 + 16프로필 더미 |
| 11 | 카탈로그 | `StaticAssessmentCatalog.ts` | — |
| 12 | Application 유스케이스 | `src/application/assessment/*` | 7개 함수 |
| 13 | InMemory Repository | `.../persistence/memory/*` | 테스트용 |
| 14 | Application 테스트 | `*.test.ts` | 미응답·버전 불일치 케이스 |

### 5.4 Phase 1 완료 기준

```bash
pnpm lint          # 의존 규칙 위반 0
pnpm vitest run    # 전부 통과
pnpm build         # 타입 오류 0
```

- [ ] 채점 예시 A(+14) / B(-12) / C(0) 테스트 통과
- [ ] 경계값 4↔5, 12↔13에서 구간 라벨이 정확히 바뀜
- [ ] 16개 조합 전부 프로필이 찾아짐
- [ ] 잘못된 콘텐츠 패키지 → `INVALID_CONTENT_PACKAGE`
- [ ] `domain/`에서 react를 import하면 lint 에러가 남 (규칙이 실제로 작동하는지 확인)
- [ ] **화면은 아직 없어도 됨** (Phase 2)

### 5.5 fixture 작성 지침 (중요)

Phase 1의 fixture는 **형식만 맞으면 되고 내용은 의미가 없어도 됩니다.**

```ts
// 예: 문항 텍스트는 이런 식이면 충분합니다
text: `[fixture] 축 ${axisId} 문항 ${order}`
```

**단, 아래는 실제와 똑같이 맞춰야 테스트가 의미를 가집니다.**

- 문항 40개, 축 4개 × 10문항
- 축마다 polarity `+1` 5개 / `-1` 5개
- Part마다 여러 축이 섞이도록 배치
- 결과 프로필 16개 전부 (조합 누락 없이)
- `intensityBands` 0~4 / 5~12 / 13~20
- 각 축에 `defaultPole` 지정

> **fixture에 실제 교직 관련 문장을 쓰지 마세요.** 나중에 실제 콘텐츠와 섞여
> "이게 fixture인가 실제인가" 헷갈립니다. `[fixture]` 접두사를 꼭 붙이세요.

---

## 6. 이후 Phase 요약

| Phase | 내용 | 상태 |
|---|---|---|
| 1 | 엔진 Foundation (도메인·채점·테스트) | ✅ 완료 |
| 2 | 랜딩 + 검사 진행 화면 + IndexedDB | ✅ 완료 |
| 3 | 결과 화면 + 4축 시각화 + 이미지 저장 | ✅ 완료 |
| 4 | 실제 콘텐츠(축 4·문항 40·결과 16) | ✅ 완료 — **초안 검수 대기** (DEC-020·023·024) |
| 5 | PWA · 오프라인 · 접근성 | ✅ 완료 — 실기기 QA는 사람이 해야 함 |
| 6 | 오류 처리 · 성능 · 메타데이터 · 배포 | 🔶 진행 중 — 메타데이터·성능 완료, **실배포 확인은 사람이** |
| 7 | (선택) Supabase — Room·QR·실시간 집계 | ⬜ 별도 PRD + **개인정보 승인 필수** |

**Phase 1~5에서 늘어난 것 (Phase 0 기준 대비)**

- 소스 파일 약 60개, 테스트 **136개** (`pnpm test`)
- 추가된 dependency: `zod` `idb` `html-to-image` `serwist` `@serwist/turbopack` +
  개발용 `vitest` `fake-indexeddb` `esbuild` `esbuild-wasm`
- 새 결정: DEC-032~036 (`docs/decisions.md`)
- `docs/design.md`는 **v0.2**로 갱신됨 (랜딩 개편, DEC-036)

각 Phase의 완료 기준은 `docs/PRD.md`의 Acceptance Criteria(AC-1~7)를 따릅니다.

---

## 7. 자주 빠지는 함정

| 함정 | 왜 문제인가 | 대신 |
|---|---|---|
| 편의를 위해 페이지에 `"use client"` | Server Component 이점을 전부 버림 | state/event가 필요한 최소 컴포넌트만 |
| 채점 함수를 `async`로 | 테스트가 어려워지고 설계 의도가 깨짐 | 동기 순수 함수 유지 |
| 컴포넌트 안에서 Repository를 `new` | 저장소 교체 불가능 | `AssessmentRepositoryProvider`에서 주입 |
| `40`, `4`, `5`, `20`을 코드에 씀 | 다음 검사에서 전부 깨짐 | 전부 `definition`에서 읽기 |
| 응답 저장을 디바운스 | 이탈 시 유실 — 이 제품의 핵심 요구사항 위반 | 클릭 즉시 저장 |
| 에러 코드를 화면에 그대로 노출 | 교사 사용자가 이해 못 함 | `lib/errorMessages.ts` 매핑만 사용 |
| 척도를 `div` + `onClick`으로 구현 | 키보드·스크린리더 완전 불가 | 진짜 `<input type="radio">` |
| `outline: none`만 남김 | 키보드 사용자가 위치를 잃음 | `focus-visible` 스타일 반드시 제공 |
| 결과에서 사람을 맞음/안 맞음으로 분류 | 제품 톤 위반 | "함께할 때 잘 이어지는 / 미리 맞춰 두면 좋은" |
| 새 SW 감지 시 자동 새로고침 | 검사 도중 응답 유실 | 안내만 하고 사용자가 누를 때 갱신 |
| 토큰에 없는 색·간격 즉흥 사용 | 디자인이 금방 무너짐 | 먼저 `design.md`에 토큰 추가 |
| 다크 모드를 먼저 만듦 | 검증 조합 2배 (DEC-021에서 보류) | 라이트 먼저 |

---

## 8. 작업 후 매번 확인할 것

```bash
pnpm lint
pnpm vitest run
pnpm build
grep -rEni "\bmbti\b|\b[EI][NS][TF][JP]\b" src/ public/     # 0건이어야 함
```

> 단어 경계(`\b`)를 반드시 붙입니다. 빼면 `listPublished`(→`istP`),
> `contentPackageSchema`(→`entP`) 같은 평범한 영어 식별자가 오탐으로 잡힙니다.
> `public/`은 Phase 2부터 생깁니다.

- [ ] 360px 폭에서 가로 스크롤 없음
- [ ] 키보드만으로 조작 가능, focus 링 보임
- [ ] 선택·오류 상태가 색 외에도 전달됨
- [ ] `docs/design.md` 16절 금지 패턴 20개 해당 없음
- [ ] 새 결정을 했다면 `docs/decisions.md`에 기록했는가

---

## 9. 다음 개발자용 시작 프롬프트

> AI 코딩 에이전트(Claude Code / Codex 등)를 쓰신다면, 아래를 **그대로 복사해 첫 메시지로** 넣으세요.

```text
이 저장소를 이어받아 개발합니다. 코드를 쓰기 전에 아래를 먼저 읽어 주세요.

1) AGENTS.md
2) docs/PRD.md
3) docs/architecture.md
4) docs/design.md
5) docs/decisions.md
6) HANDOVER.md

[프로젝트]
초등교사용 교직 성향·업무 스타일 탐색 플랫폼 "클래스렌즈"입니다.
강의(연수)에서 아이스브레이킹과 자기이해 용도로 쓰입니다.
검사를 계속 추가할 수 있는 Assessment Platform이며, MVP는 40문항 검사 1종입니다.

[현재 상태]
Phase 0(설계 문서)만 완료되었고 소스 코드는 0줄입니다. package.json도 없습니다.
지금 할 일은 Phase 1 — Next.js 초기화 + 도메인 모델 + 채점 엔진 + Vitest 테스트입니다.
화면(UI)은 Phase 2이므로 이번에는 만들지 않습니다.

[절대 규칙 — 위반 시 되돌려야 합니다]
1. 기존 성격유형 검사의 명칭·4글자 유형 코드를 어디에도 노출하지 않습니다.
   UI, URL/slug, <title>, metadata, OG 태그, manifest, 결과 이미지, 공유 문구 전부 포함입니다.
   저장소 폴더명은 specialty입니다. 이 표현을 새로 만들지 마세요.
2. 개인정보를 서버로 전송하지 않습니다. 닉네임·응답·결과는 브라우저 IndexedDB에만 저장합니다.
   Supabase 연결은 사용자 승인 없이 절대 진행하지 않습니다.
3. 엔진과 콘텐츠를 분리합니다. 40(문항수)·4(Part수)·5(척도)·20(점수범위) 같은 숫자를
   엔진 코드에 하드코딩하지 않습니다. 전부 AssessmentDefinition 데이터에서 읽습니다.
4. 의존 방향: features/app → application → domain. domain/은 react·next·idb·supabase·
   window·document를 import하지 않습니다. ESLint no-restricted-imports로 강제하세요.
5. 채점은 동기 순수 함수입니다. async·I/O·Date.now()·Math.random()을 쓰지 않습니다.
   같은 입력은 항상 같은 결과를 반환해야 합니다.

[확정된 채점 규칙 — 변경 금지]
centered  = 응답값 - 3                        (1→-2, 2→-1, 3→0, 4→+1, 5→+2)
rawScore  = Σ(centered × polarity × weight),  weight는 전부 1
범위      = 축당 10문항이면 -20 ~ +20
강도 구간 = |rawScore| 0~4 균형 / 5~12 뚜렷 / 13~20 매우 뚜렷
방향      = >0 positive, <0 negative, =0이면 axis.defaultPole 사용
동점(0)   = 내부 결과 키는 하나로 확정하되 0~4 균형 구간은 화면에서 한쪽으로 단정하지 않음
검증 예시 3개가 docs/architecture.md 5.3절에 계산표까지 있습니다. 그대로 테스트로 옮기세요.

[확정 스택]
Next.js 16 App Router + Turbopack / React 19.2 / TypeScript strict /
Tailwind CSS v4 (OKLCH semantic token) / shadcn-ui (Base UI 기본) / Zod 4 /
idb / @serwist/turbopack / html-to-image / Pretendard Variable(local) /
Vitest / pnpm / Vercel
새 dependency는 사용자 승인 후에만 추가합니다. 전역 상태 라이브러리는 쓰지 않습니다.

[이번 Phase 1 작업 범위]
HANDOVER.md 5.3절의 14단계를 순서대로 진행합니다.
- 프로젝트 초기화, ESLint 계층 규칙
- domain 타입 (architecture.md 4장 그대로)
- 채점 순수 함수 + Vitest 테스트 (예시 A/B/C + 경계값 4↔5, 12↔13)
- Zod 콘텐츠 스키마 + 무결성 검증
- fixture 콘텐츠 패키지 (문항 텍스트는 "[fixture] ..." 형태. 실제 교직 문장 금지)
- Application 유스케이스 7개 + InMemory Repository + 테스트

완료 기준: pnpm lint / pnpm vitest run / pnpm build 전부 통과.

[하지 말 것]
- 실제 40문항이나 16개 결과 텍스트를 창작하지 마세요. fixture만 씁니다.
- UI 화면을 만들지 마세요. Phase 2입니다.
- docs/decisions.md에서 상태가 WAITING인 항목에 종속된 구현을 시작하지 마세요.
  대신 A/B/C 선다형으로 저에게 질문해 주세요.

[대화 방식]
- 한국어 존칭으로 설명해 주세요.
- 저는 초보 개발자입니다. 전문 용어는 괄호로 짧게 풀어 주세요.
- 결론만 던지지 말고 "왜 그렇게 하는지" 한 줄을 붙여 주세요.
- 제가 실행할 명령은 복사해서 바로 쓸 수 있게 그대로 적어 주세요.
- 제가 할 일과 에이전트가 할 일을 나눠서 적어 주세요.

[첫 턴에 해 주실 일 — 아직 코드를 쓰지 마세요]
1. 위 문서 6종을 읽고, 이해한 프로젝트 내용을 요약해 주세요.
2. docs/decisions.md에서 상태가 WAITING인 항목을 전부 뽑아 주시고,
   그중 Phase 1을 막는 것이 있는지 알려 주세요.
3. Phase 1 작업 계획을 단계별로 제시해 주세요.
   (HANDOVER.md 5.3절의 14단계를 기준으로 하되, 이견이 있으면 말씀해 주세요.)
4. 제가 승인하면 그때 구현을 시작해 주세요.

[작업 중 지켜 주실 것]
- 설계 문서와 다르게 구현해야 할 이유를 발견하면, 임의로 바꾸지 말고 먼저 알려 주세요.
- 새 결정이 필요하면 docs/decisions.md에 새 DEC로 등록하고 A/B/C로 질문해 주세요.
- 커밋은 제가 요청할 때만 해 주세요.
```

### 사람에게 인계할 때 (AI 없이)

위 프롬프트 대신 이 순서로 안내하세요.

1. `HANDOVER.md` → `AGENTS.md` 읽기 (30분)
2. `docs/architecture.md` 4·5·6장 정독 (타입·채점·Repository)
3. 5.2절 명령으로 프로젝트 초기화
4. 5.3절 14단계 순서대로 진행
5. 막히면 `docs/decisions.md`에서 관련 DEC 확인

---

## 10. 인계 시 함께 전달할 것

| 항목 | 상태 |
|---|---|
| Git 저장소 접근 권한 | ⬜ 전달 필요 |
| 클라이언트(강사) 연락 채널 | ⬜ 전달 필요 — 그룹 A~D 질문을 보낼 대상 |
| Vercel 계정 / 배포 권한 | ⬜ Phase 6에 필요 |
| Pretendard 폰트 파일 | ⬜ DEC-030 결정 후 |
| 로고·아이콘 원본 | ⬜ DEC-025 / DEC-031 결정 후 |
| 실제 콘텐츠(40문항 + 16프로필) | ⬜ DEC-023 / DEC-024 결정 후 (Phase 4) |

---

## 11. 연락 / 질문

- 설계 의도가 궁금하면 → `docs/decisions.md`의 해당 DEC를 먼저 확인
- 문서끼리 충돌하면 → `docs/` 문서가 `AGENTS.md`보다 우선
- 문서에 없는 결정이 필요하면 → **임의로 정하지 말고** `docs/decisions.md`에 새 DEC로 등록한 뒤
  A/B/C 선다형으로 클라이언트에게 질문

> 이 프로젝트에서 가장 비싼 실수는 "일단 만들고 나중에 고치는 것"입니다.
> 첫 검사에 맞춰 짠 코드는 두 번째 검사를 추가할 때 전부 다시 써야 합니다.
> 확신이 없으면 물어보는 편이 항상 쌉니다.
