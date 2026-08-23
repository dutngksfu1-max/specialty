# Architecture — 클래스렌즈

> 문서 상태: v0.2 (Phase 1 반영)
> 최종 수정: 2026-08-19
> 이 문서는 **구조 설계의 SSOT**입니다. 코드가 이 문서와 다르면 코드가 틀린 것입니다.

---

## 0. 한눈에 보기 (초보자용 요약)

이 프로젝트는 코드를 4개의 층으로 나눕니다. **아래층은 위층을 모릅니다.**

```
   UI            화면을 그리는 곳 (React 컴포넌트)
    │  ↓ 호출
   Application   "검사를 시작한다", "응답을 저장한다" 같은 시나리오
    │  ↓ 호출
   Domain        검사가 무엇인지, 점수를 어떻게 매기는지 (순수한 규칙)
    ▲  구현
   Infrastructure  실제 저장(IndexedDB), 실제 콘텐츠 파일
```

**왜 이렇게 나누나요?**
저장 방식을 IndexedDB에서 Supabase로 바꿔도, 화면 코드와 점수 계산 코드를 **한 줄도 고치지 않기 위해서**입니다.
검사를 새로 추가할 때도 같은 이유로 폴더 하나만 추가하면 됩니다.

---

## 1. Layer 정의

### 1.1 Domain — "검사란 무엇인가"

검사의 개념과 규칙만 담습니다. **아무것도 import 하지 않습니다.**

- 담는 것: 타입 정의, 점수 계산 순수 함수, 검증 규칙, 오류 코드, port(interface)
- 담지 않는 것: React, Next.js, IndexedDB, Supabase, fetch, `window`, `document`

```
domain/
  assessment/
    model/       AssessmentDefinition, Axis, Section, Question, ResponseScale, ScoringSpec
    session/     AssessmentSession, AssessmentResponse, findUnansweredQuestions
    scoring/     centerResponse, scoreAxis, resolveIntensity, resolveResultKey, scoreAssessment
    result/      ResultProfile, ResultSnapshot
    ports/       AssessmentRepository, AssessmentCatalog, Clock, IdGenerator  ← interface만
    errors/      AssessmentErrorCode, AssessmentError
  shared/        Result<T, E>, branded id 타입, 배열 유틸(순수)
```

### 1.2 Application — "무엇을 하는가"

사용자 시나리오 한 개 = 함수 한 개. Domain만 import 합니다.

```
application/assessment/
  startAssessment.ts      새 세션 생성 (또는 기존 세션 확인)
  resumeSession.ts        저장된 세션 복구 + 버전 검증
  saveResponse.ts         응답 1개 저장
  getPartState.ts         특정 Part의 문항 + 현재 응답 조합
  completeAssessment.ts   전 문항 응답 검증 → 채점 → 결과 스냅샷 저장
  getResult.ts            저장된 결과 조회 (없으면 오류)
  resetAssessment.ts      저장 데이터 삭제 (다시 검사하기)
```

**Application의 규칙**

- Repository는 **인자로 주입받습니다** (직접 import 금지). 테스트에서 InMemory 구현체로 교체 가능
- **현재 시각과 새 id도 같은 방식으로 주입받습니다** (`Clock`, `IdGenerator` — DEC-032).
  `new Date()`·`crypto.randomUUID()`를 직접 부르면 테스트에서 결과를 고정할 수 없습니다
- 반환은 `Promise<Result<T, AssessmentError>>` — 예외를 던지지 않습니다
- 채점 자체는 Domain의 순수 함수를 호출만 합니다

### 1.3 Infrastructure — "실제로 어디에 저장하는가"

Domain이 정의한 port를 **구현만** 합니다.

```
infrastructure/
  persistence/
    indexeddb/    IndexedDbAssessmentRepository  (idb 사용)
    memory/       InMemoryAssessmentRepository   (테스트/폴백용)
  content/
    StaticAssessmentCatalog.ts   번들에 포함된 콘텐츠 패키지 목록
    contentPackageSchema.ts      Zod 스키마 (로드 시 검증)
    packages/
       teacher-style-v1/          ← 검사 1종 = 폴더 1개
         definition.ts
         questions.ts
         profiles.ts
         presentation.ts          선택형 색·로컬 그림·section 모티프
         index.ts
```

### 1.4 UI — "어떻게 보이는가"

```
app/          Next.js 라우팅 진입점. 되도록 얇게 유지
features/     화면 단위 컴포넌트 묶음
components/ui shadcn/ui primitive (Base UI 기반)
lib/          cn() 같은 얇은 유틸
```

**Server / Client Component 원칙**

- **기본은 Server Component**입니다
- `"use client"`는 **state / event / browser API가 필요한 최소 영역**에만 붙입니다
- 편의를 위해 페이지 전체에 `"use client"`를 붙이지 않습니다

| 화면 | Server | Client |
|---|---|---|
| 랜딩 | 페이지 골격, Hero, 검사 카드, FAQ | 닉네임 입력 폼, "이어서 하기" 상태 표시 |
| 검사 소개 | 페이지 골격, 검사 정보, Accordion 내용 | 시작 버튼(세션 생성) |
| Part 진행 | 페이지 골격, 문항 텍스트 렌더 | `AssessmentRunner`(응답 상태·저장·내비게이션) |
| 결과 | 페이지 골격 | 결과 렌더러(로컬 저장 데이터를 읽어야 하므로) |

> 저장 데이터가 브라우저 안에만 있으므로, **데이터를 읽는 부분은 Client일 수밖에 없습니다.**
> 대신 문항 텍스트·검사 설명 같은 정적 콘텐츠는 Server에서 렌더해 초기 로딩을 빠르게 합니다.

---

## 2. Dependency Rule (가장 중요한 규칙)

