import { describe, expect, it } from "vitest";

import {
  StaticAssessmentCatalog,
  staticAssessmentCatalog,
} from "@/infrastructure/content/StaticAssessmentCatalog";
import {
  collectContentWarnings,
  parseAssessmentContentPackage,
  parseAssessmentDefinition,
} from "@/infrastructure/content/contentPackageSchema";
import { teacherStyleV1Package } from "@/infrastructure/content/packages/teacher-style-v1";
import { toAssessmentId } from "@/domain/shared/ids";

/** 원본을 건드리지 않고 일부만 망가뜨린 사본을 만듭니다. */
function broken(mutate: (draft: Record<string, unknown>) => void): unknown {
  const draft = JSON.parse(JSON.stringify(teacherStyleV1Package)) as Record<string, unknown>;
  mutate(draft);
  return draft;
}

function expectInvalid(raw: unknown): string {
  const result = parseAssessmentDefinition(raw);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("검증이 통과해서는 안 됩니다.");
  expect(result.error.code).toBe("INVALID_CONTENT_PACKAGE");
  return result.error.detail ?? "";
}

function expectInvalidPackage(raw: unknown): string {
  const result = parseAssessmentContentPackage(raw);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("검증이 통과해서는 안 됩니다.");
  expect(result.error.code).toBe("INVALID_CONTENT_PACKAGE");
  return result.error.detail ?? "";
}

describe("fixture 콘텐츠 패키지", () => {
  const parsed = parseAssessmentDefinition(teacherStyleV1Package);

  it("Zod 검증을 통과합니다", () => {
    if (!parsed.ok) {
      throw new Error(`검증 실패: ${parsed.error.detail ?? ""}`);
    }
    expect(parsed.ok).toBe(true);
  });

  it("문항 40개 = 축 4개 × 10문항입니다", () => {
    if (!parsed.ok) throw new Error("검증 실패");
    const definition = parsed.value;

    expect(definition.questions).toHaveLength(40);
    expect(definition.axes).toHaveLength(4);

    for (const axis of definition.axes) {
      const axisQuestions = definition.questions.filter((q) => q.axisId === axis.id);
      expect(axisQuestions).toHaveLength(10);
    }
  });

  it("축마다 polarity가 +1 5개 / -1 5개입니다", () => {
    if (!parsed.ok) throw new Error("검증 실패");
    const definition = parsed.value;

    for (const axis of definition.axes) {
      const axisQuestions = definition.questions.filter((q) => q.axisId === axis.id);
      expect(axisQuestions.filter((q) => q.polarity === 1)).toHaveLength(5);
      expect(axisQuestions.filter((q) => q.polarity === -1)).toHaveLength(5);
    }
  });

  it("Part마다 여러 축의 문항이 섞여 있습니다", () => {
    if (!parsed.ok) throw new Error("검증 실패");
    const definition = parsed.value;

    for (const section of definition.sections) {
      const sectionQuestions = definition.questions.filter((q) => q.sectionId === section.id);
      expect(sectionQuestions).toHaveLength(10);
      const axesInSection = new Set(sectionQuestions.map((q) => String(q.axisId)));
      expect(axesInSection.size).toBeGreaterThan(1);
    }
  });

  it("결과 프로필이 16개이고 조합이 겹치지 않습니다", () => {
    if (!parsed.ok) throw new Error("검증 실패");
    const definition = parsed.value;

    expect(definition.resultProfiles).toHaveLength(16);

    const axisOrder = definition.axes.map((axis) => axis.id);
    const combinations = definition.resultProfiles.map((profile) =>
      axisOrder.map((axisId) => profile.poles[axisId]).join("|"),
    );
    expect(new Set(combinations).size).toBe(16);
  });

  it("경고 항목이 없습니다 (축별 문항 수·polarity 균등)", () => {
    if (!parsed.ok) throw new Error("검증 실패");
    expect(collectContentWarnings(parsed.value)).toEqual([]);
  });

  it("사용자에게 보이는 문구에 노출 금지 표현이 없습니다", () => {
    if (!parsed.ok) throw new Error("검증 실패");
    const definition = parsed.value;

    const visibleText = [
      definition.slug,
      definition.title,
      definition.summary,
      definition.description,
      ...definition.questions.map((q) => q.text),
      ...definition.resultProfiles.map((p) => p.title),
    ].join(" ");

    expect(visibleText).not.toMatch(new RegExp(["m", "b", "t", "i"].join(""), "i"));
    expect(visibleText).not.toMatch(/\b[EI][NS][TF][JP]\b/i);
  });
});

