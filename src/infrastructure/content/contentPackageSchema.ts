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
import {
  PRESENTATION_COLOR_TOKENS,
  type AssessmentPresentation,
} from "@/lib/assessmentPresentation";

/**
 * 콘텐츠 패키지 검증 (docs/architecture.md 5.4, docs/content/teacher-style-v1.md 8절)
 *
 * 콘텐츠는 코드 밖에서 들어오므로, 로드 시 1회 형식과 무결성을 확인합니다.
 * 실패하면 INVALID_CONTENT_PACKAGE로 안전하게 멈춥니다.
 */

const poleSideSchema = z.enum(["positive", "negative"]);

/**
 * 유형 코드 글자는 **한 글자여야** 합니다 (DEC-049).
 * 두 글자가 들어오면 자리 수와 글자 수가 어긋나 코드가 조용히 망가집니다.
 */
const codeLetterSchema = z.string().regex(/^[A-Z]$/, "코드 글자는 영문 대문자 한 글자여야 합니다");

const axisPoleSchema = z.object({
  side: poleSideSchema,
  label: z.string().min(1),
  shortLabel: z.string().min(1),
  description: z.string().min(1),
  code: codeLetterSchema.optional(),
  crosswalkCode: codeLetterSchema.optional(),
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
  context: z.string().min(1),
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
  /**
   * 동점(축 점수 0) 보정 규칙을 적용 순서대로 (DEC-063).
   * 선언하지 않으면 보정하지 않고 예전처럼 `defaultPole`로 떨어집니다.
   */
  tieBreak: z.array(z.enum(["context-mean", "extreme-responses"])).optional(),
});

const collaborationProfileSchema = z.object({
  naturalFit: z.array(z.string().min(1)).min(1),
  needsTuning: z.array(z.string().min(1)).min(1),
});

/** 장면이 붙은 서술 한 줄 (contentVersion 3.0.0) */
const sceneNoteSchema = z.object({
  scene: z.string().min(1),
  /** 짧은 상황 제목. 길어지면 제목 구실을 못 합니다 (DEC-054) */
  situation: z.string().min(2).max(16),
  text: z.string().min(1),
});

const resultGuidanceSchema = z.object({
  shiningMoments: z.array(sceneNoteSchema).min(1),
  underPressure: z.array(sceneNoteSchema).min(1),
  withColleagues: z.array(sceneNoteSchema).min(1),
  collaboration: collaborationProfileSchema,
  nextSteps: z.array(z.string().min(1)).min(1),
  talkingPoints: z.array(z.string().min(1)).min(1),
});

const resultProfileSchema = z.object({
  key: z.string().min(1).transform(toResultKey),
  poles: z.record(z.string().min(1), poleSideSchema),
  title: z.string().min(1),
  oneLiner: z.string().min(1),
  rhythm: z.string().min(1),
  ...resultGuidanceSchema.shape,
});

/** 축 조합 해석 (contentVersion 3.0.0) */
const axisCombinationReadingSchema = z.object({
  poles: z.record(z.string().min(1), poleSideSchema),
  text: z.string().min(1),
});

const axisCombinationSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  axisIds: z.array(z.string().min(1).transform(toAxisId)).min(2),
  readings: z.array(axisCombinationReadingSchema).min(2),
});

const axisNarrativeReadingSchema = z.object({
  direction: poleSideSchema,
  headline: z.string().min(1),
  summary: z.string().min(1),
  scene: z.string().min(1),
});

const axisResultNarrativeSchema = z.object({
  axisId: z.string().min(1).transform(toAxisId),
  readings: z.array(axisNarrativeReadingSchema).min(1),
  counterEvidence: z.string().min(1),
});

const resultNarrativeSchema = z.object({
  scopeNote: z.string().min(1),
  emphasisTerms: z.array(z.string().min(2)).default([]),
  axes: z.array(axisResultNarrativeSchema).min(1),
});

