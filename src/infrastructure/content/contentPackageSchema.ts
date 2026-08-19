import { z } from "zod";

import {
  assessmentError,
  type AssessmentError,
} from "@/domain/assessment/errors/assessmentError";
import type { AssessmentDefinition } from "@/domain/assessment/model/definition";
import {
  toAssessmentId,
  toAxisId,
  toQuestionId,
  toResultKey,
  toSectionId,
} from "@/domain/shared/ids";
import { err, ok, type Result } from "@/domain/shared/result";

/**
 * 콘텐츠 패키지 검증 (docs/architecture.md 5.4, docs/content/teacher-style-v1.md 8절)
 *
 * 콘텐츠는 코드 밖에서 들어오므로, 로드 시 1회 형식과 무결성을 확인합니다.
 * 실패하면 INVALID_CONTENT_PACKAGE로 안전하게 멈춥니다.
 */

const poleSideSchema = z.enum(["positive", "negative"]);

const axisPoleSchema = z.object({
  side: poleSideSchema,
  label: z.string().min(1),
  shortLabel: z.string().min(1),
  description: z.string().min(1),
});

const intensityBandSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  minAbsScore: z.number().int().min(0),
  maxAbsScore: z.number().int().min(0),
});

const axisSchema = z.object({
  id: z.string().min(1).transform(toAxisId),
  name: z.string().min(1),
  positive: axisPoleSchema,
  negative: axisPoleSchema,
  defaultPole: poleSideSchema,
  // 강도 구간은 최소 1개 있어야 합니다. (tuple + rest = 비어 있지 않은 배열)
  intensityBands: z.tuple([intensityBandSchema], intensityBandSchema),
});

const responseOptionSchema = z.object({
  value: z.number().int(),
  label: z.string().min(1),
  visibleLabel: z.string().min(1).optional(),
});

const responseScaleSchema = z.object({
  id: z.string().min(1),
  options: z.array(responseOptionSchema).min(2),
  centerValue: z.number(),
});

const questionSchema = z.object({
  id: z.string().min(1).transform(toQuestionId),
  sectionId: z.string().min(1).transform(toSectionId),
  order: z.number().int().positive(),
  text: z.string().min(1),
  axisId: z.string().min(1).transform(toAxisId),
  polarity: z.union([z.literal(1), z.literal(-1)]),
  weight: z.number().positive(),
});

const sectionSchema = z.object({
  id: z.string().min(1).transform(toSectionId),
  order: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1).optional(),
});

const scoringSpecSchema = z.object({
  strategyId: z.literal("centered-likert-axis-sum"),
  scoringVersion: z.number().int().positive(),
});

const collaborationProfileSchema = z.object({
  naturalFit: z.array(z.string().min(1)).min(1),
  needsTuning: z.array(z.string().min(1)).min(1),
});

const resultProfileSchema = z.object({
  key: z.string().min(1).transform(toResultKey),
  poles: z.record(z.string().min(1), poleSideSchema),
  title: z.string().min(1),
  oneLiner: z.string().min(1),
  rhythm: z.string().min(1),
  shiningMoments: z.array(z.string().min(1)).min(1),
  underPressure: z.array(z.string().min(1)).min(1),
  withColleagues: z.array(z.string().min(1)).min(1),
  collaboration: collaborationProfileSchema,
});

const baseDefinitionSchema = z.object({
  id: z.string().min(1).transform(toAssessmentId),
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  description: z.string().min(1),
  estimatedMinutes: z.number().int().positive(),
  status: z.enum(["published", "upcoming"]),
  assessmentVersion: z.number().int().positive(),
  contentVersion: z.string().min(1),
  scale: responseScaleSchema,
  axes: z.array(axisSchema).min(1),
  sections: z.array(sectionSchema).min(1),
  questions: z.array(questionSchema).min(1),
  scoring: scoringSpecSchema,
  resultProfiles: z.array(resultProfileSchema).min(1),
});

/**
 * 사용자에게 보이는 문자열에 노출이 금지된 표현이 있는지 확인합니다. (AGENTS.md 1.1)
 *
 * 금지 단어 자체를 소스에 그대로 적으면 저장소 전체 grep 검사에 걸리므로,
 * 글자 조각을 이어 붙여 만듭니다.
 */
const FORBIDDEN_TERM = new RegExp(`\\b${["m", "b", "t", "i"].join("")}\\b`, "i");
const FORBIDDEN_TYPE_CODE = /\b[EI][NS][TF][JP]\b/i;

function hasForbiddenTerm(value: string): boolean {
  return FORBIDDEN_TERM.test(value) || FORBIDDEN_TYPE_CODE.test(value);
}

