import type { SectionId } from "@/domain/shared/ids";

export const ASSESSMENT_PERSPECTIVE_TONES = [
  "energy",
  "lens",
  "decision",
  "rhythm",
] as const;

export type AssessmentPerspectiveTone =
  (typeof ASSESSMENT_PERSPECTIVE_TONES)[number];

/** 소개와 결과에서 관점 순서를 같은 색·형태 문법으로 연결합니다. */
export function assessmentPerspectiveTone(index: number): AssessmentPerspectiveTone {
  const safeIndex = Math.abs(index) % ASSESSMENT_PERSPECTIVE_TONES.length;
  return ASSESSMENT_PERSPECTIVE_TONES[safeIndex] ?? "energy";
}

export const PRESENTATION_COLOR_TOKENS = [
  "sand-50",
  "sand-100",
  "sand-950",
  "sage-50",
  "sage-100",
  "sage-600",
  "sage-700",
  "sage-900",
  "clay-100",
  "clay-500",
  "clay-600",
] as const;

export type PresentationColorToken = (typeof PRESENTATION_COLOR_TOKENS)[number];

export interface AssessmentPalette {
  readonly canvas: PresentationColorToken;
  readonly surface: PresentationColorToken;
  readonly primary: PresentationColorToken;
  readonly accent: PresentationColorToken;
  readonly ink: PresentationColorToken;
}

export interface LocalArtwork {
  readonly src: `/assessments/${string}/${string}`;
  readonly width: number;
  readonly height: number;
  /** 장면 그림은 주변 텍스트를 반복하지 않는 장식 이미지입니다. */
  readonly alt: "";
}

/** 검사 소개에서만 쓰는 척도별 판단 기준입니다. 채점·세션 모델에는 포함하지 않습니다. */
export interface ResponseScaleGuideItem {
  readonly value: number;
  readonly criterion: string;
}

export interface AssessmentPresentation {
  readonly version: 1;
  readonly palette: AssessmentPalette;
  readonly heroArtwork: LocalArtwork;
  readonly sectionArtwork: readonly {
    readonly sectionId: SectionId;
    readonly artwork: LocalArtwork;
  }[];
  /** 제공하면 소개 화면에서 각 응답 라벨과 함께 표시합니다. */
  readonly responseScaleGuide?: readonly ResponseScaleGuideItem[];
}

export const DEFAULT_ASSESSMENT_PALETTE: AssessmentPalette = {
  canvas: "sand-50",
  surface: "sand-100",
  primary: "sage-600",
  accent: "clay-600",
  ink: "sand-950",
};

const colorVariable = (token: PresentationColorToken): string => `var(--color-${token})`;

/** React에 종속되지 않는 직렬화 가능한 CSS custom property 맵입니다. */
export function assessmentThemeVariables(
  presentation: AssessmentPresentation | undefined,
): Readonly<Record<string, string>> {
  const palette = presentation?.palette ?? DEFAULT_ASSESSMENT_PALETTE;
  return {
    "--assessment-canvas": colorVariable(palette.canvas),
    "--assessment-surface": colorVariable(palette.surface),
    "--assessment-primary": colorVariable(palette.primary),
    "--assessment-accent": colorVariable(palette.accent),
    "--assessment-ink": colorVariable(palette.ink),
  };
}

export function findSectionArtwork(
  presentation: AssessmentPresentation | undefined,
  sectionId: SectionId,
): LocalArtwork | undefined {
  return presentation?.sectionArtwork.find((item) => item.sectionId === sectionId)?.artwork;
}
