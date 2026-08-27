import { beforeEach, describe, expect, it } from "vitest";

import { completeAssessment } from "@/application/assessment/completeAssessment";
import type { AssessmentDeps } from "@/application/assessment/dependencies";
import { getPartState } from "@/application/assessment/getPartState";
import { getResult } from "@/application/assessment/getResult";
import { loadNickname, updateNickname } from "@/application/assessment/nickname";
import { resetAssessment } from "@/application/assessment/resetAssessment";
import { resumeSession } from "@/application/assessment/resumeSession";
import { saveResponse } from "@/application/assessment/saveResponse";
import { startAssessment } from "@/application/assessment/startAssessment";
import type { AssessmentDefinition } from "@/domain/assessment/model/definition";
import { toQuestionId } from "@/domain/shared/ids";
import { StaticAssessmentCatalog } from "@/infrastructure/content/StaticAssessmentCatalog";
import { teacherStyleV1Package } from "@/infrastructure/content/packages/teacher-style-v1";
import { InMemoryAssessmentRepository } from "@/infrastructure/persistence/memory/InMemoryAssessmentRepository";
import { createFixedClock, createSequentialIdGenerator } from "@/test/doubles";

const SLUG = "teacher-style";

let repository: InMemoryAssessmentRepository;
let clock: ReturnType<typeof createFixedClock>;
let deps: AssessmentDeps;

function definitionOf(currentDeps: AssessmentDeps): AssessmentDefinition {
  const found = currentDeps.catalog.findBySlug(SLUG);
  if (!found.ok) throw new Error("fixture 검사를 찾지 못했습니다.");
  return found.value;
}

/** 전 문항에 같은 값을 답합니다. */
async function answerAll(value: number, currentDeps: AssessmentDeps = deps): Promise<void> {
  for (const question of definitionOf(currentDeps).questions) {
    const saved = await saveResponse(currentDeps, {
      slug: SLUG,
      questionId: question.id,
      value,
    });
    if (!saved.ok) throw new Error(`응답 저장 실패: ${saved.error.code}`);
  }
}

beforeEach(() => {
  repository = new InMemoryAssessmentRepository();
  clock = createFixedClock();
  deps = {
    repository,
    catalog: new StaticAssessmentCatalog(),
    clock: clock.clock,
    idGenerator: createSequentialIdGenerator().idGenerator,
  };
});

