"use client";

import type { CSSProperties, ReactNode, RefObject } from "react";
import { useState } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";
import { SegmentedTabs, TabPanel } from "@/components/ui/Tabs";
import type {
  AssessmentAxis,
  AssessmentDefinition,
} from "@/domain/assessment/model/definition";
import {
  resolveAxisRanking,
  type AxisRanking,
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
import { ResultStoryView } from "@/features/result/ResultStoryView";
import {
  assessmentPerspectiveTone,
  type AssessmentPresentation,
} from "@/lib/assessmentPresentation";
import { resultViewHref } from "@/lib/resultViewHref";

/**
 * 결과 본문 (DEC-038 · DEC-045 · Phase D)
 *
 * 엔진이 계산한 연속 점수와 신호를 다시 판단하지 않고, 카드와 차트로 번역합니다.
 * 결과 키는 내부 식별자이므로 화면에 출력하지 않습니다.
 */

const RESULT_NAVIGATION = [
  { href: "#result-overview", number: "01", label: "한눈에 보는 나" },
  { href: "#result-scenes", number: "02", label: "교실에서의 모습" },
  { href: "#result-collaboration", number: "03", label: "나와 너무 다른 선생님과는" },
  { href: "#result-next", number: "04", label: "다음 대화로" },
] as const;

/**
 * 결과를 어느 깊이로 읽을지 — 주소의 `?view=`와 같은 값입니다.
 *
 * `story`는 DEC-069로 붙인 세 번째 갈래입니다. 요약·자세히와 **같은 데이터**를 읽고
 * 배치만 다르게 하므로, 이 값을 지우면 기존 두 갈래가 그대로 남습니다.
 */
type ResultViewKey = "detail" | "story";

const RESULT_VIEW_KEYS: readonly ResultViewKey[] = ["detail", "story"];

function toResultViewKey(value: string | null): ResultViewKey {
  return RESULT_VIEW_KEYS.find((candidate) => candidate === value) ?? "detail";
}

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
    <header className="border-b border-border pb-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-primary-soft-border bg-primary-soft text-caption font-bold tabular-nums text-primary-active"
        >
          {number}
        </span>
        <h2 className="text-h1 text-foreground sm:text-h1-lg">{title}</h2>
      </div>
      <p className="mt-2 max-w-prose text-body text-foreground-muted">{description}</p>
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

/**
 * 관점 카드 한 장 — 이 축에 대해 화면이 말하는 전부입니다.
 *
 * 예전에는 Hero의 '나온 유형 요소 설명' 네 장이 같은 headline·summary를 먼저 보여 주고
 * 이 카드가 같은 문장을 한 번 더 보여 줬습니다. 글자·극 이름·도드라짐 배지를 이 카드로
 * 모아, 한 축은 한 곳에서만 읽도록 합니다.
 *
 * `detail`이 false면 방향 설명과 막대까지 보여 주고, 장면 예시만 덜어냅니다.
 * 요약이 지나치게 짧아지지 않으면서도 반복 읽기를 줄이는 깊이입니다 (DEC-068).
 */
function AxisInsightCard({
  index,
  axis,
  score,
  narrative,
  terms,
  letter,
  poleLabel,
  badge,
  detail = true,
}: {
  readonly index: number;
  readonly axis: AssessmentAxis;
  readonly score: AxisScore;
  readonly narrative?: ResolvedAxisNarrative;
  readonly terms?: readonly string[];
  /** 4렌즈 코드 한 글자 */
  readonly letter?: string;
  readonly poleLabel?: string;
  /** '가장 도드라짐'처럼 순위를 알리는 짧은 말 */
  readonly badge?: string;
  readonly detail?: boolean;
}) {
  const tone = assessmentPerspectiveTone(index);

  return (
    <section
      data-perspective-tone={tone}
      className={`assessment-perspective-card assessment-perspective-card--${tone} result-axis-card flex h-full min-w-0 flex-col overflow-hidden p-4 sm:p-5`}
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
            <p className="result-axis-card-kicker inline-flex items-center gap-2 text-caption font-bold tabular-nums">
              <span aria-hidden="true" className="assessment-perspective-marker shrink-0" />
              관점 {String(index + 1).padStart(2, "0")}
            </p>
            <p className="mt-1 text-caption text-foreground-muted">{axis.name}</p>
            {poleLabel !== undefined && (
              <p className="text-body-sm font-semibold text-foreground">{poleLabel}</p>
            )}
          </div>
        </div>
        {badge !== undefined && (
          <span className="shrink-0 rounded-xs border border-border-strong bg-surface px-2 py-1 text-caption font-semibold text-foreground-muted">
            {badge}
          </span>
        )}
      </div>

      <h3 className="result-axis-card-title mt-3 text-h3 text-foreground sm:text-h3-lg">
        {narrative?.reading.headline ?? axis.name}
      </h3>
      {narrative !== undefined && (
        <p className="result-axis-card-summary mt-2 text-body text-foreground-body">
          <EmphasizedText text={narrative.reading.summary} terms={terms} />
        </p>
      )}

      <div className="result-axis-card-chart mt-4 border-t pt-4 md:mt-auto">
        <AxisBar
          axis={axis}
          score={score}
          intensityBandId={narrative?.intensityBandId}
        />
      </div>

      {detail && narrative !== undefined && (
        <p className="result-axis-card-scene mt-3 text-body-sm text-foreground-muted">
          {narrative.reading.scene}
        </p>
      )}
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
    <section className="assessment-card min-w-0 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-caption font-semibold text-primary-active">상황 차이</p>
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
  /*
    칸 수를 장면 수에 맞춥니다.
    넷을 3열에 넣으면 마지막 하나가 혼자 남아 빈 칸 두 개를 끌고 다녔습니다.
    넷은 2×2, 셋은 그대로 3열이라 어느 쪽도 줄 끝이 비지 않습니다.
  */
  const columns = items.length % 3 === 0 ? "md:grid-cols-3" : "sm:grid-cols-2";

  return (
    <ul className={`result-scene-list mt-5 grid gap-3 ${columns}`}>
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
    <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
      <Icon name={icon} className="text-accent" />
      <h3 className="mt-4 text-h3 text-foreground">{title}</h3>
      <p className="mt-2 text-body-sm text-foreground-muted">{description}</p>
      <div className="mt-5 text-body text-foreground-body">{children}</div>
    </section>
  );
}

/**
 * 관점 카드에 붙는 글자·극 이름·배지를 한곳에서 계산합니다.
 *
 * 예전에는 Hero의 렌즈 카드가 이 계산을 따로 갖고 있었습니다. 같은 판단이 두 곳에
 * 있으면 한쪽만 고쳐지므로, 카드가 하나로 합쳐진 지금은 계산도 하나만 둡니다.
 */
function axisCardMeta(
  definition: AssessmentDefinition,
  item: ResolvedAxisNarrative,
  ranking: AxisRanking,
) {
  const axis = definition.axes.find((candidate) => candidate.id === item.axisId);
  const side = item.direction;
  const pole = side === "positive" ? axis?.positive : axis?.negative;
  const rankIndex = ranking.ordered.findIndex((candidate) => candidate.axisId === item.axisId);
  const isPrimary = ranking.primary?.axisId === item.axisId;
  const isSharedLead = ranking.isTied && rankIndex >= 0 && rankIndex < 2;

  return {
    letter:
      definition.typeCode === undefined
        ? undefined
        : pole?.code,
    poleLabel: pole?.shortLabel,
    badge: isPrimary
      ? "가장 도드라짐"
      : isSharedLead
        ? "함께 도드라짐"
        : undefined,
  };
}

/** 네 관점 카드 한 벌. `detail` 옵션으로 깊이를 달리합니다. */
function AxisCardGrid({
  definition,
  scores,
  narrativeById,
  ranking,
  terms,
  detail,
}: {
  readonly definition: AssessmentDefinition;
  readonly scores: readonly AxisScore[];
  readonly narrativeById: ReadonlyMap<string, ResolvedAxisNarrative>;
  readonly ranking: AxisRanking;
  readonly terms?: readonly string[];
  readonly detail: boolean;
}) {
  const axisById = new Map(definition.axes.map((axis) => [String(axis.id), axis]));

  return (
    <div className="result-axis-card-grid grid gap-4 md:auto-rows-fr md:grid-cols-2">
      {scores.map((score, index) => {
        const axis = axisById.get(String(score.axisId));
        const item = narrativeById.get(String(score.axisId));
        if (axis === undefined) return null;
        const meta =
          item === undefined
            ? undefined
            : axisCardMeta(definition, item, ranking);

        return (
          <AxisInsightCard
            key={String(score.axisId)}
            index={index}
            axis={axis}
            score={score}
            narrative={item}
            terms={terms}
            letter={meta?.letter}
            poleLabel={meta?.poleLabel}
            badge={meta?.badge}
            detail={detail}
          />
        );
      })}
    </div>
  );
}

export function ResultRenderer({
  definition,
  snapshot,
  profile,
  nickname,
  signals,
  presentation,
  heroRef,
}: {
  readonly definition: AssessmentDefinition;
  readonly snapshot: ResultSnapshot;
  readonly profile: ResultProfile;
  readonly nickname: string;
  /** 응답이 지워졌으면 없을 수 있으며, 없어도 기본 결과는 온전히 보여야 합니다. */
  readonly signals?: AssessmentSignals;
  readonly presentation?: AssessmentPresentation;
  /** Hero 영역 캡처를 위한 ref — ResultHero에 그대로 전달합니다 */
  readonly heroRef?: RefObject<HTMLElement | null>;
}) {
  const axisById = new Map(definition.axes.map((axis) => [String(axis.id), axis]));
  const narrative = resolveResultNarrative(definition, snapshot.score.axisScores, profile);
  const guidance = profile;
  const ranking = resolveAxisRanking(definition.axes, snapshot.score.axisScores);
  const emphasisTerms = definition.resultNarrative?.emphasisTerms;
  const narrativeById = new Map(narrative.axes.map((item) => [String(item.axisId), item]));
  const scaleExtent = Math.max(
    ...definition.scale.options.map((option) =>
      Math.abs(option.value - definition.scale.centerValue),
    ),
    1,
  );

  /*
    새로고침하거나 링크를 다시 열어도 보던 깊이가 유지되도록 주소에 남깁니다.
    이 화면은 저장된 응답을 불러온 뒤에야 그려지므로 브라우저에서만 실행됩니다.
    서버 렌더와 테스트에는 window가 없으므로 그때는 검사 결과 보기로 시작합니다.

    요약 보기를 뺐으므로(2026-09-09) 기본 갈래는 `detail`입니다. 예전 주소에
    남아 있는 `?view=summary`는 `toResultViewKey`가 모르는 값으로 보고
    기본값으로 떨어뜨리므로, 오래된 링크를 열어도 빈 화면이 되지 않습니다.
  */
  const [view, setView] = useState<ResultViewKey>(() =>
    typeof window === "undefined"
      ? "detail"
      : toResultViewKey(new URLSearchParams(window.location.search).get("view")),
  );

  function changeView(next: ResultViewKey) {
    setView(next);
    /*
      세 번째 인자는 반드시 **문자열**이어야 합니다.

      App Router가 history.replaceState를 가로채 서비스 워커로 넘기는데, URL 객체는
      structured clone 대상이 아니어서 postMessage에서 DataCloneError로 터집니다.
      주소를 만드는 일은 resultViewHref가 맡고, 여기서는 만들어진 문자열만 넘깁니다.
    */
    window.history.replaceState(
      null,
      "",
      resultViewHref(window.location, next === "detail" ? null : next),
    );
  }

  return (
    <article>
      <ResultHero
        definition={definition}
        snapshot={snapshot}
        nickname={nickname}
        narrative={narrative}
        presentation={presentation}
        heroRef={heroRef}
      />

      <SegmentedTabs
        label="결과 보기 방식"
        className="mt-8"
        value={view}
        onValueChange={(next) => changeView(toResultViewKey(next))}
        items={[
          { value: "detail", label: "검사 결과 보기", hint: "약 5분" },
          { value: "story", label: "줄글 톺아보기", hint: "약 3분" },
        ]}
      >

        <TabPanel value="story" className="mt-8">
          <ResultStoryView profile={profile} />
        </TabPanel>

        <TabPanel value="detail" className="mt-6">
          <div data-result-view="detail">
            <div className="grid gap-8 lg:grid-cols-4">
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
                        네 관점의 방향과 기울어진 정도를 살펴보세요.
                        <br />
                        어느 한쪽이 더 좋은 것을 뜻하지는 않습니다.
                      </>
                    }
                  />

                  <div className="mt-6">
                    <AxisCardGrid
                      definition={definition}
                      scores={snapshot.score.axisScores}
                      narrativeById={narrativeById}
                      ranking={ranking}
                      terms={emphasisTerms}
                      detail
                    />
                  </div>

                  {signals !== undefined && signals.contextSplits.length > 0 && (
                    <section className="mt-8">
                      <h3 className="text-h3 text-foreground sm:text-h3-lg">상황에 따라 달라지는 점</h3>
                      <p className="mt-2 max-w-prose text-body text-foreground-muted">
                        같은 관점인데 수업일 때와 회의일 때 답이 달랐던 곳이에요. 평균과 문항 수를 함께 봐 주세요.
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

                </section>

                <section id="result-scenes" className="mt-10 scroll-mt-28">
                  <ChapterHeading
                    number="02"
                    title="교실에서 드러나는 모습"
                    description="네 관점을 함께 읽어, 수업·생활지도·업무·동료 사이에서 자주 나타나는 모습을 적었습니다."
                  />
                  {/* 한 덩어리로 이어 붙이지 않고 묶음마다 면을 끊습니다 (DEC-054). */}
                  <div className="mt-6 grid gap-4">
                    <SceneGroup
                      tone="strength"
                      index={1}
                      terms={emphasisTerms}
                      title="이럴 때 강점이 돼요"
                      description="지금 방식이 그대로 힘이 되는 때예요."
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
                  </div>
                </section>

                <section id="result-collaboration" className="mt-10 scroll-mt-28">
                  <ChapterHeading
                    number="03"
                    title="나와 너무 다른 선생님과는"
                    description="서로 다른 방식이 만날 때 시너지가 나는 점과 미리 맞춰 둘 점을 함께 살펴보세요."
                  />
                  {/*
                    두 칸을 한 묶음으로 합쳤습니다 (2026-09-08).

                    예전에는 `함께할 때 잘 이어지는 점`과 `미리 맞춰 두면 좋은 점`이
                    나란히 섰는데, 16유형 가운데 **14유형에서 같은 동료가 양쪽에
                    다 나왔습니다.** 한 유형은 두 동료가 양쪽 모두 똑같았습니다.
                    같은 동료가 양쪽에 반복되므로 둘을 별도 패널로 양분하지 않습니다.

                    지금은 한 묶음 안에서 서술과 권유의 역할만 아이콘과 라벨로
                    구분합니다. 주 카드 안에 미니 카드 — 2단계까지입니다 (design.md 29행).
                  */}
                  <div className="assessment-card mt-6 p-4 sm:p-6">
                    <ul className="collab-note-list grid gap-3">
                      {[
                        {
                          kind: "description",
                          label: "함께일 때 시너지 효과",
                          icon: "layers" as const,
                          items: guidance.collaboration.naturalFit,
                        },
                        {
                          kind: "suggestion",
                          label: "다만 이땐 이렇게!",
                          icon: "compass" as const,
                          items: guidance.collaboration.needsTuning,
                        },
                      ].flatMap(({ kind, label, icon, items }) =>
                        items.map((item) => (
                          <li
                            key={item}
                            data-collab-kind={kind}
                            className="collab-note min-w-0 p-4 sm:p-5"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                aria-hidden="true"
                                className="collab-note-badge flex size-8 shrink-0 items-center justify-center rounded-sm"
                              >
                                <Icon name={icon} className="size-4" />
                              </span>
                              <span className="collab-note-label text-caption font-semibold">
                                {label}
                              </span>
                            </div>
                            <p className="collab-note-copy mt-3 text-body text-foreground-body">
                              <EmphasizedText text={item} terms={emphasisTerms} />
                            </p>
                          </li>
                        )),
                      )}
                    </ul>
                  </div>
                </section>

                <section id="result-next" className="mt-10 scroll-mt-28">
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
          </div>
        </TabPanel>
      </SegmentedTabs>
    </article>
  );
}
