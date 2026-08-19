# Design SSOT — 서치티쳐마인드

> 문서 상태: **v0.2** — 랜딩 개편에 맞춰 시각 방향을 갱신했습니다.
> 최종 수정: 2026-08-19
>
> **v0.1 → v0.2에서 바뀐 것**: 2.6(배경 그라데이션 추가) · 5장(반경 확장) · 6장(그림자·hover) ·
> 9장(닉네임 입력 pill) · 12장(랜딩 단일 패널 구성) · 14장(hover 리프트) · 16장(금지 패턴 재조정).
> 색·타이포·간격·접근성 기준은 v0.1 그대로입니다.
> 이 문서는 **시각 디자인의 유일한 기준**입니다. 컴포넌트를 만들 때 여기 없는 값을 즉흥적으로 쓰지 않습니다.
> 새 값이 필요하면 먼저 이 문서에 토큰을 추가한 뒤 사용합니다.

---

## 1. Design Philosophy

### 우리가 만들려는 인상

> "교무실 책상에 놓인, 잘 만든 종이 안내문"

바쁜 교사가 강의실에서 스마트폰으로 여는 화면입니다.
화려할 필요가 없고, **읽기 편하고 방해받지 않는 것**이 최우선입니다.

| 원칙 | 구체적 의미 |
|---|---|
| **차분함** | 채도를 낮춘다. 시선을 끄는 요소는 화면당 1개만 |
| **신뢰감** | 정렬을 지킨다. 여백이 일정하다. 예측 가능하게 움직인다 |
| **친근함** | 문장이 사람 말투다. 딱딱한 전문용어를 쓰지 않는다. 따뜻한 파스텔 톤을 허용한다. |
| **성숙함** | 교사를 어린이처럼 대하지 않는다. 단, 편안하고 아기자기한 톤은 일부 허용한다. |
| **여백** | 요소를 채우기보다 비운다. 여백이 정보 구조를 대신 설명한다 |
| **editorial** | 카드 나열이 아니라 "읽는 글"의 리듬. 제목-본문-여백의 반복 |

### 시각 위계 원칙

1. 한 화면에 **강조 요소는 하나**. (랜딩 = 활성 검사 카드, 검사 = 현재 문항, 결과 = 결과 제목)
2. 강조는 **크기 → 여백 → 굵기 → 색** 순서로 만든다. 색은 마지막 수단이다.
3. 카드는 정보를 묶는 도구다. **중첩은 최대 2겹까지** — 랜딩의 바깥 패널 안에 검사 카드가 들어가는
   구성까지만 허용하고, 그 안에 또 카드를 넣지 않는다.
4. 경계는 **선(border)**을 기본으로 하되, 페이지에서 가장 중요한 면 하나에는 그림자를 허용한다.
   (랜딩 메인 패널 = `elev-3`, 검사 카드 = `elev-1` → hover `elev-2`)

---

## 2. Color Token

### 2.1 색 전략

- **Theme color: 세이지 그린** — 채도를 크게 낮춘 녹색. 교육·차분함과 어울리고 흔한 AI 파랑/보라를 피합니다.
- **Point color: 클레이(머스타드~테라코타)** — 세이지의 보색 방향에서 따온 따뜻한 색. tone-on-tone 대비로 안정적입니다.
- **Neutral: 웜 뉴트럴(샌드)** — 순수 회색 대신 아주 옅은 노란기를 넣어 종이 질감을 만듭니다.

> 색은 모두 **OKLCH**로 정의합니다. OKLCH는 사람 눈이 느끼는 밝기(L)를 기준으로 하므로,
> 같은 L 값이면 색상이 달라도 밝기가 비슷하게 느껴집니다. 대비 조절이 훨씬 쉽습니다.
> 표기: `oklch(밝기 채도 색상각)` — 밝기 0~1, 채도 0~0.4, 색상각 0~360

### 2.2 Raw Palette

**Sage (theme)**

| 토큰 | OKLCH | 용도 |
|---|---|---|
| `--sage-50` | `oklch(0.972 0.010 152)` | 아주 옅은 배경 |
| `--sage-100` | `oklch(0.940 0.018 152)` | 선택 상태 배경, soft chip |
| `--sage-200` | `oklch(0.885 0.030 152)` | 옅은 경계선 |
| `--sage-300` | `oklch(0.808 0.042 152)` | 비활성 강조 |
| `--sage-400` | `oklch(0.700 0.052 152)` | 보조 그래프 |
| `--sage-500` | `oklch(0.612 0.058 152)` | focus ring |
| `--sage-600` | `oklch(0.520 0.055 152)` | **primary** |
| `--sage-700` | `oklch(0.432 0.047 152)` | primary hover |
| `--sage-800` | `oklch(0.352 0.038 152)` | primary active |
| `--sage-900` | `oklch(0.278 0.030 152)` | 진한 텍스트 강조 |
| `--sage-950` | `oklch(0.195 0.022 152)` | 다크 배경 |

**Sand (warm neutral)**

| 토큰 | OKLCH | 용도 |
|---|---|---|
| `--sand-50` | `oklch(0.988 0.004 95)` | 페이지 배경 |
| `--sand-100` | `oklch(0.968 0.008 92)` | muted surface |
| `--sand-200` | `oklch(0.930 0.012 90)` | 기본 border |
| `--sand-300` | `oklch(0.880 0.014 88)` | 강한 border, 구분선 |
| `--sand-400` | `oklch(0.780 0.014 86)` | disabled 텍스트 |
| `--sand-500` | `oklch(0.660 0.014 84)` | placeholder |
| `--sand-600` | `oklch(0.540 0.013 82)` | subtle 텍스트 |
| `--sand-700` | `oklch(0.440 0.012 80)` | muted 텍스트 |
| `--sand-800` | `oklch(0.340 0.010 78)` | 본문 보조 |
| `--sand-900` | `oklch(0.250 0.008 76)` | 본문 |
| `--sand-950` | `oklch(0.180 0.006 74)` | 제목 |