```
features / app  ──▶  application  ──▶  domain
                          │                ▲
                          └────────────────┤
                                           │ 구현
                                    infrastructure
```

### 금지 사항

| 하면 안 되는 것 | 이유 |
|---|---|
| `domain/`에서 `react`, `next`, `idb`, `@supabase/*` import | Domain이 기술에 묶이면 테스트도 교체도 불가능 |
| `domain/`에서 `window`, `document`, `localStorage` 사용 | 서버에서도 실행될 수 있어야 함 |
| `application/`에서 `features/` 또는 `infrastructure/` 구현체 import | 의존 방향 역전 |
| `features/`에서 `infrastructure/` 직접 import | Repository는 조립 지점에서 주입 |
| Repository 구현체를 컴포넌트 안에서 `new` | 교체 불가능해짐 |

### ESLint로 강제하기

추가 dependency 없이 `no-restricted-imports`로 막습니다.

> **glob 주의**: 패턴의 `*`는 슬래시(`/`)를 넘지 않습니다.
> `"@/application/*"`만 쓰면 `@/application/assessment/startAssessment` 같은
> 2단계 이상 경로를 잡지 못해 규칙이 있으나 마나가 됩니다.
> 반드시 `"@/application"`과 `"@/application/**"` 두 가지를 함께 넣습니다.

```js
// eslint.config.mjs (요지)
{
  files: ["src/domain/**/*.ts"],
  rules: {
    "no-restricted-imports": ["error", {
      patterns: [
        { group: ["react", "react-dom", "next", "next/*"], message: "Domain은 프레임워크에 의존할 수 없습니다." },
        { group: ["idb", "@supabase/*", "html-to-image"],  message: "Domain은 인프라에 의존할 수 없습니다." },
        { group: ["@/application", "@/application/**", "@/infrastructure", "@/infrastructure/**",
                  "@/features", "@/features/**", "@/app", "@/app/**"],
          message: "Domain은 상위 계층을 import할 수 없습니다." },
      ],
    }],
  },
},
{
  files: ["src/application/**/*.ts"],
  rules: {
    "no-restricted-imports": ["error", {
      patterns: [
        { group: ["react", "next", "next/*"], message: "Application은 프레임워크에 의존할 수 없습니다." },
        { group: ["@/infrastructure", "@/infrastructure/**", "@/features", "@/features/**",
                  "@/app", "@/app/**"],
          message: "Application은 하위 구현이나 UI를 import할 수 없습니다." },
      ],
    }],
  },
},
{
  files: ["src/features/**/*.tsx", "src/features/**/*.ts"],
  rules: {
    "no-restricted-imports": ["error", {
      patterns: [
        { group: ["@/infrastructure/persistence", "@/infrastructure/persistence/**"],
          message: "Repository 구현체는 조립 지점(provider)에서만 참조합니다." },
      ],
    }],
  },
}
```

### 조립 지점 (Composition Root)

Repository 구현체를 고르는 곳은 **딱 한 군데**입니다.

```
src/features/shared/AssessmentRepositoryProvider.tsx   ("use client")
  → IndexedDB 사용 가능 여부 확인
  → 가능하면 IndexedDbAssessmentRepository
  → 불가능하면 InMemoryAssessmentRepository + 경고 배너
  → React Context로 하위에 전달
```

나중에 Supabase를 붙일 때도 **이 파일 한 개만** 바꿉니다.

---

## 3. Folder Structure

```
specialty/
├─ AGENTS.md
├─ docs/
│  ├─ PRD.md
│  ├─ design.md
│  ├─ architecture.md
│  ├─ decisions.md
│  └─ content/
│     └─ teacher-style-v1.md
├─ public/
│  ├─ manifest.webmanifest
│  ├─ fonts/PretendardVariable.woff2
│  └─ icons/ (192, 512, maskable)
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx
│  │  ├─ page.tsx                              # 랜딩
│  │  ├─ error.tsx  not-found.tsx  global-error.tsx
│  │  ├─ manifest.ts                           # Next.js metadata 기반 manifest
│  │  ├─ ~offline/page.tsx
│  │  └─ assessments/[slug]/
│  │     ├─ page.tsx                           # 검사 소개
│  │     ├─ run/[part]/page.tsx                # Part 진행
│  │     └─ result/page.tsx                    # 결과
│  ├─ domain/
│  │  ├─ assessment/{model,session,scoring,result,ports,errors}/
│  │  └─ shared/
│  ├─ application/assessment/
│  ├─ infrastructure/
│  │  ├─ persistence/{indexeddb,memory}/
│  │  ├─ system/            systemClock.ts, randomIdGenerator.ts   # Clock / IdGenerator 구현 (DEC-032)
│  │  └─ content/{StaticAssessmentCatalog.ts,contentPackageSchema.ts,packages/}
│  ├─ features/
│  │  ├─ shared/            AssessmentRepositoryProvider, ErrorMessage, OfflineBanner
│  │  ├─ landing/           Hero, NicknameEntry, ActiveAssessmentCard, UpcomingList, FaqAccordion
│  │  ├─ assessment-runner/ AssessmentRunner, QuestionCard, LikertScale,
│  │  │                     AssessmentProgress, AssessmentNavigator, useAssessmentSession
│  │  └─ result/            ResultRenderer, AxisBar, ResultShareCard, SaveImageButton
│  ├─ components/ui/        shadcn/ui
│  ├─ lib/                  cn.ts, errorMessages.ts
│  ├─ test/                 테스트 전용 빌더·테스트 더블 (배포물에 포함되지 않음)
│  └─ styles/globals.css
├─ eslint.config.mjs
├─ next.config.ts
├─ tsconfig.json
├─ vitest.config.ts
└─ package.json
```

---

## 4. Domain Model

### 4.1 공통 타입