describe("startAssessment", () => {
  it("새 세션을 만들고 버전 스냅샷을 남깁니다", async () => {
    const started = await startAssessment(deps, {
      slug: SLUG,
      nickname: "테스트",
      characterGender: "female",
    });

    expect(started.ok).toBe(true);
    if (!started.ok) return;

    expect(started.value.isNew).toBe(true);
    expect(started.value.session.nickname).toBe("테스트");
    expect(started.value.session.characterGender).toBe("female");
    expect(started.value.session.startedAt).toBe("2026-08-19T09:00:00.000Z");
    expect(started.value.session.completedAt).toBeNull();
    // 콘텐츠 버전이 올라가도 깨지지 않도록, 지금 검사 정의와 같은지를 확인합니다.
    const definition = definitionOf(deps);
    expect(started.value.session.versions).toEqual({
      assessmentVersion: definition.assessmentVersion,
      contentVersion: definition.contentVersion,
      scoringVersion: definition.scoring.scoringVersion,
    });
  });

  it("이미 세션이 있으면 그대로 이어 갑니다", async () => {
    const first = await startAssessment(deps, { slug: SLUG, nickname: "테스트" });
    const second = await startAssessment(deps, { slug: SLUG });

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    expect(second.value.isNew).toBe(false);
    expect(second.value.session.id).toBe(first.value.session.id);
  });

  it("기존 세션의 응답을 유지하면서 캐릭터 성별을 갱신합니다", async () => {
    const first = await startAssessment(deps, { slug: SLUG });
    if (!first.ok) throw new Error("시작 실패");
    await saveResponse(deps, {
      slug: SLUG,
      questionId: definitionOf(deps).questions[0]!.id,
      value: 4,
    });

    const updated = await startAssessment(deps, {
      slug: SLUG,
      characterGender: "male",
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.value.isNew).toBe(false);
    expect(updated.value.session.id).toBe(first.value.session.id);
    expect(updated.value.session.characterGender).toBe("male");
    expect(repository.countResponses(first.value.session.id)).toBe(1);
  });

  it("restart면 이전 응답까지 지우고 새 세션을 만듭니다 (DEC-010)", async () => {
    const first = await startAssessment(deps, { slug: SLUG, nickname: "테스트" });
    if (!first.ok) throw new Error("시작 실패");
    await answerAll(4);
    expect(repository.countResponses(first.value.session.id)).toBe(48);

    const restarted = await startAssessment(deps, { slug: SLUG, restart: true });
    expect(restarted.ok).toBe(true);
    if (!restarted.ok) return;

    expect(restarted.value.isNew).toBe(true);
    expect(restarted.value.session.id).not.toBe(first.value.session.id);
    expect(repository.countResponses(first.value.session.id)).toBe(0);
    expect(repository.countResponses(restarted.value.session.id)).toBe(0);
  });

  it("없는 slug는 ASSESSMENT_NOT_FOUND", async () => {
    const started = await startAssessment(deps, { slug: "없는-검사" });

    expect(started.ok).toBe(false);
    if (started.ok) return;
    expect(started.error.code).toBe("ASSESSMENT_NOT_FOUND");
  });
});

describe("saveResponse", () => {
  it("응답을 즉시 저장하고, 같은 문항을 다시 답하면 덮어씁니다", async () => {
    const started = await startAssessment(deps, { slug: SLUG });
    if (!started.ok) throw new Error("시작 실패");

    const question = definitionOf(deps).questions[0];
    if (question === undefined) throw new Error("문항이 없습니다.");

    await saveResponse(deps, { slug: SLUG, questionId: question.id, value: 5 });
    expect(repository.peekResponse(started.value.session.id, question.id)).toBe(5);

    await saveResponse(deps, { slug: SLUG, questionId: question.id, value: 2 });
    expect(repository.peekResponse(started.value.session.id, question.id)).toBe(2);
    expect(repository.countResponses(started.value.session.id)).toBe(1);
  });

  it("세션이 없으면 SESSION_NOT_FOUND", async () => {
    const question = definitionOf(deps).questions[0];
    if (question === undefined) throw new Error("문항이 없습니다.");

    const saved = await saveResponse(deps, { slug: SLUG, questionId: question.id, value: 3 });

    expect(saved.ok).toBe(false);
    if (saved.ok) return;
    expect(saved.error.code).toBe("SESSION_NOT_FOUND");
  });

  it("척도에 없는 값이면 INVALID_RESPONSE", async () => {
    await startAssessment(deps, { slug: SLUG });
    const question = definitionOf(deps).questions[0];
    if (question === undefined) throw new Error("문항이 없습니다.");

    const saved = await saveResponse(deps, { slug: SLUG, questionId: question.id, value: 9 });

    expect(saved.ok).toBe(false);
    if (saved.ok) return;
    expect(saved.error.code).toBe("INVALID_RESPONSE");
  });

  it("이 검사에 없는 문항이면 INVALID_RESPONSE", async () => {
    await startAssessment(deps, { slug: SLUG });

    const saved = await saveResponse(deps, {
      slug: SLUG,
      questionId: toQuestionId("없는-문항"),
      value: 3,
    });

    expect(saved.ok).toBe(false);
    if (saved.ok) return;
    expect(saved.error.code).toBe("INVALID_RESPONSE");
  });
});

describe("getPartState", () => {
  it("Part의 문항과 진행 상황을 함께 돌려줍니다", async () => {
    await startAssessment(deps, { slug: SLUG });

    const first = await getPartState(deps, { slug: SLUG, sectionOrder: 1 });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    expect(first.value.questions).toHaveLength(12);
    expect(first.value.totalCount).toBe(48);
    expect(first.value.answeredCount).toBe(0);
    expect(first.value.unansweredInPart).toHaveLength(12);
    expect(first.value.isFirstSection).toBe(true);
    expect(first.value.isLastSection).toBe(false);

    const question = first.value.questions[0];
    if (question === undefined) throw new Error("문항이 없습니다.");
    await saveResponse(deps, { slug: SLUG, questionId: question.id, value: 4 });

    const after = await getPartState(deps, { slug: SLUG, sectionOrder: 1 });
    if (!after.ok) throw new Error("조회 실패");
    expect(after.value.answeredCount).toBe(1);
    expect(after.value.answers.get(question.id)).toBe(4);
    expect(after.value.unansweredInPart).toHaveLength(11);
  });

  it("마지막 Part는 isLastSection이 true입니다", async () => {
    await startAssessment(deps, { slug: SLUG });
    const last = await getPartState(deps, { slug: SLUG, sectionOrder: 4 });

    if (!last.ok) throw new Error("조회 실패");
    expect(last.value.isFirstSection).toBe(false);
    expect(last.value.isLastSection).toBe(true);
  });

  it("없는 Part 번호는 ASSESSMENT_NOT_FOUND", async () => {
    await startAssessment(deps, { slug: SLUG });
    const missing = await getPartState(deps, { slug: SLUG, sectionOrder: 5 });

    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.error.code).toBe("ASSESSMENT_NOT_FOUND");
  });
});