**Clay (point)**

| 토큰 | OKLCH | 용도 |
|---|---|---|
| `--clay-100` | `oklch(0.945 0.030 72)` | accent soft 배경 |
| `--clay-200` | `oklch(0.900 0.048 71)` | accent 경계 |
| `--clay-300` | `oklch(0.845 0.070 70)` | 그래프 보조 |
| `--clay-500` | `oklch(0.740 0.110 68)` | 강조 마커 |
| `--clay-600` | `oklch(0.660 0.115 62)` | **accent** |
| `--clay-700` | `oklch(0.560 0.105 55)` | accent hover |

**Status (테마색과 반드시 구분되도록 채도를 높게)**

| 토큰 | OKLCH | 용도 |
|---|---|---|
| `--status-success` | `oklch(0.585 0.135 148)` | 완료. 항상 체크 아이콘과 함께 |
| `--status-warning` | `oklch(0.740 0.140 78)` | 주의. 항상 경고 아이콘과 함께 |
| `--status-danger` | `oklch(0.560 0.170 27)` | 오류/삭제. 항상 아이콘·텍스트와 함께 |
| `--status-info` | `oklch(0.620 0.070 240)` | 정보 안내. 아주 절제해서 사용 |

> **주의**: theme가 녹색이므로 `success`를 녹색만으로 표현하면 구분이 안 됩니다.
> 상태는 **반드시 아이콘 + 텍스트**를 동반합니다 (접근성 요구사항이기도 합니다).

### 2.3 Semantic Token (실제 코드에서 쓰는 이름)

컴포넌트는 **raw 팔레트를 직접 쓰지 않고 아래 semantic 토큰만** 사용합니다.

| Semantic | Light 값 | 의미 |
|---|---|---|
| `--color-background` | `--sand-50` | 페이지 바탕 |
| `--color-surface` | `oklch(1 0 0)` | 카드/패널 바탕 |
| `--color-surface-muted` | `--sand-100` | 눌린 영역, 보조 패널 |
| `--color-surface-inset` | `--sand-200` | 진행바 트랙, 축 트랙 |
| `--color-border` | `--sand-200` | 기본 경계선 |
| `--color-border-strong` | `--sand-300` | 강조 경계선, 구분선 |
| `--color-foreground` | `--sand-950` | 제목 |
| `--color-foreground-body` | `--sand-900` | 본문 |
| `--color-foreground-muted` | `--sand-700` | 보조 설명 |
| `--color-foreground-subtle` | `--sand-600` | 캡션, 메타 |
| `--color-foreground-disabled` | `--sand-400` | 비활성 |
| `--color-primary` | `--sage-600` | 주 버튼, 선택 상태 |
| `--color-primary-hover` | `--sage-700` | |
| `--color-primary-active` | `--sage-800` | |
| `--color-primary-foreground` | `--sand-50` | 주 버튼 글자 |
| `--color-primary-soft` | `--sage-100` | 선택된 항목 배경 |
| `--color-primary-soft-border` | `--sage-300` | 선택된 항목 경계 |
| `--color-accent` | `--clay-600` | 포인트(결과 강조, 마커) |
| `--color-accent-soft` | `--clay-100` | 포인트 배경 |
| `--color-focus-ring` | `--sage-500` | focus-visible 링 |

**Dark mode**: MVP에서는 **light 전용**으로 출시합니다.
다만 토큰 구조를 위와 같이 semantic으로 잡아 두었으므로, 나중에
`@media (prefers-color-scheme: dark)`에서 semantic 값만 교체하면 됩니다.
(다크 대응은 Phase 6 이후 검토 — `docs/decisions.md` DEC-021)

### 2.4 Tailwind v4 정의 예시

```css
/* src/styles/globals.css */
@import "tailwindcss";

@theme {
  /* raw palette */
  --color-sage-50:  oklch(0.972 0.010 152);
  --color-sage-100: oklch(0.940 0.018 152);
  --color-sage-600: oklch(0.520 0.055 152);
  /* ... 나머지 동일하게 ... */

  /* semantic — 컴포넌트는 이것만 사용 */
  --color-background:        var(--color-sand-50);
  --color-surface:           oklch(1 0 0);
  --color-border:            var(--color-sand-200);
  --color-foreground:        var(--color-sand-950);
  --color-foreground-muted:  var(--color-sand-700);
  --color-primary:           var(--color-sage-600);
  --color-primary-foreground:var(--color-sand-50);
  --color-accent:            var(--color-clay-600);
  --color-focus-ring:        var(--color-sage-500);
}
```

### 2.6 페이지 배경 그라데이션

바탕은 단색이 아니라 **아주 옅은 웜 그라데이션**입니다. 종이 질감을 만들고,
그 위에 놓인 흰 패널이 자연스럽게 떠 보이게 합니다.

```css
--gradient-page: linear-gradient(
  135deg,
  oklch(0.985 0.015 95) 0%,   /* 밝은 크림 */
  oklch(0.945 0.035 65) 100%  /* 옅은 클레이 */
);
```

**규칙**

