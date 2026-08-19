import { axisIds } from "./definition";

/**
 * fixture 결과 프로필 16개 (2^4 = 축 4개 × 방향 2가지)
 *
 * ⚠️ 실제 결과 텍스트가 아닙니다. Phase 4에서 16개를 직접 작성해 교체합니다.
 * 여기서는 "조합이 하나도 빠지지 않는다"는 조건만 실제와 똑같이 맞춥니다.
 *
 * resultKey는 내부 식별자이며 화면에 노출하지 않습니다.
 * (docs/content/teacher-style-v1.md 6.1 — pppp … nnnn 표기)
 */

const combinationCount = 2 ** axisIds.length;

export const resultProfiles = Array.from({ length: combinationCount }, (_, mask) => {
  const sides = axisIds.map((_axisId, index) => {
    // 첫 번째 축이 가장 크게 변하고 마지막 축이 가장 빠르게 바뀝니다 (pppp, pppn, ppnp …)
    const bit = (mask >> (axisIds.length - 1 - index)) & 1;
    return bit === 0 ? "positive" : "negative";
  });

  const key = sides.map((side) => (side === "positive" ? "p" : "n")).join("");

  const poles: Record<string, string> = {};
  axisIds.forEach((axisId, index) => {
    poles[axisId] = sides[index] ?? "positive";
  });

  return {
    key,
    poles,
    title: `[fixture] 결과 프로필 ${key}`,
    oneLiner: `[fixture] ${key} 한 줄 설명입니다.`,
    rhythm: `[fixture] ${key} 나의 교직 리듬 본문입니다.`,
    shiningMoments: [
      `[fixture] ${key} 빛나는 순간 1`,
      `[fixture] ${key} 빛나는 순간 2`,
      `[fixture] ${key} 빛나는 순간 3`,
    ],
    underPressure: [`[fixture] ${key} 바쁠 때 1`, `[fixture] ${key} 바쁠 때 2`],
    withColleagues: [`[fixture] ${key} 동료와 1`, `[fixture] ${key} 동료와 2`],
    collaboration: {
      naturalFit: [`[fixture] ${key} 호흡이 자연스러운 스타일 1`, `[fixture] ${key} 호흡이 자연스러운 스타일 2`],
      needsTuning: [`[fixture] ${key} 조율하면 더 편한 스타일 1`, `[fixture] ${key} 조율하면 더 편한 스타일 2`],
    },
  };
});
