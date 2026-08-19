"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { completeAssessment } from "@/application/assessment/completeAssessment";
import { getPartState } from "@/application/assessment/getPartState";
import { resumeSession } from "@/application/assessment/resumeSession";
import { saveResponse } from "@/application/assessment/saveResponse";
import { Button, buttonClasses } from "@/components/ui/Button";
import type {
  AssessmentQuestion,
  ResponseOption,
} from "@/domain/assessment/model/definition";
import { AssessmentProgress } from "@/features/assessment-runner/AssessmentProgress";
import { QuestionCard } from "@/features/assessment-runner/QuestionCard";
import { useAssessmentServices } from "@/features/shared/AssessmentRepositoryProvider";
import { messageFor } from "@/lib/errorMessages";

export interface AssessmentRunnerProps {
  readonly slug: string;
  readonly sectionOrder: number;
  readonly sectionCount: number;
  readonly totalCount: number;
  readonly questions: readonly AssessmentQuestion[];
  readonly options: readonly ResponseOption[];
  readonly previousSectionOrder: number | null;
  readonly nextSectionOrder: number | null;
}

type Status = "loading" | "ready" | "no-session" | "outdated" | "unavailable";

/** 부드러운 스크롤을 원치 않는 사용자를 존중합니다 (docs/design.md 14). */
function scrollBehavior(): ScrollBehavior {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return reduced ? "auto" : "smooth";
}