/**
 * 유형 코드 표기 규격 (DEC-049)
 *
 * `systemLabel`은 다른 검사 이름을 담는 **유일하게 허용된 자리**입니다.
 * 그래서 아래 `userFacingStrings` 금지 표현 검사 대상에 넣지 않습니다.
 * 나머지 모든 사용자 노출 문자열은 그대로 검사합니다.
 */
const typeCodeSchema = z.object({
  label: z.string().min(1),
  crosswalk: z
    .object({
      systemLabel: z.string().min(1),
      selfReportedLabel: z.string().min(1),
      selfReportedInputLabel: z.string().min(1),
      disclaimer: z.string().min(1),
      unavailableNote: z.string().min(1),
    })
    .optional(),
});

const baseDefinitionSchema = z.object({
  id: z.string().min(1).transform(toAssessmentId),
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  description: z.string().min(1),
  estimatedMinutes: z.number().int().positive(),
  estimatedTimeLabel: z.string().min(1).optional(),
  status: z.enum(["published", "upcoming"]),
  assessmentVersion: z.number().int().positive(),
  contentVersion: z.string().min(1),
  scale: responseScaleSchema,
  axes: z.array(axisSchema).min(1),
  resultNarrative: resultNarrativeSchema.optional(),
  typeCode: typeCodeSchema.optional(),
  axisCombinations: z.array(axisCombinationSchema).default([]),
  sections: z.array(sectionSchema).min(1),
  questions: z.array(questionSchema).min(1),
  scoring: scoringSpecSchema,
  resultProfiles: z.array(resultProfileSchema).min(1),
});

const localArtworkSchema = z.object({
  src: z
    .string()
    .startsWith("/assessments/")
    .refine((src) => !src.includes("..") && !src.includes("://"), "로컬 검사 에셋 경로만 허용합니다."),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.literal(""),
});

const characterArtworkSetSchema = z.object({
  male: localArtworkSchema,
  female: localArtworkSchema,
});

const responseScaleGuideItemSchema = z.object({
  value: z.number().int(),
  criterion: z.string().min(1),
});