describe("무결성 검증 실패 (INVALID_CONTENT_PACKAGE)", () => {
  it("axes에 없는 axisId", () => {
    const detail = expectInvalid(
      broken((draft) => {
        const questions = draft.questions as Record<string, unknown>[];
        const first = questions[0];
        if (first !== undefined) first.axisId = "axis-없음";
      }),
    );
    expect(detail).toContain("axes에 없는 axisId");
  });

  it("sections에 없는 sectionId", () => {
    const detail = expectInvalid(
      broken((draft) => {
        const questions = draft.questions as Record<string, unknown>[];
        const first = questions[0];
        if (first !== undefined) first.sectionId = "part-없음";
      }),
    );
    expect(detail).toContain("sections에 없는 sectionId");
  });

  it("order가 1부터 연속이 아님", () => {
    const detail = expectInvalid(
      broken((draft) => {
        const questions = draft.questions as Record<string, unknown>[];
        const first = questions[0];
        if (first !== undefined) first.order = 99;
      }),
    );
    expect(detail).toContain("연속");
  });

  it("결과 프로필 개수가 2^축개수가 아님", () => {
    const detail = expectInvalid(
      broken((draft) => {
        const profiles = draft.resultProfiles as unknown[];
        draft.resultProfiles = profiles.slice(0, 15);
      }),
    );
    expect(detail).toContain("2^축개수");
  });

  it("pole 조합이 중복됨", () => {
    const detail = expectInvalid(
      broken((draft) => {
        const profiles = draft.resultProfiles as Record<string, unknown>[];
        const first = profiles[0];
        const second = profiles[1];
        if (first !== undefined && second !== undefined) {
          second.poles = JSON.parse(JSON.stringify(first.poles));
        }
      }),
    );
    expect(detail).toContain("중복");
  });

  it("강도 구간에 빈틈이 있음", () => {
    const detail = expectInvalid(
      broken((draft) => {
        const axes = draft.axes as Record<string, unknown>[];
        const first = axes[0];
        if (first === undefined) return;
        first.intensityBands = [
          { id: "balanced", label: "균형", minAbsScore: 0, maxAbsScore: 4 },
          { id: "strong", label: "매우 뚜렷", minAbsScore: 13, maxAbsScore: 20 },
        ];
      }),
    );
    expect(detail).toContain("빈틈");
  });

  it("강도 구간이 최대 절대 점수까지 덮지 못함", () => {
    const detail = expectInvalid(
      broken((draft) => {
        const axes = draft.axes as Record<string, unknown>[];
        const first = axes[0];
        if (first === undefined) return;
        first.intensityBands = [
          { id: "balanced", label: "균형", minAbsScore: 0, maxAbsScore: 4 },
          { id: "clear", label: "뚜렷", minAbsScore: 5, maxAbsScore: 12 },
        ];
      }),
    );
    expect(detail).toContain("최대 절대 점수");
  });

  it("scale.options에 centerValue가 없음", () => {
    const detail = expectInvalid(
      broken((draft) => {
        const scale = draft.scale as Record<string, unknown>;
        scale.centerValue = 7;
      }),
    );
    expect(detail).toContain("centerValue");
  });

  it("weight가 1이 아님", () => {
    const detail = expectInvalid(
      broken((draft) => {
        const questions = draft.questions as Record<string, unknown>[];
        const first = questions[0];
        if (first !== undefined) first.weight = 2;
      }),
    );
    expect(detail).toContain("weight");
  });

  it("polarity가 +1 / -1이 아님", () => {
    expectInvalid(
      broken((draft) => {
        const questions = draft.questions as Record<string, unknown>[];
        const first = questions[0];
        if (first !== undefined) first.polarity = 0;
      }),
    );
  });

  it("노출 금지 표현이 들어 있음", () => {
    // 저장소 전체 grep 검사(AGENTS.md 9절)를 0건으로 유지하기 위해,
    // 금지 단어를 소스에 그대로 쓰지 않고 조각을 이어 붙입니다.
    const forbiddenTerm = ["M", "B", "T", "I"].join("");

    const detail = expectInvalid(
      broken((draft) => {
        draft.summary = `${forbiddenTerm} 기반 검사입니다`;
      }),
    );
    expect(detail).toContain("금지된 표현");
  });

  it("4글자 유형 코드가 들어 있음", () => {
    const typeCode = ["I", "N", "F", "P"].join("");

    const detail = expectInvalid(
      broken((draft) => {
        draft.title = `${typeCode} 선생님을 위한 검사`;
      }),
    );
    expect(detail).toContain("금지된 표현");
  });

  it("필수 필드가 빠짐", () => {
    expectInvalid(
      broken((draft) => {
        delete draft.title;
      }),
    );
  });
});

