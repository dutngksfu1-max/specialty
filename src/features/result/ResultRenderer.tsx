import type { CSSProperties, ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";
import type {
  AssessmentAxis,
  AssessmentDefinition,
  PoleSide,
} from "@/domain/assessment/model/definition";
import { resolveAxisCombinations } from "@/domain/assessment/result/axisCombination";
import {
  resolveAxisRanking,
  type AxisRanking,
} from "@/domain/assessment/result/axisRanking";
import {
  resolveResultNarrative,
  type ResolvedAxisNarrative,
} from "@/domain/assessment/result/narrative";
import type { ResultProfile, SceneNote } from "@/domain/assessment/result/profile";
import type {
  AssessmentSignals,
  AxisConfidence,
  AxisConsistency,
  AxisContextSplit,
  ResponseStyle,
} from "@/domain/assessment/result/signals";
import type { ResultSnapshot } from "@/domain/assessment/result/snapshot";
import type { AxisScore } from "@/domain/assessment/scoring/score";
import { AxisBar } from "@/features/result/AxisBar";
import { TypeEmblem } from "@/features/result/TypeEmblem";
import { DISCLAIMER } from "@/lib/siteCopy";

/**
 * 결과 본문 (DEC-038 · DEC-045 · Phase D)
 *
 * 엔진이 계산한 연속 점수와 신호를 다시 판단하지 않고, 카드와 차트로 번역합니다.
 * 결과 키는 내부 식별자이므로 화면에 출력하지 않습니다.
 */

const RESULT_NAVIGATION = [
  { href: "#result-overview", number: "01", label: "한눈에 보는 나" },
  { href: "#result-scenes", number: "02", label: "교실에서의 모습" },
  { href: "#result-collaboration", number: "03", label: "함께 일하는 방식" },
  { href: "#result-next", number: "04", label: "다음 대화로" },
] as const;

const CONTEXT_LABELS: Readonly<Record<string, string>> = {
  lesson: "수업",
  guidance: "생활지도",
  admin: "업무",
  colleague: "동료",
  family: "학부모",
  self: "혼자",
};

const CONFIDENCE_LABELS = {
  low: "낮음",
  medium: "보통",
  high: "높음",
} as const;

const CONFIDENCE_REASON_LABELS = {
  balanced: "균형 구간",
  split: "문항에 따라 크게 갈림",
  centered: "가운데 응답 비중",
} as const;

const CONSISTENCY_LABELS = {
  steady: "문항에서 비슷하게 답함",
  mixed: "문항에 따라 조금씩 다름",
  split: "문항에 따라 크게 갈림",
} as const;

const RESPONSE_STYLE_LABELS = {
  wide: "척도를 넓게 쓴 응답",
  moderate: "기본 응답 폭",
  centered: "가운데 응답이 많은 응답",
} as const;

function signedNumber(value: number, fractionDigits = 0): string {
  const formatted = value.toLocaleString("ko-KR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return value > 0 ? `+${formatted}` : formatted;
}

function percentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function contextLabel(context: string): string {
  return CONTEXT_LABELS[context] ?? context;
}

function withHonorific(nickname: string): string {
  const trimmed = nickname.trim();
  return trimmed.endsWith("님") ? trimmed : `${trimmed} 님`;
}

function ResultNavigation() {
  return (
    <nav
      aria-label="결과 내용 바로가기"
      className="rounded-lg border border-border bg-surface lg:sticky lg:top-6"
    >
      <p className="border-b border-border px-4 py-3 text-caption font-semibold text-foreground-subtle">
        결과 순서
      </p>
      <ol className="grid grid-cols-2 lg:grid-cols-1">
        {RESULT_NAVIGATION.map((item, index) => (
          <li
            key={item.href}
            className={`${index >= 2 ? "border-t border-border" : ""} ${index % 2 === 1 ? "border-l border-border lg:border-l-0" : ""} ${index > 0 ? "lg:border-t lg:border-border" : ""}`}
          >
            <a
              href={item.href}
              className="flex min-h-12 items-center gap-3 px-4 py-3 text-body-sm font-medium text-foreground-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              <span className="font-bold tabular-nums text-accent" aria-hidden="true">
                {item.number}
              </span>
              <span>{item.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function ChapterHeading({
  number,
  title,
  description,
}: {
  readonly number: string;
  readonly title: string;
  readonly description: React.ReactNode;
}) {
  return (
    <header className="border-b border-border pb-5">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-primary-soft-border bg-primary-soft text-caption font-bold tabular-nums text-primary-active"
        >
          {number}
        </span>
        <h2 className="text-h1 text-foreground sm:text-h1-lg">{title}</h2>
      </div>
      <p className="mt-3 max-w-prose text-body text-foreground-muted">{description}</p>
    </header>
  );
}

function ConfidenceBadge({ confidence }: { readonly confidence: AxisConfidence }) {
  const icon: IconName =
    confidence.id === "high" ? "check" : confidence.id === "low" ? "warning" : "compass";

  return (
    <span
      data-confidence={confidence.id}
      className="result-confidence inline-flex min-h-8 items-center gap-1.5 rounded-xs border px-2 py-1 text-caption font-semibold"
    >
      <Icon name={icon} className="size-4" />
      확신도 {CONFIDENCE_LABELS[confidence.id]}
    </span>
  );
}

function ConsistencyMeter({ consistency }: { readonly consistency: AxisConsistency }) {
  const activeSegments = consistency.bandId === "steady" ? 1 : consistency.bandId === "mixed" ? 2 : 3;
  const label = CONSISTENCY_LABELS[consistency.bandId];

  return (
    <div className="min-w-0">
      <div
        className="grid grid-cols-3 gap-1"
        role="img"
        aria-label={`응답 일관성: ${label}`}
      >
        {[1, 2, 3].map((segment) => (
          <span
            key={segment}
            data-active={segment <= activeSegments ? "true" : "false"}
            data-level={segment}
            className="result-consistency-segment h-2 rounded-xs"
          />
        ))}
      </div>
      <p className="mt-2 text-caption text-foreground-muted">응답 일관성 · {label}</p>
    </div>
  );
}

function AxisInsightCard({
  index,
  axis,
  score,
  narrative,
  consistency,
  confidence,
}: {
  readonly index: number;
  readonly axis: AssessmentAxis;
  readonly score: AxisScore;
  readonly narrative?: ResolvedAxisNarrative;
  readonly consistency?: AxisConsistency;
  readonly confidence?: AxisConfidence;
}) {
  return (
    <section className="assessment-card min-w-0 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-caption font-bold tabular-nums text-primary-active">
          관점 {String(index + 1).padStart(2, "0")}
        </span>
        {confidence !== undefined && <ConfidenceBadge confidence={confidence} />}
      </div>

      <h3 className="mt-4 text-h3 text-foreground sm:text-h3-lg">
        {narrative?.reading.headline ?? axis.name}
      </h3>
      {narrative !== undefined && (
        <p className="mt-2 text-body text-foreground-body">{narrative.reading.summary}</p>
      )}

      <div className="mt-5 border-y border-border py-5">
        <AxisBar
          axis={axis}
          score={score}
          intensityBandId={narrative?.reading.intensityBandId}
        />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-caption font-semibold text-foreground-subtle">근거</p>
          <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-body-sm">
            <div>
              <dt className="inline text-foreground-muted">축 점수 </dt>
              <dd className="inline font-bold tabular-nums text-foreground">
                {signedNumber(score.rawScore)}
              </dd>
            </div>
            {consistency !== undefined && (
              <div>
                <dt className="inline text-foreground-muted">응답 문항 </dt>
                <dd className="inline font-bold tabular-nums text-foreground">
                  {consistency.questionCount}개
                </dd>
              </div>
            )}
          </dl>
        </div>
        {consistency !== undefined && <ConsistencyMeter consistency={consistency} />}
      </div>

      {confidence !== undefined && confidence.reasons.length > 0 && (
        <p className="mt-4 text-caption text-foreground-muted">
          살펴볼 점 · {confidence.reasons.map((reason) => CONFIDENCE_REASON_LABELS[reason]).join(" · ")}
        </p>
      )}

      {narrative?.counterEvidence !== undefined && (
        <p className="mt-5 border-t border-dashed border-border pt-4 text-body-sm text-foreground-muted">
          <span className="font-semibold text-foreground-body">이 설명이 안 맞는다면 — </span>
          {narrative.counterEvidence}
        </p>
      )}
    </section>
  );
}

function WeightCenter({
  ranking,
  axes,
  scores,
}: {
  readonly ranking: AxisRanking;
  readonly axes: readonly AssessmentAxis[];
  readonly scores: readonly AxisScore[];
}) {
  const axisById = new Map(axes.map((axis) => [String(axis.id), axis]));
  const scoreById = new Map(scores.map((score) => [String(score.axisId), score]));

  return (
    <section className="assessment-card mt-6 p-5 sm:p-7">
      <div className="grid gap-6 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-start">
        <div>
          <p className="text-caption font-semibold text-accent">무게중심</p>
          <h3 className="mt-2 text-h3 text-foreground sm:text-h3-lg">
            {ranking.isTied ? "비슷하게 도드라지는 두 관점" : "내 안에서 도드라지는 관점"}
          </h3>
          <p className="mt-2 text-body-sm text-foreground-muted">
            네 관점을 다른 사람과 견주지 않고, 내 응답 안에서만 나란히 놓았습니다.
          </p>
        </div>

        <ol className="grid gap-4">
          {ranking.ordered.map((ranked, index) => {
            const axis = axisById.get(String(ranked.axisId));
            const score = scoreById.get(String(ranked.axisId));
            if (axis === undefined || score === undefined) return null;

            const extent = Math.max(Math.abs(score.minScore), Math.abs(score.maxScore), 1);
            const width = Math.min((ranked.absScore / extent) * 100, 100);
            const rankLabel = ranking.isTied
              ? index < 2
                ? "비슷한 관점"
                : undefined
              : index === 0
                ? "주축"
                : index === 1
                  ? "부축"
                  : undefined;

            return (
              <li key={String(ranked.axisId)} className="min-w-0">
                <div className="flex min-w-0 items-baseline justify-between gap-4 text-body-sm">
                  <span className="min-w-0 font-semibold text-foreground">{axis.name}</span>
                  <span className="shrink-0 text-caption text-foreground-muted">
                    {rankLabel !== undefined && `${rankLabel} · `}
                    <span className="tabular-nums">{ranked.absScore}</span>
                  </span>
                </div>
                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-surface-inset"
                  role="img"
                  aria-label={`${axis.name}, 기울기 크기 ${ranked.absScore}`}
                >
                  <span
                    className="result-ranking-fill block h-full rounded-full"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function contextPosition(mean: number, extent: number): number {
  return Math.min(Math.max(((mean + extent) / (extent * 2)) * 100, 0), 100);
}

function ContextSplitCard({
  split,
  axis,
  scaleExtent,
}: {
  readonly split: AxisContextSplit;
  readonly axis: AssessmentAxis;
  readonly scaleExtent: number;
}) {
  const highPosition = contextPosition(split.high.mean, scaleExtent);
  const lowPosition = contextPosition(split.low.mean, scaleExtent);
  const connectorLeft = Math.min(highPosition, lowPosition);
  const connectorWidth = Math.abs(highPosition - lowPosition);
  const chartStyle = {
    "--context-high": `${highPosition}%`,
    "--context-low": `${lowPosition}%`,
    "--context-connector-left": `${connectorLeft}%`,
    "--context-connector-width": `${connectorWidth}%`,
  } as CSSProperties;

  return (
    <section className="assessment-card min-w-0 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-caption font-semibold text-primary-active">장면 차이</p>
          <h4 className="mt-1 text-h3 text-foreground">{axis.name}</h4>
        </div>
        <span className="rounded-xs border border-border-strong bg-surface-muted px-2 py-1 text-caption font-semibold tabular-nums text-foreground-body">
          격차 {split.gap.toFixed(1)}
        </span>
      </div>

      <div
        className="result-context-chart relative mt-6 h-10"
        style={chartStyle}
        role="img"
        aria-label={`${contextLabel(split.low.context)} 평균 ${signedNumber(split.low.mean, 1)}에서 ${contextLabel(split.high.context)} 평균 ${signedNumber(split.high.mean, 1)}까지, 격차 ${split.gap.toFixed(1)}`}
      >
        <span aria-hidden="true" className="result-context-connector absolute" />
        <span aria-hidden="true" className="result-context-zero absolute" />
        <span aria-hidden="true" data-kind="low" className="result-context-marker absolute" />
        <span aria-hidden="true" data-kind="high" className="result-context-marker absolute" />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4">
        {[split.low, split.high].map((sample, index) => (
          <div key={sample.context} className={index === 1 ? "text-right" : undefined}>
            <dt className="text-body-sm font-semibold text-foreground">{contextLabel(sample.context)}</dt>
            <dd className="mt-1 text-caption text-foreground-muted">
              평균 <strong className="tabular-nums text-foreground-body">{signedNumber(sample.mean, 1)}</strong>
              <br />
              {sample.questionCount}문항 · 문항 방향 {sample.positiveCount}:{sample.negativeCount}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ResponsePattern({ responseStyle }: { readonly responseStyle: ResponseStyle }) {
  const extreme = Math.min(Math.max(responseStyle.extremeRate * 100, 0), 100);
  const middle = Math.min(Math.max(responseStyle.middleRate * 100, 0), 100 - extreme);
  const style = {
    "--response-extreme": `${extreme}%`,
    "--response-middle": `${middle}%`,
  } as CSSProperties;

  return (
    <div>
      <p className="text-caption font-semibold text-accent">응답 폭</p>
      <h4 className="mt-1 text-h3 text-foreground">{RESPONSE_STYLE_LABELS[responseStyle.id]}</h4>
      <div
        className="result-response-bar mt-5 flex h-3 overflow-hidden rounded-full bg-surface-inset"
        style={style}
        role="img"
        aria-label={`양 끝 선택 ${percentage(responseStyle.extremeRate)}, 가운데 선택 ${percentage(responseStyle.middleRate)}`}
      >
        <span className="result-response-extreme h-full" />
        <span className="result-response-middle h-full" />
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-3 text-caption">
        <div>
          <dt className="text-foreground-muted">양 끝 선택</dt>
          <dd className="mt-1 font-bold tabular-nums text-foreground">{percentage(responseStyle.extremeRate)}</dd>
        </div>
        <div>
          <dt className="text-foreground-muted">가운데 선택</dt>
          <dd className="mt-1 font-bold tabular-nums text-foreground">{percentage(responseStyle.middleRate)}</dd>
        </div>
        <div>
          <dt className="text-foreground-muted">응답</dt>
          <dd className="mt-1 font-bold tabular-nums text-foreground">{responseStyle.answeredCount}개</dd>
        </div>
      </dl>
    </div>
  );
}

function ReadingGuide({
  signals,
  axes,
  scopeNote,
}: {
  readonly signals?: AssessmentSignals;
  readonly axes: readonly AssessmentAxis[];
  readonly scopeNote?: string;
}) {
  const axisById = new Map(axes.map((axis) => [String(axis.id), axis]));

  if (signals === undefined && scopeNote === undefined) return null;

  return (
    <section className="assessment-card mt-10 overflow-hidden">
      <header className="border-b border-border p-5 sm:p-7">
        <p className="text-caption font-semibold text-primary-active">해석 안내</p>
        <h3 className="mt-2 text-h3 text-foreground sm:text-h3-lg">이 결과를 읽는 법</h3>
      </header>

      {signals !== undefined && (
        <div className="grid gap-0 md:grid-cols-2 md:divide-x md:divide-border">
          <div className="border-b border-border p-5 md:border-b-0 sm:p-7">
            <ResponsePattern responseStyle={signals.responseStyle} />
          </div>
          <div className="p-5 sm:p-7">
            <p className="text-caption font-semibold text-accent">축별 확신도</p>
            <ul className="mt-3 divide-y divide-border">
              {signals.confidence.map((confidence) => {
                const axis = axisById.get(String(confidence.axisId));
                if (axis === undefined) return null;
                return (
                  <li key={String(confidence.axisId)} className="flex min-w-0 items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="min-w-0 text-body-sm font-medium text-foreground-body">{axis.name}</span>
                    <ConfidenceBadge confidence={confidence} />
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {scopeNote !== undefined && (
        <aside className="flex gap-3 border-t border-border bg-surface-muted p-5 sm:p-7">
          <Icon name="compass" className="mt-0.5 text-primary-active" />
          <div>
            <h4 className="text-label text-foreground">측정 범위</h4>
            <p className="mt-1 text-body-sm text-foreground-muted">{scopeNote}</p>
          </div>
        </aside>
      )}
    </section>
  );
}

function CombinationQuadrant({
  axes,
  poles,
}: {
  readonly axes: readonly [AssessmentAxis, AssessmentAxis];
  readonly poles: Readonly<Record<string, PoleSide>>;
}) {
  const [horizontal, vertical] = axes;
  const horizontalPole = poles[String(horizontal.id)] ?? "positive";
  const verticalPole = poles[String(vertical.id)] ?? "positive";
  const position = {
    "--quadrant-x": horizontalPole === "positive" ? "72%" : "28%",
    "--quadrant-y": verticalPole === "positive" ? "28%" : "72%",
  } as CSSProperties;

  return (
    <div
      className="result-quadrant relative mt-5 h-32 border-y border-border"
      style={position}
      role="img"
      aria-label={`${horizontal.name}은 ${horizontalPole === "positive" ? horizontal.positive.label : horizontal.negative.label}, ${vertical.name}은 ${verticalPole === "positive" ? vertical.positive.label : vertical.negative.label}`}
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-border-strong" />
      <span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px bg-border-strong" />
      <span aria-hidden="true" className="result-quadrant-point absolute" />
      <span className="absolute top-2 left-2 text-caption text-foreground-muted">{vertical.positive.shortLabel}</span>
      <span className="absolute right-2 bottom-2 text-caption text-foreground-muted">{vertical.negative.shortLabel}</span>
      <span className="absolute bottom-2 left-2 text-caption text-foreground-muted">{horizontal.negative.shortLabel}</span>
      <span className="absolute top-2 right-2 text-right text-caption text-foreground-muted">{horizontal.positive.shortLabel}</span>
    </div>
  );
}

function Points({ items, icon = "check" }: { readonly items: readonly string[]; readonly icon?: IconName }) {
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-sm bg-primary-soft text-primary-active">
            <Icon name={icon} className="size-4" />
          </span>
          <span className="max-w-prose">
            {item.replace(/([가-힣]+형)과는,\s*/u, "$1 동료와는 ")}
          </span>
        </li>
      ))}
    </ul>
  );
}

function iconForScene(scene: string): IconName {
  if (scene.includes("수업") || scene.includes("교실")) return "book";
  if (scene.includes("동료") || scene.includes("회의")) return "message";
  if (scene.includes("업무") || scene.includes("준비")) return "layers";
  return "compass";
}

function ScenePoints({ items }: { readonly items: readonly SceneNote[] }) {
  return (
    <ul className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
      {items.map((item) => (
        <li key={`${item.scene}-${item.text}`} className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-xs bg-primary-soft px-2 py-1 text-body-sm font-medium text-primary-active">
            <Icon name={iconForScene(item.scene)} className="size-4" />
            {item.scene}
          </span>
          <p className="mt-2 text-body text-foreground-body">{item.text}</p>
        </li>
      ))}
    </ul>
  );
}

function SceneGroup({
  title,
  description,
  icon,
  items,
}: {
  readonly title: string;
  readonly description: string;
  readonly icon: IconName;
  readonly items: readonly SceneNote[];
}) {
  return (
    <section className="p-5 sm:p-7">
      <div className="flex gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-accent-soft text-accent">
          <Icon name={icon} />
        </span>
        <div>
          <h3 className="text-h3 text-foreground sm:text-h3-lg">{title}</h3>
          <p className="mt-1 text-body-sm text-foreground-muted">{description}</p>
        </div>
      </div>
      <ScenePoints items={items} />
    </section>
  );
}

function NumberedPoints({ items }: { readonly items: readonly string[] }) {
  return (
    <ol className="flex flex-col gap-4">
      {items.map((item, index) => (
        <li key={item} className="flex gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-sm border border-border-strong bg-surface text-caption font-bold tabular-nums text-primary-active"
          >
            {index + 1}
          </span>
          <span className="max-w-prose">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function ActionPanel({
  title,
  description,
  icon,
  children,
}: {
  readonly title: string;
  readonly description: string;
  readonly icon: IconName;
  readonly children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5 sm:p-6">
      <Icon name={icon} className="text-accent" />
      <h3 className="mt-4 text-h3 text-foreground">{title}</h3>
      <p className="mt-2 text-body-sm text-foreground-muted">{description}</p>
      <div className="mt-5 text-body text-foreground-body">{children}</div>
    </section>
  );
}

export function ResultRenderer({
  definition,
  snapshot,
  profile,
  nickname,
  signals,
}: {
  readonly definition: AssessmentDefinition;
  readonly snapshot: ResultSnapshot;
  readonly profile: ResultProfile;
  readonly nickname: string;
  /** 응답이 지워졌으면 없을 수 있으며, 없어도 기본 결과는 온전히 보여야 합니다. */
  readonly signals?: AssessmentSignals;
}) {
  const axisById = new Map(definition.axes.map((axis) => [String(axis.id), axis]));
  const narrative = resolveResultNarrative(definition, snapshot.score.axisScores, profile);
  const hasBalancedAxes = narrative.balancedAxisIds.size > 0;
  const guidance =
    hasBalancedAxes && definition.resultNarrative !== undefined
      ? definition.resultNarrative.balancedGuidance
      : profile;
  const combinationReadings = resolveAxisCombinations(
    definition.axisCombinations,
    profile.poles,
    narrative.balancedAxisIds,
  );
  const ranking = resolveAxisRanking(definition.axes, snapshot.score.axisScores);
  const narrativeById = new Map(narrative.axes.map((item) => [String(item.axisId), item]));
  const consistencyById = new Map(
    signals?.consistency.map((item) => [String(item.axisId), item]) ?? [],
  );
  const confidenceById = new Map(
    signals?.confidence.map((item) => [String(item.axisId), item]) ?? [],
  );
  const scaleExtent = Math.max(
    ...definition.scale.options.map((option) =>
      Math.abs(option.value - definition.scale.centerValue),
    ),
    1,
  );

  return (
    <article>
      {/* 닉네임 → 결과 제목 → 한 줄 설명 → 방향이 분명할 때만 엠블럼 → 교직 리듬 */}
      <header className="assessment-card-deck hero-enter overflow-hidden rounded-(--radius-hero) border border-primary-soft-border bg-primary-soft p-6 sm:p-9 lg:p-10">
        <div
          className={`grid items-center gap-8 ${hasBalancedAxes ? "" : "md:grid-cols-[minmax(0,1fr)_auto]"}`}
        >
          <div>
            <p className="text-caption font-semibold text-primary-active">
              검사 결과 · {withHonorific(nickname)}
            </p>
            <h1 className="mt-3 max-w-prose text-display text-foreground sm:text-display-lg">
              {narrative.title}
            </h1>
            <p className="mt-5 max-w-prose text-h3 font-medium text-foreground-body">
              {narrative.oneLiner}
            </p>
          </div>

          {!hasBalancedAxes && (
            <div className="justify-self-start rounded-lg border border-primary-soft-border bg-surface p-4 md:justify-self-end">
              <TypeEmblem
                axisIds={definition.axes.map((axis) => axis.id)}
                poles={profile.poles}
                size={168}
                label={`${narrative.title} 결과를 나타내는 상징`}
              />
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-3 border-t border-primary-soft-border pt-6 md:grid-cols-[auto_minmax(0,1fr)] md:gap-7">
          <p className="text-label text-primary-active">나의 교직 리듬</p>
          <p className="max-w-prose text-body-lg text-foreground-body sm:text-body-lg-desktop">
            {narrative.rhythm}
          </p>
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-4 lg:items-start">
        <div className="lg:col-start-4 lg:row-start-1">
          <ResultNavigation />
        </div>

        <div className="min-w-0 lg:col-span-3 lg:col-start-1 lg:row-start-1">
          <section id="result-overview" className="scroll-mt-28">
            <ChapterHeading
              number="01"
              title="한눈에 보는 나"
              description={
                <>
                  네 관점이 어느 쪽에 얼마나 가까운지 살펴보세요.
                  <br />
                  어느 한쪽이 더 좋은 것을 뜻하지는 않습니다.
                </>
              }
            />

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {snapshot.score.axisScores.map((score, index) => {
                const axis = axisById.get(String(score.axisId));
                if (axis === undefined) return null;
                return (
                  <AxisInsightCard
                    key={String(score.axisId)}
                    index={index}
                    axis={axis}
                    score={score}
                    narrative={narrativeById.get(String(score.axisId))}
                    consistency={consistencyById.get(String(score.axisId))}
                    confidence={confidenceById.get(String(score.axisId))}
                  />
                );
              })}
            </div>
            <p className="mt-4 max-w-prose text-body-sm text-foreground-subtle">
              이 표시는 어느 쪽에 얼마나 가까운지 보여 주는 참고 구간이며, 등급이나 우열을 뜻하지 않아요.
            </p>

            <WeightCenter
              ranking={ranking}
              axes={definition.axes}
              scores={snapshot.score.axisScores}
            />

            {signals !== undefined && signals.contextSplits.length > 0 && (
              <section className="mt-10">
                <h3 className="text-h3 text-foreground sm:text-h3-lg">장면에 따라 달라지는 점</h3>
                <p className="mt-2 max-w-prose text-body text-foreground-muted">
                  축 합계로는 보이지 않는 장면별 차이입니다. 평균과 문항 수를 함께 살펴보세요.
                </p>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {signals.contextSplits.map((split) => {
                    const axis = axisById.get(String(split.axisId));
                    if (axis === undefined) return null;
                    return (
                      <ContextSplitCard
                        key={String(split.axisId)}
                        split={split}
                        axis={axis}
                        scaleExtent={scaleExtent}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            <ReadingGuide
              signals={signals}
              axes={definition.axes}
              scopeNote={definition.resultNarrative?.scopeNote}
            />

            {combinationReadings.length > 0 && (
              <section className="mt-10">
                <h3 className="text-h3 text-foreground sm:text-h3-lg">두 관점이 함께 드러나는 장면</h3>
                <p className="mt-2 max-w-prose text-body text-foreground-muted">
                  방향이 비교적 분명한 두 관점이 실제 수업과 업무에서 어떻게 이어질 수 있는지 살펴보세요.
                </p>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {combinationReadings.map((combination) => {
                    const spec = definition.axisCombinations.find(
                      (candidate) => candidate.id === combination.id,
                    );
                    const first = spec?.axisIds[0]
                      ? axisById.get(String(spec.axisIds[0]))
                      : undefined;
                    const second = spec?.axisIds[1]
                      ? axisById.get(String(spec.axisIds[1]))
                      : undefined;

                    return (
                      <section
                        key={combination.id}
                        className="assessment-card min-w-0 p-5 sm:p-6"
                      >
                        <p className="text-caption font-semibold text-primary-active">두 관점 렌즈</p>
                        <h4 className="mt-2 text-h3 text-foreground">{combination.title}</h4>
                        {first !== undefined && second !== undefined && (
                          <CombinationQuadrant
                            axes={[first, second]}
                            poles={profile.poles}
                          />
                        )}
                        <p className="mt-4 text-body text-foreground-body">{combination.text}</p>
                      </section>
                    );
                  })}
                </div>
              </section>
            )}
          </section>

          <section id="result-scenes" className="mt-16 scroll-mt-28">
            <ChapterHeading
              number="02"
              title="교실에서 드러나는 모습"
              description="네 가지 결과를 함께 읽어, 수업과 업무에서 자연스럽게 드러나는 모습을 정리했습니다."
            />
            <div className="mt-6 divide-y divide-border rounded-lg border border-border bg-surface">
              <SceneGroup
                title="강점이 드러날 수 있는 장면"
                description="현재 교직 스타일이 힘을 발휘하는 장면이에요."
                icon="check"
                items={guidance.shiningMoments}
              />
              <SceneGroup
                title="바쁠 때 나타날 수 있는 모습"
                description="단점이라기보다 여유가 줄었을 때 먼저 살펴볼 신호예요."
                icon="warning"
                items={guidance.underPressure}
              />
              <SceneGroup
                title="동료와 함께 일할 때"
                description="학년과 학교 안에서 현재 경향이 드러날 수 있는 방식이에요."
                icon="message"
                items={guidance.withColleagues}
              />
            </div>
          </section>

          <section id="result-collaboration" className="mt-16 scroll-mt-28">
            <ChapterHeading
              number="03"
              title="함께 일하는 방식"
              description="누가 더 잘 맞는지를 가르는 내용이 아니라, 서로 다른 리듬 사이에서 무엇이 자연스럽고 무엇을 먼저 말해 두면 좋은지 보여 줍니다."
            />
            <div className="mt-6 grid overflow-hidden rounded-lg border border-border bg-surface md:grid-cols-2 md:divide-x md:divide-border">
              <section className="border-b border-border p-5 md:border-b-0 sm:p-7">
                <p className="text-caption font-semibold text-primary-active">함께할 때 이어지기 쉬운 부분</p>
                <h3 className="mt-2 text-h3 text-foreground">함께할 때 잘 이어지는 점</h3>
                <div className="mt-5 text-body text-foreground-body">
                  <Points items={guidance.collaboration.naturalFit} />
                </div>
              </section>
              <section className="p-5 sm:p-7">
                <p className="text-caption font-semibold text-accent">먼저 말해 두면 좋은 부분</p>
                <h3 className="mt-2 text-h3 text-foreground">미리 맞춰 두면 좋은 점</h3>
                <div className="mt-5 text-body text-foreground-body">
                  <Points items={guidance.collaboration.needsTuning} icon="message" />
                </div>
              </section>
            </div>
          </section>

          <section id="result-next" className="mt-16 scroll-mt-28">
            <ChapterHeading
              number="04"
              title="다음 대화로"
              description="결과를 읽는 데서 멈추지 않고, 내일의 작은 행동과 동료와의 대화로 이어 보세요."
            />
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <ActionPanel
                title="내일 해 볼 것"
                description="부담 없이 하나만 골라도 충분해요."
                icon="compass"
              >
                <NumberedPoints items={guidance.nextSteps} />
              </ActionPanel>
              <ActionPanel
                title="동료와 나눌 질문"
                description="답을 맞히기보다 서로의 다름을 발견하는 질문이에요."
                icon="message"
              >
                <NumberedPoints items={guidance.talkingPoints} />
              </ActionPanel>
            </div>

            <p className="mt-8 flex max-w-prose gap-3 rounded-lg border border-border bg-surface-muted p-5 text-body-sm text-foreground-muted">
              <Icon name="compass" className="mt-0.5 text-primary" />
              <span>{DISCLAIMER}</span>
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
