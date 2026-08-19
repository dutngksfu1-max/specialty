import type {
  AssessmentError,
  AssessmentErrorCode,
} from "@/domain/assessment/errors/assessmentError";

export interface ErrorMessage {
  readonly title: string;
  readonly body: string;
  readonly action?: string;
}

/**
 * 오류 코드 → 사용자 문구 (docs/architecture.md 8.2)
 *
 * UI는 **이 표만** 씁니다. `error.detail`이나 스택 트레이스를 화면에 절대 노출하지 않습니다.
 * 교사 사용자가 이해할 수 없는 기술 문자열이기 때문입니다.
 */
export const ERROR_MESSAGES: Record<AssessmentErrorCode, ErrorMessage> = {
  ASSESSMENT_NOT_FOUND: {
    title: "검사를 찾을 수 없어요",
    body: "주소가 바뀌었을 수 있어요.",
    action: "처음으로",
  },
  VERSION_MISMATCH: {
    title: "검사가 업데이트되었어요",
    body: "정확한 결과를 위해 처음부터 다시 진행해 주세요.",
    action: "새로 시작",
  },
  SESSION_NOT_FOUND: {
    title: "진행 중인 검사가 없어요",
    body: "검사를 시작해 주세요.",
    action: "검사 시작",
  },
  INCOMPLETE_RESPONSES: {
    title: "아직 답하지 않은 문항이 있어요",
    body: "남은 문항에 답하면 결과를 볼 수 있어요.",
  },
  INVALID_RESPONSE: {
    title: "응답을 저장하지 못했어요",
    body: "다시 선택해 주세요.",
  },
  DRAFT_CORRUPTED: {
    title: "저장된 응답을 불러오지 못했어요",
    body: "새로 시작하면 정상적으로 진행돼요.",
    action: "새로 시작",
  },
  PERSISTENCE_FAILED: {
    title: "저장에 실패했어요",
    body: "브라우저 저장 공간을 확인해 주세요.",
  },
  RESULT_PROFILE_NOT_FOUND: {
    title: "결과를 만들지 못했어요",
    body: "잠시 후 다시 시도해 주세요.",
    action: "새로 시작",
  },
  NETWORK_UNAVAILABLE: {
    title: "인터넷 연결이 끊겼어요",
    body: "이미 시작한 검사는 계속 진행할 수 있어요.",
  },
  INVALID_CONTENT_PACKAGE: {
    title: "검사를 불러오지 못했어요",
    body: "잠시 후 다시 시도해 주세요.",
  },
};

export function messageFor(error: AssessmentError): ErrorMessage {
  if (process.env.NODE_ENV === "development" && error.detail !== undefined) {
    console.error(`[${error.code}] ${error.detail}`);
  }
  return ERROR_MESSAGES[error.code];
}