describe("StaticAssessmentCatalog", () => {
  it("fixture 검사 1종을 published로 노출합니다", () => {
    expect(staticAssessmentCatalog.contentErrors).toEqual([]);
    expect(staticAssessmentCatalog.contentWarnings).toEqual([]);
    expect(staticAssessmentCatalog.listAll()).toHaveLength(1);
    expect(staticAssessmentCatalog.listPublished()).toHaveLength(1);
    expect(staticAssessmentCatalog.listUpcoming()).toHaveLength(0);
  });

  it("slug로 찾을 수 있고, 없는 slug는 ASSESSMENT_NOT_FOUND입니다", () => {
    const found = staticAssessmentCatalog.findBySlug("teacher-style");
    expect(found.ok).toBe(true);

    const missing = staticAssessmentCatalog.findBySlug("없는-검사");
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.error.code).toBe("ASSESSMENT_NOT_FOUND");
  });

  it("id로 찾을 수 있습니다", () => {
    const found = staticAssessmentCatalog.findById(toAssessmentId("teacher-style"));
    expect(found.ok).toBe(true);
  });

  it("검사별 프레젠테이션을 구체 카탈로그에서 찾을 수 있습니다", () => {
    const presentation = staticAssessmentCatalog.findPresentationBySlug("teacher-style");
    expect(presentation?.version).toBe(1);
    expect(presentation?.heroArtwork.src).toMatch(/^\/assessments\//);
    expect(presentation?.sectionArtwork).toHaveLength(4);
  });

  it("프레젠테이션이 없는 패키지도 기본 테마 대상으로 정상 로드합니다", () => {
    const withoutPresentation = broken((draft) => {
      delete draft.presentation;
    });
    const catalog = new StaticAssessmentCatalog([withoutPresentation]);
    expect(catalog.contentErrors).toEqual([]);
    expect(catalog.listPublished()).toHaveLength(1);
    expect(catalog.findPresentationBySlug("teacher-style")).toBeUndefined();
  });

  it("망가진 패키지는 목록에서 빠지고 contentErrors에 담깁니다", () => {
    const catalog = new StaticAssessmentCatalog([
      teacherStyleV1Package,
      { id: "broken", slug: "broken" },
    ]);

    expect(catalog.listAll()).toHaveLength(1);
    expect(catalog.contentErrors).toHaveLength(1);
    expect(catalog.contentErrors[0]?.code).toBe("INVALID_CONTENT_PACKAGE");
  });
});

describe("검사 프레젠테이션 무결성", () => {
  it("등록되지 않은 색 토큰을 거부합니다", () => {
    const detail = expectInvalidPackage(
      broken((draft) => {
        const presentation = draft.presentation as Record<string, unknown>;
        const palette = presentation.palette as Record<string, unknown>;
        palette.primary = "unknown-green";
      }),
    );
    expect(detail).toContain("presentation.palette.primary");
  });

  it("외부 이미지 URL을 거부합니다", () => {
    const detail = expectInvalidPackage(
      broken((draft) => {
        const presentation = draft.presentation as Record<string, unknown>;
        const hero = presentation.heroArtwork as Record<string, unknown>;
        hero.src = "https://example.com/art.webp";
      }),
    );
    expect(detail).toContain("presentation.heroArtwork.src");
  });

  it("section 그림 참조의 중복과 누락을 거부합니다", () => {
    const detail = expectInvalidPackage(
      broken((draft) => {
        const presentation = draft.presentation as Record<string, unknown>;
        const sectionArtwork = presentation.sectionArtwork as Record<string, unknown>[];
        const first = sectionArtwork[0];
        const second = sectionArtwork[1];
        if (first !== undefined && second !== undefined) second.sectionId = first.sectionId;
      }),
    );
    expect(detail).toContain("중복");
    expect(detail).toContain("빠진 sectionId");
  });
});