- `body`에만 적용하고 `background-attachment: fixed`로 고정합니다 (스크롤해도 결이 흔들리지 않게)
- 두 정지점 모두 **채도 0.04 이하**입니다. 이보다 진해지면 본문 대비가 무너집니다
- 보라·파랑 계열 그라데이션은 여전히 금지입니다 (16장 1번). 웜 뉴트럴 → 클레이 방향만 씁니다
- 그 위에 올라가는 면은 `--color-surface` 또는 반투명 흰색(`surface/80`)을 씁니다

### 2.5 대비 기준 (반드시 검증)

| 조합 | 최소 대비 | 비고 |
|---|---|---|
| 본문 텍스트 / 배경 | 4.5:1 | `--color-foreground-body` on `--color-background` |
| 보조 텍스트 / 배경 | 4.5:1 | `--color-foreground-muted` 이상만 본문에 사용 |
| 큰 제목(24px+ bold) | 3:1 | |
| 버튼 글자 / 버튼 배경 | 4.5:1 | |
| 경계선 / 인접 배경 | 3:1 | 폼 요소 테두리는 필수 |
| focus ring / 배경 | 3:1 | |

> `--sand-500` 이하 밝기의 색을 본문 텍스트에 쓰지 않습니다. 캡션에도 `--sand-600`까지만 씁니다.

---

## 3. Typography

### 3.1 서체

- **Pretendard Variable** (SIL Open Font License, 상업적 사용 가능)
- `next/font/local`로 로컬 로딩 → 외부 요청 없음 → **오프라인에서도 동일하게 표시**
- fallback: `-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`

```ts
// src/app/fonts.ts
import localFont from "next/font/local";

export const pretendard = localFont({
  src: "../../public/fonts/PretendardVariable.woff2",
  weight: "45 920",          // variable 범위 지정 (WebKit 렌더링 이슈 방지)
  variable: "--font-sans",
  display: "swap",
});
```

### 3.2 Type Scale

| 토큰 | 모바일(360~767) | 데스크톱(768+) | line-height | weight | tracking |
|---|---|---|---|---|---|
| `display` | 1.75rem (28px) | 2.25rem (36px) | 1.25 | 700 | -0.02em |
| `h1` | 1.5rem (24px) | 1.875rem (30px) | 1.3 | 700 | -0.015em |
| `h2` | 1.25rem (20px) | 1.5rem (24px) | 1.35 | 600 | -0.01em |
| `h3` | 1.125rem (18px) | 1.25rem (20px) | 1.4 | 600 | -0.005em |
| `body-lg` | 1.0625rem (17px) | 1.125rem (18px) | 1.7 | 400 | 0 |
| `body` | 1rem (16px) | 1rem (16px) | 1.7 | 400 | 0 |
| `body-sm` | 0.875rem (14px) | 0.875rem (14px) | 1.6 | 400 | 0 |
| `caption` | 0.8125rem (13px) | 0.8125rem (13px) | 1.5 | 500 | 0.01em |
| `label` | 0.875rem (14px) | 0.875rem (14px) | 1.4 | 600 | 0 |

### 3.3 한글 조판 규칙

- **line-height는 최소 1.6** (한글은 라틴 문자보다 넉넉한 행간이 필요합니다)
- **문항 텍스트는 `body-lg`** — 40번 읽어야 하므로 본문보다 한 단계 큽니다
- `word-break: keep-all` — 한글 단어가 중간에서 잘리지 않게 합니다
- `text-wrap: pretty` — 마지막 줄에 한 단어만 남는 것을 방지합니다
- 문단 최대 폭은 **40rem**을 넘지 않습니다 (한 줄이 너무 길면 눈이 다음 줄을 못 찾습니다)
- 굵기는 **400 / 600 / 700 세 가지만** 사용합니다

---

## 4. Spacing

4px 기반 스케일입니다. **이 목록에 없는 값을 쓰지 않습니다.**

| 토큰 | 값 | 주 용도 |
|---|---|---|
| `space-1` | 4px | 아이콘-텍스트 간격 |
| `space-2` | 8px | 인접 요소 |
| `space-3` | 12px | 라벨-입력 |
| `space-4` | 16px | 컴포넌트 내부 기본 패딩 |
| `space-5` | 20px | |
| `space-6` | 24px | 카드 내부 패딩(모바일) |
| `space-8` | 32px | 카드 내부 패딩(데스크톱), 문항 간 간격 |
| `space-10` | 40px | 블록 간격 |
| `space-12` | 48px | 섹션 내부 구분 |
| `space-16` | 64px | 섹션 간격(모바일) |
| `space-20` | 80px | 섹션 간격(데스크톱) |
| `space-24` | 96px | Hero 상하 여백(데스크톱) |

**리듬 규칙**

- 문항과 문항 사이: `space-8` (32px)
- 문항 텍스트와 척도 사이: `space-4` (16px)
- 섹션 제목과 내용 사이: `space-4`
- 결과 페이지 섹션 사이: `space-12` (48px)

---

## 5. Radius

| 토큰 | 값 | 용도 |
|---|---|---|
| `radius-xs` | 4px | 상태 배지, 강도 배지 |
| `radius-sm` | 6px | 입력 필드(검사·결과 화면) |
| `radius-md` | 10px | 준비 중 카드, 작은 면 |
| `radius-lg` | 14px | 중간 카드 |
| `radius-xl` | 18px | **기본 버튼**, 결과 히어로 블록 |
| `radius-2xl` | 32px | **활성 검사 카드** |
| `radius-3xl` | 40px | **랜딩 메인 패널** (페이지당 1개) |
| `radius-full` | 9999px | 라디오 원, 진행바 트랙, 닉네임 입력, 상태 칩 |

