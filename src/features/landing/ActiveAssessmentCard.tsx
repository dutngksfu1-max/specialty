"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";

import { resumeSession } from "@/application/assessment/resumeSession";
import { loadCharacterGender } from "@/application/assessment/characterGender";
import { loadNickname } from "@/application/assessment/nickname";
import { loadSelfReportedCrosswalkCode } from "@/application/assessment/selfReportedCrosswalkCode";
import { startAssessment } from "@/application/assessment/startAssessment";
import { AssessmentArtwork } from "@/components/ui/AssessmentArtwork";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useAssessmentServices } from "@/features/shared/AssessmentRepositoryProvider";
import { LandingEntryActionProvider } from "@/features/landing/LandingEntryAction";
import type { AssessmentPresentation } from "@/lib/assessmentPresentation";
import { assessmentThemeVariables } from "@/lib/assessmentPresentation";
import { cn } from "@/lib/cn";

export interface AssessmentCardData {
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly description?: string;
  readonly estimatedMinutes: number;
  readonly estimatedTimeLabel?: string;
  readonly questionCount: number;
  readonly sectionCount: number;
  readonly presentation?: AssessmentPresentation;
}

type Progress =
  | { readonly kind: "unknown" }
  | { readonly kind: "none" }
  | {
      readonly kind: "inProgress";
      readonly nextSectionOrder: number;
      readonly answered: number;
      readonly hasCharacterGender: boolean;
    }
  | { readonly kind: "outdated" };

function ArtworkFallback() {
  return (
    <div className="grid aspect-4/3 place-items-center rounded-(--radius-hero) border border-border bg-primary-soft">
      <Icon name="compass" className="size-14 text-primary" />
    </div>
  );
}

