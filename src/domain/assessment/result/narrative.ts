import type {
  AssessmentDefinition,
  AxisNarrativeReading,
  NarrativeDirection,
} from "@/domain/assessment/model/definition";
import type { ResultProfile } from "@/domain/assessment/result/profile";
import type { AxisScore } from "@/domain/assessment/scoring/score";
import { resolveIntensity, weakestDirectionalBand } from "@/domain/assessment/scoring/scoring";
import type { AxisId } from "@/domain/shared/ids";

export interface ResolvedAxisNarrative {
  readonly axisId: AxisId;
  readonly rawScore: number;
  readonly isDirectional: boolean;
  /** 0점이었는데 동점 보정이 방향을 찾은 축입니다. 화면은 근소한 차이임을 밝혀야 합니다 (DEC-063) */
  readonly isTieBroken: boolean;
  readonly reading: AxisNarrativeReading;
  /** T3 반증 문구 — "이 설명이 안 맞는다면" (docs/PRD-result-v2.md 5장) */
  readonly counterEvidence: string;
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
 * - 균형 표시는 보존하되, 결과 문장은 점수가 가리키는 방향의 문장을 씁니다.
 * - 핵심 카드는 네 축을 종합한 결과 프로필의 제목과 서술을 사용합니다.
 * - 강도별 축 문장은 축 시각화와 세부 해석을 위해 함께 보존합니다.
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

    // 저장된 intensityBandId를 그대로 믿지 않고 rawScore로 다시 찾습니다.
    // 구간 경계가 바뀐 뒤에도 예전 결과가 조용히 fallback으로 떨어지지 않게 하는 안전장치입니다.
    // (docs/PRD-result-v2.md 6.4 — rawScore는 스냅샷에 그대로 보존됩니다)
    const scoredBand = resolveIntensity(Math.abs(score.rawScore), axis.intensityBands);

    /*
      동점 보정으로 방향을 찾은 축은 점수가 0이라 '균형' 구간에 떨어집니다 (DEC-063).
      그대로 두면 방향은 있는데 균형 문장을 읽게 되므로, 가장 약한 방향 구간으로 읽습니다.
      구간이 하나도 방향을 갖지 않는 콘텐츠라면 원래 구간을 그대로 씁니다.
    */
    const isTieBroken = score.directionSource === "tiebreak";
    const band = isTieBroken
      ? weakestDirectionalBand(axis.intensityBands) ?? scoredBand
      : scoredBand;

    // 0점이고 보정으로도 갈리지 않았으면 어느 쪽으로도 기울지 않았습니다. `direction`은
    // 이때 axis.defaultPole이므로 그대로 쓰면 "한쪽에 조금 더 가깝다"고 잘못 말하게 됩니다
    // (DEC-046). 보정이 방향을 찾은 축은 여기 해당하지 않습니다.
    const direction: NarrativeDirection =
      score.directionSource === "unresolved" ? "balanced" : score.direction;
    const reading = narrativeAxis.readings.find(
      (candidate) =>
        candidate.intensityBandId === band.id && candidate.direction === direction,
    );
    if (reading === undefined) return fallbackNarrative(profile);

    resolved.push({
      axisId: axis.id,
      rawScore: score.rawScore,
      isDirectional: band.directional,
      isTieBroken,
      reading,
      counterEvidence: narrativeAxis.counterEvidence,
    });
  }

  const balancedAxisIds = new Set(
    resolved
      .filter((item) => !item.isDirectional)
      .map((item) => item.axisId),
  );

  /*
    균형 축이 하나라도 있으면 프로필 제목을 쓰지 않습니다 (AGENTS.md 6장 · DEC-046).

    균형 축의 방향은 `axis.defaultPole`이 임의로 채운 값이라, 그 부호로 고른 프로필의
    제목을 그대로 내보내면 동전 던지기로 정해진 이름을 결과라고 말하게 됩니다.
    장면·협업·행동 문구는 이미 균형 전용 안내로 바뀌고 있었는데 제목만 남아 있어,
    같은 화면에서 앞뒤가 어긋나 있었습니다 (DEC-062에서 맞춤).
  */
  const isBalanced = balancedAxisIds.size > 0;

  return {
    title: isBalanced ? spec.balancedTitle : profile.title,
    oneLiner: isBalanced ? spec.balancedOneLiner : profile.oneLiner,
    rhythm: isBalanced ? spec.balancedRhythm ?? profile.rhythm : profile.rhythm,
    axes: resolved,
    balancedAxisIds,
  };
}