**규칙**

- `radius-3xl`은 **페이지에서 가장 바깥 패널 하나에만** 씁니다. 남발하면 화면이 물렁해집니다
- 안쪽으로 갈수록 반경을 줄입니다 (패널 40px → 카드 32px → 버튼 18px → 배지 4px).
  바깥보다 안쪽이 더 둥글면 어색해 보입니다
- `radius-full`을 쓰는 곳은 위 목록이 전부입니다. **일반 버튼·카드에는 쓰지 않습니다**
  (모든 요소를 pill로 만들면 위계가 사라집니다)
- 검사 진행 화면과 결과 화면은 읽기가 목적이므로 **`radius-xl` 이하만** 씁니다.
  큰 곡률은 랜딩에서만 씁니다

---

## 6. Elevation (그림자)

그림자는 **떠 있어야 하는 요소에만** 씁니다. 평면 요소는 border로 구분합니다.

| 토큰 | 값 | 용도 |
|---|---|---|
| `elev-0` | `none` | 기본값. 검사·결과 화면의 면은 border로만 구분 |
| `elev-1` | `0 1px 2px oklch(0.30 0.02 90 / 0.06)` | 활성 검사 카드(기본 상태) |
| `elev-2` | `0 2px 8px -2px oklch(0.30 0.02 90 / 0.08)` | 하단 고정 내비게이션 바, 카드 hover |
| `elev-3` | `0 8px 24px -8px oklch(0.30 0.02 90 / 0.12)` | **랜딩 메인 패널**, Dialog / Drawer |

**규칙**

- 한 화면에 `elev-3`은 **하나만** 씁니다
- 그림자로 위계를 만들지 않습니다. 위계는 여전히 크기 → 여백 → 굵기 → 색 순서입니다.
  그림자는 "이 면이 배경 위에 떠 있다"는 사실만 전달합니다
- 검사 진행 화면은 `elev-0`과 `elev-2`(하단 바)만 씁니다 — 읽는 데 방해가 되지 않도록

> 그림자 색은 검정이 아니라 **웜 뉴트럴 계열**입니다. 검정 그림자는 화면을 탁하게 만듭니다.

---

## 7. Component — Button

### 변형

| 변형 | 배경 | 글자 | 경계 | 용도 |
|---|---|---|---|---|
| `primary` | `--color-primary` | `--color-primary-foreground` | 없음 | 화면당 1개. "검사 시작", "다음 10문항", "결과 확인하기" |
| `secondary` | `--color-surface` | `--color-foreground-body` | 1px `--color-border-strong` | "이전", 보조 동작 |
| `ghost` | 투명 | `--color-foreground-muted` | 없음 | 저강도 동작 |
| `destructive` | `--color-surface` | `--status-danger` | 1px `--status-danger` | "저장 데이터 삭제" (아이콘 필수) |

### 크기

| 크기 | 높이 | 좌우 패딩 | 폰트 |
|---|---|---|---|
| `sm` | 36px | 12px | `body-sm` |
| `md` | 44px | 16px | `body` |
| `lg` | 52px | 24px | `body-lg` / weight 600 |

> **모든 버튼의 최소 터치 영역은 44×44px**입니다. `sm`을 쓸 때는 주변 패딩으로 44px를 확보합니다.
> 반경은 **`radius-xl`(18px)** 입니다 (v0.2에서 10px → 18px). pill로 만들지 않습니다.

### 상태

- `hover`: 배경 한 단계 진하게 (`--color-primary-hover`)
- `active`: 한 단계 더 진하게 + `transform: none` (눌림 효과로 크기 변화 없음)
- `focus-visible`: 2px `--color-focus-ring` 링 + 2px offset. **절대 제거 금지**
- `disabled`: `--color-surface-muted` 배경 + `--color-foreground-disabled` 글자 + `cursor: not-allowed`
- `loading`: 스피너 + 텍스트 유지 + `aria-busy="true"`

---

## 8. Component — Card

```
┌─────────────────────────────────┐  ← 1px --color-border
│  padding: 24px(모바일)/32px(데스크톱)
│                                  
│  [제목: h3]                      
│  space-2                         
│  [설명: body-sm, muted]          
│  space-6                         
│  [내용 또는 액션]                
│                                  
└─────────────────────────────────┘  radius-md(10px) / 큰 카드는 lg(14px)
```

**규칙**

- 기본 카드: 배경 `--color-surface`, 경계 1px `--color-border`, 그림자 없음(`elev-0`), `radius-md`~`lg`
- **랜딩의 활성 검사 카드만** `radius-2xl`(32px) + `elev-1` + hover `elev-2`·리프트를 씁니다
- **중첩은 두 겹까지.** 그 안쪽 구획은 구분선(`--color-border`) 또는 여백으로 나눕니다
- 카드가 클릭 가능하면 전체를 `<a>`/`<button>`으로 감싸고 hover 시 경계선만 `--color-border-strong`으로 바꿉니다
- 상태 배지는 `radius-xs`, `caption` 크기. **정보 칩**(문항 수·소요 시간 등)은 `radius-full` + `--color-primary-soft` 배경

---

## 9. Component — Form

### 구조

```
[Label — label 토큰, --color-foreground-body]
space-2
[Input — 높이 44px, radius-sm, 1px --color-border]
space-2
[Helper 또는 Error — body-sm]
```

**규칙**

