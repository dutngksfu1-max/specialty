# 코덱스 작업 지시서 — 결과 화면 재설계 (Phase D)

> 이 문서 하나만 읽고 시작할 수 있게 썼습니다. 모르는 값은 추측하지 말고 8장의 확인 명령으로 직접 보세요.
> 작성: 2026-08-21 · 선행: `docs/PRD-result-v2.md` Phase A~C 완료 (엔진·콘텐츠는 이미 끝났습니다)

---

## 0. 한 줄 요약

**엔진과 콘텐츠는 완성되어 있습니다. 당신이 할 일은 이미 계산되어 들어오는 데이터를 화면으로 만드는 것입니다.**

지금 화면은 같은 무게의 문단이 길게 이어져서, 정보는 많은데 아무것도 눈에 안 들어옵니다.
카드 문법과 인포그래픽으로 다시 짜 주세요.

---

## 1. 당신의 재량과 제 요구를 분명히 나눕니다

### 완전히 당신이 정합니다 (제가 정해 주지 않습니다)

- 레이아웃·그리드·여백 리듬
- 인포그래픽의 구체적 형태와 표현
- 카드 배치와 시각적 위계
- 타이포 스케일 운용, 강조 방법
- 애니메이션·전환 (`prefers-reduced-motion` 존중하면)
- 섹션을 몇 개로 묶을지, 순서 안에서 어떻게 나눌지

> **"이렇게 해도 되나요?"라고 묻지 마세요.** 위 항목은 당신 판단이 최종입니다.
> 과감하게 하되, 아래 2~5장만 지켜 주세요.

### 반드시 지켜야 합니다

2장(데이터) · 3장(디자인 규칙) · 4장(접근성) · 5장(콘텐츠 금지)입니다.
이 넷은 프로젝트 규칙이거나 법적·윤리적 이유가 있어 협상 대상이 아닙니다.

---

## 2. 화면에 들어오는 데이터 (정확한 계약)

`src/features/result/ResultRenderer.tsx`가 받는 props입니다. **전부 계산이 끝난 상태로 들어옵니다.**

```ts
{
  definition: AssessmentDefinition   // 축 이름·라벨·설명
  snapshot: ResultSnapshot           // 점수·닉네임·완료 시각
  profile: ResultProfile             // 16유형 중 하나의 문구 묶음
  nickname: string
  signals?: AssessmentSignals        // ★ 신규 — 없을 수 있습니다
}
```

### 2.1 축 점수 — `snapshot.score.axisScores[]` (항상 4개)

| 필드 | 뜻 | 값 |
|---|---|---|
| `rawScore` | 연속 점수 | **−24 ~ +24** |
| `direction` | 기운 방향 | `"positive"` \| `"negative"` |
| `isBalanced` | 정확히 0점인가 | boolean |
| `normalized` | 시각화용 | 0 ~ 1 |
| `intensityBandId` | **쓰지 마세요** | 낡은 값일 수 있습니다 |

> **`intensityBandId`를 직접 읽지 마세요.** 저장된 값이라 구간표가 바뀌면 어긋납니다.
> 강도는 아래 `narrative.axes[].reading.intensityBandId`를 쓰세요 (읽는 시점에 재계산됩니다).

### 2.2 축별 서술 — `resolveResultNarrative(...)` 결과

```ts
{
  title: string          // 결과 제목
  oneLiner: string       // 한 줄 설명
  rhythm: string         // 나의 교직 리듬 (네 문장)
  axes: [{
    axisId, rawScore,
    isDirectional: boolean          // false = 균형 구간
    reading: { intensityBandId, direction, headline, summary, rhythm }
    counterEvidence: string         // ★ "이 설명이 안 맞는다면 —"
  }] // 4개
  balancedAxisIds: Set<AxisId>
}
```

**강도 구간 5단계** — `reading.intensityBandId`로 들어옵니다.

| id | 라벨 | `|rawScore|` | 뜻 |
|---|---|---|---|
| `balanced` | 균형 | 0 ~ 5 | **방향을 정하지 않음** |
| `leaning` | 조금 뚜렷 | 6 ~ 10 | 한 장면에서 보임 |
| `clear` | 뚜렷 | 11 ~ 14 | 여러 장면에서 |
| `strong` | 강함 | 15 ~ 19 | 장면이 바뀌어도 |
| `defining` | 매우 뚜렷 | 20 ~ 24 | 대부분의 장면에서 |

