import {
  assessmentError,
  type AssessmentError,
} from "@/domain/assessment/errors/assessmentError";
import type { AssessmentDefinition } from "@/domain/assessment/model/definition";
import type { AssessmentCatalog } from "@/domain/assessment/ports/assessmentCatalog";
import type { AssessmentId } from "@/domain/shared/ids";
import { err, ok, type Result } from "@/domain/shared/result";
import {
  collectContentWarnings,
  parseAssessmentDefinition,
} from "@/infrastructure/content/contentPackageSchema";
import { teacherStyleV1Package } from "@/infrastructure/content/packages/teacher-style-v1";

/**
 * 번들에 포함된 콘텐츠 패키지 목록.
 *
 * **새 검사를 추가할 때 고치는 파일은 이 파일 하나입니다.**
 * 아래 배열에 패키지를 한 줄 추가하면 끝입니다.
 * (domain / application / features / app 은 0줄 — docs/architecture.md 10장)
 */
export const CONTENT_PACKAGES: readonly unknown[] = [teacherStyleV1Package];

export class StaticAssessmentCatalog implements AssessmentCatalog {
  private readonly definitions: readonly AssessmentDefinition[];

  /** 검증에 실패한 패키지의 오류입니다. UI는 이것을 보고 안내 문구를 띄웁니다. */
  readonly contentErrors: readonly AssessmentError[];

  /** 실패는 아니지만 확인이 필요한 항목입니다 (축별 문항 수 불균등 등). */
  readonly contentWarnings: readonly string[];

  constructor(rawPackages: readonly unknown[] = CONTENT_PACKAGES) {
    const definitions: AssessmentDefinition[] = [];
    const errors: AssessmentError[] = [];
    const warnings: string[] = [];

    for (const rawPackage of rawPackages) {
      const parsed = parseAssessmentDefinition(rawPackage);
      if (!parsed.ok) {
        errors.push(parsed.error);
        continue;
      }
      definitions.push(parsed.value);
      warnings.push(...collectContentWarnings(parsed.value));
    }

    this.definitions = definitions;
    this.contentErrors = errors;
    this.contentWarnings = warnings;
  }

  listAll(): readonly AssessmentDefinition[] {
    return this.definitions;
  }

  listPublished(): readonly AssessmentDefinition[] {
    return this.definitions.filter((definition) => definition.status === "published");
  }

  listUpcoming(): readonly AssessmentDefinition[] {
    return this.definitions.filter((definition) => definition.status === "upcoming");
  }

  findBySlug(slug: string): Result<AssessmentDefinition, AssessmentError> {
    const found = this.definitions.find((definition) => definition.slug === slug);
    return found === undefined
      ? err(assessmentError("ASSESSMENT_NOT_FOUND", `slug: ${slug}`))
      : ok(found);
  }

  findById(id: AssessmentId): Result<AssessmentDefinition, AssessmentError> {
    const found = this.definitions.find((definition) => definition.id === id);
    return found === undefined
      ? err(assessmentError("ASSESSMENT_NOT_FOUND", `id: ${String(id)}`))
      : ok(found);
  }
}

/** 앱 전체가 공유하는 카탈로그 인스턴스 (콘텐츠는 불변이므로 하나면 충분합니다). */
export const staticAssessmentCatalog = new StaticAssessmentCatalog();
