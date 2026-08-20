"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";

import { resumeSession } from "@/application/assessment/resumeSession";
import { AssessmentArtwork } from "@/components/ui/AssessmentArtwork";
import { buttonClasses } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useAssessmentServices } from "@/features/shared/AssessmentRepositoryProvider";
import type { AssessmentPresentation } from "@/lib/assessmentPresentation";
import { assessmentThemeVariables } from "@/lib/assessmentPresentation";
import { cn } from "@/lib/cn";

export interface AssessmentCardData {
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly description?: string;
  readonly estimatedMinutes: number;
  readonly questionCount: number;
  readonly sectionCount: number;
  readonly presentation?: AssessmentPresentation;
}

type Progress =
  | { readonly kind: "unknown" }
  | { readonly kind: "none" }
  | { readonly kind: "inProgress"; readonly nextSectionOrder: number; readonly answered: number }
  | { readonly kind: "outdated" };

function ArtworkFallback() {
  return (
    <div className="grid aspect-4/3 place-items-center rounded-(--radius-hero) border border-border bg-primary-soft">
      <Icon name="compass" className="size-14 text-primary" />
    </div>
  );
}

export function ActiveAssessmentCard({
  assessment,
  featured = false,
  children,
}: {
  readonly assessment: AssessmentCardData;
  readonly featured?: boolean;
  readonly children?: ReactNode;
}) {
  const services = useAssessmentServices();
  const [progress, setProgress] = useState<Progress>({ kind: "unknown" });

  useEffect(() => {
    if (services === null) return;
    let alive = true;

    void resumeSession(services.deps, { slug: assessment.slug }).then((result) => {
      if (!alive) return;
      if (result.ok) {
        setProgress({
          kind: "inProgress",
          nextSectionOrder: result.value.nextSectionOrder,
          answered: result.value.responses.length,
        });
        return;
      }
      setProgress(result.error.code === "VERSION_MISMATCH" ? { kind: "outdated" } : { kind: "none" });
    });

    return () => {
      alive = false;
    };
  }, [services, assessment.slug]);

  const isResumable = progress.kind === "inProgress" && progress.answered > 0;
  const artwork = assessment.presentation?.heroArtwork;

  return (
    <section
      style={assessmentThemeVariables(assessment.presentation) as CSSProperties}
      className={cn(
        "assessment-theme hero-enter min-w-0 max-w-full",
        featured
          ? "assessment-card assessment-card-deck grid grid-cols-1 items-center gap-8 overflow-hidden p-4 sm:p-7 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-14 lg:p-8"
          : "assessment-card flex h-full flex-col p-5",
      )}
    >
      <div className={cn("min-w-0", featured ? "order-2 lg:order-1" : "order-2 flex flex-1 flex-col pt-5")}>
        <p className="flex items-center gap-2 text-label text-primary-active">
          <span aria-hidden="true" className="h-px w-8 bg-accent" />
          교직 스타일을 가볍게 발견하는 시간
        </p>
        <h2
          className={cn(
            "mt-4 text-foreground",
            featured ? "text-[2rem] leading-[1.18] font-bold tracking-[-0.025em] sm:text-[2.75rem]" : "text-h2",
          )}
        >
          {assessment.title}
        </h2>
        <p className={cn("mt-4 max-w-[34rem] text-foreground-muted", featured ? "text-body-lg" : "text-body") }>
          {assessment.summary}
        </p>

        {featured && assessment.description !== undefined && (
          <p className="mt-4 max-w-[34rem] border-l-2 border-accent-soft pl-4 text-body-sm text-foreground-muted">
            {assessment.description}
          </p>
        )}

        {children !== undefined && <div className="mt-7 max-w-md">{children}</div>}

        <dl className={cn("grid grid-cols-3 gap-2", featured ? "mt-7 max-w-md" : "mt-5")}>
          <div className="assessment-mini-card p-3">
            <dt className="flex items-center gap-1 text-caption text-foreground-subtle"><Icon name="book" className="size-4" />문항</dt>
            <dd className="mt-1 text-label tabular-nums text-foreground">{assessment.questionCount}개</dd>
          </div>
          <div className="assessment-mini-card p-3">
            <dt className="flex items-center gap-1 text-caption text-foreground-subtle"><Icon name="layers" className="size-4" />묶음</dt>
            <dd className="mt-1 text-label tabular-nums text-foreground">{assessment.sectionCount}개</dd>
          </div>
          <div className="assessment-mini-card p-3">
            <dt className="flex items-center gap-1 text-caption text-foreground-subtle"><Icon name="clock" className="size-4" />시간</dt>
            <dd className="mt-1 text-label tabular-nums text-foreground">약 {assessment.estimatedMinutes}분</dd>
          </div>
        </dl>

        {featured && (
          <ul className="mt-3 grid max-w-md grid-cols-2 gap-2 text-caption text-foreground-body">
            <li className="flex min-h-11 items-center gap-2 rounded-sm border border-border bg-surface-muted px-3">
              <Icon name="check" className="size-4 text-primary" /> 정답이 없는 탐색
            </li>
            <li className="flex min-h-11 items-center gap-2 rounded-sm border border-border bg-surface-muted px-3">
              <Icon name="lock" className="size-4 text-primary" /> 가입·전송 없이 저장
            </li>
          </ul>
        )}

        {progress.kind === "outdated" && (
          <p className="mt-5 flex gap-2 text-body-sm text-foreground-body" aria-live="polite">
            <Icon name="warning" className="text-status-warning" />
            새 버전으로 바뀌어 처음부터 진행해야 해요.
          </p>
        )}

        <div className={cn("flex flex-col gap-3 sm:flex-row", featured ? "mt-7" : "mt-auto pt-6")}>
          {isResumable && progress.kind === "inProgress" ? (
            <>
              <Link
                href={`/assessments/${assessment.slug}/run/${progress.nextSectionOrder}`}
                className={buttonClasses("primary", "lg")}
              >
                이어서 하기 <Icon name="arrow-right" />
              </Link>
              <Link href={`/assessments/${assessment.slug}`} className={buttonClasses("secondary", "lg")}>
                검사 소개
              </Link>
            </>
          ) : (
            <Link href={`/assessments/${assessment.slug}`} className={buttonClasses("primary", "lg")}>
              검사 살펴보기 <Icon name="arrow-right" />
            </Link>
          )}
        </div>

        {isResumable && progress.kind === "inProgress" && (
          <p className="mt-3 flex items-center gap-2 text-body-sm text-foreground-muted" aria-live="polite">
            <Icon name="check" className="size-4 text-primary" />
            {assessment.questionCount}문항 중 {progress.answered}문항까지 저장되어 있어요.
          </p>
        )}
      </div>

      <div className={cn("relative min-w-0", featured ? "order-1 lg:order-2" : "order-1")}>
        {featured && (
          <span className="absolute -top-2 left-5 z-2 rounded-xs border border-primary-soft-border bg-primary-soft px-3 py-1 text-caption font-bold text-primary-active shadow-elev-1">
            오늘의 탐색 카드
          </span>
        )}
        {artwork === undefined ? (
          <ArtworkFallback />
        ) : (
          <AssessmentArtwork
            artwork={artwork}
            preload={featured}
            className="border border-border shadow-elev-1"
            imageClassName={featured ? "aspect-4/3" : "aspect-[16/10]"}
          />
        )}
      </div>
    </section>
  );
}