- Label은 항상 **입력 위**에 둡니다 (placeholder를 라벨 대신 쓰지 않습니다)
- placeholder는 예시 용도로만. `--color-foreground-subtle`
- 오류 상태 = **빨간 테두리 + 경고 아이콘 + 오류 문구** (색만으로 표현 금지)
- 오류 문구는 `aria-describedby`로 입력과 연결합니다
- 필수 항목 표시는 `*`가 아니라 "(선택)" 라벨로 반대 표기 — 이 서비스는 필수 입력이 거의 없습니다

### 닉네임 입력 (Landing)

- 인라인 폼. **로그인처럼 보이면 안 됩니다** → 카드로 감싸지 않고, "로그인/시작하기" 대신 부드러운 안내 문구
- 예: 라벨 "어떻게 불러 드릴까요? (선택)" / placeholder "예: 3반 김선생" / helper "입력하지 않으면 '선생님'으로 표시돼요."
- 입력값은 브라우저에만 저장된다는 안내를 helper 또는 인접 캡션에 명시
- **모양(v0.2)**: 높이 52px(`h-13`), `radius-full`, 좌우 패딩 20px, **가운데 정렬**, `elev-1`.
  라벨·helper도 가운데 정렬해 랜딩의 중앙 축을 지킵니다
- 이 화면에서만 `radius-full` 입력을 씁니다. 검사·결과 화면의 입력은 `radius-sm`입니다

---

## 10. Component — Survey (검사 화면)

### 10.1 레이아웃

```
┌──────────────────────────────────────┐
│  [Sticky Header]                     │   상단 고정
│  Part 1 / 4              10 / 40     │   caption, muted
│  ▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░     │   progress 4px
├──────────────────────────────────────┤
│                                       │
│  max-width: 40rem, 좌우 padding 20px  │
│                                       │
│  1. 문항 텍스트가 여기에 들어갑니다   │  body-lg
│     space-4                           │
│     ○────○────○────○────○            │  LikertScale
│     전혀                        매우  │  caption
│     그렇지 않다              그렇다   │
│                                       │
│     space-8 (32px)                    │
│                                       │
│  2. 다음 문항...                      │
│                                       │
├──────────────────────────────────────┤
│  [Sticky Footer]                     │   하단 고정, elev-2
│        [이전]      [다음 10문항]     │
└──────────────────────────────────────┘
```

- **본문 최대 폭 40rem(640px)** — 데스크톱에서도 넓히지 않습니다
- 좌우 패딩: 모바일 20px / 태블릿 이상 24px
- 문항 번호는 전체 기준 통 번호(1~40)로 표기합니다
- **v0.2**: 문항 하나가 카드 한 장입니다 (`rounded-3xl`, `surface/90` + blur, 흰 테두리, hover 리프트).
  카드 사이 간격은 `space-8`(32px)을 유지해 문항이 서로 붙어 보이지 않게 합니다
- 미응답 문항은 **카드 테두리를 `--status-warning`으로** 바꾸고, 카드 안에
  "⚠ 아직 답하지 않았어요" 캡션을 함께 보여 줍니다 (색만으로 전달하지 않기)

### 10.2 LikertScale 규격

```
   ○ ──── ○ ──── ○ ──── ○ ──── ○
   1      2      3      4      5
전혀 그렇지 않다        매우 그렇다
```

| 항목 | 값 |
|---|---|
| 원 지름(미선택) | 24px, 2px border `--color-border-strong`, 배경 `--color-surface` |
| 원 지름(선택) | 24px, 배경 `--color-primary`, 안쪽 흰 점 8px + 체크 형태 |
| 터치 영역 | **44×44px** (원 주변 패딩으로 확보) |
| 연결선 | 2px, `--color-surface-inset`, 원 사이를 잇는 배경 라인 |
| 라벨 위치 | 양 끝에만. `caption`, `--color-foreground-subtle` |
| 숫자 표시 | 시각적으로는 감추되 `aria-label`에 "1점 전혀 그렇지 않다" 형태로 제공 |
| 360px 대응 | 5개 × 44px = 220px + 간격 → 여유 있음. 라벨은 2줄 허용 |

**접근성 (필수)**

- 문항 하나 = `role="radiogroup"` + `aria-labelledby`(문항 텍스트 id)
- 각 선택지 = 진짜 `<input type="radio">` (시각적으로만 커스텀)
- 화살표 키로 이동, Space로 선택, Tab은 그룹 단위로 이동
- 선택 상태는 **색 + 채워짐 + 아이콘** 세 가지로 동시에 표현 (색만 금지)
- `focus-visible` 시 원 바깥에 2px 링

### 10.3 미응답 처리

- "다음"을 눌렀는데 미응답이 있으면 **첫 미응답 문항으로 스크롤 + 해당 radiogroup에 focus**
- 해당 문항 좌측에 4px `--status-warning` 세로선 + "아직 답하지 않았어요" 캡션(아이콘 포함)
- 상단에 인라인 안내(Toast 아님): "답하지 않은 문항이 n개 있어요."
- **Modal을 띄우지 않습니다**

### 10.4 Progress

- 트랙: 4px 높이, `--color-surface-inset`, `radius-full`
- 채움: `--color-primary`
- `role="progressbar"` + `aria-valuenow/min/max` + `aria-label="검사 진행률"`
- 숫자 텍스트(`10 / 40`)를 항상 함께 표기 (색·길이만으로 전달 금지)

---

## 11. Component — Result (결과 화면)

### 11.1 레이아웃 원칙

"결과표"가 아니라 **한 편의 글**입니다. 카드를 나열하지 않고, 제목과 본문이 여백으로 구분되는 editorial 흐름을 만듭니다.

