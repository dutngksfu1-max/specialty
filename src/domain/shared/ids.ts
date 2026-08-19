/**
 * Branded id 타입. (docs/architecture.md 4.1)
 *
 * 전부 string이지만 서로 다른 타입으로 취급되므로,
 * QuestionId 자리에 SessionId를 넣는 실수를 컴파일 단계에서 막습니다.
 */
type Brand<T, B extends string> = T & { readonly __brand: B };

export type AssessmentId = Brand<string, "AssessmentId">;
export type SessionId = Brand<string, "SessionId">;
export type QuestionId = Brand<string, "QuestionId">;
export type AxisId = Brand<string, "AxisId">;
export type SectionId = Brand<string, "SectionId">;
export type ResultKey = Brand<string, "ResultKey">;

/** 콘텐츠 패키지나 저장소에서 읽은 문자열을 id 타입으로 표시할 때 사용합니다. */
export const toAssessmentId = (value: string): AssessmentId => value as AssessmentId;
export const toSessionId = (value: string): SessionId => value as SessionId;
export const toQuestionId = (value: string): QuestionId => value as QuestionId;
export const toAxisId = (value: string): AxisId => value as AxisId;
export const toSectionId = (value: string): SectionId => value as SectionId;
export const toResultKey = (value: string): ResultKey => value as ResultKey;
