import { beforeEach, describe, expect, it } from "vitest";

import { completeAssessment } from "@/application/assessment/completeAssessment";
import type { AssessmentDeps } from "@/application/assessment/dependencies";
import { saveResponse } from "@/application/assessment/saveResponse";
import { startAssessment } from "@/application/assessment/startAssessment";
import { scoreAssessment } from "@/domain/assessment/scoring/scoring";
import type { AssessmentResponse } from "@/domain/assessment/session/session";
import { toSessionId } from "@/domain/shared/ids";
import { StaticAssessmentCatalog } from "@/infrastructure/content/StaticAssessmentCatalog";
import {
  collectContentWarnings,
  parseAssessmentDefinition,
} from "@/infrastructure/content/contentPackageSchema";
import { InMemoryAssessmentRepository } from "@/infrastructure/persistence/memory/InMemoryAssessmentRepository";
import { createFixedClock, createSequentialIdGenerator } from "@/test/doubles";

/**
 * 확장성 검증 (PRD AC-6 / docs/architecture.md 10장)
 *
 * MVP 검사와 **모양이 전혀 다른** 검사를 넣어도 엔진이 그대로 동작해야 합니다.
 *   - 축 3개 (4개가 아님)
 *   - 7점 척도 (5점이 아님)
 *   - 축당 6문항, 총 18문항 (40문항이 아님)
 *   - 점수 범위 -18 ~ +18 (-20 ~ +20이 아님)
 *   - 결과 프로필 8개 (16개가 아님)
 *
 * 이 테스트를 통과한다면 40 / 4 / 5 / 20 이 코드에 박혀 있지 않다는 뜻입니다.
 * (배포되는 콘텐츠가 아니라 테스트 안에서만 존재하는 패키지입니다.)
 */

const AXIS_IDS = ["axis-x", "axis-y", "axis-z"] as const;
const SECTION_IDS = ["part-1", "part-2"] as const;
const QUESTIONS_PER_AXIS = 6;
const SCALE_POINTS = 7;
const CENTER_VALUE = 4;
/** 축당 최대 절대 점수 = 6문항 × 최대 편차 3 = 18 */
const AXIS_MAX = 18;

const bands = [
  { id: "balanced", label: "[fixture] 균형", minAbsScore: 0, maxAbsScore: 3 },
  { id: "clear", label: "[fixture] 뚜렷", minAbsScore: 4, maxAbsScore: 11 },
  { id: "strong", label: "[fixture] 매우 뚜렷", minAbsScore: 12, maxAbsScore: AXIS_MAX },
];

const takenPerAxis = new Map<string, number>();

const questions = Array.from(
  { length: AXIS_IDS.length * QUESTIONS_PER_AXIS },
  (_, index) => {
    const axisId = AXIS_IDS[index % AXIS_IDS.length] ?? AXIS_IDS[0];
    const taken = takenPerAxis.get(axisId) ?? 0;
    takenPerAxis.set(axisId, taken + 1);

    return {
      id: `${axisId}-q${taken + 1}`,
      sectionId: SECTION_IDS[Math.floor(index / 9)] ?? SECTION_IDS[0],
      order: index + 1,
      text: `[fixture] 대체 검사 ${axisId} 문항 ${taken + 1}`,
      axisId,
      polarity: taken < QUESTIONS_PER_AXIS / 2 ? 1 : -1,
      weight: 1,
    };
  },
);

const resultProfiles = Array.from({ length: 2 ** AXIS_IDS.length }, (_, mask) => {
  const sides = AXIS_IDS.map((_axisId, index) =>
    ((mask >> (AXIS_IDS.length - 1 - index)) & 1) === 0 ? "positive" : "negative",
  );
  const key = sides.map((side) => (side === "positive" ? "p" : "n")).join("");

  const poles: Record<string, string> = {};
  AXIS_IDS.forEach((axisId, index) => {
    poles[axisId] = sides[index] ?? "positive";
  });

  return {
    key,
    poles,
    title: `[fixture] 대체 결과 ${key}`,
    oneLiner: `[fixture] ${key}`,
    rhythm: `[fixture] ${key}`,
    shiningMoments: [`[fixture] ${key}`],
    underPressure: [`[fixture] ${key}`],
    withColleagues: [`[fixture] ${key}`],
    collaboration: { naturalFit: [`[fixture] ${key}`], needsTuning: [`[fixture] ${key}`] },
  };
});

