import type { CSSProperties, ReactNode } from "react";

import type { AssessmentPresentation } from "@/lib/assessmentPresentation";
import { assessmentThemeVariables } from "@/lib/assessmentPresentation";
import { cn } from "@/lib/cn";

export function AssessmentTheme({
  presentation,
  children,
  className,
}: {
  readonly presentation?: AssessmentPresentation;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div
      className={cn("assessment-theme min-h-dvh", className)}
      style={assessmentThemeVariables(presentation) as CSSProperties}
    >
      {children}
    </div>
  );
}
