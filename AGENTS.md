# AGENTS.md — 클래스렌즈

> 이 파일은 **Claude Code, Codex 등 모든 AI 에이전트가 작업 전에 반드시 읽는 규칙 요약**입니다.
> 상세 내용은 `docs/` 아래 문서를 따릅니다. 이 파일과 `docs/`가 충돌하면 `docs/`가 우선입니다.

---

## 0. 프로젝트 한 줄 요약

초등교사를 위한 **교직 성향·업무 스타일 탐색 플랫폼 "클래스렌즈"**.
검사를 계속 추가할 수 있는 Assessment Platform이며, MVP는 40문항 검사 1종입니다.

**문서 지도**

| 문서 | 다룰 때 본다 |
|---|---|
| `HANDOVER.md` | **처음 오셨다면 여기부터.** 현재 상태·미결정 질문지·Phase 1 착수 절차 |
| `docs/PRD.md` | 무엇을 만드는가, 어디까지가 범위인가 |
| `docs/design.md` | 색·간격·컴포넌트·금지 패턴 |
| `docs/architecture.md` | 계층 구조·타입·Repository·채점 규칙 |
| `docs/decisions.md` | 왜 이렇게 정했는가, 무엇이 아직 미정인가 |
| `docs/content/teacher-style-v1.md` | 콘텐츠 패키지 작성 규격 |

---

## 1. 절대 규칙 (위반 시 작업 중단)

### 1.1 기존 성격유형 검사 비노출

- **기존 성격유형 검사의 명칭, 4글자 유형 코드(예: 네 글자 조합), 그 유형명을 어디에도 노출하지 않습니다.**
- 적용 범위: UI 텍스트, URL/slug, `<title>`, metadata, OG 이미지, manifest, 공유 문구, 결과 이미지, 파일명, 주석
- 기존 성격유형 검사 문항을 복제하거나 문장만 바꿔 재사용하지 않습니다
- 저장소 폴더명은 `specialty`입니다. 코드·문서·주석·파일명에 금지 표현을 새로 만들지 마세요
- 결과 키(`ResultKey`)는 내부 식별자입니다. 화면에 그대로 출력하지 않습니다

### 1.2 개인정보

- **개인정보를 서버로 전송하지 않습니다.** 닉네임·응답·결과는 브라우저 로컬(IndexedDB)에만 저장합니다
- 외부 analytics·트래커를 추가하지 않습니다
- Supabase 연결은 **사용자 승인 없이 절대 진행하지 않습니다**

### 1.3 콘텐츠와 엔진 분리

- **실제 40문항과 16개 결과 텍스트를 임의로 작성하지 않습니다.** 개발 중에는 fixture를 씁니다
- 검사 이름·설명·section·question·scale·axis·polarity·scoring rule·result profile·collaboration profile·version은
  **전부 데이터로 주입**되어야 합니다
- 엔진 코드에 `40`, `4`, `5`, `20` 같은 검사별 숫자를 하드코딩하지 않습니다

### 1.4 결정 정책

다음은 **사용자 승인 없이 결정하지 않습니다.** `docs/decisions.md`에 등록하고 A/B/C로 질문합니다.

- 서버 저장 도입 / 개인정보 서버 전송 / Supabase 실제 연결
- scoring cutoff / tie-break / compatibility logic
- navigation 구조 변경 / branding
- architecture contract 변경 / 대형 dependency 추가
- PRD에 없는 기능 추가

---

## 2. 아키텍처 규칙

### 2.1 의존 방향 (단방향)

```
features / app  ──▶  application  ──▶  domain
                          │                ▲
                          └────────────────┤ 구현
                                    infrastructure
```

