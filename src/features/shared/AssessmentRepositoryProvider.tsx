"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { AssessmentDeps } from "@/application/assessment/dependencies";
import type { PreferencesRepository } from "@/domain/assessment/ports/preferencesRepository";
import { staticAssessmentCatalog } from "@/infrastructure/content/StaticAssessmentCatalog";
import { IndexedDbAssessmentRepository } from "@/infrastructure/persistence/indexeddb/IndexedDbAssessmentRepository";
import { isIndexedDbUsable } from "@/infrastructure/persistence/indexeddb/db";
import { InMemoryAssessmentRepository } from "@/infrastructure/persistence/memory/InMemoryAssessmentRepository";
import { randomIdGenerator } from "@/infrastructure/system/randomIdGenerator";
import { systemClock } from "@/infrastructure/system/systemClock";

/**
 * 조립 지점 (Composition Root) — docs/architecture.md 2장
 *
 * **저장소 구현체를 고르는 곳은 이 파일 하나뿐입니다.**
 * 나중에 Supabase를 붙이더라도 다른 파일은 건드리지 않습니다.
 */

export type StorageKind = "indexeddb" | "memory";

export interface AssessmentServices {
  readonly deps: AssessmentDeps;
  readonly preferences: PreferencesRepository;
  readonly storage: StorageKind;
}

const ServicesContext = createContext<AssessmentServices | null>(null);

export function AssessmentRepositoryProvider({ children }: { children: ReactNode }) {
  const [storage, setStorage] = useState<StorageKind | null>(null);

  // 저장소를 한 번만 만들어 두고 재사용합니다.
  const repositories = useMemo(
    () => ({
      indexeddb: new IndexedDbAssessmentRepository(),
      memory: new InMemoryAssessmentRepository(),
    }),
    [],
  );

  useEffect(() => {
    let alive = true;
    // 시크릿 모드 등에서는 IndexedDB를 열 수 없습니다. 그때는 메모리로 폴백합니다.
    void isIndexedDbUsable().then((usable) => {
      if (alive) setStorage(usable ? "indexeddb" : "memory");
    });
    return () => {
      alive = false;
    };
  }, []);

  const services = useMemo<AssessmentServices | null>(() => {
    if (storage === null) return null;
    const repository = storage === "indexeddb" ? repositories.indexeddb : repositories.memory;
    return {
      deps: {
        repository,
        catalog: staticAssessmentCatalog,
        clock: systemClock,
        idGenerator: randomIdGenerator,
      },
      preferences: repository,
      storage,
    };
  }, [storage, repositories]);

  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

/**
 * 저장소가 준비되기 전에는 `null`입니다.
 * 정적인 화면(문항 텍스트·설명)은 그동안에도 그대로 보이고,
 * 저장이 필요한 부분만 잠깐 기다립니다.
 */
export function useAssessmentServices(): AssessmentServices | null {
  return useContext(ServicesContext);
}
