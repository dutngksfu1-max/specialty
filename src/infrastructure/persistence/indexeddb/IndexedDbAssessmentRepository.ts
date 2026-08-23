import {
  assessmentError,
  type AssessmentError,
} from "@/domain/assessment/errors/assessmentError";
import type { AssessmentRepository } from "@/domain/assessment/ports/assessmentRepository";
import type { PreferencesRepository } from "@/domain/assessment/ports/preferencesRepository";
import type { ResultSnapshot } from "@/domain/assessment/result/snapshot";
import {
  isCharacterGender,
  type CharacterGender,
} from "@/domain/assessment/session/characterGender";
import type {
  AssessmentResponse,
  AssessmentSession,
} from "@/domain/assessment/session/session";
import type { AssessmentId, SessionId } from "@/domain/shared/ids";
import { err, ok, type Result } from "@/domain/shared/result";
import { getDb } from "@/infrastructure/persistence/indexeddb/db";
import { STORE } from "@/infrastructure/persistence/indexeddb/schema";

const NICKNAME_KEY = "nickname";
const CHARACTER_GENDER_KEY = "character-gender";

/** 저장소 작업을 감싸 실패를 Result로 바꿉니다. 예외를 밖으로 던지지 않습니다. */
async function guard<T>(
  operation: string,
  run: () => Promise<T>,
): Promise<Result<T, AssessmentError>> {
  try {
    return ok(await run());
  } catch (cause) {
    return err(assessmentError("PERSISTENCE_FAILED", operation, cause));
  }
}

/** 저장된 값이 우리가 아는 모양인지 확인합니다. 아니면 DRAFT_CORRUPTED로 처리합니다. */
function isSession(value: unknown): value is AssessmentSession {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.assessmentId === "string" &&
    typeof record.nickname === "string" &&
    (record.characterGender === undefined ||
      record.characterGender === null ||
      isCharacterGender(record.characterGender)) &&
    typeof record.startedAt === "string" &&
    typeof record.versions === "object" &&
    record.versions !== null
  );
}

function isResponse(value: unknown): value is AssessmentResponse {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.sessionId === "string" &&
    typeof record.questionId === "string" &&
    typeof record.value === "number"
  );
}

function isSnapshot(value: unknown): value is ResultSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  const score = record.score as Record<string, unknown> | undefined;
  return (
    typeof record.assessmentId === "string" &&
    typeof record.sessionId === "string" &&
    (record.characterGender === undefined ||
      record.characterGender === null ||
      isCharacterGender(record.characterGender)) &&
    typeof record.completedAt === "string" &&
    score !== undefined &&
    Array.isArray(score.axisScores) &&
    typeof score.resultKey === "string"
  );
}

/**
 * 브라우저 IndexedDB 저장소 (docs/architecture.md 6.2)
 *
 * 여기에 담긴 것은 **사용자 기기 밖으로 나가지 않습니다.**
 * 네트워크 호출이 한 줄도 없습니다.
 */
