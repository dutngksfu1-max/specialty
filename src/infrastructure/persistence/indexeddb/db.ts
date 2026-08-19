import { openDB, type IDBPDatabase } from "idb";

import {
  DB_NAME,
  DB_VERSION,
  STORE,
  type SearchTeacherMindDb,
} from "@/infrastructure/persistence/indexeddb/schema";

let dbPromise: Promise<IDBPDatabase<SearchTeacherMindDb>> | null = null;

/** DB 연결을 한 번만 열고 재사용합니다. */
export function getDb(): Promise<IDBPDatabase<SearchTeacherMindDb>> {
  if (dbPromise === null) {
    dbPromise = openDB<SearchTeacherMindDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE.sessions)) {
          db.createObjectStore(STORE.sessions, { keyPath: "assessmentId" });
        }
        if (!db.objectStoreNames.contains(STORE.responses)) {
          const responses = db.createObjectStore(STORE.responses, {
            keyPath: ["sessionId", "questionId"],
          });
          responses.createIndex("bySession", "sessionId");
        }
        if (!db.objectStoreNames.contains(STORE.results)) {
          db.createObjectStore(STORE.results, { keyPath: "assessmentId" });
        }
        if (!db.objectStoreNames.contains(STORE.preferences)) {
          db.createObjectStore(STORE.preferences, { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * IndexedDB를 실제로 쓸 수 있는지 확인합니다.
 *
 * 시크릿 모드나 저장이 차단된 브라우저에서는 여기서 실패합니다.
 * 그때는 메모리 저장소로 넘어가고 화면에 안내 배너를 띄웁니다.
 */
export async function isIndexedDbUsable(): Promise<boolean> {
  if (typeof globalThis.indexedDB === "undefined") return false;
  try {
    await getDb();
    return true;
  } catch {
    dbPromise = null;
    return false;
  }
}

/** 테스트에서 DB 연결 캐시를 비웁니다. */
export function resetDbConnection(): void {
  dbPromise = null;
}