```ts
// domain/shared/result.ts
export type Result<T, E> =
  | { readonly ok: true;  readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok  = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

// domain/shared/ids.ts — 실수로 다른 id를 넣는 것을 타입으로 막습니다
type Brand<T, B extends string> = T & { readonly __brand: B };
export type AssessmentId = Brand<string, "AssessmentId">;
export type SessionId    = Brand<string, "SessionId">;
export type QuestionId   = Brand<string, "QuestionId">;
export type AxisId       = Brand<string, "AxisId">;
export type SectionId    = Brand<string, "SectionId">;
export type ResultKey    = Brand<string, "ResultKey">;
```

### 4.2 검사 정의 (콘텐츠가 주입하는 데이터)

```ts
// domain/assessment/model/definition.ts
export type Polarity = 1 | -1;
export type PoleSide = "positive" | "negative";

export interface AxisPole {
  readonly side: PoleSide;
  readonly label: string;        // 예: "차분한 준비형"
  readonly shortLabel: string;   // 좁은 화면용
  readonly description: string;
}

export interface IntensityBand {
  readonly id: string;           // "balanced" | "clear" | "strong"
  readonly label: string;        // "균형" | "뚜렷" | "매우 뚜렷"
  readonly minAbsScore: number;  // 이상
  readonly maxAbsScore: number;  // 이하
  readonly directional: boolean;// false면 이 구간은 한쪽 방향으로 서술하지 않음
}

// 축에는 강도 구간이 최소 1개 있어야 합니다 (DEC-033).
// 이렇게 적어 두면 resolveIntensity가 예외 없이 항상 하나를 반환할 수 있습니다.
export type IntensityBands = readonly [IntensityBand, ...IntensityBand[]];

export interface AssessmentAxis {
  readonly id: AxisId;
  readonly name: string;
  readonly positive: AxisPole;
  readonly negative: AxisPole;
  readonly defaultPole: PoleSide;   // 동점(0점)일 때 사용 (DEC-001)
  readonly intensityBands: IntensityBands;
}

export interface ResponseOption {
  readonly value: number;        // 1~5
  readonly label: string;        // 접근성 라벨
  readonly visibleLabel?: string;// 양 끝에만 존재
}

export interface ResponseScale {
  readonly id: string;
  readonly options: readonly ResponseOption[];
  readonly centerValue: number;  // 5점 척도면 3
}

export interface AssessmentQuestion {
  readonly id: QuestionId;
  readonly sectionId: SectionId;
  readonly order: number;        // 전체 통 번호 (1~40)
  readonly text: string;
  readonly axisId: AxisId;
  readonly polarity: Polarity;
  readonly weight: number;       // MVP에서 항상 1
}

export interface AssessmentSection {
  readonly id: SectionId;
  readonly order: number;        // 1~4
  readonly title: string;        // "Part 1"
  readonly description?: string;
}

export interface ScoringSpec {
  readonly strategyId: "centered-likert-axis-sum";
  readonly scoringVersion: number;
}

export interface AssessmentDefinition {
  readonly id: AssessmentId;
  readonly slug: string;                 // URL에 쓰임. 4글자 코드 금지
  readonly title: string;
  readonly summary: string;
  readonly description: string;
  readonly estimatedMinutes: number;
  readonly status: "published" | "upcoming";
  readonly assessmentVersion: number;
  readonly contentVersion: string;       // "1.0.0"
  readonly scale: ResponseScale;
  readonly axes: readonly AssessmentAxis[];
  readonly resultNarrative?: ResultNarrativeSpec; // 방향·강도·균형 결과 서술
  readonly sections: readonly AssessmentSection[];
  readonly questions: readonly AssessmentQuestion[];
  readonly scoring: ScoringSpec;
  readonly resultProfiles: readonly ResultProfile[];
}
```

> **하드코딩 금지 확인**: 문항 수·Part 수·척도 점수·축 개수·구간 경계값이 전부 데이터입니다.
> 엔진 코드 어디에도 `40`, `4`, `5`, `20` 같은 숫자가 없습니다.

### 4.3 결과 프로필

```ts
// domain/assessment/result/profile.ts
export interface CollaborationProfile {
  readonly naturalFit: readonly string[];   // "함께할 때 잘 이어지는 점"
  readonly needsTuning: readonly string[];  // "미리 맞춰 두면 좋은 점"
}

export interface ResultProfile {
  readonly key: ResultKey;                  // 내부 식별자. 화면에 노출하지 않음
  readonly poles: Readonly<Record<AxisId, PoleSide>>;  // 축 → 방향 조합
  readonly title: string;                   // "차분하게 리듬을 만드는 교실 운영자"
  readonly oneLiner: string;
  readonly rhythm: string;                  // "나의 교직 리듬"
  readonly shiningMoments: readonly string[];  // "강점이 드러날 수 있는 장면"
  readonly underPressure: readonly string[];   // "바쁠 때 나타날 수 있는 모습"
  readonly withColleagues: readonly string[];  // "동료와 함께 일할 때"
  readonly collaboration: CollaborationProfile;
}
```

### 4.3a 방향·강도 결과 서술 (DEC-046)

- `ResultProfile`은 기존 세션 호환과 장면·협업 콘텐츠를 위해 유지합니다.
- 결과 상단의 제목·한 줄 설명·교직 리듬은 `resultNarrative`가 있으면 축 점수의
  `intensityBandId`와 방향을 함께 읽어 조립합니다.
- `directional: false`인 강도 구간은 프로필 방향으로 확정하지 않습니다. 다만 rawScore가 0이 아니면
  균형 범위 안에서 어느 쪽에 조금 더 가까운지는 축 배지와 문장에 함께 표시합니다.
