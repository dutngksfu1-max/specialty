import type { SectionId } from "@/domain/shared/ids";

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

export interface AssessmentPresentation {
  readonly version: 1;
  readonly palette: AssessmentPalette;
  readonly heroArtwork: LocalArtwork;
  readonly sectionArtwork: readonly {
    readonly sectionId: SectionId;
    readonly artwork: LocalArtwork;
  }[];
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