| 금지 | 이유 |
|---|---|
| `domain/`에서 react·next·idb·@supabase·html-to-image import | Domain은 기술에 묶이면 안 됨 |
| `domain/`에서 `window`·`document`·`localStorage` 사용 | 서버에서도 실행 가능해야 함 |
| `application/`에서 `infrastructure/`·`features/` import | 의존 방향 역전 |
| `features/`에서 Repository 구현체 직접 import | 조립 지점에서만 주입 |
| 컴포넌트 안에서 Repository를 `new` | 교체 불가능해짐 |

ESLint `no-restricted-imports`가 이를 검사합니다. 룰을 우회하지 마세요.

### 2.2 async / sync 규칙

**async로 만드는 것 (I/O 경계)**
IndexedDB · (향후) Supabase · API · 파일 · analytics · 네트워크

**동기 순수 함수로 유지하는 것**
scoring · result key 계산 · 응답값 변환 · validation 이후 domain 변환 · 정렬 · 필터 · 포맷 계산

> 모든 함수를 습관적으로 `async`로 만들지 마세요.
> 채점 함수에 `await`가 등장하면 설계가 잘못된 것입니다.

### 2.3 오류 처리

- Domain / Application은 **`Result<T, AssessmentError>`를 반환**합니다. `throw`하지 않습니다
- 오류 코드는 `docs/architecture.md` 8.1의 목록만 사용합니다
- **UI에 기술 오류 문자열을 노출하지 않습니다.** `lib/errorMessages.ts`의 한국어 매핑만 사용합니다
- 예상하지 못한 route 오류는 `app/error.tsx` / `app/global-error.tsx`가 처리합니다

### 2.4 Server / Client Component

- **기본은 Server Component**입니다
- `"use client"`는 state / event / browser API가 필요한 **최소 영역**에만 붙입니다
- 편의를 위해 페이지 전체에 `"use client"`를 붙이지 않습니다

---

## 3. 확정된 도메인 규칙

### 채점 (변경 금지 — 변경하려면 새 DEC 필요)

```
centered  = 응답값 - scale.centerValue      (1→-2, 2→-1, 3→0, 4→+1, 5→+2)
rawScore  = Σ (centered × polarity × weight)
weight    = MVP에서 전부 1 (임의 가중치 금지)
범위      = 축당 10문항이면 -20 ~ +20

강도 구간 (DEC-002b)  |rawScore| 0~4 균형 / 5~12 뚜렷 / 13~20 매우 뚜렷
방향                  >0 positive / <0 negative / =0 → axis.defaultPole (DEC-001)
동점(0)               isBalanced = true → 화면에 '균형' 표시
연속 점수             반드시 보존. 이산 결과 키만 남기지 않음
```

### 4개 축 (DEC-023 · contentVersion 3.0.0)

| 축 ID | 축 이름 | positive | negative |
|---|---|---|---|
| `axis-energy` | 힘을 얻는 방향 | 교류형 | 몰입형 |
| `axis-lens` | 먼저 눈에 들어오는 것 | 실제형 | 가능성형 |
| `axis-decision` | 결정할 때 딛는 발판 | 원칙형 | 맥락형 |
| `axis-rhythm` | 일을 굴리는 리듬 | 계획형 | 유연형 |

**축마다 전용 장면군을 씁니다.** 같은 장면이 두 축에 나오면 두 축이 같은 것을 재기 시작합니다.
`realContent.test.ts`의 "축 간 어휘 누수" 검사가 이를 막습니다.

### 저장 (DEC-006, DEC-010)

- `idb` 사용. DB 이름 `searchteachermind`
- **검사당 세션 1개만 유지** (재검사 시 덮어쓰기)
- 응답은 라디오 클릭 즉시 저장 (디바운스 금지 — 유실 방지 우선)

### 확정 스택

| 영역 | 선택 | DEC |
|---|---|---|
| 프레임워크 | Next.js 16 App Router + Turbopack | — |
| 스타일 | Tailwind CSS v4 (OKLCH semantic token) | DEC-011 |
| UI primitive | shadcn/ui (Base UI 기반) | — |
| 검증 | Zod 4 | — |
| 저장 | idb | DEC-006 |
| PWA | @serwist/turbopack | DEC-007 |
| 이미지 | html-to-image | DEC-008 |
| 폰트 | Pretendard Variable (local) | DEC-012 |
| 테스트 | Vitest | DEC-017 |
| 패키지 매니저 | pnpm | DEC-016 |