describe("resumeSession", () => {
  it("저장된 응답을 그대로 복구하고 이어서 할 Part를 알려 줍니다", async () => {
    await startAssessment(deps, {
      slug: SLUG,
      nickname: "테스트",
      characterGender: "female",
    });

    const part1 = await getPartState(deps, { slug: SLUG, sectionOrder: 1 });
    if (!part1.ok) throw new Error("조회 실패");
    for (const question of part1.value.questions) {
      await saveResponse(deps, { slug: SLUG, questionId: question.id, value: 3 });
    }

    const resumed = await resumeSession(deps, { slug: SLUG });
    expect(resumed.ok).toBe(true);
    if (!resumed.ok) return;

    expect(resumed.value.responses).toHaveLength(12);
    expect(resumed.value.unanswered).toHaveLength(36);
    expect(resumed.value.nextSectionOrder).toBe(2);
    expect(resumed.value.session.nickname).toBe("테스트");
  });

  it("세션이 없으면 SESSION_NOT_FOUND", async () => {
    const resumed = await resumeSession(deps, { slug: SLUG });

    expect(resumed.ok).toBe(false);
    if (resumed.ok) return;
    expect(resumed.error.code).toBe("SESSION_NOT_FOUND");
  });

  it("검사 버전이 올라갔으면 VERSION_MISMATCH (architecture 7.3)", async () => {
    await startAssessment(deps, { slug: SLUG });

    const bumped = JSON.parse(JSON.stringify(teacherStyleV1Package)) as Record<string, unknown>;
    bumped.assessmentVersion = definitionOf(deps).assessmentVersion + 1;

    const bumpedDeps: AssessmentDeps = {
      ...deps,
      catalog: new StaticAssessmentCatalog([bumped]),
    };

    const resumed = await resumeSession(bumpedDeps, { slug: SLUG });
    expect(resumed.ok).toBe(false);
    if (resumed.ok) return;
    expect(resumed.error.code).toBe("VERSION_MISMATCH");
  });

  it("문구만 바뀐 경우(contentVersion)는 계속 진행합니다", async () => {
    await startAssessment(deps, { slug: SLUG });

    const retouched = JSON.parse(JSON.stringify(teacherStyleV1Package)) as Record<string, unknown>;
    retouched.contentVersion = "1.0.1";

    const retouchedDeps: AssessmentDeps = {
      ...deps,
      catalog: new StaticAssessmentCatalog([retouched]),
    };

    const resumed = await resumeSession(retouchedDeps, { slug: SLUG });
    expect(resumed.ok).toBe(true);
  });
});