```
┌──────────────────────────────────────┐
│                                       │
│  김선생 님의 교직 스타일              │  caption, muted
│                                       │
│  차분하게 리듬을 만드는               │  display, foreground
│  교실 운영자                          │
│                                       │
│  한 줄 설명이 여기에 들어갑니다.      │  body-lg, muted
│                                       │
│  ────────────────────────────         │  구분선
│                                       │
│  나의 교직 리듬                       │  h2
│  본문 …                               │  body
│                                       │
│  [4축 시각화 블록]                    │
│                                       │
│  교실에서 빛나는 순간                 │  h2
│  바쁠 때 나타날 수 있는 모습          │  h2
│  동료와 함께 일할 때                  │  h2
│  호흡이 자연스러운 스타일             │  h2
│  조율하면 더 편한 스타일              │  h2
│                                       │
│  [결과 이미지 저장] [다시 검사하기]   │
└──────────────────────────────────────┘
```

- 본문 최대 폭 **40rem**. 결과 히어로 영역만 48rem까지 허용
- 섹션 간격 `space-12`(48px)
- 섹션 제목 앞에 짧은 구분선(24px, `--color-accent`)을 두어 리듬을 만듭니다

### 11.2 축 시각화 (AxisBar)

```
차분한 준비형                        즉흥적 대응형
◀────────────────●──────────────────▶
                 │
              [뚜렷]                          ← 강도 배지
```

| 항목 | 규격 |
|---|---|
| 트랙 | 높이 8px, `--color-surface-inset`, `radius-full`, 폭 100% |
| 중앙 눈금 | 트랙 중앙에 1px `--color-border-strong` 세로선 (0점 위치 표시) |
| 마커 | 지름 16px, `--color-accent`, 2px 흰 테두리 |
| 마커 위치 | `((score + max) / (max * 2)) * 100%` — 연속 점수 그대로 반영 |
| 양 끝 라벨 | `body-sm` weight 600, 좌우 정렬. 강한 쪽만 `--color-foreground`, 반대쪽 `--color-foreground-subtle` |
| 강도 배지 | `caption`, `radius-xs`, `--color-primary-soft` 배경 |
| 균형(0점) | 마커가 정중앙 + 배지 "균형" + 양쪽 라벨 모두 `--color-foreground-muted` (한쪽을 강조하지 않음) |

**강도 배지 문구 (DEC-002b)**

| 절대 점수 | 배지 | 배경 |
|---|---|---|
| 0 ~ 4 | `균형` | `--color-surface-muted` |
| 5 ~ 12 | `뚜렷` | `--color-primary-soft` |
| 13 ~ 20 | `매우 뚜렷` | `--color-accent-soft` |

> 배지 텍스트는 콘텐츠 패키지에서 주입됩니다. 위는 기본 문구입니다.

### 11.3 결과 이미지 (Share Card)

- 화면의 결과 카드 DOM을 `html-to-image`로 PNG 변환
- 캡처 대상은 **전용 컨테이너 하나**로 한정합니다 (버튼·내비게이션 제외)
- 고정 크기: **1080 × 1350px** (인스타그램 세로 비율, 카톡에서도 잘 보임)
- 화면 표시용과 캡처용을 **같은 컴포넌트**로 만들고 CSS 변수로 크기만 바꿉니다
- 이미지에 서비스명 "서치티쳐마인드"와 도메인을 하단에 작게 표기
- **이미지에도 4글자 코드·기존 성격유형 검사 명칭을 넣지 않습니다**
- 생성 중에는 버튼을 `loading` 상태로 바꾸고 `aria-busy` 처리
- **폰트를 이미지 안에 함께 심어야 합니다.** 캡처된 그림은 브라우저 문서와 분리된 공간에서
  그려지기 때문에, 페이지에 폰트가 로드되어 있어도 그림에는 적용되지 않습니다.
  `getFontEmbedCSS()`로 만든 CSS를 넘기고, 결과를 캐시해 두 번째 저장부터 빨라지게 합니다
- 캡처 대상은 화면 밖에 두되 `display: none`은 쓰지 않습니다 (크기가 0이 되어 빈 이미지가 됩니다)

### 11.4 표현 금지

- "궁합이 좋은 사람 / 나쁜 사람" ✕
- "당신은 ~형입니다" 같은 단정 ✕ → "~하는 편이에요", "~할 때가 많아요"
- 등급·순위·점수 백분위 ✕
- 부정적 낙인 (예: "게으른", "우유부단한") ✕ → "천천히 확인하는", "여러 가능성을 열어 두는"

---

## 12. Landing

**v0.2 — 단일 패널 집중형.** 스크롤 없이 첫 화면에서 "이름 넣고 시작"까지 끝나는 구성입니다.

```
┌────────────────────────────────────────────┐
│  배경: --gradient-page (고정)               │
│                                             │
│        서치티쳐마인드                        │  헤더: 가운데 워드마크
│                                             │  36~48px, weight 800, 선 없음
│   ╭───────────────────────────────────╮     │
│   │  메인 패널                          │     │  radius-3xl(40px)
│   │  surface/80 + backdrop-blur         │     │  elev-3, 흰 테두리 4px
│   │  최대 폭 42rem, 패딩 32/48px         │     │
│   │                                     │     │
│   │   어떻게 불러 드릴까요? (선택)        │     │  닉네임 입력 (pill, 가운데)
│   │   [        예: 3반 김선생        ]   │     │
│   │   입력한 내용은 이 브라우저에만…      │     │
│   │  ─────────────────────────────      │     │  구분선
│   │   ╭─────────────────────────────╮   │     │
│   │   │  활성 검사 카드               │   │     │  radius-2xl(32px)
│   │   │  제목 / 요약                  │   │     │  elev-1 → hover elev-2
│   │   │  ( 문항 40 )( 묶음 4 )( 10분 )│   │     │  상태 칩: radius-full
│   │   │  [검사 안내 자세히 보기 ▾]     │   │     │
│   │   │  [ 검사 시작하기 ]            │   │     │  primary lg
│   │   ╰─────────────────────────────╯   │     │
│   ╰───────────────────────────────────╯     │
│                                             │
│  Footer — 개인정보 안내 + 저장 데이터 삭제    │
└────────────────────────────────────────────┘
```