**새 dependency는 사용자 승인 후에만 추가합니다.**
전역 상태 라이브러리는 도입하지 않습니다 (Context + useState로 충분).

---

## 4. 디자인 규칙 요약

전체 규격은 `docs/design.md`. 자주 어기는 것만 옮깁니다.

- 색·간격·반경·폰트는 **토큰으로만** 사용합니다. 토큰에 없는 값이 필요하면 먼저 `design.md`에 추가합니다
- 강조는 **크기 → 여백 → 굵기 → 색** 순서로 만듭니다. 색은 마지막 수단입니다
- 「나의 교직 스타일 탐색」은 **카드형 검사**를 핵심 문법으로 사용합니다. 주 카드 안에는 정보 구조에 필요한 미니 정보 카드·선택 카드 1단계까지 허용하되, 장식만을 위한 카드와 3단계 중첩은 금지합니다
- 그림자보다 border로 구분합니다 (기본 `elev-0`)
- `radius-full`은 라디오 원과 진행바에만 씁니다. 버튼·카드는 `radius-md`(10px)
- Survey 본문 최대 폭 **40rem**. 데스크톱에서도 넓히지 않습니다
- **360px에서 가로 스크롤이 없어야 합니다**
- 문항 `legend`와 5점 척도는 fieldset 경계 밖으로 튀어나오거나 서로 겹치면 안 됩니다. 긴 한글 문장·200% 확대에서도 카드 내부 흐름으로 자연스럽게 늘어나야 합니다
- 반응형은 데스크톱 축소가 아니라 **iOS·Android 스마트폰과 노트북을 모두 1급 환경**으로 설계합니다. 360/390/768/1024/1440px, 세로·가로 회전, 200% 확대를 확인합니다
- 모바일 고정 CTA는 `env(safe-area-inset-bottom)`을 반영하고, 화면 키보드가 열린 상태에서도 입력·CTA·오류 문구가 가려지지 않아야 합니다
- 모바일에서는 hover에만 정보를 두지 않으며, 터치 타깃 44×44px·동적 뷰포트 높이(`dvh`)·긴 한글 줄바꿈을 함께 확인합니다
- 검사 상세는 Modal이 아니라 **Accordion**. 검사 시작·결과는 **별도 route**

### Forbidden Pattern (리뷰 체크리스트)

보라/파랑 gradient · sparkle 아이콘 남발 · glassmorphism · floating blob ·
모든 요소 pill · 지나치게 둥근 카드 · 카드 안 카드 안 카드 · 과도한 emoji ·
유아적 학교 캐릭터 · 의미 없는 decoration · 색만으로 상태 전달 ·
focus outline 제거 · placeholder를 label 대용으로 · "궁합" 표현

---

## 5. 접근성 (타협 불가)

- **키보드만으로 검사 처음부터 끝까지 완주 가능해야 합니다**
- 척도는 진짜 `<input type="radio">` + `role="radiogroup"`. 화살표 키 이동 지원
- `focus-visible`을 제거하지 않습니다
- 선택·오류 상태를 **색상만으로** 표현하지 않습니다 (아이콘/텍스트/형태 병행)
- `prefers-reduced-motion`을 존중합니다
- 터치 타깃 최소 44×44px, 본문 대비 4.5:1

---

## 6. 결과 화면 표현 규칙

**쓰지 않는 표현**
"궁합이 좋은/나쁜 사람" · "당신은 ~형입니다" · 등급 · 순위 · 백분위 ·
부정적 낙인("게으른", "우유부단한")

**쓰는 표현**
"호흡이 자연스러운 스타일" · "조율하면 더 편한 스타일" ·
"~하는 편이에요" · "~할 때가 많아요"

