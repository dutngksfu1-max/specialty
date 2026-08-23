import { describe, expect, it } from "vitest";

import {
  resolveDifferentiation,
  resolveUnreadableAxisIds,
} from "@/domain/assessment/result/differentiation";
import { scoreAssessment } from "@/domain/assessment/scoring/scoring";
import type { AssessmentResponse } from "@/domain/assessment/session/session";
import { toAxisId, toQuestionId, toSessionId } from "@/domain/shared/ids";
import { staticAssessmentCatalog } from "@/infrastructure/content/StaticAssessmentCatalog";

/**
 * 응답 분화 (DEC-053)
 *
 * 여기서 지키려는 것 하나 — **답을 고르지 않은 사람에게 "균형"이라고 말하지 않는 것.**
 */

function loadDefinition() {
  const found = staticAssessmentCatalog.findBySlug("teacher-style");
  if (!found.ok) throw new Error("검사를 불러오지 못했습니다.");
  return found.value;
}

const sessionId = toSessionId("differentiation-test");

function answerAll(pick: (polarity: number, index: number) => number): AssessmentResponse[] {
  const definition = loadDefinition();
  return definition.questions.map((question, index) => ({
    sessionId,
    questionId: toQuestionId(String(question.id)),
    value: pick(question.polarity, index),
    answeredAt: "2026-08-23T00:00:00.000Z",
  }));
}

function rawScores(responses: readonly AssessmentResponse[]) {
  const result = scoreAssessment(loadDefinition(), responses);
  if (!result.ok) throw new Error(result.error.code);
  return new Map(result.value.axisScores.map((score) => [score.axisId, score.rawScore]));
}

describe("resolveDifferentiation", () => {
  it("모든 문항에 같은 값을 찍으면 어느 축도 갈리지 않았다고 봅니다", () => {
    for (const value of [1, 2, 3, 4, 5]) {
      const result = resolveDifferentiation(loadDefinition(), answerAll(() => value));

      for (const axis of result) {
        expect(axis.isDifferentiated, `전부 ${value}점 · ${String(axis.axisId)}`).toBe(false);
        expect(axis.distinctValues).toBe(1);
        expect(axis.valueRange).toBe(0);
      }
    }
  });

  it("3과 4만 오간 응답도 갈리지 않은 것으로 봅니다 — 어디에도 반대하지 않았습니다", () => {
    const result = resolveDifferentiation(
      loadDefinition(),
      answerAll((_polarity, index) => (index % 2 === 0 ? 3 : 4)),
    );

    for (const axis of result) {
      expect(axis.isDifferentiated, String(axis.axisId)).toBe(false);
      expect(axis.valueRange).toBe(1);
    }
  });

  it("정방향과 역방향에 반대로 답하면 갈린 것으로 봅니다", () => {
    const result = resolveDifferentiation(
      loadDefinition(),
      answerAll((polarity) => (polarity === 1 ? 5 : 1)),
    );

    for (const axis of result) {
      expect(axis.isDifferentiated, String(axis.axisId)).toBe(true);
      expect(axis.valueRange).toBe(4);
    }
  });

  it("합이 0이어도 척도를 넓게 썼으면 갈린 것입니다 — 진짜 대칭", () => {
    // 같은 방향 안에서 5와 1을 섞어 합이 0이 되게 만듭니다.
    const counters = new Map<string, number>();
    const responses = answerAll(() => 3).map((response, index) => {
      const question = loadDefinition().questions[index];
      if (question === undefined) throw new Error("문항 없음");
      const key = String(question.axisId);
      const seen = counters.get(key) ?? 0;
      counters.set(key, seen + 1);
      // 축마다 앞 절반은 5점, 뒤 절반은 1점 — polarity와 무관하게 배치해 합이 0에 가깝게
      return { ...response, value: seen % 2 === 0 ? 5 : 1 };
    });

    const result = resolveDifferentiation(loadDefinition(), responses);
    for (const axis of result) {
      expect(axis.isDifferentiated, String(axis.axisId)).toBe(true);
      expect(axis.valueRange).toBe(4);
    }
  });

  it("응답이 없는 축은 갈렸다고 말하지 않습니다", () => {
    const result = resolveDifferentiation(loadDefinition(), []);

    for (const axis of result) {
      expect(axis.isDifferentiated).toBe(false);
      expect(axis.distinctValues).toBe(0);
    }
  });
});

describe("resolveUnreadableAxisIds", () => {
  it("전부 같은 값을 찍으면 네 축 모두 '읽기 어려움'입니다", () => {
    const responses = answerAll(() => 4);
    const scores = rawScores(responses);

    // 전제 확인 — 전부 4점이면 네 축이 정확히 0점입니다.
    for (const raw of scores.values()) expect(raw).toBe(0);

    const unreadable = resolveUnreadableAxisIds(
      resolveDifferentiation(loadDefinition(), responses),
      scores,
    );

    expect(unreadable.size).toBe(loadDefinition().axes.length);
  });

  it("척도를 넓게 쓴 사람은 0점이어도 '읽기 어려움'이 아닙니다", () => {
    const responses = answerAll((polarity) => (polarity === 1 ? 5 : 1));
    const unreadable = resolveUnreadableAxisIds(
      resolveDifferentiation(loadDefinition(), responses),
      rawScores(responses),
    );

    expect(unreadable.size).toBe(0);
  });

  it("0점이 아닌 축은 갈리지 않았어도 '읽기 어려움'이 아닙니다", () => {
    // 방향이 이미 나온 축은 균형 판정 자체가 걸리지 않습니다.
    const differentiation = loadDefinition().axes.map((axis) => ({
      axisId: axis.id,
      distinctValues: 1,
      valueRange: 0,
      isDifferentiated: false,
    }));
    const scores = new Map(loadDefinition().axes.map((axis) => [axis.id, 7]));

    expect(resolveUnreadableAxisIds(differentiation, scores).size).toBe(0);
  });

  it("축이 섞여 있으면 해당 축만 골라냅니다", () => {
    const axes = loadDefinition().axes;
    const first = axes[0];
    if (first === undefined) throw new Error("축 없음");

    const differentiation = axes.map((axis, index) => ({
      axisId: axis.id,
      distinctValues: index === 0 ? 1 : 4,
      valueRange: index === 0 ? 0 : 4,
      isDifferentiated: index !== 0,
    }));
    const scores = new Map(axes.map((axis) => [axis.id, 0]));

    const unreadable = resolveUnreadableAxisIds(differentiation, scores);
    expect(unreadable.size).toBe(1);
    expect(unreadable.has(first.id)).toBe(true);
  });

  it("존재하지 않는 축 id는 조용히 무시합니다", () => {
    const differentiation = [
      { axisId: toAxisId("axis-없음"), distinctValues: 1, valueRange: 0, isDifferentiated: false },
    ];

    expect(resolveUnreadableAxisIds(differentiation, new Map()).size).toBe(0);
  });
});