**위계 규칙**

- 화면의 강조 요소는 **활성 검사 카드 하나**입니다. 다른 것은 그 주위를 비워 줍니다
- 중첩은 **메인 패널 > 검사 카드**까지 두 겹입니다. 검사 카드 안에 또 카드를 넣지 않습니다
  (안쪽 구획은 구분선과 여백으로 나눕니다)
- 모든 텍스트를 가운데 정렬합니다. 단 **Accordion 본문과 Footer 본문은 왼쪽 정렬**입니다
  (긴 문장을 가운데 정렬하면 읽기 힘듭니다)
- 페이지 최대 폭: 메인 패널 **42rem**. 그보다 넓히지 않습니다
- 좌우 패딩 20/24px, 360px에서 패널 좌우 여백이 최소 16px 남아야 합니다

**glassmorphism 사용 범위 (v0.2에서 허용)**

- `backdrop-blur`는 **랜딩 메인 패널 한 곳에만** 씁니다. 검사·결과 화면에는 쓰지 않습니다
- 배경 불투명도는 **80% 이상**을 유지합니다. 더 투명해지면 본문 대비 4.5:1이 깨집니다
- blur 위에 올라가는 텍스트는 `--color-foreground-body` 이상만 씁니다

**준비 중 검사 카드 · FAQ (현재 랜딩에서 빠져 있음)**

`UpcomingList` / `FaqAccordion` 컴포넌트는 그대로 남아 있지만 지금 랜딩에는 렌더하지 않습니다.
"첫 화면에서 바로 시작"을 우선한 결정입니다 (DEC-036).
다시 넣기로 하면 메인 패널 **아래쪽에 별도 섹션**으로 붙입니다 — 패널 안에 넣으면 3겹이 됩니다.

---

## 13. Responsive

### Breakpoint

| 이름 | 값 | 대상 |
|---|---|---|
| (기본) | 0~639px | **360px 필수 지원** |
| `sm` | 640px | 큰 폰 / 작은 태블릿 |
| `md` | 768px | 태블릿 |
| `lg` | 1024px | 노트북 |
| `xl` | 1280px | 데스크톱 |

### 폭 제한

| 영역 | 최대 폭 |
|---|---|
| Survey 본문 | **40rem (640px)** — 데스크톱에서도 넓히지 않음 |
| Result 본문 | 40rem (히어로만 48rem) |
| Landing 메인 패널 | **42rem (672px)** — v0.2. 단일 패널 구성이라 넓힐 이유가 없습니다 |
| Landing 전체 (섹션을 다시 붙일 경우) | 72rem (1152px) |

### 360px 체크리스트

- [ ] 가로 스크롤 없음
- [ ] LikertScale 5개가 한 줄에 들어가고 터치 영역 44px 유지
- [ ] 양 끝 라벨이 2줄로 줄바꿈되어도 레이아웃이 깨지지 않음
- [ ] Sticky footer 버튼 2개가 나란히 들어감 (각 최소 44px 높이)
- [ ] 긴 닉네임(12자)이 결과 제목을 밀어내지 않음
- [ ] 축 시각화 양 끝 라벨이 겹치지 않음 (필요하면 트랙 위/아래로 배치)

---

## 14. Motion

### 원칙

움직임은 **상태 변화를 이해시키기 위해서만** 씁니다. 장식용 애니메이션은 없습니다.

