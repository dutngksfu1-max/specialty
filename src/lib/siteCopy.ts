/**
 * 사이트 문구 초안 — **검수가 필요합니다.**
 *
 * DEC-025 / DEC-026 / DEC-027 / DEC-028 / DEC-029가 아직 `WAITING`이라,
 * 각 DEC의 추천안(A)을 초안으로 옮겨 둔 것입니다.
 * 문구를 고치려면 **이 파일만** 고치면 됩니다. 화면 코드는 건드리지 않아도 됩니다.
 *
 * 검사 문항·결과 텍스트는 여기 있지 않습니다.
 * 그것은 콘텐츠 패키지(src/infrastructure/content/packages/)에 있습니다.
 */

/** 서비스 이름 (DEC-003 확정) */
export const BRAND_NAME = "서치티쳐마인드";

/**
 * 배포 주소 (DEC-022 확정 — 2026-08-20)
 *
 * metadataBase·canonical·sitemap이 이 값을 씁니다.
 * 절대 URL이 없으면 OG 이미지가 상대 경로로 나가서 카카오톡·슬랙 미리보기가 깨집니다.
 *
 * Vercel이 넣어 주는 환경변수를 먼저 보고, 없으면 확정 도메인을 씁니다.
 * (프리뷰 배포에서도 그 배포의 주소가 잡히게 하려는 것입니다.)
 * 주소에도 금지 표현이 들어가면 안 됩니다 (AGENTS.md 1.1).
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_ENV === "production"
    ? "https://specialty-nu.vercel.app"
    : process.env.VERCEL_URL !== undefined
      ? `https://${process.env.VERCEL_URL}`
      : "https://specialty-nu.vercel.app");

/** DEC-027 초안 — Hero */
export const HERO = {
  title: "나를 닮은 교직 스타일을 찾아보세요",
  subtitle: "40문항 · 약 10분 · 가입 없이 브라우저에서 바로 참여할 수 있어요.",
} as const;

/**
 * DEC-028 초안 — 검사 성격 안내(면책)
 * 검사 소개 화면과 결과 하단에 짧게 노출합니다.
 */
export const DISCLAIMER =
  "이 검사는 표준화된 심리검사가 아니라, 자기 이해와 동료 간 대화를 돕기 위한 탐색 도구예요.";

/**
 * DEC-029 초안 — 개인정보 안내
 * 닉네임 입력 옆, 검사 소개, Footer 세 곳에 노출합니다.
 */
export const PRIVACY_NOTE = {
  short: "입력한 내용은 이 브라우저에만 저장돼요. 서버로 보내지 않습니다.",
  long: "닉네임과 응답, 결과는 모두 이 브라우저 안에만 저장됩니다. 서버로 전송되지 않고, 계정도 만들지 않아요.",
} as const;

/** DEC-026 초안 — 랜딩에 "준비 중"으로 보여 줄 검사들 */
export const UPCOMING_ASSESSMENTS = [
  { title: "협업 스타일", summary: "동료와 함께 일할 때의 방식을 살펴봅니다." },
  { title: "수업 운영 리듬", summary: "수업을 준비하고 이끄는 흐름을 살펴봅니다." },
  { title: "교직 가치관", summary: "교사로서 중요하게 여기는 기준을 살펴봅니다." },
] as const;

/** DEC-027 초안 — FAQ */
export const FAQ = [
  {
    question: "얼마나 걸리나요?",
    answer: "40문항이고 보통 10분 안팎이 걸려요. 4개 묶음으로 나뉘어 있어 중간에 쉬어 가도 됩니다.",
  },
  {
    question: "제 응답이 서버에 저장되나요?",
    answer:
      "아니요. 닉네임과 응답, 결과는 모두 이 브라우저 안에만 저장됩니다. 회원가입도 로그인도 없어요.",
  },
  {
    question: "중간에 나갔다가 다시 들어와도 되나요?",
    answer:
      "네. 답을 고르는 즉시 저장되기 때문에, 새로고침하거나 잠시 나갔다 와도 이어서 진행할 수 있어요.",
  },
  {
    question: "다시 검사할 수 있나요?",
    answer:
      "네. 다만 가장 최근 결과 하나만 남습니다. 다시 검사하면 이전 응답과 결과는 덮어써집니다.",
  },
  {
    question: "결과가 정확한가요?",
    answer: `${DISCLAIMER} 결과는 '나는 이런 편이구나' 하고 이야기 나누는 재료로 봐 주세요.`,
  },
  {
    question: "인터넷이 끊기면 어떻게 되나요?",
    answer:
      "이미 열어 둔 검사는 계속 진행할 수 있고, 응답도 그대로 저장됩니다. 강의실 와이파이가 불안정해도 괜찮아요.",
  },
] as const;
