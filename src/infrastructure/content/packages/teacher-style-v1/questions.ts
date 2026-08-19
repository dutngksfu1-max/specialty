import { axisIds, sectionIds } from "./definition";

/**
 * fixture 문항 40개 (축 4개 × 10문항)
 *
 * ⚠️ 실제 문항이 아닙니다. Phase 4에서 40행짜리 리터럴 배열로 교체됩니다.
 * 여기서는 아래 형식 조건만 실제와 똑같이 맞춥니다.
 *   - 축마다 polarity +1 5개 / -1 5개  (묵종 편향 상쇄)
 *   - Part마다 여러 축이 섞여 있음      (응답자가 의도를 눈치채지 못하도록)
 *   - order는 1부터 연속
 *   - weight는 전부 1
 */

const QUESTIONS_PER_AXIS = 10;
const TOTAL_QUESTIONS = axisIds.length * QUESTIONS_PER_AXIS;
const QUESTIONS_PER_SECTION = TOTAL_QUESTIONS / sectionIds.length;

/** 축이 몇 번째 문항을 배정받았는지 세는 카운터 */
const takenPerAxis = new Map<string, number>();

export const questions = Array.from({ length: TOTAL_QUESTIONS }, (_, index) => {
  const order = index + 1;

  // 축을 번갈아 배정하면 한 Part 안에 여러 축이 자연스럽게 섞입니다.
  const axisId = axisIds[index % axisIds.length] ?? axisIds[0];
  const sectionId = sectionIds[Math.floor(index / QUESTIONS_PER_SECTION)] ?? sectionIds[0];

  const takenSoFar = takenPerAxis.get(axisId) ?? 0;
  takenPerAxis.set(axisId, takenSoFar + 1);

  // 축의 앞쪽 절반은 +1, 뒤쪽 절반은 -1
  const polarity = takenSoFar < QUESTIONS_PER_AXIS / 2 ? 1 : -1;

  return {
    id: `${axisId}-q${takenSoFar + 1}`,
    sectionId,
    order,
    text: `[fixture] 축 ${axisId} 문항 ${takenSoFar + 1}`,
    axisId,
    polarity,
    weight: 1,
  };
});
