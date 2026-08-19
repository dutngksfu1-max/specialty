/**
 * fixture 콘텐츠 — teacher-style-v1
 *
 * ⚠️ 실제 콘텐츠가 아닙니다. Phase 4에서 통째로 교체됩니다.
 *   - 축 정의는 DEC-023(WAITING)이 정해져야 쓸 수 있으므로 중립 이름만 씁니다.
 *   - 검사 제목은 DEC-020(WAITING)의 임시 제목을 [fixture] 표시와 함께 씁니다.
 *   - 사람이 읽는 문구에는 전부 [fixture] 접두사를 붙여, 실제 콘텐츠와 섞이지 않게 합니다.
 *
 * 형식 규격: docs/content/teacher-style-v1.md
 */

/** 강도 구간 — DEC-002b 확정값. 축당 10문항 × 최대 편차 2 = 최대 20점 */
const intensityBands = [
  { id: "balanced", label: "균형", minAbsScore: 0, maxAbsScore: 4 },
  { id: "clear", label: "뚜렷", minAbsScore: 5, maxAbsScore: 12 },
  { id: "strong", label: "매우 뚜렷", minAbsScore: 13, maxAbsScore: 20 },
];

/** 축 식별자는 중립 문자열입니다 (DEC-004). 실제 이름은 콘텐츠가 소유합니다. */
export const axisIds = ["axis-a", "axis-b", "axis-c", "axis-d"] as const;

const axes = axisIds.map((axisId, index) => ({
  id: axisId,
  name: `[fixture] ${index + 1}번 축`,
  positive: {
    side: "positive",
    label: `[fixture] ${axisId} 양극 스타일`,
    shortLabel: `[fx]${index + 1}+`,
    description: `[fixture] ${axisId} 양극 설명입니다.`,
  },
  negative: {
    side: "negative",
    label: `[fixture] ${axisId} 음극 스타일`,
    shortLabel: `[fx]${index + 1}-`,
    description: `[fixture] ${axisId} 음극 설명입니다.`,
  },
  defaultPole: "positive",
  intensityBands,
}));

/** Part는 화면 분량을 나누는 단위입니다. 축과 1:1로 대응하지 않습니다. */
export const sectionIds = ["part-1", "part-2", "part-3", "part-4"] as const;

const sections = sectionIds.map((sectionId, index) => ({
  id: sectionId,
  order: index + 1,
  title: `Part ${index + 1}`,
  description: `[fixture] Part ${index + 1} 안내 문구`,
}));

/**
 * 응답 척도 — docs/content/teacher-style-v1.md 2절에서 확정된 값입니다.
 * 화면에는 양 끝만 보이지만(DEC-018) 모든 선택지에 스크린리더용 label이 필요합니다.
 */
const scale = {
  id: "likert-5",
  centerValue: 3,
  options: [
    { value: 1, label: "전혀 그렇지 않다", visibleLabel: "전혀 그렇지 않다" },
    { value: 2, label: "그렇지 않다" },
    { value: 3, label: "보통이다" },
    { value: 4, label: "그렇다" },
    { value: 5, label: "매우 그렇다", visibleLabel: "매우 그렇다" },
  ],
};

export const teacherStyleV1Base = {
  id: "teacher-style",
  slug: "teacher-style",
  title: "[fixture] 나의 교직 스타일 탐색",
  summary: "[fixture] 한 줄 요약입니다.",
  description: "[fixture] 검사 소개 본문입니다. 실제 문구는 Phase 4에서 작성합니다.",
  estimatedMinutes: 10,
  status: "published",
  assessmentVersion: 1,
  contentVersion: "1.0.0",
  scale,
  axes,
  sections,
  scoring: { strategyId: "centered-likert-axis-sum", scoringVersion: 1 },
};