export function AssessmentRunner(props: AssessmentRunnerProps) {
  const {
    slug,
    sectionOrder,
    sectionCount,
    totalCount,
    questions,
    options,
    previousSectionOrder,
    nextSectionOrder,
  } = props;

  const router = useRouter();
  const services = useAssessmentServices();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<Status>("loading");
  const [answers, setAnswers] = useState<ReadonlyMap<string, number>>(new Map());
  const [answeredCount, setAnsweredCount] = useState(0);
  const [showUnanswered, setShowUnanswered] = useState(searchParams.get("missing") === "1");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // --- 저장된 응답 불러오기 -------------------------------------------------
  useEffect(() => {
    if (services === null) return;
    let alive = true;

    void getPartState(services.deps, { slug, sectionOrder }).then((result) => {
      if (!alive) return;

      if (result.ok) {
        const loaded = new Map<string, number>();
        result.value.answers.forEach((value, questionId) => loaded.set(String(questionId), value));
        setAnswers(loaded);
        setAnsweredCount(result.value.answeredCount);
        setStatus("ready");
        return;
      }

      if (result.error.code === "SESSION_NOT_FOUND") setStatus("no-session");
      else if (result.error.code === "VERSION_MISMATCH") setStatus("outdated");
      else setStatus("unavailable");
    });

    return () => {
      alive = false;
    };
  }, [services, slug, sectionOrder]);

  // --- 첫 미응답 문항으로 이동 ---------------------------------------------
  const focusFirstMissing = useCallback(() => {
    const missing = questions.find((question) => !answers.has(String(question.id)));
    if (missing === undefined) return;

    const element = document.getElementById(`q-${String(missing.id)}`);
    element?.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
    element?.querySelector<HTMLInputElement>('input[type="radio"]')?.focus({ preventScroll: true });
  }, [questions, answers]);

  useEffect(() => {
    if (status === "ready" && showUnanswered) focusFirstMissing();
    // 최초 진입 시 한 번만 이동합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // --- 응답 저장 (클릭 즉시, 디바운스 없음 — PRD F-3.5) ---------------------
  async function handleSelect(question: AssessmentQuestion, value: number) {
    if (services === null) return;

    const key = String(question.id);
    const isNew = !answers.has(key);

    setAnswers((previous) => new Map(previous).set(key, value));
    if (isNew) setAnsweredCount((previous) => previous + 1);
    setSaveError(null);

    const saved = await saveResponse(services.deps, {
      slug,
      questionId: question.id,
      value,
    });

    if (!saved.ok) setSaveError(messageFor(saved.error).body);
  }

  const unansweredInPart = questions.filter((question) => !answers.has(String(question.id)));

  function goToNext() {
    if (unansweredInPart.length > 0) {
      setShowUnanswered(true);
      focusFirstMissing();
      return;
    }
    if (nextSectionOrder !== null) {
      router.push(`/assessments/${slug}/run/${nextSectionOrder}`);
    }
  }

  async function finish() {
    if (services === null) return;

    if (unansweredInPart.length > 0) {
      setShowUnanswered(true);
      focusFirstMissing();
      return;
    }

    setSubmitting(true);
    const completed = await completeAssessment(services.deps, { slug });

    if (completed.ok) {
      router.push(`/assessments/${slug}/result`);
      return;
    }

    if (completed.error.code === "INCOMPLETE_RESPONSES") {
      // 다른 Part에 미응답이 남아 있습니다. 그 Part로 데려다 줍니다.
      const resumed = await resumeSession(services.deps, { slug });
      setSubmitting(false);

      if (resumed.ok && resumed.value.unanswered.length > 0) {
        router.push(`/assessments/${slug}/run/${resumed.value.nextSectionOrder}?missing=1`);
        return;
      }
    }

    setSaveError(messageFor(completed.error).body);
    setSubmitting(false);
  }

  // --- 진행할 수 없는 상태 --------------------------------------------------
  if (status === "no-session" || status === "outdated" || status === "unavailable") {
    const code =
      status === "no-session"
        ? "SESSION_NOT_FOUND"
        : status === "outdated"
          ? "VERSION_MISMATCH"
          : "ASSESSMENT_NOT_FOUND";
    const message = messageFor({ code });

    return (
      <div className="mx-auto max-w-(--container-survey) px-5 py-16 sm:px-6">
        <h1 className="text-h1 text-foreground">{message.title}</h1>
        <p className="mt-3 text-body text-foreground-muted">{message.body}</p>
        <Link href={`/assessments/${slug}`} className={buttonClasses("primary", "md", "mt-8")}>
          검사 소개로 가기
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-20">
        <AssessmentProgress
          sectionOrder={sectionOrder}
          sectionCount={sectionCount}
          answeredCount={answeredCount}
          totalCount={totalCount}
        />
      </div>

      <main id="main" className="mx-auto max-w-(--container-survey) px-5 pt-8 pb-32 sm:px-6">
        <h1 className="sr-only">
          Part {sectionOrder} / {sectionCount}
        </h1>

        <p className="min-h-6 text-body-sm text-status-danger" aria-live="polite">
          {showUnanswered && unansweredInPart.length > 0 ? (
            <>
              <span aria-hidden="true">⚠ </span>
              답하지 않은 문항이 {unansweredInPart.length}개 있어요.
            </>
          ) : null}
        </p>

        {saveError !== null && (
          <p className="mt-2 text-body-sm text-status-danger" aria-live="polite">
            <span aria-hidden="true">⚠ </span>
            {saveError}
          </p>
        )}

        <ol className="mt-6 flex flex-col gap-8">
          {questions.map((question) => (
            <QuestionCard
              key={String(question.id)}
              question={question}
              options={options}
              value={answers.get(String(question.id))}
              highlightUnanswered={showUnanswered}
              onSelect={(value) => void handleSelect(question, value)}
            />
          ))}
        </ol>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface shadow-elev-2">
        <div className="mx-auto flex max-w-(--container-survey) gap-3 px-5 py-3 sm:px-6">
          {previousSectionOrder !== null && (
            <Link
              href={`/assessments/${slug}/run/${previousSectionOrder}`}
              className={buttonClasses("secondary", "md", "flex-1")}
            >
              이전
            </Link>
          )}

          {nextSectionOrder !== null ? (
            <Button variant="primary" size="md" className="flex-[2]" onClick={goToNext}>
              다음 {questions.length}문항
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              className="flex-[2]"
              disabled={submitting || status !== "ready"}
              aria-busy={submitting}
              onClick={() => void finish()}
            >
              {submitting ? "채점 중이에요…" : "결과 확인하기"}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