const alternatePackage = {
  id: "alternate-shape",
  slug: "alternate-shape",
  title: "[fixture] 모양이 다른 검사",
  summary: "[fixture] 축 3개 · 7점 척도 · 18문항",
  description: "[fixture] 엔진이 특정 검사에 묶여 있지 않은지 확인하는 테스트용 패키지입니다.",
  estimatedMinutes: 5,
  status: "published",
  assessmentVersion: 1,
  contentVersion: "1.0.0",
  scale: {
    id: "likert-7",
    centerValue: CENTER_VALUE,
    options: Array.from({ length: SCALE_POINTS }, (_, index) => ({
      value: index + 1,
      label: `[fixture] 척도 ${index + 1}`,
    })),
  },
  axes: AXIS_IDS.map((axisId, index) => ({
    id: axisId,
    name: `[fixture] ${axisId}`,
    positive: {
      side: "positive",
      label: `[fixture] ${axisId} 양극`,
      shortLabel: `[fx]${index}+`,
      description: `[fixture] ${axisId} 양극`,
    },
    negative: {
      side: "negative",
      label: `[fixture] ${axisId} 음극`,
      shortLabel: `[fx]${index}-`,
      description: `[fixture] ${axisId} 음극`,
    },
    defaultPole: index === 1 ? "negative" : "positive",
    intensityBands: bands,
  })),
  sections: SECTION_IDS.map((sectionId, index) => ({
    id: sectionId,
    order: index + 1,
    title: `Part ${index + 1}`,
  })),
  questions,
  scoring: { strategyId: "centered-likert-axis-sum", scoringVersion: 1 },
  resultProfiles,
};

describe("모양이 다른 검사도 같은 엔진으로 동작합니다 (AC-6)", () => {
  const parsed = parseAssessmentDefinition(alternatePackage);

  it("콘텐츠 검증을 통과합니다", () => {
    if (!parsed.ok) throw new Error(`검증 실패: ${parsed.error.detail ?? ""}`);
    expect(parsed.value.axes).toHaveLength(3);
    expect(parsed.value.questions).toHaveLength(18);
    expect(parsed.value.resultProfiles).toHaveLength(8);
    expect(collectContentWarnings(parsed.value)).toEqual([]);
  });

  it("점수 범위가 -18 ~ +18로 계산됩니다 (20이 코드에 없다는 뜻)", () => {
    if (!parsed.ok) throw new Error("검증 실패");
    const definition = parsed.value;

    const responses: readonly AssessmentResponse[] = definition.questions.map((question) => ({
      sessionId: toSessionId("fixture-session"),
      questionId: question.id,
      // polarity 방향으로 최대한 밀어 넣습니다.
      value: question.polarity === 1 ? SCALE_POINTS : 1,
      answeredAt: "2026-08-19T00:00:00.000Z",
    }));

    const score = scoreAssessment(definition, responses);
    if (!score.ok) throw new Error(`채점 실패: ${score.error.code}`);

    for (const axisScore of score.value.axisScores) {
      expect(axisScore.minScore).toBe(-AXIS_MAX);
      expect(axisScore.maxScore).toBe(AXIS_MAX);
      expect(axisScore.rawScore).toBe(AXIS_MAX);
      expect(axisScore.normalized).toBeCloseTo(1, 10);
      expect(axisScore.intensityBandId).toBe("strong");
      expect(axisScore.direction).toBe("positive");
    }

    expect(String(score.value.resultKey)).toBe("ppp");
  });

  it("중앙값 응답이면 축마다 defaultPole이 그대로 쓰입니다", () => {
    if (!parsed.ok) throw new Error("검증 실패");
    const definition = parsed.value;

    const responses: readonly AssessmentResponse[] = definition.questions.map((question) => ({
      sessionId: toSessionId("fixture-session"),
      questionId: question.id,
      value: CENTER_VALUE,
      answeredAt: "2026-08-19T00:00:00.000Z",
    }));

    const score = scoreAssessment(definition, responses);
    if (!score.ok) throw new Error("채점 실패");

    expect(score.value.axisScores.map((axisScore) => axisScore.rawScore)).toEqual([0, 0, 0]);
    expect(score.value.axisScores.every((axisScore) => axisScore.isBalanced)).toBe(true);
    // axis-y만 defaultPole이 negative입니다.
    expect(String(score.value.resultKey)).toBe("pnp");
  });
});

describe("검사를 2종 노출해도 카탈로그만 바뀝니다 (AC-6)", () => {
  let deps: AssessmentDeps;

  beforeEach(async () => {
    const { teacherStyleV1Package } = await import(
      "@/infrastructure/content/packages/teacher-style-v1"
    );

    deps = {
      repository: new InMemoryAssessmentRepository(),
      catalog: new StaticAssessmentCatalog([teacherStyleV1Package, alternatePackage]),
      clock: createFixedClock().clock,
      idGenerator: createSequentialIdGenerator().idGenerator,
    };
  });

  it("published 검사가 2종이 됩니다", () => {
    expect(deps.catalog.listPublished()).toHaveLength(2);
    expect(deps.catalog.findBySlug("teacher-style").ok).toBe(true);
    expect(deps.catalog.findBySlug("alternate-shape").ok).toBe(true);
  });

  it("두 번째 검사도 유스케이스가 그대로 처리합니다", async () => {
    const started = await startAssessment(deps, { slug: "alternate-shape", nickname: "테스트" });
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    for (const question of started.value.definition.questions) {
      const saved = await saveResponse(deps, {
        slug: "alternate-shape",
        questionId: question.id,
        value: question.polarity === 1 ? SCALE_POINTS : 1,
      });
      expect(saved.ok).toBe(true);
    }

    const completed = await completeAssessment(deps, { slug: "alternate-shape" });
    expect(completed.ok).toBe(true);
    if (!completed.ok) return;

    expect(completed.value.snapshot.score.axisScores).toHaveLength(3);
    expect(String(completed.value.snapshot.score.resultKey)).toBe("ppp");
  });
});
