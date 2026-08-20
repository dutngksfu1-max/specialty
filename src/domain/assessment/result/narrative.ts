import type {
  AssessmentDefinition,
  AxisNarrativeReading,
} from "@/domain/assessment/model/definition";
import type { ResultProfile } from "@/domain/assessment/result/profile";
import type { AxisScore } from "@/domain/assessment/scoring/score";
import type { AxisId } from "@/domain/shared/ids";

export interface ResolvedAxisNarrative {
  readonly axisId: AxisId;
  readonly rawScore: number;
  readonly reading: AxisNarrativeReading;
}

export interface ResolvedResultNarrative {
  readonly title: string;
  readonly oneLiner: string;
  readonly rhythm: string;
  readonly axes: readonly ResolvedAxisNarrative[];
  readonly balancedAxisIds: ReadonlySet<AxisId>;
}

function fallbackNarrative(
  profile: ResultProfile,
): ResolvedResultNarrative {
  return {
    title: profile.title,
    oneLiner: profile.oneLiner,
    rhythm: profile.rhythm,
    axes: [],
    balancedAxisIds: new Set<AxisId>(),
  };
}

/**
 * 연속 점수의 강도 구간까지 반영해 결과 상단 서술을 고릅니다.
 *
 * - 비방향 구간은 rawScore의 부호와 무관하게 `balanced` 문장을 씁니다.
 * - 제목은 한쪽 경향이 확인된 축 중 절대 점수가 가장 큰 축에서 가져옵니다.
 * - 교직 리듬은 축별 설명을 이어 붙이며, 콘텐츠가 둔 맥락 경계 문장도 보존합니다.
 *
 * 문구는 모두 콘텐츠가 소유하며 이 함수는 선택과 조립만 담당합니다.
 */
export function resolveResultNarrative(
  definition: AssessmentDefinition,
  axisScores: readonly AxisScore[],
  profile: ResultProfile,
): ResolvedResultNarrative {
  const spec = definition.resultNarrative;
  if (spec === undefined) return fallbackNarrative(profile);

  const scoreByAxis = new Map(axisScores.map((score) => [score.axisId, score]));
  const resolved: ResolvedAxisNarrative[] = [];

  for (const axis of definition.axes) {
    const score = scoreByAxis.get(axis.id);
    const narrativeAxis = spec.axes.find((candidate) => candidate.axisId === axis.id);
    if (score === undefined || narrativeAxis === undefined) return fallbackNarrative(profile);

    const band = axis.intensityBands.find(
      (candidate) => candidate.id === score.intensityBandId,
    );
    if (band === undefined) return fallbackNarrative(profile);

    const direction = band.directional ? score.direction : "balanced";
    const reading = narrativeAxis.readings.find(
      (candidate) =>
        candidate.intensityBandId === score.intensityBandId &&
        candidate.direction === direction,
    );
    if (reading === undefined) return fallbackNarrative(profile);

    resolved.push({ axisId: axis.id, rawScore: score.rawScore, reading });
  }

  const directional = resolved
    .filter((item) => item.reading.direction !== "balanced")
    .sort((left, right) => Math.abs(right.rawScore) - Math.abs(left.rawScore));
  const balancedAxisIds = new Set(
    resolved
      .filter((item) => item.reading.direction === "balanced")
      .map((item) => item.axisId),
  );

  if (directional.length === 0) {
    return {
      title: spec.balancedTitle,
      oneLiner: spec.balancedOneLiner,
      rhythm: resolved.map((item) => item.reading.rhythm).join(" "),
      axes: resolved,
      balancedAxisIds,
    };
  }

  const primary = directional[0];
  if (primary === undefined) return fallbackNarrative(profile);

  const summaries = directional
    .slice(0, 2)
    .map((item) => item.reading.summary)
    .join(" ");
  const oneLiner =
    balancedAxisIds.size > 0 ? `${summaries} ${spec.balancedAxisNote}` : summaries;

  return {
    title: primary.reading.headline,
    oneLiner,
    rhythm: resolved.map((item) => item.reading.rhythm).join(" "),
    axes: resolved,
    balancedAxisIds,
  };
}
