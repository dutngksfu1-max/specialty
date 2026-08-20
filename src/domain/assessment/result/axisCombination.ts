import type { AxisCombination, PoleSide } from "@/domain/assessment/model/definition";
import type { AxisId } from "@/domain/shared/ids";

/**
 * 축 조합 해석 고르기 (contentVersion 3.0.0)
 *
 * 두 축이 만났을 때만 보이는 이야기를, 결과의 방향 조합에 맞춰 하나 골라 옵니다.
 * 동기 순수 함수입니다 — 같은 입력이면 항상 같은 출력이고 I/O가 없습니다 (AGENTS.md 2.2).
 */
export interface ResolvedAxisCombination {
  readonly id: string;
  readonly title: string;
  readonly text: string;
}

export function resolveAxisCombinations(
  combinations: readonly AxisCombination[],
  poles: Readonly<Record<AxisId, PoleSide>>,
  balancedAxisIds: ReadonlySet<AxisId> = new Set<AxisId>(),
): readonly ResolvedAxisCombination[] {
  const resolved: ResolvedAxisCombination[] = [];

  for (const combination of combinations) {
    // 균형 구간의 축을 한쪽 방향으로 밀어 넣어 조합 문장을 만들지 않습니다.
    if (combination.axisIds.some((axisId) => balancedAxisIds.has(axisId))) continue;

    const reading = combination.readings.find((candidate) =>
      combination.axisIds.every((axisId) => candidate.poles[axisId] === poles[axisId]),
    );

    // 콘텐츠 검증에서 모든 조합이 채워졌음을 보장하므로 보통은 찾습니다.
    // 그래도 못 찾으면 그 조합만 조용히 건너뜁니다 — 결과 화면 전체가 깨지면 안 됩니다.
    if (reading !== undefined) {
      resolved.push({ id: combination.id, title: combination.title, text: reading.text });
    }
  }

  return resolved;
}
