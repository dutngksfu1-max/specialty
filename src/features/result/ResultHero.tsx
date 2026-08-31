import Image from "next/image";
import type { RefObject } from "react";

import type { AssessmentDefinition } from "@/domain/assessment/model/definition";
import type { ResolvedResultNarrative } from "@/domain/assessment/result/narrative";
import { buildTypeCode } from "@/domain/assessment/result/typeCode";
import type { ResultSnapshot } from "@/domain/assessment/result/snapshot";
import {
  findTypeArtwork,
  type AssessmentPresentation,
} from "@/lib/assessmentPresentation";

function withHonorific(nickname: string): string {
  const trimmed = nickname.trim();
  return trimmed.endsWith("님") ? trimmed : `${trimmed} 님`;
}

function TypeCodePanel({
  definition,
  snapshot,
}: {
  readonly definition: AssessmentDefinition;
  readonly snapshot: ResultSnapshot;
}) {
  const spec = definition.typeCode;
  const typeCode = buildTypeCode(definition.axes, snapshot.score.axisScores, spec);
  if (typeCode === null || spec === undefined) return null;

  const axisById = new Map(definition.axes.map((axis) => [axis.id, axis]));
  const spokenCode = typeCode.slots
    .map((slot, index) => {
      const axis = axisById.get(slot.axisId);
      const place = `${index + 1}번째 ${axis?.name ?? "관점"}`;
      return `${place}은 ${slot.poleLabel} ${slot.letter}`;
    })
    .join(", ");

  const hasCrosswalk = typeCode.crosswalkCode !== null;

  return (
    <section className="mt-6 overflow-hidden rounded-lg border border-primary-soft-border bg-surface">
      <div className="p-4 sm:p-5">
        <p className="text-caption font-semibold text-primary-active">{spec.label}</p>
        <p className="sr-only">{spokenCode}</p>
        <div aria-hidden="true" className="mt-3 flex min-w-0 flex-wrap gap-2">
          {typeCode.slots.map((slot) => (
            <span
              key={String(slot.axisId)}
              className="grid min-w-12 place-items-center rounded-xs border border-border-strong bg-background px-2 py-1 text-display font-bold tabular-nums text-foreground"
            >
              {slot.letter}
            </span>
          ))}
        </div>

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2" aria-hidden="true">
          {typeCode.slots.map((slot) => (
            <li key={String(slot.axisId)} className="text-caption text-foreground-muted">
              <strong className="font-bold text-foreground">{slot.letter}</strong>{" "}
              {slot.poleLabel}
            </li>
          ))}
        </ul>
      </div>

      {/*
        환산 표기는 접지 않고 항상 보입니다 (DEC-057).
        4렌즈 코드와는 구분선으로 나뉘어, 같은 카드 안의 **다른 구역**으로 읽힙니다.
      */}
      {spec.crosswalk !== undefined && (
        <div className="result-crosswalk-body border-t border-border px-4 py-4 sm:px-5">
          {/*
            라벨이 값을 '담고' 있어야 합니다 (DEC-056).
            라벨을 위, 값을 아래에 두어 담김을 형태로 보여 줍니다.
          */}
          <div className="grid min-w-0 grid-cols-2 gap-3">
                <div className="result-crosswalk-field min-w-0 overflow-hidden rounded-sm">
                  <p className="result-crosswalk-legend px-3 py-1.5 text-caption font-semibold">
                    {spec.crosswalk.systemLabel}
                  </p>
                  {hasCrosswalk ? (
                    <p className="result-crosswalk-code bg-surface px-3 py-3 text-center text-h2 font-bold">
                      {typeCode.crosswalkCode}
                    </p>
                  ) : (
                    <p className="bg-surface px-3 py-3 text-center text-body-sm font-bold text-foreground-muted">
                      환산 안 함
                    </p>
                  )}
                </div>
                <div className="result-crosswalk-field min-w-0 overflow-hidden rounded-sm">
                  <p className="result-crosswalk-legend px-3 py-1.5 text-caption font-semibold">
                    {spec.crosswalk.selfReportedLabel}
                  </p>
                  <p
                    className={`bg-surface px-3 py-3 text-center font-bold ${
                      snapshot.selfReportedCrosswalkCode == null
                        ? "text-body-sm text-foreground-muted"
                        : "result-crosswalk-code text-h2"
                    }`}
                  >
                    {snapshot.selfReportedCrosswalkCode ?? "입력 안 함"}
                  </p>
                </div>
          </div>
          {!hasCrosswalk && (
            <p className="mt-3 text-body-sm text-foreground-body">
              {spec.crosswalk.unavailableNote}
            </p>
          )}
          {/* 근사라는 사실을 감추지 않습니다 (DEC-049). */}
          <p className="mt-3 text-caption text-foreground-subtle">
            {spec.crosswalk.disclaimer}
          </p>
        </div>
      )}
    </section>
  );
}