describe("completeAssessment", () => {
  it("미응답이 있으면 INCOMPLETE_RESPONSES (DEC-014)", async () => {
    await startAssessment(deps, { slug: SLUG });

    const part1 = await getPartState(deps, { slug: SLUG, sectionOrder: 1 });
    if (!part1.ok) throw new Error("조회 실패");
    for (const question of part1.value.questions) {
      await saveResponse(deps, { slug: SLUG, questionId: question.id, value: 4 });
    }

    const completed = await completeAssessment(deps, { slug: SLUG });
    expect(completed.ok).toBe(false);
    if (completed.ok) return;
    expect(completed.error.code).toBe("INCOMPLETE_RESPONSES");
  });

  it("전부 3점이면 모든 축이 균형이고 defaultPole 조합으로 확정됩니다", async () => {
    await startAssessment(deps, {
      slug: SLUG,
      nickname: "테스트",
      characterGender: "female",
    });
    await answerAll(3);

    clock.set("2026-08-19T09:12:00.000Z");
    const completed = await completeAssessment(deps, { slug: SLUG });

    expect(completed.ok).toBe(true);
    if (!completed.ok) return;

    const { snapshot } = completed.value;
    expect(snapshot.completedAt).toBe("2026-08-19T09:12:00.000Z");
    expect(snapshot.nickname).toBe("테스트");
    expect(snapshot.characterGender).toBe("female");
    expect(snapshot.score.axisScores).toHaveLength(4);
    expect(snapshot.score.axisScores.every((axis) => axis.rawScore === 0)).toBe(true);
    expect(snapshot.score.axisScores.every((axis) => axis.isBalanced)).toBe(true);
    expect(String(snapshot.score.resultKey)).toBe("pppp");
  });

  it("연속 점수를 스냅샷에 그대로 저장합니다 (PRD F-4.6)", async () => {
    await startAssessment(deps, { slug: SLUG });
    await answerAll(5);

    const completed = await completeAssessment(deps, { slug: SLUG });
    if (!completed.ok) throw new Error("채점 실패");

    // polarity가 축마다 +1 5개 / -1 5개이므로 전부 5점이면 상쇄되어 0점입니다.
    for (const axisScore of completed.value.snapshot.score.axisScores) {
      expect(axisScore.rawScore).toBe(0);
      expect(axisScore.minScore).toBe(-24);
      expect(axisScore.maxScore).toBe(24);
      expect(axisScore.normalized).toBeCloseTo(0.5, 10);
    }
  });

  it("세션의 completedAt이 기록됩니다", async () => {
    await startAssessment(deps, { slug: SLUG });
    await answerAll(3);
    clock.set("2026-08-19T09:30:00.000Z");
    await completeAssessment(deps, { slug: SLUG });

    const resumed = await resumeSession(deps, { slug: SLUG });
    if (!resumed.ok) throw new Error("복구 실패");
    expect(resumed.value.session.completedAt).toBe("2026-08-19T09:30:00.000Z");
  });

  it("같은 응답이면 항상 같은 결과가 나옵니다", async () => {
    await startAssessment(deps, { slug: SLUG });
    await answerAll(4);

    const first = await completeAssessment(deps, { slug: SLUG });
    const second = await completeAssessment(deps, { slug: SLUG });

    expect(first).toEqual(second);
  });
});

