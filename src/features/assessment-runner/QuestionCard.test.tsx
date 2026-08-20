import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { QuestionCard } from "@/features/assessment-runner/QuestionCard";
import { parseAssessmentDefinition } from "@/infrastructure/content/contentPackageSchema";
import { teacherStyleV1Package } from "@/infrastructure/content/packages/teacher-style-v1";

function markup(): string {
  const parsed = parseAssessmentDefinition(teacherStyleV1Package);
  if (!parsed.ok) throw new Error(parsed.error.detail);
  const question = parsed.value.questions[0];
  if (question === undefined) throw new Error("fixture 문항이 없습니다.");
  return renderToStaticMarkup(
    <QuestionCard
      question={question}
      options={parsed.value.scale.options}
      value={3}
      highlightUnanswered={false}
      onSelect={() => undefined}
    />,
  );
}

describe("검사 문항 접근성 마크업", () => {
  it("fieldset·legend·네이티브 radiogroup을 사용합니다", () => {
    const html = markup();
    expect(html).toContain("<fieldset");
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain("<legend");
    expect(html.match(/type="radio"/g)).toHaveLength(5);
  });

  it("모든 radio에 명시적으로 연결된 label이 있습니다", () => {
    const html = markup();
    const ids = [...html.matchAll(/<input id="([^"]+)"[^>]+type="radio"/g)].map((match) => match[1]);
    expect(ids).toHaveLength(5);
    for (const id of ids) expect(html).toContain(`for="${id}"`);
  });

  it("다섯 척도 라벨을 모두 화면에 출력합니다", () => {
    const html = markup();
    for (const label of ["전혀 그렇지 않다", "그렇지 않다", "보통이다", "그렇다", "매우 그렇다"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain("선택됨");
  });
});