export function ResultHero({
  definition,
  snapshot,
  nickname,
  narrative,
  presentation,
  heroRef,
}: {
  readonly definition: AssessmentDefinition;
  readonly snapshot: ResultSnapshot;
  readonly nickname: string;
  readonly narrative: ResolvedResultNarrative;
  readonly presentation?: AssessmentPresentation;
  /** 외부에서 Hero 영역을 캡처할 수 있도록 header 요소를 가리키는 ref */
  readonly heroRef?: RefObject<HTMLElement | null>;
}) {
  const artwork = findTypeArtwork(
    presentation,
    snapshot.score.resultKey,
    snapshot.characterGender,
  );

  return (
    <header ref={heroRef} className="assessment-card-deck hero-enter overflow-hidden rounded-(--radius-hero) border border-primary-soft-border bg-primary-soft">
      <div
        className={`grid min-w-0 items-start gap-6 p-5 sm:p-6 lg:gap-10 lg:p-8 ${artwork === undefined ? "" : "md:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]"}`}
      >
        <div className="min-w-0">
          <p className="text-caption font-semibold text-primary-active">
            검사 결과 · {withHonorific(nickname)}
          </p>
          <h1 className="mt-3 max-w-prose text-display-lg text-foreground">
            {narrative.title}
          </h1>
          <TypeCodePanel definition={definition} snapshot={snapshot} />
          <section
            data-result-rhythm="summary"
            className="result-rhythm-summary mt-5 max-w-prose border-t border-primary-soft-border pt-4 sm:grid sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start sm:gap-4"
          >
            <h2 className="result-rhythm-label inline-flex w-fit rounded-sm bg-accent-soft px-3 py-1.5 text-caption font-semibold text-accent">
              결과 요약
            </h2>
            <p className="mt-3 text-body font-medium text-foreground-body sm:mt-0">
              {narrative.rhythm}
            </p>
          </section>
        </div>

        {artwork !== undefined && (
          <figure
            data-result-character="hero"
            className="mx-auto w-full max-w-84 md:mx-0 md:justify-self-end"
          >
            <figcaption
              data-result-character-label="true"
              className="mb-3 flex justify-center"
            >
              <span className="inline-flex rounded-sm bg-accent-soft px-3 py-1.5 text-label font-semibold text-accent">
                나를 상징하는 캐릭터
              </span>
            </figcaption>
            <div
              data-result-character-frame="true"
              className="border-y border-primary-soft-border py-3"
            >
              <Image
                src={artwork.src}
                width={artwork.width}
                height={artwork.height}
                alt={artwork.alt}
                aria-hidden="true"
                sizes="(max-width: 359px) calc(100vw - 40px), (max-width: 767px) 336px, (max-width: 1023px) 288px, 336px"
                className="h-auto w-full rounded-xs bg-surface"
              />
            </div>
          </figure>
        )}
      </div>
    </header>
  );
}