- 현재 검사의 교직 리듬은 네 축을 한 문장씩 설명하는 네 문장으로 구성합니다.
- 학생과 나누는 말의 양·마감 습관처럼 측정하지 않는 내용은 본문에 반복하지 않고 `scopeNote`로 한 번만 분리해 알립니다.
- 균형 축이 하나라도 있으면 부호로 선택된 `ResultProfile`의 장면·협업·행동 문구도 사용하지 않고,
  `resultNarrative.balancedGuidance`의 중립 안내를 사용합니다.
- `resultNarrative`가 없는 다른 검사에서는 기존 프로필 문구를 안전한 fallback으로 사용합니다.

### 4.4 세션 · 응답 · 점수

```ts
// domain/assessment/session/session.ts
export interface AssessmentSession {
  readonly id: SessionId;
  readonly assessmentId: AssessmentId;
  readonly nickname: string;                // 비어 있으면 "선생님"
  readonly characterGender: "male" | "female" | null; // null은 기존 저장 데이터 호환용
  readonly startedAt: string;               // ISO 8601
  readonly updatedAt: string;
  readonly completedAt: string | null;
  readonly versions: {                      // 시작 시점 스냅샷
    readonly assessmentVersion: number;
    readonly contentVersion: string;
    readonly scoringVersion: number;
  };
}

export interface AssessmentResponse {
  readonly sessionId: SessionId;
  readonly questionId: QuestionId;
  readonly value: number;                   // 척도 옵션 중 하나
  readonly answeredAt: string;
}

// domain/assessment/scoring/score.ts
export interface AxisScore {
  readonly axisId: AxisId;
  readonly rawScore: number;        // 연속 점수 (반드시 보존)
  readonly minScore: number;        // -20
  readonly maxScore: number;        // +20
  readonly normalized: number;      // 0~1 (시각화용, rawScore에서 파생)
  readonly direction: PoleSide;     // 0이면 defaultPole
  readonly isBalanced: boolean;     // rawScore === 0
  readonly intensityBandId: string;
}

export interface AssessmentScore {
  readonly axisScores: readonly AxisScore[];
  readonly resultKey: ResultKey;
}

export interface ResultSnapshot {
  readonly assessmentId: AssessmentId;
  readonly sessionId: SessionId;
  readonly nickname: string;
  readonly characterGender: "male" | "female" | null;
  readonly score: AssessmentScore;
  readonly versions: AssessmentSession["versions"];
  readonly completedAt: string;
}
```

---

## 5. Scoring Engine

### 5.1 규칙 (확정)

```
1) 중앙값 변환    centered = 응답값 - scale.centerValue
                  1→-2, 2→-1, 3→0, 4→+1, 5→+2

2) 축 점수        rawScore = Σ (centered × question.polarity × question.weight)
                  weight는 MVP에서 전부 1 (임의 가중치 사용 안 함)

3) 점수 범위      min = -(문항수 × 최대편차 × weight합)  = -20
                  max = +(문항수 × 최대편차 × weight합)  = +20

4) 강도 구간      |rawScore| 기준 (DEC-002b)
                  0 ~ 4   → balanced    "균형"
                  5 ~ 12  → clear       "뚜렷"
                  13 ~ 20 → strong      "매우 뚜렷"

5) 방향           rawScore > 0 → positive
                  rawScore < 0 → negative
                  rawScore = 0 → axis.defaultPole  (DEC-001)
                                 + isBalanced = true (화면에 '균형' 표시)

6) 결과 키        4개 축 방향 조합으로 ResultProfile 1개를 찾음
                  연속 점수(rawScore)는 결과 스냅샷에 그대로 저장

7) 화면 서술      directional=false 구간은 균형으로 표시하되 0이 아니면 작은 기울기도 설명
                  directional=true 구간은 방향 + 강도에 맞는 문장을 사용
```

### 5.2 순수 함수 시그니처

```ts
// domain/assessment/scoring/scoring.ts — 전부 동기(sync) 순수 함수

export function centerResponse(value: number, centerValue: number): number;

export function scoreAxis(
  axis: AssessmentAxis,
  questions: readonly AssessmentQuestion[],
  responses: ReadonlyMap<QuestionId, number>,
  scale: ResponseScale,
): AxisScore;

export function resolveIntensity(
  absScore: number,
  bands: IntensityBands,     // 비어 있을 수 없음 (DEC-033)
): IntensityBand;

export function resolveResultKey(
  axisScores: readonly AxisScore[],
  profiles: readonly ResultProfile[],
): Result<ResultKey, AssessmentError>;

export function scoreAssessment(
  definition: AssessmentDefinition,
  responses: readonly AssessmentResponse[],
): Result<AssessmentScore, AssessmentError>;
```

**불변 조건**

- `async` 아님. `await` 없음. I/O 없음. `Date.now()`·`Math.random()` 사용 안 함
- 같은 입력 → 항상 같은 출력
- 입력을 변경하지 않음 (readonly)

### 5.3 계산 예시 (테스트로 그대로 옮길 것)

축 하나가 10문항, polarity가 앞 5개 `+1` / 뒤 5개 `-1`인 경우입니다.

**예시 A — 양수, "매우 뚜렷"**

| 문항 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| 응답 | 5 | 4 | 5 | 4 | 4 | 2 | 1 | 2 | 2 | 1 |
| centered | +2 | +1 | +2 | +1 | +1 | -1 | -2 | -1 | -1 | -2 |
| polarity | +1 | +1 | +1 | +1 | +1 | -1 | -1 | -1 | -1 | -1 |
| 기여 | +2 | +1 | +2 | +1 | +1 | +1 | +2 | +1 | +1 | +2 |

```
rawScore   = 14
|14| ≥ 13  → intensityBand = strong ("매우 뚜렷")
direction  = positive
isBalanced = false
normalized = (14 + 20) / 40 = 0.85   → 막대 마커 85% 위치
```

**예시 B — 음수, "뚜렷"**