결과 구성 순서(고정 — DEC-038로 확장됨):
닉네임 → 결과 제목 → 한 줄 설명 → [유형 엠블럼] → 나의 교직 리듬 → 4축 시각화 →
축 조합 해석 → 교실에서 빛나는 순간 → 바쁠 때 나타날 수 있는 모습 → 동료와 함께 일할 때 →
호흡이 자연스러운 스타일 → 조율하면 더 편한 스타일 →
내일 해 볼 것 → 동료와 나눌 질문 → 검사 안내 → 이미지 저장 / 다시 검사하기

**결과에 넣지 않는 것**: 백분위·등급·순위 · 유형별 직업/업무 추천 · 하위척도 · 마스코트 캐릭터
(신뢰도는 "많이 보여주기"가 아니라 "정직하게 보여주기"에서 나옵니다 — DEC-038)

---

## 7. 새 검사를 추가할 때

**만드는 것**: `src/infrastructure/content/packages/<검사id>/` 폴더 하나
**고치는 것**: `StaticAssessmentCatalog.ts`에 한 줄 추가
**고치지 않는 것**: `domain/` `application/` `features/` `app/` `components/ui/` — **0줄**

이 조건을 만족하지 못하면 엔진이 콘텐츠에 오염된 것입니다. 설계를 되돌리세요.

---

## 8. 작업 전 체크리스트

- [ ] `docs/decisions.md`에서 이 작업과 관련된 `WAITING` 항목이 있는지 확인했는가
  → 있으면 **구현하지 말고 사용자에게 A/B/C로 질문**
- [ ] 새 dependency를 추가하려는가 → 승인 먼저
- [ ] 실제 문항·결과 텍스트를 쓰려 하는가 → 하지 말 것 (fixture만)
- [ ] `domain/`에 프레임워크 import를 넣으려 하는가 → 금지
- [ ] 채점 함수를 `async`로 만들려 하는가 → 금지
- [ ] 새 색·간격 값을 즉흥적으로 쓰려 하는가 → 먼저 `design.md`에 토큰 추가
- [ ] 금지 표현(기존 성격유형 검사 명칭·4글자 유형 코드)이 들어가는가 → 금지

## 9. 작업 후 체크리스트

- [ ] `pnpm lint` — 의존 규칙 위반 없음
- [ ] `pnpm vitest run` — 채점 테스트 통과
- [ ] `pnpm build` — 타입 오류 없음
- [ ] `grep -rEni "\bmbti\b|\b[EI][NS][TF][JP]\b" src/ public/` — 0건
      (단어 경계 `\b`를 빼면 `listPublished`·`contentPackageSchema` 같은 평범한 식별자가 오탐으로 잡힙니다)
- [ ] 360px 폭에서 가로 스크롤 없음
- [ ] iOS Safari·Android Chrome의 주소창 변화·회전·가상 키보드·안전영역 확인
- [ ] 768/1024px 노트북·태블릿과 200% 확대에서 콘텐츠 겹침 없음
- [ ] 키보드만으로 조작 가능, focus 링 보임
- [ ] Forbidden Pattern 해당 없음

---

## 10. 사용자와 대화하는 방식

- **한국어 존칭**으로 설명합니다 ("~합니다 / ~입니다 / ~해 주세요")
- 사용자는 초보 바이브코더입니다. **전문 용어는 괄호로 짧게 풀어 줍니다**
- "왜 그렇게 하는지" 한 줄을 붙입니다. 결론만 던지지 않습니다
- 실행할 명령은 복사해서 바로 쓸 수 있게 그대로 적어 줍니다
- **사용자가 할 일과 에이전트가 할 일을 나눠서** 적습니다
- 미결정 사항은 **A/B/C 선다형**으로 제시하고, 각 선택지에 장점·단점·추천 여부를 짧게 붙입니다
- 코드·명령어·파일명은 원문 그대로 둡니다

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
