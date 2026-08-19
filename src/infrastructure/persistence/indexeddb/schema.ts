import type { DBSchema } from "idb";

import type { ResultSnapshot } from "@/domain/assessment/result/snapshot";
import type {
  AssessmentResponse,
  AssessmentSession,
} from "@/domain/assessment/session/session";

/**
 * IndexedDB 스키마 (docs/architecture.md 6.2)
 *
 * DB 이름은 DEC-003의 영문 표기를 씁니다.
 * 스키마를 바꿀 때는 upgrade 콜백에서 마이그레이션하며, **기존 응답을 지우지 않습니다.**
 */
export const DB_NAME = "searchteachermind";
export const DB_VERSION = 1;

export const STORE = {
  sessions: "sessions",
  responses: "responses",
  results: "results",
  preferences: "preferences",
} as const;

export interface PreferenceRecord {
  readonly key: string;
  readonly value: string;
}

export interface SearchTeacherMindDb extends DBSchema {
  sessions: {
    key: string;
    value: AssessmentSession;
  };
  responses: {
    key: [string, string];
    value: AssessmentResponse;
    indexes: { bySession: string };
  };
  results: {
    key: string;
    value: ResultSnapshot;
  };
  preferences: {
    key: string;
    value: PreferenceRecord;
  };
}