| 문항 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| 응답 | 2 | 2 | 3 | 2 | 1 | 4 | 5 | 4 | 4 | 5 |
| centered | -1 | -1 | 0 | -1 | -2 | +1 | +2 | +1 | +1 | +2 |
| polarity | +1 | +1 | +1 | +1 | +1 | -1 | -1 | -1 | -1 | -1 |
| 기여 | -1 | -1 | 0 | -1 | -2 | -1 | -2 | -1 | -1 | -2 |

```
rawScore   = -12
5 ≤ |12| ≤ 12 → intensityBand = clear ("뚜렷")
direction  = negative
isBalanced = false
normalized = (-12 + 20) / 40 = 0.20  → 막대 마커 20% 위치
```

**예시 C — 정확히 0, "균형" (동점 처리)**

polarity가 전부 `+1`인 축에서:

| 문항 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| 응답 | 5 | 1 | 4 | 2 | 3 | 3 | 4 | 2 | 5 | 1 |
| centered | +2 | -2 | +1 | -1 | 0 | 0 | +1 | -1 | +2 | -2 |

```
rawScore   = 0
|0| ≤ 4    → intensityBand = balanced ("균형")
direction  = axis.defaultPole      ← 콘텐츠가 미리 정해 둔 방향
isBalanced = true                  ← 화면에 '균형' 배지, 양쪽 라벨 동등 표시
normalized = (0 + 20) / 40 = 0.50  → 막대 마커 정중앙
resultKey  는 저장 호환을 위해 defaultPole을 포함해 정상적으로 16개 중 하나로 확정됩니다
```

> **핵심**: 내부 결과 키는 하나로 확정되지만, 화면 서술은 0~4의 균형 구간 전체를
> 어느 한쪽 성향으로 단정하지 않습니다. 연속 점수 0은 그대로 저장됩니다.

### 5.4 콘텐츠 무결성 검증 (로드 시 1회)

```
- 모든 question.axisId 가 axes 에 존재하는가
- 모든 question.sectionId 가 sections 에 존재하는가
- axis / question / section id 와 resultProfile key 에 중복이 없는가
- resultProfiles 개수 = 2 ^ (축 개수) 인가  (4축이면 16개)
- resultProfiles 의 poles 조합에 중복·누락이 없는가 (poles 의 축 목록이 axes 와 일치하는가)
- intensityBands 가 0부터 그 축의 최대 절대값까지 빈틈·겹침 없이 덮는가
  ※ 최대 절대값 = (그 축의 문항 수) × (척도 최대 편차) × weight — 상수가 아니라 계산값
- scale.options 에 centerValue 가 존재하는가 / option value 에 중복이 없는가
- question.order 가 1부터 연속인가
- polarity 가 +1 또는 -1 인가
- weight 가 전부 1 인가 (MVP 규칙 — PRD F-4.2)
- 사용자에게 보이는 문자열(slug·title·summary·description·문항·결과 제목)에
  노출이 금지된 표현이 없는가 (AGENTS.md 1.1)
- 선택형 presentation의 색이 등록 토큰인가 / 그림이 `/assessments/...` 로컬 경로인가
- presentation이 있으면 모든 sectionId의 그림이 중복·누락 없이 존재하는가
- presentation의 선택형 `responseScaleGuide`가 있으면 모든 응답 value를 중복·누락 없이 한 번씩 참조하는가
실패 시 → INVALID_CONTENT_PACKAGE

- 축별 문항 수가 균등한가 / 축마다 polarity 가 반반인가
  → **경고 수준**. 실패시키지 않고 `collectContentWarnings()` 가 문자열로 돌려줍니다
  (다른 검사는 구성이 다를 수 있으므로)
```

---

## 6. Repository Contract (port)

### 6.1 인터페이스

```ts
// domain/assessment/ports/assessmentRepository.ts
export interface AssessmentRepository {
  loadSession(assessmentId: AssessmentId): Promise<Result<AssessmentSession | null, AssessmentError>>;
  saveSession(session: AssessmentSession): Promise<Result<void, AssessmentError>>;

  loadResponses(sessionId: SessionId): Promise<Result<readonly AssessmentResponse[], AssessmentError>>;
  saveResponse(response: AssessmentResponse): Promise<Result<void, AssessmentError>>;

  saveResultSnapshot(snapshot: ResultSnapshot): Promise<Result<void, AssessmentError>>;
  loadResultSnapshot(assessmentId: AssessmentId): Promise<Result<ResultSnapshot | null, AssessmentError>>;

  /** 다시 검사하기 — 해당 검사의 세션·응답·결과를 모두 삭제 (DEC-010: 최신 1개만 유지) */
  clearAssessment(assessmentId: AssessmentId): Promise<Result<void, AssessmentError>>;

  /** 사용자 요청에 의한 전체 삭제 (DEC-015) */
  clearAll(): Promise<Result<void, AssessmentError>>;
}
```

```ts
// domain/assessment/ports/assessmentCatalog.ts
// 콘텐츠는 번들에 포함되므로 동기입니다 (I/O 없음 → async 금지)
export interface AssessmentCatalog {
  listAll(): readonly AssessmentDefinition[];
  listPublished(): readonly AssessmentDefinition[];
  listUpcoming(): readonly AssessmentDefinition[];
  findBySlug(slug: string): Result<AssessmentDefinition, AssessmentError>;
  findById(id: AssessmentId): Result<AssessmentDefinition, AssessmentError>;
}
```

```ts
// domain/assessment/ports/clock.ts       (DEC-032)
// domain/assessment/ports/idGenerator.ts
export interface Clock {
  now(): string;                 // ISO 8601 문자열
}

export interface IdGenerator {
  newSessionId(): SessionId;
}
```

