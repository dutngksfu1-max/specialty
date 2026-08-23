import Image from "next/image";

import type { AssessmentDefinition } from "@/domain/assessment/model/definition";
import type {
  ResolvedAxisNarrative,
  ResolvedResultNarrative,
} from "@/domain/assessment/result/narrative";
import type { AxisRanking } from "@/domain/assessment/result/axisRanking";
import { buildTypeCode } from "@/domain/assessment/result/typeCode";
import type { ResultSnapshot } from "@/domain/assessment/result/snapshot";
import type { AxisId } from "@/domain/shared/ids";
import { Icon } from "@/components/ui/Icon";
import { ResultBalanceMap } from "@/features/result/ResultBalanceMap";
import {
  assessmentPerspectiveTone,
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
  narrative,
}: {
  readonly definition: AssessmentDefinition;
  readonly snapshot: ResultSnapshot;
  readonly narrative: ResolvedResultNarrative;
}) {
  const spec = definition.typeCode;
  const typeCode = buildTypeCode(
    definition.axes,
    snapshot.score.axisScores,
    narrative.balancedAxisIds,
    spec,
  );
  if (typeCode === null || spec === undefined) return null;

  const axisById = new Map(definition.axes.map((axis) => [axis.id, axis]));
  const spokenCode = typeCode.slots
    .map((slot, index) => {
      const axis = axisById.get(slot.axisId);
      return slot.isBalanced
        ? `${index + 1}번째 ${axis?.name ?? "관점"}은 균형이라 비움`
        : `${index + 1}번째 ${axis?.name ?? "관점"}은 ${slot.poleLabel ?? "현재 방향"} ${slot.letter}`;
    })
    .join(", ");

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
          {typeCode.slots.map((slot) => {
            const axis = axisById.get(slot.axisId);
            return (
              <li key={String(slot.axisId)} className="text-caption text-foreground-muted">
                <strong className="font-bold text-foreground">{slot.letter}</strong>{" "}
                {slot.isBalanced ? `${axis?.name ?? "관점"} 균형` : slot.poleLabel}
              </li>
            );
          })}
        </ul>

        {typeCode.hasBalancedSlot && (
          <p className="mt-4 border-l-2 border-accent pl-3 text-body-sm text-foreground-body">
            {spec.balancedNote}
          </p>
        )}
      </div>

      {spec.crosswalk !== undefined && (
        <details className="result-crosswalk border-t border-border bg-surface-muted">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 py-3 text-body-sm font-semibold text-foreground sm:px-5">
            <span>{spec.crosswalk.summaryLabel}</span>
            <Icon
              name="chevron-down"
              className="result-crosswalk-chevron transition-transform duration-(--motion-fast)"
            />
          </summary>
          <div className="border-t border-border px-4 py-4 sm:px-5">
            {typeCode.crosswalkCode === null ? (
              <p className="text-body-sm text-foreground-body">
                {spec.crosswalk.unavailableNote}
              </p>
            ) : (
              <p className="text-body-sm text-foreground-body">
                {spec.crosswalk.systemLabel}{" "}
                <strong className="font-semibold tracking-widest text-foreground">
                  {typeCode.crosswalkCode}
                </strong>
              </p>
            )}
            <p className="mt-2 text-caption text-foreground-muted">
              {spec.crosswalk.disclaimer}
            </p>
          </div>
        </details>
      )}
    </section>
  );
}