### 2.3 축쌍 렌즈 — `resolveAxisCombinations(...)` 결과

**0~6개**가 들어옵니다. 두 축이 **모두 방향성일 때만** 나오므로, 균형 축이 있으면 줄어듭니다.

```ts
[{ id, title, text }]   // 최대 6개, 0개일 수도 있음
```

> **0개일 때 빈 영역이 남지 않게** 설계해 주세요.

### 2.4 축 순위 (무게중심) — `resolveAxisRanking(...)`

```ts
{
  ordered: [{ axisId, absScore }]   // 기울기 큰 순서, 4개
  primary?: { axisId, absScore }    // 1·2위 차이 ≥ 3일 때만
  secondary?: { axisId, absScore }
  isTied: boolean                   // true면 primary/secondary 없음
}
```

> `isTied`가 true면 **"주축"이라고 부르면 안 됩니다.** "비슷하게 도드라지는 두 관점"으로 표현하세요.

### 2.5 신호 — `signals` (★ 이번 개편의 핵심)

`undefined`일 수 있습니다. **없어도 결과가 온전히 보여야 합니다.**

```ts
{
  consistency: [{ axisId, variance, bandId, questionCount }]   // 4개
  //   bandId: "steady" | "mixed" | "split"
  //   → 열두 문항에서 자기 자신과 얼마나 일관됐는가

  contextSplits: [{ axisId, gap, high, low }]                  // 0~4개
  //   high/low: { context, mean, questionCount, positiveCount, negativeCount }
  //   → 장면에 따라 답이 갈린 축만 담깁니다. 조건 미달이면 아예 없습니다.

  responseStyle: { id, extremeRate, middleRate, answeredCount }
  //   id: "wide" | "moderate" | "centered"

  confidence: [{ axisId, id, reasons }]                        // 4개
  //   id: "low" | "medium" | "high"
  //   reasons: ("balanced" | "split" | "centered")[]
}
```

**`context` 값과 사람이 읽는 이름**

| 값 | 화면 표기 |
|---|---|
| `lesson` | 수업 |
| `guidance` | 생활지도 |
| `admin` | 업무 |
| `colleague` | 동료 |
| `family` | 학부모 |
| `self` | 혼자 |

### 2.6 유형 문구 — `profile`

`title` · `oneLiner` · `rhythm` · `shiningMoments[]` · `underPressure[]` · `withColleagues[]` ·
`collaboration.naturalFit[]` · `collaboration.needsTuning[]` · `nextSteps[]` · `talkingPoints[]`

`shiningMoments` 등은 `{ scene, text }` 형태입니다.

> **균형 축이 하나라도 있으면** 이 프로필 문구 대신 `definition.resultNarrative.balancedGuidance`를 쓰고
> 엠블럼과 해당 렌즈를 숨깁니다. 이 분기는 이미 코드에 있으니 구조만 유지해 주세요.

---

## 3. 디자인 규칙

### 3.1 토큰

색·간격·반경·폰트는 **토큰으로만** 씁니다. 정의는 `src/app/globals.css`입니다.

> **새 값이 필요하면 토큰으로 정의하고 `docs/design.md`에 함께 제출하세요.**
> 즉흥적인 하드코딩(`#f5f5f5`, `margin: 13px`)만 금지이고, **토큰을 늘리는 것은 환영합니다.**

### 3.2 차트 색 — 이미 검증했습니다

기존 `--color-perspective-*` 네 색은 **차트 마크로 쓸 수 없습니다.** 검증기에서 세 항목이 실패했습니다
(채도 미달 / 적록색약에서 ΔE 2.9 / 정상 색각에서도 ΔE 8.9).

대신 아래를 쓰세요. 셋 다 검증 통과했습니다.

| 용도 | 값 |
|---|---|
| **발산 쌍** (축 막대의 주 표현) | `#00713e` ↔ `#c06f0a`, 중립은 샌드 계열 |
| **순차 램프** (강도 4단계) | `#8cb395` · `#5d996e` · `#307e4b` · `#00612c` |
| **4색** (한 그림에 네 축을 겹칠 때만) | `#00682e` · `#da950b` · `#ae4090` · `#2580c1` |