구현체는 `infrastructure/system/`에 있습니다 (`systemClock`, `randomIdGenerator`).
테스트는 `src/test/doubles.ts`의 고정 시계·순번 id 생성기로 바꿔 끼웁니다.
ESLint가 `domain/`·`application/`에서 `Date.now()`·`new Date()`·`Math.random()`·
`crypto.randomUUID()`를 막습니다 (테스트 파일은 예외).

### 6.2 IndexedDB 구현

```
DB name    : searchteachermind
DB version : 1

Object stores
├─ sessions    keyPath: "assessmentId"          (검사당 세션 1개 — DEC-010)
├─ responses   keyPath: ["sessionId", "questionId"]
│              index  : "bySession" → "sessionId"
├─ results     keyPath: "assessmentId"
└─ preferences keyPath: "key"                   (닉네임·캐릭터 성별 등)
```

**동작 규칙**

- `saveResponse`는 라디오 클릭 즉시 호출 (디바운스하지 않음 — 유실 방지 우선)
- 쓰기 실패는 `PERSISTENCE_FAILED`로 감싸 반환. UI는 "저장에 실패했어요" 배너 노출
- IndexedDB를 열 수 없으면(시크릿 모드 등) `InMemoryAssessmentRepository`로 폴백 + 경고 배너
- 스키마 변경 시 `upgrade` 콜백에서 마이그레이션. **기존 사용자 응답을 지우지 않습니다**

### 6.3 향후 Supabase Adapter

```ts
// infrastructure/persistence/supabase/SupabaseAssessmentRepository.ts  (Phase 7)
export class SupabaseAssessmentRepository implements AssessmentRepository { /* ... */ }
```

같은 interface를 구현하므로 **조립 지점 한 곳만** 바꾸면 됩니다.

```
AssessmentRepositoryProvider
  - MVP  : IndexedDbAssessmentRepository
  - 향후 : 로컬 우선 + 온라인 시 Supabase 동기화 (CompositeRepository)
```

> Supabase 연결은 **개인정보 서버 전송**을 뜻하므로 반드시 별도 승인이 필요합니다.

---

## 7. Versioning

### 7.1 세 가지 버전

| 버전 | 언제 올리나 | 예 |
|---|---|---|
| `assessmentVersion` | 검사의 구조가 바뀔 때 (문항 수, 축 개수, Part 구성) | 1 → 2 |
| `contentVersion` | 문구만 바뀔 때 (오타 수정, 표현 다듬기) | "1.0.0" → "1.0.1" |
| `scoringVersion` | 채점 방식이 바뀔 때 (구간 경계값, 동점 규칙) | 1 → 2 |

### 7.2 immutable 원칙

배포된 검사 버전은 **고치지 않습니다.**

```
v1 배포됨
   │
   ├─ 문항을 바꾸고 싶다
   │
   ▼
v2 draft 생성 (v1은 그대로 둠)
   │
   ▼
v2 publish → 신규 사용자는 v2, 기존 v1 세션은 안내 후 재시작
```

### 7.3 버전 불일치 처리

```
저장된 세션 로드
   │
   ├─ assessmentVersion 다름  → VERSION_MISMATCH (재시작 필요)
   ├─ scoringVersion  다름    → VERSION_MISMATCH (점수 의미가 달라짐)
   └─ contentVersion  다름    → 진행 허용 (문구만 최신으로 표시, 안내 캡션)
```

UI 문구: "검사가 새 버전으로 업데이트되었어요. 정확한 결과를 위해 처음부터 다시 진행해 주세요."

---

## 8. Error Handling

### 8.1 오류 코드

```ts
export type AssessmentErrorCode =
  | "ASSESSMENT_NOT_FOUND"
  | "VERSION_MISMATCH"
  | "SESSION_NOT_FOUND"
  | "INCOMPLETE_RESPONSES"
  | "INVALID_RESPONSE"
  | "DRAFT_CORRUPTED"
  | "PERSISTENCE_FAILED"
  | "RESULT_PROFILE_NOT_FOUND"
  | "NETWORK_UNAVAILABLE"
  | "INVALID_CONTENT_PACKAGE";

export interface AssessmentError {
  readonly code: AssessmentErrorCode;
  readonly detail?: string;   // 개발자용. 화면에 노출 금지
  readonly cause?: unknown;
}
```

### 8.2 사용자 문구 매핑

```ts
// lib/errorMessages.ts — UI는 이 표만 사용합니다
export const ERROR_MESSAGES: Record<AssessmentErrorCode, { title: string; body: string; action?: string }> = {
  ASSESSMENT_NOT_FOUND:     { title: "검사를 찾을 수 없어요",   body: "주소가 바뀌었을 수 있어요.", action: "처음으로" },
  VERSION_MISMATCH:         { title: "검사가 업데이트되었어요", body: "정확한 결과를 위해 처음부터 다시 진행해 주세요.", action: "새로 시작" },
  SESSION_NOT_FOUND:        { title: "진행 중인 검사가 없어요", body: "검사를 시작해 주세요.", action: "검사 시작" },
  INCOMPLETE_RESPONSES:     { title: "아직 답하지 않은 문항이 있어요", body: "남은 문항에 답하면 결과를 볼 수 있어요." },
  INVALID_RESPONSE:         { title: "응답을 저장하지 못했어요", body: "다시 선택해 주세요." },
  DRAFT_CORRUPTED:          { title: "저장된 응답을 불러오지 못했어요", body: "새로 시작하면 정상적으로 진행돼요.", action: "새로 시작" },
  PERSISTENCE_FAILED:       { title: "저장에 실패했어요",       body: "브라우저 저장 공간을 확인해 주세요." },
  RESULT_PROFILE_NOT_FOUND: { title: "결과를 만들지 못했어요",  body: "잠시 후 다시 시도해 주세요.", action: "새로 시작" },
  NETWORK_UNAVAILABLE:      { title: "인터넷 연결이 끊겼어요",  body: "이미 시작한 검사는 계속 진행할 수 있어요." },
  INVALID_CONTENT_PACKAGE:  { title: "검사를 불러오지 못했어요", body: "잠시 후 다시 시도해 주세요." },
};
```

