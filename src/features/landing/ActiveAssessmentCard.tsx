"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { resumeSession } from "@/application/assessment/resumeSession";
import { Accordion } from "@/components/ui/Accordion";
import { buttonClasses } from "@/components/ui/Button";
import { useAssessmentServices } from "@/features/shared/AssessmentRepositoryProvider";
import { DISCLAIMER, PRIVACY_NOTE } from "@/lib/siteCopy";

export interface AssessmentCardData {
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly description: string;
  readonly estimatedMinutes: number;
  readonly questionCount: number;
  readonly sectionCount: number;
}

type Progress =
  | { readonly kind: "unknown" }
  | { readonly kind: "none" }
  | { readonly kind: "inProgress"; readonly nextSectionOrder: number; readonly answered: number }
  | { readonly kind: "outdated" };

/**
 * 활성 검사 카드 (docs/design.md 12장)
 *
 * 랜딩의 중심입니다. 준비 중 카드보다 면적이 3배 이상 크도록 잡았습니다.
 * 진행 중인 세션이 있으면 "이어서 하기"가 주 버튼이 됩니다 (PRD F-1.5).
 */
export function ActiveAssessmentCard({ assessment }: { readonly assessment: AssessmentCardData }) {
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

  return (
    <section className="group flex flex-col items-center text-center w-full bg-surface/80 rounded-2xl border-2 border-primary-soft/30 p-6 shadow-sm sm:p-8 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-elev-2 hover:border-primary-soft hover:bg-surface">
      <h2 className="text-h1 text-foreground sm:text-h1-lg">{assessment.title}</h2>
      <p className="mt-3 max-w-prose text-body-lg text-foreground-muted">{assessment.summary}</p>

      <dl className="mt-6 flex flex-wrap justify-center gap-3 text-body-sm">
        <div className="flex items-center gap-1.5 rounded-full bg-primary-soft/50 px-3 py-1.5 text-primary-active">
          <dt className="font-medium">문항</dt>
          <dd className="font-bold">{assessment.questionCount}개</dd>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-primary-soft/50 px-3 py-1.5 text-primary-active">
          <dt className="font-medium">묶음</dt>
          <dd className="font-bold">{assessment.sectionCount}개</dd>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-primary-soft/50 px-3 py-1.5 text-primary-active">
          <dt className="font-medium">예상 시간</dt>
          <dd className="font-bold">약 {assessment.estimatedMinutes}분</dd>
        </div>
      </dl>

      <div className="mt-6 w-full max-w-md border-t border-border/50 text-left">
        <Accordion summary="검사 안내 자세히 보기">
          <p className="max-w-prose">{assessment.description}</p>
          <p className="mt-3 max-w-prose">{DISCLAIMER}</p>
          <p className="mt-3 max-w-prose">{PRIVACY_NOTE.long}</p>
        </Accordion>
      </div>

      {progress.kind === "outdated" && (
        <p className="mt-6 text-body-sm text-foreground-body" aria-live="polite">
          <span aria-hidden="true">⚠ </span>
          검사가 새 버전으로 업데이트되었어요. 정확한 결과를 위해 처음부터 다시 진행해 주세요.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row justify-center">
        {isResumable && progress.kind === "inProgress" ? (
          <>
            <Link
              href={`/assessments/${assessment.slug}/run/${progress.nextSectionOrder}`}
              className={buttonClasses("primary", "lg")}
            >
              이어서 하기
            </Link>
            <Link
              href={`/assessments/${assessment.slug}`}
              className={buttonClasses("secondary", "lg")}
            >
              검사 소개 보기
            </Link>
          </>
        ) : (
          <Link href={`/assessments/${assessment.slug}`} className={buttonClasses("primary", "lg")}>
            검사 시작하기
          </Link>
        )}
      </div>

      {isResumable && progress.kind === "inProgress" && (
        <p className="mt-3 text-body-sm text-foreground-muted" aria-live="polite">
          {assessment.questionCount}문항 중 {progress.answered}문항까지 답하셨어요.
        </p>
      )}
    </section>
  );
}