export class IndexedDbAssessmentRepository
  implements AssessmentRepository, PreferencesRepository
{
  async loadSession(
    assessmentId: AssessmentId,
  ): Promise<Result<AssessmentSession | null, AssessmentError>> {
    const loaded = await guard("loadSession", async () => {
      const db = await getDb();
      return db.get(STORE.sessions, String(assessmentId));
    });
    if (!loaded.ok) return err(loaded.error);

    if (loaded.value === undefined) return ok(null);
    if (!isSession(loaded.value)) {
      return err(assessmentError("DRAFT_CORRUPTED", "세션 데이터 모양이 올바르지 않습니다."));
    }
    return ok({
      ...loaded.value,
      characterGender: isCharacterGender(loaded.value.characterGender)
        ? loaded.value.characterGender
        : null,
    });
  }

  async saveSession(session: AssessmentSession): Promise<Result<void, AssessmentError>> {
    const saved = await guard("saveSession", async () => {
      const db = await getDb();
      await db.put(STORE.sessions, session);
    });
    return saved.ok ? ok(undefined) : err(saved.error);
  }

  async loadResponses(
    sessionId: SessionId,
  ): Promise<Result<readonly AssessmentResponse[], AssessmentError>> {
    const loaded = await guard("loadResponses", async () => {
      const db = await getDb();
      return db.getAllFromIndex(STORE.responses, "bySession", String(sessionId));
    });
    if (!loaded.ok) return err(loaded.error);

    if (!loaded.value.every(isResponse)) {
      return err(assessmentError("DRAFT_CORRUPTED", "응답 데이터 모양이 올바르지 않습니다."));
    }
    return ok(loaded.value);
  }

  async saveResponse(response: AssessmentResponse): Promise<Result<void, AssessmentError>> {
    const saved = await guard("saveResponse", async () => {
      const db = await getDb();
      await db.put(STORE.responses, response);
    });
    return saved.ok ? ok(undefined) : err(saved.error);
  }

  async saveResultSnapshot(snapshot: ResultSnapshot): Promise<Result<void, AssessmentError>> {
    const saved = await guard("saveResultSnapshot", async () => {
      const db = await getDb();
      await db.put(STORE.results, snapshot);
    });
    return saved.ok ? ok(undefined) : err(saved.error);
  }

  async loadResultSnapshot(
    assessmentId: AssessmentId,
  ): Promise<Result<ResultSnapshot | null, AssessmentError>> {
    const loaded = await guard("loadResultSnapshot", async () => {
      const db = await getDb();
      return db.get(STORE.results, String(assessmentId));
    });
    if (!loaded.ok) return err(loaded.error);

    if (loaded.value === undefined) return ok(null);
    if (!isSnapshot(loaded.value)) {
      return err(assessmentError("DRAFT_CORRUPTED", "결과 데이터 모양이 올바르지 않습니다."));
    }
    return ok({
      ...loaded.value,
      characterGender: isCharacterGender(loaded.value.characterGender)
        ? loaded.value.characterGender
        : null,
    });
  }

  async clearAssessment(assessmentId: AssessmentId): Promise<Result<void, AssessmentError>> {
    const cleared = await guard("clearAssessment", async () => {
      const db = await getDb();
      const key = String(assessmentId);
      const session = await db.get(STORE.sessions, key);

      if (session !== undefined && isSession(session)) {
        const keys = await db.getAllKeysFromIndex(
          STORE.responses,
          "bySession",
          String(session.id),
        );
        const tx = db.transaction(STORE.responses, "readwrite");
        await Promise.all(keys.map((responseKey) => tx.store.delete(responseKey)));
        await tx.done;
      }

      await db.delete(STORE.sessions, key);
      await db.delete(STORE.results, key);
    });
    return cleared.ok ? ok(undefined) : err(cleared.error);
  }

  async clearAll(): Promise<Result<void, AssessmentError>> {
    const cleared = await guard("clearAll", async () => {
      const db = await getDb();
      await Promise.all([
        db.clear(STORE.sessions),
        db.clear(STORE.responses),
        db.clear(STORE.results),
        db.clear(STORE.preferences),
      ]);
    });
    return cleared.ok ? ok(undefined) : err(cleared.error);
  }

  // --- PreferencesRepository ------------------------------------------------

  async loadNickname(): Promise<Result<string | null, AssessmentError>> {
    const loaded = await guard("loadNickname", async () => {
      const db = await getDb();
      return db.get(STORE.preferences, NICKNAME_KEY);
    });
    if (!loaded.ok) return err(loaded.error);

    const record = loaded.value;
    return ok(record === undefined || typeof record.value !== "string" ? null : record.value);
  }

  async saveNickname(nickname: string): Promise<Result<void, AssessmentError>> {
    const saved = await guard("saveNickname", async () => {
      const db = await getDb();
      await db.put(STORE.preferences, { key: NICKNAME_KEY, value: nickname });
    });
    return saved.ok ? ok(undefined) : err(saved.error);
  }

  async loadCharacterGender(): Promise<Result<CharacterGender | null, AssessmentError>> {
    const loaded = await guard("loadCharacterGender", async () => {
      const db = await getDb();
      return db.get(STORE.preferences, CHARACTER_GENDER_KEY);
    });
    if (!loaded.ok) return err(loaded.error);

    const record = loaded.value;
    return ok(record !== undefined && isCharacterGender(record.value) ? record.value : null);
  }

  async saveCharacterGender(gender: CharacterGender): Promise<Result<void, AssessmentError>> {
    const saved = await guard("saveCharacterGender", async () => {
      const db = await getDb();
      await db.put(STORE.preferences, { key: CHARACTER_GENDER_KEY, value: gender });
    });
    return saved.ok ? ok(undefined) : err(saved.error);
  }
}