**규칙**

- `detail`, 스택 트레이스, 코드명을 **절대 화면에 출력하지 않습니다**
- 예상하지 못한 오류는 `app/error.tsx`(route) / `app/global-error.tsx`(전역)에서 처리
- 개발 모드에서만 `console.error`로 `detail` 출력

---

## 9. PWA

### 9.1 목표

1. 설치 가능
2. 검사 진행 중 네트워크가 끊겨도 응답 유지 (← IndexedDB가 담당)
3. 이미 연 검사는 오프라인에서도 끝까지 진행 가능 (← Service Worker가 담당)

### 9.2 도구: `@serwist/turbopack`

**왜 필요한가**: Service Worker를 직접 작성하면 캐시 무효화·업데이트 처리에서 버그가 나기 쉽습니다.
Serwist는 Google Workbox 계열의 검증된 캐싱 전략을 제공하고, **Turbopack을 공식 지원**합니다.

```ts
// next.config.ts
import { withSerwist } from "@serwist/turbopack";

export default withSerwist(nextConfig);
```

**실제 구성 (Phase 5)**

| 파일 | 역할 |
|---|---|
| `src/app/sw.ts` | Service Worker 본체. `skipWaiting: false`, `/~offline` fallback |
| `src/app/serwist/[path]/route.ts` | SW 파일을 내려보내는 Route Handler → `/serwist/sw.js` |
| `src/features/shared/ServiceWorkerProvider.tsx` | 등록. `scope: "/"`, `reloadOnOnline={false}` |
| `src/features/shared/ConnectionNotices.tsx` | 오프라인 배너 + 새 버전 안내(수동 갱신) |
| `src/app/~offline/page.tsx` | 오프라인 fallback 화면 |

> **왜 `/serwist/sw.js`인가**: Turbopack에는 아직 빌드 플러그인이 없어서, Serwist가
> Route Handler로 SW를 만들어 냅니다. 루트가 아닌 경로에서도 사이트 전체를 담당할 수 있도록
> 응답에 `Service-Worker-Allowed: /` 헤더가 붙고, 등록할 때 `scope: "/"`를 지정합니다.
>
> **번들러**: `@serwist/turbopack`은 SW를 esbuild로 묶습니다. 윈도우에서는 네이티브 `esbuild`,
> 그 외 환경에서는 `esbuild-wasm`이 기본값이라 **둘 다 devDependency로 설치**해 두었습니다.
> (esbuild-wasm은 가상 파일시스템을 써서 `C:\...` 형태의 윈도우 경로를 받지 못합니다)

### 9.3 캐싱 전략

| 대상 | 전략 | 이유 |
|---|---|---|
| 앱 셸(JS/CSS/폰트) | Precache | 오프라인 진행의 전제 |
| 검사 콘텐츠(문항·프로필) | Precache (JS 번들에 포함) | 콘텐츠가 코드 번들 안에 있으므로 자동 |
| 페이지 문서 | NetworkFirst (fallback: `/~offline`) | 최신 우선, 실패 시 오프라인 안내 |
| 아이콘·이미지 | CacheFirst | 잘 바뀌지 않음 |
| 사용자 응답 | **캐시하지 않음** | IndexedDB가 원본 |

### 9.4 Manifest

```ts
// app/manifest.ts
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "클래스렌즈",
    short_name: "클래스렌즈",
    description: "교직 성향과 업무 스타일을 탐색하는 교사용 검사",
    start_url: "/",
    display: "standalone",
    background_color: "#fdfcf9",   // --sand-50 근사값
    theme_color: "#5c7a68",        // --sage-600 근사값
    orientation: "portrait",
    lang: "ko",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
```

**아이콘 파일 (DEC-044)**

선택한 원본은 `public/brand/classlens-icon-source.png`에 보존합니다.
브라우저·iOS·PWA 규격별 PNG를 정적으로 제공하며, maskable 아이콘만 안전 영역을 위해 여백을 더 둡니다.

| 경로 | 크기 | 용도 |
|---|---|---|
| `/icon` | 64 | 브라우저 탭 |
| `/apple-icon` | 180 | iOS 홈 화면 |
| `/icons/icon-192.png` | 192 | manifest (설치 요건) |
| `/icons/icon-512.png` | 512 | manifest (설치 요건) |
| `/icons/maskable-512.png` | 512 | 안드로이드 maskable (여백 26%) |

> 아이콘에는 글자를 넣지 않고 열린 책과 렌즈 심볼만 사용합니다.

> manifest·metadata·OG 태그 어디에도 **기존 성격유형 검사의 명칭이나 4글자 코드를 넣지 않습니다.**

### 9.5 업데이트 처리

- 새 Service Worker 감지 시 즉시 새로고침하지 않습니다 (**검사 도중 응답 유실 위험**)
- 인라인 안내: "새 버전이 준비됐어요. 검사를 마친 뒤 새로고침해 주세요."
- 사용자가 직접 누를 때만 갱신

---

## 10. 새 검사 추가 절차 (확장성 검증)

"협업 스타일 검사"를 추가한다고 가정합니다.

### 만드는 것

```
src/infrastructure/content/packages/collaboration-v1/
  ├─ definition.ts    검사 메타 + 축 + 척도 + 섹션
  ├─ questions.ts     문항 배열
  ├─ profiles.ts      결과 프로필 배열
  ├─ presentation.ts  선택형 palette + hero/section 로컬 그림
  └─ index.ts         조립 + Zod 검증 후 export
```

### 고치는 것