**네 축에 네 색을 기본으로 쓰지 마세요.** 축의 일은 *정체성*이 아니라 **양극성**입니다.
네 축 전부에 같은 발산 쌍을 쓰고 축은 **라벨·아이콘·위치**로 구분하는 편이 정직하고, 적록 문제도 사라집니다.

**이 세 팔레트는 그대로 쓰시면 됩니다 — 이미 검증을 마쳤습니다.**

바꾸고 싶으면 **직접 바꾸지 말고 제안해 주세요.** 색약 분리(ΔE)와 대비를 계산으로 확인해야 하는데,
그 검증기가 이 저장소에는 없습니다. 원하는 색을 알려 주시면 제가 돌려 보고 통과한 값을 드리겠습니다.

기준은 이렇습니다 — 눈으로 판단하면 반드시 놓칩니다.

| 검사 | 기준 |
|---|---|
| 명도 대역 | OKLCH L이 0.43 ~ 0.77 |
| 채도 바닥 | OKLCH C ≥ 0.10 (미만이면 회색으로 읽힘) |
| 색약 분리 | 적록·청황 시뮬레이션에서 인접 쌍 ΔE ≥ 8 |
| 정상 시야 분리 | ΔE ≥ 15 |
| 표면 대비 | 배경(`#fcfbf8`) 대비 3:1 이상 |

### 3.3 카드 문법

- 주 카드 안 미니 카드는 **1단계까지만**. 3단 중첩 금지
- 그림자보다 **border**로 구분 (기본 `elev-0`)
- `radius-full`은 라디오 원과 진행바에만. 카드·버튼은 `radius-md`

### 3.4 금지 패턴 (`docs/design.md` 13절)

보라/파랑 그라데이션 · sparkle 남발 · glassmorphism · floating blob ·
모든 요소 pill · 과도한 emoji · **유아적 학교 캐릭터** · 의미 없는 장식 ·
**색만으로 상태 전달** · focus outline 제거

---

## 4. 접근성 (타협 불가)

- **360px에서 가로 스크롤 없음**
- 터치 타깃 **44 × 44px**, 본문 대비 **4.5 : 1**
- 키보드만으로 조작 가능, `focus-visible` 유지
- `prefers-reduced-motion` 존중
- **차트는 색 외에 라벨·형태·패턴 중 하나를 반드시 병행**
- 확인 폭: 360 / 390 / 768 / 1024 / 1440px, 세로·가로, **200% 확대**

---

## 5. 콘텐츠 금지 (규칙 위반이면 작업이 반려됩니다)

| 금지 | 이유 |
|---|---|
| 등급 · 순위 · 백분위 · 점수 사다리 | `AGENTS.md` 6절 |
| 유형별 **직업·업무 추천** | 근거 없는 과잉 해석 |
| **"궁합"** 표현 | `AGENTS.md` 6절 |
| 결과 키(`profile.key`) 화면 노출 | 내부 식별자입니다 |
| 기존 성격유형 검사의 명칭·4글자 코드 | `AGENTS.md` 1.1 |
| 부정적 낙인("게으른", "우유부단한") | — |

**문구를 새로 쓰지 마세요.** 모든 텍스트는 콘텐츠 패키지가 소유합니다.
라벨·제목이 더 필요하면 만들지 말고 **무엇이 필요한지 알려 주세요.**

### 말투

"~하는 편이에요" · "~할 때가 많아요". 단정("당신은 ~형입니다")하지 않습니다.

---

## 6. 꼭 살려 주셨으면 하는 것 — 이 개편의 이유

지금 화면의 문제는 예쁘지 않은 게 아니라 **"응답을 되풀이하는 것처럼" 보인다**는 점이었습니다.
그걸 뒤집는 장치가 아래 넷입니다. **형태는 당신이 정하되, 화면에서 사라지지 않게 해 주세요.**

| # | 장치 | 데이터 | 왜 중요한가 |
|---|---|---|---|
| **T1** | **근거 노출** | `rawScore`, `questionCount`, `contextSplits[].high/low` | "왜 이런 말이 나왔지?"에 답합니다. 이걸 하는 검사가 없습니다 |
| **T2** | **확신도** | `signals.confidence[]` | 모든 문장을 같은 확신으로 말하지 않습니다 |
| **T3** | **반증 여지** | `narrative.axes[].counterEvidence` | 반박할 수 없는 결과는 점괘입니다 |
| **T4** | **측정 범위** | `resultNarrative.scopeNote` | 재지 않은 것을 밝힙니다. **한 번만, 분명히** |

