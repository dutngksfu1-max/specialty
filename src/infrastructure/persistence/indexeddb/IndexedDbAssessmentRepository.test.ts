import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { completeAssessment } from "@/application/assessment/completeAssessment";
import type { AssessmentDeps } from "@/application/assessment/dependencies";
import { getResult } from "@/application/assessment/getResult";
import { resetAssessment } from "@/application/assessment/resetAssessment";
import { resumeSession } from "@/application/assessment/resumeSession";
import { saveResponse } from "@/application/assessment/saveResponse";
import { startAssessment } from "@/application/assessment/startAssessment";
import type { ResultSnapshot } from "@/domain/assessment/result/snapshot";
import type { AssessmentSession } from "@/domain/assessment/session/session";
import { toAssessmentId, toQuestionId, toSessionId } from "@/domain/shared/ids";
import { StaticAssessmentCatalog } from "@/infrastructure/content/StaticAssessmentCatalog";
import { IndexedDbAssessmentRepository } from "@/infrastructure/persistence/indexeddb/IndexedDbAssessmentRepository";
import { getDb, resetDbConnection } from "@/infrastructure/persistence/indexeddb/db";
import { DB_NAME, STORE } from "@/infrastructure/persistence/indexeddb/schema";
import { createFixedClock, createSequentialIdGenerator } from "@/test/doubles";

const SLUG = "teacher-style";
const ASSESSMENT_ID = toAssessmentId("teacher-style");

function deleteDatabase(): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

const session: AssessmentSession = {
  id: toSessionId("session-1"),
  assessmentId: ASSESSMENT_ID,
  nickname: "테스트",
  startedAt: "2026-08-19T09:00:00.000Z",
  updatedAt: "2026-08-19T09:00:00.000Z",
  completedAt: null,
  versions: { assessmentVersion: 1, contentVersion: "1.0.0", scoringVersion: 1 },
};

let repository: IndexedDbAssessmentRepository;

beforeEach(async () => {
  resetDbConnection();
  await deleteDatabase();
  repository = new IndexedDbAssessmentRepository();
});

afterEach(async () => {
  const db = await getDb();
  db.close();
  resetDbConnection();
  await deleteDatabase();
});

describe("IndexedDbAssessmentRepository", () => {
  it("세션이 없으면 null입니다", async () => {
    const loaded = await repository.loadSession(ASSESSMENT_ID);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.value).toBeNull();
  });

  it("세션을 저장하고 그대로 복구합니다", async () => {
    expect((await repository.saveSession(session)).ok).toBe(true);

    const loaded = await repository.loadSession(ASSESSMENT_ID);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.value).toEqual(session);
  });

  it("검사당 세션은 하나만 남습니다 (DEC-010)", async () => {
    await repository.saveSession(session);
    await repository.saveSession({ ...session, id: toSessionId("session-2"), nickname: "두번째" });

    const loaded = await repository.loadSession(ASSESSMENT_ID);
    if (!loaded.ok || loaded.value === null) throw new Error("세션이 없습니다.");
    expect(String(loaded.value.id)).toBe("session-2");
    expect(loaded.value.nickname).toBe("두번째");
  });

  it("응답을 저장하고 같은 문항은 덮어씁니다", async () => {
    const response = {
      sessionId: session.id,
      questionId: toQuestionId("axis-a-q1"),
      value: 4,
      answeredAt: "2026-08-19T09:01:00.000Z",
    };

    await repository.saveResponse(response);
    await repository.saveResponse({ ...response, value: 2 });

    const loaded = await repository.loadResponses(session.id);
    if (!loaded.ok) throw new Error("응답을 불러오지 못했습니다.");
    expect(loaded.value).toHaveLength(1);
    expect(loaded.value[0]?.value).toBe(2);
  });

  it("결과 스냅샷을 저장하고 복구합니다", async () => {
    const snapshot: ResultSnapshot = {
      assessmentId: ASSESSMENT_ID,
      sessionId: session.id,
      nickname: "테스트",
      score: { axisScores: [], resultKey: "pppp" as ResultSnapshot["score"]["resultKey"] },
      versions: session.versions,
      completedAt: "2026-08-19T09:30:00.000Z",
    };

    await repository.saveResultSnapshot(snapshot);

    const loaded = await repository.loadResultSnapshot(ASSESSMENT_ID);
    if (!loaded.ok) throw new Error("결과를 불러오지 못했습니다.");
    expect(loaded.value).toEqual(snapshot);
  });

  it("clearAssessment는 세션·응답·결과를 함께 지웁니다", async () => {
    await repository.saveSession(session);
    await repository.saveResponse({
      sessionId: session.id,
      questionId: toQuestionId("axis-a-q1"),
      value: 3,
      answeredAt: "2026-08-19T09:01:00.000Z",
    });
    await repository.saveResultSnapshot({
      assessmentId: ASSESSMENT_ID,
      sessionId: session.id,
      nickname: "테스트",
      score: { axisScores: [], resultKey: "pppp" as ResultSnapshot["score"]["resultKey"] },
      versions: session.versions,
      completedAt: "2026-08-19T09:30:00.000Z",
    });

    expect((await repository.clearAssessment(ASSESSMENT_ID)).ok).toBe(true);

    const loadedSession = await repository.loadSession(ASSESSMENT_ID);
    const loadedResponses = await repository.loadResponses(session.id);
    const loadedResult = await repository.loadResultSnapshot(ASSESSMENT_ID);

    expect(loadedSession.ok && loadedSession.value).toBeNull();
    expect(loadedResponses.ok && loadedResponses.value).toHaveLength(0);
    expect(loadedResult.ok && loadedResult.value).toBeNull();
  });

  it("닉네임을 저장하고 복구합니다", async () => {
    expect((await repository.loadNickname()).ok).toBe(true);

    await repository.saveNickname("3반 김선생");
    const loaded = await repository.loadNickname();
    if (!loaded.ok) throw new Error("닉네임을 불러오지 못했습니다.");
    expect(loaded.value).toBe("3반 김선생");
  });

  it("clearAll은 닉네임까지 지웁니다 (DEC-015)", async () => {
    await repository.saveSession(session);
    await repository.saveNickname("3반 김선생");

    expect((await repository.clearAll()).ok).toBe(true);

    const nickname = await repository.loadNickname();
    expect(nickname.ok && nickname.value).toBeNull();
  });

  it("저장 데이터가 손상되면 DRAFT_CORRUPTED", async () => {
    const db = await getDb();
    await db.put(STORE.sessions, { assessmentId: "teacher-style", broken: true } as never);

    const loaded = await repository.loadSession(ASSESSMENT_ID);
    expect(loaded.ok).toBe(false);
    if (loaded.ok) return;
    expect(loaded.error.code).toBe("DRAFT_CORRUPTED");
  });
});