describe("getResult", () => {
  it("저장된 결과와 결과 프로필을 함께 돌려줍니다", async () => {
    await startAssessment(deps, { slug: SLUG, nickname: "테스트" });
    await answerAll(3);
    await completeAssessment(deps, { slug: SLUG });

    const result = await getResult(deps, { slug: SLUG });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(String(result.value.profile.key)).toBe("pppp");
    // 결과 키는 내부 식별자입니다. 화면에 나가는 제목에 새어 나오면 안 됩니다 (PRD AC-1).
    expect(result.value.profile.title).not.toContain(String(result.value.profile.key));
    expect(result.value.profile.title.length).toBeGreaterThan(0);
    expect(result.value.snapshot.nickname).toBe("테스트");
  });

  it("결과가 없으면 SESSION_NOT_FOUND", async () => {
    const result = await getResult(deps, { slug: SLUG });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("SESSION_NOT_FOUND");
  });

  /**
   * 신호는 스냅샷에 저장하지 않고 원본 응답에서 다시 계산합니다
   * (docs/PRD-result-v2.md 4장). 검사를 마쳐도 응답이 남아 있어야 가능합니다.
   */
  it("응답에서 계산한 신호를 함께 돌려줍니다", async () => {
    await startAssessment(deps, { slug: SLUG, nickname: "테스트" });
    // 전 문항에 '보통이다'로 답하면 응답 폭이 centered로 나와야 합니다.
    await answerAll(3);
    await completeAssessment(deps, { slug: SLUG });

    const result = await getResult(deps, { slug: SLUG });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const signals = result.value.signals;
    expect(signals).toBeDefined();
    expect(signals?.consistency).toHaveLength(result.value.definition.axes.length);
    expect(signals?.responseStyle.id).toBe("centered");
    expect(signals?.responseStyle.answeredCount).toBe(48);
    // 가운데만 골랐으면 장면 사이 격차가 없으므로 아무 말도 하지 않습니다.
    expect(signals?.contextSplits).toEqual([]);
  });

  it("검사 버전이 올라갔으면 VERSION_MISMATCH", async () => {
    await startAssessment(deps, { slug: SLUG });
    await answerAll(3);
    await completeAssessment(deps, { slug: SLUG });

    const bumped = JSON.parse(JSON.stringify(teacherStyleV1Package)) as Record<string, unknown>;
    // 콘텐츠가 실제로 쓰는 버전에서 한 칸 올립니다. 숫자를 적어 두면 콘텐츠가 그 숫자에
    // 도달한 날 이 테스트가 조용히 아무것도 검사하지 않게 됩니다 (DEC-063에서 실제로 겪음).
    const current = bumped.scoring as { readonly scoringVersion: number };
    bumped.scoring = { ...current, scoringVersion: current.scoringVersion + 1 };

    const result = await getResult(
      { ...deps, catalog: new StaticAssessmentCatalog([bumped]) },
      { slug: SLUG },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("VERSION_MISMATCH");
  });
});

describe("결과 화면이 필요로 하는 데이터가 모두 갖춰집니다 (PRD F-5)", () => {
  it("축 점수마다 축 정의와 강도 구간을 찾을 수 있습니다", async () => {
    await startAssessment(deps, { slug: SLUG, nickname: "테스트" });
    await answerAll(5);
    await completeAssessment(deps, { slug: SLUG });

    const result = await getResult(deps, { slug: SLUG });
    if (!result.ok) throw new Error("결과를 불러오지 못했습니다.");

    const { definition, snapshot, profile } = result.value;
    const axisById = new Map(definition.axes.map((axis) => [String(axis.id), axis]));

    for (const score of snapshot.score.axisScores) {
      // AxisBar가 축 이름·양 끝 라벨을 그리려면 축 정의를 찾을 수 있어야 합니다.
      const axis = axisById.get(String(score.axisId));
      expect(axis).toBeDefined();
      if (axis === undefined) continue;

      // 강도 배지 문구는 콘텐츠에서 옵니다. 못 찾으면 배지가 빈 칸으로 나옵니다.
      const band = axis.intensityBands.find((current) => current.id === score.intensityBandId);
      expect(band).toBeDefined();
      expect(band?.label.length).toBeGreaterThan(0);

      // 마커 위치는 0~1 범위여야 막대 밖으로 나가지 않습니다.
      expect(score.normalized).toBeGreaterThanOrEqual(0);
      expect(score.normalized).toBeLessThanOrEqual(1);
    }

    // 결과 본문 6개 묶음이 모두 비어 있지 않아야 화면에 빈 섹션이 생기지 않습니다.
    expect(profile.title.length).toBeGreaterThan(0);
    expect(profile.oneLiner.length).toBeGreaterThan(0);
    expect(profile.rhythm.length).toBeGreaterThan(0);
    expect(profile.shiningMoments.length).toBeGreaterThan(0);
    expect(profile.underPressure.length).toBeGreaterThan(0);
    expect(profile.withColleagues.length).toBeGreaterThan(0);
    expect(profile.collaboration.naturalFit.length).toBeGreaterThan(0);
    expect(profile.collaboration.needsTuning.length).toBeGreaterThan(0);
  });

  it("이름을 바꾸면 저장된 결과의 이름도 함께 바뀝니다 (F-2.4)", async () => {
    await startAssessment(deps, { slug: SLUG, nickname: "처음이름" });
    await answerAll(3);
    await completeAssessment(deps, { slug: SLUG });

    const updated = await updateNickname(
      { ...deps, preferences: repository },
      { slug: SLUG, nickname: "  바꾼이름  " },
    );
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.value).toBe("바꾼이름");

    const result = await getResult(deps, { slug: SLUG });
    if (!result.ok) throw new Error("결과를 불러오지 못했습니다.");
    expect(result.value.snapshot.nickname).toBe("바꾼이름");

    // 점수는 그대로여야 합니다 — 이름은 채점과 무관합니다.
    expect(result.value.snapshot.score.axisScores.every((axis) => axis.rawScore === 0)).toBe(true);

    const remembered = await loadNickname({ preferences: repository });
    expect(remembered.ok && remembered.value).toBe("바꾼이름");
  });

  it("12자를 넘는 이름은 잘립니다 (DEC-009)", async () => {
    await startAssessment(deps, { slug: SLUG });

    const updated = await updateNickname(
      { ...deps, preferences: repository },
      { slug: SLUG, nickname: "가나다라마바사아자차카타파하" },
    );

    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.value).toBe("가나다라마바사아자차카타");
    expect([...updated.value]).toHaveLength(12);
  });
});

describe("resetAssessment", () => {
  it("세션·응답·결과를 모두 지웁니다 (DEC-010, DEC-015)", async () => {
    await startAssessment(deps, { slug: SLUG });
    await answerAll(3);
    await completeAssessment(deps, { slug: SLUG });

    const reset = await resetAssessment(deps, { slug: SLUG });
    expect(reset.ok).toBe(true);

    const resumed = await resumeSession(deps, { slug: SLUG });
    expect(resumed.ok).toBe(false);
    if (!resumed.ok) expect(resumed.error.code).toBe("SESSION_NOT_FOUND");

    const result = await getResult(deps, { slug: SLUG });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SESSION_NOT_FOUND");
  });
});