### 특히 이 두 가지가 새 정보입니다

**장면 분화 (`contextSplits`)** — 축 합계로는 절대 안 보이는 것입니다.

> "동료와 있는 장면에서는 이쪽, 업무 장면에서는 반대쪽 — 근거: 동료 6문항 평균 1.5 / 업무 3문항 평균 −0.7"

숫자를 **그대로 보여 주세요.** 근거가 얇다는 것(장면당 3~6문항)도 함께 알려야 합니다.

**응답 습관 (`responseStyle`)** — `centered`면, 네 축이 전부 균형인 이유가
성향이 아니라 **가운데를 많이 고른 습관**일 수 있습니다. 그 사실을 알려 주는 게 정직합니다.

---

## 7. 화면 순서 (`AGENTS.md` 6절 — 순서는 고정, 묶음은 자유)

```
닉네임 → 결과 제목 → 한 줄 설명 → [방향이 분명할 때만 엠블럼] →
나의 교직 리듬 → 4축 시각화 → 축 조합 해석 →
강점이 드러날 수 있는 장면 → 바쁠 때 나타날 수 있는 모습 → 동료와 함께 일할 때 →
함께할 때 잘 이어지는 점 → 미리 맞춰 두면 좋은 점 →
내일 해 볼 것 → 동료와 나눌 질문 → 검사 안내 → 이미지 저장 / 다시 검사하기
```

**새 구역**은 이 흐름 안에 자연스럽게 끼워 넣어 주세요 — 위치는 당신이 정합니다.

- 무게중심 (축 순위) — `isTied`면 다르게 표현
- 장면에 따라 달라지는 점 (`contextSplits`) — 없으면 통째로 생략
- 이 결과를 읽는 법 (확신도·응답 습관)

---

## 8. 시작 전에 직접 확인하세요

추측하지 말고 실제 값을 보세요.

```bash
pnpm install
pnpm dev                 # http://localhost:3000

# 결과 화면까지 가려면 검사를 한 번 마쳐야 합니다 (48문항).
# 데이터 모양을 먼저 보고 싶으면:
pnpm vitest run src/domain/assessment/result/    # 신호·순위 테스트가 실제 값을 보여 줍니다
```

**핵심 파일**

| 파일 | 역할 |
|---|---|
| `src/features/result/ResultRenderer.tsx` | **주 작업 대상.** 결과 본문 |
| `src/features/result/ResultView.tsx` | 데이터 로딩 + 하단 액션 |
| `src/features/result/AxisBar.tsx` | 축 막대 (재설계 대상) |
| `src/features/result/TypeEmblem.tsx` | 유형 엠블럼 (규격: `docs/type-emblem.md`) |
| `src/app/globals.css` | 토큰 정의 |

**작업 중 참고**

| 문서 | 볼 때 |
|---|---|
| `docs/PRD-result-v2.md` | 왜 이렇게 만드는가 (4·5·8·9장) |
| `docs/design.md` | 토큰·컴포넌트·금지 패턴 |
| `AGENTS.md` | 프로젝트 절대 규칙 |

---

## 9. 제출 전 통과해야 합니다

```bash
pnpm lint          # 경고 0
pnpm vitest run    # 235개 전부 통과
pnpm build         # 타입 오류 0

grep -rEni "\bmbti\b|\b[EI][NS][TF][JP]\b" src/ public/    # 0건
```

**손대지 마세요** — 이 경계를 넘으면 엔진이 화면에 오염됩니다.

```
src/domain/          채점·신호·해석 (순수 함수)
src/application/     유스케이스
src/infrastructure/  콘텐츠·저장소
```

화면에 필요한 값이 없으면 **직접 계산하지 말고 무엇이 필요한지 알려 주세요.** 제가 계약을 넓히겠습니다.

---

## 10. 함께 제출해 주세요

1. **변경 파일 목록**과 각 파일에서 한 일
2. 새 토큰을 만들었다면 `docs/design.md` 반영분
3. 차트 색을 바꿨다면 **검증기 출력**
4. 확인한 화면 폭과 스크린샷 (360 / 768 / 1440 최소 3장)
5. 판단이 갈렸던 지점과 **왜 그렇게 정했는지** — 되돌릴 근거가 됩니다