const presentationSchema = z.object({
  version: z.literal(1),
  palette: z.object({
    canvas: z.enum(PRESENTATION_COLOR_TOKENS),
    surface: z.enum(PRESENTATION_COLOR_TOKENS),
    primary: z.enum(PRESENTATION_COLOR_TOKENS),
    accent: z.enum(PRESENTATION_COLOR_TOKENS),
    ink: z.enum(PRESENTATION_COLOR_TOKENS),
  }),
  heroArtwork: localArtworkSchema,
  sectionArtwork: z.array(
    z.object({
      sectionId: z.string().min(1).transform(toSectionId),
      artwork: localArtworkSchema,
    }),
  ),
  typeArtwork: z
    .array(
      z.object({
        resultKey: z.string().min(1).transform(toResultKey),
        artwork: characterArtworkSetSchema,
      }),
    )
    .optional(),
  responseScaleGuide: z.array(responseScaleGuideItemSchema).optional(),
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

  // --- 유형 코드 글자 (DEC-049) -------------------------------------------
  // 글자가 겹치면 "GARM"에서 어느 자리가 무슨 뜻인지 읽을 수 없게 됩니다.
  // 하나라도 빠지면 코드가 통째로 사라지므로, 있으면 전부 있어야 합니다.
  if (definition.typeCode !== undefined) {
    const poles = definition.axes.flatMap((axis) => [axis.positive, axis.negative]);

    const missing = poles.filter((pole) => pole.code === undefined);
    if (missing.length > 0) {
      issue(
        `typeCode를 쓰려면 모든 축 극에 code가 있어야 합니다. ${missing.length}개 빠졌습니다.`,
        ["axes"],
      );
    }

    const duplicateCodes = findDuplicates(
      poles.flatMap((pole) => (pole.code === undefined ? [] : [pole.code])),
    );
    if (duplicateCodes.length > 0) {
      issue(`유형 코드 글자가 중복됩니다: ${duplicateCodes.join(", ")}`, ["axes"]);
    }

    const crosswalk = definition.typeCode.crosswalk;
    if (crosswalk !== undefined) {
      const missingCrosswalk = poles.filter((pole) => pole.crosswalkCode === undefined);
      if (missingCrosswalk.length > 0 && missingCrosswalk.length < poles.length) {
        issue(
          `환산 표기를 쓰려면 모든 축 극에 crosswalkCode가 있어야 합니다. ${missingCrosswalk.length}개 빠졌습니다.`,
          ["axes"],
        );
      }
    }
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

  // --- 방향 결과 서술이 모든 축의 양쪽을 정확히 덮는가 ----------------------
  if (definition.resultNarrative !== undefined) {
    const narrativeAxisIds = definition.resultNarrative.axes.map((axis) => String(axis.axisId));
    const duplicateNarrativeAxes = findDuplicates(narrativeAxisIds);
    const missingNarrativeAxes = orderedAxisIds.filter((axisId) => !narrativeAxisIds.includes(axisId));
    const unknownNarrativeAxes = narrativeAxisIds.filter((axisId) => !axisIds.has(axisId));

    if (duplicateNarrativeAxes.length > 0) {
      issue(`결과 서술의 축이 중복됩니다: ${duplicateNarrativeAxes.join(", ")}`, ["resultNarrative", "axes"]);
    }
    if (missingNarrativeAxes.length > 0) {
      issue(`결과 서술에 빠진 축이 있습니다: ${missingNarrativeAxes.join(", ")}`, ["resultNarrative", "axes"]);
    }
    if (unknownNarrativeAxes.length > 0) {
      issue(`결과 서술이 없는 축을 가리킵니다: ${unknownNarrativeAxes.join(", ")}`, ["resultNarrative", "axes"]);
    }

    definition.resultNarrative.axes.forEach((narrativeAxis, narrativeAxisIndex) => {
      const axis = definition.axes.find((candidate) => candidate.id === narrativeAxis.axisId);
      if (axis === undefined) return;

      const directions = narrativeAxis.readings.map((reading) => reading.direction);
      const expectedDirections = ["positive", "negative"] as const;
      if (
        directions.length !== expectedDirections.length ||
        expectedDirections.some((direction) => !directions.includes(direction))
      ) {
        issue(
          `축 ${String(axis.id)}의 결과 서술은 positive/negative 방향을 정확히 한 번씩 가져야 합니다.`,
          ["resultNarrative", "axes", narrativeAxisIndex, "readings"],
        );
      }
    });
  }

  // --- 축 조합 해석이 모든 방향 조합을 빠짐없이 담고 있는가 ----------------
  definition.axisCombinations.forEach((combination, index) => {
    const path = ["axisCombinations", index] as const;
    const comboAxisIds = combination.axisIds.map((axisId) => String(axisId));

    const unknownAxes = comboAxisIds.filter((axisId) => !axisIds.has(axisId));
    if (unknownAxes.length > 0) {
      issue(`없는 축을 가리킵니다: ${unknownAxes.join(", ")}`, [...path, "axisIds"]);
      return;
    }

    const expectedReadingCount = 2 ** comboAxisIds.length;
    if (combination.readings.length !== expectedReadingCount) {
      issue(
        `해석은 2^축개수(${expectedReadingCount})개여야 합니다. 현재 ${combination.readings.length}개입니다.`,
        [...path, "readings"],
      );
    }

    const seenReadings = new Set<string>();
    combination.readings.forEach((reading, readingIndex) => {
      const readingPath = [...path, "readings", readingIndex] as const;
      const missingAxes = comboAxisIds.filter((axisId) => reading.poles[axisId] === undefined);
      if (missingAxes.length > 0) {
        issue(`poles에 빠진 축이 있습니다: ${missingAxes.join(", ")}`, [...readingPath, "poles"]);
        return;
      }
      const extraAxes = Object.keys(reading.poles).filter((axisId) => !comboAxisIds.includes(axisId));
      if (extraAxes.length > 0) {
        issue(`이 조합이 읽지 않는 축이 들어 있습니다: ${extraAxes.join(", ")}`, [...readingPath, "poles"]);
        return;
      }

      const signature = comboAxisIds.map((axisId) => reading.poles[axisId]).join("|");
      if (seenReadings.has(signature)) {
        issue(`방향 조합이 중복됩니다: ${signature}`, [...readingPath, "poles"]);
      }
      seenReadings.add(signature);
    });

    if (
      combination.readings.length === expectedReadingCount &&
      seenReadings.size !== expectedReadingCount
    ) {
      issue("방향 조합에 누락이 있습니다.", [...path, "readings"]);
    }
  });

  // --- 금지 표현 (AGENTS.md 1.1) ------------------------------------------
  const userFacingStrings: readonly (readonly [string, string])[] = [
    ["slug", definition.slug],
    ["title", definition.title],
    ["summary", definition.summary],
    ["description", definition.description],
    ...(definition.estimatedTimeLabel === undefined
      ? []
      : [["estimatedTimeLabel", definition.estimatedTimeLabel] as const]),
    ...definition.questions.map((question) => [`questions.${question.order}.text`, question.text] as const),
    ...definition.resultProfiles.map((profile) => [`resultProfiles.${profile.key}.title`, profile.title] as const),
    ...(definition.resultNarrative === undefined
      ? []
      : [
          ["resultNarrative.scopeNote", definition.resultNarrative.scopeNote] as const,
          ...definition.resultNarrative.axes.flatMap((axis) => [
            [
              `resultNarrative.${String(axis.axisId)}.counterEvidence`,
              axis.counterEvidence,
            ] as const,
            ...axis.readings.flatMap((reading, index) => [
              [`resultNarrative.${String(axis.axisId)}.${index}.headline`, reading.headline] as const,
              [`resultNarrative.${String(axis.axisId)}.${index}.summary`, reading.summary] as const,
              [`resultNarrative.${String(axis.axisId)}.${index}.scene`, reading.scene] as const,
            ]),
          ]),
        ]),
    ...definition.axisCombinations.flatMap((combination) => [
      [`axisCombinations.${combination.id}.title`, combination.title] as const,
      ...combination.readings.map(
        (reading, index) => [`axisCombinations.${combination.id}.readings.${index}`, reading.text] as const,
      ),
    ]),
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

export interface ParsedAssessmentContentPackage {
  readonly definition: AssessmentDefinition;
  readonly presentation?: AssessmentPresentation;
}

/**
 * 도메인 정의와 선택형 프레젠테이션을 함께 검증합니다.
 * 프레젠테이션은 콘텐츠 경계에만 머물고 채점 모델에는 들어가지 않습니다.
 */
export function parseAssessmentContentPackage(
  raw: unknown,
): Result<ParsedAssessmentContentPackage, AssessmentError> {
  const definition = parseAssessmentDefinition(raw);
  if (!definition.ok) return err(definition.error);

  const packageShape = z.object({ presentation: presentationSchema.optional() }).passthrough();
  const parsedPackage = packageShape.safeParse(raw);
  if (!parsedPackage.success) {
    const detail = parsedPackage.error.issues
      .map((current) => `${current.path.join(".") || "(root)"}: ${current.message}`)
      .join(" / ");
    return err(assessmentError("INVALID_CONTENT_PACKAGE", detail, parsedPackage.error));
  }

  const presentation = parsedPackage.data.presentation;
  if (presentation === undefined) return ok({ definition: definition.value });

  const expectedSectionIds = definition.value.sections.map((section) => String(section.id));
  const artworkSectionIds = presentation.sectionArtwork.map((item) => String(item.sectionId));
  const responseScaleGuide = presentation.responseScaleGuide;
  const typeArtwork = presentation.typeArtwork;
  const typeArtworkKeys = typeArtwork?.map((item) => String(item.resultKey)) ?? [];
  const resultKeys = definition.value.resultProfiles.map((profile) => String(profile.key));
  const duplicates = findDuplicates(artworkSectionIds);
  const missing = expectedSectionIds.filter((id) => !artworkSectionIds.includes(id));
  const unknown = artworkSectionIds.filter((id) => !expectedSectionIds.includes(id));

  const responseValues = definition.value.scale.options.map((option) => option.value);
  const guideValues = responseScaleGuide?.map((item) => item.value) ?? [];
  const duplicateGuideValues = findDuplicates(guideValues.map(String));
  const duplicateTypeArtworkKeys = findDuplicates(typeArtworkKeys);
  const missingTypeArtworkKeys = typeArtwork === undefined
    ? []
    : resultKeys.filter((key) => !typeArtworkKeys.includes(key));
  const unknownTypeArtworkKeys = typeArtworkKeys.filter((key) => !resultKeys.includes(key));
  const forbiddenTypeArtwork = typeArtwork?.find(
    (item) =>
      hasForbiddenTerm(item.artwork.male.src) ||
      hasForbiddenTerm(item.artwork.female.src),
  );
  const missingGuideValues = responseScaleGuide === undefined
    ? []
    : responseValues.filter((value) => !guideValues.includes(value));
  const unknownGuideValues = responseScaleGuide === undefined
    ? []
    : guideValues.filter((value) => !responseValues.includes(value));
  const forbiddenGuide = responseScaleGuide?.find((item) => hasForbiddenTerm(item.criterion));

  const issues = [
    duplicates.length > 0 ? `presentation sectionId가 중복됩니다: ${duplicates.join(", ")}` : "",
    missing.length > 0 ? `presentation에 빠진 sectionId가 있습니다: ${missing.join(", ")}` : "",
    unknown.length > 0 ? `presentation이 없는 sectionId를 가리킵니다: ${unknown.join(", ")}` : "",
    duplicateGuideValues.length > 0
      ? `presentation.responseScaleGuide value가 중복됩니다: ${duplicateGuideValues.join(", ")}`
      : "",
    missingGuideValues.length > 0
      ? `presentation.responseScaleGuide에 빠진 응답값이 있습니다: ${missingGuideValues.join(", ")}`
      : "",
    unknownGuideValues.length > 0
      ? `presentation.responseScaleGuide가 없는 응답값을 가리킵니다: ${unknownGuideValues.join(", ")}`
      : "",
    duplicateTypeArtworkKeys.length > 0
      ? `presentation.typeArtwork resultKey가 중복됩니다: ${duplicateTypeArtworkKeys.join(", ")}`
      : "",
    missingTypeArtworkKeys.length > 0
      ? `presentation.typeArtwork에 빠진 resultKey가 있습니다: ${missingTypeArtworkKeys.join(", ")}`
      : "",
    unknownTypeArtworkKeys.length > 0
      ? `presentation.typeArtwork이 없는 resultKey를 가리킵니다: ${unknownTypeArtworkKeys.join(", ")}`
      : "",
    forbiddenTypeArtwork === undefined
      ? ""
      : `presentation.typeArtwork.${String(forbiddenTypeArtwork.resultKey)} 경로에 노출 금지 표현이 있습니다.`,
    forbiddenGuide === undefined
      ? ""
      : `presentation.responseScaleGuide.${forbiddenGuide.value}에 노출 금지 표현이 있습니다.`,
  ].filter(Boolean);

  if (issues.length > 0) {
    return err(assessmentError("INVALID_CONTENT_PACKAGE", issues.join(" / ")));
  }

  return ok({
    definition: definition.value,
    presentation: presentation as AssessmentPresentation,
  });
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