function AssessmentStats({
  assessment,
  className,
}: {
  readonly assessment: AssessmentCardData;
  readonly className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-3 overflow-hidden rounded-md border border-border bg-background",
        className,
      )}
    >
      <div className="p-3 sm:p-4">
        <dt className="flex items-center gap-1 text-caption text-foreground-subtle">
          <Icon name="book" className="size-4" />문항
        </dt>
        <dd className="mt-1 text-label tabular-nums text-foreground">
          {assessment.questionCount}개
        </dd>
      </div>
      <div className="border-l border-border p-3 sm:p-4">
        <dt className="flex items-center gap-1 text-caption text-foreground-subtle">
          <Icon name="layers" className="size-4" />챕터
        </dt>
        <dd className="mt-1 text-label tabular-nums text-foreground">
          {assessment.sectionCount}개
        </dd>
      </div>
      <div className="border-l border-border p-3 sm:p-4">
        <dt className="flex items-center gap-1 text-caption text-foreground-subtle">
          <Icon name="clock" className="size-4" />시간
        </dt>
        <dd className="mt-1 text-label tabular-nums text-foreground">
          {assessment.estimatedTimeLabel ?? `약 ${assessment.estimatedMinutes}분`}
        </dd>
      </div>
    </dl>
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
  const router = useRouter();
  const [progress, setProgress] = useState<Progress>({ kind: "unknown" });
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

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
          hasCharacterGender: result.value.session.characterGender !== null,
        });
        return;
      }
      setProgress(result.error.code === "VERSION_MISMATCH" ? { kind: "outdated" } : { kind: "none" });
    });

    return () => {
      alive = false;
    };
  }, [services, assessment.slug]);

  const isResumable =
    progress.kind === "inProgress" &&
    progress.answered > 0 &&
    progress.hasCharacterGender;
  const artwork = assessment.presentation?.heroArtwork;

  async function beginAssessment() {
    if (services === null) return;
    setBusy(true);
    setFailure(null);

    const [nickname, gender, selfReportedCode] = await Promise.all([
      loadNickname(services),
      loadCharacterGender(services),
      loadSelfReportedCrosswalkCode(services),
    ]);
    if (!gender.ok || gender.value === null) {
      setFailure("성별을 먼저 선택해 주세요.");
      setBusy(false);
      return;
    }

    const started = await startAssessment(services.deps, {
      slug: assessment.slug,
      nickname: nickname.ok ? nickname.value : "",
      characterGender: gender.value,
      selfReportedCrosswalkCode: selfReportedCode.ok ? selfReportedCode.value : null,
    });
    if (!started.ok) {
      setFailure("검사를 시작하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setBusy(false);
      return;
    }

    const firstSection = [...started.value.definition.sections].sort(
      (a, b) => a.order - b.order,
    )[0];
    router.push(
      `/assessments/${assessment.slug}/run/${firstSection === undefined ? 1 : firstSection.order}`,
    );
  }

  const entryAction =
    isResumable && progress.kind === "inProgress" ? (
      <Link
        href={`/assessments/${assessment.slug}/run/${progress.nextSectionOrder}`}
        className={buttonClasses("primary", "lg", "w-full whitespace-nowrap")}
      >
        이어서 하기 <Icon name="arrow-right" />
      </Link>
    ) : (
      <Button
        variant="primary"
        size="lg"
        className="w-full whitespace-nowrap"
        disabled={services === null || busy || progress.kind === "unknown"}
        aria-busy={busy}
        onClick={() => void beginAssessment()}
      >
        {busy ? "준비 중" : "검사 시작하기"}
        {!busy && <Icon name="arrow-right" />}
      </Button>
    );

  return (
    <section
      style={assessmentThemeVariables(assessment.presentation) as CSSProperties}
      className={cn(
        "assessment-theme hero-enter min-w-0 max-w-full",
        featured
          ? "assessment-card assessment-card-deck grid grid-cols-1 items-center gap-7 overflow-hidden p-4 sm:p-7 lg:grid-cols-[minmax(0,1.06fr)_minmax(20rem,0.94fr)] lg:gap-10 lg:p-8"
          : "assessment-card flex h-full flex-col p-5",
      )}
    >
      <div className={cn("min-w-0", featured ? "order-2 lg:order-1" : "order-2 flex flex-1 flex-col pt-5")}>
        <div className="flex items-center gap-3 text-primary-active">
          <span aria-hidden="true" className="h-px w-8 shrink-0 bg-accent" />
          <p className="text-label">교직 스타일을 가볍게 발견하는 시간</p>
        </div>
        <h2
          className={cn(
            "mt-4 text-foreground",
            featured
              ? "text-[2rem] leading-[1.18] font-bold tracking-[-0.025em] sm:text-[2.5rem] lg:text-[2.625rem]"
              : "text-h2",
          )}
        >
          {assessment.title}
        </h2>
        {featured ? (
          <div className="mt-4 flex max-w-md items-center justify-between gap-3">
            <p className="min-w-0 text-body-lg text-foreground-muted">{assessment.summary}</p>
            <Link
              href={`/assessments/${assessment.slug}`}
              className={buttonClasses("secondary", "sm", "shrink-0 whitespace-nowrap")}
            >
              검사 소개
            </Link>
          </div>
        ) : (
          <p className="mt-4 max-w-[34rem] text-body text-foreground-muted">
            {assessment.summary}
          </p>
        )}

        {featured && assessment.description !== undefined && (
          <div className="mt-5 max-w-md border-y border-border py-4">
            <p className="flex items-center gap-2 text-caption font-bold tracking-[0.08em] text-accent">
              <Icon name="compass" className="size-4" />
              이런 교직 장면을 살펴봐요
            </p>
            <p className="mt-3 text-body-sm text-foreground-muted">{assessment.description}</p>
          </div>
        )}

        {!featured && <AssessmentStats assessment={assessment} className="mt-5" />}

        {children !== undefined && (
          <div className={cn("max-w-md", featured ? "mt-5 border-t border-border pt-5" : "mt-5")}>
            {featured ? (
              <LandingEntryActionProvider action={entryAction}>
                {children}
              </LandingEntryActionProvider>
            ) : (
              children
            )}
          </div>
        )}

        {progress.kind === "outdated" && (
          <p className="mt-5 flex gap-2 text-body-sm text-foreground-body" aria-live="polite">
            <Icon name="warning" className="text-status-warning" />
            새 버전으로 바뀌어 처음부터 진행해야 해요.
          </p>
        )}

        {!featured && <div className="mt-auto flex max-w-md flex-col gap-3 pt-6 sm:flex-row">
          {isResumable && progress.kind === "inProgress" ? (
            <>
              <Link
                href={`/assessments/${assessment.slug}/run/${progress.nextSectionOrder}`}
                className={buttonClasses("primary", "lg", featured ? "w-full sm:w-auto" : undefined)}
              >
                이어서 하기 <Icon name="arrow-right" />
              </Link>
              <Link href={`/assessments/${assessment.slug}`} className={buttonClasses("secondary", "lg", featured ? "w-full sm:w-auto" : undefined)}>
                검사 소개
              </Link>
            </>
          ) : (
            <Link href={`/assessments/${assessment.slug}`} className={buttonClasses("primary", "lg", featured ? "w-full sm:w-auto" : undefined)}>
              검사 살펴보기 <Icon name="arrow-right" />
            </Link>
          )}
        </div>}

        {isResumable && progress.kind === "inProgress" && (
          <p className="mt-3 flex items-center gap-2 text-body-sm text-foreground-muted" aria-live="polite">
            <Icon name="check" className="size-4 text-primary" />
            {assessment.questionCount}문항 중 {progress.answered}문항까지 저장되어 있어요.
          </p>
        )}
      </div>

      <div className={cn("relative min-w-0", featured ? "order-1 lg:order-2" : "order-1")}>
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

        {failure !== null && (
          <p className="mt-3 flex gap-2 text-body-sm text-status-danger" aria-live="polite">
            <Icon name="warning" /> {failure}
          </p>
        )}
        {featured && <AssessmentStats assessment={assessment} className="mt-4" />}
      </div>
    </section>
  );
}
