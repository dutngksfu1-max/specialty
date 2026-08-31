import type {
  AssessmentDefinition,
  AxisNarrativeReading,
} from "@/domain/assessment/model/definition";
import type { ResultProfile } from "@/domain/assessment/result/profile";
import type { AxisScore } from "@/domain/assessment/scoring/score";
import { resolveIntensity } from "@/domain/assessment/scoring/scoring";
import type { AxisId } from "@/domain/shared/ids";

export interface ResolvedAxisNarrative {
  readonly axisId: AxisId;
  /** 연속 점수. 게이지와 정렬에 씁니다 — 반드시 보존합니다 */
  readonly rawScore: number;
  /** 이 축이 어느 쪽으로 기울었는가. **언제나 한쪽입니다** (DEC-068) */
  readonly direction: AxisScore["direction"];
  /** 게이지 옆 배지에 쓸 차이 구간. 설명 문장을 고르는 데는 쓰지 않습니다 */
  readonly intensityBandId: string;
  readonly reading: AxisNarrativeReading;
  /** T3 반증 문구 — "이 설명이 안 맞는다면" (docs/PRD-result-v2.md 5장) */
  readonly counterEvidence: string;
}

export interface ResolvedResultNarrative {
  readonly title: string;
  readonly oneLiner: string;
  readonly rhythm: string;
  readonly axes: readonly ResolvedAxisNarrative[];
}

function fallbackNarrative(profile: ResultProfile): ResolvedResultNarrative {
  return {
    title: profile.title,
    oneLiner: profile.oneLiner,
    rhythm: profile.rhythm,
    axes: [],
  };
}

/**
 * 결과 상단 서술을 고릅니다 (DEC-068).
 *
 * **축마다 방향은 언제나 하나입니다.** 점수가 0이어도 동점 보정이, 보정으로도 갈리지
 * 않으면 `axis.defaultPole`이 방향을 채웁니다(`AxisScore.direction`이 이미 그렇게 옵니다).
 * 그래서 이 함수는 점수 출처와 관계없이 그 방향의 문장을 그대로 가져옵니다.
 *
 * 세기는 문장을 가르지 않습니다. 51:49로 기운 분과 80:20으로 기운 분은 같은 문장을 읽고,
 * 얼마나 기울었는지는 게이지와 차이 배지가 말합니다. 5~10분을 들인 사람에게
 * "어느 쪽인지 모르겠다"는 결과를 돌려주지 않기 위한 규칙입니다.
 *
 * 문구는 모두 콘텐츠가 소유하며 이 함수는 선택과 조립만 담당합니다.
 * 동기 순수 함수입니다 (AGENTS.md 2.2).
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

    const reading = narrativeAxis.readings.find(
      (candidate) => candidate.direction === score.direction,
    );
    if (reading === undefined) return fallbackNarrative(profile);

    /*
      저장된 intensityBandId를 그대로 믿지 않고 rawScore로 다시 찾습니다.
      구간 경계가 바뀐 뒤에도 예전 결과가 조용히 어긋나지 않게 하는 안전장치입니다
      (docs/PRD-result-v2.md 6.4 — rawScore는 스냅샷에 그대로 보존됩니다).
    */
    const band = resolveIntensity(Math.abs(score.rawScore), axis.intensityBands);

    resolved.push({
      axisId: axis.id,
      rawScore: score.rawScore,
      direction: score.direction,
      intensityBandId: band.id,
      reading,
      counterEvidence: narrativeAxis.counterEvidence,
    });
  }

  return {
    title: profile.title,
    oneLiner: profile.oneLiner,
    rhythm: profile.rhythm,
    axes: resolved,
  };
}