```
src/infrastructure/content/StaticAssessmentCatalog.ts   ← 배열에 한 줄 추가
```

### 고치지 않는 것

```
src/domain/**         0줄
src/application/**    0줄
src/features/**       0줄
src/app/**            0줄   (라우트는 [slug] 동적)
src/components/ui/**  0줄
```

> **이 표가 이 아키텍처의 합격 기준입니다.** 하나라도 어긋나면 엔진이 콘텐츠에 오염된 것입니다.

`presentation`은 콘텐츠 패키지 경계에서 검증하고 `StaticAssessmentCatalog`의 구체 API로만 조회합니다.
Domain의 `AssessmentCatalog` port·채점·세션 버전에는 넣지 않습니다. 프레젠테이션이 없으면 UI가 플랫폼 기본 테마를 사용합니다.

축 개수가 3개거나 5개여도, 문항이 30개거나 60개여도, 척도가 7점이어도 동작해야 합니다.
(결과 프로필 개수는 `2 ^ 축개수`)

---

## 11. Testing

| 대상 | 도구 | 필수 케이스 |
|---|---|---|
| 채점 순수 함수 | Vitest | 예시 A/B/C, 경계값 4↔5·12↔13, 극단 ±20, polarity 혼합, 전부 3점 |
| 결과 키 해석 | Vitest | 16개 조합 전부, 프로필 누락 시 `RESULT_PROFILE_NOT_FOUND` |
| 콘텐츠 검증 | Vitest | 정상 패키지 통과, 축 불일치·프로필 개수 오류 시 `INVALID_CONTENT_PACKAGE` |
| Application | Vitest + InMemoryRepository | 미응답 시 `INCOMPLETE_RESPONSES`, 버전 불일치 시 `VERSION_MISMATCH` |
| Repository | Vitest (fake-indexeddb) | 저장·복구·삭제, 손상 데이터 처리 |
| 확장성 | Vitest | 축 3개·7점 척도·18문항짜리 검사를 같은 엔진으로 채점 (`src/test/engineAgnostic.test.ts`) |
| UI 통합 | 수동 QA (Phase 5에서 Playwright 검토) | 새로고침·뒤로가기·오프라인·키보드 완주 |

```bash
pnpm vitest run          # 전체 테스트
pnpm vitest              # watch 모드
pnpm build               # 타입 + 빌드 검증
pnpm lint                # 의존 규칙 위반 검사
```

---

## 12. 향후 Supabase 스키마 초안 (Phase 7, 지금 만들지 않음)

MVP에서는 **실제 DB를 만들지 않습니다.** 아래는 구조가 나중에 수용 가능한지 확인하기 위한 초안입니다.

```
assessments
  id (uuid, pk) · slug (unique) · title · summary · status · created_at

assessment_versions
  id (pk) · assessment_id (fk) · assessment_version (int) · content_version (text)
  · scoring_version (int) · status (draft|published|archived) · published_at
  UNIQUE (assessment_id, assessment_version)

response_scales
  id (pk) · assessment_version_id (fk) · center_value (int)

response_options
  id (pk) · response_scale_id (fk) · value (int) · label · visible_label · sort_order

axes
  id (pk) · assessment_version_id (fk) · code · name
  · positive_label · negative_label · default_pole · sort_order

intensity_bands
  id (pk) · axis_id (fk) · band_id · label · min_abs_score · max_abs_score

questions
  id (pk) · assessment_version_id (fk) · section_id (fk) · axis_id (fk)
  · text · polarity (smallint) · weight (numeric default 1) · sort_order

sections
  id (pk) · assessment_version_id (fk) · title · sort_order

result_profiles
  id (pk) · assessment_version_id (fk) · result_key · poles (jsonb)
  · title · one_liner · rhythm · shining_moments (jsonb)
  · under_pressure (jsonb) · with_colleagues (jsonb) · collaboration (jsonb)

assessment_sessions
  id (pk) · assessment_version_id (fk) · room_id (fk, nullable)
  · nickname · started_at · completed_at
  ※ 익명. 계정 참조 없음

responses
  id (pk) · session_id (fk) · question_id (fk) · value (int) · answered_at
  UNIQUE (session_id, question_id)

result_snapshots
  id (pk) · session_id (fk) · result_key · axis_scores (jsonb)
  · versions (jsonb) · created_at

lecture_rooms
  id (pk) · code (unique, QR용) · title · assessment_version_id (fk)
  · host_label · opens_at · closes_at · created_at

room_aggregates
  room_id (fk) · result_key · count (int) · axis_mean (jsonb) · updated_at
  ※ 개인 응답이 아니라 집계값만 저장 (익명성 보장)
```

**설계 시 지킬 원칙**

- 개인 식별 정보를 저장하지 않습니다 (닉네임은 사용자가 임의로 정한 표시명)
- 집계는 `room_aggregates`에만. 최소 인원 미만이면 집계를 노출하지 않습니다
- 로컬 데이터를 서버로 올리는 것은 **사용자가 명시적으로 동의한 경우에만**

---

## 13. 코드 규칙 요약

| 항목 | 규칙 |
|---|---|
| TypeScript | `strict: true`. `any` 금지 |
| async | I/O 경계에서만. 계산은 동기 |
| 오류 | Domain/Application은 `Result<T, E>` 반환. throw 금지 |
| 불변성 | Domain 타입은 전부 `readonly` |
| import | 계층 규칙 준수 (ESLint가 검사) |
| Client Component | 최소 영역만. 페이지 전체에 `"use client"` 금지 |
| 상태 관리 | 전역 상태 라이브러리 도입하지 않음. Context + useState로 충분 |
| dependency | 새 패키지 추가 전 사용자 승인 (`docs/decisions.md`) |
| 숫자 하드코딩 | 40·4·5·20을 엔진 코드에 쓰지 않음. 전부 데이터에서 |
