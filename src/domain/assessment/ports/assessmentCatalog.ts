import type { AssessmentError } from "@/domain/assessment/errors/assessmentError";
import type { AssessmentDefinition } from "@/domain/assessment/model/definition";
import type { AssessmentId } from "@/domain/shared/ids";
import type { Result } from "@/domain/shared/result";

/**
 * 콘텐츠 목록 계약 (docs/architecture.md 6.1)
 *
 * 콘텐츠는 번들에 포함되므로 I/O가 없습니다. 따라서 전부 동기입니다.
 */
export interface AssessmentCatalog {
  listAll(): readonly AssessmentDefinition[];
  listPublished(): readonly AssessmentDefinition[];
  listUpcoming(): readonly AssessmentDefinition[];
  findBySlug(slug: string): Result<AssessmentDefinition, AssessmentError>;
  findById(id: AssessmentId): Result<AssessmentDefinition, AssessmentError>;
}
