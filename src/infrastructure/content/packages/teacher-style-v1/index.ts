import { teacherStyleV1Base } from "./definition";
import { questions } from "./questions";
import { resultProfiles } from "./profiles";
import { teacherStylePresentation } from "./presentation";

/**
 * 콘텐츠 패키지 = 폴더 하나. (docs/architecture.md 10장)
 *
 * 검증은 StaticAssessmentCatalog가 로드 시 1회 수행합니다.
 * 여기서는 조립만 하고, 형식이 틀리면 INVALID_CONTENT_PACKAGE로 안전하게 실패합니다.
 */
export const teacherStyleV1Package = {
  ...teacherStyleV1Base,
  questions,
  resultProfiles,
  presentation: teacherStylePresentation,
};