function LensSummary({
  index,
  narrative,
  definition,
  ranking,
  isUnreadable = false,
}: {
  readonly index: number;
  readonly narrative: ResolvedAxisNarrative;
  readonly definition: AssessmentDefinition;
  readonly ranking: AxisRanking;
  /** 0점이지만 응답이 갈리지 않은 축. '균형'과 구별해 표시합니다 (DEC-053) */
  readonly isUnreadable?: boolean;
}) {
  const axis = definition.axes.find((candidate) => candidate.id === narrative.axisId);
  const score = ranking.ordered.find((candidate) => candidate.axisId === narrative.axisId);
  const rankIndex = ranking.ordered.findIndex((candidate) => candidate.axisId === narrative.axisId);
  const isBalanced = definition.resultNarrative !== undefined && !narrative.isDirectional;
  // 문구는 콘텐츠가 소유합니다. 콘텐츠가 주지 않으면 예전처럼 균형으로 다룹니다.
  const unreadableLabel = definition.resultNarrative?.unreadableAxisLabel;
  const unreadableNote = definition.resultNarrative?.unreadableAxisNote;
  const showsUnreadable =
    isUnreadable && unreadableLabel !== undefined && unreadableNote !== undefined;
  const side = narrative.reading.direction === "negative" ? "negative" : "positive";
  const pole = side === "positive" ? axis?.positive : axis?.negative;
  const letter =
    definition.typeCode === undefined
      ? undefined
      : isBalanced
        ? definition.typeCode.balancedLetter
        : pole?.code;
  const isPrimary = ranking.primary?.axisId === narrative.axisId;
  const isSharedLead = ranking.isTied && rankIndex >= 0 && rankIndex < 2;
  const showSummary = isPrimary || isSharedLead;
  const tone = assessmentPerspectiveTone(index);

  return (
    <li
      data-result-hero-tone={tone}
      data-balanced={isBalanced ? "true" : "false"}
      data-weight={isPrimary ? "primary" : isSharedLead ? "shared" : "supporting"}
      className={`result-hero-lens assessment-perspective-card assessment-perspective-card--${tone} min-w-0 p-4 sm:p-5 ${isPrimary ? "sm:col-span-2" : ""}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {letter !== undefined && (
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-xs border border-current text-h3 font-bold"
            >
              {letter}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-caption text-foreground-muted">{axis?.name}</p>
            <p className="text-body-sm font-semibold text-foreground">
              {showsUnreadable ? unreadableLabel : isBalanced ? "균형" : pole?.shortLabel}
            </p>
          </div>
        </div>
        {(isBalanced || isPrimary || isSharedLead) && (
          <span className="shrink-0 rounded-xs border border-border-strong bg-surface px-2 py-1 text-caption font-semibold text-foreground-muted">
            {showsUnreadable
              ? unreadableLabel
              : isBalanced
                ? "균형 관점"
                : isPrimary
                  ? "가장 도드라짐"
                  : "함께 도드라짐"}
          </span>
        )}
      </div>

      {/*
        응답이 갈리지 않은 축에는 균형 문구를 쓰지 않습니다 (DEC-053).
        "두 방식을 비슷하게 쓰신다"는 말은 답을 고르지 않은 분께는 지어낸 해석입니다.
      */}
      {showsUnreadable ? (
        <p className="mt-4 text-body-sm text-foreground-body">{unreadableNote}</p>
      ) : (
        <>
          <h3 className="mt-4 text-h3 text-foreground">{narrative.reading.headline}</h3>
          {showSummary && (
            <p className="mt-2 text-body-sm text-foreground-body">{narrative.reading.summary}</p>
          )}
          <p className="mt-3 border-t border-border pt-3 text-body-sm text-foreground-muted">
            {narrative.reading.rhythm}
          </p>
        </>
      )}
      {score !== undefined && <span className="sr-only">기울기 크기 {score.absScore}</span>}
    </li>
  );
}

export function ResultHero({
  definition,
  snapshot,
  nickname,
  narrative,
  ranking,
  presentation,
  unreadableAxisIds,
}: {
  readonly definition: AssessmentDefinition;
  readonly snapshot: ResultSnapshot;
  readonly nickname: string;
  readonly narrative: ResolvedResultNarrative;
  readonly ranking: AxisRanking;
  readonly presentation?: AssessmentPresentation;
  /** 0점이지만 응답이 갈리지 않아 방향을 읽을 수 없는 축 (DEC-053) */
  readonly unreadableAxisIds?: ReadonlySet<AxisId>;
}) {
  const hasBalancedAxes = narrative.balancedAxisIds.size > 0;
  const artwork = findTypeArtwork(
    presentation,
    snapshot.score.resultKey,
    hasBalancedAxes,
    snapshot.characterGender,
  );

  return (
    <header className="assessment-card-deck hero-enter overflow-hidden rounded-(--radius-hero) border border-primary-soft-border bg-primary-soft">
      <div
        className={`grid min-w-0 items-center gap-6 p-5 sm:p-8 lg:p-10 ${artwork === undefined ? "" : "md:grid-cols-[minmax(0,1.35fr)_minmax(13rem,0.65fr)]"}`}
      >
        <div className="min-w-0">
          <p className="text-caption font-semibold text-primary-active">
            검사 결과 · {withHonorific(nickname)}
          </p>
          <h1 className="mt-3 max-w-prose text-display-lg text-foreground">
            {narrative.title}
          </h1>
          <TypeCodePanel definition={definition} snapshot={snapshot} narrative={narrative} />
          <p className="mt-5 max-w-prose text-body-lg font-medium text-foreground-body sm:text-body-lg-desktop">
            {narrative.oneLiner}
          </p>
        </div>

        {artwork !== undefined && (
          <figure className="mx-auto w-full max-w-60 border-y border-primary-soft-border py-3 md:justify-self-end">
            <Image
              src={artwork.src}
              width={artwork.width}
              height={artwork.height}
              alt={artwork.alt}
              aria-hidden="true"
              sizes="(max-width: 767px) 240px, 288px"
              className="h-auto w-full"
            />
            <figcaption className="mt-1 text-center text-caption font-semibold text-primary-active">
              나의 유형을 닮은 캐릭터
            </figcaption>
          </figure>
        )}
      </div>

      <div className="grid min-w-0 border-t border-primary-soft-border bg-surface lg:grid-cols-[minmax(0,1.18fr)_minmax(20rem,0.82fr)]">
        <section className="min-w-0 p-5 sm:p-8 lg:p-10">
          <p className="text-caption font-semibold text-accent">코드를 이루는 렌즈</p>
          <h2 className="mt-2 text-h2 text-foreground sm:text-h2-lg">나온 유형 요소 설명</h2>
          <p className="mt-2 max-w-prose text-body-sm text-foreground-muted">
            각 글자가 어떤 관점을 뜻하고, 지금의 응답에서 어떻게 나타났는지 함께 읽어 보세요.
          </p>
          <ol className="mt-5 grid gap-3 sm:grid-cols-2">
            {narrative.axes.map((item, index) => (
              <LensSummary
                key={String(item.axisId)}
                index={index}
                narrative={item}
                definition={definition}
                ranking={ranking}
                isUnreadable={unreadableAxisIds?.has(item.axisId) ?? false}
              />
            ))}
          </ol>
        </section>

        <section className="min-w-0 border-t border-border bg-surface-muted p-5 sm:p-8 lg:border-t-0 lg:border-l lg:p-10">
          <p className="text-caption font-semibold text-accent">밸런스 지도</p>
          <h2 className="mt-2 text-h2 text-foreground sm:text-h2-lg">
            {definition.axes.length}개 관점을 한눈에
          </h2>
          <p className="mt-2 text-body-sm text-foreground-muted">
            마주 보는 두 방향 사이에서 현재 기울기와 균형을 한 모양으로 살펴봅니다.
          </p>
          <div className="mt-5">
            <ResultBalanceMap
              axes={definition.axes}
              scores={snapshot.score.axisScores}
              narratives={narrative.axes}
              balancedAxisIds={narrative.balancedAxisIds}
            />
          </div>
        </section>
      </div>

      <section className="grid min-w-0 gap-3 border-t border-primary-soft-border bg-surface-inset p-5 sm:p-8 md:grid-cols-[auto_minmax(0,1fr)] md:gap-8 lg:p-10">
        <p className="text-label font-semibold text-primary-active">나의 교직 리듬</p>
        <p className="max-w-prose text-body-lg text-foreground-body sm:text-body-lg-desktop">
          {narrative.rhythm}
        </p>
      </section>
    </header>
  );
}
