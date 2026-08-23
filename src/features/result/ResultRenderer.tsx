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
} from "@/domain/assessment/result/axisRanking";
import { emphasizeText } from "@/domain/assessment/result/emphasis";
import {
  resolveResultNarrative,
  type ResolvedAxisNarrative,
} from "@/domain/assessment/result/narrative";
import type { ResultProfile, SceneNote } from "@/domain/assessment/result/profile";
import type {
  AssessmentSignals,
  AxisContextSplit,
} from "@/domain/assessment/result/signals";
import type { ResultSnapshot } from "@/domain/assessment/result/snapshot";
import type { AxisScore } from "@/domain/assessment/scoring/score";
import { AxisBar } from "@/features/result/AxisBar";
import { ResultNavigation } from "@/features/result/ResultNavigation";
import { ResultHero } from "@/features/result/ResultHero";
import {
  assessmentPerspectiveTone,
  type AssessmentPresentation,
} from "@/lib/assessmentPresentation";

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

function signedNumber(value: number, fractionDigits = 0): string {
  const formatted = value.toLocaleString("ko-KR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return value > 0 ? `+${formatted}` : formatted;
}

function contextLabel(context: string): string {
  return CONTEXT_LABELS[context] ?? context;
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

/**
 * 줄글에서 핵심 어구만 살짝 도드라지게 합니다.
 *
 * 강조 대상은 콘텐츠(`emphasisTerms`)가 정하고, 한 문장에 몇 개까지 칠할지는
 * `emphasizeText`가 막습니다. 색을 크게 쓰지 않고 **굵기 + 진한 잉크**로 처리해
 * "강조는 크기 → 여백 → 굵기 → 색" 순서(docs/design.md)를 지킵니다.
 */
function EmphasizedText({
  text,
  terms,
}: {
  readonly text: string;
  readonly terms?: readonly string[];
}) {
  if (terms === undefined || terms.length === 0) return <>{text}</>;

  return (
    <>
      {emphasizeText(text, terms).map((segment, index) =>
        segment.emphasized ? (
          <strong key={index} className="font-semibold text-foreground">
            {segment.text}
          </strong>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}

function AxisInsightCard({
  index,
  axis,
  score,
  narrative,
  terms,
}: {
  readonly index: number;
  readonly axis: AssessmentAxis;
  readonly score: AxisScore;
  readonly narrative?: ResolvedAxisNarrative;
  readonly terms?: readonly string[];
}) {
  const tone = assessmentPerspectiveTone(index);

  return (
    <section
      data-perspective-tone={tone}
      className={`assessment-perspective-card assessment-perspective-card--${tone} result-axis-card flex h-full min-w-0 flex-col overflow-hidden p-5 sm:p-6`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="result-axis-card-kicker inline-flex items-center gap-2 text-caption font-bold tabular-nums">
          <span aria-hidden="true" className="assessment-perspective-marker shrink-0" />
          관점 {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      <h3 className="result-axis-card-title mt-4 text-h3 text-foreground sm:text-h3-lg">
        {narrative?.reading.headline ?? axis.name}
      </h3>
      {narrative !== undefined && (
        <p className="result-axis-card-summary mt-2 text-body text-foreground-body">
          <EmphasizedText text={narrative.reading.summary} terms={terms} />
        </p>
      )}

      <div className="result-axis-card-chart mt-5 border-t pt-5 md:mt-auto">
        <AxisBar
          axis={axis}
          score={score}
          intensityBandId={narrative?.reading.intensityBandId}
        />
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

function ScenePoints({
  items,
  terms,
}: {
  readonly items: readonly SceneNote[];
  readonly terms?: readonly string[];
}) {
  return (
    <ul className="result-scene-list mt-5 grid gap-3 md:grid-cols-3">
      {items.map((item) => (
        <li key={`${item.scene}-${item.situation}`} className="result-scene-item min-w-0">
          {/*
            상황 제목이 먼저 눈에 들어와야 합니다 (DEC-054).
            문단만 늘어놓으면 눈이 걸릴 곳이 없어 "뭘 얘기하려는 거지?"가 됩니다.
          */}
          <p className="flex min-w-0 items-center gap-1.5 text-caption font-medium text-foreground-muted">
            <Icon name={iconForScene(item.scene)} className="size-4 shrink-0" />
            <span className="truncate">{item.scene}</span>
          </p>
          <p className="result-scene-situation mt-1.5 text-body font-semibold text-foreground">
            {item.situation}
          </p>
          <p className="mt-2 text-body-sm text-foreground-body">
            <EmphasizedText text={item.text} terms={terms} />
          </p>
        </li>
      ))}
    </ul>
  );
}

/**
 * 세 묶음은 서로 다른 면으로 읽혀야 합니다 (DEC-054).
 *
 * 예전에는 셋이 같은 면 위에 같은 모양으로 이어져서, 지금 읽는 것이
 * 강점인지 주의 신호인지 구분되지 않았습니다. 색만으로 나누면 색각 이상 사용자에게
 * 정보가 사라지므로 **면·아이콘·표식 모양**을 함께 다르게 둡니다.
 */
type SceneGroupTone = "strength" | "pressure" | "colleague";

function SceneGroup({
  tone,
  index,
  title,
  description,
  icon,
  items,
  terms,
}: {
  readonly tone: SceneGroupTone;
  readonly index: number;
  readonly title: string;
  readonly description: string;
  readonly icon: IconName;
  readonly items: readonly SceneNote[];
  readonly terms?: readonly string[];
}) {
  return (
    <section data-scene-tone={tone} className="result-scene-group min-w-0 p-5 sm:p-7">
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden="true"
          className="result-scene-badge flex size-10 shrink-0 items-center justify-center rounded-sm"
        >
          <Icon name={icon} />
        </span>
        <div className="min-w-0">
          <p className="result-scene-index text-caption font-semibold tabular-nums">
            {String(index).padStart(2, "0")}
          </p>
          <h3 className="mt-0.5 text-h3 text-foreground sm:text-h3-lg">{title}</h3>
          <p className="mt-1 max-w-prose text-body-sm text-foreground-muted">{description}</p>
        </div>
      </div>
      <ScenePoints items={items} terms={terms} />
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
  presentation,
}: {
  readonly definition: AssessmentDefinition;
  readonly snapshot: ResultSnapshot;
  readonly profile: ResultProfile;
  readonly nickname: string;
  /** 응답이 지워졌으면 없을 수 있으며, 없어도 기본 결과는 온전히 보여야 합니다. */
  readonly signals?: AssessmentSignals;
  readonly presentation?: AssessmentPresentation;
}) {
  const axisById = new Map(definition.axes.map((axis) => [String(axis.id), axis]));
  const narrative = resolveResultNarrative(definition, snapshot.score.axisScores, profile);
  const hasBalancedAxes = narrative.balancedAxisIds.size > 0;
  // 0점이지만 응답이 갈리지 않은 축입니다. 균형과 구별해서 다룹니다 (DEC-053).
  // 응답이 지워졌으면 signals가 없고, 그때는 예전처럼 전부 균형으로 봅니다.
  const unreadableAxisIds = new Set(signals?.unreadableAxisIds ?? []);
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
  const emphasisTerms = definition.resultNarrative?.emphasisTerms;
  const narrativeById = new Map(narrative.axes.map((item) => [String(item.axisId), item]));
  const scaleExtent = Math.max(
    ...definition.scale.options.map((option) =>
      Math.abs(option.value - definition.scale.centerValue),
    ),
    1,
  );

  return (
    <article>
      <ResultHero
        definition={definition}
        snapshot={snapshot}
        nickname={nickname}
        narrative={narrative}
        ranking={ranking}
        presentation={presentation}
        unreadableAxisIds={unreadableAxisIds}
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-4">
        <div className="lg:col-start-4 lg:row-start-1">
          <ResultNavigation items={RESULT_NAVIGATION} />
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

            <div className="result-axis-card-grid mt-6 grid gap-4 md:auto-rows-fr md:grid-cols-2">
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
                    terms={emphasisTerms}
                  />
                );
              })}
            </div>

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
                        <p className="mt-4 text-body text-foreground-body">
                          <EmphasizedText text={combination.text} terms={emphasisTerms} />
                        </p>
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
            {/* 한 덩어리로 이어 붙이지 않고 묶음마다 면을 끊습니다 (DEC-054). */}
            <div className="mt-6 grid gap-4">
              <SceneGroup
                tone="strength"
                index={1}
                terms={emphasisTerms}
                title="강점이 드러나는 장면"
                description="지금의 교직 스타일이 그대로 힘이 되는 상황입니다."
                icon="check"
                items={guidance.shiningMoments}
              />
              <SceneGroup
                tone="pressure"
                index={2}
                terms={emphasisTerms}
                title="여유가 줄었을 때 나타나는 모습"
                description="단점이 아니라, 바빠지면 먼저 나타나는 신호입니다."
                icon="warning"
                items={guidance.underPressure}
              />
              <SceneGroup
                tone="colleague"
                index={3}
                terms={emphasisTerms}
                title="동료와 함께 일할 때"
                description="학년과 학교 안에서 이 스타일이 드러나는 방식입니다."
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
          </section>
        </div>
      </div>
    </article>
  );
}
