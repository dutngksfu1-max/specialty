import { describe, expect, it } from "vitest";

import {
  resolveIntensity,
  scoreAssessment,
} from "@/domain/assessment/scoring/scoring";
import { toQuestionId, toSessionId } from "@/domain/shared/ids";
import { parseAssessmentDefinition } from "@/infrastructure/content/contentPackageSchema";
import { teacherStyleV1Package } from "@/infrastructure/content/packages/teacher-style-v1";

const parsed = parseAssessmentDefinition(teacherStyleV1Package);
if (!parsed.ok) throw new Error(`콘텐츠 검증 실패: ${parsed.error.detail ?? ""}`);
const definition = parsed.value;
const probeSessionId = toSessionId("direction-resolution-probe");

function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function responsesWith(pick: (polarity: number) => number) {
  return definition.questions.map((question) => ({
    sessionId: probeSessionId,
    questionId: toQuestionId(String(question.id)),
    value: pick(question.polarity),
    answeredAt: "2026-08-31T00:00:00.000Z",
  }));
}

function scoreWith(pick: (polarity: number) => number) {
  const result = scoreAssessment(definition, responsesWith(pick));
  if (!result.ok) throw new Error(result.error.code);
  return result.value.axisScores;
}

describe("방향과 기울기 분리 (DEC-068)", () => {
  it("0점부터 모든 점수 구간이 기울기 표시에만 사용됩니다", () => {
    for (const axis of definition.axes) {
      expect(resolveIntensity(0, axis.intensityBands).id, String(axis.id)).toBe("leaning");
      expect(resolveIntensity(1, axis.intensityBands).id, String(axis.id)).toBe("leaning");
      expect(resolveIntensity(24, axis.intensityBands).id, String(axis.id)).toBe("defining");
    }
  });

  it("0이 아닌 합계는 점수 부호가 곧 방향이 됩니다", () => {
    const positiveScores = scoreWith((polarity) => (polarity === 1 ? 4 : 2));
    const negativeScores = scoreWith((polarity) => (polarity === 1 ? 2 : 4));

    for (const score of positiveScores) {
      expect(score.rawScore).toBeGreaterThan(0);
      expect(score.direction).toBe("positive");
      expect(score.directionSource).toBe("score");
    }
    for (const score of negativeScores) {
      expect(score.rawScore).toBeLessThan(0);
      expect(score.direction).toBe("negative");
      expect(score.directionSource).toBe("score");
    }
  });

  it("동점 보정이 방향을 찾아도 연속 원점수는 0으로 보존합니다", () => {
    const random = makeRandom(99);
    let seen = 0;

    for (let trial = 0; trial < 800 && seen === 0; trial += 1) {
      for (const score of scoreWith(() => 1 + Math.floor(random() * 5))) {
        if (score.directionSource !== "tiebreak") continue;
        seen += 1;
        expect(score.rawScore).toBe(0);
        expect(definition.scoring.tieBreak).toContain(score.tieBreakRuleId);
        expect(["positive", "negative"]).toContain(score.direction);
      }
    }

    expect(seen, "동점 보정 사례를 한 건도 만나지 못했습니다.").toBeGreaterThan(0);
  });

  it("보정으로 갈리지 않는 0점은 축의 기본 방향을 사용합니다", () => {
    for (const value of [1, 2, 3, 4, 5]) {
      const scores = scoreWith(() => value);
      for (const score of scores) {
        const axis = definition.axes.find((item) => item.id === score.axisId);
        if (axis === undefined) throw new Error(String(score.axisId));

        expect(score.rawScore).toBe(0);
        expect(score.direction).toBe(axis.defaultPole);
        expect(score.directionSource).toBe("default");
      }
    }
  });

  it("동점 보정 규칙이 없는 검사도 0점에서 기본 방향을 사용합니다", () => {
    const withoutTieBreak = {
      ...definition,
      scoring: { ...definition.scoring, tieBreak: undefined },
    };
    const result = scoreAssessment(withoutTieBreak, responsesWith(() => 5));
    if (!result.ok) throw new Error(result.error.code);

    for (const score of result.value.axisScores) {
      const axis = definition.axes.find((item) => item.id === score.axisId);
      if (axis === undefined) throw new Error(String(score.axisId));
      expect(score.rawScore).toBe(0);
      expect(score.direction).toBe(axis.defaultPole);
      expect(score.directionSource).toBe("default");
    }
  });

  it("무작위 응답에서도 모든 축이 항상 읽을 수 있는 방향을 가집니다", () => {
    const random = makeRandom(20260831);

    for (let trial = 0; trial < 500; trial += 1) {
      for (const score of scoreWith(() => 1 + Math.floor(random() * 5))) {
        expect(["positive", "negative"]).toContain(score.direction);
        expect(["score", "tiebreak", "default"]).toContain(score.directionSource);
      }
    }
  });
});