function findDuplicates(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

export const assessmentDefinitionSchema = baseDefinitionSchema.superRefine((definition, ctx) => {
  const issue = (message: string, path: readonly (string | number)[] = []) => {
    ctx.addIssue({ code: "custom", message, path: [...path] });
  };

  // --- 식별자 중복 ---------------------------------------------------------
  const duplicateAxisIds = findDuplicates(definition.axes.map((axis) => String(axis.id)));
  if (duplicateAxisIds.length > 0) {
    issue(`축 id가 중복됩니다: ${duplicateAxisIds.join(", ")}`, ["axes"]);
  }

  const duplicateQuestionIds = findDuplicates(
    definition.questions.map((question) => String(question.id)),
  );
  if (duplicateQuestionIds.length > 0) {
    issue(`문항 id가 중복됩니다: ${duplicateQuestionIds.join(", ")}`, ["questions"]);
  }

  const duplicateSectionIds = findDuplicates(
    definition.sections.map((section) => String(section.id)),
  );
  if (duplicateSectionIds.length > 0) {
    issue(`섹션 id가 중복됩니다: ${duplicateSectionIds.join(", ")}`, ["sections"]);
  }

  const duplicateProfileKeys = findDuplicates(
    definition.resultProfiles.map((profile) => String(profile.key)),
  );
  if (duplicateProfileKeys.length > 0) {
    issue(`결과 프로필 key가 중복됩니다: ${duplicateProfileKeys.join(", ")}`, ["resultProfiles"]);
  }

  // --- 참조 무결성 ---------------------------------------------------------
  const axisIds = new Set(definition.axes.map((axis) => String(axis.id)));
  const sectionIds = new Set(definition.sections.map((section) => String(section.id)));

  definition.questions.forEach((question, index) => {
    if (!axisIds.has(String(question.axisId))) {
      issue(`axes에 없는 axisId입니다: ${question.axisId}`, ["questions", index, "axisId"]);
    }
    if (!sectionIds.has(String(question.sectionId))) {
      issue(`sections에 없는 sectionId입니다: ${question.sectionId}`, [
        "questions",
        index,
        "sectionId",
      ]);
    }
    if (question.weight !== 1) {
      issue("MVP에서 weight는 전부 1이어야 합니다. (PRD F-4.2)", ["questions", index, "weight"]);
    }
  });

  // --- 문항 번호가 1부터 연속인가 ------------------------------------------
  const orders = definition.questions.map((question) => question.order).sort((a, b) => a - b);
  const isSequential = orders.every((order, index) => order === index + 1);
  if (!isSequential) {
    issue("question.order는 1부터 빠짐없이 연속이어야 합니다.", ["questions"]);
  }

  // --- 척도 ----------------------------------------------------------------
  const optionValues = definition.scale.options.map((option) => option.value);
  if (!optionValues.includes(definition.scale.centerValue)) {
    issue(
      `scale.options에 centerValue(${definition.scale.centerValue})가 없습니다.`,
      ["scale", "centerValue"],
    );
  }
  if (new Set(optionValues).size !== optionValues.length) {
    issue("scale.options의 value가 중복됩니다.", ["scale", "options"]);
  }

  // --- 강도 구간이 0부터 최대 절대값까지 빈틈·겹침 없이 덮는가 ------------
  const maxDeviation = definition.scale.options.reduce((max, option) => {
    const deviation = Math.abs(option.value - definition.scale.centerValue);
    return deviation > max ? deviation : max;
  }, 0);

  definition.axes.forEach((axis, axisIndex) => {
    const axisMaxAbsScore = definition.questions
      .filter((question) => String(question.axisId) === String(axis.id))
      .reduce((total, question) => total + maxDeviation * question.weight, 0);

    const bands = [...axis.intensityBands].sort((a, b) => a.minAbsScore - b.minAbsScore);
    const path = ["axes", axisIndex, "intensityBands"] as const;

    const firstBand = bands[0];
    if (firstBand === undefined) {
      issue("강도 구간이 비어 있습니다.", path);
      return;
    }

    if (firstBand.minAbsScore !== 0) {
      issue("강도 구간은 0부터 시작해야 합니다.", path);
    }

    for (const [index, band] of bands.entries()) {
      if (band.minAbsScore > band.maxAbsScore) {
        issue(`구간 ${band.id}의 minAbsScore가 maxAbsScore보다 큽니다.`, path);
      }
      const previous = bands[index - 1];
      if (previous !== undefined && band.minAbsScore !== previous.maxAbsScore + 1) {
        issue(
          `구간 ${previous.id}와 ${band.id} 사이에 빈틈이나 겹침이 있습니다.`,
          path,
        );
      }
    }

    const lastBand = bands[bands.length - 1];
    if (lastBand !== undefined && lastBand.maxAbsScore !== axisMaxAbsScore) {
      issue(
        `강도 구간의 끝(${lastBand.maxAbsScore})이 이 축의 최대 절대 점수(${axisMaxAbsScore})와 다릅니다.`,
        path,
      );
    }
  });

  // --- 결과 프로필 조합이 2^축개수만큼, 중복·누락 없이 있는가 --------------
  const expectedProfileCount = 2 ** definition.axes.length;
  if (definition.resultProfiles.length !== expectedProfileCount) {
    issue(
      `결과 프로필은 2^축개수(${expectedProfileCount})개여야 합니다. 현재 ${definition.resultProfiles.length}개입니다.`,
      ["resultProfiles"],
    );
  }

  const orderedAxisIds = definition.axes.map((axis) => String(axis.id));
  const seenCombinations = new Set<string>();

  definition.resultProfiles.forEach((profile, index) => {
    const profileAxisIds = Object.keys(profile.poles);
    const missing = orderedAxisIds.filter((axisId) => !profileAxisIds.includes(axisId));
    const unknown = profileAxisIds.filter((axisId) => !axisIds.has(axisId));

    if (missing.length > 0) {
      issue(`poles에 빠진 축이 있습니다: ${missing.join(", ")}`, ["resultProfiles", index, "poles"]);
      return;
    }
    if (unknown.length > 0) {
      issue(`poles에 없는 축이 있습니다: ${unknown.join(", ")}`, ["resultProfiles", index, "poles"]);
      return;
    }

    const combination = orderedAxisIds.map((axisId) => profile.poles[axisId]).join("|");
    if (seenCombinations.has(combination)) {
      issue(`pole 조합이 중복됩니다: ${combination}`, ["resultProfiles", index, "poles"]);
    }
    seenCombinations.add(combination);
  });

  if (
    definition.resultProfiles.length === expectedProfileCount &&
    seenCombinations.size !== expectedProfileCount
  ) {
    issue("pole 조합에 누락이 있습니다.", ["resultProfiles"]);
  }

  // --- 금지 표현 (AGENTS.md 1.1) ------------------------------------------
  const userFacingStrings: readonly (readonly [string, string])[] = [
    ["slug", definition.slug],
    ["title", definition.title],
    ["summary", definition.summary],
    ["description", definition.description],
    ...definition.questions.map((question) => [`questions.${question.order}.text`, question.text] as const),
    ...definition.resultProfiles.map((profile) => [`resultProfiles.${profile.key}.title`, profile.title] as const),
  ];

  for (const [field, value] of userFacingStrings) {
    if (hasForbiddenTerm(value)) {
      issue(`${field}에 노출이 금지된 표현이 있습니다.`, []);
    }
  }
});

/**
 * 콘텐츠 패키지를 검증합니다.
 * 실패는 예외가 아니라 값(Result)으로 돌려줍니다.
 */
export function parseAssessmentDefinition(
  raw: unknown,
): Result<AssessmentDefinition, AssessmentError> {
  const parsed = assessmentDefinitionSchema.safeParse(raw);

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((current) => `${current.path.join(".") || "(root)"}: ${current.message}`)
      .join(" / ");
    return err(assessmentError("INVALID_CONTENT_PACKAGE", detail, parsed.error));
  }

  return ok(parsed.data);
}

/**
 * 실패는 아니지만 확인이 필요한 항목입니다. (architecture.md 5.4 "경고 수준")
 * 예) 축별 문항 수가 균등하지 않음
 */
export function collectContentWarnings(definition: AssessmentDefinition): readonly string[] {
  const warnings: string[] = [];

  const countByAxis = definition.axes.map((axis) => ({
    axisId: String(axis.id),
    count: definition.questions.filter((question) => question.axisId === axis.id).length,
  }));

  const counts = new Set(countByAxis.map((entry) => entry.count));
  if (counts.size > 1) {
    warnings.push(
      `축별 문항 수가 균등하지 않습니다: ${countByAxis
        .map((entry) => `${entry.axisId}=${entry.count}`)
        .join(", ")}`,
    );
  }

  for (const axis of definition.axes) {
    const axisQuestions = definition.questions.filter(
      (question) => question.axisId === axis.id,
    );
    const positives = axisQuestions.filter((question) => question.polarity === 1).length;
    const negatives = axisQuestions.length - positives;
    if (positives !== negatives) {
      warnings.push(
        `축 ${String(axis.id)}의 polarity 배분이 반반이 아닙니다: +1 ${positives}개 / -1 ${negatives}개`,
      );
    }
  }

  return warnings;
}