| 토큰 | 값 | 용도 |
|---|---|---|
| `duration-fast` | 120ms | 색 변화, hover |
| `duration-base` | 180ms | 선택 상태 전환, Accordion |
| `duration-slow` | 240ms | 페이지 진입 fade |
| `ease-out` | `cubic-bezier(0.2, 0, 0, 1)` | 기본 |
| `ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | 접힘/펼침 |

### 적용 범위

| 요소 | 움직임 |
|---|---|
| 검사 카드 hover | `translateY(-6px)` + `elev-1`→`elev-2`, `duration-slow` `ease-out-soft` (v0.2) |
| 라디오 선택 | 배경색 `duration-fast` + 안쪽 점 scale 0.8→1 |
| Progress bar | width `duration-base` |
| Accordion | height `duration-base` `ease-in-out` |
| Part 전환 | opacity 0→1 `duration-slow`. **좌우 슬라이드 없음** (멀미 유발) |
| 축 시각화 마커 | 결과 진입 시 중앙 → 실제 위치로 `duration-slow` 1회 |

### prefers-reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- 축 마커 애니메이션은 **최종 위치로 즉시 표시**
- 스크롤 이동(미응답 문항으로 이동)은 `behavior: "auto"`로 전환
- 카드 hover 리프트도 멈춥니다 (`transition-duration: 0.01ms`가 전역으로 적용되므로 자동)

---

## 15. Accessibility

| 항목 | 기준 |
|---|---|
| 키보드 | **검사 전 과정을 키보드만으로 완주 가능** |
| Radio Group | `role="radiogroup"`, 화살표 키 이동, Space 선택, Tab은 그룹 단위 |
| Focus | `focus-visible` 2px `--color-focus-ring` + 2px offset. **제거 금지** |
| 색 | 선택·오류·상태를 **색상만으로 표현 금지** (아이콘/텍스트/형태 병행) |
| 대비 | 본문 4.5:1, 큰 텍스트·UI 3:1 |
| 터치 | 최소 44×44px |
| 모션 | `prefers-reduced-motion` 존중 |
| 구조 | 페이지당 `h1` 1개, 제목 레벨 건너뛰기 금지 |
| 랜드마크 | `header` / `main` / `footer`, "본문 바로가기" skip link |
| 진행 상태 | `role="progressbar"` + 숫자 텍스트 병기 |
| 오류 | `aria-describedby`로 입력과 연결, `aria-invalid` 설정 |
| 동적 안내 | 미응답 안내는 `aria-live="polite"` |
| 언어 | `<html lang="ko">` |
| 확대 | 200% 확대 시에도 콘텐츠 손실 없음 |

---

## 16. Forbidden Pattern (절대 금지)

이 목록은 **리뷰 체크리스트**로 사용합니다. 하나라도 발견되면 수정합니다.
v0.2에서 몇 항목의 경계선을 조정했습니다 — 금지가 풀린 것이 아니라 **허용 범위를 명시**한 것입니다.

| # | 금지 | 대신 |
|---|---|---|
| 1 | AI 서비스 같은 **보라/파랑** gradient | 웜 뉴트럴 → 클레이 방향의 `--gradient-page`만 (2.6절) |
| 2 | sparkle(✨) 아이콘 남발 | 아이콘 없이 텍스트, 또는 의미 있는 아이콘 1개 |
| 3 | glassmorphism을 여러 곳에 | **랜딩 메인 패널 한 곳에만**, 불투명도 80% 이상 (12장) |
| 4 | floating blob / 배경 물방울 도형 | 여백과 배경 그라데이션 |
| 5 | 모든 요소를 pill(`radius-full`)로 | pill은 라디오·진행바·닉네임 입력·상태 칩에만 (5장) |
| 6 | 반경을 안쪽으로 갈수록 키우기 | 바깥 40px → 카드 32px → 버튼 18px → 배지 4px 순으로 **줄여** 나감 |
| 7 | 카드 **3겹 이상** 중첩 | 패널 > 카드 두 겹까지. 그 안은 구분선·여백으로 |
| 8 | 과도한 emoji | 사용하지 않음. 필요하면 아이콘 |
| 9 | 유아적인 학교 캐릭터 / 일러스트 | 타이포그래피와 여백 |
| 10 | 의미 없는 decoration (점선 테두리, 리본 등) | 제거 |
| 11 | 그림자로 위계 만들기 | 위계는 크기 → 여백 → 굵기 → 색. `elev-3`은 화면당 1개 |
| 12 | 색만으로 상태 전달 | 아이콘 + 텍스트 병행 |
| 13 | focus outline 제거 (`outline: none`만 남기기) | `focus-visible` 스타일 반드시 제공 |
| 14 | placeholder를 label 대용으로 | label 항상 표시 |
| 15 | 검사 상세를 Modal로 | Accordion |
| 16 | Survey 본문을 데스크톱에서 전폭으로 | 40rem 제한 |
| 17 | 좌우 슬라이드 페이지 전환 | opacity fade. 카드 hover는 세로 리프트만 |
| 18 | 4글자 코드·기존 성격유형 검사 명칭 노출 | 자체 결과 제목만 |
| 19 | "궁합", 등급, 순위 표현 | "호흡이 자연스러운 / 조율하면 더 편한" |
| 20 | 토큰에 없는 색·간격·반경 임의 사용 | 먼저 이 문서에 토큰 추가 (`rounded-[2rem]` 같은 임의값 금지) |
| 21 | 시각 언어를 화면마다 다르게 쓰기 | **전 화면이 같은 언어**를 씁니다 (아래 참고) |

> **v0.2의 시각 언어는 전 화면 공통입니다.**
> 옅은 웜 그라데이션 배경 위에 `surface/80~90` + `backdrop-blur` + `rounded-3xl` + 흰 테두리 면을 올리고,
> hover에서 살짝 떠오르게 합니다. 랜딩·검사 소개·문항 카드가 모두 같은 규칙을 따릅니다.
>
> **다만 읽기를 방해하지 않도록 지키는 선이 있습니다.**
> - 본문 최대 폭 **40rem**은 어떤 화면에서도 넓히지 않습니다
> - 배경 불투명도 **80% 이상** — 그 아래로 내려가면 본문 대비 4.5:1이 깨집니다
> - 문항 텍스트는 `body-lg`, 행간 1.7을 유지합니다. 장식이 글자 크기를 줄이지 않습니다
> - 터치 타깃 44px, `focus-visible` 링, 미응답 표시(테두리 + 아이콘 + 문장)는 그대로입니다

---

## 17. 컴포넌트 구현 시 체크리스트

새 UI를 만들 때 아래를 확인합니다.

- [ ] 색·간격·반경·폰트를 **토큰으로만** 사용했는가
- [ ] 360px에서 깨지지 않는가
- [ ] 키보드만으로 조작 가능한가
- [ ] `focus-visible` 스타일이 있는가
- [ ] 상태를 색 외에도 전달하는가
- [ ] `prefers-reduced-motion`을 존중하는가
- [ ] Forbidden Pattern 20개 중 해당되는 것이 없는가
- [ ] Server Component로 둘 수 있는데 불필요하게 `"use client"`를 붙이지 않았는가
