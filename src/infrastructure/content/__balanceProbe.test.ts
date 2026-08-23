import { describe, it } from "vitest";

import { parseAssessmentDefinition } from "@/infrastructure/content/contentPackageSchema";
import { teacherStyleV1Package } from "@/infrastructure/content/packages/teacher-style-v1";
import { scoreAssessment, resolveIntensity } from "@/domain/assessment/scoring/scoring";
import { toQuestionId } from "@/domain/shared/ids";

/** 임시 진단 파일 — 균형 쏠림의 원인을 수치로 확인합니다. 확인 뒤 삭제합니다. */

const parsed = parseAssessmentDefinition(teacherStyleV1Package);
if (!parsed.ok) throw new Error(parsed.error.detail ?? "");
const definition = parsed.value;

function score(pick: (axisId: string, polarity: number, index: number) => number) {
  const counters = new Map<string, number>();
  const responses = definition.questions.map((question) => {
    const key = `${String(question.axisId)}:${question.polarity}`;
    const index = counters.get(key) ?? 0;
    counters.set(key, index + 1);
    return {
      questionId: toQuestionId(String(question.id)),
      value: pick(String(question.axisId), question.polarity, index),
      answeredAt: new Date(),
    };
  });

  const result = scoreAssessment(definition, responses);
  if (!result.ok) throw new Error(result.error.code);
  return result.value.axisScores;
}

function bandOf(axisId: string, raw: number) {
  const axis = definition.axes.find((item) => String(item.id) === axisId);
  if (axis === undefined) throw new Error(axisId);
  return resolveIntensity(Math.abs(raw), axis.intensityBands).id;
}

function report(title: string, scores: ReturnType<typeof score>) {
  const line = scores
    .map((item) => `${String(item.axisId).replace("axis-", "").padEnd(8)} ${String(item.rawScore).padStart(3)} ${bandOf(String(item.axisId), item.rawScore)}`)
    .join("\n  ");
  const balanced = scores.filter((item) => bandOf(String(item.axisId), item.rawScore) === "balanced").length;
  console.log(`\n[${title}]  균형 축 ${balanced}/4\n  ${line}`);
}

describe("균형 쏠림 진단", () => {
  it("모든 문항에 같은 값을 답하면 어떻게 되는가", () => {
    for (const value of [1, 2, 3, 4, 5]) {
      report(`전부 ${value}점`, score(() => value));
    }
  });

  it("한쪽 성향이 뚜렷한 사람 (정방향 5 / 역방향 1)", () => {
    report("완전 일관", score((_a, polarity) => (polarity === 1 ? 5 : 1)));
    report("적당히 일관 (4 / 2)", score((_a, polarity) => (polarity === 1 ? 4 : 2)));
  });

  it("두 문장 모두 '그렇다'고 답하는 사람 — 정·역이 서로 배타적이지 않을 때", () => {
    report("정방향 4 · 역방향 4", score(() => 4));
    report("정방향 5 · 역방향 4", score((_a, polarity) => (polarity === 1 ? 5 : 4)));
    report("정방향 4 · 역방향 3", score((_a, polarity) => (polarity === 1 ? 4 : 3)));
  });

  it("무작위 응답 10000회에서 균형 축 개수 분포", () => {
    const TRIALS = 10000;
    const distribution = [0, 0, 0, 0, 0];
    const perAxisBalanced = new Map<string, number>();

    let seed = 12345;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    for (let trial = 0; trial < TRIALS; trial += 1) {
      const scores = score(() => 1 + Math.floor(rand() * 5));
      let balanced = 0;
      for (const item of scores) {
        if (bandOf(String(item.axisId), item.rawScore) === "balanced") {
          balanced += 1;
          const key = String(item.axisId);
          perAxisBalanced.set(key, (perAxisBalanced.get(key) ?? 0) + 1);
        }
      }
      distribution[balanced] = (distribution[balanced] ?? 0) + 1;
    }

    console.log("\n[완전 무작위 응답 10000회]");
    distribution.forEach((count, index) => {
      console.log(`  균형 축 ${index}개: ${((count / TRIALS) * 100).toFixed(1)}%`);
    });
    console.log(`  → 축 하나가 균형일 확률: ${(([...perAxisBalanced.values()].reduce((a, b) => a + b, 0) / (TRIALS * 4)) * 100).toFixed(1)}%`);
  });

  it("현실적인 응답 — 성향 강도를 바꿔 가며", () => {
    const TRIALS = 4000;
    let seed = 987654;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    // 정규분포 근사
    const gauss = () => (rand() + rand() + rand() + rand() + rand() + rand() - 3) / 1.5;

    for (const trueTilt of [0, 0.3, 0.6, 1.0]) {
      let allBalanced = 0;
      let anyBalanced = 0;
      let totalBalanced = 0;

      for (let trial = 0; trial < TRIALS; trial += 1) {
        // 사람마다 성향 방향이 다르고, 문항마다 잡음이 낍니다.
        const tiltByAxis = new Map(
          definition.axes.map((axis) => [String(axis.id), (rand() < 0.5 ? -1 : 1) * trueTilt]),
        );
        const scores = score((axisId, polarity) => {
          const tilt = tiltByAxis.get(axisId) ?? 0;
          const raw = 3 + tilt * polarity + gauss();
          return Math.min(5, Math.max(1, Math.round(raw)));
        });

        const balanced = scores.filter(
          (item) => bandOf(String(item.axisId), item.rawScore) === "balanced",
        ).length;
        totalBalanced += balanced;
        if (balanced === 4) allBalanced += 1;
        if (balanced > 0) anyBalanced += 1;
      }

      console.log(
        `\n[성향 강도 ${trueTilt}]  축당 균형 ${( (totalBalanced / (TRIALS * 4)) * 100).toFixed(1)}%` +
          ` · 네 축 모두 균형 ${((allBalanced / TRIALS) * 100).toFixed(1)}%` +
          ` · 하나라도 균형 ${((anyBalanced / TRIALS) * 100).toFixed(1)}%`,
      );
    }
  });
});