describe("저장소를 IndexedDB로 바꿔도 유스케이스는 그대로입니다", () => {
  let deps: AssessmentDeps;

  beforeEach(() => {
    deps = {
      repository,
      catalog: new StaticAssessmentCatalog(),
      clock: createFixedClock().clock,
      idGenerator: createSequentialIdGenerator().idGenerator,
    };
  });

  it("시작 → 전 문항 응답 → 채점 → 결과 조회까지 이어집니다", async () => {
    const started = await startAssessment(deps, { slug: SLUG, nickname: "테스트" });
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    for (const question of started.value.definition.questions) {
      const saved = await saveResponse(deps, { slug: SLUG, questionId: question.id, value: 3 });
      expect(saved.ok).toBe(true);
    }

    const completed = await completeAssessment(deps, { slug: SLUG });
    expect(completed.ok).toBe(true);
    if (!completed.ok) return;
    expect(completed.value.snapshot.score.axisScores).toHaveLength(4);

    const result = await getResult(deps, { slug: SLUG });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.snapshot.nickname).toBe("테스트");
  });

  it("새로고침 상황(저장소를 새로 연 상태)에서도 응답이 남아 있습니다", async () => {
    await startAssessment(deps, { slug: SLUG, nickname: "테스트" });
    const definition = deps.catalog.findBySlug(SLUG);
    if (!definition.ok) throw new Error("검사를 찾지 못했습니다.");

    const firstTen = definition.value.questions.slice(0, 10);
    for (const question of firstTen) {
      await saveResponse(deps, { slug: SLUG, questionId: question.id, value: 5 });
    }

    // 새 인스턴스 = 페이지를 새로고침한 상황
    const freshDeps: AssessmentDeps = { ...deps, repository: new IndexedDbAssessmentRepository() };
    const resumed = await resumeSession(freshDeps, { slug: SLUG });

    expect(resumed.ok).toBe(true);
    if (!resumed.ok) return;
    expect(resumed.value.responses).toHaveLength(10);
    expect(resumed.value.unanswered).toHaveLength(38);
    expect(resumed.value.session.nickname).toBe("테스트");
  });

  it("다시 검사하기를 하면 저장된 기록이 사라집니다", async () => {
    await startAssessment(deps, { slug: SLUG });
    const definition = deps.catalog.findBySlug(SLUG);
    if (!definition.ok) throw new Error("검사를 찾지 못했습니다.");

    for (const question of definition.value.questions) {
      await saveResponse(deps, { slug: SLUG, questionId: question.id, value: 3 });
    }
    await completeAssessment(deps, { slug: SLUG });

    expect((await resetAssessment(deps, { slug: SLUG })).ok).toBe(true);

    const resumed = await resumeSession(deps, { slug: SLUG });
    expect(resumed.ok).toBe(false);
    if (!resumed.ok) expect(resumed.error.code).toBe("SESSION_NOT_FOUND");
  });
});
